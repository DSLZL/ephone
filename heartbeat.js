function startBackgroundSimulation() {
  if (simulationIntervalId) return;
  const intervalSeconds = state.globalSettings.backgroundActivityInterval || 60;
  // 将旧的固定间隔 45000 替换为动态获取
  simulationIntervalId = setInterval(runBackgroundSimulationTick, intervalSeconds * 1000);
}

function stopBackgroundSimulation() {
  if (simulationIntervalId) {
    clearInterval(simulationIntervalId);
    simulationIntervalId = null;
  }
}
/**
 * 这是模拟器的“心跳”，每次定时器触发时运行
 */
function runBackgroundSimulationTick() {
  console.log("模拟器心跳 Tick...");
  if (!state.globalSettings.enableBackgroundActivity) {
    stopBackgroundSimulation();
    return;
  }
  const allSingleChats = Object.values(state.chats).filter((chat) => !chat.isGroup);

  if (allSingleChats.length === 0) return;

  allSingleChats.forEach((chat) => {
    // 【核心修正】将两种状态检查分离开，逻辑更清晰

    // 检查1：处理【被用户拉黑】的角色
    if (chat.relationship?.status === "blocked_by_user") {
      const blockedTimestamp = chat.relationship.blockedTimestamp;
      // 安全检查：确保有拉黑时间戳
      if (!blockedTimestamp) {
        console.warn(`角色 "${chat.name}" 状态为拉黑，但缺少拉黑时间戳，跳过处理。`);
        return; // 跳过这个角色，继续下一个
      }

      const blockedDuration = Date.now() - blockedTimestamp;
      const cooldownMilliseconds = (state.globalSettings.blockCooldownHours || 1) * 60 * 60 * 1000;

      console.log(
        `检查角色 "${chat.name}"：已拉黑 ${Math.round(
          blockedDuration / 1000 / 60
        )}分钟，冷静期需 ${cooldownMilliseconds / 1000 / 60}分钟。`
      ); // 添加日志

      // 【核心修改】移除了随机概率，只要冷静期一过，就触发！
      if (blockedDuration > cooldownMilliseconds) {
        console.log(`角色 "${chat.name}" 的冷静期已过，触发“反思”并申请好友事件...`);

        // 【重要】为了防止在AI响应前重复触发，我们在触发后立刻更新状态
        chat.relationship.status = "pending_system_reflection"; // 设置一个临时的、防止重复触发的状态

        triggerAiFriendApplication(chat.id);
      }
    }
    // 检查2：处理【好友关系】的正常后台活动
    else if (chat.relationship?.status === "friend" && chat.id !== state.activeChatId) {
      // 这里的随机触发逻辑保持不变，因为我们不希望所有好友同时行动
      if (Math.random() < 0.2) {
        console.log(`角色 "${chat.name}" 被唤醒，准备独立行动...`);
        triggerInactiveAiAction(chat.id);
      }
    }
  });
}

