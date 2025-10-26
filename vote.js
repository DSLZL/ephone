document.addEventListener("DOMContentLoaded", () => {
  /**
   * 打开创建投票的模态框并初始化
   */
  function openCreatePollModal() {
    const modal = document.getElementById("create-poll-modal");
    document.getElementById("poll-question-input").value = "";
    const optionsContainer = document.getElementById("poll-options-container");
    optionsContainer.innerHTML = "";

    // 默认创建两个空的选项框
    addPollOptionInput();
    addPollOptionInput();

    modal.classList.add("visible");
  }

  /**
   * 在模态框中动态添加一个选项输入框
   */
  function addPollOptionInput() {
    const container = document.getElementById("poll-options-container");
    const wrapper = document.createElement("div");
    wrapper.className = "poll-option-input-wrapper";
    wrapper.innerHTML = `
        <input type="text" class="poll-option-input" placeholder="选项内容...">
        <button class="remove-option-btn">-</button>
    `;

    wrapper.querySelector(".remove-option-btn").addEventListener("click", () => {
      // 确保至少保留两个选项
      if (container.children.length > 2) {
        wrapper.remove();
      } else {
        alert("投票至少需要2个选项。");
      }
    });

    container.appendChild(wrapper);
  }

  /**
   * 用户确认发起投票
   */
  async function sendPoll() {
    if (!state.activeChatId) return;

    const question = document.getElementById("poll-question-input").value.trim();
    if (!question) {
      alert("请输入投票问题！");
      return;
    }

    const options = Array.from(document.querySelectorAll(".poll-option-input"))
      .map((input) => input.value.trim())
      .filter((text) => text); // 过滤掉空的选项

    if (options.length < 2) {
      alert("请至少输入2个有效的投票选项！");
      return;
    }

    const chat = state.chats[state.activeChatId];
    const myNickname = chat.isGroup ? chat.settings.myNickname || "我" : "我";

    const newPollMessage = {
      role: "user",
      senderName: myNickname,
      type: "poll",
      timestamp: Date.now(),
      question: question,
      options: options,
      votes: {}, // 初始投票为空
      isClosed: false,
    };

    chat.history.push(newPollMessage);
    await db.chats.put(chat);

    appendMessage(newPollMessage, chat);
    renderChatList();

    document.getElementById("create-poll-modal").classList.remove("visible");
  }

  // ▼▼▼ 用这个【已修复重复点击问题】的版本替换 handleUserVote 函数 ▼▼▼
  /**
   * 处理用户投票，并将事件作为隐藏消息存入历史记录
   * @param {number} timestamp - 投票消息的时间戳
   * @param {string} choice - 用户选择的选项文本
   */
  async function handleUserVote(timestamp, choice) {
    const chat = state.chats[state.activeChatId];
    const poll = chat.history.find((m) => m.timestamp === timestamp);
    const myNickname = chat.isGroup ? chat.settings.myNickname || "我" : "我";

    // 1. 【核心修正】如果投票不存在或已关闭，直接返回
    if (!poll || poll.isClosed) {
      // 如果是已关闭的投票，则直接显示结果
      if (poll && poll.isClosed) {
        showPollResults(timestamp);
      }
      return;
    }

    // 2. 检查用户是否点击了已经投过的同一个选项
    const isReclickingSameOption = poll.votes[choice] && poll.votes[choice].includes(myNickname);

    // 3. 【核心修正】如果不是重复点击，才执行投票逻辑
    if (!isReclickingSameOption) {
      // 移除旧投票（如果用户改选）
      for (const option in poll.votes) {
        const voterIndex = poll.votes[option].indexOf(myNickname);
        if (voterIndex > -1) {
          poll.votes[option].splice(voterIndex, 1);
        }
      }
      // 添加新投票
      if (!poll.votes[choice]) {
        poll.votes[choice] = [];
      }
      poll.votes[choice].push(myNickname);
    }

    // 4. 【核心逻辑】现在只处理用户投票事件，不再检查是否结束
    let hiddenMessageContent = null;

    // 只有在用户真正投票或改票时，才生成提示
    if (!isReclickingSameOption) {
      hiddenMessageContent = `[系统提示：用户 (${myNickname}) 刚刚投票给了 “${choice}”。]`;
    }

    // 5. 如果有需要通知AI的事件，则创建并添加隐藏消息
    if (hiddenMessageContent) {
      const hiddenMessage = {
        role: "system",
        content: hiddenMessageContent,
        timestamp: Date.now(),
        isHidden: true,
      };
      chat.history.push(hiddenMessage);
    }

    // 6. 保存数据并更新UI
    await db.chats.put(chat);
    renderChatInterface(state.activeChatId);
  }
  // ▲▲▲ 替换结束 ▲▲▲

  /**
   * 用户结束投票，并将事件作为隐藏消息存入历史记录
   * @param {number} timestamp - 投票消息的时间戳
   */
  async function endPoll(timestamp) {
    const chat = state.chats[state.activeChatId];
    const poll = chat.history.find((m) => m.timestamp === timestamp);
    if (!poll || poll.isClosed) return;

    const confirmed = await showCustomConfirm(
      "结束投票",
      "确定要结束这个投票吗？结束后将无法再进行投票。"
    );
    if (confirmed) {
      poll.isClosed = true;

      const resultSummary = poll.options
        .map((opt) => `“${opt}”(${poll.votes[opt]?.length || 0}票)`)
        .join("，");
      const hiddenMessageContent = `[系统提示：用户手动结束了投票！最终结果为：${resultSummary}。]`;

      const hiddenMessage = {
        role: "system",
        content: hiddenMessageContent,
        timestamp: Date.now(),
        isHidden: true,
      };
      chat.history.push(hiddenMessage);

      // 【核心修改】只保存数据和更新UI，不调用 triggerAiResponse()
      await db.chats.put(chat);
      renderChatInterface(state.activeChatId);
    }
  }
  // ▲▲▲ 替换结束 ▲▲▲

  /**
   * 显示投票结果详情
   * @param {number} timestamp - 投票消息的时间戳
   */
  function showPollResults(timestamp) {
    const chat = state.chats[state.activeChatId];
    const poll = chat.history.find((m) => m.timestamp === timestamp);
    if (!poll || !poll.isClosed) return;

    let resultsHtml = `<p><strong>${poll.question}</strong></p><hr style="opacity: 0.2; margin: 10px 0;">`;

    if (Object.keys(poll.votes).length === 0) {
      resultsHtml += '<p style="color: #8a8a8a;">还没有人投票。</p>';
    } else {
      poll.options.forEach((option) => {
        const voters = poll.votes[option] || [];
        resultsHtml += `
                <div style="margin-bottom: 15px;">
                    <p style="font-weight: 500; margin: 0 0 5px 0;">${option} (${
          voters.length
        }票)</p>
                    <p style="font-size: 13px; color: #555; margin: 0; line-height: 1.5;">
                        ${voters.length > 0 ? voters.join("、 ") : "无人投票"}
                    </p>
                </div>
            `;
      });
    }

    showCustomAlert("投票结果", resultsHtml);
  }
});
