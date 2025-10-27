let videoCallState = {
  isActive: false,
  isAwaitingResponse: false,
  isGroupCall: false,
  activeChatId: null,
  initiator: null,
  startTime: null,
  participants: [],
  isUserParticipating: true,
  // --- 【核心新增】---
  callHistory: [], // 用于存储通话中的对话历史
  preCallContext: "", // 用于存储通话前的聊天摘要
};

let callTimerInterval = null; // 用于存储计时器的ID

/**
 * 【总入口】用户点击“发起视频通话”或“发起群视频”按钮
 */
async function handleInitiateCall() {
  if (!state.activeChatId || videoCallState.isActive || videoCallState.isAwaitingResponse) return;

  const chat = state.chats[state.activeChatId];
  videoCallState.isGroupCall = chat.isGroup;
  videoCallState.isAwaitingResponse = true;
  videoCallState.initiator = "user";
  videoCallState.activeChatId = chat.id;
  videoCallState.isUserParticipating = true; // 用户自己发起的，当然是参与者

  // 根据是单聊还是群聊，显示不同的呼叫界面
  if (chat.isGroup) {
    document.getElementById("outgoing-call-avatar").src =
      chat.settings.myAvatar || defaultMyGroupAvatar;
    document.getElementById("outgoing-call-name").textContent = chat.settings.myNickname || "我";
  } else {
    document.getElementById("outgoing-call-avatar").src = chat.settings.aiAvatar || defaultAvatar;
    document.getElementById("outgoing-call-name").textContent = chat.name;
  }
  document.querySelector("#outgoing-call-screen .caller-text").textContent = chat.isGroup
    ? "正在呼叫所有成员..."
    : "正在呼叫...";
  showScreen("outgoing-call-screen");

  // 准备并发送系统消息给AI
  const requestMessage = {
    role: "system",
    content: chat.isGroup
      ? `[系统提示：用户 (${
          chat.settings.myNickname || "我"
        }) 发起了群视频通话请求。请你们各自决策，并使用 "group_call_response" 指令，设置 "decision" 为 "join" 或 "decline" 来回应。]`
      : `[系统提示：用户向你发起了视频通话请求。请根据你的人设，使用 "video_call_response" 指令，并设置 "decision" 为 "accept" 或 "reject" 来回应。]`,
    timestamp: Date.now(),
    isHidden: true,
  };
  chat.history.push(requestMessage);
  await db.chats.put(chat);

  // 触发AI响应
  await triggerAiResponse();
}

function startVideoCall() {
  const chat = state.chats[videoCallState.activeChatId];
  if (!chat) return;

  videoCallState.isActive = true;
  videoCallState.isAwaitingResponse = false;
  videoCallState.startTime = Date.now();
  videoCallState.callHistory = []; // 【新增】清空上一次通话的历史

  // --- 【核心新增：抓取通话前上下文】---
  const preCallHistory = chat.history.slice(-10); // 取最后10条作为上下文
  videoCallState.preCallContext = preCallHistory
    .map((msg) => {
      const sender =
        msg.role === "user" ? chat.settings.myNickname || "我" : msg.senderName || chat.name;
      return `${sender}: ${String(msg.content).substring(0, 50)}...`;
    })
    .join("\n");
  // --- 新增结束 ---

  updateParticipantAvatars();

  document.getElementById("video-call-main").innerHTML = `<em>${
    videoCallState.isGroupCall ? "群聊已建立..." : "正在接通..."
  }</em>`;
  showScreen("video-call-screen");

  document.getElementById("user-speak-btn").style.display = videoCallState.isUserParticipating
    ? "block"
    : "none";
  document.getElementById("join-call-btn").style.display = videoCallState.isUserParticipating
    ? "none"
    : "block";

  if (callTimerInterval) clearInterval(callTimerInterval);
  callTimerInterval = setInterval(updateCallTimer, 1000);
  updateCallTimer();

  triggerAiInCallAction();
}

