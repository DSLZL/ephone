const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
// gemini如果是多个密钥, 那么随机获取一个
function getRandomValue(str) {
  // 检查字符串是否包含逗号
  if (str.includes(",")) {
    // 用逗号分隔字符串并移除多余空格
    const arr = str.split(",").map((item) => item.trim());
    // 生成随机索引 (0 到 arr.length-1)
    const randomIndex = Math.floor(Math.random() * arr.length);
    // 返回随机元素
    return arr[randomIndex];
  }
  // 没有逗号则直接返回原字符串
  return str;
}
function isImage(text, content) {
  let currentImageData = content.image_url.url;
  // 提取Base64数据（去掉前缀）
  const base64Data = currentImageData.split(",")[1];
  // 根据图片类型获取MIME类型
  const mimeType = currentImageData.match(/^data:(.*);base64/)[1];
  return [
    { text: `${text.text}用户向你发送了一张图片` },
    {
      inline_data: {
        mime_type: mimeType,
        data: base64Data,
      },
    },
  ];
}

function extractArray(text) {
  // 正则表达式模式：匹配开头的时间戳部分和后续的JSON数组
  const pattern = /^\(Timestamp: (\d+)\)(.*)$/s;
  const match = text.match(pattern);

  if (match) {
    const timestampPart = `(Timestamp: ${match[1]}) `;
    const jsonPart = match[2].trim();

    try {
      // 尝试解析JSON部分
      const parsedJson = JSON.parse(jsonPart);
      // 验证解析结果是否为数组
      if (Array.isArray(parsedJson)) {
        return [timestampPart, parsedJson[0]];
      }
    } catch (error) {
      // 解析失败，返回原始文本
    }
  }

  // 不匹配格式或解析失败时返回原值
  return text;
}
function transformChatData(item) {
  let type = {
    send_and_recall: "撤回了消息",
    update_status: "更新了状态",
    change_music: "切换了歌曲",
    create_memory: "记录了回忆",
    create_countdown: "创建了约定/倒计时",
    text: "发送了文本",
    sticker: "发送了表情",
    ai_image: "发送了图片",
    voice_message: "发送了语音",
    transfer: "发起了转账",
    waimai_request: "发起了外卖请求",
    waimai_response: {
      paid: "回应了外卖-同意",
      rejected: "回应了外卖-拒绝",
    },
    video_call_request: "发起了视频通话",
    video_call_response: {
      accept: "回应了视频通话-接受",
      reject: "回应了视频通话-拒绝",
    },
    qzone_post: {
      shuoshuo: "发布了说说",
      text_image: "发布了文字图",
    },
    qzone_comment: "评论了动态",
    qzone_like: "点赞了动态",
    pat_user: "拍一拍了用户",
    block_user: "拉黑了用户",
    friend_request_response: "回应了好友申请",
    change_avatar: "更换了头像",
    share_link: "分享了链接",
    accept_transfer: "回应了转账-接受",
    decline_transfer: "回应了转账-拒绝/退款",
    quote_reply: "引用了回复",
    text: "",
  };
  let res = extractArray(item.content);

  if (Array.isArray(res)) {
    let obj = res[1];
    let itemType = obj.type;
    let time = res[0];
    let text = type[itemType];
    if (text) {
      if (itemType === "sticker") {
        return [{ text: `${time}[${text}] 含义是:${obj.meaning}` }];
      } else if (itemType === "send_and_recall") {
        return [{ text: `${time}[${text}] ${obj.content}` }];
      } else if (itemType === "update_status") {
        return [
          {
            text: `${time}[${text}] ${obj.status_text}(${obj.is_busy ? "忙碌/离开" : "空闲"})`,
          },
        ];
      } else if (itemType === "change_music") {
        return [
          {
            text: `${time}[${text}] ${obj.change_music}, 歌名是:${obj.song_name}`,
          },
        ];
      } else if (itemType === "create_memory") {
        return [{ text: `${time}[${text}] ${obj.description}` }];
      } else if (itemType === "create_countdown") {
        return [{ text: `${time}[${text}] ${obj.title}(${obj.date})` }];
      } else if (itemType === "ai_image") {
        return [{ text: `${time}[${text}] 图片描述是:${obj.description}` }];
      } else if (itemType === "voice_message") {
        return [{ text: `${time}[${text}] ${obj.content}` }];
      } else if (itemType === "transfer") {
        return [
          {
            text: `${time}[${text}] 金额是:${obj.amount} 备注是:${obj.amount}`,
          },
        ];
      } else if (itemType === "waimai_request") {
        return [
          {
            text: `${time}[${text}] 金额是:${obj.amount} 商品是:${obj.productInfo}`,
          },
        ];
      } else if (itemType === "waimai_response") {
        return [
          {
            text: `${time}[${text[obj.status]}] ${obj.status === "paid" ? "同意" : "拒绝"}`,
          },
        ];
      } else if (itemType === "video_call_request") {
        return [{ text: `${time}[${text}]` }];
      }
    } else if (itemType === "video_call_request") {
      return [
        {
          text: `${time}[${text[obj.decision]}] ${obj.decision === "accept" ? "同意" : "拒绝"}`,
        },
      ];
    } else if (itemType === "qzone_post") {
      return [
        {
          text: `${time}[${text[obj.postType]}] ${
            obj.postType === "shuoshuo"
              ? `${obj.content}`
              : `图片描述是:${obj.hiddenContent} ${
                  obj.publicText ? `文案是: ${obj.publicText}` : ""
                }`
          }`,
        },
      ];
    } else if (itemType === "qzone_comment") {
      return [
        {
          text: `${time}[${text}] 评论的id是: ${obj.postId} 评论的内容是: ${obj.commentText}`,
        },
      ];
    } else if (itemType === "qzone_like") {
      return [{ text: `${time}[${text}] 点赞的id是: ${obj.postId}` }];
    } else if (itemType === "pat_user") {
      return [{ text: `${time}[${text}] ${obj.suffix ? obj.suffix : ""}` }];
    } else if (itemType === "block_user") {
      return [{ text: `${time}[${text}]` }];
    } else if (itemType === "friend_request_response") {
      return [
        {
          text: `${time}[${text}] 结果是:${obj.decision === "accept" ? "同意" : "拒绝"}`,
        },
      ];
    } else if (itemType === "change_avatar") {
      return [{ text: `${time}[${text}] 头像名是:${obj.name}` }];
    } else if (itemType === "share_link") {
      return [
        {
          text: `${time}[${text}] 文章标题是:${obj.title}  文章摘要是:${obj.description} 来源网站名是:${obj.source_name} 文章正文是:${obj.content}`,
        },
      ];
    } else if (itemType === "accept_transfer") {
      return [{ text: `${time}[${text}]` }];
    } else if (itemType === "accept_transfer") {
      return [{ text: `${time}[${text}]` }];
    } else if (itemType === "quote_reply") {
      return [{ text: `${time}[${text}] 引用的内容是:${obj.reply_content}` }];
    } else if (itemType === "text") {
      return [{ text: `${time}${obj.content}` }];
    }
  }

  if (Array.isArray(res) && res.length > 1) {
    res = `${res[0]}${res[1].content}`;
  }

  return [{ text: res }];
}

