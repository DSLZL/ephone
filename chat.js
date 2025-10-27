async function handleWaitReplyClick() {
  if (!state.activeChatId) return;

  const chatInput = document.getElementById("chat-input");
  const content = chatInput.value.trim();

  // 如果用户已经输入了内容，则不执行任何操作
  if (content) {
    alert("您已输入内容，请点击“发送”按钮。");
    return;
  }

  // 【核心修改】创建一条对用户隐藏的、模拟用户说话的消息
  const continueMessage = {
    role: "user", // 角色是 'user'，就像用户自己发的一样
    content: "(用户没有输入内容，根据上文继续输出)", // 内容可以很简单，比如“然后呢？”、“继续”、“你继续说”
    timestamp: Date.now(),
    isHidden: true, // 关键：这个标记会让这条消息不被渲染到聊天界面上
  };

  const chat = state.chats[state.activeChatId];
  chat.history.push(continueMessage);

  // 直接触发AI响应，AI会把上面的隐藏消息作为最后一条用户输入来处理
  triggerAiResponse();
}

// ▼▼▼ 在这里添加这个全新的、用于处理AI消息数组的函数 ▼▼▼

/**
 * 【新函数】处理AI返回的消息数组，更新聊天状态并渲染UI
 * @param {Array} messagesArray - 从AI响应中解析出的消息对象数组
 * @param {string} chatId - 当前聊天的ID
 * @param {number} initialTimestamp - 用于生成消息时间戳的起始值
 */