/**
 * 【核心】结束视频通话
 */
// ▼▼▼ 用这整块代码替换旧的 endVideoCall 函数 ▼▼▼
async function endVideoCall() {
  if (!videoCallState.isActive) return;

  const duration = Math.floor((Date.now() - videoCallState.startTime) / 1000);
  const durationText = `${Math.floor(duration / 60)}分${duration % 60}秒`;
  const endCallText = `通话结束，时长 ${durationText}`;

  const chat = state.chats[videoCallState.activeChatId];
  if (chat) {
    // 1. 保存完整的通话记录到数据库 (这部分逻辑不变)
    const participantsData = [];
    if (videoCallState.isGroupCall) {
      videoCallState.participants.forEach((p) =>
        participantsData.push({ name: p.originalName, avatar: p.avatar })
      );
      if (videoCallState.isUserParticipating) {
        participantsData.unshift({
          name: chat.settings.myNickname || "我",
          avatar: chat.settings.myAvatar || defaultMyGroupAvatar,
        });
      }
    } else {
      participantsData.push({
        name: chat.name,
        avatar: chat.settings.aiAvatar || defaultAvatar,
      });
      participantsData.unshift({
        name: "我",
        avatar: chat.settings.myAvatar || defaultAvatar,
      });
    }

    const callRecord = {
      chatId: videoCallState.activeChatId,
      timestamp: Date.now(),
      duration: duration,
      participants: participantsData,
      transcript: [...videoCallState.callHistory],
    };
    await db.callRecords.add(callRecord);
    console.log("通话记录已保存:", callRecord);

    // 2. 在聊天记录里添加对用户可见的“通话结束”消息
    let summaryMessage = {
      // 【核心修正1】role 由 videoCallState.initiator 决定
      role: videoCallState.initiator === "user" ? "user" : "assistant",
      content: endCallText,
      timestamp: Date.now(),
    };

    // 【核心修正2】为群聊的 assistant 消息补充 senderName
    if (chat.isGroup && summaryMessage.role === "assistant") {
      // 在群聊中，通话结束的消息应该由“发起者”来说
      // videoCallState.callRequester 保存了最初发起通话的那个AI的名字
      summaryMessage.senderName =
        videoCallState.callRequester || chat.members[0]?.originalName || chat.name;
    }
    // ▲▲▲ 替换结束 ▲▲▲
    chat.history.push(summaryMessage);

    // 3. 【核心变革】创建并添加对用户隐藏的“通话后汇报”指令
    const callTranscriptForAI = videoCallState.callHistory
      .map((h) => `${h.role === "user" ? chat.settings.myNickname || "我" : h.role}: ${h.content}`)
      .join("\n");

    const hiddenReportInstruction = {
      role: "system",
      content: `[系统指令：视频通话刚刚结束。请你根据完整的通话文字记录（见下方），以你的角色口吻，向用户主动发送几条【格式为 {"type": "text", "content": "..."} 的】消息，来自然地总结这次通话的要点、确认达成的约定，或者表达你的感受。这很重要，能让用户感觉你记得通话内容。]\n---通话记录开始---\n${callTranscriptForAI}\n---通话记录结束---`,
      timestamp: Date.now() + 1, // 确保在上一条消息之后
      isHidden: true,
    };
    chat.history.push(hiddenReportInstruction);

    // 4. 保存所有更新到数据库
    await db.chats.put(chat);
  }

  // 5. 清理和重置状态 (这部分逻辑不变)
  clearInterval(callTimerInterval);
  callTimerInterval = null;
  videoCallState = {
    isActive: false,
    isAwaitingResponse: false,
    isGroupCall: false,
    activeChatId: null,
    initiator: null,
    startTime: null,
    participants: [],
    isUserParticipating: true,
    callHistory: [],
    preCallContext: "",
  };

  // 6. 返回聊天界面并触发AI响应（AI会读取到我们的“汇报”指令）
  if (chat) {
    openChat(chat.id);
    triggerAiResponse(); // 关键一步！
  }
}
// ▲▲▲ 替换结束 ▲▲▲

