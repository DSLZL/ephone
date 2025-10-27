/**
 * 当用户点击链接卡片时，打开伪浏览器
 * @param {number} timestamp - 被点击消息的时间戳
 */
function openBrowser(timestamp) {
  if (!state.activeChatId) return;

  const chat = state.chats[state.activeChatId];
  // 安全检查，确保 chat 和 history 都存在
  if (!chat || !chat.history) return;

  const message = chat.history.find((m) => m.timestamp === timestamp);
  if (!message || message.type !== "share_link") {
    console.error("无法找到或消息类型不匹配的分享链接:", timestamp);
    return; // 如果找不到消息，就直接退出
  }

  // 填充浏览器内容
  document.getElementById("browser-title").textContent = message.source_name || "文章详情";
  const browserContent = document.getElementById("browser-content");
  browserContent.innerHTML = `
        <h1 class="article-title">${message.title || "无标题"}</h1>
        <div class="article-meta">
            <span>来源: ${message.source_name || "未知"}</span>
        </div>
        <div class="article-body">
            <p>${(message.content || "内容为空。").replace(/\n/g, "</p><p>")}</p>
        </div>
    `;

  // 显示浏览器屏幕
  showScreen("browser-screen");
}

/**
 * 关闭伪浏览器，返回聊天界面
 * (这个函数现在由 init() 中的事件监听器调用)
 */
function closeBrowser() {
  showScreen("chat-interface-screen");
}