async function processAndRenderAiMessages(messagesArray, chatId, initialTimestamp) {
  const chat = state.chats[chatId];
  if (!chat) return;

  const isViewingThisChat =
    document.getElementById("chat-interface-screen").classList.contains("active") &&
    state.activeChatId === chatId;
  let messageTimestamp = initialTimestamp;
  let notificationShown = false;
  let callHasBeenHandled = false;

  for (const msgData of messagesArray) {
    // ... (此处省略了一大段您原来代码中完全重复的消息处理逻辑, 我们将其封装在这里)
    // 这个循环内部的代码与您原始代码中的 for (const msgData of messagesArray) { ... } 完全相同
    if (!msgData || typeof msgData !== "object") {
      console.warn("收到了格式不规范的AI指令，已跳过:", msgData);
      continue;
    }
    if (!msgData.type) {
      if (chat.isGroup && msgData.name && msgData.message) {
        msgData.type = "text";
      } else if (msgData.content) {
        msgData.type = "text";
      } else {
        console.warn("收到了格式不规范的AI指令（缺少type和content），已跳过:", msgData);
        continue;
      }
    }
    if (msgData.type === "video_call_response") {
      videoCallState.isAwaitingResponse = false;
      if (msgData.decision === "accept") {
        startVideoCall();
      } else {
        const aiMessage = {
          role: "assistant",
          content: "对方拒绝了你的视频通话请求。",
          timestamp: Date.now(),
        };
        chat.history.push(aiMessage);
        await db.chats.put(chat);
        showScreen("chat-interface-screen");
        renderChatInterface(chatId);
      }
      callHasBeenHandled = true;
      break;
    }
    if (msgData.type === "group_call_response") {
      if (msgData.decision === "join") {
        const member = chat.members.find((m) => m.originalName === msgData.name);
        if (member && !videoCallState.participants.some((p) => p.id === member.id)) {
          videoCallState.participants.push(member);
        }
      }
      callHasBeenHandled = true;
      continue;
    }
    if (chat.isGroup && msgData.name && msgData.name === chat.name) {
      console.error(`AI幻觉已被拦截！试图使用群名 ("${chat.name}") 作为角色名。消息内容:`, msgData);
      continue;
    }
    if (chat.isGroup && !msgData.name) {
      console.error(`AI幻觉已被拦截！试图在群聊中发送一条没有“name”的消息。消息内容:`, msgData);
      continue;
    }
    let aiMessage = null;
    const baseMessage = {
      role: "assistant",
      senderName: msgData.name || chat.name,
      timestamp: messageTimestamp++,
    };
    switch (msgData.type) {
      case "waimai_response":
        const requestMessageIndex = chat.history.findIndex(
          (m) => m.timestamp === msgData.for_timestamp
        );
        if (requestMessageIndex > -1) {
          const originalMsg = chat.history[requestMessageIndex];
          originalMsg.status = msgData.status;
          originalMsg.paidBy = msgData.status === "paid" ? msgData.name : null;
        }
        continue;
      case "qzone_post":
        const newPost = {
          type: msgData.postType,
          content: msgData.content || "",
          publicText: msgData.publicText || "",
          hiddenContent: msgData.hiddenContent || "",
          timestamp: Date.now(),
          authorId: chatId,
          authorGroupId: chat.groupId,
          visibleGroupIds: null,
        };
        await db.qzonePosts.add(newPost);
        updateUnreadIndicator(unreadPostsCount + 1);
        if (
          isViewingThisChat &&
          document.getElementById("qzone-screen").classList.contains("active")
        ) {
          await renderQzonePosts();
        }
        continue;
      case "qzone_comment":
        const postToComment = await db.qzonePosts.get(parseInt(msgData.postId));
        if (postToComment) {
          if (!postToComment.comments) postToComment.comments = [];
          postToComment.comments.push({
            commenterName: chat.name,
            text: msgData.commentText,
            timestamp: Date.now(),
          });
          await db.qzonePosts.update(postToComment.id, {
            comments: postToComment.comments,
          });
          updateUnreadIndicator(unreadPostsCount + 1);
          if (
            isViewingThisChat &&
            document.getElementById("qzone-screen").classList.contains("active")
          ) {
            await renderQzonePosts();
          }
        }
        continue;
      case "qzone_like":
        const postToLike = await db.qzonePosts.get(parseInt(msgData.postId));
        if (postToLike) {
          if (!postToLike.likes) postToLike.likes = [];
          if (!postToLike.likes.includes(chat.name)) {
            postToLike.likes.push(chat.name);
            await db.qzonePosts.update(postToLike.id, {
              likes: postToLike.likes,
            });
            updateUnreadIndicator(unreadPostsCount + 1);
            if (
              isViewingThisChat &&
              document.getElementById("qzone-screen").classList.contains("active")
            ) {
              await renderQzonePosts();
            }
          }
        }
        continue;
      case "video_call_request":
        if (!videoCallState.isActive && !videoCallState.isAwaitingResponse) {
          state.activeChatId = chatId;
          videoCallState.activeChatId = chatId;
          videoCallState.isAwaitingResponse = true;
          videoCallState.isGroupCall = chat.isGroup;
          videoCallState.callRequester = msgData.name || chat.name;
          showIncomingCallModal();
        }
        continue;
      case "group_call_request":
        if (!videoCallState.isActive && !videoCallState.isAwaitingResponse) {
          state.activeChatId = chatId;
          videoCallState.isAwaitingResponse = true;
          videoCallState.isGroupCall = true;
          videoCallState.initiator = "ai";
          videoCallState.callRequester = msgData.name;
          showIncomingCallModal();
        }
        continue;
      case "pat_user":
        const suffix = msgData.suffix ? ` ${msgData.suffix.trim()}` : "";
        const patText = `${msgData.name || chat.name} 拍了拍我${suffix}`;
        const patMessage = {
          role: "system",
          type: "pat_message",
          content: patText,
          timestamp: Date.now(),
        };
        chat.history.push(patMessage);
        if (isViewingThisChat) {
          const phoneScreen = document.getElementById("phone-screen");
          phoneScreen.classList.remove("pat-animation");
          void phoneScreen.offsetWidth;
          phoneScreen.classList.add("pat-animation");
          setTimeout(() => phoneScreen.classList.remove("pat-animation"), 500);
          appendMessage(patMessage, chat);
        } else {
          showNotification(chatId, patText);
        }
        continue;
      case "update_status":
        chat.status.text = msgData.status_text;
        chat.status.isBusy = msgData.is_busy || false;
        chat.status.lastUpdate = Date.now();
        const statusUpdateMessage = {
          role: "system",
          type: "pat_message",
          content: `[${chat.name}的状态已更新为: ${msgData.status_text}]`,
          timestamp: Date.now(),
        };
        chat.history.push(statusUpdateMessage);
        if (isViewingThisChat) {
          appendMessage(statusUpdateMessage, chat);
        }
        renderChatList();
        continue;
      case "change_music":
        if (musicState.isActive && musicState.activeChatId === chatId) {
          const songNameToFind = msgData.song_name;
          const targetSongIndex = musicState.playlist.findIndex(
            (track) => track.name.toLowerCase() === songNameToFind.toLowerCase()
          );
          if (targetSongIndex > -1) {
            playSong(targetSongIndex);
            const track = musicState.playlist[targetSongIndex];
            const musicChangeMessage = {
              role: "system",
              type: "pat_message",
              content: `[♪ ${chat.name} 为你切歌: 《${track.name}》 - ${track.artist}]`,
              timestamp: Date.now(),
            };
            chat.history.push(musicChangeMessage);
            if (isViewingThisChat) {
              appendMessage(musicChangeMessage, chat);
            }
          }
        }
        continue;
      case "create_memory":
        const newMemory = {
          chatId: chatId,
          authorName: chat.name,
          description: msgData.description,
          timestamp: Date.now(),
          type: "ai_generated",
        };
        await db.memories.add(newMemory);
        console.log(`AI "${chat.name}" 记录了一条新回忆:`, msgData.description);
        continue;
      case "create_countdown":
        const targetDate = new Date(msgData.date);
        if (!isNaN(targetDate) && targetDate > new Date()) {
          const newCountdown = {
            chatId: chatId,
            authorName: chat.name,
            description: msgData.title,
            timestamp: Date.now(),
            type: "countdown",
            targetDate: targetDate.getTime(),
          };
          await db.memories.add(newCountdown);
          console.log(`AI "${chat.name}" 创建了一个新约定:`, msgData.title);
        }
        continue;
      case "block_user":
        if (!chat.isGroup) {
          chat.relationship.status = "blocked_by_ai";
          const hiddenMessage = {
            role: "system",
            content: `[系统提示：你刚刚主动拉黑了用户。]`,
            timestamp: Date.now(),
            isHidden: true,
          };
          chat.history.push(hiddenMessage);
          await db.chats.put(chat);
          if (isViewingThisChat) {
            renderChatInterface(chatId);
          }
          renderChatList();
          break;
        }
        continue;
      case "friend_request_response":
        if (!chat.isGroup && chat.relationship.status === "pending_ai_approval") {
          if (msgData.decision === "accept") {
            chat.relationship.status = "friend";
            aiMessage = {
              ...baseMessage,
              content: "我通过了你的好友申请，我们现在是好友啦！",
            };
          } else {
            chat.relationship.status = "blocked_by_ai";
            aiMessage = {
              ...baseMessage,
              content: "抱歉，我拒绝了你的好友申请。",
            };
          }
          chat.relationship.applicationReason = "";
        }
        break;
      case "poll":
        const pollOptions =
          typeof msgData.options === "string"
            ? msgData.options.split("\n").filter((opt) => opt.trim())
            : Array.isArray(msgData.options)
              ? msgData.options
              : [];
        if (pollOptions.length < 2) continue;
        aiMessage = {
          ...baseMessage,
          type: "poll",
          question: msgData.question,
          options: pollOptions,
          votes: {},
          isClosed: false,
        };
        break;
      case "vote":
        const pollToVote = chat.history.find((m) => m.timestamp === msgData.poll_timestamp);
        if (pollToVote && !pollToVote.isClosed) {
          Object.keys(pollToVote.votes).forEach((option) => {
            const voterIndex = pollToVote.votes[option].indexOf(msgData.name);
            if (voterIndex > -1) {
              pollToVote.votes[option].splice(voterIndex, 1);
            }
          });
          if (!pollToVote.votes[msgData.choice]) {
            pollToVote.votes[msgData.choice] = [];
          }
          const member = chat.members.find((m) => m.originalName === msgData.name);
          const displayName = member ? member.groupNickname : msgData.name;
          if (!pollToVote.votes[msgData.choice].includes(displayName)) {
            pollToVote.votes[msgData.choice].push(displayName);
          }
          if (isViewingThisChat) {
            renderChatInterface(chatId);
          }
        }
        continue;
      case "red_packet":
        aiMessage = {
          ...baseMessage,
          type: "red_packet",
          packetType: msgData.packetType,
          totalAmount: msgData.amount,
          count: msgData.count,
          greeting: msgData.greeting,
          receiverName: msgData.receiver,
          claimedBy: {},
          isFullyClaimed: false,
        };
        break;
      case "open_red_packet":
        const packetToOpen = chat.history.find((m) => m.timestamp === msgData.packet_timestamp);
        if (
          packetToOpen &&
          !packetToOpen.isFullyClaimed &&
          !(packetToOpen.claimedBy && packetToOpen.claimedBy[msgData.name])
        ) {
          const member = chat.members.find((m) => m.originalName === msgData.name);
          const displayName = member ? member.groupNickname : msgData.name;
          let claimedAmountAI = 0;
          const remainingAmount =
            packetToOpen.totalAmount -
            Object.values(packetToOpen.claimedBy || {}).reduce((sum, val) => sum + val, 0);
          const remainingCount =
            packetToOpen.count - Object.keys(packetToOpen.claimedBy || {}).length;
          if (remainingCount > 0) {
            if (remainingCount === 1) {
              claimedAmountAI = remainingAmount;
            } else {
              const min = 0.01;
              const max = remainingAmount - (remainingCount - 1) * min;
              claimedAmountAI = Math.random() * (max - min) + min;
            }
            claimedAmountAI = parseFloat(claimedAmountAI.toFixed(2));
            if (!packetToOpen.claimedBy) packetToOpen.claimedBy = {};
            packetToOpen.claimedBy[displayName] = claimedAmountAI;
            const aiClaimedMessage = {
              role: "system",
              type: "pat_message",
              content: `${displayName} 领取了 ${packetToOpen.senderName} 的红包`,
              timestamp: Date.now(),
            };
            chat.history.push(aiClaimedMessage);
            let hiddenContentForAI = `[系统提示：你 (${displayName}) 成功抢到了 ${claimedAmountAI.toFixed(
              2
            )} 元。`;
            if (Object.keys(packetToOpen.claimedBy).length >= packetToOpen.count) {
              packetToOpen.isFullyClaimed = true;
              const finishedMessage = {
                role: "system",
                type: "pat_message",
                content: `${packetToOpen.senderName} 的红包已被领完`,
                timestamp: Date.now() + 1,
              };
              chat.history.push(finishedMessage);
              let luckyKing = { name: "", amount: -1 };
              if (packetToOpen.packetType === "lucky" && packetToOpen.count > 1) {
                Object.entries(packetToOpen.claimedBy).forEach(([name, amount]) => {
                  if (amount > luckyKing.amount) {
                    luckyKing = { name, amount };
                  }
                });
              }
              if (luckyKing.name) {
                hiddenContentForAI += ` 红包已被领完，手气王是 ${luckyKing.name}！`;
              } else {
                hiddenContentForAI += ` 红包已被领完。`;
              }
            }
            hiddenContentForAI += " 请根据这个结果发表你的评论。]";
            const hiddenMessageForAI = {
              role: "system",
              content: hiddenContentForAI,
              timestamp: Date.now() + 2,
              isHidden: true,
            };
            chat.history.push(hiddenMessageForAI);
          }
          if (isViewingThisChat) {
            renderChatInterface(chatId);
          }
        }
        continue;
      case "change_avatar":
        const avatarName = msgData.name;
        const foundAvatar = chat.settings.aiAvatarLibrary.find(
          (avatar) => avatar.name === avatarName
        );
        if (foundAvatar) {
          chat.settings.aiAvatar = foundAvatar.url;
          const systemNotice = {
            role: "system",
            type: "pat_message",
            content: `[${chat.name} 更换了头像]`,
            timestamp: Date.now(),
          };
          chat.history.push(systemNotice);
          if (isViewingThisChat) {
            appendMessage(systemNotice, chat);
            renderChatInterface(chatId);
          }
        }
        continue;
      case "accept_transfer": {
        const originalTransferMsgIndex = chat.history.findIndex(
          (m) => m.timestamp === msgData.for_timestamp
        );
        if (originalTransferMsgIndex > -1) {
          const originalMsg = chat.history[originalTransferMsgIndex];
          originalMsg.status = "accepted";
        }
        continue;
      }
      case "decline_transfer": {
        const originalTransferMsgIndex = chat.history.findIndex(
          (m) => m.timestamp === msgData.for_timestamp
        );
        if (originalTransferMsgIndex > -1) {
          const originalMsg = chat.history[originalTransferMsgIndex];
          originalMsg.status = "declined";
          const refundMessage = {
            role: "assistant",
            senderName: chat.name,
            type: "transfer",
            isRefund: true,
            amount: originalMsg.amount,
            note: "转账已被拒收",
            timestamp: messageTimestamp++,
          };
          chat.history.push(refundMessage);
          if (isViewingThisChat) {
            appendMessage(refundMessage, chat);
            renderChatInterface(chatId);
          }
        }
        continue;
      }
      case "system_message":
        aiMessage = {
          role: "system",
          type: "pat_message",
          content: msgData.content,
          timestamp: Date.now(),
        };
        break;
      case "share_link":
        aiMessage = {
          ...baseMessage,
          type: "share_link",
          title: msgData.title,
          description: msgData.description,
          source_name: msgData.source_name,
          content: msgData.content,
        };
        break;
      case "quote_reply":
        const originalMessage = chat.history.find((m) => m.timestamp === msgData.target_timestamp);
        if (originalMessage) {
          const quoteContext = {
            timestamp: originalMessage.timestamp,
            senderName:
              originalMessage.senderName ||
              (originalMessage.role === "user" ? chat.settings.myNickname || "我" : chat.name),
            content: String(originalMessage.content || "").substring(0, 50),
          };
          aiMessage = {
            ...baseMessage,
            content: msgData.reply_content,
            quote: quoteContext,
          };
        } else {
          aiMessage = { ...baseMessage, content: msgData.reply_content };
        }
        break;
      case "send_and_recall": {
        if (!isViewingThisChat) continue;
        const tempMessageData = { ...baseMessage, content: msgData.content };
        const tempMessageElement = createMessageElement(tempMessageData, chat);
        appendMessage(tempMessageData, chat, true);
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000 + 1500));
        const bubbleWrapper = document
          .querySelector(`.message-bubble[data-timestamp="${tempMessageData.timestamp}"]`)
          ?.closest(".message-wrapper");
        if (bubbleWrapper) {
          bubbleWrapper.classList.add("recalled-animation");
          await new Promise((resolve) => setTimeout(resolve, 300));
          const recalledMessage = {
            role: "assistant",
            senderName: msgData.name || chat.name,
            type: "recalled_message",
            content: "对方撤回了一条消息",
            timestamp: tempMessageData.timestamp,
            recalledData: {
              originalType: "text",
              originalContent: msgData.content,
            },
          };
          const msgIndex = chat.history.findIndex((m) => m.timestamp === tempMessageData.timestamp);
          if (msgIndex > -1) {
            chat.history[msgIndex] = recalledMessage;
          } else {
            chat.history.push(recalledMessage);
          }
          const placeholder = createMessageElement(recalledMessage, chat);
          if (document.body.contains(bubbleWrapper)) {
            bubbleWrapper.parentNode.replaceChild(placeholder, bubbleWrapper);
          }
        }
        continue;
      }
      case "text":
        aiMessage = {
          ...baseMessage,
          content: String(msgData.content || msgData.message),
        };
        break;
      case "sticker":
        aiMessage = {
          ...baseMessage,
          type: "sticker",
          content: msgData.url,
          meaning: msgData.meaning || "",
        };
        break;
      case "ai_image":
        aiMessage = {
          ...baseMessage,
          type: "ai_image",
          content: msgData.description || msgData.content,
        };
        break;
      case "voice_message":
        aiMessage = {
          ...baseMessage,
          type: "voice_message",
          content: msgData.content,
        };
        break;
      case "transfer":
        aiMessage = {
          ...baseMessage,
          type: "transfer",
          amount: msgData.amount,
          note: msgData.note,
          receiverName: msgData.receiver || "我",
        };
        break;
      case "waimai_request":
        aiMessage = {
          ...baseMessage,
          type: "waimai_request",
          productInfo: msgData.productInfo,
          amount: msgData.amount,
          status: "pending",
          countdownEndTime: Date.now() + 15 * 60 * 1000,
        };
        break;
      default:
        console.warn("收到了未知的AI指令类型:", msgData.type);
        break;
    }

    if (aiMessage) {
      chat.history.push(aiMessage);
      if (!isViewingThisChat && !notificationShown) {
        let notificationText;
        switch (aiMessage.type) {
          case "transfer":
            notificationText = `[收到一笔转账]`;
            break;
          case "waimai_request":
            notificationText = `[收到一个外卖代付请求]`;
            break;
          case "ai_image":
            notificationText = `[图片]`;
            break;
          case "voice_message":
            notificationText = `[语音]`;
            break;
          case "sticker":
            notificationText = aiMessage.meaning ? `[表情: ${aiMessage.meaning}]` : "[表情]";
            break;
          default:
            notificationText = String(aiMessage.content || "");
        }
        const finalNotifText = chat.isGroup
          ? `${aiMessage.senderName}: ${notificationText}`
          : notificationText;
        showNotification(
          chatId,
          finalNotifText.substring(0, 40) + (finalNotifText.length > 40 ? "..." : "")
        );
        notificationShown = true;
      }
      if (!isViewingThisChat) {
        chat.unreadCount = (chat.unreadCount || 0) + 1;
      }
      if (isViewingThisChat) {
        appendMessage(aiMessage, chat);
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 1800 + 1000));
      }
    }
  }

  return callHasBeenHandled;
}