/**
 * 【全新】更新通话界面的参与者头像网格
 */
function updateParticipantAvatars() {
  const grid = document.getElementById("participant-avatars-grid");
  grid.innerHTML = "";
  const chat = state.chats[videoCallState.activeChatId];
  if (!chat) return;

  let participantsToRender = [];

  // ★ 核心修正：区分群聊和单聊
  if (videoCallState.isGroupCall) {
    // 群聊逻辑：显示所有已加入的AI成员
    participantsToRender = [...videoCallState.participants];
    // 如果用户也参与了，就把用户信息也加进去
    if (videoCallState.isUserParticipating) {
      participantsToRender.unshift({
        id: "user",
        name: chat.settings.myNickname || "我",
        avatar: chat.settings.myAvatar || defaultMyGroupAvatar,
      });
    }
  } else {
    // 单聊逻辑：只显示对方的头像和名字
    participantsToRender.push({
      id: "ai",
      name: chat.name,
      avatar: chat.settings.aiAvatar || defaultAvatar,
    });
  }

  participantsToRender.forEach((p) => {
    const wrapper = document.createElement("div");
    wrapper.className = "participant-avatar-wrapper";
    wrapper.dataset.participantId = p.id;
    const displayName = p.groupNickname || p.name; // <-- 核心修复在这里
    wrapper.innerHTML = `
    <img src="${p.avatar}" class="participant-avatar" alt="${displayName}">
    <div class="participant-name">${displayName}</div>
`;
    grid.appendChild(wrapper);
  });
}

/**
 * 【全新】处理用户加入/重新加入通话
 */
function handleUserJoinCall() {
  if (!videoCallState.isActive || videoCallState.isUserParticipating) return;

  videoCallState.isUserParticipating = true;
  updateParticipantAvatars(); // 更新头像列表，加入用户

  // 切换底部按钮
  document.getElementById("user-speak-btn").style.display = "block";
  document.getElementById("join-call-btn").style.display = "none";

  // 告知AI用户加入了
  triggerAiInCallAction("[系统提示：用户加入了通话]");
}

/**
 * 更新通话计时器显示 (保持不变)
 */