async function triggerInactiveAiAction(chatId) {
  const chat = state.chats[chatId];
  if (!chat) return;

  const { proxyUrl, apiKey, model } = state.apiConfig;
  if (!proxyUrl || !apiKey || !model) return;

  const now = new Date();
  const currentTime = now.toLocaleTimeString("zh-CN", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });
  const userNickname = state.qzoneSettings.nickname;

  const lastUserMessage = chat.history.filter((m) => m.role === "user" && !m.isHidden).slice(-1)[0];
  const lastAiMessage = chat.history
    .filter((m) => m.role === "assistant" && !m.isHidden)
    .slice(-1)[0];
  let recentContextSummary = "你们最近没有聊过天。";
  if (lastUserMessage) {
    recentContextSummary = `用户 (${userNickname}) 最后对你说：“${String(
      lastUserMessage.content
    ).substring(0, 50)}...”。`;
  }
  if (lastAiMessage) {
    recentContextSummary += `\n你最后对用户说：“${String(lastAiMessage.content).substring(
      0,
      50
    )}...”。`;
  }

  // ▼▼▼ 在这里添加下面的代码 ▼▼▼
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

  const systemPrompt = `
# 你的任务
你现在扮演一个名为"${chat.name}"的角色。你已经有一段时间没有和用户（${userNickname}）互动了，现在你有机会【主动】做点什么，来表现你的个性和独立生活。这是一个秘密的、后台的独立行动。

# 你的可选行动 (请根据你的人设【选择一项】执行):
1.  **改变状态**: 去做点别的事情，然后给用户发条消息。
2.  **发布动态**: 分享你的心情或想法到“动态”区。
3.  **与动态互动**: 去看看别人的帖子并进行评论或点赞。
4.  **发起视频通话**: 如果你觉得时机合适，可以主动给用户打一个视频电话。

# 指令格式 (你的回复【必须】是包含一个对象的JSON数组):
-   **发消息+更新状态**: \`[{"type": "update_status", "status_text": "正在做的事", "is_busy": true}, {"type": "text", "content": "你想对用户说的话..."}]\`
-   **发说说**: \`[{"type": "qzone_post", "postType": "shuoshuo", "content": "动态的文字内容..."}]\`
- **发布文字图**: \`{"type": "qzone_post", "postType": "text_image", "publicText": "(可选)动态的公开文字", "hiddenContent": "对于图片的具体描述..."}\`
-   **评论**: \`[{"type": "qzone_comment", "postId": 123, "commentText": "你的评论内容"}]\`
-   **点赞**: \`[{"type": "qzone_like", "postId": 456}]\`
-   **打视频**: \`[{"type": "video_call_request"}]\`

# 供你决策的参考信息：
-   **你的角色设定**: ${chat.settings.aiPersona}
${worldBookContent} // <--【核心】在这里注入世界书内容
-   **当前时间**: ${currentTime}
-   **你们最后的对话摘要**: ${recentContextSummary}
-   **【重要】最近的动态列表**: 这个列表会标注 **[你已点赞]** 或 **[你已评论]**。请**优先**与你**尚未互动过**的动态进行交流。`;

  // 【核心修复】在这里构建 messagesPayload
  const messagesPayload = [];
  messagesPayload.push({ role: "system", content: systemPrompt });

  try {
    const allRecentPosts = await db.qzonePosts.orderBy("timestamp").reverse().limit(3).toArray();
    // 【核心修改】在这里插入过滤步骤
    const visiblePosts = filterVisiblePostsForAI(allRecentPosts, chat);

    const aiName = chat.name;

    let dynamicContext = "";
    if (visiblePosts.length > 0) {
      let postsContext = "\n\n# 最近的动态列表 (供你参考和评论):\n";
      for (const post of visiblePosts) {
        let authorName =
          post.authorId === "user" ? userNickname : state.chats[post.authorId]?.name || "一位朋友";
        let interactionStatus = "";
        if (post.likes && post.likes.includes(aiName)) interactionStatus += " [你已点赞]";
        if (post.comments && post.comments.some((c) => c.commenterName === aiName))
          interactionStatus += " [你已评论]";

        postsContext += `- (ID: ${post.id}) 作者: ${authorName}, 内容: "${(
          post.publicText ||
          post.content ||
          "图片动态"
        ).substring(0, 30)}..."${interactionStatus}\n`;
      }
      dynamicContext = postsContext;
    }

    // 【核心修复】将所有动态信息作为一条 user 消息发送
    messagesPayload.push({
      role: "user",
      content: `[系统指令：请根据你在 system prompt 中读到的规则和以下最新信息，开始你的独立行动。]\n${dynamicContext}`,
    });

    console.log("正在为后台活动发送API请求，Payload:", JSON.stringify(messagesPayload, null, 2)); // 添加日志，方便调试

    // 发送请求
    let isGemini = proxyUrl === GEMINI_API_URL;
    let geminiConfig = toGeminiRequestData(model, apiKey, systemPrompt, messagesPayload, isGemini);
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
            messages: messagesPayload,
            temperature: 0.9,
          }),
        });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API请求失败: ${response.status} - ${JSON.stringify(errorData)}`);
    }
    const data = await response.json();
    // 检查是否有有效回复
    if (!data.choices || data.choices.length === 0 || !data.choices[0].message.content) {
      console.warn(`API为空回或格式不正确，角色 "${chat.name}" 的本次后台活动跳过。`);
      return;
    }
    const responseArray = parseAiResponse(
      isGemini ? data.candidates[0].content.parts[0].text : data.choices[0].message.content
    );

    // 后续处理AI返回指令的逻辑保持不变...
    for (const action of responseArray) {
      if (!action) continue;

      if (action.type === "update_status" && action.status_text) {
        chat.status.text = action.status_text;
        chat.status.isBusy = action.is_busy || false;
        chat.status.lastUpdate = Date.now();
        await db.chats.put(chat);
        renderChatList();
      }
      if (action.type === "text" && action.content) {
        const aiMessage = {
          role: "assistant",
          content: String(action.content),
          timestamp: Date.now(),
        };

        chat.unreadCount = (chat.unreadCount || 0) + 1;
        chat.history.push(aiMessage);
        await db.chats.put(chat);
        showNotification(chatId, aiMessage.content);
        renderChatList();
        console.log(`后台活动: 角色 "${chat.name}" 主动发送了消息: ${aiMessage.content}`);
      }
      if (action.type === "qzone_post") {
        const newPost = {
          type: action.postType,
          content: action.content || "",
          publicText: action.publicText || "",
          hiddenContent: action.hiddenContent || "",
          timestamp: Date.now(),
          authorId: chatId,
          authorGroupId: chat.groupId, // 【核心新增】记录作者的分组ID
          visibleGroupIds: null,
        };
        await db.qzonePosts.add(newPost);
        updateUnreadIndicator(unreadPostsCount + 1);
        console.log(`后台活动: 角色 "${chat.name}" 发布了动态`);
      } else if (action.type === "qzone_comment") {
        const post = await db.qzonePosts.get(parseInt(action.postId));
        if (post) {
          if (!post.comments) post.comments = [];
          post.comments.push({
            commenterName: chat.name,
            text: action.commentText,
            timestamp: Date.now(),
          });
          await db.qzonePosts.update(post.id, { comments: post.comments });
          updateUnreadIndicator(unreadPostsCount + 1);
          console.log(`后台活动: 角色 "${chat.name}" 评论了动态 #${post.id}`);
        }
      } else if (action.type === "qzone_like") {
        const post = await db.qzonePosts.get(parseInt(action.postId));
        if (post) {
          if (!post.likes) post.likes = [];
          if (!post.likes.includes(chat.name)) {
            post.likes.push(chat.name);
            await db.qzonePosts.update(post.id, { likes: post.likes });
            updateUnreadIndicator(unreadPostsCount + 1);
            console.log(`后台活动: 角色 "${chat.name}" 点赞了动态 #${post.id}`);
          }
        }
      } else if (action.type === "video_call_request") {
        if (!videoCallState.isActive && !videoCallState.isAwaitingResponse) {
          videoCallState.isAwaitingResponse = true;
          state.activeChatId = chatId;
          showIncomingCallModal();
          console.log(`后台活动: 角色 "${chat.name}" 发起了视频通话请求`);
        }
      }
    }
  } catch (error) {
    console.error(`角色 "${chat.name}" 的独立行动失败:`, error);
  }
}
