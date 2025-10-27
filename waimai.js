// ▼▼▼ 【全新】外卖请求倒计时函数 ▼▼▼
function startWaimaiCountdown(element, endTime) {
  const timerId = setInterval(() => {
    const now = Date.now();
    const distance = endTime - now;

    if (distance < 0) {
      clearInterval(timerId);
      element.innerHTML = "<span>已</span><span>超</span><span>时</span>";
      return;
    }

    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    const minStr = String(minutes).padStart(2, "0");
    const secStr = String(seconds).padStart(2, "0");

    element.innerHTML = `<span>${minStr.charAt(0)}</span><span>${minStr.charAt(
      1
    )}</span> : <span>${secStr.charAt(0)}</span><span>${secStr.charAt(1)}</span>`;
  }, 1000);
  return timerId;
}

function cleanupWaimaiTimers() {
  for (const timestamp in waimaiTimers) {
    clearInterval(waimaiTimers[timestamp]);
  }
  waimaiTimers = {};
}
// ▲▲▲ 新函数粘贴结束 ▲▲▲

async function handleWaimaiResponse(originalTimestamp, choice) {
  const chat = state.chats[state.activeChatId];
  if (!chat) return;

  const messageIndex = chat.history.findIndex((m) => m.timestamp === originalTimestamp);
  if (messageIndex === -1) return;

  // 1. 更新原始消息的状态
  const originalMessage = chat.history[messageIndex];
  originalMessage.status = choice;

  // 【核心修正】记录支付者，并构建对AI更清晰的系统消息
  let systemContent;
  const myNickname = chat.isGroup ? chat.settings.myNickname || "我" : "我";

  if (choice === "paid") {
    originalMessage.paidBy = myNickname; // 记录是用户付的钱
    systemContent = `[系统提示：你 (${myNickname}) 为 ${originalMessage.senderName} 的外卖订单（时间戳: ${originalTimestamp}）完成了支付。此订单已关闭，其他成员不能再支付。]`;
  } else {
    systemContent = `[系统提示：你 (${myNickname}) 拒绝了 ${originalMessage.senderName} 的外卖代付请求（时间戳: ${originalTimestamp}）。]`;
  }

  // 2. 创建一条新的、对用户隐藏的系统消息，告知AI结果
  const systemNote = {
    role: "system",
    content: systemContent,
    timestamp: Date.now(),
    isHidden: true,
  };
  chat.history.push(systemNote);

  // 3. 保存更新到数据库并刷新UI
  await db.chats.put(chat);
  renderChatInterface(state.activeChatId);
}

// ▲▲▲ 粘贴结束 ▲▲▲

// ▼▼▼ 【全新】这个函数是本次修复的核心，请粘贴到你的JS功能区 ▼▼▼
async function handleWaimaiResponse(originalTimestamp, choice) {
  const chat = state.chats[state.activeChatId];
  if (!chat) return;

  const messageIndex = chat.history.findIndex((m) => m.timestamp === originalTimestamp);
  if (messageIndex === -1) return;

  // 1. 更新内存中原始消息的状态
  const originalMessage = chat.history[messageIndex];
  originalMessage.status = choice;

  // 2. 获取当前用户的昵称，并构建对AI更清晰的系统消息
  let systemContent;
  const myNickname = chat.isGroup ? chat.settings.myNickname || "我" : "我";

  if (choice === "paid") {
    originalMessage.paidBy = myNickname; // 记录是“我”付的钱
    systemContent = `[系统提示：你 (${myNickname}) 为 ${originalMessage.senderName} 的外卖订单（时间戳: ${originalTimestamp}）完成了支付。此订单已关闭，其他成员不能再支付。]`;
  } else {
    systemContent = `[系统提示：你 (${myNickname}) 拒绝了 ${originalMessage.senderName} 的外卖代付请求（时间戳: ${originalTimestamp}）。]`;
  }

  // 3. 创建一条新的、对用户隐藏的系统消息，告知AI结果
  const systemNote = {
    role: "system",
    content: systemContent,
    timestamp: Date.now(),
    isHidden: true,
  };
  chat.history.push(systemNote);

  // 4. 将更新后的数据保存到数据库，并立刻重绘UI
  await db.chats.put(chat);
  renderChatInterface(state.activeChatId);

  // 5. 【重要】只有在支付成功后，才触发一次AI响应，让它感谢你
  if (choice === "paid") {
    triggerAiResponse();
  }
}