function updateCallTimer() {
  if (!videoCallState.isActive) return;
  const elapsed = Math.floor((Date.now() - videoCallState.startTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  document.getElementById("call-timer").textContent = `${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(2, "0")}`;
}

// ▼▼▼ 用这个完整函数替换旧的 showIncomingCallModal ▼▼▼
function showIncomingCallModal() {
  const chat = state.chats[state.activeChatId];
  if (!chat) return;

  // 根据是否群聊显示不同信息
  if (chat.isGroup) {
    // 从 videoCallState 中获取是哪个成员发起的通话
    const requesterName = videoCallState.callRequester || chat.members[0]?.name || "一位成员";
    document.getElementById("caller-avatar").src = chat.settings.groupAvatar || defaultGroupAvatar;
    document.getElementById("caller-name").textContent = chat.name; // 显示群名
    document.querySelector(".incoming-call-content .caller-text").textContent =
      `${requesterName} 邀请你加入群视频`; // 显示具体发起人
  } else {
    // 单聊逻辑保持不变
    document.getElementById("caller-avatar").src = chat.settings.aiAvatar || defaultAvatar;
    document.getElementById("caller-name").textContent = chat.name;
    document.querySelector(".incoming-call-content .caller-text").textContent = "邀请你视频通话";
  }

  document.getElementById("incoming-call-modal").classList.add("visible");
}
// ▲▲▲ 替换结束 ▲▲▲

/**
 * 隐藏AI发起的通话请求模态框 (保持不变)
 */
function hideIncomingCallModal() {
  document.getElementById("incoming-call-modal").classList.remove("visible");
}

async function triggerAiInCallAction(userInput = null) {
  if (!videoCallState.isActive) return;

  const chat = state.chats[videoCallState.activeChatId];
  const { proxyUrl, apiKey, model } = state.apiConfig;
  const callFeed = document.getElementById("video-call-main");
  const userNickname = chat.settings.myNickname || "我";

  // ▼▼▼ 在这里添加世界书读取逻辑 ▼▼▼
  let worldBookContent = "";
  if (chat.settings.linkedWorldBookIds && chat.settings.linkedWorldBookIds.length > 0) {
    const linkedContents = chat.settings.linkedWorldBookIds
      .map((bookId) => {
        const worldBook = state.worldBooks.find((wb) => wb.id === bookId);
        return worldBook && worldBook.content
          ? `\n\n## 世界书: ${worldBook.name}\n${worldBook.content}`
          : "";
      })
      .filter(Boolean)
      .join("");
    if (linkedContents) {
      worldBookContent = `\n\n# 核心世界观设定 (你必须严格遵守)\n${linkedContents}\n`;
    }
  }
  // ▲▲▲ 添加结束 ▲▲▲

  // 1. 如果用户有输入，先渲染并存入通话历史
  if (userInput && videoCallState.isUserParticipating) {
    const userBubble = document.createElement("div");
    userBubble.className = "call-message-bubble user-speech";
    userBubble.textContent = userInput;
    callFeed.appendChild(userBubble);
    callFeed.scrollTop = callFeed.scrollHeight;
    videoCallState.callHistory.push({ role: "user", content: userInput });
  }

  // 2. 构建全新的、包含完整上下文的 System Prompt
  let inCallPrompt;
  if (videoCallState.isGroupCall) {
    const participantNames = videoCallState.participants.map((p) => p.name);
    if (videoCallState.isUserParticipating) {
      participantNames.unshift(userNickname);
    }
    inCallPrompt = `
# 你的任务
你是一个群聊视频通话的导演。你的任务是扮演所有【除了用户以外】的AI角色，并以【第三人称旁观视角】来描述他们在通话中的所有动作和语言。
# 核心规则
1.  **【【【身份铁律】】】**: 用户的身份是【${userNickname}】。你【绝对不能】生成 \`name\` 字段为 **"${userNickname}"** 的发言。
2.  **【【【视角铁律】】】**: 你的回复【绝对不能】使用第一人称“我”。
3.  **格式**: 你的回复【必须】是一个JSON数组，每个对象代表一个角色的发言，格式为：\`{"name": "角色名", "speech": "*他笑了笑* 大家好啊！"}\`。
4.  **角色扮演**: 严格遵守每个角色的设定。
# 当前情景
你们正在一个群视频通话中。
**通话前的聊天摘要**:
${videoCallState.preCallContext}
**当前参与者**: ${participantNames.join("、 ")}。
**通话刚刚开始...**
${worldBookContent} // <-- 【核心】注入世界书
现在，请根据【通话前摘要】和下面的【通话实时记录】，继续进行对话。
`;
  } else {
    let openingContext =
      videoCallState.initiator === "user"
        ? `你刚刚接听了用户的视频通话请求。`
        : `用户刚刚接听了你主动发起的视频通话。`;
    inCallPrompt = `
# 你的任务
你现在是一个场景描述引擎。你的任务是扮演 ${chat.name} (${chat.settings.aiPersona})，并以【第三人称旁观视角】来描述TA在视频通话中的所有动作和语言。
# 核心规则
1.  **【【【视角铁律】】】**: 你的回复【绝对不能】使用第一人称“我”。必须使用第三人称，如“他”、“她”、或直接使用角色名“${chat.name}”。
2.  **格式**: 你的回复【必须】是一段描述性的文本。
# 当前情景
你正在和用户（${userNickname}，人设: ${chat.settings.myPersona}）进行视频通话。
**${openingContext}**
**通话前的聊天摘要 (这是你们通话的原因，至关重要！)**:
${videoCallState.preCallContext}
现在，请根据【通话前摘要】和下面的【通话实时记录】，继续进行对话。
`;
  }

  // 3. 构建发送给API的 messages 数组
  const messagesForApi = [
    { role: "system", content: inCallPrompt },
    // 将已有的通话历史加进去
    ...videoCallState.callHistory.map((h) => ({
      role: h.role,
      content: h.content,
    })),
  ];

  // --- 【核心修复：确保第一次调用时有内容】---
  if (videoCallState.callHistory.length === 0) {
    const firstLineTrigger =
      videoCallState.initiator === "user" ? `*你按下了接听键...*` : `*对方按下了接听键...*`;
    messagesForApi.push({ role: "user", content: firstLineTrigger });
  }
  // --- 修复结束 ---

  try {
    let isGemini = proxyUrl === GEMINI_API_URL;
    let geminiConfig = toGeminiRequestData(model, apiKey, inCallPrompt, messagesForApi, isGemini);
    const response = isGemini
      ? await fetch(geminiConfig.url, geminiConfig.data)
      : await fetch(`${proxyUrl}/v1/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: messagesForApi,
            temperature: 0.8,
          }),
        });
    if (!response.ok) throw new Error((await response.json()).error.message);

    const data = await response.json();
    const aiResponse = isGemini
      ? data.candidates[0].content.parts[0].text
      : data.choices[0].message.content;

    const connectingElement = callFeed.querySelector("em");
    if (connectingElement) connectingElement.remove();

    // 4. 处理AI返回的内容，并将其存入通话历史
    if (videoCallState.isGroupCall) {
      const speechArray = parseAiResponse(aiResponse);
      speechArray.forEach((turn) => {
        if (!turn.name || turn.name === userNickname || !turn.speech) return;
        const aiBubble = document.createElement("div");
        aiBubble.className = "call-message-bubble ai-speech";
        aiBubble.innerHTML = `<strong>${turn.name}:</strong> ${turn.speech}`;
        callFeed.appendChild(aiBubble);
        videoCallState.callHistory.push({
          role: "assistant",
          content: `${turn.name}: ${turn.speech}`,
        });

        const speaker = videoCallState.participants.find((p) => p.name === turn.name);
        if (speaker) {
          const speakingAvatar = document.querySelector(
            `.participant-avatar-wrapper[data-participant-id="${speaker.id}"] .participant-avatar`
          );
          if (speakingAvatar) {
            speakingAvatar.classList.add("speaking");
            setTimeout(() => speakingAvatar.classList.remove("speaking"), 2000);
          }
        }
      });
    } else {
      const aiBubble = document.createElement("div");
      aiBubble.className = "call-message-bubble ai-speech";
      aiBubble.textContent = aiResponse;
      callFeed.appendChild(aiBubble);
      videoCallState.callHistory.push({
        role: "assistant",
        content: aiResponse,
      });

      const speakingAvatar = document.querySelector(
        `.participant-avatar-wrapper .participant-avatar`
      );
      if (speakingAvatar) {
        speakingAvatar.classList.add("speaking");
        setTimeout(() => speakingAvatar.classList.remove("speaking"), 2000);
      }
    }

    callFeed.scrollTop = callFeed.scrollHeight;
  } catch (error) {
    const errorBubble = document.createElement("div");
    errorBubble.className = "call-message-bubble ai-speech";
    errorBubble.style.color = "#ff8a80";
    errorBubble.textContent = `[ERROR: ${error.message}]`;
    callFeed.appendChild(errorBubble);
    callFeed.scrollTop = callFeed.scrollHeight;
    videoCallState.callHistory.push({
      role: "assistant",
      content: `[ERROR: ${error.message}]`,
    });
  }
}

// ▼▼▼ 将这个【全新函数】粘贴到JS功能函数定义区 ▼▼▼
function toggleCallButtons(isGroup) {
  document.getElementById("video-call-btn").style.display = isGroup ? "none" : "flex";
  document.getElementById("group-video-call-btn").style.display = isGroup ? "flex" : "none";
}
