document.addEventListener("DOMContentLoaded", () => {
  /**
   * 【总入口】根据聊天类型，决定打开转账弹窗还是红包弹窗
   */
  function handlePaymentButtonClick() {
    if (!state.activeChatId) return;
    const chat = state.chats[state.activeChatId];
    if (chat.isGroup) {
      openRedPacketModal();
    } else {
      // 单聊保持原样，打开转账弹窗
      document.getElementById("transfer-modal").classList.add("visible");
    }
  }

  /**
   * 打开并初始化发红包模态框
   */
  function openRedPacketModal() {
    const modal = document.getElementById("red-packet-modal");
    const chat = state.chats[state.activeChatId];

    // 清理输入框
    document.getElementById("rp-group-amount").value = "";
    document.getElementById("rp-group-count").value = "";
    document.getElementById("rp-group-greeting").value = "";
    document.getElementById("rp-direct-amount").value = "";
    document.getElementById("rp-direct-greeting").value = "";
    document.getElementById("rp-group-total").textContent = "¥ 0.00";
    document.getElementById("rp-direct-total").textContent = "¥ 0.00";

    // 填充专属红包的接收人列表
    const receiverSelect = document.getElementById("rp-direct-receiver");
    receiverSelect.innerHTML = "";
    chat.members.forEach((member) => {
      const option = document.createElement("option");
      // 【核心】使用 originalName 作为提交给AI的值，因为它独一无二
      option.value = member.originalName;
      // 【核心】使用 groupNickname 作为显示给用户看的值
      option.textContent = member.groupNickname;
      receiverSelect.appendChild(option);
    });

    // 默认显示拼手气红包页签
    document.getElementById("rp-tab-group").click();

    modal.classList.add("visible");
  }

  /**
   * 发送群红包（拼手气）
   */
  async function sendGroupRedPacket() {
    const chat = state.chats[state.activeChatId];
    const amount = parseFloat(document.getElementById("rp-group-amount").value);
    const count = parseInt(document.getElementById("rp-group-count").value);
    const greeting = document.getElementById("rp-group-greeting").value.trim();

    if (isNaN(amount) || amount <= 0) {
      alert("请输入有效的总金额！");
      return;
    }
    if (isNaN(count) || count <= 0) {
      alert("请输入有效的红包个数！");
      return;
    }
    if (amount / count < 0.01) {
      alert("单个红包金额不能少于0.01元！");
      return;
    }

    const myNickname = chat.settings.myNickname || "我";

    const newPacket = {
      role: "user",
      senderName: myNickname,
      type: "red_packet",
      packetType: "lucky", // 'lucky' for group, 'direct' for one-on-one
      timestamp: Date.now(),
      totalAmount: amount,
      count: count,
      greeting: greeting || "恭喜发财，大吉大利！",
      claimedBy: {}, // { name: amount }
      isFullyClaimed: false,
    };

    chat.history.push(newPacket);
    await db.chats.put(chat);

    appendMessage(newPacket, chat);
    renderChatList();
    document.getElementById("red-packet-modal").classList.remove("visible");
  }

  /**
   * 发送专属红包
   */
  async function sendDirectRedPacket() {
    const chat = state.chats[state.activeChatId];
    const amount = parseFloat(document.getElementById("rp-direct-amount").value);
    const receiverName = document.getElementById("rp-direct-receiver").value;
    const greeting = document.getElementById("rp-direct-greeting").value.trim();

    if (isNaN(amount) || amount <= 0) {
      alert("请输入有效的金额！");
      return;
    }
    if (!receiverName) {
      alert("请选择一个接收人！");
      return;
    }

    const myNickname = chat.settings.myNickname || "我";

    const newPacket = {
      role: "user",
      senderName: myNickname,
      type: "red_packet",
      packetType: "direct",
      timestamp: Date.now(),
      totalAmount: amount,
      count: 1,
      greeting: greeting || "给你准备了一个红包",
      receiverName: receiverName, // 核心字段
      claimedBy: {},
      isFullyClaimed: false,
    };

    chat.history.push(newPacket);
    await db.chats.put(chat);

    appendMessage(newPacket, chat);
    renderChatList();
    document.getElementById("red-packet-modal").classList.remove("visible");
  }

  /**
   * 【总入口】当用户点击红包卡片时触发 (V4 - 流程重构版)
   * @param {number} timestamp - 被点击的红包消息的时间戳
   */
  async function handlePacketClick(timestamp) {
    const currentChatId = state.activeChatId;
    const freshChat = await db.chats.get(currentChatId);
    if (!freshChat) return;

    state.chats[currentChatId] = freshChat;
    const packet = freshChat.history.find((m) => m.timestamp === timestamp);
    if (!packet) return;

    const myNickname = freshChat.settings.myNickname || "我";
    const hasClaimed = packet.claimedBy && packet.claimedBy[myNickname];

    // 如果是专属红包且不是给我的，或已领完，或已领过，都只显示详情
    if (
      (packet.packetType === "direct" && packet.receiverName !== myNickname) ||
      packet.isFullyClaimed ||
      hasClaimed
    ) {
      showRedPacketDetails(packet);
    } else {
      // 核心流程：先尝试打开红包
      const claimedAmount = await handleOpenRedPacket(packet);

      // 如果成功打开（claimedAmount不为null）
      if (claimedAmount !== null) {
        // **关键：在数据更新后，再重新渲染UI**
        renderChatInterface(currentChatId);

        // 显示成功提示
        await showCustomAlert(
          "恭喜！",
          `你领取了 ${packet.senderName} 的红包，金额为 ${claimedAmount.toFixed(2)} 元。`
        );
      }

      // 无论成功与否，最后都显示详情页
      // 此时需要从state中获取最新的packet对象，因为它可能在handleOpenRedPacket中被更新了
      const updatedPacket = state.chats[currentChatId].history.find(
        (m) => m.timestamp === timestamp
      );
      showRedPacketDetails(updatedPacket);
    }
  }
  // ▲▲▲ 替换结束 ▲▲▲

  /**
   * 【核心】处理用户打开红包的逻辑 (V5 - 专注于数据更新)
   */
  async function handleOpenRedPacket(packet) {
    const chat = state.chats[state.activeChatId];
    const myNickname = chat.settings.myNickname || "我";

    // 1. 检查红包是否还能领
    const remainingCount = packet.count - Object.keys(packet.claimedBy || {}).length;
    if (remainingCount <= 0) {
      packet.isFullyClaimed = true;
      await db.chats.put(chat);
      await showCustomAlert("手慢了", "红包已被领完！");
      return null; // 返回null表示领取失败
    }

    // 2. 计算领取金额
    let claimedAmount = 0;
    const remainingAmount =
      packet.totalAmount - Object.values(packet.claimedBy || {}).reduce((sum, val) => sum + val, 0);
    if (packet.packetType === "lucky") {
      if (remainingCount === 1) {
        claimedAmount = remainingAmount;
      } else {
        const min = 0.01;
        const max = remainingAmount - (remainingCount - 1) * min;
        claimedAmount = Math.random() * (max - min) + min;
      }
    } else {
      claimedAmount = packet.totalAmount;
    }
    claimedAmount = parseFloat(claimedAmount.toFixed(2));

    // 3. 更新红包数据
    if (!packet.claimedBy) packet.claimedBy = {};
    packet.claimedBy[myNickname] = claimedAmount;

    const isNowFullyClaimed = Object.keys(packet.claimedBy).length >= packet.count;
    if (isNowFullyClaimed) {
      packet.isFullyClaimed = true;
    }

    // 4. 构建系统消息和AI指令
    let hiddenMessageContent = isNowFullyClaimed
      ? `[系统提示：用户 (${myNickname}) 领取了最后一个红包，现在 ${packet.senderName} 的红包已被领完。请对此事件发表评论。]`
      : `[系统提示：用户 (${myNickname}) 刚刚领取了红包 (时间戳: ${packet.timestamp})。红包还未领完，你现在可以使用 'open_red_packet' 指令来尝试领取。]`;

    const visibleMessage = {
      role: "system",
      type: "pat_message",
      content: `你领取了 ${packet.senderName} 的红包`,
      timestamp: Date.now(),
    };
    const hiddenMessage = {
      role: "system",
      content: hiddenMessageContent,
      timestamp: Date.now() + 1,
      isHidden: true,
    };
    chat.history.push(visibleMessage, hiddenMessage);

    // 5. 保存到数据库
    await db.chats.put(chat);

    // 6. 返回领取的金额，用于后续弹窗
    return claimedAmount;
  }
  // ▲▲▲ 替换结束 ▲▲▲

  /**
   * 【全新】显示红包领取详情的模态框 (V4 - 已修复参数错误)
   */
  async function showRedPacketDetails(packet) {
    // 1. 直接检查传入的packet对象是否存在，无需再查找
    if (!packet) {
      console.error("showRedPacketDetails收到了无效的packet对象");
      return;
    }

    const chat = state.chats[state.activeChatId];
    if (!chat) return;

    const modal = document.getElementById("red-packet-details-modal");
    const myNickname = chat.settings.myNickname || "我";

    // 2. 后续所有逻辑保持不变，直接使用传入的packet对象
    document.getElementById("rp-details-sender").textContent = packet.senderName;
    document.getElementById("rp-details-greeting").textContent =
      packet.greeting || "恭喜发财，大吉大利！";

    const myAmountEl = document.getElementById("rp-details-my-amount");
    if (packet.claimedBy && packet.claimedBy[myNickname]) {
      myAmountEl.querySelector("span:first-child").textContent =
        packet.claimedBy[myNickname].toFixed(2);
      myAmountEl.style.display = "block";
    } else {
      myAmountEl.style.display = "none";
    }

    const claimedCount = Object.keys(packet.claimedBy || {}).length;
    const claimedAmountSum = Object.values(packet.claimedBy || {}).reduce(
      (sum, val) => sum + val,
      0
    );
    let summaryText = `${claimedCount}/${packet.count}个红包，共${claimedAmountSum.toFixed(
      2
    )}/${packet.totalAmount.toFixed(2)}元。`;
    if (!packet.isFullyClaimed && claimedCount < packet.count) {
      const timeLeft = Math.floor(
        (packet.timestamp + 24 * 60 * 60 * 1000 - Date.now()) / (1000 * 60 * 60)
      );
      if (timeLeft > 0) summaryText += ` 剩余红包将在${timeLeft}小时内退还。`;
    }
    document.getElementById("rp-details-summary").textContent = summaryText;

    const listEl = document.getElementById("rp-details-list");
    listEl.innerHTML = "";
    const claimedEntries = Object.entries(packet.claimedBy || {});

    let luckyKing = { name: "", amount: -1 };
    if (packet.packetType === "lucky" && packet.isFullyClaimed && claimedEntries.length > 1) {
      claimedEntries.forEach(([name, amount]) => {
        if (amount > luckyKing.amount) {
          luckyKing = { name, amount };
        }
      });
    }

    claimedEntries.sort((a, b) => b[1] - a[1]);

    claimedEntries.forEach(([name, amount]) => {
      const item = document.createElement("div");
      item.className = "rp-details-item";
      let luckyTag = "";
      if (luckyKing.name && name === luckyKing.name) {
        luckyTag = '<span class="lucky-king-tag">手气王</span>';
      }
      item.innerHTML = `
            <span class="name">${name}</span>
            <span class="amount">${amount.toFixed(2)} 元</span>
            ${luckyTag}
        `;
      listEl.appendChild(item);
    });

    modal.classList.add("visible");
  }
});