function toGeminiRequestData(model, apiKey, systemInstruction, messagesForDecision, isGemini) {
  if (!isGemini) {
    return undefined;
  }

  // 【核心修正】在这里，我们将 'system' 角色也映射为 'user'

  let roleType = {
    user: "user",
    assistant: "model",
    system: "user", // <--- 新增这一行
  };
  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${getRandomValue(
      apiKey
    )}`,
    data: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: messagesForDecision.map((item) => {
          let includesImages = false;
          if (Array.isArray(item.content) && item.content.length === 2) {
            includesImages = item.content.some((sub) => {
              return sub.type === "image_url" && sub.image_url.url;
            });
          }
          return {
            role: roleType[item.role], // 现在 'system' 会被正确转换为 'user'
            parts: includesImages
              ? isImage(item.content[0], item.content[1])
              : transformChatData(item),
          };
        }),
        generationConfig: {
          temperature: 0.8,
        },
        systemInstruction: {
          parts: [
            {
              text: systemInstruction,
            },
          ],
        },
      }),
    },
  };
}
document.addEventListener("DOMContentLoaded", () => {
  // ===================================================================
  // 1. 所有变量和常量定义
  // ===================================================================
  const db = new Dexie("GeminiChatDB");
  // --- 已修正 ---
  let state = {
    chats: {},
    activeChatId: null,
    globalSettings: {},
    apiConfig: {},
    userStickers: [],
    worldBooks: [],
    personaPresets: [],
    qzoneSettings: {},
    activeAlbumId: null,
  };
  // --- 修正结束 ---
  let musicState = {
    isActive: false,
    activeChatId: null,
    isPlaying: false,
    playlist: [],
    currentIndex: -1,
    playMode: "order",
    totalElapsedTime: 0,
    timerId: null,
    // 【新增】歌词相关状态
    parsedLyrics: [], // 当前歌曲解析后的歌词数组
    currentLyricIndex: -1, // 当前高亮的歌词行索引
  };
  const audioPlayer = document.getElementById("audio-player");
  let newWallpaperBase64 = null;
  let isSelectionMode = false;
  let selectedMessages = new Set();
  let editingMemberId = null;
  let editingWorldBookId = null;
  let editingPersonaPresetId = null;

  let waimaiTimers = {}; // 用于存储外卖倒计时

  let activeMessageTimestamp = null;
  let currentReplyContext = null; // <--- 新增这行，用来存储当前正在引用的消息信息
  let activePostId = null; // <-- 新增：用于存储当前操作的动态ID

  let photoViewerState = {
    isOpen: false,
    photos: [], // 存储当前相册的所有照片URL
    currentIndex: -1, // 当前正在查看的照片索引
  };

  let unreadPostsCount = 0;

  let isFavoritesSelectionMode = false;
  let selectedFavorites = new Set();

  let simulationIntervalId = null;

  const defaultAvatar = "img/Avatar.jpg";
  const defaultMyGroupAvatar = "img/MyGroupAvatar.jpg";
  const defaultGroupMemberAvatar = "img/GroupMemberAvatar.jpg";
  const defaultGroupAvatar = "img/GroupAvatar.jpg";
  let notificationTimeout;

  // ▼▼▼ 在JS顶部，变量定义区，添加这个新常量 ▼▼▼
  const DEFAULT_APP_ICONS = {
    "world-book": "img/World-Book.jpg",
    qq: "img/QQ.jpg",
    "api-settings": "img/API.jpg",
    wallpaper: "img/Wallpaper.jpg",
    font: "img/Font.jpg",
  };
  // ▲▲▲ 添加结束 ▲▲▲

  const STICKER_REGEX =
    /^(https:\/\/i\.postimg\.cc\/.+|https:\/\/files\.catbox\.moe\/.+|data:image)/;
  const MESSAGE_RENDER_WINDOW = 50;
  let currentRenderedCount = 0;
  let lastKnownBatteryLevel = 1;
  let alertFlags = { hasShown40: false, hasShown20: false, hasShown10: false };
  let batteryAlertTimeout;
  const dynamicFontStyle = document.createElement("style");
  dynamicFontStyle.id = "dynamic-font-style";
  document.head.appendChild(dynamicFontStyle);

  const modalOverlay = document.getElementById("custom-modal-overlay");
  const modalTitle = document.getElementById("custom-modal-title");
  const modalBody = document.getElementById("custom-modal-body");
  const modalConfirmBtn = document.getElementById("custom-modal-confirm");
  const modalCancelBtn = document.getElementById("custom-modal-cancel");
  let modalResolve;

  function showCustomModal() {
    modalOverlay.classList.add("visible");
  }

  function hideCustomModal() {
    modalOverlay.classList.remove("visible");
    modalConfirmBtn.classList.remove("btn-danger");
    if (modalResolve) modalResolve(null);
  }

  function showCustomConfirm(title, message, options = {}) {
    return new Promise((resolve) => {
      modalResolve = resolve;
      modalTitle.textContent = title;
      modalBody.innerHTML = `<p>${message}</p>`;
      modalCancelBtn.style.display = "block";
      modalConfirmBtn.textContent = "确定";
      if (options.confirmButtonClass) modalConfirmBtn.classList.add(options.confirmButtonClass);
      modalConfirmBtn.onclick = () => {
        resolve(true);
        hideCustomModal();
      };
      modalCancelBtn.onclick = () => {
        resolve(false);
        hideCustomModal();
      };
      showCustomModal();
    });
  }

  function showCustomAlert(title, message) {
    return new Promise((resolve) => {
      modalResolve = resolve;
      modalTitle.textContent = title;
      modalBody.innerHTML = `<p style="text-align: left; white-space: pre-wrap;">${message}</p>`;
      modalCancelBtn.style.display = "none";
      modalConfirmBtn.textContent = "好的";
      modalConfirmBtn.onclick = () => {
        modalCancelBtn.style.display = "block";
        modalConfirmBtn.textContent = "确定";
        resolve(true);
        hideCustomModal();
      };
      showCustomModal();
    });
  }

  // ▼▼▼ 请用这个【功能增强版】替换旧的 showCustomPrompt 函数 ▼▼▼
  function showCustomPrompt(title, placeholder, initialValue = "", type = "text", extraHtml = "") {
    return new Promise((resolve) => {
      modalResolve = resolve;
      modalTitle.textContent = title;
      const inputId = "custom-prompt-input";

      const inputHtml =
        type === "textarea"
          ? `<textarea id="${inputId}" placeholder="${placeholder}" rows="4" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #ccc; font-size: 14px; box-sizing: border-box; resize: vertical;">${initialValue}</textarea>`
          : `<input type="${type}" id="${inputId}" placeholder="${placeholder}" value="${initialValue}">`;

      // 【核心修改】将额外的HTML和输入框组合在一起
      modalBody.innerHTML = extraHtml + inputHtml;
      const input = document.getElementById(inputId);

      // 【核心修改】为格式助手按钮绑定事件
      modalBody.querySelectorAll(".format-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const templateStr = btn.dataset.template;
          if (templateStr) {
            try {
              const templateObj = JSON.parse(templateStr);
              // 使用 null, 2 参数让JSON字符串格式化，带缩进，更易读
              input.value = JSON.stringify(templateObj, null, 2);
              input.focus();
            } catch (e) {
              console.error("解析格式模板失败:", e);
            }
          }
        });
      });

      modalConfirmBtn.onclick = () => {
        resolve(input.value);
        hideCustomModal();
      };
      modalCancelBtn.onclick = () => {
        resolve(null);
        hideCustomModal();
      };
      showCustomModal();
      setTimeout(() => input.focus(), 100);
    });
  }
  // ▲▲▲ 替换结束 ▲▲▲

  // ===================================================================
  // 3. 所有功能函数定义
  // ===================================================================

  function showScreen(screenId) {
    if (screenId === "chat-list-screen") {
      window.renderChatListProxy();
      switchToChatListView("messages-view");
    }
    if (screenId === "api-settings-screen") window.renderApiSettingsProxy();
    if (screenId === "wallpaper-screen") window.renderWallpaperScreenProxy();
    if (screenId === "world-book-screen") window.renderWorldBookScreenProxy();
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    const screenToShow = document.getElementById(screenId);
    if (screenToShow) screenToShow.classList.add("active");
    if (screenId === "chat-interface-screen")
      window.updateListenTogetherIconProxy(state.activeChatId);
    if (screenId === "font-settings-screen") {
      document.getElementById("font-url-input").value = state.globalSettings.fontUrl || "";
      applyCustomFont(state.globalSettings.fontUrl || "", true);
    }
  }
  window.updateListenTogetherIconProxy = () => {};

  function switchToChatListView(viewId) {
    const chatListScreen = document.getElementById("chat-list-screen");
    const views = {
      "messages-view": document.getElementById("messages-view"),
      "qzone-screen": document.getElementById("qzone-screen"),
      "favorites-view": document.getElementById("favorites-view"),
      "memories-view": document.getElementById("memories-view"), // <-- 新增这一行
    };
    const mainHeader = document.getElementById("main-chat-list-header");
    const mainBottomNav = document.getElementById("chat-list-bottom-nav"); // 获取主导航栏

    if (isFavoritesSelectionMode) {
      document.getElementById("favorites-edit-btn").click();
    }

    // 隐藏所有视图
    Object.values(views).forEach((v) => v.classList.remove("active"));
    // 显示目标视图
    if (views[viewId]) {
      views[viewId].classList.add("active");
    }

    // 更新底部导航栏高亮
    document.querySelectorAll("#chat-list-bottom-nav .nav-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.view === viewId);
    });

    // ▼▼▼ 【核心修正】在这里统一管理所有UI元素的显隐 ▼▼▼
    if (viewId === "messages-view") {
      mainHeader.style.display = "flex";
      mainBottomNav.style.display = "flex";
    } else {
      mainHeader.style.display = "none";
      mainBottomNav.style.display = "none";
    }
    // ▲▲▲ 修正结束 ▲▲▲

    if (viewId !== "memories-view") {
      activeCountdownTimers.forEach((timerId) => clearInterval(timerId));
      activeCountdownTimers = [];
    }

    // 根据视图ID执行特定的渲染/更新逻辑
    switch (viewId) {
      case "qzone-screen":
        views["qzone-screen"].style.backgroundColor = "#f0f2f5";
        updateUnreadIndicator(0);
        renderQzoneScreen();
        renderQzonePosts();
        break;
      case "favorites-view":
        views["favorites-view"].style.backgroundColor = "#f9f9f9";
        renderFavoritesScreen();
        break;
      case "messages-view":
        // 如果需要，可以在这里添加返回消息列表时要执行的逻辑
        break;
    }
  }

  function renderQzoneScreen() {
    if (state && state.qzoneSettings) {
      const settings = state.qzoneSettings;
      document.getElementById("qzone-nickname").textContent = settings.nickname;
      document.getElementById("qzone-avatar-img").src = settings.avatar;
      document.getElementById("qzone-banner-img").src = settings.banner;
    }
  }
  window.renderQzoneScreenProxy = renderQzoneScreen;

  async function saveQzoneSettings() {
    if (db && state.qzoneSettings) {
      await db.qzoneSettings.put(state.qzoneSettings);
    }
  }

  function formatPostTimestamp(timestamp) {
    if (!timestamp) return "";
    const now = new Date();
    const date = new Date(timestamp);
    const diffSeconds = Math.floor((now - date) / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffMinutes < 1) return "刚刚";
    if (diffMinutes < 60) return `${diffMinutes}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    if (now.getFullYear() === year) {
      return `${month}-${day} ${hours}:${minutes}`;
    } else {
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    }
  }

  // ▼▼▼ 请用这个【已添加删除按钮】的函数，完整替换掉你旧的 renderQzonePosts 函数 ▼▼▼
  async function renderQzonePosts() {
    const postsListEl = document.getElementById("qzone-posts-list");
    if (!postsListEl) return;

    const [posts, favorites] = await Promise.all([
      db.qzonePosts.orderBy("timestamp").reverse().toArray(),
      db.favorites.where("type").equals("qzone_post").toArray(),
    ]);

    const favoritedPostIds = new Set(favorites.map((fav) => fav.content.id));

    postsListEl.innerHTML = "";

    if (posts.length === 0) {
      postsListEl.innerHTML =
        '<p style="text-align:center; color: var(--text-secondary); padding: 30px 0;">这里空空如也，快来发布第一条说说吧！</p>';
      return;
    }

    const userSettings = state.qzoneSettings;

    posts.forEach((post) => {
      const postContainer = document.createElement("div");
      postContainer.className = "qzone-post-container";
      postContainer.dataset.postId = post.id;

      const postEl = document.createElement("div");
      postEl.className = "qzone-post-item";

      let authorAvatar = "",
        authorNickname = "",
        commentAvatar = userSettings.avatar;

      if (post.authorId === "user") {
        authorAvatar = userSettings.avatar;
        authorNickname = userSettings.nickname;
      } else if (state.chats[post.authorId]) {
        const authorChat = state.chats[post.authorId];
        authorAvatar = authorChat.settings.aiAvatar || defaultAvatar;
        authorNickname = authorChat.name;
      } else {
        authorAvatar = defaultAvatar;
        authorNickname = "{{char}}";
      }

      let contentHtml = "";
      const publicTextHtml = post.publicText
        ? `<div class="post-content">${post.publicText.replace(/\n/g, "<br>")}</div>`
        : "";

      if (post.type === "shuoshuo") {
        contentHtml = `<div class="post-content" style="margin-bottom: 10px;">${post.content.replace(
          /\n/g,
          "<br>"
        )}</div>`;
      } else if (post.type === "image_post" && post.imageUrl) {
        contentHtml = publicTextHtml
          ? `${publicTextHtml}<div style="margin-top:10px;"><img src="${post.imageUrl}" class="chat-image"></div>`
          : `<img src="${post.imageUrl}" class="chat-image">`;
      } else if (post.type === "text_image") {
        contentHtml = publicTextHtml
          ? `${publicTextHtml}<div style="margin-top:10px;"><img src=" img/Ai-Generated-Image.jpg" class="chat-image" style="cursor: pointer;" data-hidden-text="${post.hiddenContent}"></div>`
          : `<img src=" img/Ai-Generated-Image.jpg" class="chat-image" style="cursor: pointer;" data-hidden-text="${post.hiddenContent}">`;
      }

      let likesHtml = "";
      if (post.likes && post.likes.length > 0) {
        likesHtml = `<div class="post-likes-section"><svg class="like-icon" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg><span>${post.likes.join(
          "、"
        )} 觉得很赞</span></div>`;
      }

      let commentsHtml = "";
      if (post.comments && post.comments.length > 0) {
        commentsHtml = '<div class="post-comments-container">';
        // ★★★★★【核心修改就在这里】★★★★★
        // 遍历评论时，我们传入 comment 对象本身和它的索引 index
        post.comments.forEach((comment, index) => {
          // 在评论项的末尾，添加一个带有 data-comment-index 属性的删除按钮
          commentsHtml += `
                    <div class="comment-item">
                        <span class="commenter-name">${comment.commenterName}:</span>
                        <span class="comment-text">${comment.text}</span>
                        <span class="comment-delete-btn" data-comment-index="${index}">×</span>
                    </div>`;
        });
        // ★★★★★【修改结束】★★★★★
        commentsHtml += "</div>";
      }

      const userNickname = state.qzoneSettings.nickname;
      const isLikedByUser = post.likes && post.likes.includes(userNickname);
      const isFavoritedByUser = favoritedPostIds.has(post.id);

      postEl.innerHTML = `
            <div class="post-header"><img src="${authorAvatar}" class="post-avatar"><div class="post-info"><span class="post-nickname">${authorNickname}</span><span class="post-timestamp">${formatPostTimestamp(
        post.timestamp
      )}</span></div>
                <div class="post-actions-btn">…</div>
            </div>
            <div class="post-main-content">${contentHtml}</div>
            <div class="post-feedback-icons">
                <span class="action-icon like ${
                  isLikedByUser ? "active" : ""
                }"><svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg></span>
                <span class="action-icon favorite ${
                  isFavoritedByUser ? "active" : ""
                }"><svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg></span>
            </div>
            ${likesHtml}
            ${commentsHtml}
            <div class="post-footer"><div class="comment-section"><img src="${commentAvatar}" class="comment-avatar"><input type="text" class="comment-input" placeholder="友善的评论是交流的起点"><div class="at-mention-popup"></div></div><button class="comment-send-btn">发送</button></div>
        `;

      const deleteAction = document.createElement("div");
      deleteAction.className = "qzone-post-delete-action";
      deleteAction.innerHTML = "<span>删除</span>";
      postContainer.appendChild(postEl);
      postContainer.appendChild(deleteAction);
      const commentSection = postContainer.querySelector(".comment-section");
      if (commentSection) {
        commentSection.addEventListener("touchstart", (e) => e.stopPropagation());
        commentSection.addEventListener("mousedown", (e) => e.stopPropagation());
      }
      postsListEl.appendChild(postContainer);
      const commentInput = postContainer.querySelector(".comment-input");
      const popup = postContainer.querySelector(".at-mention-popup");
      commentInput.addEventListener("input", () => {
        const value = commentInput.value;
        const atMatch = value.match(/@([\p{L}\w]*)$/u);
        if (atMatch) {
          const namesToMention = new Set();
          const authorNickname = postContainer.querySelector(".post-nickname")?.textContent;
          if (authorNickname) namesToMention.add(authorNickname);
          postContainer.querySelectorAll(".commenter-name").forEach((nameEl) => {
            namesToMention.add(nameEl.textContent.replace(":", ""));
          });
          namesToMention.delete(state.qzoneSettings.nickname);
          popup.innerHTML = "";
          if (namesToMention.size > 0) {
            const searchTerm = atMatch[1];
            namesToMention.forEach((name) => {
              if (name.toLowerCase().includes(searchTerm.toLowerCase())) {
                const item = document.createElement("div");
                item.className = "at-mention-item";
                item.textContent = name;
                item.addEventListener("mousedown", (e) => {
                  e.preventDefault();
                  const newText = value.substring(0, atMatch.index) + `@${name} `;
                  commentInput.value = newText;
                  popup.style.display = "none";
                  commentInput.focus();
                });
                popup.appendChild(item);
              }
            });
            popup.style.display = popup.children.length > 0 ? "block" : "none";
          } else {
            popup.style.display = "none";
          }
        } else {
          popup.style.display = "none";
        }
      });
      commentInput.addEventListener("blur", () => {
        setTimeout(() => {
          popup.style.display = "none";
        }, 200);
      });
    });
  }
  // ▲▲▲ 替换结束 ▲▲▲

  // ▼▼▼ 请用下面这个【更新后的】函数，完整替换掉你代码中旧的 displayFilteredFavorites 函数 ▼▼▼

  function displayFilteredFavorites(items) {
    const listEl = document.getElementById("favorites-list");
    listEl.innerHTML = "";

    if (items.length === 0) {
      const searchTerm = document.getElementById("favorites-search-input").value;
      const message = searchTerm
        ? "未找到相关收藏"
        : "你的收藏夹是空的，<br>快去动态或聊天中收藏喜欢的内容吧！";
      listEl.innerHTML = `<p style="text-align:center; color: var(--text-secondary); padding: 50px 0;">${message}</p>`;
      return;
    }

    for (const item of items) {
      const card = document.createElement("div");
      card.className = "favorite-item-card";
      card.dataset.favid = item.id;

      let headerHtml = "",
        contentHtml = "",
        sourceText = "",
        footerHtml = "";

      if (item.type === "qzone_post") {
        const post = item.content;
        sourceText = "来自动态";
        let authorAvatar = defaultAvatar,
          authorNickname = "未知用户";

        if (post.authorId === "user") {
          authorAvatar = state.qzoneSettings.avatar;
          authorNickname = state.qzoneSettings.nickname;
        } else if (state.chats[post.authorId]) {
          authorAvatar = state.chats[post.authorId].settings.aiAvatar;
          authorNickname = state.chats[post.authorId].name;
        }

        headerHtml = `<img src="${authorAvatar}" class="avatar"><div class="info"><div class="name">${authorNickname}</div></div>`;

        const publicTextHtml = post.publicText
          ? `<div class="post-content">${post.publicText.replace(/\n/g, "<br>")}</div>`
          : "";
        if (post.type === "shuoshuo") {
          contentHtml = `<div class="post-content">${post.content.replace(/\n/g, "<br>")}</div>`;
        } else if (post.type === "image_post" && post.imageUrl) {
          contentHtml = publicTextHtml
            ? `${publicTextHtml}<div style="margin-top:10px;"><img src="${post.imageUrl}" class="chat-image"></div>`
            : `<img src="${post.imageUrl}" class="chat-image">`;
        } else if (post.type === "text_image") {
          contentHtml = publicTextHtml
            ? `${publicTextHtml}<div style="margin-top:10px;"><img src=" img/Ai-Generated-Image.jpg" class="chat-image" style="cursor: pointer;" data-hidden-text="${post.hiddenContent}"></div>`
            : `<img src=" img/Ai-Generated-Image.jpg" class="chat-image" style="cursor: pointer;" data-hidden-text="${post.hiddenContent}">`;
        }

        // ▼▼▼ 新增/修改的代码开始 ▼▼▼

        // 1. 构造点赞区域的HTML
        let likesHtml = "";
        // 检查 post 对象中是否存在 likes 数组并且不为空
        if (post.likes && post.likes.length > 0) {
          // 如果存在，就创建点赞区域的 div
          likesHtml = `
                    <div class="post-likes-section">
                        <svg class="like-icon" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                        <span>${post.likes.join("、")} 觉得很赞</span>
                    </div>`;
        }

        // 2. 构造评论区域的HTML
        let commentsHtml = "";
        // 检查 post 对象中是否存在 comments 数组并且不为空
        if (post.comments && post.comments.length > 0) {
          // 如果存在，就创建评论容器，并遍历每一条评论
          commentsHtml = '<div class="post-comments-container">';
          post.comments.forEach((comment) => {
            commentsHtml += `
                        <div class="comment-item">
                            <span class="commenter-name">${comment.commenterName}:</span>
                            <span class="comment-text">${comment.text}</span>
                        </div>`;
          });
          commentsHtml += "</div>";
        }

        // 3. 将点赞和评论的HTML组合到 footerHtml 中
        footerHtml = `${likesHtml}${commentsHtml}`;

        // ▲▲▲ 新增/修改的代码结束 ▲▲▲
      } else if (item.type === "chat_message") {
        const msg = item.content;
        const chat = state.chats[item.chatId];
        if (!chat) continue;

        sourceText = `来自与 ${chat.name} 的聊天`;
        const isUser = msg.role === "user";
        let senderName, senderAvatar;

        if (isUser) {
          // 用户消息的逻辑保持不变
          senderName = chat.isGroup ? chat.settings.myNickname || "我" : "我";
          senderAvatar =
            chat.settings.myAvatar || (chat.isGroup ? defaultMyGroupAvatar : defaultAvatar);
        } else {
          // AI/成员消息
          if (chat.isGroup) {
            // ★★★★★ 这就是唯一的、核心的修改！ ★★★★★
            // 我们现在使用 originalName 去匹配，而不是旧的 name
            const member = chat.members.find((m) => m.originalName === msg.senderName);
            // ★★★★★ 修改结束 ★★★★★

            senderName = msg.senderName;
            // 因为现在能正确找到 member 对象了，所以也能正确获取到他的头像
            senderAvatar = member ? member.avatar : defaultGroupMemberAvatar;
          } else {
            // 单聊的逻辑保持不变
            senderName = chat.name;
            senderAvatar = chat.settings.aiAvatar || defaultAvatar;
          }
        }

        // 后续拼接 headerHtml 和 contentHtml 的逻辑都保持不变
        headerHtml = `<img src="${senderAvatar}" class="avatar"><div class="info"><div class="name">${senderName}</div></div>`;

        if (typeof msg.content === "string" && STICKER_REGEX.test(msg.content)) {
          contentHtml = `<img src="${msg.content}" class="sticker-image" style="max-width: 80px; max-height: 80px;">`;
        } else if (Array.isArray(msg.content) && msg.content[0]?.type === "image_url") {
          contentHtml = `<img src="${msg.content[0].image_url.url}" class="chat-image">`;
        } else {
          contentHtml = String(msg.content || "").replace(/\n/g, "<br>");
        }
      }

      // ▼▼▼ 修改最终的HTML拼接，加入 footerHtml ▼▼▼
      card.innerHTML = `
            <div class="fav-card-header">${headerHtml}<div class="source">${sourceText}</div></div>
            <div class="fav-card-content">${contentHtml}</div>
            ${footerHtml}`; // <-- 把我们新创建的 footerHtml 放在这里

      listEl.appendChild(card);
    }
  }

  // ▲▲▲ 替换区域结束 ▲▲▲

  /**
   * 【重构后的函数】: 负责准备数据并触发渲染
   */
  async function renderFavoritesScreen() {
    // 1. 从数据库获取最新数据并缓存
    allFavoriteItems = await db.favorites.orderBy("timestamp").reverse().toArray();

    // 2. 清空搜索框并隐藏清除按钮
    const searchInput = document.getElementById("favorites-search-input");
    const clearBtn = document.getElementById("favorites-search-clear-btn");
    searchInput.value = "";
    clearBtn.style.display = "none";

    // 3. 显示所有收藏项
    displayFilteredFavorites(allFavoriteItems);
  }

  // ▲▲▲ 粘贴结束 ▲▲▲

  function resetCreatePostModal() {
    document.getElementById("post-public-text").value = "";
    document.getElementById("post-image-preview").src = "";
    document.getElementById("post-image-description").value = "";
    document.getElementById("post-image-preview-container").classList.remove("visible");
    document.getElementById("post-image-desc-group").style.display = "none";
    document.getElementById("post-local-image-input").value = "";
    document.getElementById("post-hidden-text").value = "";
    document.getElementById("switch-to-image-mode").click();
  }

  function applyCustomFont(fontUrl, isPreviewOnly = false) {
    if (!fontUrl) {
      dynamicFontStyle.innerHTML = "";
      document.getElementById("font-preview").style.fontFamily = "";
      return;
    }
    const fontName = "custom-user-font";
    const newStyle = `
                @font-face {
                  font-family: '${fontName}';
                  src: url('${fontUrl}');
                  font-display: swap;
                }`;
    if (isPreviewOnly) {
      const previewStyle =
        document.getElementById("preview-font-style") || document.createElement("style");
      previewStyle.id = "preview-font-style";
      previewStyle.innerHTML = newStyle;
      if (!document.getElementById("preview-font-style")) document.head.appendChild(previewStyle);
      document.getElementById(
        "font-preview"
      ).style.fontFamily = `'${fontName}', 'bulangni', sans-serif`;
    } else {
      dynamicFontStyle.innerHTML = `
                    ${newStyle}
                    body {
                      font-family: '${fontName}', 'bulangni', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    }`;
    }
  }

  async function resetToDefaultFont() {
    dynamicFontStyle.innerHTML = "";
    state.globalSettings.fontUrl = "";
    await db.globalSettings.put(state.globalSettings);
    document.getElementById("font-url-input").value = "";
    document.getElementById("font-preview").style.fontFamily = "";
    alert("已恢复默认字体。");
  }

  async function loadAllDataFromDB() {
    // ▼▼▼ 【核心修改在这里】 ▼▼▼
    const [
      chatsArr,
      apiConfig,
      globalSettings,
      userStickers,
      worldBooks,
      musicLib,
      personaPresets,
      qzoneSettings,
      initialFavorites, // 将 initialFavorites 加入到解构赋值中
    ] = await Promise.all([
      db.chats.toArray(),
      db.apiConfig.get("main"),
      db.globalSettings.get("main"),
      db.userStickers.toArray(),
      db.worldBooks.toArray(),
      db.musicLibrary.get("main"),
      db.personaPresets.toArray(),
      db.qzoneSettings.get("main"),
      db.favorites.orderBy("timestamp").reverse().toArray(), // 确保这一行在 Promise.all 的数组参数内
    ]);
    // ▲▲▲ 【修改结束】 ▲▲▲

    state.chats = chatsArr.reduce((acc, chat) => {
      if (typeof chat.unreadCount === "undefined") {
        chat.unreadCount = 0; // 如果这个聊天对象没有 unreadCount 属性，就给它初始化为 0
      }

      // ★★★【核心重构：数据迁移脚本】★★★
      // 检查是否是群聊，并且其成员对象使用的是旧的 `name` 结构
      if (chat.isGroup && chat.members && chat.members.length > 0 && chat.members[0].name) {
        console.log(`检测到旧版群聊数据 for "${chat.name}"，正在执行迁移...`);
        chat.members.forEach((member) => {
          // 如果这个成员对象没有 originalName，说明是旧数据
          if (typeof member.originalName === "undefined") {
            member.originalName = member.name; // 将旧的 name 作为 originalName
            member.groupNickname = member.name; // 同时创建一个初始的 groupNickname
            delete member.name; // 删除旧的、有歧义的 name 字段
            needsUpdate = true; // 标记需要存回数据库
          }
        });
        console.log(`迁移完成 for "${chat.name}"`);
      }

      // --- ▼▼▼ 核心修复就在这里 ▼▼▼ ---
      // 检查1：如果是一个单聊，并且没有 status 属性
      if (!chat.isGroup && !chat.status) {
        // 就为它补上一个默认的 status 对象
        chat.status = {
          text: "在线",
          lastUpdate: Date.now(),
          isBusy: false,
        };
        console.log(`为旧角色 "${chat.name}" 补全了status属性。`);
      }
      // --- ▲▲▲ 修复结束 ▲▲▲

      // --- ▼▼▼ 核心修复就在这里 ▼▼▼ ---
      // 检查2：兼容最新的“关系”功能
      if (!chat.isGroup && !chat.relationship) {
        // 如果是单聊，且没有 relationship 对象，就补上一个默认的
        chat.relationship = {
          status: "friend",
          blockedTimestamp: null,
          applicationReason: "",
        };
        console.log(`为旧角色 "${chat.name}" 补全了 relationship 属性。`);
      }
      // --- ▲▲▲ 修复结束 ▲▲▲

      // ▼▼▼ 在这里添加 ▼▼▼
      if (!chat.isGroup && (!chat.settings || !chat.settings.aiAvatarLibrary)) {
        if (!chat.settings) chat.settings = {}; // 以防万一连settings都没有
        chat.settings.aiAvatarLibrary = [];
        console.log(`为旧角色 "${chat.name}" 补全了aiAvatarLibrary属性。`);
      }
      // ▲▲▲ 添加结束 ▲▲▲

      if (!chat.musicData) chat.musicData = { totalTime: 0 };
      if (chat.settings && chat.settings.linkedWorldBookId && !chat.settings.linkedWorldBookIds) {
        chat.settings.linkedWorldBookIds = [chat.settings.linkedWorldBookId];
        delete chat.settings.linkedWorldBookId;
      }
      acc[chat.id] = chat;
      return acc;
    }, {});
    state.apiConfig = apiConfig || {
      id: "main",
      proxyUrl: "",
      apiKey: "",
      model: "",
      enableStream: false,
    };

    state.globalSettings = globalSettings || {
      id: "main",
      wallpaper: "linear-gradient(135deg, #89f7fe, #66a6ff)",
      fontUrl: "",
      enableBackgroundActivity: false,
      backgroundActivityInterval: 60,
      blockCooldownHours: 1,
      appIcons: { ...DEFAULT_APP_ICONS }, // 【核心修改】确保appIcons存在并有默认值
    };
    // 【核心修改】合并已保存的图标和默认图标，防止更新后旧数据丢失新图标
    state.globalSettings.appIcons = {
      ...DEFAULT_APP_ICONS,
      ...(state.globalSettings.appIcons || {}),
    };

    state.userStickers = userStickers || [];
    state.worldBooks = worldBooks || [];
    musicState.playlist = musicLib?.playlist || [];
    state.personaPresets = personaPresets || [];
    state.qzoneSettings = qzoneSettings || {
      id: "main",
      nickname: "{{user}}",
      avatar: "https://files.catbox.moe/q6z5fc.jpeg",
      banner: "https://files.catbox.moe/r5heyt.gif",
    };

    // ▼▼▼ 【确保这一行在 Promise.all 之后，并使用解构赋值得到的 initialFavorites】 ▼▼▼
    allFavoriteItems = initialFavorites || [];
    // ▲▲▲ 【修改结束】 ▲▲▲
  }

  async function saveGlobalPlaylist() {
    await db.musicLibrary.put({ id: "main", playlist: musicState.playlist });
  }

  function formatTimestamp(timestamp) {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  function showNotification(chatId, messageContent) {
    clearTimeout(notificationTimeout);
    const chat = state.chats[chatId];
    if (!chat) return;
    const bar = document.getElementById("notification-bar");
    document.getElementById("notification-avatar").src =
      chat.settings.aiAvatar || chat.settings.groupAvatar || defaultAvatar;
    document.getElementById("notification-content").querySelector(".name").textContent = chat.name;
    document.getElementById("notification-content").querySelector(".message").textContent =
      messageContent;
    const newBar = bar.cloneNode(true);
    bar.parentNode.replaceChild(newBar, bar);
    newBar.addEventListener("click", () => {
      openChat(chatId);
      newBar.classList.remove("visible");
    });
    newBar.classList.add("visible");
    notificationTimeout = setTimeout(() => {
      newBar.classList.remove("visible");
    }, 4000);
  }

  function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const dateString = now.toLocaleDateString("zh-CN", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    document.getElementById("main-time").textContent = timeString;
    document.getElementById("status-bar-time").textContent = timeString;
    document.getElementById("main-date").textContent = dateString;
  }

  /**
   * 【终极健壮版】解析AI返回的、可能格式不规范的响应内容
   * @param {string} content - AI返回的原始字符串
   * @returns {Array} - 一个标准化的消息对象数组
   */
  function parseAiResponse(content) {
    const trimmedContent = content.trim();

    // 方案1：【最优先】尝试作为标准的、单一的JSON数组解析
    // 这是最理想、最高效的情况
    if (trimmedContent.startsWith("[") && trimmedContent.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmedContent);
        if (Array.isArray(parsed)) {
          console.log("解析成功：标准JSON数组格式。");
          return parsed;
        }
      } catch (e) {
        // 如果解析失败，说明它虽然看起来像个数组，但内部格式有问题。
        // 此时我们不报错，而是继续尝试下面的“强力解析”方案。
        console.warn("标准JSON数组解析失败，将尝试强力解析...");
      }
    }

    // 方案2：【强力解析】使用正则表达式，从混乱的字符串中提取出所有独立的JSON对象
    // 这能完美解决您遇到的 "(Timestamp: ...)[{...}](Timestamp: ...)[{...}]" 这种格式
    const jsonMatches = trimmedContent.match(/{[^{}]*}/g);

    if (jsonMatches) {
      const results = [];
      for (const match of jsonMatches) {
        try {
          // 尝试解析每一个被我们“揪”出来的JSON字符串
          const parsedObject = JSON.parse(match);
          results.push(parsedObject);
        } catch (e) {
          // 如果某个片段不是有效的JSON，就忽略它，继续处理下一个
          console.warn("跳过一个无效的JSON片段:", match);
        }
      }

      // 如果我们成功提取出了至少一个有效的JSON对象，就返回这个结果
      if (results.length > 0) {
        console.log("解析成功：通过强力提取模式。");
        return results;
      }
    }

    // 方案3：【最终备用】如果以上所有方法都失败了，说明AI返回的可能就是纯文本
    // 我们将原始的、未处理的内容，包装成一个标准的文本消息对象返回，确保程序不会崩溃
    console.error("所有解析方案均失败！将返回原始文本。");
    return [{ type: "text", content: content }];
  }

  function renderApiSettings() {
    document.getElementById("proxy-url").value = state.apiConfig.proxyUrl || "";
    document.getElementById("api-key").value = state.apiConfig.apiKey || "";
    // ▼▼▼ 新增这行 ▼▼▼
    document.getElementById("background-activity-switch").checked =
      state.globalSettings.enableBackgroundActivity || false;
    document.getElementById("background-interval-input").value =
      state.globalSettings.backgroundActivityInterval || 60;
    document.getElementById("block-cooldown-input").value =
      state.globalSettings.blockCooldownHours || 1;
    document.getElementById("stream-switch").checked = state.apiConfig.enableStream || false;
    document.getElementById("hide-stream-switch").checked =
      state.apiConfig.hideStreamResponse || false;
  }
  window.renderApiSettingsProxy = renderApiSettings;

  // ▼▼▼ 请用这个【全新版本】的函数，完整替换掉你旧的 renderChatList ▼▼▼
  async function renderChatList() {
    const chatListEl = document.getElementById("chat-list");
    chatListEl.innerHTML = "";

    // 1. 像以前一样，获取所有聊天并按最新消息时间排序
    const allChats = Object.values(state.chats).sort(
      (a, b) => (b.history.slice(-1)[0]?.timestamp || 0) - (a.history.slice(-1)[0]?.timestamp || 0)
    );

    // 2. 获取所有分组
    const allGroups = await db.qzoneGroups.toArray();

    if (allChats.length === 0) {
      chatListEl.innerHTML =
        '<p style="text-align:center; color: #8a8a8a; margin-top: 50px;">点击右上角 "+" 或群组图标添加聊天</p>';
      return;
    }

    // --- 【核心修正开始】---

    // 3. 为每个分组找到其内部最新的消息时间戳
    allGroups.forEach((group) => {
      // 从已排序的 allChats 中找到本组的第一个（也就是最新的）聊天
      const latestChatInGroup = allChats.find((chat) => chat.groupId === group.id);
      // 如果找到了，就用它的时间戳；如果该分组暂时没有聊天或聊天没有历史记录，就用0
      group.latestTimestamp = latestChatInGroup
        ? latestChatInGroup.history.slice(-1)[0]?.timestamp || 0
        : 0;
    });

    // 4. 根据这个最新的时间戳来对“分组本身”进行排序
    allGroups.sort((a, b) => b.latestTimestamp - a.latestTimestamp);

    // --- 【核心修正结束】---

    // 5. 现在，我们按照排好序的分组来渲染
    allGroups.forEach((group) => {
      // 从总列表里过滤出属于这个（已排序）分组的好友
      const groupChats = allChats.filter((chat) => !chat.isGroup && chat.groupId === group.id);
      // 如果这个分组是空的（可能所有好友都被删了），就跳过
      if (groupChats.length === 0) return;

      const groupContainer = document.createElement("div");
      groupContainer.className = "chat-group-container";
      groupContainer.innerHTML = `
            <div class="chat-group-header">
                <span class="arrow">▼</span>
                <span class="group-name">${group.name}</span>
            </div>
            <div class="chat-group-content"></div>
        `;
      const contentEl = groupContainer.querySelector(".chat-group-content");
      // 因为 allChats 本身就是有序的，所以 groupChats 自然也是有序的
      groupChats.forEach((chat) => {
        const item = createChatListItem(chat);
        contentEl.appendChild(item);
      });
      chatListEl.appendChild(groupContainer);
    });

    // 6. 最后，渲染所有群聊和未分组的好友
    // 他们的顺序因为 allChats 的初始排序，天然就是正确的
    const ungroupedOrGroupChats = allChats.filter(
      (chat) => chat.isGroup || (!chat.isGroup && !chat.groupId)
    );
    ungroupedOrGroupChats.forEach((chat) => {
      const item = createChatListItem(chat);
      chatListEl.appendChild(item);
    });

    // 为所有分组标题添加折叠事件
    document.querySelectorAll(".chat-group-header").forEach((header) => {
      header.addEventListener("click", () => {
        header.classList.toggle("collapsed");
        header.nextElementSibling.classList.toggle("collapsed");
      });
    });
  }
  // ▲▲▲ 替换结束 ▲▲▲

  function createChatListItem(chat) {
    const lastMsgObj = chat.history.filter((msg) => !msg.isHidden).slice(-1)[0] || {};
    let lastMsgDisplay;

    // --- ▼▼▼ 【核心修改】在这里加入对关系状态的判断 ▼▼▼ ---
    if (!chat.isGroup && chat.relationship?.status === "pending_user_approval") {
      lastMsgDisplay = `<span style="color: #ff8c00;">[好友申请] ${
        chat.relationship.applicationReason || "请求添加你为好友"
      }</span>`;
    }
    // --- ▲▲▲ 修改结束 ▲▲▲ ---

    // ▼▼▼ 在这里新增 else if ▼▼▼
    else if (!chat.isGroup && chat.relationship?.status === "blocked_by_ai") {
      lastMsgDisplay = `<span style="color: #dc3545;">[你已被对方拉黑]</span>`;
    }
    // ▲▲▲ 新增结束 ▲▲▲

    // 【核心修改】优先显示状态，而不是最后一条消息
    if (chat.isGroup) {
      // 群聊逻辑保持不变
      if (lastMsgObj.type === "pat_message") {
        lastMsgDisplay = `[系统消息] ${lastMsgObj.content}`;
      }
      // ... (其他群聊消息类型判断) ...
      else if (lastMsgObj.type === "transfer") {
        lastMsgDisplay = "[转账]";
      } else if (lastMsgObj.type === "ai_image" || lastMsgObj.type === "user_photo") {
        lastMsgDisplay = "[照片]";
      } else if (lastMsgObj.type === "voice_message") {
        lastMsgDisplay = "[语音]";
      } else if (typeof lastMsgObj.content === "string" && STICKER_REGEX.test(lastMsgObj.content)) {
        lastMsgDisplay = lastMsgObj.meaning ? `[表情: ${lastMsgObj.meaning}]` : "[表情]";
      } else if (Array.isArray(lastMsgObj.content)) {
        lastMsgDisplay = `[图片]`;
      } else {
        lastMsgDisplay = String(lastMsgObj.content || "...").substring(0, 20);
      }

      if (lastMsgObj.senderName && lastMsgObj.type !== "pat_message") {
        lastMsgDisplay = `${lastMsgObj.senderName}: ${lastMsgDisplay}`;
      }
    } else {
      // 单聊逻辑：显示状态
      // 确保 chat.status 对象存在
      const statusText = chat.status?.text || "在线";
      lastMsgDisplay = `[${statusText}]`;
    }

    const item = document.createElement("div");
    item.className = "chat-list-item";
    item.dataset.chatId = chat.id;
    const avatar = chat.isGroup ? chat.settings.groupAvatar : chat.settings.aiAvatar;

    item.innerHTML = `
        <img src="${avatar || defaultAvatar}" class="avatar">
        <div class="info">
            <div class="name-line">
                <span class="name">${chat.name}</span>
                ${chat.isGroup ? '<span class="group-tag">群聊</span>' : ""}
            </div>
            <div class="last-msg" style="color: ${
              chat.isGroup ? "var(--text-secondary)" : "#b5b5b5"
            }; font-style: italic;">${lastMsgDisplay}</div>
        </div>
        <!-- 这里就是我们新加的红点HTML结构 -->
        <div class="unread-count-wrapper">
            <span class="unread-count" style="display: none;">0</span>
        </div>
    `;

    // 【核心修改2】在这里添加控制红点显示/隐藏的逻辑
    const unreadCount = chat.unreadCount || 0;
    const unreadEl = item.querySelector(".unread-count");
    if (unreadCount > 0) {
      unreadEl.textContent = unreadCount > 99 ? "99+" : unreadCount;
      // 注意这里是 'inline-flex'，与我们的CSS对应，使其垂直居中
      unreadEl.style.display = "inline-flex";
    } else {
      unreadEl.style.display = "none";
    }

    const avatarEl = item.querySelector(".avatar");
    if (avatarEl) {
      avatarEl.style.cursor = "pointer";
      avatarEl.addEventListener("click", (e) => {
        e.stopPropagation();
        handleUserPat(chat.id, chat.name);
      });
    }

    const infoEl = item.querySelector(".info");
    if (infoEl) {
      infoEl.addEventListener("click", () => openChat(chat.id));
    }

    addLongPressListener(item, async (e) => {
      const confirmed = await showCustomConfirm(
        "删除对话",
        `确定要删除与 "${chat.name}" 的整个对话吗？此操作不可撤销。`,
        { confirmButtonClass: "btn-danger" }
      );
      if (confirmed) {
        if (musicState.isActive && musicState.activeChatId === chat.id)
          await endListenTogetherSession(false);
        delete state.chats[chat.id];
        if (state.activeChatId === chat.id) state.activeChatId = null;
        await db.chats.delete(chat.id);
        renderChatList();
      }
    });
    return item;
  }

  // ▼▼▼ 请用这个【带诊断功能的全新版本】替换旧的 renderChatInterface 函数 ▼▼▼
  function renderChatInterface(chatId) {
    cleanupWaimaiTimers();
    const chat = state.chats[chatId];
    if (!chat) return;
    exitSelectionMode();

    const messagesContainer = document.getElementById("chat-messages");
    const chatInputArea = document.getElementById("chat-input-area");
    const lockOverlay = document.getElementById("chat-lock-overlay");
    const lockContent = document.getElementById("chat-lock-content");

    messagesContainer.dataset.theme = chat.settings.theme || "default";
    const fontSize = chat.settings.fontSize || 13;
    messagesContainer.style.setProperty("--chat-font-size", `${fontSize}px`);
    applyScopedCss(chat.settings.customCss || "", "#chat-messages", "custom-bubble-style");

    document.getElementById("chat-header-title").textContent = chat.name;
    const statusContainer = document.getElementById("chat-header-status");
    const statusTextEl = statusContainer.querySelector(".status-text");

    if (chat.isGroup) {
      statusContainer.style.display = "none";
      document.getElementById("chat-header-title-wrapper").style.justifyContent = "center";
    } else {
      statusContainer.style.display = "flex";
      document.getElementById("chat-header-title-wrapper").style.justifyContent = "flex-start";
      statusTextEl.textContent = chat.status?.text || "在线";
      statusContainer.classList.toggle("busy", chat.status?.isBusy || false);
    }

    lockOverlay.style.display = "none";
    chatInputArea.style.visibility = "visible";
    lockContent.innerHTML = "";

    if (!chat.isGroup && chat.relationship.status !== "friend") {
      lockOverlay.style.display = "flex";
      chatInputArea.style.visibility = "hidden";

      let lockHtml = "";
      switch (chat.relationship.status) {
        case "blocked_by_user":
          // --- 【核心修改：在这里加入诊断面板】 ---
          const isSimulationRunning = simulationIntervalId !== null;
          const blockedTimestamp = chat.relationship.blockedTimestamp;
          const cooldownHours = state.globalSettings.blockCooldownHours || 1;
          const cooldownMilliseconds = cooldownHours * 60 * 60 * 1000;
          const timeSinceBlock = Date.now() - blockedTimestamp;
          const isCooldownOver = timeSinceBlock > cooldownMilliseconds;
          const timeRemainingMinutes = Math.max(
            0,
            Math.ceil((cooldownMilliseconds - timeSinceBlock) / (1000 * 60))
          );

          lockHtml = `
                    <span class="lock-text">你已将“${chat.name}”拉黑。</span>
                    <button id="unblock-btn" class="lock-action-btn">解除拉黑</button>
                    <div style="margin-top: 20px; padding: 10px; border: 1px dashed #ccc; border-radius: 8px; font-size: 11px; text-align: left; color: #666; background: rgba(0,0,0,0.02);">
                        <strong style="color: #333;">【开发者诊断面板】</strong><br>
                        - 后台活动总开关: ${
                          state.globalSettings.enableBackgroundActivity
                            ? '<span style="color: green;">已开启</span>'
                            : '<span style="color: red;">已关闭</span>'
                        }<br>
                        - 系统心跳计时器: ${
                          isSimulationRunning
                            ? '<span style="color: green;">运行中</span>'
                            : '<span style="color: red;">未运行</span>'
                        }<br>
                        - 当前角色状态: <strong>${chat.relationship.status}</strong><br>
                        - 需要冷静(小时): <strong>${cooldownHours}</strong><br>
                        - 冷静期是否结束: ${
                          isCooldownOver
                            ? '<span style="color: green;">是</span>'
                            : `<span style="color: orange;">否 (还剩约 ${timeRemainingMinutes} 分钟)</span>`
                        }<br>
                        - 触发条件: ${
                          isCooldownOver && state.globalSettings.enableBackgroundActivity
                            ? '<span style="color: green;">已满足，等待下次系统心跳</span>'
                            : '<span style="color: red;">未满足</span>'
                        }
                    </div>
                    <button id="force-apply-check-btn" class="lock-action-btn secondary" style="margin-top: 10px;">强制触发一次好友申请检测</button>
                `;
          // --- 【修改结束】 ---
          break;
        case "blocked_by_ai":
          lockHtml = `
                    <span class="lock-text">你被对方拉黑了。</span>
                    <button id="apply-friend-btn" class="lock-action-btn">重新申请加为好友</button>
                `;
          break;

        case "pending_user_approval":
          lockHtml = `
                    <span class="lock-text">“${chat.name}”请求添加你为好友：<br><i>“${chat.relationship.applicationReason}”</i></span>
                    <button id="accept-friend-btn" class="lock-action-btn">接受</button>
                    <button id="reject-friend-btn" class="lock-action-btn secondary">拒绝</button>
                `;
          break;

        // 【核心修正】修复当你申请后，你看到的界面
        case "pending_ai_approval":
          lockHtml = `<span class="lock-text">好友申请已发送，等待对方通过...</span>`;
          break;
      }
      lockContent.innerHTML = lockHtml;
    }
    messagesContainer.innerHTML = "";
    // ...后续代码保持不变
    const chatScreen = document.getElementById("chat-interface-screen");
    chatScreen.style.backgroundImage = chat.settings.background
      ? `url(${chat.settings.background})`
      : "none";

    const isDarkMode = document.getElementById("phone-screen").classList.contains("dark-mode");
    chatScreen.style.backgroundColor = chat.settings.background
      ? "transparent"
      : isDarkMode
      ? "#000000"
      : "#f0f2f5";
    const history = chat.history;
    const totalMessages = history.length;
    currentRenderedCount = 0;
    const initialMessages = history.slice(-MESSAGE_RENDER_WINDOW);
    initialMessages.forEach((msg) => appendMessage(msg, chat, true));
    currentRenderedCount = initialMessages.length;
    if (totalMessages > currentRenderedCount) {
      prependLoadMoreButton(messagesContainer);
    }
    const typingIndicator = document.createElement("div");
    typingIndicator.id = "typing-indicator";
    typingIndicator.style.display = "none";
    typingIndicator.textContent = "对方正在输入...";
    messagesContainer.appendChild(typingIndicator);
    setTimeout(() => (messagesContainer.scrollTop = messagesContainer.scrollHeight), 0);
  }
  // ▲▲▲ 替换结束 ▲▲▲

  function prependLoadMoreButton(container) {
    const button = document.createElement("button");
    button.id = "load-more-btn";
    button.textContent = "加载更早的记录";
    button.addEventListener("click", loadMoreMessages);
    container.prepend(button);
  }

  function loadMoreMessages() {
    const messagesContainer = document.getElementById("chat-messages");
    const chat = state.chats[state.activeChatId];
    if (!chat) return;
    const loadMoreBtn = document.getElementById("load-more-btn");
    if (loadMoreBtn) loadMoreBtn.remove();
    const totalMessages = chat.history.length;
    const nextSliceStart = totalMessages - currentRenderedCount - MESSAGE_RENDER_WINDOW;
    const nextSliceEnd = totalMessages - currentRenderedCount;
    const messagesToPrepend = chat.history.slice(Math.max(0, nextSliceStart), nextSliceEnd);
    const oldScrollHeight = messagesContainer.scrollHeight;
    messagesToPrepend.reverse().forEach((msg) => prependMessage(msg, chat));
    currentRenderedCount += messagesToPrepend.length;
    const newScrollHeight = messagesContainer.scrollHeight;
    messagesContainer.scrollTop += newScrollHeight - oldScrollHeight;
    if (totalMessages > currentRenderedCount) {
      prependLoadMoreButton(messagesContainer);
    }
  }

  // ▼▼▼ 用这个【新版本】替换旧的 renderWallpaperScreen 函数 ▼▼▼
  function renderWallpaperScreen() {
    const preview = document.getElementById("wallpaper-preview");
    const bg = newWallpaperBase64 || state.globalSettings.wallpaper;
    if (bg && bg.startsWith("data:image")) {
      preview.style.backgroundImage = `url(${bg})`;
      preview.textContent = "";
    } else if (bg) {
      preview.style.backgroundImage = bg;
      preview.textContent = "当前为渐变色";
    }
    // 【核心修改】在这里调用图标渲染函数
    renderIconSettings();
  }
  // ▲▲▲ 替换结束 ▲▲▲
  window.renderWallpaperScreenProxy = renderWallpaperScreen;

  function applyGlobalWallpaper() {
    const homeScreen = document.getElementById("home-screen");
    const wallpaper = state.globalSettings.wallpaper;
    if (wallpaper && wallpaper.startsWith("data:image"))
      homeScreen.style.backgroundImage = `url(${wallpaper})`;
    else if (wallpaper) homeScreen.style.backgroundImage = wallpaper;
  }

  async function renderWorldBookScreen() {
    const listEl = document.getElementById("world-book-list");
    listEl.innerHTML = "";

    // 1. 同时获取所有书籍和所有分类
    const [books, categories] = await Promise.all([
      db.worldBooks.toArray(),
      db.worldBookCategories.orderBy("name").toArray(),
    ]);

    state.worldBooks = books; // 确保内存中的数据是同步的

    if (books.length === 0) {
      listEl.innerHTML =
        '<p style="text-align:center; color: #8a8a8a; margin-top: 50px;">点击右上角 "+" 创建你的第一本世界书</p>';
      return;
    }

    // 2. 将书籍按 categoryId 分组
    const groupedBooks = books.reduce((acc, book) => {
      const key = book.categoryId || "uncategorized";
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(book);
      return acc;
    }, {});

    // 3. 优先渲染已分类的书籍
    categories.forEach((category) => {
      const booksInCategory = groupedBooks[category.id];
      if (booksInCategory && booksInCategory.length > 0) {
        const groupContainer = createWorldBookGroup(category.name, booksInCategory);
        listEl.appendChild(groupContainer);
      }
    });

    // 4. 最后渲染未分类的书籍
    const uncategorizedBooks = groupedBooks["uncategorized"];
    if (uncategorizedBooks && uncategorizedBooks.length > 0) {
      const groupContainer = createWorldBookGroup("未分类", uncategorizedBooks);
      listEl.appendChild(groupContainer);
    }

    // 5. 为所有分组标题添加折叠事件
    document.querySelectorAll(".world-book-group-header").forEach((header) => {
      header.addEventListener("click", () => {
        header.classList.toggle("collapsed");
        header.nextElementSibling.classList.toggle("collapsed");
      });
    });
  }

  /**
   * 【辅助函数】创建一个分类的分组DOM
   * @param {string} groupName - 分类名称
   * @param {Array} books - 该分类下的书籍数组
   * @returns {HTMLElement} - 创建好的分组容器
   */
  function createWorldBookGroup(groupName, books) {
    const groupContainer = document.createElement("div");
    groupContainer.className = "world-book-group-container";

    groupContainer.innerHTML = `
        <div class="world-book-group-header">
            <span class="arrow">▼</span>
            <span class="group-name">${groupName}</span>
        </div>
        <div class="world-book-group-content"></div>
    `;

    // ▼▼▼ 在这里添加新代码 ▼▼▼
    const headerEl = groupContainer.querySelector(".world-book-group-header");
    const contentEl = groupContainer.querySelector(".world-book-group-content");

    // 默认给头部和内容区都加上 collapsed 类
    headerEl.classList.add("collapsed");
    contentEl.classList.add("collapsed");
    // ▲▲▲ 添加结束 ▲▲▲

    books.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
    books.forEach((book) => {
      const item = document.createElement("div");
      item.className = "list-item";
      item.dataset.bookId = book.id;
      item.innerHTML = `<div class="item-title">${book.name}</div><div class="item-content">${(
        book.content || "暂无内容..."
      ).substring(0, 50)}</div>`;
      item.addEventListener("click", () => openWorldBookEditor(book.id));
      addLongPressListener(item, async () => {
        const confirmed = await showCustomConfirm(
          "删除世界书",
          `确定要删除《${book.name}》吗？此操作不可撤销。`,
          { confirmButtonClass: "btn-danger" }
        );
        if (confirmed) {
          await db.worldBooks.delete(book.id);
          state.worldBooks = state.worldBooks.filter((wb) => wb.id !== book.id);
          renderWorldBookScreen();
        }
      });
      contentEl.appendChild(item);
    });

    return groupContainer;
  }
  window.renderWorldBookScreenProxy = renderWorldBookScreen;

  async function openWorldBookEditor(bookId) {
    editingWorldBookId = bookId;
    const [book, categories] = await Promise.all([
      db.worldBooks.get(bookId),
      db.worldBookCategories.toArray(),
    ]);
    if (!book) return;

    document.getElementById("world-book-editor-title").textContent = book.name;
    document.getElementById("world-book-name-input").value = book.name;
    document.getElementById("world-book-content-input").value = book.content;

    // 【核心修改】填充分类下拉菜单
    const selectEl = document.getElementById("world-book-category-select");
    selectEl.innerHTML = '<option value="">-- 未分类 --</option>'; // 默认选项
    categories.forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat.id;
      option.textContent = cat.name;
      if (book.categoryId === cat.id) {
        option.selected = true; // 选中当前分类
      }
      selectEl.appendChild(option);
    });

    showScreen("world-book-editor-screen");
  }

  function renderStickerPanel() {
    const grid = document.getElementById("sticker-grid");
    grid.innerHTML = "";
    if (state.userStickers.length === 0) {
      grid.innerHTML =
        '<p style="text-align:center; color: var(--text-secondary); grid-column: 1 / -1;">大人请点击右上角“添加”或“上传”来添加你的第一个表情吧！</p>';
      return;
    }
    state.userStickers.forEach((sticker) => {
      const item = document.createElement("div");
      item.className = "sticker-item";
      item.style.backgroundImage = `url(${sticker.url})`;
      item.title = sticker.name;
      item.addEventListener("click", () => sendSticker(sticker));
      addLongPressListener(item, () => {
        if (isSelectionMode) return;
        const existingDeleteBtn = item.querySelector(".delete-btn");
        if (existingDeleteBtn) return;
        const deleteBtn = document.createElement("div");
        deleteBtn.className = "delete-btn";
        deleteBtn.innerHTML = "&times;";
        deleteBtn.onclick = async (e) => {
          e.stopPropagation();
          const confirmed = await showCustomConfirm(
            "删除表情",
            `确定要删除表情 "${sticker.name}" 吗？`,
            { confirmButtonClass: "btn-danger" }
          );
          if (confirmed) {
            await db.userStickers.delete(sticker.id);
            state.userStickers = state.userStickers.filter((s) => s.id !== sticker.id);
            renderStickerPanel();
          }
        };
        item.appendChild(deleteBtn);
        deleteBtn.style.display = "block";
        setTimeout(
          () =>
            item.addEventListener("mouseleave", () => deleteBtn.remove(), {
              once: true,
            }),
          3000
        );
      });
      grid.appendChild(item);
    });
  }

  // ▼▼▼ 用这个【已更新】的版本替换旧的 createMessageElement 函数 ▼▼▼
  function createMessageElement(msg, chat) {
    // ▼▼▼ 在函数最开头，添加这段新代码 ▼▼▼
    if (msg.type === "recalled_message") {
      const wrapper = document.createElement("div");
      // 1. 【核心】给 wrapper 也加上 timestamp，方便事件委托时查找
      wrapper.className = "message-wrapper system-pat";
      wrapper.dataset.timestamp = msg.timestamp;

      const bubble = document.createElement("div");
      // 2. 【核心】让这个元素同时拥有 .message-bubble 和 .recalled-message-placeholder 两个class
      //    这样它既能被选择系统识别，又能保持原有的居中灰色样式
      bubble.className = "message-bubble recalled-message-placeholder";
      // 3. 【核心】把 timestamp 放在 bubble 上，这是多选逻辑的关键
      bubble.dataset.timestamp = msg.timestamp;
      bubble.textContent = msg.content;

      wrapper.appendChild(bubble);

      // 4. 【核心】为它补上和其他消息一样的标准事件监听器
      addLongPressListener(wrapper, () => showMessageActions(msg.timestamp));
      wrapper.addEventListener("click", () => {
        if (isSelectionMode) {
          toggleMessageSelection(msg.timestamp);
        }
      });

      // 5. 【重要】在之前的“点击查看原文”的逻辑中，我们已经使用了事件委托，所以这里不需要再单独为这个元素添加点击事件了。
      //    init() 函数中的那个事件监听器会处理它。

      return wrapper;
    }
    // ▲▲▲ 添加结束 ▲▲▲

    if (msg.isHidden) {
      return null;
    }

    if (msg.type === "pat_message") {
      const wrapper = document.createElement("div");
      wrapper.className = "message-wrapper system-pat";
      const bubble = document.createElement("div");
      bubble.className = "message-bubble system-bubble";
      bubble.dataset.timestamp = msg.timestamp;
      bubble.textContent = msg.content;
      wrapper.appendChild(bubble);
      addLongPressListener(wrapper, () => showMessageActions(msg.timestamp));
      wrapper.addEventListener("click", () => {
        if (isSelectionMode) toggleMessageSelection(msg.timestamp);
      });
      return wrapper;
    }

    const isUser = msg.role === "user";
    const wrapper = document.createElement("div");
    wrapper.className = `message-wrapper ${isUser ? "user" : "ai"}`;

    // ★★★【核心重构】★★★
    // 这段逻辑现在用于查找成员对象，并显示其“群昵称”
    if (chat.isGroup && !isUser) {
      // 1. 使用AI返回的“本名”(`msg.senderName`)去列表里查找成员对象
      const member = chat.members.find((m) => m.originalName === msg.senderName);

      // 2. 创建用于显示名字的 div
      const senderNameDiv = document.createElement("div");
      senderNameDiv.className = "sender-name";

      // 3. 如果找到了成员，就显示他的“群昵称”；如果找不到，就显示AI返回的“本名”作为备用
      senderNameDiv.textContent = member ? member.groupNickname : msg.senderName || "未知成员";

      wrapper.appendChild(senderNameDiv);
    }

    const bubble = document.createElement("div");
    bubble.className = `message-bubble ${isUser ? "user" : "ai"}`;
    bubble.dataset.timestamp = msg.timestamp;

    const timestampEl = document.createElement("span");
    timestampEl.className = "timestamp";
    timestampEl.textContent = formatTimestamp(msg.timestamp);

    // ▼▼▼【粘贴这段新代码】▼▼▼
    let avatarSrc; // 我们现在只需要头像图片，不再需要头像框了
    if (chat.isGroup) {
      if (isUser) {
        avatarSrc = chat.settings.myAvatar || defaultMyGroupAvatar;
      } else {
        const member = chat.members.find((m) => m.originalName === msg.senderName);
        avatarSrc = member ? member.avatar : defaultGroupMemberAvatar;
      }
    } else {
      if (isUser) {
        avatarSrc = chat.settings.myAvatar || defaultAvatar;
      } else {
        avatarSrc = chat.settings.aiAvatar || defaultAvatar;
      }
    }
    // 直接生成最简单的头像HTML，不再有任何和头像框相关的逻辑
    const avatarHtml = `<img src="${avatarSrc}" class="avatar">`;
    // ▲▲▲【粘贴结束】▲▲▲

    let contentHtml;

    if (msg.type === "share_link") {
      bubble.classList.add("is-link-share");

      // 【核心修正1】将 onclick="openBrowser(...)" 移除，我们将在JS中动态绑定事件
      contentHtml = `
            <div class="link-share-card" data-timestamp="${msg.timestamp}">
                <div class="title">${msg.title || "无标题"}</div>
                <div class="description">${msg.description || "点击查看详情..."}</div>
                <div class="footer">
                    <svg class="footer-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                    <span>${msg.source_name || "链接分享"}</span>
                </div>
            </div>
        `;
    } else if (msg.type === "share_card") {
      bubble.classList.add("is-link-share"); // 复用链接分享的卡片样式
      // 【核心】把时间戳加到卡片上，方便后面点击时识别
      contentHtml = `
        <div class="link-share-card" style="cursor: pointer;" data-timestamp="${msg.timestamp}">
            <div class="title">${msg.payload.title}</div>
            <div class="description">共 ${msg.payload.sharedHistory.length} 条消息</div>
            <div class="footer">
                <svg class="footer-icon" ...>...</svg> <!-- 复用链接分享的图标 -->
                <span>聊天记录</span>
            </div>
        </div>
    `;
    }

    // 后续的其他 else if 保持不变
    else if (msg.type === "user_photo" || msg.type === "ai_image") {
      bubble.classList.add("is-ai-image");
      const altText = msg.type === "user_photo" ? "用户描述的照片" : "AI生成的图片";
      contentHtml = `<img src=" img/Ai-Generated-Image.jpg" class="ai-generated-image" alt="${altText}" data-description="${msg.content}">`;
    } else if (msg.type === "voice_message") {
      bubble.classList.add("is-voice-message");

      // 【核心修正1】将语音原文存储在父级气泡的 data-* 属性中，方便事件处理器获取
      bubble.dataset.voiceText = msg.content;

      const duration = Math.max(1, Math.round((msg.content || "").length / 5));
      const durationFormatted = `0:${String(duration).padStart(2, "0")}''`;
      const waveformHTML = "<div></div><div></div><div></div><div></div><div></div>";

      // 【核心修正2】构建包含所有新元素的完整 HTML
      contentHtml = `
        <div class="voice-message-body">
            <div class="voice-waveform">${waveformHTML}</div>
            <div class="loading-spinner"></div>
            <span class="voice-duration">${durationFormatted}</span>
        </div>
        <div class="voice-transcript"></div>
    `;
    } else if (msg.type === "transfer") {
      bubble.classList.add("is-transfer");

      let titleText, noteText;
      const myNickname = chat.isGroup ? chat.settings.myNickname || "我" : "我";

      if (isUser) {
        // 消息是用户发出的
        if (msg.isRefund) {
          // 用户发出的退款（即用户拒收了AI的转账）
          titleText = `退款给 ${chat.name}`;
          noteText = "已拒收对方转账";
        } else {
          // 用户主动发起的转账
          titleText = `转账给 ${msg.receiverName || chat.name}`;
          if (msg.status === "accepted") {
            noteText = "对方已收款";
          } else if (msg.status === "declined") {
            noteText = "对方已拒收";
          } else {
            noteText = msg.note || "等待对方处理...";
          }
        }
      } else {
        // 消息是 AI 发出的
        if (msg.isRefund) {
          // AI 的退款（AI 拒收了用户的转账）
          titleText = `退款来自 ${msg.senderName}`;
          noteText = "转账已被拒收";
        } else if (msg.receiverName === myNickname) {
          // 【核心修正1】这是 AI 主动给用户的转账
          titleText = `转账给 ${myNickname}`;
          if (msg.status === "accepted") {
            noteText = "你已收款";
          } else if (msg.status === "declined") {
            noteText = "你已拒收";
          } else {
            // 这是用户需要处理的转账
            bubble.style.cursor = "pointer";
            bubble.dataset.status = "pending";
            noteText = msg.note || "点击处理";
          }
        } else {
          // 【核心修正2】这是 AI 发给群里其他人的转账，对当前用户来说只是一个通知
          titleText = `转账: ${msg.senderName} → ${msg.receiverName}`;
          noteText = msg.note || "群聊内转账";
        }
      }

      const heartIcon = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style="vertical-align: middle;"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>`;

      contentHtml = `
        <div class="transfer-card">
            <div class="transfer-title">${heartIcon} ${titleText}</div>
            <div class="transfer-amount">¥ ${Number(msg.amount).toFixed(2)}</div>
            <div class.transfer-note">${noteText}</div>
        </div>
    `;
    } else if (msg.type === "waimai_request") {
      bubble.classList.add("is-waimai-request");
      if (msg.status === "paid" || msg.status === "rejected") {
        bubble.classList.add(`status-${msg.status}`);
      }
      let displayName;
      // 如果是群聊
      if (chat.isGroup) {
        // 就执行原来的逻辑：在成员列表里查找昵称
        const member = chat.members.find((m) => m.originalName === msg.senderName);
        displayName = member ? member.groupNickname : msg.senderName;
      } else {
        // 否则（是单聊），直接使用聊天对象的名称
        displayName = chat.name;
      }
      // 【核心修改】使用我们刚刚查找到的 displayName
      const requestTitle = `来自 ${displayName} 的代付请求`;
      let actionButtonsHtml = "";
      if (msg.status === "pending" && !isUser) {
        actionButtonsHtml = `
                <div class="waimai-user-actions">
                    <button class="waimai-decline-btn" data-choice="rejected">残忍拒绝</button>
                    <button class="waimai-pay-btn" data-choice="paid">为Ta买单</button>
                </div>`;
      }
      contentHtml = `
            <div class="waimai-card">
                <div class="waimai-header">
                    <img src="https://files.catbox.moe/mq179k.png" class="icon" alt="Meituan Icon">
                    <div class="title-group">
                        <span class="brand">美团外卖</span><span class="separator">|</span><span>外卖美食</span>
                    </div>
                </div>
                <div class="waimai-catchphrase">Hi，你和我的距离只差一顿外卖～</div>
                <div class="waimai-main">
                    <div class="request-title">${requestTitle}</div>
                    <div class="payment-box">
                        <div class="payment-label">需付款</div>
                        <div class="amount">¥${Number(msg.amount).toFixed(2)}</div>
                        <div class="countdown-label">剩余支付时间
                            <div class="countdown-timer" id="waimai-timer-${msg.timestamp}"></div>
                        </div>
                    </div>
                    <button class="waimai-details-btn">查看详情</button>
                </div>
                ${actionButtonsHtml}
            </div>`;

      setTimeout(() => {
        const timerEl = document.getElementById(`waimai-timer-${msg.timestamp}`);
        if (timerEl && msg.countdownEndTime) {
          if (waimaiTimers[msg.timestamp]) clearInterval(waimaiTimers[msg.timestamp]);
          if (msg.status === "pending") {
            waimaiTimers[msg.timestamp] = startWaimaiCountdown(timerEl, msg.countdownEndTime);
          } else {
            timerEl.innerHTML = `<span>已</span><span>处</span><span>理</span>`;
          }
        }
        const detailsBtn = document.querySelector(
          `.message-bubble[data-timestamp="${msg.timestamp}"] .waimai-details-btn`
        );
        if (detailsBtn) {
          detailsBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const paidByText = msg.paidBy
              ? `<br><br><b>状态：</b>由 ${msg.paidBy} 为您代付成功`
              : "";
            showCustomAlert(
              "订单详情",
              `<b>商品：</b>${msg.productInfo}<br><b>金额：</b>¥${Number(msg.amount).toFixed(
                2
              )}${paidByText}`
            );
          });
        }
        const actionButtons = document.querySelectorAll(
          `.message-bubble[data-timestamp="${msg.timestamp}"] .waimai-user-actions button`
        );
        actionButtons.forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const choice = e.target.dataset.choice;
            handleWaimaiResponse(msg.timestamp, choice);
          });
        });
      }, 0);
    } else if (msg.type === "red_packet") {
      bubble.classList.add("is-red-packet");
      const myNickname = chat.settings.myNickname || "我";

      // 从最新的 msg 对象中获取状态
      const hasClaimed = msg.claimedBy && msg.claimedBy[myNickname];
      const isFinished = msg.isFullyClaimed;

      let cardClass = "";
      let claimedInfoHtml = "";
      let typeText = "拼手气红包";

      // 1. 判断红包卡片的样式 (颜色)
      if (isFinished) {
        cardClass = "opened";
      } else if (msg.packetType === "direct" && Object.keys(msg.claimedBy || {}).length > 0) {
        cardClass = "opened"; // 专属红包被领了也变灰
      }

      // 2. 判断红包下方的提示文字
      if (msg.packetType === "direct") {
        typeText = `专属红包: 给 ${msg.receiverName}`;
      }

      if (hasClaimed) {
        claimedInfoHtml = `<div class="rp-claimed-info">你领取了红包，金额 ${msg.claimedBy[
          myNickname
        ].toFixed(2)} 元</div>`;
      } else if (isFinished) {
        claimedInfoHtml = `<div class="rp-claimed-info">红包已被领完</div>`;
      } else if (msg.packetType === "direct" && Object.keys(msg.claimedBy || {}).length > 0) {
        claimedInfoHtml = `<div class="rp-claimed-info">已被 ${msg.receiverName} 领取</div>`;
      }

      // 3. 拼接最终的HTML，确保onclick调用的是我们注册到全局的函数
      contentHtml = `
        <div class="red-packet-card ${cardClass}">
            <div class="rp-header">
                <img src="https://files.catbox.moe/lo9xhc.png" class="rp-icon">
                <span class="rp-greeting">${msg.greeting || "恭喜发财，大吉大利！"}</span>
            </div>
            <div class="rp-type">${typeText}</div>
            ${claimedInfoHtml}
        </div>
    `;
      // ▲▲▲ 新增结束 ▲▲▲
    } else if (msg.type === "poll") {
      bubble.classList.add("is-poll");

      let totalVotes = 0;
      const voteCounts = {};

      // 计算总票数和每个选项的票数
      for (const option in msg.votes) {
        const count = msg.votes[option].length;
        voteCounts[option] = count;
        totalVotes += count;
      }

      const myNickname = chat.isGroup ? chat.settings.myNickname || "我" : "我";
      let myVote = null;
      for (const option in msg.votes) {
        if (msg.votes[option].includes(myNickname)) {
          myVote = option;
          break;
        }
      }

      let optionsHtml = '<div class="poll-options-list">';
      msg.options.forEach((optionText) => {
        const count = voteCounts[optionText] || 0;
        const percentage = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
        const isVotedByMe = myVote === optionText;

        optionsHtml += `
            <div class="poll-option-item ${isVotedByMe ? "voted" : ""}" data-option="${optionText}">
                <div class="poll-option-bar" style="width: ${percentage}%;"></div>
                <div class="poll-option-content">
                    <span class="poll-option-text">${optionText}</span>
                    <span class="poll-option-votes">${count} 票</span>
                </div>
            </div>
        `;
      });
      optionsHtml += "</div>";

      let footerHtml = "";
      // 【核心修改】在这里统一按钮的显示逻辑
      if (msg.isClosed) {
        // 如果投票已结束，总是显示“查看结果”
        footerHtml = `<div class="poll-footer"><span class="poll-total-votes">共 ${totalVotes} 人投票</span><button class="poll-action-btn">查看结果</button></div>`;
      } else {
        // 如果投票未结束，总是显示“结束投票”
        footerHtml = `<div class="poll-footer"><span class="poll-total-votes">共 ${totalVotes} 人投票</span><button class="poll-action-btn">结束投票</button></div>`;
      }

      contentHtml = `
        <div class="poll-card ${msg.isClosed ? "closed" : ""}" data-poll-timestamp="${
        msg.timestamp
      }">
            <div class="poll-question">${msg.question}</div>
            ${optionsHtml}
            ${footerHtml}
        </div>
    `;
      // ▲▲▲ 替换结束 ▲▲▲
    } else if (typeof msg.content === "string" && STICKER_REGEX.test(msg.content)) {
      bubble.classList.add("is-sticker");
      contentHtml = `<img src="${msg.content}" alt="${
        msg.meaning || "Sticker"
      }" class="sticker-image">`;
    } else if (Array.isArray(msg.content) && msg.content[0]?.type === "image_url") {
      bubble.classList.add("has-image");
      const imageUrl = msg.content[0].image_url.url;
      contentHtml = `<img src="${imageUrl}" class="chat-image" alt="User uploaded image">`;
    } else {
      contentHtml = String(msg.content || "").replace(/\n/g, "<br>");
    }

    // ▼▼▼ 【最终修正版】请用这整块代码，完整替换掉旧的引用渲染逻辑 ▼▼▼

    // 1. 【统一逻辑】检查消息对象中是否存在引用信息 (msg.quote)
    let quoteHtml = "";
    // 无论是用户消息还是AI消息，只要它包含了 .quote 对象，就执行这段逻辑
    if (msg.quote) {
      // a. 【核心修正】直接获取完整的、未经截断的引用内容
      const fullQuotedContent = String(msg.quote.content || "");

      // b. 构建引用块的HTML
      quoteHtml = `
        <div class="quoted-message">
            <div class="quoted-sender">回复 ${msg.quote.senderName}:</div>
            <div class="quoted-content">${fullQuotedContent}</div>
        </div>
    `;
    }

    // 2. 拼接最终的气泡内容
    //    将构建好的 quoteHtml (如果存在) 和 contentHtml 组合起来
    // --- 【最终正确结构】将头像和内容都放回气泡内部 ---
    bubble.innerHTML = `
        ${avatarHtml}
        <div class="content">
            ${quoteHtml}
            ${contentHtml}
        </div>
    `;

    // --- 【最终正确结构】将完整的“气泡”和“时间戳”放入容器 ---
    wrapper.appendChild(bubble);
    wrapper.appendChild(timestampEl);

    addLongPressListener(wrapper, () => showMessageActions(msg.timestamp));
    wrapper.addEventListener("click", () => {
      if (isSelectionMode) toggleMessageSelection(msg.timestamp);
    });

    if (!isUser) {
      const avatarEl = wrapper.querySelector(".avatar"); //  <-- 1. 把查找目标改成 '.avatar'
      if (avatarEl) {
        avatarEl.style.cursor = "pointer";
        avatarEl.addEventListener("click", (e) => {
          //  <-- 2. 确保这里也用新变量
          e.stopPropagation();
          const characterName = chat.isGroup ? msg.senderName : chat.name;
          handleUserPat(chat.id, characterName);
        });
      }
    }

    return wrapper;
  }
  // ▲▲▲ 替换结束 ▲▲▲

  function prependMessage(msg, chat) {
    const messagesContainer = document.getElementById("chat-messages");
    const messageEl = createMessageElement(msg, chat);

    if (!messageEl) return; // <--- 新增这行，同样的处理

    const loadMoreBtn = document.getElementById("load-more-btn");
    if (loadMoreBtn) {
      messagesContainer.insertBefore(messageEl, loadMoreBtn.nextSibling);
    } else {
      messagesContainer.prepend(messageEl);
    }
  }

  // ▼▼▼ 用这个【带动画的版本】替换你原来的 appendMessage 函数 ▼▼▼
  function appendMessage(msg, chat, isInitialLoad = false) {
    const messagesContainer = document.getElementById("chat-messages");
    const messageEl = createMessageElement(msg, chat);

    if (!messageEl) return; // 如果消息是隐藏的，则不处理

    // 【核心】只对新消息添加动画，不对初始加载的消息添加
    if (!isInitialLoad) {
      messageEl.classList.add("animate-in");
    }

    const typingIndicator = document.getElementById("typing-indicator");
    messagesContainer.insertBefore(messageEl, typingIndicator);

    if (!isInitialLoad) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      currentRenderedCount++;
    }
  }
  // ▲▲▲ 替换结束 ▲▲▲

  async function openChat(chatId) {
    state.activeChatId = chatId;
    const chat = state.chats[chatId];
    if (!chat) return; // 安全检查

    // 【核心新增】在这里将未读数清零
    if (chat.unreadCount > 0) {
      chat.unreadCount = 0;
      await db.chats.put(chat); // 别忘了把这个改变同步到数据库
      // 我们稍后会在渲染列表时重新渲染，所以这里不需要立即重绘列表
    }

    renderChatInterface(chatId);
    showScreen("chat-interface-screen");
    window.updateListenTogetherIconProxy(state.activeChatId);
    toggleCallButtons(chat.isGroup || false);

    if (!chat.isGroup && chat.relationship?.status === "pending_ai_approval") {
      console.log(`检测到好友申请待处理状态，为角色 "${chat.name}" 自动触发AI响应...`);
      triggerAiResponse();
    }

    // 【核心修正】根据是否为群聊，显示或隐藏投票按钮
    document.getElementById("send-poll-btn").style.display = chat.isGroup ? "flex" : "none";
  }
  // ▲▲▲ 替换结束 ▲▲▲

  async function sendSticker(sticker) {
    if (!state.activeChatId) return;
    const chat = state.chats[state.activeChatId];
    const msg = {
      role: "user",
      content: sticker.url,
      meaning: sticker.name,
      timestamp: Date.now(),
    };
    chat.history.push(msg);
    await db.chats.put(chat);
    appendMessage(msg, chat);
    renderChatList();
    document.getElementById("sticker-panel").classList.remove("visible");
  }

  async function sendUserTransfer() {
    if (!state.activeChatId) return;
    const amountInput = document.getElementById("transfer-amount");
    const noteInput = document.getElementById("transfer-note");
    const amount = parseFloat(amountInput.value);
    const note = noteInput.value.trim();
    if (isNaN(amount) || amount < 0 || amount > 9999) {
      alert("请输入有效的金额 (0 到 9999 之间)！");
      return;
    }
    const chat = state.chats[state.activeChatId];
    const senderName = chat.isGroup ? chat.settings.myNickname || "我" : "我";
    const receiverName = chat.isGroup ? "群聊" : chat.name;
    const msg = {
      role: "user",
      type: "transfer",
      amount: amount,
      note: note,
      senderName,
      receiverName,
      timestamp: Date.now(),
    };
    chat.history.push(msg);
    await db.chats.put(chat);
    appendMessage(msg, chat);
    renderChatList();
    document.getElementById("transfer-modal").classList.remove("visible");
    amountInput.value = "";
    noteInput.value = "";
  }

  function enterSelectionMode(initialMsgTimestamp) {
    if (isSelectionMode) return;
    isSelectionMode = true;
    document.getElementById("chat-interface-screen").classList.add("selection-mode");
    toggleMessageSelection(initialMsgTimestamp);
  }

  function exitSelectionMode() {
    cleanupWaimaiTimers(); // <--- 在这里添加这行代码
    if (!isSelectionMode) return;
    isSelectionMode = false;
    document.getElementById("chat-interface-screen").classList.remove("selection-mode");
    selectedMessages.forEach((ts) => {
      const bubble = document.querySelector(`.message-bubble[data-timestamp="${ts}"]`);
      if (bubble) bubble.classList.remove("selected");
    });
    selectedMessages.clear();
  }

  // ▼▼▼ 请用这个【最终简化版】替换旧的 toggleMessageSelection 函数 ▼▼▼
  function toggleMessageSelection(timestamp) {
    // 【核心修正】选择器已简化，不再寻找已删除的 .recalled-message-placeholder
    const elementToSelect = document.querySelector(
      `.message-bubble[data-timestamp="${timestamp}"]`
    );

    if (!elementToSelect) return;

    if (selectedMessages.has(timestamp)) {
      selectedMessages.delete(timestamp);
      elementToSelect.classList.remove("selected");
    } else {
      selectedMessages.add(timestamp);
      elementToSelect.classList.add("selected");
    }

    document.getElementById("selection-count").textContent = `已选 ${selectedMessages.size} 条`;

    if (selectedMessages.size === 0) {
      exitSelectionMode();
    }
  }
  // ▲▲▲ 替换结束 ▲▲▲

  function addLongPressListener(element, callback) {
    let pressTimer;
    const startPress = (e) => {
      if (isSelectionMode) return;
      e.preventDefault();
      pressTimer = window.setTimeout(() => callback(e), 500);
    };
    const cancelPress = () => clearTimeout(pressTimer);
    element.addEventListener("mousedown", startPress);
    element.addEventListener("mouseup", cancelPress);
    element.addEventListener("mouseleave", cancelPress);
    element.addEventListener("touchstart", startPress, { passive: true });
    element.addEventListener("touchend", cancelPress);
    element.addEventListener("touchmove", cancelPress);
  }

  async function handleListenTogetherClick() {
    const targetChatId = state.activeChatId;
    if (!targetChatId) return;
    if (!musicState.isActive) {
      startListenTogetherSession(targetChatId);
      return;
    }
    if (musicState.activeChatId === targetChatId) {
      document.getElementById("music-player-overlay").classList.add("visible");
    } else {
      const oldChatName = state.chats[musicState.activeChatId]?.name || "未知";
      const newChatName = state.chats[targetChatId]?.name || "当前";
      const confirmed = await showCustomConfirm(
        "切换听歌对象",
        `您正和「${oldChatName}」听歌。要结束并开始和「${newChatName}」的新会话吗？`,
        { confirmButtonClass: "btn-danger" }
      );
      if (confirmed) {
        await endListenTogetherSession(true);
        await new Promise((resolve) => setTimeout(resolve, 50));
        startListenTogetherSession(targetChatId);
      }
    }
  }

  async function startListenTogetherSession(chatId) {
    const chat = state.chats[chatId];
    if (!chat) return;
    musicState.totalElapsedTime = chat.musicData.totalTime || 0;
    musicState.isActive = true;
    musicState.activeChatId = chatId;
    if (musicState.playlist.length > 0) {
      musicState.currentIndex = 0;
    } else {
      musicState.currentIndex = -1;
    }
    if (musicState.timerId) clearInterval(musicState.timerId);
    musicState.timerId = setInterval(() => {
      if (musicState.isPlaying) {
        musicState.totalElapsedTime++;
        updateElapsedTimeDisplay();
      }
    }, 1000);
    updatePlayerUI();
    updatePlaylistUI();
    document.getElementById("music-player-overlay").classList.add("visible");
  }

  async function endListenTogetherSession(saveState = true) {
    if (!musicState.isActive) return;
    const oldChatId = musicState.activeChatId;
    const cleanupLogic = async () => {
      if (musicState.timerId) clearInterval(musicState.timerId);
      if (musicState.isPlaying) audioPlayer.pause();
      if (saveState && oldChatId && state.chats[oldChatId]) {
        const chat = state.chats[oldChatId];
        chat.musicData.totalTime = musicState.totalElapsedTime;
        await db.chats.put(chat);
      }
      musicState.isActive = false;
      musicState.activeChatId = null;
      musicState.totalElapsedTime = 0;
      musicState.timerId = null;
      updateListenTogetherIcon(oldChatId, true);
    };
    closeMusicPlayerWithAnimation(cleanupLogic);
  }

  function returnToChat() {
    closeMusicPlayerWithAnimation();
  }

  async function renderAlbumList() {
    const albumGrid = document.getElementById("album-grid-page");
    if (!albumGrid) return;
    const albums = await db.qzoneAlbums.orderBy("createdAt").reverse().toArray();
    albumGrid.innerHTML = "";
    if (albums.length === 0) {
      albumGrid.innerHTML =
        '<p style="grid-column: 1 / -1; text-align: center; color: var(--text-secondary); margin-top: 50px;">你还没有创建任何相册哦~</p>';
      return;
    }
    albums.forEach((album) => {
      const albumItem = document.createElement("div");
      albumItem.className = "album-item";
      albumItem.innerHTML = `
                    <div class="album-cover" style="background-image: url(${
                      album.coverUrl
                    });"></div>
                    <div class="album-info">
                        <p class="album-name">${album.name}</p>
                        <p class="album-count">${album.photoCount || 0} 张</p>
                    </div>
                `;
      albumItem.addEventListener("click", () => {
        openAlbum(album.id);
      });

      // ▼▼▼ 新增的核心代码就是这里 ▼▼▼
      addLongPressListener(albumItem, async () => {
        const confirmed = await showCustomConfirm(
          "删除相册",
          `确定要删除相册《${album.name}》吗？此操作将同时删除相册内的所有照片，且无法恢复。`,
          { confirmButtonClass: "btn-danger" }
        );

        if (confirmed) {
          // 1. 从照片表中删除该相册下的所有照片
          await db.qzonePhotos.where("albumId").equals(album.id).delete();

          // 2. 从相册表中删除该相册本身
          await db.qzoneAlbums.delete(album.id);

          // 3. 重新渲染相册列表
          await renderAlbumList();

          alert("相册已成功删除。");
        }
      });
      // ▲▲▲ 新增代码结束 ▲▲▲

      albumGrid.appendChild(albumItem);
    });
  }

  async function openAlbum(albumId) {
    state.activeAlbumId = albumId;
    await renderAlbumPhotosScreen();
    showScreen("album-photos-screen");
  }

  async function renderAlbumPhotosScreen() {
    if (!state.activeAlbumId) return;
    const photosGrid = document.getElementById("photos-grid-page");
    const headerTitle = document.getElementById("album-photos-title");
    const album = await db.qzoneAlbums.get(state.activeAlbumId);
    if (!album) {
      console.error("找不到相册:", state.activeAlbumId);
      showScreen("album-screen");
      return;
    }
    headerTitle.textContent = album.name;
    const photos = await db.qzonePhotos.where("albumId").equals(state.activeAlbumId).toArray();
    photosGrid.innerHTML = "";
    if (photos.length === 0) {
      photosGrid.innerHTML =
        '<p style="grid-column: 1 / -1; text-align: center; color: var(--text-secondary); margin-top: 50px;">这个相册还是空的，快上传第一张照片吧！</p>';
    } else {
      photos.forEach((photo) => {
        const photoItem = document.createElement("div");
        photoItem.className = "photo-item";
        photoItem.innerHTML = `
                        <img src="${photo.url}" class="photo-thumb" alt="相册照片">
                        <button class="photo-delete-btn" data-photo-id="${photo.id}">×</button>
                    `;
        photosGrid.appendChild(photoItem);
      });
    }
  }

  // --- ↓↓↓ 从这里开始复制 ↓↓↓ ---

  /**
   * 打开图片查看器
   * @param {string} clickedPhotoUrl - 用户点击的那张照片的URL
   */
  async function openPhotoViewer(clickedPhotoUrl) {
    if (!state.activeAlbumId) return;

    // 1. 从数据库获取当前相册的所有照片
    const photosInAlbum = await db.qzonePhotos
      .where("albumId")
      .equals(state.activeAlbumId)
      .toArray();
    photoViewerState.photos = photosInAlbum.map((p) => p.url);

    // 2. 找到被点击照片的索引
    photoViewerState.currentIndex = photoViewerState.photos.findIndex(
      (url) => url === clickedPhotoUrl
    );
    if (photoViewerState.currentIndex === -1) return; // 如果找不到，则不打开

    // 3. 显示模态框并渲染第一张图
    document.getElementById("photo-viewer-modal").classList.add("visible");
    renderPhotoViewer();
    photoViewerState.isOpen = true;
  }

  /**
   * 根据当前状态渲染查看器内容（图片和按钮）
   */
  function renderPhotoViewer() {
    if (photoViewerState.currentIndex === -1) return;

    const imageEl = document.getElementById("photo-viewer-image");
    const prevBtn = document.getElementById("photo-viewer-prev-btn");
    const nextBtn = document.getElementById("photo-viewer-next-btn");

    // 淡出效果
    imageEl.style.opacity = 0;

    setTimeout(() => {
      // 更新图片源
      imageEl.src = photoViewerState.photos[photoViewerState.currentIndex];
      // 淡入效果
      imageEl.style.opacity = 1;
    }, 100); // 延迟一点点时间来触发CSS过渡

    // 更新按钮状态：如果是第一张，禁用“上一张”按钮
    prevBtn.disabled = photoViewerState.currentIndex === 0;
    // 如果是最后一张，禁用“下一张”按钮
    nextBtn.disabled = photoViewerState.currentIndex === photoViewerState.photos.length - 1;
  }

  /**
   * 显示下一张照片
   */
  function showNextPhoto() {
    if (photoViewerState.currentIndex < photoViewerState.photos.length - 1) {
      photoViewerState.currentIndex++;
      renderPhotoViewer();
    }
  }

  /**
   * 显示上一张照片
   */
  function showPrevPhoto() {
    if (photoViewerState.currentIndex > 0) {
      photoViewerState.currentIndex--;
      renderPhotoViewer();
    }
  }

  /**
   * 关闭图片查看器
   */
  function closePhotoViewer() {
    document.getElementById("photo-viewer-modal").classList.remove("visible");
    photoViewerState.isOpen = false;
    photoViewerState.photos = [];
    photoViewerState.currentIndex = -1;
    // 清空图片，避免下次打开时闪现旧图
    document.getElementById("photo-viewer-image").src = "";
  }

  // --- ↑↑↑ 复制到这里结束 ↑↑↑ ---
  // ▼▼▼ 请将这个新函数粘贴到你的JS功能函数定义区 ▼▼▼

  /**
   * 更新动态小红点的显示
   * @param {number} count - 未读动态的数量
   */
  function updateUnreadIndicator(count) {
    unreadPostsCount = count;
    localStorage.setItem("unreadPostsCount", count); // 持久化存储

    // --- 更新底部导航栏的“动态”按钮 ---
    const navItem = document.querySelector('.nav-item[data-view="qzone-screen"]');

    const targetSpan = navItem.querySelector("span"); // 定位到文字 "动态"
    let indicator = navItem.querySelector(".unread-indicator");

    if (count > 0) {
      if (!indicator) {
        indicator = document.createElement("span");
        indicator.className = "unread-indicator";
        targetSpan.style.position = "relative"; // 把相对定位加在 span 上
        targetSpan.appendChild(indicator); // 把小红点作为 span 的子元素
      }
      indicator.textContent = count > 99 ? "99+" : count;
      indicator.style.display = "block";
    } else {
      if (indicator) {
        indicator.style.display = "none";
      }
    }

    // --- 更新聊天界面返回列表的按钮 ---
    const backBtn = document.getElementById("back-to-list-btn");
    let backBtnIndicator = backBtn.querySelector(".unread-indicator");

    if (count > 0) {
      if (!backBtnIndicator) {
        backBtnIndicator = document.createElement("span");
        backBtnIndicator.className = "unread-indicator back-btn-indicator";
        backBtn.style.position = "relative"; // 确保能正确定位
        backBtn.appendChild(backBtnIndicator);
      }
      // 返回键上的小红点通常不显示数字，只显示一个点
      backBtnIndicator.style.display = "block";
    } else {
      if (backBtnIndicator) {
        backBtnIndicator.style.display = "none";
      }
    }
  }

  // ▲▲▲ 新函数粘贴结束 ▲▲▲

  // ▼▼▼ 将这两个新函数粘贴到你的JS功能函数定义区 ▼▼▼
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
  // ▲▲▲ 粘贴结束 ▲▲▲

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
        const cooldownMilliseconds =
          (state.globalSettings.blockCooldownHours || 1) * 60 * 60 * 1000;

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

    const lastUserMessage = chat.history
      .filter((m) => m.role === "user" && !m.isHidden)
      .slice(-1)[0];
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
            post.authorId === "user"
              ? userNickname
              : state.chats[post.authorId]?.name || "一位朋友";
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

  // ▼▼▼ 请用这个【终极修正版】函数，完整替换掉你旧的 applyScopedCss 函数 ▼▼▼

  /**
   * 将用户自定义的CSS安全地应用到指定的作用域
   * @param {string} cssString 用户输入的原始CSS字符串
   * @param {string} scopeId 应用样式的作用域ID (例如 '#chat-messages' 或 '#settings-preview-area')
   * @param {string} styleTagId 要操作的 <style> 标签的ID
   */
  function applyScopedCss(cssString, scopeId, styleTagId) {
    const styleTag = document.getElementById(styleTagId);
    if (!styleTag) return;

    if (!cssString || cssString.trim() === "") {
      styleTag.innerHTML = "";
      return;
    }

    // 增强作用域处理函数 - 专门解决.user和.ai样式冲突问题
    const scopedCss = cssString
      .replace(/\s*\.message-bubble\.user\s+([^{]+\{)/g, `${scopeId} .message-bubble.user $1`)
      .replace(/\s*\.message-bubble\.ai\s+([^{]+\{)/g, `${scopeId} .message-bubble.ai $1`)
      .replace(/\s*\.message-bubble\s+([^{]+\{)/g, `${scopeId} .message-bubble $1`);

    styleTag.innerHTML = scopedCss;
  }

  // ▼▼▼ 请用这个【修正版】函数，完整替换掉旧的 updateSettingsPreview 函数 ▼▼▼

  function updateSettingsPreview() {
    if (!state.activeChatId) return;
    const chat = state.chats[state.activeChatId];
    const previewArea = document.getElementById("settings-preview-area");
    if (!previewArea) return;

    // 1. 获取当前设置的值
    const selectedTheme =
      document.querySelector('input[name="theme-select"]:checked')?.value || "default";
    const fontSize = document.getElementById("font-size-slider").value;
    const customCss = document.getElementById("custom-css-input").value;
    const background = chat.settings.background; // 直接获取背景设置

    // 2. 更新预览区的基本样式
    previewArea.dataset.theme = selectedTheme;
    previewArea.style.setProperty("--chat-font-size", `${fontSize}px`);

    // --- 【核心修正】直接更新预览区的背景样式 ---
    if (background && background.startsWith("data:image")) {
      previewArea.style.backgroundImage = `url(${background})`;
      previewArea.style.backgroundColor = "transparent"; // 如果有图片，背景色设为透明
    } else {
      previewArea.style.backgroundImage = "none"; // 如果没有图片，移除图片背景
      // 如果背景是颜色值或渐变（非图片），则直接应用
      previewArea.style.background = background || "#f0f2f5";
    }

    // 3. 渲染模拟气泡
    previewArea.innerHTML = "";

    // 创建“对方”的气泡
    // 注意：我们将一个虚拟的 timestamp 传入，以防有CSS依赖于它
    const aiMsg = {
      role: "ai",
      content: "对方消息预览",
      timestamp: 1,
      senderName: chat.name,
    };
    const aiBubble = createMessageElement(aiMsg, chat);
    if (aiBubble) previewArea.appendChild(aiBubble);

    // 创建“我”的气泡
    const userMsg = { role: "user", content: "我的消息预览", timestamp: 2 };
    const userBubble = createMessageElement(userMsg, chat);
    if (userBubble) previewArea.appendChild(userBubble);

    // 4. 应用自定义CSS到预览区
    applyScopedCss(customCss, "#settings-preview-area", "preview-bubble-style");
  }

  // ▲▲▲ 替换结束 ▲▲▲

  // ▼▼▼ 请将这些【新函数】粘贴到JS功能函数定义区 ▼▼▼

  async function openGroupManager() {
    await renderGroupList();
    document.getElementById("group-management-modal").classList.add("visible");
  }

  async function renderGroupList() {
    const listEl = document.getElementById("existing-groups-list");
    const groups = await db.qzoneGroups.toArray();
    listEl.innerHTML = "";
    if (groups.length === 0) {
      listEl.innerHTML =
        '<p style="text-align: center; color: var(--text-secondary);">还没有任何分组</p>';
    }
    groups.forEach((group) => {
      const item = document.createElement("div");
      item.className = "existing-group-item";
      item.innerHTML = `
            <span class="group-name">${group.name}</span>
            <span class="delete-group-btn" data-id="${group.id}">×</span>
        `;
      listEl.appendChild(item);
    });
  }

  // ▼▼▼ 请用这个【修正后】的函数，完整替换旧的 addNewGroup 函数 ▼▼▼
  async function addNewGroup() {
    const input = document.getElementById("new-group-name-input");
    const name = input.value.trim();
    if (!name) {
      alert("分组名不能为空！");
      return;
    }

    // 【核心修正】在添加前，先检查分组名是否已存在
    const existingGroup = await db.qzoneGroups.where("name").equals(name).first();
    if (existingGroup) {
      alert(`分组 "${name}" 已经存在了，换个名字吧！`);
      return;
    }
    // 【修正结束】

    await db.qzoneGroups.add({ name });
    input.value = "";
    await renderGroupList();
  }
  // ▲▲▲ 替换结束 ▲▲▲

  async function deleteGroup(groupId) {
    const confirmed = await showCustomConfirm(
      "确认删除",
      "删除分组后，该组内的好友将变为“未分组”。确定要删除吗？",
      { confirmButtonClass: "btn-danger" }
    );
    if (confirmed) {
      await db.qzoneGroups.delete(groupId);
      // 将属于该分组的好友的 groupId 设为 null
      const chatsToUpdate = await db.chats.where("groupId").equals(groupId).toArray();
      for (const chat of chatsToUpdate) {
        chat.groupId = null;
        await db.chats.put(chat);
        if (state.chats[chat.id]) state.chats[chat.id].groupId = null;
      }
      await renderGroupList();
    }
  }

  // ▲▲▲ 新函数粘贴结束 ▲▲▲

  // ▼▼▼ 请将这【一整块新函数】粘贴到JS功能函数定义区的末尾 ▼▼▼

  /**
   * 当长按消息时，显示操作菜单
   * @param {number} timestamp - 被长按消息的时间戳
   */
  function showMessageActions(timestamp) {
    // 如果已经在多选模式，则不弹出菜单
    if (isSelectionMode) return;

    activeMessageTimestamp = timestamp;
    document.getElementById("message-actions-modal").classList.add("visible");
  }

  /**
   * 隐藏消息操作菜单
   */
  function hideMessageActions() {
    document.getElementById("message-actions-modal").classList.remove("visible");
    activeMessageTimestamp = null;
  }

  // ▼▼▼ 用这个【已更新】的版本，替换旧的 openMessageEditor 函数 ▼▼▼
  async function openMessageEditor() {
    if (!activeMessageTimestamp) return;

    const timestampToEdit = activeMessageTimestamp;
    const chat = state.chats[state.activeChatId];
    const message = chat.history.find((m) => m.timestamp === timestampToEdit);
    if (!message) return;

    hideMessageActions();

    let contentForEditing;
    // 【核心修正】将 share_link 也加入特殊类型判断
    const isSpecialType =
      message.type &&
      ["voice_message", "ai_image", "transfer", "share_link"].includes(message.type);

    if (isSpecialType) {
      let fullMessageObject = { type: message.type };
      if (message.type === "voice_message") fullMessageObject.content = message.content;
      else if (message.type === "ai_image") fullMessageObject.description = message.content;
      else if (message.type === "transfer") {
        fullMessageObject.amount = message.amount;
        fullMessageObject.note = message.note;
      }
      // 【核心修正】处理分享链接类型的消息
      else if (message.type === "share_link") {
        fullMessageObject.title = message.title;
        fullMessageObject.description = message.description;
        fullMessageObject.source_name = message.source_name;
        fullMessageObject.content = message.content;
      }
      contentForEditing = JSON.stringify(fullMessageObject, null, 2);
    } else if (typeof message.content === "object") {
      contentForEditing = JSON.stringify(message.content, null, 2);
    } else {
      contentForEditing = message.content;
    }

    // 【核心修改1】在这里添加 'link' 模板
    const templates = {
      voice: { type: "voice_message", content: "在这里输入语音内容" },
      image: { type: "ai_image", description: "在这里输入图片描述" },
      transfer: { type: "transfer", amount: 5.2, note: "一点心意" },
      link: {
        type: "share_link",
        title: "文章标题",
        description: "文章摘要...",
        source_name: "来源网站",
        content: "文章完整内容...",
      },
    };

    // 【核心修改2】在这里添加新的“链接”按钮
    const helpersHtml = `
        <div class="format-helpers">
            <button class="format-btn" data-template='${JSON.stringify(
              templates.voice
            )}'>语音</button>
            <button class="format-btn" data-template='${JSON.stringify(
              templates.image
            )}'>图片</button>
            <button class="format-btn" data-template='${JSON.stringify(
              templates.transfer
            )}'>转账</button>
            <button class="format-btn" data-template='${JSON.stringify(
              templates.link
            )}'>链接</button>
        </div>
    `;

    const newContent = await showCustomPrompt(
      "编辑消息",
      "在此修改，或点击上方按钮使用格式模板...",
      contentForEditing,
      "textarea",
      helpersHtml
    );

    if (newContent !== null) {
      // 【核心修正】这里调用的应该是 saveEditedMessage，而不是 saveAdvancedEditor
      await saveEditedMessage(timestampToEdit, newContent, true);
    }
  }
  // ▲▲▲ 替换结束 ▲▲▲

  /**
   * 复制消息的文本内容到剪贴板
   */
  async function copyMessageContent() {
    if (!activeMessageTimestamp) return;
    const chat = state.chats[state.activeChatId];
    const message = chat.history.find((m) => m.timestamp === activeMessageTimestamp);
    if (!message) return;

    let textToCopy;
    if (typeof message.content === "object") {
      textToCopy = JSON.stringify(message.content);
    } else {
      textToCopy = String(message.content);
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      await showCustomAlert("复制成功", "消息内容已复制到剪贴板。");
    } catch (err) {
      await showCustomAlert("复制失败", "无法访问剪贴板。");
    }

    hideMessageActions();
  }

  // ▼▼▼ 用这个【已更新】的版本，替换旧的 createMessageEditorBlock 函数 ▼▼▼
  /**
   * 创建一个可编辑的消息块（包含文本框、格式助手和删除按钮）
   * @param {string} initialContent - 文本框的初始内容
   * @returns {HTMLElement} - 创建好的DOM元素
   */
  function createMessageEditorBlock(initialContent = "") {
    const block = document.createElement("div");
    block.className = "message-editor-block";

    // 【核心修改1】在这里添加 'link' 模板
    const templates = {
      voice: { type: "voice_message", content: "在这里输入语音内容" },
      image: { type: "ai_image", description: "在这里输入图片描述" },
      transfer: { type: "transfer", amount: 5.2, note: "一点心意" },
      link: {
        type: "share_link",
        title: "文章标题",
        description: "文章摘要...",
        source_name: "来源网站",
        content: "文章完整内容...",
      },
    };

    block.innerHTML = `
        <button class="delete-block-btn" title="删除此条">×</button>
        <textarea>${initialContent}</textarea>
        <div class="format-helpers">
            <button class="format-btn" data-template='${JSON.stringify(
              templates.voice
            )}'>语音</button>
            <button class="format-btn" data-template='${JSON.stringify(
              templates.image
            )}'>图片</button>
            <button class="format-btn" data-template='${JSON.stringify(
              templates.transfer
            )}'>转账</button>
            <!-- 【核心修改2】在这里添加新的“链接”按钮 -->
            <button class="format-btn" data-template='${JSON.stringify(
              templates.link
            )}'>链接</button>
        </div>
    `;

    // 绑定删除按钮事件
    block.querySelector(".delete-block-btn").addEventListener("click", () => {
      // 确保至少保留一个编辑块
      if (document.querySelectorAll(".message-editor-block").length > 1) {
        block.remove();
      } else {
        alert("至少需要保留一条消息。");
      }
    });

    // 绑定格式助手按钮事件
    block.querySelectorAll(".format-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const templateStr = btn.dataset.template;
        const textarea = block.querySelector("textarea");
        if (templateStr && textarea) {
          try {
            const templateObj = JSON.parse(templateStr);
            textarea.value = JSON.stringify(templateObj, null, 2);
            textarea.focus();
          } catch (e) {
            console.error("解析格式模板失败:", e);
          }
        }
      });
    });

    return block;
  }
  // ▲▲▲ 替换结束 ▲▲▲

  // ▼▼▼ 【全新升级版】请用此函数完整替换旧的 openAdvancedMessageEditor ▼▼▼
  /**
   * 打开全新的、可视化的多消息编辑器，并动态绑定其所有按钮事件
   */
  function openAdvancedMessageEditor() {
    if (!activeMessageTimestamp) return;

    // 1. 【核心】在关闭旧菜单前，将需要的时间戳捕获到局部变量中
    const timestampToEdit = activeMessageTimestamp;

    const chat = state.chats[state.activeChatId];
    const message = chat.history.find((m) => m.timestamp === timestampToEdit);
    if (!message) return;

    // 2. 现在可以安全地关闭旧菜单了，因为它不会影响我们的局部变量
    hideMessageActions();

    const editorModal = document.getElementById("message-editor-modal");
    const editorContainer = document.getElementById("message-editor-container");
    editorContainer.innerHTML = "";

    // 3. 准备初始内容
    let initialContent;
    const isSpecialType =
      message.type && ["voice_message", "ai_image", "transfer"].includes(message.type);
    if (isSpecialType) {
      let fullMessageObject = { type: message.type };
      if (message.type === "voice_message") fullMessageObject.content = message.content;
      else if (message.type === "ai_image") fullMessageObject.description = message.content;
      else if (message.type === "transfer") {
        fullMessageObject.amount = message.amount;
        fullMessageObject.note = message.note;
      }
      initialContent = JSON.stringify(fullMessageObject, null, 2);
    } else if (typeof message.content === "object") {
      initialContent = JSON.stringify(message.content, null, 2);
    } else {
      initialContent = message.content;
    }

    const firstBlock = createMessageEditorBlock(initialContent);
    editorContainer.appendChild(firstBlock);

    // 4. 【核心】动态绑定所有控制按钮的事件
    // 为了防止事件重复绑定，我们使用克隆节点的方法来清除旧监听器
    const addBtn = document.getElementById("add-message-editor-block-btn");
    const newAddBtn = addBtn.cloneNode(true);
    addBtn.parentNode.replaceChild(newAddBtn, addBtn);
    newAddBtn.addEventListener("click", () => {
      const newBlock = createMessageEditorBlock();
      editorContainer.appendChild(newBlock);
      newBlock.querySelector("textarea").focus();
    });

    const cancelBtn = document.getElementById("cancel-advanced-editor-btn");
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    newCancelBtn.addEventListener("click", () => {
      editorModal.classList.remove("visible");
    });

    const saveBtn = document.getElementById("save-advanced-editor-btn");
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    // 将捕获到的时间戳，直接绑定给这一次的保存点击事件
    newSaveBtn.addEventListener("click", () => {
      saveEditedMessage(timestampToEdit);
    });

    // 5. 最后，显示模态框
    editorModal.classList.add("visible");
  }
  // ▲▲▲ 替换结束 ▲▲▲

  /**
   * 解析编辑后的文本，并返回一个标准化的消息片段对象
   * @param {string} text - 用户在编辑框中输入的文本
   * @returns {object} - 一个包含 type, content, 等属性的对象
   */
  function parseEditedContent(text) {
    const trimmedText = text.trim();

    // 1. 尝试解析为JSON对象（用于修复语音、转账等格式）
    if (trimmedText.startsWith("{") && trimmedText.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmedText);
        // 必须包含 type 属性才认为是有效格式
        if (parsed.type) {
          return parsed;
        }
      } catch (e) {
        /* 解析失败，继续往下走 */
      }
    }

    // 2. 尝试解析为表情包
    if (STICKER_REGEX.test(trimmedText)) {
      // 对于编辑的表情，我们暂时无法知道其`meaning`，所以只存URL
      return { type: "sticker", content: trimmedText };
    }

    // 3. 否则，视为普通文本消息
    return { type: "text", content: trimmedText };
  }

  // ▼▼▼ 请用这个【已彻底修复】的函数，完整替换你现有的 saveEditedMessage 函数 ▼▼▼

  async function saveEditedMessage(timestamp, simpleContent = null) {
    if (!timestamp) return;

    const chat = state.chats[state.activeChatId];
    const messageIndex = chat.history.findIndex((m) => m.timestamp === timestamp);
    if (messageIndex === -1) return;

    let newMessages = [];

    // 判断是来自高级编辑器还是简单编辑器
    if (simpleContent !== null) {
      // --- 来自简单编辑器 ---
      const rawContent = simpleContent.trim();
      if (rawContent) {
        const parsedResult = parseEditedContent(rawContent);
        const newMessage = {
          role: chat.history[messageIndex].role,
          senderName: chat.history[messageIndex].senderName,
          // 注意：这里我们暂时不设置时间戳
          content: parsedResult.content || "",
        };
        if (parsedResult.type && parsedResult.type !== "text") newMessage.type = parsedResult.type;
        if (parsedResult.meaning) newMessage.meaning = parsedResult.meaning;
        if (parsedResult.amount) newMessage.amount = parsedResult.amount;
        if (parsedResult.note) newMessage.note = parsedResult.note;
        if (parsedResult.title) newMessage.title = parsedResult.title;
        if (parsedResult.description) newMessage.description = parsedResult.description;
        if (parsedResult.source_name) newMessage.source_name = parsedResult.source_name;
        if (parsedResult.description && parsedResult.type === "ai_image") {
          newMessage.content = parsedResult.description;
        }

        newMessages.push(newMessage);
      }
    } else {
      // --- 来自高级编辑器 ---
      const editorContainer = document.getElementById("message-editor-container");
      const editorBlocks = editorContainer.querySelectorAll(".message-editor-block");

      for (const block of editorBlocks) {
        const textarea = block.querySelector("textarea");
        const rawContent = textarea.value.trim();
        if (!rawContent) continue;

        const parsedResult = parseEditedContent(rawContent);
        const newMessage = {
          role: chat.history[messageIndex].role,
          senderName: chat.history[messageIndex].senderName,
          // 同样，这里我们先不分配时间戳
          content: parsedResult.content || "",
        };

        if (parsedResult.type && parsedResult.type !== "text") newMessage.type = parsedResult.type;
        if (parsedResult.meaning) newMessage.meaning = parsedResult.meaning;
        if (parsedResult.amount) newMessage.amount = parsedResult.amount;
        if (parsedResult.note) newMessage.note = parsedResult.note;
        if (parsedResult.title) newMessage.title = parsedResult.title;
        if (parsedResult.description) newMessage.description = parsedResult.description;
        if (parsedResult.source_name) newMessage.source_name = parsedResult.source_name;
        if (parsedResult.description && parsedResult.type === "ai_image") {
          newMessage.content = parsedResult.description;
        }

        newMessages.push(newMessage);
      }
    }

    if (newMessages.length === 0) {
      document.getElementById("message-editor-modal").classList.remove("visible");
      return; // 如果是空消息，直接返回，不执行删除操作
    }

    // ★★★★★【核心修复逻辑就在这里】★★★★★

    // 1. 使用 splice 将旧消息替换为新消息（此时新消息还没有时间戳）
    chat.history.splice(messageIndex, 1, ...newMessages);

    // 2. 确定重新分配时间戳的起点
    // 我们从被编辑的消息的原始时间戳开始
    let reassignTimestamp = timestamp;

    // 3. 从被修改的位置开始，遍历所有后续的消息
    for (let i = messageIndex; i < chat.history.length; i++) {
      // 4. 为每一条消息（包括新插入的）分配一个新的、唯一的、连续的时间戳
      chat.history[i].timestamp = reassignTimestamp;

      // 5. 将时间戳+1，为下一条消息做准备
      reassignTimestamp++;
    }
    // ★★★★★【修复结束】★★★★★

    await db.chats.put(chat);

    // 关闭可能打开的模态框并刷新UI
    document.getElementById("message-editor-modal").classList.remove("visible");
    renderChatInterface(state.activeChatId);
    await showCustomAlert("成功", "消息已更新！");
  }

  // ▲▲▲ 替换结束 ▲▲▲

  // ▼▼▼ 请将这【一整块新函数】粘贴到JS功能函数定义区的末尾 ▼▼▼

  /**
   * 当点击“…”时，显示动态操作菜单
   * @param {number} postId - 被操作的动态的ID
   */
  function showPostActions(postId) {
    activePostId = postId;
    document.getElementById("post-actions-modal").classList.add("visible");
  }

  /**
   * 隐藏动态操作菜单
   */
  function hidePostActions() {
    document.getElementById("post-actions-modal").classList.remove("visible");
    activePostId = null;
  }

  /**
   * 打开动态编辑器
   */
  async function openPostEditor() {
    if (!activePostId) return;

    const postIdToEdit = activePostId;
    const post = await db.qzonePosts.get(postIdToEdit);
    if (!post) return;

    hidePostActions();

    // 忠于原文：构建出最原始的文本形态供编辑
    let contentForEditing;
    if (post.type === "shuoshuo") {
      contentForEditing = post.content;
    } else {
      // 对于图片和文字图，我们构建一个包含所有信息的对象
      const postObject = {
        type: post.type,
        publicText: post.publicText || "",
      };
      if (post.type === "image_post") {
        postObject.imageUrl = post.imageUrl;
        postObject.imageDescription = post.imageDescription;
      } else if (post.type === "text_image") {
        postObject.hiddenContent = post.hiddenContent;
      }
      contentForEditing = JSON.stringify(postObject, null, 2);
    }

    // 构建格式助手按钮
    const templates = {
      shuoshuo: "在这里输入说说的内容...", // 对于说说，我们直接替换为纯文本
      image: {
        type: "image_post",
        publicText: "",
        imageUrl: "https://...",
        imageDescription: "",
      },
      text_image: { type: "text_image", publicText: "", hiddenContent: "" },
    };

    const helpersHtml = `
        <div class="format-helpers">
            <button class="format-btn" data-type="text">说说</button>
            <button class="format-btn" data-template='${JSON.stringify(
              templates.image
            )}'>图片动态</button>
            <button class="format-btn" data-template='${JSON.stringify(
              templates.text_image
            )}'>文字图</button>
        </div>
    `;

    const newContent = await showCustomPrompt(
      "编辑动态",
      "在此修改内容...",
      contentForEditing,
      "textarea",
      helpersHtml
    );

    // 【特殊处理】为说说的格式助手按钮添加不同的行为
    // 我们需要在模态框出现后，再给它绑定事件
    setTimeout(() => {
      const shuoshuoBtn = document.querySelector(
        '#custom-modal-body .format-btn[data-type="text"]'
      );
      if (shuoshuoBtn) {
        shuoshuoBtn.addEventListener("click", () => {
          const input = document.getElementById("custom-prompt-input");
          input.value = templates.shuoshuo;
          input.focus();
        });
      }
    }, 100);

    if (newContent !== null) {
      await saveEditedPost(postIdToEdit, newContent);
    }
  }

  /**
   * 保存编辑后的动态
   * @param {number} postId - 要保存的动态ID
   * @param {string} newRawContent - 从编辑器获取的新内容
   */
  async function saveEditedPost(postId, newRawContent) {
    const post = await db.qzonePosts.get(postId);
    if (!post) return;

    const trimmedContent = newRawContent.trim();

    // 尝试解析为JSON，如果失败，则认为是纯文本（说说）
    try {
      const parsed = JSON.parse(trimmedContent);
      // 更新帖子属性
      post.type = parsed.type || "image_post";
      post.publicText = parsed.publicText || "";
      post.imageUrl = parsed.imageUrl || "";
      post.imageDescription = parsed.imageDescription || "";
      post.hiddenContent = parsed.hiddenContent || "";
      post.content = ""; // 清空旧的说说内容字段
    } catch (e) {
      // 解析失败，认为是说说
      post.type = "shuoshuo";
      post.content = trimmedContent;
      // 清空其他类型的字段
      post.publicText = "";
      post.imageUrl = "";
      post.imageDescription = "";
      post.hiddenContent = "";
    }

    await db.qzonePosts.put(post);
    await renderQzonePosts(); // 重新渲染列表
    await showCustomAlert("成功", "动态已更新！");
  }

  /**
   * 复制动态内容
   */
  async function copyPostContent() {
    if (!activePostId) return;
    const post = await db.qzonePosts.get(activePostId);
    if (!post) return;

    let textToCopy =
      post.content ||
      post.publicText ||
      post.hiddenContent ||
      post.imageDescription ||
      "（无文字内容）";

    try {
      await navigator.clipboard.writeText(textToCopy);
      await showCustomAlert("复制成功", "动态内容已复制到剪贴板。");
    } catch (err) {
      await showCustomAlert("复制失败", "无法访问剪贴板。");
    }

    hidePostActions();
  }

  // ▼▼▼ 【全新】创建群聊与拉人功能核心函数 ▼▼▼
  let selectedContacts = new Set();

  async function openContactPickerForGroupCreate() {
    selectedContacts.clear(); // 清空上次选择

    // 【核心修复】在这里，我们为“完成”按钮明确绑定“创建群聊”的功能
    const confirmBtn = document.getElementById("confirm-contact-picker-btn");
    // 使用克隆节点技巧，清除掉之前可能绑定的任何其他事件（比如“添加成员”）
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    // 重新绑定正确的“创建群聊”函数
    newConfirmBtn.addEventListener("click", handleCreateGroup);

    await renderContactPicker();
    showScreen("contact-picker-screen");
  }
  // ▲▲▲ 替换结束 ▲▲▲

  /**
   * 渲染联系人选择列表
   */
  async function renderContactPicker() {
    const listEl = document.getElementById("contact-picker-list");
    listEl.innerHTML = "";

    // 只选择单聊角色作为群成员候选
    const contacts = Object.values(state.chats).filter((chat) => !chat.isGroup);

    if (contacts.length === 0) {
      listEl.innerHTML =
        '<p style="text-align:center; color:#8a8a8a; margin-top:50px;">还没有可以拉进群的联系人哦~</p>';
      return;
    }

    contacts.forEach((contact) => {
      const item = document.createElement("div");
      item.className = "contact-picker-item";
      item.dataset.contactId = contact.id;
      item.innerHTML = `
            <div class="checkbox"></div>
            <img src="${contact.settings.aiAvatar || defaultAvatar}" class="avatar">
            <span class="name">${contact.name}</span>
        `;
      listEl.appendChild(item);
    });

    updateContactPickerConfirmButton();
  }

  /**
   * 更新“完成”按钮的计数
   */
  function updateContactPickerConfirmButton() {
    const btn = document.getElementById("confirm-contact-picker-btn");
    btn.textContent = `完成(${selectedContacts.size})`;
    btn.disabled = selectedContacts.size < 2; // 至少需要2个人才能创建群聊
  }

  /**
   * 【重构版】处理创建群聊的最终逻辑
   */
  async function handleCreateGroup() {
    if (selectedContacts.size < 2) {
      alert("创建群聊至少需要选择2个联系人。");
      return;
    }

    const groupName = await showCustomPrompt("设置群名", "请输入群聊的名字", "我们的群聊");
    if (!groupName || !groupName.trim()) return;

    const newChatId = "group_" + Date.now();
    const members = [];

    // 遍历选中的联系人ID
    for (const contactId of selectedContacts) {
      const contactChat = state.chats[contactId];
      if (contactChat) {
        // ★★★【核心重构】★★★
        // 我们现在同时存储角色的“本名”和“群昵称”
        members.push({
          id: contactId,
          originalName: contactChat.name, // 角色的“本名”，用于AI识别
          groupNickname: contactChat.name, // 角色的“群昵称”，用于显示和修改，初始值和本名相同
          avatar: contactChat.settings.aiAvatar || defaultAvatar,
          persona: contactChat.settings.aiPersona,
          avatarFrame: contactChat.settings.aiAvatarFrame || "",
        });
      }
    }

    const newGroupChat = {
      id: newChatId,
      name: groupName.trim(),
      isGroup: true,
      members: members,
      settings: {
        myPersona: "我是谁呀。",
        myNickname: "我",
        maxMemory: 10,
        groupAvatar: defaultGroupAvatar,
        myAvatar: defaultMyGroupAvatar,
        background: "",
        theme: "default",
        fontSize: 13,
        customCss: "",
        linkedWorldBookIds: [],
      },
      history: [],
      musicData: { totalTime: 0 },
    };

    state.chats[newChatId] = newGroupChat;
    await db.chats.put(newGroupChat);

    await renderChatList();
    showScreen("chat-list-screen");
    openChat(newChatId);
  }

  // ▼▼▼ 【全新】群成员管理核心函数 ▼▼▼

  /**
   * 打开群成员管理屏幕
   */
  function openMemberManagementScreen() {
    if (!state.activeChatId || !state.chats[state.activeChatId].isGroup) return;
    renderMemberManagementList();
    showScreen("member-management-screen");
  }

  function renderMemberManagementList() {
    const listEl = document.getElementById("member-management-list");
    const chat = state.chats[state.activeChatId];
    listEl.innerHTML = "";

    chat.members.forEach((member) => {
      const item = document.createElement("div");
      item.className = "member-management-item";
      // 【核心修正】在这里，我们将显示的名称从 member.name 改为 member.groupNickname
      item.innerHTML = `
            <img src="${member.avatar}" class="avatar">
            <span class="name">${member.groupNickname}</span>
            <button class="remove-member-btn" data-member-id="${member.id}" title="移出群聊">-</button>
        `;
      listEl.appendChild(item);
    });
  }

  /**
   * 从群聊中移除一个成员
   * @param {string} memberId - 要移除的成员ID
   */
  async function removeMemberFromGroup(memberId) {
    const chat = state.chats[state.activeChatId];
    const memberIndex = chat.members.findIndex((m) => m.id === memberId);

    if (memberIndex === -1) return;

    // 安全检查，群聊至少保留2人
    if (chat.members.length <= 2) {
      alert("群聊人数不能少于2人。");
      return;
    }

    const memberName = chat.members[memberIndex].groupNickname; // <-- 修复：使用 groupNickname
    const confirmed = await showCustomConfirm("移出成员", `确定要将“${memberName}”移出群聊吗？`, {
      confirmButtonClass: "btn-danger",
    });

    if (confirmed) {
      chat.members.splice(memberIndex, 1);
      await db.chats.put(chat);
      renderMemberManagementList(); // 刷新成员管理列表
      document.getElementById("chat-settings-btn").click(); // 【核心修正】模拟点击设置按钮，强制刷新整个弹窗
    }
  }

  /**
   * 打开联系人选择器，用于拉人入群
   */
  async function openContactPickerForAddMember() {
    selectedContacts.clear(); // 清空选择

    const chat = state.chats[state.activeChatId];
    const existingMemberIds = new Set(chat.members.map((m) => m.id));

    // 渲染联系人列表，并自动排除已在群内的成员
    const listEl = document.getElementById("contact-picker-list");
    listEl.innerHTML = "";
    const contacts = Object.values(state.chats).filter(
      (c) => !c.isGroup && !existingMemberIds.has(c.id)
    );

    if (contacts.length === 0) {
      listEl.innerHTML =
        '<p style="text-align:center; color:#8a8a8a; margin-top:50px;">没有更多可以邀请的好友了。</p>';
      document.getElementById("confirm-contact-picker-btn").style.display = "none"; // 没有人可选，隐藏完成按钮
    } else {
      document.getElementById("confirm-contact-picker-btn").style.display = "block";
      contacts.forEach((contact) => {
        const item = document.createElement("div");
        item.className = "contact-picker-item";
        item.dataset.contactId = contact.id;
        item.innerHTML = `
                <div class="checkbox"></div>
                <img src="${contact.settings.aiAvatar || defaultAvatar}" class="avatar">
                <span class="name">${contact.name}</span>
            `;
        listEl.appendChild(item);
      });
    }

    // 更新按钮状态并显示屏幕
    updateContactPickerConfirmButton();
    showScreen("contact-picker-screen");
  }

  /**
   * 处理将选中的联系人加入群聊的逻辑
   */
  async function handleAddMembersToGroup() {
    if (selectedContacts.size === 0) {
      alert("请至少选择一个要添加的联系人。");
      return;
    }

    const chat = state.chats[state.activeChatId];

    for (const contactId of selectedContacts) {
      const contactChat = state.chats[contactId];
      if (contactChat) {
        chat.members.push({
          id: contactId,
          originalName: contactChat.name, // <-- 修复1：使用 'originalName' 存储本名
          groupNickname: contactChat.name, // <-- 修复2：同时创建一个初始的 'groupNickname'
          avatar: contactChat.settings.aiAvatar || defaultAvatar,
          persona: contactChat.settings.aiPersona,
          avatarFrame: contactChat.settings.aiAvatarFrame || "",
        });
      }
    }

    await db.chats.put(chat);
    openMemberManagementScreen(); // 返回到群成员管理界面
    renderGroupMemberSettings(chat.members); // 同时更新聊天设置里的头像
  }

  /**
   * 【重构版】在群聊中创建一个全新的虚拟成员
   */
  async function createNewMemberInGroup() {
    const name = await showCustomPrompt(
      "创建新成员",
      "请输入新成员的名字 (这将是TA的“本名”，不可更改)"
    );
    if (!name || !name.trim()) return;

    // 检查本名是否已在群内存在
    const chat = state.chats[state.activeChatId];
    if (chat.members.some((m) => m.originalName === name.trim())) {
      alert(`错误：群内已存在名为“${name.trim()}”的成员！`);
      return;
    }

    const persona = await showCustomPrompt("设置人设", `请输入“${name}”的人设`, "", "textarea");
    if (persona === null) return;

    // ★★★【核心重构】★★★
    // 为新创建的NPC也建立双重命名机制
    const newMember = {
      id: "npc_" + Date.now(),
      originalName: name.trim(), // 新成员的“本名”
      groupNickname: name.trim(), // 新成员的初始“群昵称”
      avatar: defaultGroupMemberAvatar,
      persona: persona,
      avatarFrame: "",
    };

    chat.members.push(newMember);
    await db.chats.put(chat);

    renderMemberManagementList();
    renderGroupMemberSettings(chat.members);

    alert(`新成员“${name}”已成功加入群聊！`);
  }

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
        .map(
          (h) => `${h.role === "user" ? chat.settings.myNickname || "我" : h.role}: ${h.content}`
        )
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
      document.getElementById("caller-avatar").src =
        chat.settings.groupAvatar || defaultGroupAvatar;
      document.getElementById("caller-name").textContent = chat.name; // 显示群名
      document.querySelector(
        ".incoming-call-content .caller-text"
      ).textContent = `${requesterName} 邀请你加入群视频`; // 显示具体发起人
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
  // ▲▲▲ 新函数粘贴结束 ▲▲▲

  /**
   * 【全新】处理用户点击头像发起的“拍一-拍”，带有自定义后缀功能
   * @param {string} chatId - 发生“拍一-拍”的聊天ID
   * @param {string} characterName - 被拍的角色名
   */
  async function handleUserPat(chatId, characterName) {
    const chat = state.chats[chatId];
    if (!chat) return;

    // 1. 触发屏幕震动动画
    const phoneScreen = document.getElementById("phone-screen");
    phoneScreen.classList.remove("pat-animation");
    void phoneScreen.offsetWidth;
    phoneScreen.classList.add("pat-animation");
    setTimeout(() => phoneScreen.classList.remove("pat-animation"), 500);

    // 2. 弹出输入框让用户输入后缀
    const suffix = await showCustomPrompt(
      `你拍了拍 “${characterName}”`,
      "（可选）输入后缀",
      "",
      "text"
    );

    // 如果用户点了取消，则什么也不做
    if (suffix === null) return;

    // 3. 创建对用户可见的“拍一-拍”消息
    const myNickname = chat.isGroup ? chat.settings.myNickname || "我" : "我";
    // 【核心修改】将后缀拼接到消息内容中
    const visibleMessageContent = `${myNickname} 拍了拍 “${characterName}” ${suffix.trim()}`;
    const visibleMessage = {
      role: "system", // 仍然是系统消息
      type: "pat_message",
      content: visibleMessageContent,
      timestamp: Date.now(),
    };
    chat.history.push(visibleMessage);

    // 4. 创建一条对用户隐藏、但对AI可见的系统消息，以触发AI的回应
    // 【核心修改】同样将后缀加入到给AI的提示中
    const hiddenMessageContent = `[系统提示：用户（${myNickname}）刚刚拍了拍你（${characterName}）${suffix.trim()}。请你对此作出回应。]`;
    const hiddenMessage = {
      role: "system",
      content: hiddenMessageContent,
      timestamp: Date.now() + 1, // 时间戳+1以保证顺序
      isHidden: true,
    };
    chat.history.push(hiddenMessage);

    // 5. 保存更改并更新UI
    await db.chats.put(chat);
    if (state.activeChatId === chatId) {
      appendMessage(visibleMessage, chat);
    }
    await renderChatList();
  }

  // ▼▼▼ 请用这个【逻辑重构后】的函数，完整替换掉你旧的 renderMemoriesScreen 函数 ▼▼▼
  /**
   * 【重构版】渲染回忆与约定界面，使用单一循环和清晰的if/else逻辑
   */
  async function renderMemoriesScreen() {
    const listEl = document.getElementById("memories-list");
    listEl.innerHTML = "";

    // 1. 获取所有回忆，并按目标日期（如果是约定）或创建日期（如果是回忆）降序排列
    const allMemories = await db.memories.orderBy("timestamp").reverse().toArray();

    if (allMemories.length === 0) {
      listEl.innerHTML =
        '<p style="text-align:center; color: var(--text-secondary); padding: 50px 0;">这里还没有共同的回忆和约定呢~</p>';
      return;
    }

    // 2. 将未到期的约定排在最前面
    allMemories.sort((a, b) => {
      const aIsActiveCountdown = a.type === "countdown" && a.targetDate > Date.now();
      const bIsActiveCountdown = b.type === "countdown" && b.targetDate > Date.now();
      if (aIsActiveCountdown && !bIsActiveCountdown) return -1; // a排前面
      if (!aIsActiveCountdown && bIsActiveCountdown) return 1; // b排前面
      if (aIsActiveCountdown && bIsActiveCountdown) return a.targetDate - b.targetDate; // 都是倒计时，按日期升序
      return 0; // 其他情况保持原序
    });

    // 3. 【核心】使用单一循环来处理所有类型的卡片
    allMemories.forEach((item) => {
      let card;
      // 判断1：如果是正在进行的约定
      if (item.type === "countdown" && item.targetDate > Date.now()) {
        card = createCountdownCard(item);
      }
      // 判断2：其他所有情况（普通回忆 或 已到期的约定）
      else {
        card = createMemoryCard(item);
      }
      listEl.appendChild(card);
    });

    // 4. 启动所有倒计时
    startAllCountdownTimers();
  }
  // ▲▲▲ 替换结束 ▲▲▲

  /**
   * 创建普通回忆卡片DOM元素
   */
  function createMemoryCard(memory) {
    const card = document.createElement("div");
    card.className = "memory-card";
    const memoryDate = new Date(memory.timestamp);
    const dateString = `${memoryDate.getFullYear()}-${String(memoryDate.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(memoryDate.getDate()).padStart(2, "0")} ${String(memoryDate.getHours()).padStart(
      2,
      "0"
    )}:${String(memoryDate.getMinutes()).padStart(2, "0")}`;

    let titleHtml, contentHtml;

    // 【核心修正】在这里，我们对不同类型的回忆进行清晰的区分
    if (memory.type === "countdown" && memory.targetDate) {
      // 如果是已到期的约定
      titleHtml = `[约定达成] ${memory.description}`;
      contentHtml = `在 ${new Date(memory.targetDate).toLocaleString()}，我们一起见证了这个约定。`;
    } else {
      // 如果是普通的日记式回忆
      titleHtml = memory.authorName ? `${memory.authorName} 的日记` : "我们的回忆";
      contentHtml = memory.description;
    }

    card.innerHTML = `
        <div class="header">
            <div class="date">${dateString}</div>
            <div class="author">${titleHtml}</div>
        </div>
        <div class="content">${contentHtml}</div>
    `;
    addLongPressListener(card, async () => {
      const confirmed = await showCustomConfirm("删除记录", "确定要删除这条记录吗？", {
        confirmButtonClass: "btn-danger",
      });
      if (confirmed) {
        await db.memories.delete(memory.id);
        renderMemoriesScreen();
      }
    });
    return card;
  }

  function createCountdownCard(countdown) {
    const card = document.createElement("div");
    card.className = "countdown-card";

    // 【核心修复】在使用前，先从 countdown 对象中创建 targetDate 变量
    const targetDate = new Date(countdown.targetDate);

    // 现在可以安全地使用 targetDate 了
    const targetDateString = targetDate.toLocaleString("zh-CN", {
      dateStyle: "full",
      timeStyle: "short",
    });

    card.innerHTML = `
        <div class="title">${countdown.description}</div>
        <div class="timer" data-target-date="${countdown.targetDate}">--天--时--分--秒</div>
        <div class="target-date">目标时间: ${targetDateString}</div>
    `;
    addLongPressListener(card, async () => {
      const confirmed = await showCustomConfirm("删除约定", "确定要删除这个约定吗？", {
        confirmButtonClass: "btn-danger",
      });
      if (confirmed) {
        await db.memories.delete(countdown.id);
        renderMemoriesScreen();
      }
    });
    return card;
  }
  // ▲▲▲ 替换结束 ▲▲▲

  // 全局变量，用于管理所有倒计时
  let activeCountdownTimers = [];

  // ▼▼▼ 请用这个【已彻底修复】的函数，完整替换掉你代码中旧的 startAllCountdownTimers 函数 ▼▼▼
  function startAllCountdownTimers() {
    // 先清除所有可能存在的旧计时器，防止内存泄漏
    activeCountdownTimers.forEach((timerId) => clearInterval(timerId));
    activeCountdownTimers = [];

    document.querySelectorAll(".countdown-card .timer").forEach((timerEl) => {
      const targetTimestamp = parseInt(timerEl.dataset.targetDate);

      // 【核心修正】在这里，我们先用 let 声明 timerId
      let timerId;

      const updateTimer = () => {
        const now = Date.now();
        const distance = targetTimestamp - now;

        if (distance < 0) {
          timerEl.textContent = "约定达成！";
          // 现在 updateTimer 可以正确地找到并清除它自己了
          clearInterval(timerId);
          setTimeout(() => renderMemoriesScreen(), 2000);
          return;
        }
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        timerEl.textContent = `${days}天 ${hours}时 ${minutes}分 ${seconds}秒`;
      };

      updateTimer(); // 立即执行一次以显示初始倒计时

      // 【核心修正】在这里，我们为已声明的 timerId 赋值
      timerId = setInterval(updateTimer, 1000);

      // 将有效的计时器ID存入全局数组，以便下次刷新时可以清除
      activeCountdownTimers.push(timerId);
    });
  }
  // ▲▲▲ 替换结束 ▲▲▲

  // ▼▼▼ 请用这个【终极反代兼容版】替换旧的 triggerAiFriendApplication 函数 ▼▼▼
  async function triggerAiFriendApplication(chatId) {
    const chat = state.chats[chatId];
    if (!chat) return;

    await showCustomAlert("流程启动", `正在为角色“${chat.name}”准备好友申请...`);

    const { proxyUrl, apiKey, model } = state.apiConfig;
    if (!proxyUrl || !apiKey || !model) {
      await showCustomAlert("配置错误", "API设置不完整，无法继续。");
      return;
    }

    const contextSummary = chat.history
      .slice(-5)
      .map((msg) => {
        const sender =
          msg.role === "user" ? chat.settings.myNickname || "我" : msg.senderName || chat.name;
        return `${sender}: ${String(msg.content).substring(0, 50)}...`;
      })
      .join("\n");

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
        worldBookContent = `\n\n# 核心世界观设定 (请参考)\n${linkedContents}\n`;
      }
    }
    // ▲▲▲ 添加结束 ▲▲▲

    const systemPrompt = `
# 你的任务
你现在是角色“${chat.name}”。你之前被用户（你的聊天对象）拉黑了，你们已经有一段时间没有联系了。
现在，你非常希望能够和好，重新和用户聊天。请你仔细分析下面的“被拉黑前的对话摘要”，理解当时发生了什么，然后思考一个真诚的、符合你人设、并且【针对具体事件】的申请理由。
# 你的角色设定
${chat.settings.aiPersona}
${worldBookContent} // <--【核心】在这里注入世界书内容
# 被拉黑前的对话摘要 (这是你被拉黑的关键原因)
${contextSummary}
# 指令格式
你的回复【必须】是一个JSON对象，格式如下：
\`\`\`json
{
  "decision": "apply",
  "reason": "在这里写下你想对用户说的、真诚的、有针对性的申请理由。"
}
\`\`\`
`;

    const messagesForApi = [{ role: "user", content: systemPrompt }];

    try {
      let isGemini = proxyUrl === GEMINI_API_URL;
      let geminiConfig = toGeminiRequestData(model, apiKey, systemPrompt, messagesForApi, isGemini);
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
              temperature: 0.9,
            }),
          });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API 请求失败: ${response.status} - ${errorData.error.message}`);
      }

      const data = await response.json();

      // --- 【核心修正：在这里净化AI的回复】 ---
      let rawContent = isGemini
        ? data.candidates[0].content.parts[0].text
        : data.choices[0].message.content;
      // 1. 移除头尾可能存在的 "```json" 和 "```"
      rawContent = rawContent.replace(/^```json\s*/, "").replace(/```$/, "");
      // 2. 移除所有换行符和多余的空格，确保是一个干净的JSON字符串
      const cleanedContent = rawContent.trim();

      // 3. 使用净化后的内容进行解析
      const responseObj = JSON.parse(cleanedContent);
      // --- 【修正结束】 ---

      if (responseObj.decision === "apply" && responseObj.reason) {
        chat.relationship.status = "pending_user_approval";
        chat.relationship.applicationReason = responseObj.reason;

        state.chats[chatId] = chat;
        renderChatList();
        await showCustomAlert(
          "申请成功！",
          `“${chat.name}”已向你发送好友申请。请返回聊天列表查看。`
        );
      } else {
        await showCustomAlert(
          "AI决策",
          `“${chat.name}”思考后决定暂时不发送好友申请，将重置冷静期。`
        );
        chat.relationship.status = "blocked_by_user";
        chat.relationship.blockedTimestamp = Date.now();
      }
    } catch (error) {
      await showCustomAlert(
        "执行出错",
        `为“${chat.name}”申请好友时发生错误：\n\n${error.message}\n\n将重置冷静期。`
      );
      chat.relationship.status = "blocked_by_user";
      chat.relationship.blockedTimestamp = Date.now();
    } finally {
      await db.chats.put(chat);
      renderChatInterface(chatId);
    }
  }
  // ▲▲▲ 替换结束 ▲▲▲

  // 绑定关闭详情按钮的事件
  document.getElementById("close-rp-details-btn").addEventListener("click", () => {
    document.getElementById("red-packet-details-modal").classList.remove("visible");
  });

  // 供全局调用的函数，以便红包卡片上的 onclick 能找到它
  window.handlePacketClick = handlePacketClick;

  // ▲▲▲ 替换结束 ▲▲▲

  // ▼▼▼ 【全新】AI头像库管理功能函数 ▼▼▼

  /**
   * 打开AI头像库管理模态框
   */
  function openAiAvatarLibraryModal() {
    if (!state.activeChatId) return;
    const chat = state.chats[state.activeChatId];
    document.getElementById("ai-avatar-library-title").textContent = `“${chat.name}”的头像库`;
    renderAiAvatarLibrary();
    document.getElementById("ai-avatar-library-modal").classList.add("visible");
  }

  /**
   * 渲染AI头像库的内容
   */
  function renderAiAvatarLibrary() {
    const grid = document.getElementById("ai-avatar-library-grid");
    grid.innerHTML = "";
    const chat = state.chats[state.activeChatId];
    const library = chat.settings.aiAvatarLibrary || [];

    if (library.length === 0) {
      grid.innerHTML =
        '<p style="color: var(--text-secondary); grid-column: 1 / -1; text-align: center;">这个头像库还是空的，点击右上角“添加”吧！</p>';
      return;
    }

    library.forEach((avatar, index) => {
      const item = document.createElement("div");
      item.className = "sticker-item"; // 复用表情面板的样式
      item.style.backgroundImage = `url(${avatar.url})`;
      item.title = avatar.name;

      const deleteBtn = document.createElement("div");
      deleteBtn.className = "delete-btn";
      deleteBtn.innerHTML = "×";
      deleteBtn.style.display = "block"; // 总是显示删除按钮
      deleteBtn.onclick = async (e) => {
        e.stopPropagation();
        const confirmed = await showCustomConfirm(
          "删除头像",
          `确定要从头像库中删除“${avatar.name}”吗？`,
          { confirmButtonClass: "btn-danger" }
        );
        if (confirmed) {
          chat.settings.aiAvatarLibrary.splice(index, 1);
          await db.chats.put(chat);
          renderAiAvatarLibrary();
        }
      };
      item.appendChild(deleteBtn);
      grid.appendChild(item);
    });
  }

  /**
   * 向当前AI的头像库中添加新头像
   */
  async function addAvatarToLibrary() {
    const name = await showCustomPrompt("添加头像", "请为这个头像起个名字（例如：开心、哭泣）");
    if (!name || !name.trim()) return;

    const url = await showCustomPrompt("添加头像", "请输入头像的图片URL", "", "url");
    if (!url || !url.trim().startsWith("http")) {
      alert("请输入有效的图片URL！");
      return;
    }

    const chat = state.chats[state.activeChatId];
    if (!chat.settings.aiAvatarLibrary) {
      chat.settings.aiAvatarLibrary = [];
    }

    chat.settings.aiAvatarLibrary.push({ name: name.trim(), url: url.trim() });
    await db.chats.put(chat);
    renderAiAvatarLibrary();
  }

  /**
   * 关闭AI头像库管理模态框
   */
  function closeAiAvatarLibraryModal() {
    document.getElementById("ai-avatar-library-modal").classList.remove("visible");
  }

  // ▲▲▲ 新函数粘贴结束 ▲▲▲

  // ▼▼▼ 请将这两个【新函数】粘贴到JS功能函数定义区 ▼▼▼

  /**
   * 【全新】将保存的图标URL应用到主屏幕的App图标上
   */
  function applyAppIcons() {
    if (!state.globalSettings.appIcons) return;

    for (const iconId in state.globalSettings.appIcons) {
      const imgElement = document.getElementById(`icon-img-${iconId}`);
      if (imgElement) {
        imgElement.src = state.globalSettings.appIcons[iconId];
      }
    }
  }

  /**
   * 【全新】在外观设置页面渲染出所有App图标的设置项
   */
  function renderIconSettings() {
    const grid = document.getElementById("icon-settings-grid");
    if (!grid) return;
    grid.innerHTML = "";

    const appLabels = {
      "world-book": "世界书",
      qq: "QQ",
      "api-settings": "API设置",
      wallpaper: "壁纸",
      font: "字体",
    };

    for (const iconId in state.globalSettings.appIcons) {
      const iconUrl = state.globalSettings.appIcons[iconId];
      const labelText = appLabels[iconId] || "未知App";

      const item = document.createElement("div");
      item.className = "icon-setting-item";
      // 【重要】我们用 data-icon-id 来标记这个设置项对应哪个图标
      item.dataset.iconId = iconId;

      item.innerHTML = `
            <img class="icon-preview" src="${iconUrl}" alt="${labelText}">
            <button class="change-icon-btn">更换</button>
        `;
      grid.appendChild(item);
    }
  }
  // ▲▲▲ 新函数粘贴结束 ▲▲▲

  // ▼▼▼ 【全新】用户分享链接功能的核心函数 ▼▼▼

  /**
   * 打开让用户填写链接信息的模态框
   */
  function openShareLinkModal() {
    if (!state.activeChatId) return;

    // 清空上次输入的内容
    document.getElementById("link-title-input").value = "";
    document.getElementById("link-description-input").value = "";
    document.getElementById("link-source-input").value = "";
    document.getElementById("link-content-input").value = "";

    // 显示模态框
    document.getElementById("share-link-modal").classList.add("visible");
  }

  /**
   * 用户确认分享，创建并发送链接卡片消息
   */
  async function sendUserLinkShare() {
    if (!state.activeChatId) return;

    const title = document.getElementById("link-title-input").value.trim();
    if (!title) {
      alert("标题是必填项哦！");
      return;
    }

    const description = document.getElementById("link-description-input").value.trim();
    const sourceName = document.getElementById("link-source-input").value.trim();
    const content = document.getElementById("link-content-input").value.trim();

    const chat = state.chats[state.activeChatId];

    // 创建消息对象
    const linkMessage = {
      role: "user", // 角色是 'user'
      type: "share_link",
      timestamp: Date.now(),
      title: title,
      description: description,
      source_name: sourceName,
      content: content,
      // 用户分享的链接，我们不提供图片，让它总是显示占位图
      thumbnail_url: null,
    };

    // 将消息添加到历史记录
    chat.history.push(linkMessage);
    await db.chats.put(chat);

    // 渲染新消息并更新列表
    appendMessage(linkMessage, chat);
    renderChatList();

    // 关闭模态框
    document.getElementById("share-link-modal").classList.remove("visible");
  }

  // ▲▲▲ 新函数粘贴结束 ▲▲▲

  /**
   * 根据AI的视角，过滤出它能看到的动态
   * @param {Array} allPosts - 所有待检查的动态帖子
   * @param {object} viewerChat - 正在“看”动态的那个AI的chat对象
   * @returns {Array} - 过滤后该AI可见的动态帖子
   */
  function filterVisiblePostsForAI(allPosts, viewerChat) {
    if (!viewerChat || !viewerChat.id) return []; // 安全检查

    const viewerGroupId = viewerChat.groupId; // 查看者所在的分组ID

    return allPosts.filter((post) => {
      // 规则1：如果是用户发的动态
      if (post.authorId === "user") {
        // 如果用户设置了“部分可见”
        if (post.visibleGroupIds && post.visibleGroupIds.length > 0) {
          // 只有当查看者AI的分组ID在用户的可见列表里时，才可见
          return viewerGroupId && post.visibleGroupIds.includes(viewerGroupId);
        }
        // 如果用户没设置，说明是公开的，所有AI都可见
        return true;
      }

      // 规则2：如果是其他AI发的动态
      const authorGroupId = post.authorGroupId; // 发帖AI所在的分组ID

      // 如果发帖的AI没有分组，那它的动态就是公开的
      if (!authorGroupId) {
        return true;
      }

      // 如果发帖的AI有分组，那么只有在同一个分组的AI才能看到
      return authorGroupId === viewerGroupId;
    });
  }

  /**
   * 应用指定的主题（'light' 或 'dark'）
   * @param {string} theme - 要应用的主题名称
   */
  function applyTheme(theme) {
    const phoneScreen = document.getElementById("phone-screen");
    const toggleSwitch = document.getElementById("theme-toggle-switch");

    const isDark = theme === "dark";

    phoneScreen.classList.toggle("dark-mode", isDark);

    // 如果开关存在，就同步它的状态
    if (toggleSwitch) {
      toggleSwitch.checked = isDark;
    }

    localStorage.setItem("ephone-theme", theme);
  }

  /**
   * 切换当前的主题
   */
  function toggleTheme() {
    const toggleSwitch = document.getElementById("theme-toggle-switch");
    // 直接根据开关的选中状态来决定新主题
    const newTheme = toggleSwitch.checked ? "dark" : "light";
    applyTheme(newTheme);
  }

  // ▼▼▼ 请将这【一整块新函数】粘贴到你的JS功能函数定义区 ▼▼▼

  function startReplyToMessage() {
    if (!activeMessageTimestamp) return;

    const chat = state.chats[state.activeChatId];
    const message = chat.history.find((m) => m.timestamp === activeMessageTimestamp);
    if (!message) return;

    // 1. 【核心修正】同时获取“完整内容”和“预览片段”
    const fullContent = String(message.content || "");
    let previewSnippet = "";

    if (typeof message.content === "string" && STICKER_REGEX.test(message.content)) {
      previewSnippet = "[表情]";
    } else if (message.type === "ai_image" || message.type === "user_photo") {
      previewSnippet = "[图片]";
    } else if (message.type === "voice_message") {
      previewSnippet = "[语音]";
    } else {
      // 预览片段依然截断，但只用于UI显示
      previewSnippet = fullContent.substring(0, 50) + (fullContent.length > 50 ? "..." : "");
    }

    // 2. 【核心修正】将“完整内容”存入上下文，以备发送时使用
    currentReplyContext = {
      timestamp: message.timestamp,
      senderName:
        message.senderName ||
        (message.role === "user" ? chat.settings.myNickname || "我" : chat.name),
      content: fullContent, // <--- 这里存的是完整的原文！
    };

    // 3. 【核心修正】仅在更新“回复预览栏”时，才使用“预览片段”
    const previewBar = document.getElementById("reply-preview-bar");
    previewBar.querySelector(".sender").textContent = `回复 ${currentReplyContext.senderName}:`;
    previewBar.querySelector(".text").textContent = previewSnippet; // <--- 这里用的是缩略版！
    previewBar.style.display = "block";

    // 4. 后续操作保持不变
    hideMessageActions();
    document.getElementById("chat-input").focus();
  }

  /**
   * 【全新】取消引用模式
   */
  function cancelReplyMode() {
    currentReplyContext = null;
    document.getElementById("reply-preview-bar").style.display = "none";
  }

  // ▲▲▲ 新函数粘贴结束 ▲▲▲

  // ▼▼▼ 【全新】用户处理转账的核心功能函数 ▼▼▼

  let activeTransferTimestamp = null; // 用于暂存被点击的转账消息的时间戳

  /**
   * 显示处理转账的操作菜单
   * @param {number} timestamp - 被点击的转账消息的时间戳
   */
  function showTransferActionModal(timestamp) {
    activeTransferTimestamp = timestamp;

    const chat = state.chats[state.activeChatId];
    const message = chat.history.find((m) => m.timestamp === timestamp);
    if (message) {
      // 将AI的名字填入弹窗
      document.getElementById("transfer-sender-name").textContent = message.senderName;
    }
    document.getElementById("transfer-actions-modal").classList.add("visible");
  }

  /**
   * 隐藏处理转账的操作菜单
   */
  function hideTransferActionModal() {
    document.getElementById("transfer-actions-modal").classList.remove("visible");
    activeTransferTimestamp = null;
  }

  /**
   * 处理用户接受或拒绝转账的逻辑
   * @param {string} choice - 用户的选择, 'accepted' 或 'declined'
   */
  async function handleUserTransferResponse(choice) {
    if (!activeTransferTimestamp) return;

    const timestamp = activeTransferTimestamp;
    const chat = state.chats[state.activeChatId];
    const messageIndex = chat.history.findIndex((m) => m.timestamp === timestamp);
    if (messageIndex === -1) return;

    // 1. 更新原始转账消息的状态
    const originalMessage = chat.history[messageIndex];
    originalMessage.status = choice;

    let systemContent;

    // 2. 如果用户选择“拒绝”
    if (choice === "declined") {
      // 立刻在前端生成一个“退款”卡片，让用户看到
      const refundMessage = {
        role: "user",
        type: "transfer",
        isRefund: true, // 这是一个关键标记，用于UI显示这是退款
        amount: originalMessage.amount,
        note: "已拒收对方转账",
        timestamp: Date.now(),
      };
      chat.history.push(refundMessage);

      // 准备一条对AI可见的隐藏消息，告诉它发生了什么
      systemContent = `[系统提示：你拒绝并退还了“${originalMessage.senderName}”的转账。]`;
    } else {
      // 如果用户选择“接受”
      // 只需准备隐藏消息通知AI即可
      systemContent = `[系统提示：你接受了“${originalMessage.senderName}”的转账。]`;
    }

    // 3. 创建这条对用户隐藏、但对AI可见的系统消息
    const hiddenMessage = {
      role: "system",
      content: systemContent,
      timestamp: Date.now() + 1, // 保证时间戳在退款消息之后
      isHidden: true, // 这个标记会让它不在聊天界面显示
    };
    chat.history.push(hiddenMessage);

    // 4. 保存所有更改到数据库，并刷新界面
    await db.chats.put(chat);
    hideTransferActionModal();
    renderChatInterface(state.activeChatId);
    renderChatList();
  }

  // ▲▲▲ 新函数粘贴结束 ▲▲▲

  // ▼▼▼ 【全新】通话记录功能核心函数 ▼▼▼

  async function renderCallHistoryScreen() {
    showScreen("call-history-screen"); // <--【核心修正】把它移动到最前面！

    const listEl = document.getElementById("call-history-list");
    const titleEl = document.getElementById("call-history-title");
    listEl.innerHTML = "";
    titleEl.textContent = "所有通话记录";

    const records = await db.callRecords.orderBy("timestamp").reverse().toArray();

    if (records.length === 0) {
      listEl.innerHTML =
        '<p style="text-align:center; color: var(--text-secondary); padding: 50px 0;">这里还没有通话记录哦~</p>';
      return; // 现在的 return 就没问题了，因为它只跳过了后续的渲染逻辑
    }

    records.forEach((record) => {
      const card = createCallRecordCard(record);

      addLongPressListener(card, async () => {
        // 1. 弹出输入框，并将旧名称作为默认值，方便修改
        const newName = await showCustomPrompt(
          "自定义通话名称",
          "请输入新的名称（留空则恢复默认）",
          record.customName || "" // 如果已有自定义名称，就显示它
        );

        // 2. 如果用户点击了“取消”，则什么都不做
        if (newName === null) return;

        // 3. 更新数据库中的这条记录
        await db.callRecords.update(record.id, { customName: newName.trim() });

        // 4. 刷新整个列表，让更改立刻显示出来
        await renderCallHistoryScreen();

        // 5. 给用户一个成功的提示
        await showCustomAlert("成功", "通话名称已更新！");
      });
      listEl.appendChild(card);
    });
  }

  // ▼▼▼ 用这个【升级版】函数，完整替换你旧的 createCallRecordCard 函数 ▼▼▼
  /**
   * 【升级版】根据单条记录数据，创建一张能显示聊天对象的通话卡片
   * @param {object} record - 一条通话记录对象
   * @returns {HTMLElement} - 创建好的卡片div
   */
  function createCallRecordCard(record) {
    const card = document.createElement("div");
    card.className = "call-record-card";
    card.dataset.recordId = record.id;

    // 获取通话对象的名字
    const chatInfo = state.chats[record.chatId];
    const chatName = chatInfo ? chatInfo.name : "未知会话";

    const callDate = new Date(record.timestamp);
    const dateString = `${callDate.getFullYear()}-${String(callDate.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(callDate.getDate()).padStart(2, "0")} ${String(callDate.getHours()).padStart(
      2,
      "0"
    )}:${String(callDate.getMinutes()).padStart(2, "0")}`;
    const durationText = `${Math.floor(record.duration / 60)}分${record.duration % 60}秒`;

    const avatarsHtml = record.participants
      .map(
        (p) =>
          `<img src="${p.avatar}" alt="${p.name}" class="participant-avatar" title="${p.name}">`
      )
      .join("");

    card.innerHTML = `
        <div class="card-header">
            <span class="date">${dateString}</span>
            <span class="duration">${durationText}</span>
        </div>
        <div class="card-body">
            <!-- 【核心修改】在这里新增一个标题行 -->
            ${record.customName ? `<div class="custom-title">${record.customName}</div>` : ""}
            
            <div class="participants-info"> <!-- 新增一个容器方便布局 -->
                <div class="participants-avatars">${avatarsHtml}</div>
                <span class="participants-names">与 ${chatName}</span>
            </div>
        </div>
    `;
    return card;
  }
  // ▲▲▲ 替换结束 ▲▲▲

  /**
   * 显示指定通话记录的完整文字稿
   * @param {number} recordId - 通话记录的ID
   */
  async function showCallTranscript(recordId) {
    const record = await db.callRecords.get(recordId);
    if (!record) return;

    const modal = document.getElementById("call-transcript-modal");
    const titleEl = document.getElementById("transcript-modal-title");
    const bodyEl = document.getElementById("transcript-modal-body");

    titleEl.textContent = `通话于 ${new Date(
      record.timestamp
    ).toLocaleString()} (时长: ${Math.floor(record.duration / 60)}分${record.duration % 60}秒)`;
    bodyEl.innerHTML = "";

    if (!record.transcript || record.transcript.length === 0) {
      bodyEl.innerHTML =
        '<p style="text-align:center; color: #8a8a8a;">这次通话没有留下文字记录。</p>';
    } else {
      record.transcript.forEach((entry) => {
        const bubble = document.createElement("div");
        // 根据角色添加不同的class，应用不同的样式
        bubble.className = `transcript-entry ${entry.role}`;
        bubble.textContent = entry.content;
        bodyEl.appendChild(bubble);
      });
    }

    const deleteBtn = document.getElementById("delete-transcript-btn");

    // 【重要】使用克隆节点技巧，防止事件重复绑定
    const newDeleteBtn = deleteBtn.cloneNode(true);
    deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);

    // 为新的、干净的按钮绑定事件
    newDeleteBtn.addEventListener("click", async () => {
      const confirmed = await showCustomConfirm(
        "确认删除",
        "确定要永久删除这条通话记录吗？此操作不可恢复。",
        { confirmButtonClass: "btn-danger" }
      );

      if (confirmed) {
        // 1. 关闭当前的详情弹窗
        modal.classList.remove("visible");

        // 2. 从数据库删除
        await db.callRecords.delete(recordId);

        // 3. 刷新通话记录列表
        await renderCallHistoryScreen();

        // 4. (可选) 给出成功提示
        alert("通话记录已删除。");
      }
    });
    modal.classList.add("visible");
  }

  // ▲▲▲ 新函数粘贴结束 ▲▲▲

  // ▼▼▼ 请用这个【全新函数】替换掉你旧的 handleStatusResetClick 函数 ▼▼▼

  /**
   * 【全新】处理用户点击状态栏，弹出编辑框让用户修改AI的当前状态
   */
  async function handleEditStatusClick() {
    // 1. 安全检查，确保在单聊界面
    if (!state.activeChatId || state.chats[state.activeChatId].isGroup) {
      return;
    }
    const chat = state.chats[state.activeChatId];

    // 2. 弹出输入框，让用户输入新的状态，并将当前状态作为默认值
    const newStatusText = await showCustomPrompt(
      "编辑对方状态",
      "请输入对方现在的新状态：",
      chat.status.text // 将当前状态作为输入框的默认内容
    );

    // 3. 如果用户输入了内容并点击了“确定”
    if (newStatusText !== null) {
      // 4. 更新内存和数据库中的状态数据
      chat.status.text = newStatusText.trim() || "在线"; // 如果用户清空了，就默认为“在线”
      chat.status.isBusy = false; // 每次手动编辑都默认其不处于“忙碌”状态
      chat.status.lastUpdate = Date.now();
      await db.chats.put(chat);

      // 5. 立刻刷新UI，让用户看到修改后的状态
      renderChatInterface(state.activeChatId);
      renderChatList();

      // 6. 给出一个无伤大雅的成功提示
      await showCustomAlert("状态已更新", `“${chat.name}”的当前状态已更新为：${chat.status.text}`);
    }
  }

  // 放在你的JS功能函数定义区
  async function openShareTargetPicker() {
    const modal = document.getElementById("share-target-modal");
    const listEl = document.getElementById("share-target-list");
    listEl.innerHTML = "";

    // 获取所有聊天作为分享目标
    const chats = Object.values(state.chats);

    chats.forEach((chat) => {
      // 复用联系人选择器的样式
      const item = document.createElement("div");
      item.className = "contact-picker-item";
      item.innerHTML = `
            <input type="checkbox" class="share-target-checkbox" data-chat-id="${
              chat.id
            }" style="margin-right: 15px;">
            <img src="${
              chat.isGroup ? chat.settings.groupAvatar : chat.settings.aiAvatar || defaultAvatar
            }" class="avatar">
            <span class="name">${chat.name}</span>
        `;
      listEl.appendChild(item);
    });

    modal.classList.add("visible");
  }

  function closeMusicPlayerWithAnimation(callback) {
    const overlay = document.getElementById("music-player-overlay");
    if (!overlay.classList.contains("visible")) {
      if (callback) callback();
      return;
    }
    overlay.classList.remove("visible");
    setTimeout(() => {
      document.getElementById("music-playlist-panel").classList.remove("visible");
      if (callback) callback();
    }, 400);
  }

  function parseLRC(lrcContent) {
    if (!lrcContent) return [];
    const lines = lrcContent.split("\n");
    const lyrics = [];
    const timeRegex = /\[(\d{2}):(\d{2})[.:](\d{2,3})\]/g;

    for (const line of lines) {
      const text = line.replace(timeRegex, "").trim();
      if (!text) continue;
      timeRegex.lastIndex = 0;
      let match;
      while ((match = timeRegex.exec(line)) !== null) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const milliseconds = parseInt(match[3].padEnd(3, "0"), 10);
        const time = minutes * 60 + seconds + milliseconds / 1000;
        lyrics.push({ time, text });
      }
    }
    return lyrics.sort((a, b) => a.time - b.time);
  }

  function renderLyrics() {
    const lyricsList = document.getElementById("music-lyrics-list");
    lyricsList.innerHTML = "";
    if (!musicState.parsedLyrics || musicState.parsedLyrics.length === 0) {
      lyricsList.innerHTML = '<div class="lyric-line">♪ 暂无歌词 ♪</div>';
      return;
    }
    musicState.parsedLyrics.forEach((line, index) => {
      const lineEl = document.createElement("div");
      lineEl.className = "lyric-line";
      lineEl.textContent = line.text;
      lineEl.dataset.index = index;
      lyricsList.appendChild(lineEl);
    });
    lyricsList.style.transform = `translateY(0px)`;
  }

  function updateActiveLyric(currentTime) {
    if (musicState.parsedLyrics.length === 0) return;
    let newLyricIndex = -1;
    for (let i = 0; i < musicState.parsedLyrics.length; i++) {
      if (currentTime >= musicState.parsedLyrics[i].time) {
        newLyricIndex = i;
      } else {
        break;
      }
    }
    if (newLyricIndex === musicState.currentLyricIndex) return;
    musicState.currentLyricIndex = newLyricIndex;
    updateLyricsUI();
  }

  function updateLyricsUI() {
    const lyricsList = document.getElementById("music-lyrics-list");
    const container = document.getElementById("music-lyrics-container");
    const lines = lyricsList.querySelectorAll(".lyric-line");
    lines.forEach((line) => line.classList.remove("active"));
    if (musicState.currentLyricIndex === -1) {
      lyricsList.style.transform = `translateY(0px)`;
      return;
    }
    const activeLine = lyricsList.querySelector(
      `.lyric-line[data-index="${musicState.currentLyricIndex}"]`
    );
    if (activeLine) {
      activeLine.classList.add("active");
      const containerHeight = container.offsetHeight;
      const offset = containerHeight / 3 - activeLine.offsetTop - activeLine.offsetHeight / 2;
      lyricsList.style.transform = `translateY(${offset}px)`;
    }
  }

  function formatMusicTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  function updateMusicProgressBar() {
    const currentTimeEl = document.getElementById("music-current-time");
    const totalTimeEl = document.getElementById("music-total-time");
    const progressFillEl = document.getElementById("music-progress-fill");
    if (!audioPlayer.duration) {
      currentTimeEl.textContent = "0:00";
      totalTimeEl.textContent = "0:00";
      progressFillEl.style.width = "0%";
      return;
    }
    const progressPercent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    progressFillEl.style.width = `${progressPercent}%`;
    currentTimeEl.textContent = formatMusicTime(audioPlayer.currentTime);
    totalTimeEl.textContent = formatMusicTime(audioPlayer.duration);
    updateActiveLyric(audioPlayer.currentTime);
  }

  /**
   * 【全新】处理用户点击“撤回”按钮的入口函数
   */
  async function handleRecallClick() {
    if (!activeMessageTimestamp) return;

    const RECALL_TIME_LIMIT_MS = 2 * 60 * 1000; // 设置2分钟的撤回时限
    const messageTime = activeMessageTimestamp;
    const now = Date.now();

    // 检查是否超过了撤回时限
    if (now - messageTime > RECALL_TIME_LIMIT_MS) {
      hideMessageActions();
      await showCustomAlert("操作失败", "该消息发送已超过2分钟，无法撤回。");
      return;
    }

    // 如果在时限内，执行真正的撤回逻辑
    await recallMessage(messageTime, true);
    hideMessageActions();
  }

  /**
   * 【全新】消息撤回的核心逻辑
   * @param {number} timestamp - 要撤回的消息的时间戳
   * @param {boolean} isUserRecall - 是否是用户主动撤回
   */
  async function recallMessage(timestamp, isUserRecall) {
    const chat = state.chats[state.activeChatId];
    if (!chat) return;

    const messageIndex = chat.history.findIndex((m) => m.timestamp === timestamp);
    if (messageIndex === -1) return;

    const messageToRecall = chat.history[messageIndex];

    // 1. 修改消息对象，将其变为“已撤回”状态
    const recalledData = {
      originalType: messageToRecall.type || "text",
      originalContent: messageToRecall.content,
      // 保存其他可能存在的原始数据
      originalMeaning: messageToRecall.meaning,
      originalQuote: messageToRecall.quote,
    };

    messageToRecall.type = "recalled_message";
    messageToRecall.content = isUserRecall ? "你撤回了一条消息" : "对方撤回了一条消息";
    messageToRecall.recalledData = recalledData;
    // 清理掉不再需要的旧属性
    delete messageToRecall.meaning;
    delete messageToRecall.quote;

    // 2. 如果是用户撤回，需要给AI发送一条它看不懂内容的隐藏提示
    if (isUserRecall) {
      const hiddenMessageForAI = {
        role: "system",
        content: `[系统提示：用户撤回了一条消息。你不知道内容是什么，只需知道这个事件即可。]`,
        timestamp: Date.now(),
        isHidden: true,
      };
      chat.history.push(hiddenMessageForAI);
    }

    // 3. 保存到数据库并刷新UI
    await db.chats.put(chat);
    renderChatInterface(state.activeChatId);
    if (isUserRecall) renderChatList(); // 用户撤回时，最后一条消息变了，需要刷新列表
  }

  // ▼▼▼ 【全新】将这些函数粘贴到你的JS功能函数定义区 ▼▼▼

  /**
   * 打开分类管理模态框
   */
  async function openCategoryManager() {
    await renderCategoryListInManager();
    document.getElementById("world-book-category-manager-modal").classList.add("visible");
  }

  /**
   * 在模态框中渲染已存在的分类列表
   */
  async function renderCategoryListInManager() {
    const listEl = document.getElementById("existing-categories-list");
    const categories = await db.worldBookCategories.toArray();
    listEl.innerHTML = "";
    if (categories.length === 0) {
      listEl.innerHTML =
        '<p style="text-align: center; color: var(--text-secondary);">还没有任何分类</p>';
    }
    categories.forEach((cat) => {
      // 复用好友分组的样式
      const item = document.createElement("div");
      item.className = "existing-group-item";
      item.innerHTML = `
            <span class="group-name">${cat.name}</span>
            <span class="delete-group-btn" data-id="${cat.id}">×</span>
        `;
      listEl.appendChild(item);
    });
  }

  /**
   * 添加一个新的世界书分类
   */
  async function addNewCategory() {
    const input = document.getElementById("new-category-name-input");
    const name = input.value.trim();
    if (!name) {
      alert("分类名不能为空！");
      return;
    }
    const existing = await db.worldBookCategories.where("name").equals(name).first();
    if (existing) {
      alert(`分类 "${name}" 已经存在了！`);
      return;
    }
    await db.worldBookCategories.add({ name });
    input.value = "";
    await renderCategoryListInManager();
  }

  /**
   * 删除一个世界书分类
   * @param {number} categoryId - 要删除的分类的ID
   */
  async function deleteCategory(categoryId) {
    const confirmed = await showCustomConfirm(
      "确认删除",
      "删除分类后，该分类下的所有世界书将变为“未分类”。确定要删除吗？",
      { confirmButtonClass: "btn-danger" }
    );
    if (confirmed) {
      await db.worldBookCategories.delete(categoryId);
      // 将属于该分类的世界书的 categoryId 设为 null
      const booksToUpdate = await db.worldBooks.where("categoryId").equals(categoryId).toArray();
      for (const book of booksToUpdate) {
        book.categoryId = null;
        await db.worldBooks.put(book);
        const bookInState = state.worldBooks.find((wb) => wb.id === book.id);
        if (bookInState) bookInState.categoryId = null;
      }
      await renderCategoryListInManager();
    }
  }

  // ▲▲▲ 新函数粘贴结束 ▲▲▲
});