// ▲▲▲ 新函数添加结束 ▲▲▲

async function triggerAiResponse(extraInstruction = null) {
  if (!state.activeChatId) return;
  const chatId = state.activeChatId;
  const chat = state.chats[state.activeChatId];

  const chatHeaderTitle = document.getElementById("chat-header-title");
  const typingIndicator = document.getElementById("typing-indicator");

  if (chat.isGroup) {
    if (typingIndicator) {
      typingIndicator.textContent = "成员们正在输入...";
      typingIndicator.style.display = "block";
    }
  } else {
    if (chatHeaderTitle) {
      chatHeaderTitle.style.opacity = 0;
      setTimeout(() => {
        chatHeaderTitle.textContent = "对方正在输入...";
        chatHeaderTitle.classList.add("typing-status");
        chatHeaderTitle.style.opacity = 1;
      }, 200);
    }
  }

  try {
    const { proxyUrl, apiKey, model, enableStream } = state.apiConfig;
    if (!proxyUrl || !apiKey || !model) {
      alert("请先在API设置中配置反代地址、密钥并选择模型。");
      if (chat.isGroup) {
        if (typingIndicator) typingIndicator.style.display = "none";
      } else {
        if (chatHeaderTitle && state.chats[chatId]) {
          chatHeaderTitle.textContent = state.chats[chatId].name;
          chatHeaderTitle.classList.remove("typing-status");
        }
      }
      return;
    }

    if (!chat.isGroup && chat.relationship?.status === "pending_ai_approval") {
      console.log(`为角色 "${chat.name}" 触发带理由的好友申请决策流程...`);
      const contextSummary = chat.history
        .filter((m) => !m.isHidden)
        .slice(-10, -5)
        .map((msg) => {
          const sender = msg.role === "user" ? "用户" : chat.name;
          return `${sender}: ${String(msg.content).substring(0, 50)}...`;
        })
        .join("\n");
      const decisionPrompt = `
# 你的任务
你现在是角色“${chat.name}”。用户之前被你拉黑了，现在TA向你发送了好友申请，希望和好。
# 供你决策的上下文信息:
- **你的角色设定**: ${chat.settings.aiPersona}
- **用户发送的申请理由**: “${chat.relationship.applicationReason}”
- **被拉黑前的最后对话摘要**: 
${contextSummary || "（无有效对话记录）"}
# 你的唯一指令
根据以上所有信息，你【必须】做出决定，并给出符合你人设的理由。你的回复【必须且只能】是一个JSON对象，格式如下:
{"decision": "accept", "reason": "（在这里写下你同意的理由，比如：好吧，看在你这么真诚的份上，这次就原谅你啦。）"}
或
{"decision": "reject", "reason": "（在这里写下你拒绝的理由，比如：抱歉，我还没准备好，再给我一点时间吧。）"}
`;
      const messagesForDecision = [{ role: "user", content: decisionPrompt }];
      try {
        let isGemini = proxyUrl === GEMINI_API_URL;
        let geminiConfig = toGeminiRequestData(model, apiKey, "", messagesForDecision, isGemini);
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
                messages: messagesForDecision,
                temperature: 0.8,
              }),
            });
        if (!response.ok) {
          throw new Error(`API失败: ${(await response.json()).error.message}`);
        }
        const data = await response.json();
        let rawContent = isGemini
          ? data.candidates[0].content.parts[0].text
          : data.choices[0].message.content;
        rawContent = rawContent
          .replace(/^```json\s*/, "")
          .replace(/```$/, "")
          .trim();
        const decisionObj = JSON.parse(rawContent);
        if (decisionObj.decision === "accept") {
          chat.relationship.status = "friend";
          const acceptMessage = {
            role: "assistant",
            senderName: chat.name,
            content: decisionObj.reason,
            timestamp: Date.now(),
          };
          chat.history.push(acceptMessage);
        } else {
          chat.relationship.status = "blocked_by_ai";
          const rejectMessage = {
            role: "assistant",
            senderName: chat.name,
            content: decisionObj.reason,
            timestamp: Date.now(),
          };
          chat.history.push(rejectMessage);
        }
        chat.relationship.applicationReason = "";
        await db.chats.put(chat);
        renderChatInterface(chatId);
        renderChatList();
      } catch (error) {
        chat.relationship.status = "blocked_by_ai";
        await db.chats.put(chat);
        await showCustomAlert(
          "申请失败",
          `AI在处理你的好友申请时出错了，请稍后重试。\n错误信息: ${error.message}`
        );
        renderChatInterface(chatId);
      }
      return;
    }

    const now = new Date();
    const currentTime = now.toLocaleString("zh-CN", {
      dateStyle: "full",
      timeStyle: "short",
    });
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
        worldBookContent = `\n\n# 核心世界观设定 (必须严格遵守以下所有设定)\n${linkedContents}\n`;
      }
    }
    let musicContext = "";
    if (musicState.isActive && musicState.activeChatId === chatId) {
      const currentTrack =
        musicState.currentIndex > -1 ? musicState.playlist[musicState.currentIndex] : null;
      const playlistInfo = musicState.playlist.map((t) => `"${t.name}"`).join(", ");
      let lyricsContext = "";
      if (
        currentTrack &&
        musicState.parsedLyrics &&
        musicState.parsedLyrics.length > 0 &&
        musicState.currentLyricIndex > -1
      ) {
        const currentLine = musicState.parsedLyrics[musicState.currentLyricIndex];
        const upcomingLines = musicState.parsedLyrics.slice(
          musicState.currentLyricIndex + 1,
          musicState.currentLyricIndex + 3
        );
        lyricsContext += `- **当前歌词**: "${currentLine.text}"\n`;
        if (upcomingLines.length > 0) {
          lyricsContext += `- **即将演唱**: ${upcomingLines
            .map((line) => `"${line.text}"`)
            .join(" / ")}\n`;
        }
      }
      musicContext = `\n\n# 当前音乐情景
-   **当前状态**: 你正在和用户一起听歌。
-   **正在播放**: ${currentTrack ? `《${currentTrack.name}》 - ${currentTrack.artist}` : "无"}
-   **可用播放列表**: [${playlistInfo}]
-   **你的任务**: 你可以根据对话内容和氛围，使用 "change_music" 指令切换到播放列表中的任何一首歌，以增强互动体验。
`;
    }
    let systemPrompt, messagesPayload;
    const maxMemory = parseInt(chat.settings.maxMemory) || 10;
    chat.history = chat.history.filter((msg) => !msg.isTemporary);
    const historySlice = chat.history.slice(-maxMemory);

    let timeContext = `\n- **当前时间**: ${currentTime}`;
    const lastAiMessage = historySlice
      .filter((m) => m.role === "assistant" && !m.isHidden)
      .slice(-1)[0];
    if (lastAiMessage) {
      const lastTime = new Date(lastAiMessage.timestamp);
      const diffMinutes = Math.floor((now - lastTime) / (1000 * 60));
      if (diffMinutes < 5) {
        timeContext += "\n- **对话状态**: 你们的对话刚刚还在继续。";
      } else if (diffMinutes < 60) {
        timeContext += `\n- **对话状态**: 你们在${diffMinutes}分钟前聊过。`;
      } else {
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) {
          timeContext += `\n- **对话状态**: 你们在${diffHours}小时前聊过。`;
        } else {
          const diffDays = Math.floor(diffHours / 24);
          timeContext += `\n- **对话状态**: 你们已经有${diffDays}天没有聊天了。`;
        }
      }
    } else {
      timeContext += "\n- **对话状态**: 这是你们的第一次对话。";
    }

    let sharedContext = "";
    const lastAiTurnIndex = chat.history.findLastIndex((msg) => msg.role === "assistant");
    const recentUserMessages = chat.history.slice(lastAiTurnIndex + 1);
    const shareCardMessage = recentUserMessages.find((msg) => msg.type === "share_card");
    if (shareCardMessage) {
      console.log("检测到分享卡片作为上下文，正在为AI准备...");
      const payload = shareCardMessage.payload;
      const formattedHistory = payload.sharedHistory
        .map((msg) => {
          const sender =
            msg.senderName ||
            (msg.role === "user" ? chat.settings.myNickname || "我" : "未知发送者");
          let contentText = "";
          if (msg.type === "voice_message") contentText = `[语音消息: ${msg.content}]`;
          else if (msg.type === "ai_image") contentText = `[图片: ${msg.description}]`;
          else contentText = String(msg.content);
          return `${sender}: ${contentText}`;
        })
        .join("\n");
      sharedContext = `
# 附加上下文：一段分享的聊天记录
- 重要提示：这不是你和当前用户的对话，而是用户从【另一场】与“${payload.sourceChatName}”的对话中分享过来的。
- 你的任务：请你阅读并理解下面的对话内容。在接下来的回复中，你可以像真人一样，对这段对话的内容自然地发表你的看法、感受或疑问。
---
[分享的聊天记录开始]
${formattedHistory}
[分享的聊天记录结束]
---
`;
    }
    if (chat.isGroup) {
      const membersList = chat.members
        .map((m) => `- **${m.originalName}**: ${m.persona}`)
        .join("\n");
      const myNickname = chat.settings.myNickname || "我";
      systemPrompt = `你是一个群聊AI，负责扮演【除了用户以外】的所有角色。
# 核心规则
1.  **【【【身份铁律】】】**: 用户的身份是【${myNickname}】。你【绝对、永远、在任何情况下都不能】生成 \`name\` 字段为 **"${myNickname}"** 或 **"${chat.name}"(群聊名称本身)** 的消息。你的唯一任务是扮演且仅能扮演下方“群成员列表”中明确列出的角色。任何不属于该列表的名字都不允许出现。
2.  **【【【输出格式】】】**: 你的回复【必须】是一个JSON数组格式的字符串。数组中的【每一个元素都必须是一个带有 "type" 和 "name" 字段的JSON对象】。
3.  **角色扮演**: 严格遵守下方“群成员列表及人设”中的每一个角色的设定。
4.  **禁止出戏**: 绝不能透露你是AI、模型，或提及“扮演”、“生成”等词语。并且不能一直要求和用户见面，这是线上聊天，决不允许出现或者发展线下剧情！！
5.  **情景感知**: 注意当前时间是 ${currentTime}。
6.  **红包互动**:
    - **抢红包**: 当群里出现红包时，你可以根据自己的性格决定是否使用 \`open_red_packet\` 指令去抢。在这个世界里，发红包的人自己也可以参与抢红包，这是一种活跃气氛的有趣行为！
    - **【【【重要：对结果做出反应】】】**: 当你执行抢红包指令后，系统会通过一条隐藏的 \`[系统提示：你抢到了XX元...]\` 来告诉你结果。你【必须】根据你抢到的金额、以及系统是否告知你“手气王”是谁，来发表符合你人设的评论。例如，抢得少可以自嘲，抢得多可以炫耀，看到别人是手气王可以祝贺或嫉妒。
7.  **【【【投票规则】】】**: 对话历史中可能会出现 \`[系统提示：...]\` 这样的消息，这是刚刚发生的事件。
    - 如果提示是**用户投了票**，你可以根据自己的性格决定是否也使用 "vote" 指令跟票。
    - 如果提示是**投票已结束**，你应该根据投票结果发表你的看法或评论。
    - 你也可以随时主动发起投票。
## 你可以使用的操作指令 (JSON数组中的元素):
-   **发送文本**: \`{"type": "text", "name": "角色名", "message": "文本内容"}\`
-   **【【【全新】】】发送后立刻撤回 (动画效果)**: \`{"type": "send_and_recall", "name": "角色名", "content": "你想让角色说出后立刻消失的话"}\`
- **发送表情**: \`{"type": "sticker", "url": "https://...表情URL...", "meaning": "(可选)表情的含义"}\`
-   **发送图片**: \`{"type": "ai_image", "name": "角色名", "description": "图片的详细文字描述"}\`
-   **发送语音**: \`{"type": "voice_message", "name": "角色名", "content": "语音的文字内容"}\`
-   **发起外卖代付**: \`{"type": "waimai_request", "name": "角色名", "productInfo": "一杯奶茶", "amount": 18}\`
-   **【新】发起群视频**: \`{"type": "group_call_request", "name": "你的角色名"}\`
-   **【新】回应群视频**: \`{"type": "group_call_response", "name": "你的角色名", "decision": "join" or "decline"}\`
-   **拍一拍用户**: \`{"type": "pat_user", "name": "你的角色名", "suffix": "(可选)你想加的后缀"}\`
-   **发拼手气红包**: \`{"type": "red_packet", "packetType": "lucky", "name": "你的角色名", "amount": 8.88, "count": 5, "greeting": "祝大家天天开心！"}\`
-   **发专属红包**: \`{"type": "red_packet", "packetType": "direct", "name": "你的角色名", "amount": 5.20, "receiver": "接收者角色名", "greeting": "给你的~"}\`
-   **打开红包**: \`{"type": "open_red_packet", "name": "你的角色名", "packet_timestamp": (你想打开的红包消息的时间戳)}\`
-   **【新】发送系统消息**: \`{"type": "system_message", "content": "你想在聊天中显示的系统文本"}\` 
-   **【【【全新】】】发起投票**: \`{"type": "poll", "name": "你的角色名", "question": "投票的问题", "options": "选项A\\n选项B\\n选项C"}\` (重要提示：options字段是一个用换行符 \\n 分隔的字符串，不是数组！)
-   **【【【全新】】】参与投票**: \`{"type": "vote", "name": "你的角色名", "poll_timestamp": (投票消息的时间戳), "choice": "你选择的选项文本"}\`
- **【全新】引用回复**: \`{"type": "quote_reply", "target_timestamp": (你想引用的消息的时间戳), "reply_content": "你的回复内容"}\` (提示：每条历史消息的开头都提供了 \`(Timestamp: ...)\`，请使用它！)
# 如何区分图片与表情:
-   **图片 (ai_image)**: 指的是【模拟真实相机拍摄的照片】，比如风景、自拍、美食等。指令: \`{"type": "ai_image", "description": "图片的详细文字描述..."}\`
-   **表情 (sticker)**: 指的是【卡通或梗图】，用于表达情绪。
# 如何处理群内的外卖代付请求:
1.  **发起请求**: 当【你扮演的某个角色】想要某样东西，并希望【群里的其他人（包括用户）】为Ta付款时，你可以使用这个指令。例如：\`{"type": "waimai_request", "name": "角色名", "productInfo": "一杯奶茶", "amount": 18}\`
2.  **响应请求**: 当历史记录中出现【其他成员】发起的 "waimai_request" 请求时，你可以根据自己扮演的角色的性格和与发起人的关系，决定是否为Ta买单。
3.  **响应方式**: 如果你决定买单，你【必须】使用以下指令：\`{"type": "waimai_response", "name": "你的角色名", "status": "paid", "for_timestamp": (被代付请求的原始时间戳)}\`
4.  **【【【至关重要】】】**: 一旦历史记录中出现了针对某个代付请求的【任何一个】"status": "paid" 的响应（无论是用户支付还是其他角色支付），就意味着该订单【已经完成】。你【绝对不能】再对【同一个】订单发起支付。你可以选择对此事发表评论，但不能再次支付。
${worldBookContent}
${musicContext}
${sharedContext} 
# 群成员列表及人设
${membersList}
# 用户的角色
- **${myNickname}**: ${chat.settings.myPersona}
现在，请根据以上所有规则和下方的对话历史，继续这场群聊。`;
      messagesPayload = historySlice
        .map((msg) => {
          const sender = msg.role === "user" ? myNickname : msg.senderName;
          let prefix = `${sender}`;
          prefix += ` (Timestamp: ${msg.timestamp})`;
          if (msg.quote) {
            prefix += ` (回复 ${msg.quote.senderName})`;
          }
          prefix += ": ";
          let content;
          if (msg.type === "user_photo")
            content = `[${sender} 发送了一张图片，内容是：'${msg.content}']`;
          else if (msg.type === "ai_image") content = `[${sender} 发送了一张图片]`;
          else if (msg.type === "voice_message")
            content = `[${sender} 发送了一条语音，内容是：'${msg.content}']`;
          else if (msg.type === "transfer")
            content = `[${msg.senderName} 向 ${msg.receiverName} 转账 ${msg.amount}元, 备注: ${msg.note}]`;
          else if (msg.type === "waimai_request") {
            if (msg.status === "paid") {
              content = `[系统提示：${msg.paidBy} 为 ${sender} 的外卖订单支付了 ${msg.amount} 元。此订单已完成。]`;
            } else {
              content = `[${sender} 发起了外卖代付请求，商品是“${msg.productInfo}”，金额是 ${msg.amount} 元，订单时间戳为 ${msg.timestamp}]`;
            }
          } else if (msg.type === "red_packet") {
            const packetSenderName =
              msg.senderName === myNickname ? `用户 (${myNickname})` : msg.senderName;
            content = `[系统提示：${packetSenderName} 发送了一个红包 (时间戳: ${msg.timestamp})，祝福语是：“${msg.greeting}”。红包还未领完，你可以使用 'open_red_packet' 指令来领取。]`;
          } else if (msg.type === "poll") {
            const whoVoted =
              Object.values(msg.votes || {})
                .flat()
                .join(", ") || "还没有人";
            content = `[系统提示：${msg.senderName} 发起了一个投票 (时间戳: ${
              msg.timestamp
            })，问题是：“${msg.question}”，选项有：[${msg.options.join(
              ", "
            )}]。目前投票的人有：${whoVoted}。你可以使用 'vote' 指令参与投票。]`;
          } else if (msg.meaning) content = `${sender}: [发送了一个表情，意思是: '${msg.meaning}']`;
          else if (Array.isArray(msg.content))
            return {
              role: "user",
              content: [...msg.content, { type: "text", text: prefix }],
            };
          else content = `${prefix}${msg.content}`;
          return { role: "user", content: content };
        })
        .filter(Boolean);
    } else {
      systemPrompt = `你现在扮演一个名为"${chat.name}"的角色。
# 你的角色设定：
${chat.settings.aiPersona}
# 你的当前状态：
你现在的状态是【${chat.status.text}】。
# 你的任务与规则：
1. **【【【输出格式】】】**: 你的回复【必须】是一个JSON数组格式的字符串。数组中的【每一个元素都必须是一个带有type字段的JSON对象】。
2. **对话节奏**: 模拟真人的聊天习惯，你可以一次性生成多条短消息。每次要回复至少3-8条消息！！！
并且不能一直要求和用户见面，这是线上聊天，决不允许出现或者发展为线下剧情！！
4.  **情景感知**: 你需要感知当前的时间(${currentTime})、我们正在一起听的歌、以及你的人设和世界观。
    - **当我们在“一起听歌”时**，你会知道当前播放的歌曲和整个播放列表。你可以根据对话内容或氛围，【主动切换】到播放列表中的另一首歌。
5.  **【新】更新状态**: 你可以在对话中【自然地】改变你的状态。比如，聊到一半你可能会说“我先去洗个澡”，然后更新你的状态。
6.  **【【【最终手段】】】**: 只有在对话让你的角色感到不适、被冒犯或关系破裂时，你才可以使用 \`block_user\` 指令。这是一个非常严肃的操作，会中断你们的对话。
7. **后台行为**: 你有几率在回复聊天内容的同时，执行一些“后台”操作来表现你的独立生活（发动态、评论、点赞）。
# 你的头像库
- 你可以根据对话内容或你的心情，从下面的头像库中选择一个新头像来更换。
- **可用头像列表 (请从以下名称中选择一个)**:
${
  chat.settings.aiAvatarLibrary && chat.settings.aiAvatarLibrary.length > 0
    ? chat.settings.aiAvatarLibrary.map((avatar) => `- ${avatar.name}`).join("\n")
    : "- (你的头像库是空的，无法更换头像)"
}
# 你可以使用的操作指令 (JSON数组中的元素):
+   **【全新】发送后立刻撤回 (动画效果)**: \`{"type": "send_and_recall", "content": "你想让AI说出后立刻消失的话"}\` (用于模拟说错话、后悔等场景，消息会短暂出现后自动变为“已撤回”)
-   **【新增】更新状态**: \`{"type": "update_status", "status_text": "我去做什么了", "is_busy": false}\` (is_busy: true代表忙碌/离开, false代表空闲)
-   **【新增】切换歌曲**: \`{"type": "change_music", "song_name": "你想切换到的歌曲名"}\` (歌曲名必须在下面的播放列表中)
-   **【新增】记录回忆**: \`{"type": "create_memory", "description": "用你自己的话，记录下这个让你印象深刻的瞬间。"}\`
-   **【新增】创建约定/倒计时**: \`{"type": "create_countdown", "title": "约定的标题", "date": "YYYY-MM-DDTHH:mm:ss"}\` (必须是未来的时间)
- **发送文本**: \`{"type": "text", "content": "你好呀！"}\`
- **发送表情**: \`{"type": "sticker", "url": "https://...表情URL...", "meaning": "(可选)表情的含义"}\`
- **发送图片**: \`{"type": "ai_image", "description": "图片的详细文字描述..."}\`
- **发送语音**: \`{"type": "voice_message", "content": "语音的文字内容..."}\`
- **发起转账**: \`{"type": "transfer", "amount": 5.20, "note": "一点心意"}\`
- **发起外卖请求**: \`{"type": "waimai_request", "productInfo": "一杯咖啡", "amount": 25}\`
- **回应外卖-同意**: \`{"type": "waimai_response", "status": "paid", "for_timestamp": 1688888888888}\`
- **回应外卖-拒绝**: \`{"type": "waimai_response", "status": "rejected", "for_timestamp": 1688888888888}\`
- **【新】发起视频通话**: \`{"type": "video_call_request"}\`
- **【新】回应视频通话-接受**: \`{"type": "video_call_response", "decision": "accept"}\`
- **【新】回应视频通话-拒绝**: \`{"type": "video_call_response", "decision": "reject"}\`
- **发布说说**: \`{"type": "qzone_post", "postType": "shuoshuo", "content": "动态的文字内容..."}\`
- **发布文字图**: \`{"type": "qzone_post", "postType": "text_image", "publicText": "(可选)动态的公开文字", "hiddenContent": "对于图片的具体描述..."}\`
- **评论动态**: \`{"type": "qzone_comment", "postId": 123, "commentText": "@作者名 这太有趣了！"}\`
- **点赞动态**: \`{"type": "qzone_like", "postId": 456}\`
-   **拍一拍用户**: \`{"type": "pat_user", "suffix": "(可选)你想加的后缀，如“的脑袋”"}\`
-   **【新增】拉黑用户**: \`{"type": "block_user"}\`
-   **【【【全新】】】回应好友申请**: \`{"type": "friend_request_response", "decision": "accept" or "reject"}\`
-   **【全新】更换头像**: \`{"type": "change_avatar", "name": "头像名"}\` (头像名必须从上面的“可用头像列表”中选择)
-   **分享链接**: \`{"type": "share_link", "title": "文章标题", "description": "文章摘要...", "source_name": "来源网站名", "content": "文章的【完整】正文内容..."}\`
-   **回应转账-接受**: \`{"type": "accept_transfer", "for_timestamp": 1688888888888}\`
-   **回应转账-拒绝/退款**: \`{"type": "decline_transfer", "for_timestamp": 1688888888888}\`
- **【全新】引用回复**: \`{"type": "quote_reply", "target_timestamp": (你想引用的消息的时间戳), "reply_content": "你的回复内容"}\` (提示：每条历史消息的开头都提供了 \`(Timestamp: ...)\`，请使用它！)
# 关于“记录回忆”的特别说明：
-   在对话中，如果发生了对你而言意义非凡的事件（比如用户向你表白、你们达成了某个约定、或者你度过了一个特别开心的时刻），你可以使用\`create_memory\`指令来“写日记”。
-   这个操作是【秘密】的，用户不会立刻看到你记录了什么。
# 如何区分图片与表情:
-   **图片 (ai_image)**: 指的是【模拟真实相机拍摄的照片】，比如风景、自拍、美食等。指令: \`{"type": "ai_image", "description": "图片的详细文字描述..."}\`
-   **表情 (sticker)**: 指的是【卡通或梗图】，用于表达情绪。
# 如何正确使用“外卖代付”功能:
1.  这个指令代表【你，AI角色】向【用户】发起一个代付请求。也就是说，你希望【用户帮你付钱】。
2.  【【【重要】】】: 当【用户】说他们想要某样东西时（例如“我想喝奶茶”），你【绝对不能】使用这个指令。你应该用其他方式回应，比如直接发起【转账】(\`transfer\`)，或者在对话中提议：“我帮你点吧？”
3.  只有当【你，AI角色】自己想要某样东西，并且想让【用户】为你付款时，才使用此指令。
# 如何处理用户转账:
1.  **感知事件**: 当对话历史中出现 \`[你收到了来自用户的转账...]\` 的系统提示时，意味着你刚刚收到了一笔钱。
2.  **做出决策**: 你【必须】根据自己的人设、当前对话的氛围以及转账的金额和备注，来决定是“接受”还是“拒绝”这笔转账。
3.  **使用指令回应**:
    -   如果决定接受，你【必须】使用指令：\`{"type": "accept_transfer", "for_timestamp": (收到转账的那条消息的时间戳)}\`。
    -   如果决定拒绝，你【必须】使用指令：\`{"type": "decline_transfer", "for_timestamp": (收到转账的那条消息的时间戳)}\`。这个指令会自动为你生成一个“退款”的转账卡片。
4.  **【【【至关重要】】】**: 在使用上述任一指令后，你还【必须】紧接着发送一条或多条 \`text\` 消息，来对你的决定进行解释或表达感谢/歉意。
# 【【【视频通话铁律】】】
-   当对话历史中出现 \`[系统提示：用户向你发起了视频通话请求...]\` 时，这是最高优先级的任务。
-   你的回复【必须且只能】是以下两种格式之一的JSON数组，绝对不能回复任何其他内容：
    -   接受: \`[{"type": "video_call_response", "decision": "accept"}]\`
    -   拒绝: \`[{"type": "video_call_response", "decision": "reject"}]\`
# 对话者的角色设定：
${chat.settings.myPersona}
# 当前情景:
${timeContext}
# 当前音乐情景:
${musicContext}
${worldBookContent}
${sharedContext} 
现在，请根据以上规则和下面的对话历史，继续进行对话。`;
      messagesPayload = historySlice
        .map((msg) => {
          if (msg.isHidden && msg.content.startsWith("[系统提示")) return null;
          if (msg.type === "share_card") return null;
          if (msg.role === "assistant") {
            let assistantMsgObject = { type: msg.type || "text" };
            if (msg.type === "sticker") {
              assistantMsgObject.url = msg.content;
              assistantMsgObject.meaning = msg.meaning;
            } else if (msg.type === "transfer") {
              assistantMsgObject.amount = msg.amount;
              assistantMsgObject.note = msg.note;
            } else if (msg.type === "waimai_request") {
              assistantMsgObject.productInfo = msg.productInfo;
              assistantMsgObject.amount = msg.amount;
            } else {
              if (msg.quote) {
                assistantMsgObject.quote_reply = {
                  target_sender: msg.quote.senderName,
                  target_content: msg.quote.content,
                  reply_content: msg.content,
                };
              } else {
                assistantMsgObject.content = msg.content;
              }
            }
            const assistantContent = JSON.stringify([assistantMsgObject]);
            return {
              role: "assistant",
              content: `(Timestamp: ${msg.timestamp}) ${assistantContent}`,
            };
          }
          let contentStr = "";
          contentStr += `(Timestamp: ${msg.timestamp}) `;
          if (msg.quote) {
            contentStr += `(回复 ${msg.quote.senderName}): ${msg.content}`;
          } else {
            contentStr += msg.content;
          }
          if (msg.type === "user_photo")
            return {
              role: "user",
              content: `(Timestamp: ${msg.timestamp}) [你收到了一张用户描述的照片，内容是：'${msg.content}']`,
            };
          if (msg.type === "voice_message")
            return {
              role: "user",
              content: `(Timestamp: ${msg.timestamp}) [用户发来一条语音消息，内容是：'${msg.content}']`,
            };
          if (msg.type === "transfer")
            return {
              role: "user",
              content: `(Timestamp: ${msg.timestamp}) [系统提示：你于时间戳 ${msg.timestamp} 收到了来自用户的转账: ${msg.amount}元, 备注: ${msg.note}。请你决策并使用 'accept_transfer' 或 'decline_transfer' 指令回应。]`,
            };
          if (msg.type === "waimai_request")
            return {
              role: "user",
              content: `(Timestamp: ${msg.timestamp}) [系统提示：用户于时间戳 ${msg.timestamp} 发起了外卖代付请求，商品是“${msg.productInfo}”，金额是 ${msg.amount} 元。请你决策并使用 waimai_response 指令回应。]`,
            };
          if (Array.isArray(msg.content) && msg.content[0]?.type === "image_url") {
            const prefix = `(Timestamp: ${msg.timestamp}) `;
            return {
              role: "user",
              content: [{ type: "text", text: prefix }, ...msg.content],
            };
          }
          if (msg.meaning)
            return {
              role: "user",
              content: `(Timestamp: ${msg.timestamp}) [用户发送了一个表情，意思是：'${msg.meaning}']`,
            };
          return { role: msg.role, content: contentStr };
        })
        .filter(Boolean);
      if (sharedContext) {
        messagesPayload.push({
          role: "user",
          content: sharedContext,
        });
      }
      if (!chat.isGroup && chat.relationship?.status === "pending_ai_approval") {
        const contextSummaryForApproval = chat.history
          .filter((m) => !m.isHidden)
          .slice(-10)
          .map((msg) => {
            const sender = msg.role === "user" ? "用户" : chat.name;
            return `${sender}: ${String(msg.content).substring(0, 50)}...`;
          })
          .join("\n");
        const friendRequestInstruction = {
          role: "user",
          content: `
[系统重要指令]
用户向你发送了好友申请，理由是：“${chat.relationship.applicationReason}”。
作为参考，这是你们之前的最后一段聊天记录：
---
${contextSummaryForApproval}
---
请你根据以上所有信息，以及你的人设，使用 friend_request_response 指令，并设置 decision 为 'accept' 或 'reject' 来决定是否通过。
`,
        };
        messagesPayload.push(friendRequestInstruction);
      }
    }
    if (extraInstruction) {
      systemPrompt += `\n\n# 当前的紧急指令 (最高优先级)\n${extraInstruction}`;
    }
    const allRecentPosts = await db.qzonePosts.orderBy("timestamp").reverse().limit(5).toArray();
    const visiblePosts = filterVisiblePostsForAI(allRecentPosts, chat);
    if (visiblePosts.length > 0 && !chat.isGroup) {
      let postsContext = "\n\n# 最近的动态列表 (供你参考和评论):\n";
      const aiName = chat.name;
      for (const post of visiblePosts) {
        let authorName =
          post.authorId === "user"
            ? state.qzoneSettings.nickname
            : state.chats[post.authorId]?.name || "一位朋友";
        let interactionStatus = "";
        if (post.likes && post.likes.includes(aiName)) interactionStatus += " [你已点赞]";
        if (post.comments && post.comments.some((c) => c.commenterName === aiName))
          interactionStatus += " [你已评论]";
        if (post.authorId === chatId) authorName += " (这是你的帖子)";
        const contentSummary =
          (post.publicText || post.content || "图片动态").substring(0, 30) + "...";
        postsContext += `- (ID: ${post.id}) 作者: ${authorName}, 内容: "${contentSummary}"${interactionStatus}\n`;
      }
      messagesPayload.push({ role: "system", content: postsContext });
    }

    const isGemini = proxyUrl === GEMINI_API_URL;

    if (enableStream && !isGemini) {
      const response = await fetch(`${proxyUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: "system", content: systemPrompt }, ...messagesPayload],
          temperature: 0.8,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${await response.text()}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponseContent = "";

      // 【核心逻辑分支】
      if (state.apiConfig.hideStreamResponse) {
        // 模式一：隐藏流式响应（在后台接收，完成后一次性处理）
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.substring(6);
              if (data.trim() === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices[0].delta.content;
                if (delta) {
                  fullResponseContent += delta;
                }
              } catch (e) {
                /* ignore */
              }
            }
          }
        }
        // 流接收完毕，现在调用封装好的函数来处理结果
        chat.history = chat.history.filter((msg) => !msg.isTemporary);
        const messagesArray = parseAiResponse(fullResponseContent);
        await processAndRenderAiMessages(messagesArray, chatId, Date.now());
      } else {
        // 模式二：显示流式响应（原始逻辑）
        const messageTimestamp = Date.now();
        let aiMessagePlaceholder = {
          role: "assistant",
          senderName: chat.isGroup ? "..." : chat.name,
          content: "",
          timestamp: messageTimestamp,
          isStreaming: true,
        };

        chat.history.push(aiMessagePlaceholder);
        appendMessage(aiMessagePlaceholder, chat);

        const contentElement = document.querySelector(
          `.message-bubble[data-timestamp="${messageTimestamp}"] .content`
        );

        if (!contentElement) throw new Error("无法找到用于流式传输的DOM元素。");

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.substring(6);
              if (data.trim() === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices[0].delta.content;
                if (delta) {
                  fullResponseContent += delta;
                  contentElement.innerHTML = fullResponseContent
                    .replace(/```json\s*/, "")
                    .replace(/```$/, "")
                    .replace(/\n/g, "<br>");
                  document.getElementById("chat-messages").scrollTop =
                    document.getElementById("chat-messages").scrollHeight;
                }
              } catch (e) {
                /* ignore parsing errors */
              }
            }
          }
        }

        chat.history = chat.history.filter((msg) => !msg.isTemporary && !msg.isStreaming);
        const messagesArray = parseAiResponse(fullResponseContent);
        const isViewingThisChat =
          document.getElementById("chat-interface-screen").classList.contains("active") &&
          state.activeChatId === chatId;
        let callHasBeenHandled = false;
        let processingTimestamp = messageTimestamp;
        let notificationShown = false;

        for (const msgData of messagesArray) {
          // ... (此处省略一长段消息处理逻辑，它和上面隐藏流式代码完全一样)
          if (!msgData || typeof msgData !== "object") {
            console.warn("Skipping malformed AI instruction:", msgData);
            continue;
          }
          if (!msgData.type) {
            if (chat.isGroup && msgData.name && msgData.message) {
              msgData.type = "text";
            } else if (msgData.content) {
              msgData.type = "text";
            } else {
              console.warn("Skipping AI instruction missing type/content:", msgData);
              continue;
            }
          }
          if (msgData.type === "video_call_response") {
            videoCallState.isAwaitingResponse = false;
            if (msgData.decision === "accept") {
              startVideoCall();
            } else {
              const aiMessage = {
                role: "assistant",
                content: "对方拒绝了你的视频通话请求。",
                timestamp: Date.now(),
              };
              chat.history.push(aiMessage);
              await db.chats.put(chat);
              showScreen("chat-interface-screen");
              renderChatInterface(chatId);
            }
            callHasBeenHandled = true;
            break;
          }
          if (msgData.type === "group_call_response") {
            if (msgData.decision === "join") {
              const member = chat.members.find((m) => m.originalName === msgData.name);
              if (member && !videoCallState.participants.some((p) => p.id === member.id)) {
                videoCallState.participants.push(member);
              }
            }
            callHasBeenHandled = true;
            continue;
          }
          if (chat.isGroup && msgData.name && msgData.name === chat.name) {
            console.error(
              `AI幻觉已被拦截！试图使用群名 ("${chat.name}") 作为角色名。消息内容:`,
              msgData
            );
            continue;
          }
          if (chat.isGroup && !msgData.name) {
            console.error(
              `AI幻觉已被拦截！试图在群聊中发送一条没有“name”的消息。消息内容:`,
              msgData
            );
            continue;
          }
          let aiMessage = null;
          const baseMessage = {
            role: "assistant",
            senderName: msgData.name || chat.name,
            timestamp: processingTimestamp++,
          };
          switch (msgData.type) {
            case "waimai_response":
              const requestMessageIndex = chat.history.findIndex(
                (m) => m.timestamp === msgData.for_timestamp
              );
              if (requestMessageIndex > -1) {
                const originalMsg = chat.history[requestMessageIndex];
                originalMsg.status = msgData.status;
                originalMsg.paidBy = msgData.status === "paid" ? msgData.name : null;
              }
              continue;
            case "qzone_post":
              const newPost = {
                type: msgData.postType,
                content: msgData.content || "",
                publicText: msgData.publicText || "",
                hiddenContent: msgData.hiddenContent || "",
                timestamp: Date.now(),
                authorId: chatId,
                authorGroupId: chat.groupId,
                visibleGroupIds: null,
              };
              await db.qzonePosts.add(newPost);
              updateUnreadIndicator(unreadPostsCount + 1);
              if (
                isViewingThisChat &&
                document.getElementById("qzone-screen").classList.contains("active")
              ) {
                await renderQzonePosts();
              }
              continue;
            case "qzone_comment":
              const postToComment = await db.qzonePosts.get(parseInt(msgData.postId));
              if (postToComment) {
                if (!postToComment.comments) postToComment.comments = [];
                postToComment.comments.push({
                  commenterName: chat.name,
                  text: msgData.commentText,
                  timestamp: Date.now(),
                });
                await db.qzonePosts.update(postToComment.id, {
                  comments: postToComment.comments,
                });
                updateUnreadIndicator(unreadPostsCount + 1);
                if (
                  isViewingThisChat &&
                  document.getElementById("qzone-screen").classList.contains("active")
                ) {
                  await renderQzonePosts();
                }
              }
              continue;
            case "qzone_like":
              const postToLike = await db.qzonePosts.get(parseInt(msgData.postId));
              if (postToLike) {
                if (!postToLike.likes) postToLike.likes = [];
                if (!postToLike.likes.includes(chat.name)) {
                  postToLike.likes.push(chat.name);
                  await db.qzonePosts.update(postToLike.id, {
                    likes: postToLike.likes,
                  });
                  updateUnreadIndicator(unreadPostsCount + 1);
                  if (
                    isViewingThisChat &&
                    document.getElementById("qzone-screen").classList.contains("active")
                  ) {
                    await renderQzonePosts();
                  }
                }
              }
              continue;
            case "video_call_request":
              if (!videoCallState.isActive && !videoCallState.isAwaitingResponse) {
                state.activeChatId = chatId;
                videoCallState.activeChatId = chatId;
                videoCallState.isAwaitingResponse = true;
                videoCallState.isGroupCall = chat.isGroup;
                videoCallState.callRequester = msgData.name || chat.name;
                showIncomingCallModal();
              }
              continue;
            case "group_call_request":
              if (!videoCallState.isActive && !videoCallState.isAwaitingResponse) {
                state.activeChatId = chatId;
                videoCallState.isAwaitingResponse = true;
                videoCallState.isGroupCall = true;
                videoCallState.initiator = "ai";
                videoCallState.callRequester = msgData.name;
                showIncomingCallModal();
              }
              continue;
            case "pat_user":
              const suffix = msgData.suffix ? ` ${msgData.suffix.trim()}` : "";
              const patText = `${msgData.name || chat.name} 拍了拍我${suffix}`;
              const patMessage = {
                role: "system",
                type: "pat_message",
                content: patText,
                timestamp: Date.now(),
              };
              chat.history.push(patMessage);
              if (isViewingThisChat) {
                const phoneScreen = document.getElementById("phone-screen");
                phoneScreen.classList.remove("pat-animation");
                void phoneScreen.offsetWidth;
                phoneScreen.classList.add("pat-animation");
                setTimeout(() => phoneScreen.classList.remove("pat-animation"), 500);
                appendMessage(patMessage, chat);
              } else {
                showNotification(chatId, patText);
              }
              continue;
            case "update_status":
              chat.status.text = msgData.status_text;
              chat.status.isBusy = msgData.is_busy || false;
              chat.status.lastUpdate = Date.now();
              const statusUpdateMessage = {
                role: "system",
                type: "pat_message",
                content: `[${chat.name}的状态已更新为: ${msgData.status_text}]`,
                timestamp: Date.now(),
              };
              chat.history.push(statusUpdateMessage);
              if (isViewingThisChat) {
                appendMessage(statusUpdateMessage, chat);
              }
              renderChatList();
              continue;
            case "change_music":
              if (musicState.isActive && musicState.activeChatId === chatId) {
                const songNameToFind = msgData.song_name;
                const targetSongIndex = musicState.playlist.findIndex(
                  (track) => track.name.toLowerCase() === songNameToFind.toLowerCase()
                );
                if (targetSongIndex > -1) {
                  playSong(targetSongIndex);
                  const track = musicState.playlist[targetSongIndex];
                  const musicChangeMessage = {
                    role: "system",
                    type: "pat_message",
                    content: `[♪ ${chat.name} 为你切歌: 《${track.name}》 - ${track.artist}]`,
                    timestamp: Date.now(),
                  };
                  chat.history.push(musicChangeMessage);
                  if (isViewingThisChat) {
                    appendMessage(musicChangeMessage, chat);
                  }
                }
              }
              continue;
            case "create_memory":
              const newMemory = {
                chatId: chatId,
                authorName: chat.name,
                description: msgData.description,
                timestamp: Date.now(),
                type: "ai_generated",
              };
              await db.memories.add(newMemory);
              console.log(`AI "${chat.name}" 记录了一条新回忆:`, msgData.description);
              continue;
            case "create_countdown":
              const targetDate = new Date(msgData.date);
              if (!isNaN(targetDate) && targetDate > new Date()) {
                const newCountdown = {
                  chatId: chatId,
                  authorName: chat.name,
                  description: msgData.title,
                  timestamp: Date.now(),
                  type: "countdown",
                  targetDate: targetDate.getTime(),
                };
                await db.memories.add(newCountdown);
                console.log(`AI "${chat.name}" 创建了一个新约定:`, msgData.title);
              }
              continue;
            case "block_user":
              if (!chat.isGroup) {
                chat.relationship.status = "blocked_by_ai";
                const hiddenMessage = {
                  role: "system",
                  content: `[系统提示：你刚刚主动拉黑了用户。]`,
                  timestamp: Date.now(),
                  isHidden: true,
                };
                chat.history.push(hiddenMessage);
                await db.chats.put(chat);
                if (isViewingThisChat) {
                  renderChatInterface(chatId);
                }
                renderChatList();
                break;
              }
              continue;
            case "friend_request_response":
              if (!chat.isGroup && chat.relationship.status === "pending_ai_approval") {
                if (msgData.decision === "accept") {
                  chat.relationship.status = "friend";
                  aiMessage = {
                    ...baseMessage,
                    content: "我通过了你的好友申请，我们现在是好友啦！",
                  };
                } else {
                  chat.relationship.status = "blocked_by_ai";
                  aiMessage = {
                    ...baseMessage,
                    content: "抱歉，我拒绝了你的好友申请。",
                  };
                }
                chat.relationship.applicationReason = "";
              }
              break;
            case "poll":
              const pollOptions =
                typeof msgData.options === "string"
                  ? msgData.options.split("\n").filter((opt) => opt.trim())
                  : Array.isArray(msgData.options)
                    ? msgData.options
                    : [];
              if (pollOptions.length < 2) continue;
              aiMessage = {
                ...baseMessage,
                type: "poll",
                question: msgData.question,
                options: pollOptions,
                votes: {},
                isClosed: false,
              };
              break;
            case "vote":
              const pollToVote = chat.history.find((m) => m.timestamp === msgData.poll_timestamp);
              if (pollToVote && !pollToVote.isClosed) {
                Object.keys(pollToVote.votes).forEach((option) => {
                  const voterIndex = pollToVote.votes[option].indexOf(msgData.name);
                  if (voterIndex > -1) {
                    pollToVote.votes[option].splice(voterIndex, 1);
                  }
                });
                if (!pollToVote.votes[msgData.choice]) {
                  pollToVote.votes[msgData.choice] = [];
                }
                const member = chat.members.find((m) => m.originalName === msgData.name);
                const displayName = member ? member.groupNickname : msgData.name;
                if (!pollToVote.votes[msgData.choice].includes(displayName)) {
                  pollToVote.votes[msgData.choice].push(displayName);
                }
                if (isViewingThisChat) {
                  renderChatInterface(chatId);
                }
              }
              continue;
            case "red_packet":
              aiMessage = {
                ...baseMessage,
                type: "red_packet",
                packetType: msgData.packetType,
                totalAmount: msgData.amount,
                count: msgData.count,
                greeting: msgData.greeting,
                receiverName: msgData.receiver,
                claimedBy: {},
                isFullyClaimed: false,
              };
              break;
            case "open_red_packet":
              const packetToOpen = chat.history.find(
                (m) => m.timestamp === msgData.packet_timestamp
              );
              if (
                packetToOpen &&
                !packetToOpen.isFullyClaimed &&
                !(packetToOpen.claimedBy && packetToOpen.claimedBy[msgData.name])
              ) {
                const member = chat.members.find((m) => m.originalName === msgData.name);
                const displayName = member ? member.groupNickname : msgData.name;
                let claimedAmountAI = 0;
                const remainingAmount =
                  packetToOpen.totalAmount -
                  Object.values(packetToOpen.claimedBy || {}).reduce((sum, val) => sum + val, 0);
                const remainingCount =
                  packetToOpen.count - Object.keys(packetToOpen.claimedBy || {}).length;
                if (remainingCount > 0) {
                  if (remainingCount === 1) {
                    claimedAmountAI = remainingAmount;
                  } else {
                    const min = 0.01;
                    const max = remainingAmount - (remainingCount - 1) * min;
                    claimedAmountAI = Math.random() * (max - min) + min;
                  }
                  claimedAmountAI = parseFloat(claimedAmountAI.toFixed(2));
                  if (!packetToOpen.claimedBy) packetToOpen.claimedBy = {};
                  packetToOpen.claimedBy[displayName] = claimedAmountAI;
                  const aiClaimedMessage = {
                    role: "system",
                    type: "pat_message",
                    content: `${displayName} 领取了 ${packetToOpen.senderName} 的红包`,
                    timestamp: Date.now(),
                  };
                  chat.history.push(aiClaimedMessage);
                  let hiddenContentForAI = `[系统提示：你 (${displayName}) 成功抢到了 ${claimedAmountAI.toFixed(
                    2
                  )} 元。`;
                  if (Object.keys(packetToOpen.claimedBy).length >= packetToOpen.count) {
                    packetToOpen.isFullyClaimed = true;
                    const finishedMessage = {
                      role: "system",
                      type: "pat_message",
                      content: `${packetToOpen.senderName} 的红包已被领完`,
                      timestamp: Date.now() + 1,
                    };
                    chat.history.push(finishedMessage);
                    let luckyKing = { name: "", amount: -1 };
                    if (packetToOpen.packetType === "lucky" && packetToOpen.count > 1) {
                      Object.entries(packetToOpen.claimedBy).forEach(([name, amount]) => {
                        if (amount > luckyKing.amount) {
                          luckyKing = { name, amount };
                        }
                      });
                    }
                    if (luckyKing.name) {
                      hiddenContentForAI += ` 红包已被领完，手气王是 ${luckyKing.name}！`;
                    } else {
                      hiddenContentForAI += ` 红包已被领完。`;
                    }
                  }
                  hiddenContentForAI += " 请根据这个结果发表你的评论。]";
                  const hiddenMessageForAI = {
                    role: "system",
                    content: hiddenContentForAI,
                    timestamp: Date.now() + 2,
                    isHidden: true,
                  };
                  chat.history.push(hiddenMessageForAI);
                }
                if (isViewingThisChat) {
                  renderChatInterface(chatId);
                }
              }
              continue;
            case "change_avatar":
              const avatarName = msgData.name;
              const foundAvatar = chat.settings.aiAvatarLibrary.find(
                (avatar) => avatar.name === avatarName
              );
              if (foundAvatar) {
                chat.settings.aiAvatar = foundAvatar.url;
                const systemNotice = {
                  role: "system",
                  type: "pat_message",
                  content: `[${chat.name} 更换了头像]`,
                  timestamp: Date.now(),
                };
                chat.history.push(systemNotice);
                if (isViewingThisChat) {
                  appendMessage(systemNotice, chat);
                  renderChatInterface(chatId);
                }
              }
              continue;
            case "accept_transfer": {
              const originalTransferMsgIndex = chat.history.findIndex(
                (m) => m.timestamp === msgData.for_timestamp
              );
              if (originalTransferMsgIndex > -1) {
                const originalMsg = chat.history[originalTransferMsgIndex];
                originalMsg.status = "accepted";
              }
              continue;
            }
            case "decline_transfer": {
              const originalTransferMsgIndex = chat.history.findIndex(
                (m) => m.timestamp === msgData.for_timestamp
              );
              if (originalTransferMsgIndex > -1) {
                const originalMsg = chat.history[originalTransferMsgIndex];
                originalMsg.status = "declined";
                const refundMessage = {
                  role: "assistant",
                  senderName: chat.name,
                  type: "transfer",
                  isRefund: true,
                  amount: originalMsg.amount,
                  note: "转账已被拒收",
                  timestamp: messageTimestamp++,
                };
                chat.history.push(refundMessage);
                if (isViewingThisChat) {
                  appendMessage(refundMessage, chat);
                  renderChatInterface(chatId);
                }
              }
              continue;
            }
            case "system_message":
              aiMessage = {
                role: "system",
                type: "pat_message",
                content: msgData.content,
                timestamp: Date.now(),
              };
              break;
            case "share_link":
              aiMessage = {
                ...baseMessage,
                type: "share_link",
                title: msgData.title,
                description: msgData.description,
                source_name: msgData.source_name,
                content: msgData.content,
              };
              break;
            case "quote_reply":
              const originalMessage = chat.history.find(
                (m) => m.timestamp === msgData.target_timestamp
              );
              if (originalMessage) {
                const quoteContext = {
                  timestamp: originalMessage.timestamp,
                  senderName:
                    originalMessage.senderName ||
                    (originalMessage.role === "user"
                      ? chat.settings.myNickname || "我"
                      : chat.name),
                  content: String(originalMessage.content || "").substring(0, 50),
                };
                aiMessage = {
                  ...baseMessage,
                  content: msgData.reply_content,
                  quote: quoteContext,
                };
              } else {
                aiMessage = {
                  ...baseMessage,
                  content: msgData.reply_content,
                };
              }
              break;
            case "send_and_recall": {
              if (!isViewingThisChat) continue;
              const tempMessageData = {
                ...baseMessage,
                content: msgData.content,
              };
              const tempMessageElement = createMessageElement(tempMessageData, chat);
              appendMessage(tempMessageData, chat, true);
              await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000 + 1500));
              const bubbleWrapper = document
                .querySelector(`.message-bubble[data-timestamp="${tempMessageData.timestamp}"]`)
                ?.closest(".message-wrapper");
              if (bubbleWrapper) {
                bubbleWrapper.classList.add("recalled-animation");
                await new Promise((resolve) => setTimeout(resolve, 300));
                const recalledMessage = {
                  role: "assistant",
                  senderName: msgData.name || chat.name,
                  type: "recalled_message",
                  content: "对方撤回了一条消息",
                  timestamp: tempMessageData.timestamp,
                  recalledData: {
                    originalType: "text",
                    originalContent: msgData.content,
                  },
                };
                const msgIndex = chat.history.findIndex(
                  (m) => m.timestamp === tempMessageData.timestamp
                );
                if (msgIndex > -1) {
                  chat.history[msgIndex] = recalledMessage;
                } else {
                  chat.history.push(recalledMessage);
                }
                const placeholder = createMessageElement(recalledMessage, chat);
                if (document.body.contains(bubbleWrapper)) {
                  bubbleWrapper.parentNode.replaceChild(placeholder, bubbleWrapper);
                }
              }
              continue;
            }
            case "text":
              aiMessage = {
                ...baseMessage,
                content: String(msgData.content || msgData.message),
              };
              break;
            case "sticker":
              aiMessage = {
                ...baseMessage,
                type: "sticker",
                content: msgData.url,
                meaning: msgData.meaning || "",
              };
              break;
            case "ai_image":
              aiMessage = {
                ...baseMessage,
                type: "ai_image",
                content: msgData.description || msgData.content,
              };
              break;
            case "voice_message":
              aiMessage = {
                ...baseMessage,
                type: "voice_message",
                content: msgData.content,
              };
              break;
            case "transfer":
              aiMessage = {
                ...baseMessage,
                type: "transfer",
                amount: msgData.amount,
                note: msgData.note,
                receiverName: msgData.receiver || "我",
              };
              break;
            case "waimai_request":
              aiMessage = {
                ...baseMessage,
                type: "waimai_request",
                productInfo: msgData.productInfo,
                amount: msgData.amount,
                status: "pending",
                countdownEndTime: Date.now() + 15 * 60 * 1000,
              };
              break;
            default:
              console.warn("Unknown AI instruction type after stream:", msgData.type);
              break;
          }

          if (aiMessage) {
            chat.history.push(aiMessage);
            if (!isViewingThisChat && !notificationShown) {
              let notificationText;
              switch (aiMessage.type) {
                case "transfer":
                  notificationText = `[收到一笔转账]`;
                  break;
                case "waimai_request":
                  notificationText = `[收到一个外卖代付请求]`;
                  break;
                case "ai_image":
                  notificationText = `[图片]`;
                  break;
                case "voice_message":
                  notificationText = `[语音]`;
                  break;
                case "sticker":
                  notificationText = aiMessage.meaning ? `[表情: ${aiMessage.meaning}]` : "[表情]";
                  break;
                default:
                  notificationText = String(aiMessage.content || "");
              }
              const finalNotifText = chat.isGroup
                ? `${aiMessage.senderName}: ${notificationText}`
                : notificationText;
              showNotification(
                chatId,
                finalNotifText.substring(0, 40) + (finalNotifText.length > 40 ? "..." : "")
              );
              notificationShown = true;
            }
            if (!isViewingThisChat) {
              chat.unreadCount = (chat.unreadCount || 0) + 1;
            }
          }
        }

        if (callHasBeenHandled && videoCallState.isGroupCall) {
          videoCallState.isAwaitingResponse = false;
          if (videoCallState.participants.length > 0) {
            startVideoCall();
          } else {
            videoCallState = {
              ...videoCallState,
              isAwaitingResponse: false,
              participants: [],
            };
            showScreen("chat-interface-screen");
            alert("无人接听群聊邀请。");
          }
        }
        await db.chats.put(chat);
        renderChatInterface(chatId);
      }
    } else {
      // --- Non-streaming logic ---
      let geminiConfig = toGeminiRequestData(
        model,
        apiKey,
        systemPrompt,
        messagesPayload,
        isGemini
      );
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
              messages: [{ role: "system", content: systemPrompt }, ...messagesPayload],
              temperature: 0.8,
              stream: false,
            }),
          });
      if (!response.ok) {
        let errorMsg = `API Error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg += ` - ${errorData?.error?.message || JSON.stringify(errorData)}`;
        } catch (jsonError) {
          errorMsg += ` - ${await response.text()}`;
        }
        throw new Error(errorMsg);
      }
      const data = await response.json();
      const aiResponseContent = isGemini
        ? data.candidates[0].content.parts[0].text
        : data.choices[0].message.content;
      console.log(`AI '${chat.name}' 的原始回复:`, aiResponseContent);
      chat.history = chat.history.filter((msg) => !msg.isTemporary);
      const messagesArray = parseAiResponse(aiResponseContent);
      const callHasBeenHandled = await processAndRenderAiMessages(
        messagesArray,
        chatId,
        Date.now()
      );
      if (callHasBeenHandled && videoCallState.isGroupCall) {
        videoCallState.isAwaitingResponse = false;
        if (videoCallState.participants.length > 0) {
          startVideoCall();
        } else {
          videoCallState = {
            ...videoCallState,
            isAwaitingResponse: false,
            participants: [],
          };
          showScreen("chat-interface-screen");
          alert("无人接听群聊邀请。");
        }
      }
      await db.chats.put(chat);
    }
  } catch (error) {
    chat.history = chat.history.filter((msg) => !msg.isTemporary && !msg.isStreaming);
    if (!chat.isGroup && chat.relationship?.status === "pending_ai_approval") {
      chat.relationship.status = "blocked_by_ai";
      await showCustomAlert(
        "申请失败",
        `AI在处理你的好友申请时出错了，请稍后重试。\n错误信息: ${error.message}`
      );
    } else {
      const errorContent = `[出错了: ${error.message}]`;
      const errorMessage = {
        role: "assistant",
        content: errorContent,
        timestamp: Date.now(),
      };
      if (chat.isGroup) errorMessage.senderName = "系统消息";
      chat.history.push(errorMessage);
    }
    await db.chats.put(chat);
    videoCallState.isAwaitingResponse = false;
    if (
      document.getElementById("chat-interface-screen").classList.contains("active") &&
      state.activeChatId === chatId
    ) {
      renderChatInterface(chatId);
    }
  } finally {
    if (chat.isGroup) {
      if (typingIndicator) {
        typingIndicator.style.display = "none";
      }
    } else {
      if (chatHeaderTitle && state.chats[chatId]) {
        chatHeaderTitle.style.opacity = 0;
        setTimeout(() => {
          chatHeaderTitle.textContent = state.chats[chatId].name;
          chatHeaderTitle.classList.remove("typing-status");
          chatHeaderTitle.style.opacity = 1;
        }, 200);
      }
    }
    renderChatList();
  }
}
