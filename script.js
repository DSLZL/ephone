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
  // === Lightweight performance helpers ===
  // 1) Frame mode: show decorative phone frame on tablet/desktop, hide on phones
  function applyFrameMode() {
    const isPhone = window.matchMedia("(max-width: 600px)").matches;
    document.documentElement.classList.toggle("frameless", isPhone);
  }
  applyFrameMode();
  window.addEventListener("resize", applyFrameMode, { passive: true });

  // 2) Default all images to lazy & async decoding (static + dynamically added)
  function setImagePerfAttrs(img) {
    try {
      if (!img.hasAttribute("loading")) img.setAttribute("loading", "lazy");
      if (!img.hasAttribute("decoding")) img.setAttribute("decoding", "async");
    } catch (e) {}
  }
  document.querySelectorAll("img").forEach(setImagePerfAttrs);
  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes && m.addedNodes.forEach((node) => {
        if (node && node.tagName === "IMG") setImagePerfAttrs(node);
        else if (node && node.querySelectorAll) node.querySelectorAll("img").forEach(setImagePerfAttrs);
      });
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  // 3) Encourage passive listeners for scroll/touch to prevent jank
  (function () {
    const orig = EventTarget.prototype.addEventListener;
    const defaultPassive = { touchstart: true, touchmove: true, wheel: true };
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      let opts = options;
      if (typeof options === "object" && options !== null) {
        if (defaultPassive[type] && options.passive == null) {
          opts = Object.assign({}, options, { passive: true });
        }
      } else if (options === undefined && defaultPassive[type]) {
        opts = { passive: true };
      }
      return orig.call(this, type, listener, opts);
    };
  })();

  // ===================================================================
  // 1. 所有变量和常量定义
  // ===================================================================
  const db = new Dexie("GeminiChatDB");
  // --- 已修正 ---
  let state = {
    chats: {},
    activeChatId: null,
    globalSettings: {},
    apiConfigs: [],
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
  // 2. 数据库结构定义
  // ===================================================================

  db.version(24)
    .stores({
      chats: "&id, isGroup, groupId",
      // apiConfig: "&id", // <- 移除旧表
      apiConfigs: "++id, name", // <- 新增，用于存储多个API配置
      globalSettings: "&id",
      userStickers: "&id, url, name",
      worldBooks: "&id, name, categoryId",
      worldBookCategories: "++id, name",
      musicLibrary: "&id",
      personaPresets: "&id",
      qzoneSettings: "&id",
      qzonePosts: "++id, timestamp",
      qzoneAlbums: "++id, name, createdAt",
      qzonePhotos: "++id, albumId",
      favorites: "++id, type, timestamp, originalTimestamp",
      qzoneGroups: "++id, name",
      memories: "++id, chatId, timestamp, type, targetDate",
      callRecords: "++id, chatId, timestamp, customName",
    })
    .upgrade(async (tx) => {
      // 数据迁移脚本：从旧的单个 apiConfig 迁移到新的 apiConfigs 列表
      const oldConfig = await tx.table("apiConfig").get("main");
      if (oldConfig) {
        console.log("检测到旧版API配置，正在执行自动迁移...");
        const newConfigsTable = tx.table("apiConfigs");
        const existingConfigs = await newConfigsTable.toArray();
        if (existingConfigs.length === 0) {
          const newId = await newConfigsTable.add({
            name: "默认配置",
            url: oldConfig.proxyUrl || "",
            apiKey: oldConfig.apiKey || "",
            model: oldConfig.model || "",
            enableStream: oldConfig.enableStream || false,
            hideStreamResponse: oldConfig.hideStreamResponse || false,
          });

          const globalSettings = (await tx.table("globalSettings").get("main")) || { id: "main" };
          globalSettings.activeApiConfigId = newId;
          await tx.table("globalSettings").put(globalSettings);

          await tx.table("apiConfig").clear();
          console.log("API配置迁移成功！");
        }
      }
    });

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
          ? `${publicTextHtml}<div style="margin-top:10px;"><img src="img/Ai-Generated-Image.jpg" class="chat-image" style="cursor: pointer;" data-hidden-text="${post.hiddenContent}"></div>`
          : `<img src="img/Ai-Generated-Image.jpg" class="chat-image" style="cursor: pointer;" data-hidden-text="${post.hiddenContent}">`;
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
            ? `${publicTextHtml}<div style="margin-top:10px;"><img src="img/Ai-Generated-Image.jpg" class="chat-image" style="cursor: pointer;" data-hidden-text="${post.hiddenContent}"></div>`
            : `<img src="img/Ai-Generated-Image.jpg" class="chat-image" style="cursor: pointer;" data-hidden-text="${post.hiddenContent}">`;
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

  // ▼▼▼ 用这个【已包含 memories】的版本，完整替换旧的 exportBackup 函数 ▼▼▼
  async function exportBackup() {
    try {
      const backupData = {
        version: 1,
        timestamp: Date.now(),
      };

      const [
        chats,
        worldBooks,
        userStickers,
        apiConfigs,
        globalSettings,
        personaPresets,
        musicLibrary,
        qzoneSettings,
        qzonePosts,
        qzoneAlbums,
        qzonePhotos,
        favorites,
        qzoneGroups,
        memories,
        worldBookCategories, // <-- 【核心修改1】在这里添加新变量
      ] = await Promise.all([
        db.chats.toArray(),
        db.worldBooks.toArray(),
        db.userStickers.toArray(),
        db.apiConfigs.toArray(),
        db.globalSettings.get("main"),
        db.personaPresets.toArray(),
        db.musicLibrary.get("main"),
        db.qzoneSettings.get("main"),
        db.qzonePosts.toArray(),
        db.qzoneAlbums.toArray(),
        db.qzonePhotos.toArray(),
        db.favorites.toArray(),
        db.qzoneGroups.toArray(),
        db.memories.toArray(),
        db.worldBookCategories.toArray(), // <-- 【核心修改2】在这里添加对新表的读取
      ]);

      Object.assign(backupData, {
        chats,
        worldBooks,
        userStickers,
        apiConfigs,
        globalSettings,
        personaPresets,
        musicLibrary,
        qzoneSettings,
        qzonePosts,
        qzoneAlbums,
        qzonePhotos,
        favorites,
        qzoneGroups,
        memories,
        worldBookCategories, // <-- 【核心修改3】将新数据添加到备份对象中
      });

      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = Object.assign(document.createElement("a"), {
        href: url,
        download: `EPhone-Full-Backup-${new Date().toISOString().split("T")[0]}.json`,
      });
      link.click();
      URL.revokeObjectURL(url);

      await showCustomAlert("导出成功", "已成功导出所有数据！");
    } catch (error) {
      console.error("导出数据时出错:", error);
      await showCustomAlert("导出失败", `发生了一个错误: ${error.message}`);
    }
  }

  // ▼▼▼ 用这个【已包含 memories】的版本，完整替换旧的 importBackup 函数 ▼▼▼
  async function importBackup(file) {
    if (!file) return;

    const confirmed = await showCustomConfirm(
      "严重警告！",
      "导入备份将完全覆盖您当前的所有数据，包括聊天、动态、设置等。此操作不可撤销！您确定要继续吗？",
      { confirmButtonClass: "btn-danger" }
    );

    if (!confirmed) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      await db.transaction("rw", db.tables, async () => {
        for (const table of db.tables) {
          await table.clear();
        }

        if (Array.isArray(data.chats)) await db.chats.bulkPut(data.chats);
        if (Array.isArray(data.apiConfigs)) await db.apiConfigs.bulkPut(data.apiConfigs);
        if (Array.isArray(data.worldBooks)) await db.worldBooks.bulkPut(data.worldBooks);
        if (Array.isArray(data.worldBookCategories))
          await db.worldBookCategories.bulkPut(data.worldBookCategories);
        if (Array.isArray(data.userStickers)) await db.userStickers.bulkPut(data.userStickers);
        if (Array.isArray(data.personaPresets))
          await db.personaPresets.bulkPut(data.personaPresets);
        if (Array.isArray(data.qzonePosts)) await db.qzonePosts.bulkPut(data.qzonePosts);
        if (Array.isArray(data.qzoneAlbums)) await db.qzoneAlbums.bulkPut(data.qzoneAlbums);
        if (Array.isArray(data.qzonePhotos)) await db.qzonePhotos.bulkPut(data.qzonePhotos);
        if (Array.isArray(data.favorites)) await db.favorites.bulkPut(data.favorites);
        if (Array.isArray(data.qzoneGroups)) await db.qzoneGroups.bulkPut(data.qzoneGroups);
        if (Array.isArray(data.memories)) await db.memories.bulkPut(data.memories); // 【核心修正】新增

        if (data.apiConfig) {
          await db.apiConfigs.put({
            name: "旧的默认配置",
            url: data.apiConfig.proxyUrl,
            apiKey: data.apiConfig.apiKey,
            model: data.apiConfig.model,
          });
        }
        if (data.globalSettings) await db.globalSettings.put(data.globalSettings);
        if (data.musicLibrary) await db.musicLibrary.put(data.musicLibrary);
        if (data.qzoneSettings) await db.qzoneSettings.put(data.qzoneSettings);
      });

      await showCustomAlert("导入成功", "所有数据已成功恢复！应用即将刷新以应用所有更改。");

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("导入数据时出错:", error);
      await showCustomAlert("导入失败", `文件格式不正确或数据已损坏: ${error.message}`);
    }
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
    const [
      chatsArr,
      apiConfigs, // <-- 修改这里
      globalSettings,
      userStickers,
      worldBooks,
      musicLib,
      personaPresets,
      qzoneSettings,
      initialFavorites,
    ] = await Promise.all([
      db.chats.toArray(),
      db.apiConfigs.toArray(), // <-- 修改这里
      db.globalSettings.get("main"),
      db.userStickers.toArray(),
      db.worldBooks.toArray(),
      db.musicLibrary.get("main"),
      db.personaPresets.toArray(),
      db.qzoneSettings.get("main"),
      db.favorites.orderBy("timestamp").reverse().toArray(),
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
    state.apiConfigs = apiConfigs || [];

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
    // 渲染其他全局设置（保持不变）
    document.getElementById("background-activity-switch").checked =
      state.globalSettings.enableBackgroundActivity || false;
    document.getElementById("background-interval-input").value =
      state.globalSettings.backgroundActivityInterval || 60;
    document.getElementById("block-cooldown-input").value =
      state.globalSettings.blockCooldownHours || 1;

    // 渲染API配置列表
    const listEl = document.getElementById("api-configs-list");
    listEl.innerHTML = "";
    if (state.apiConfigs.length === 0) {
      listEl.innerHTML =
        '<p style="text-align:center; color: var(--text-secondary);">还没有任何配置，请点击“添加”创建一个</p>';
    }

    const activeId = state.globalSettings.activeApiConfigId;

    state.apiConfigs.forEach((config) => {
      const item = document.createElement("div");
      item.className = "api-config-item";
      item.dataset.configId = config.id;
      item.innerHTML = `
        <div class="config-main">
            <input type="radio" name="active_api_config" ${config.id === activeId ? "checked" : ""}>
            <div class="config-details">
                <span class="config-name">${config.name}</span>
                <span class="config-url">${config.url || "URL未设置"}</span>
            </div>
        </div>
        <div class="config-actions">
            <button type="button" class="edit-btn">编辑</button>
            <button type="button" class="delete-btn">删除</button>
        </div>
      `;
      listEl.appendChild(item);
    });
  }
// ▼▼▼ [新版本] 请使用此函数进行替换 ▼▼▼
async function openApiConfigEditor(configId = null) {
  let config = {
    name: "",
    url: "",
    apiKey: "",
    model: "gpt-4o",
    enableStream: true,
    hideStreamResponse: false,
  };
  if (configId) {
    config = state.apiConfigs.find((c) => c.id === configId) || config;
  }

  // 填充基本信息
  document.getElementById("config-editor-id").value = configId || "";
  document.getElementById("config-name-input").value = config.name;
  document.getElementById("config-url-input").value = config.url;
  document.getElementById("config-key-input").value = config.apiKey;
  
  // --- 【核心修复】 ---
  // 每次打开时，都重置模型下拉列表，只显示当前配置已保存的模型
  const modelSelect = document.getElementById("config-model-select");
  // 1. 清空所有旧的 <option> 元素
  modelSelect.innerHTML = "";
  // 2. 创建一个只包含当前已保存模型的新 <option>
  const savedModelOption = document.createElement("option");
  savedModelOption.value = config.model;
  savedModelOption.textContent = config.model;
  savedModelOption.selected = true;
  // 3. 将这个唯一的选项添加到下拉列表中
  modelSelect.appendChild(savedModelOption);
  // --- 【修复结束】 ---

  // 填充开关状态
  document.getElementById("config-stream-switch").checked = config.enableStream;
  document.getElementById("config-hide-stream-switch").checked = config.hideStreamResponse;

  // 显示模态框
  document.getElementById("api-config-editor-modal").classList.add("visible");
}
// ▲▲▲ 替换结束 ▲▲▲

  async function saveApiConfig() {
    const id = document.getElementById("config-editor-id").value;
    const configData = {
      name: document.getElementById("config-name-input").value.trim() || "未命名配置",
      url: document.getElementById("config-url-input").value.trim(),
      apiKey: document.getElementById("config-key-input").value.trim(),
      model: document.getElementById("config-model-select").value,
      enableStream: document.getElementById("config-stream-switch").checked,
      hideStreamResponse: document.getElementById("config-hide-stream-switch").checked,
    };

    if (id) {
      // 更新
      configData.id = parseInt(id);
      await db.apiConfigs.put(configData);
      const index = state.apiConfigs.findIndex((c) => c.id === configData.id);
      if (index > -1) state.apiConfigs[index] = configData;
    } else {
      // 新增
      const newId = await db.apiConfigs.add(configData);
      configData.id = newId;
      state.apiConfigs.push(configData);
      // 如果是第一个配置，自动设为激活
      if (state.apiConfigs.length === 1) {
        state.globalSettings.activeApiConfigId = newId;
        await db.globalSettings.put(state.globalSettings);
      }
    }

    renderApiSettings();
    document.getElementById("api-config-editor-modal").classList.remove("visible");
  }

  async function setActiveApiConfig(configId) {
    state.globalSettings.activeApiConfigId = configId;
    await db.globalSettings.put(state.globalSettings);
    // 可以在这里给一个轻量提示，或者什么都不做
    console.log(`Active API config set to ID: ${configId}`);
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
      contentHtml = `<img src="img/Ai-Generated-Image.jpg" class="ai-generated-image" alt="${altText}" data-description="${msg.content}">`;
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
            <div class="transfer-note">${noteText}</div>
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

  function handleWaitReplyClick() {
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
        console.error(
          `AI幻觉已被拦截！试图使用群名 ("${chat.name}") 作为角色名。消息内容:`,
          msgData
        );
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
          const originalMessage = chat.history.find(
            (m) => m.timestamp === msgData.target_timestamp
          );
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
      // ▼▼▼ 从这里开始替换 ▼▼▼
      const activeConfigId = state.globalSettings.activeApiConfigId;
      const activeConfig = state.apiConfigs.find((c) => c.id === activeConfigId);

      if (!activeConfig || !activeConfig.url || !activeConfig.apiKey || !activeConfig.model) {
        alert("请先在API设置中添加并激活一个有效的API配置。");
        // 恢复UI状态
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

      const { url: proxyUrl, apiKey, model, enableStream } = activeConfig;

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
            } else if (msg.meaning)
              content = `${sender}: [发送了一个表情，意思是: '${msg.meaning}']`;
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
        if (activeConfig.hideStreamResponse) {
          // <--- 核心修正点在这里
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
                    notificationText = aiMessage.meaning
                      ? `[表情: ${aiMessage.meaning}]`
                      : "[表情]";
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
    element.addEventListener("touchstart", startPress, { passive: false });
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

  function updateListenTogetherIcon(chatId, forceReset = false) {
    const iconImg = document.querySelector("#listen-together-btn img");
    if (!iconImg) return;
    if (forceReset || !musicState.isActive || musicState.activeChatId !== chatId) {
      iconImg.src = "img/.png";
      iconImg.className = "";
      return;
    }
    iconImg.src = "img/Rotating.png";
    iconImg.classList.add("rotating");
    if (musicState.isPlaying) iconImg.classList.remove("paused");
    else iconImg.classList.add("paused");
  }
  window.updateListenTogetherIconProxy = updateListenTogetherIcon;

  function updatePlayerUI() {
    updateListenTogetherIcon(musicState.activeChatId);
    updateElapsedTimeDisplay();
    const titleEl = document.getElementById("music-player-song-title");
    const artistEl = document.getElementById("music-player-artist");
    const playPauseBtn = document.getElementById("music-play-pause-btn");
    if (musicState.currentIndex > -1 && musicState.playlist.length > 0) {
      const track = musicState.playlist[musicState.currentIndex];
      titleEl.textContent = track.name;
      artistEl.textContent = track.artist;
    } else {
      titleEl.textContent = "请添加歌曲";
      artistEl.textContent = "...";
    }
    playPauseBtn.textContent = musicState.isPlaying ? "❚❚" : "▶";
  }

  function updateElapsedTimeDisplay() {
    const hours = (musicState.totalElapsedTime / 3600).toFixed(1);
    document.getElementById("music-time-counter").textContent = `已经一起听了${hours}小时`;
  }

  function updatePlaylistUI() {
    const playlistBody = document.getElementById("playlist-body");
    playlistBody.innerHTML = "";
    if (musicState.playlist.length === 0) {
      playlistBody.innerHTML =
        '<p style="text-align:center; padding: 20px; color: #888;">播放列表是空的~</p>';
      return;
    }
    musicState.playlist.forEach((track, index) => {
      const item = document.createElement("div");
      item.className = "playlist-item";
      if (index === musicState.currentIndex) item.classList.add("playing");
      item.innerHTML = `
            <div class="playlist-item-info">
                <div class="title">${track.name}</div>
                <div class="artist">${track.artist}</div>
            </div>
            <div class="playlist-item-actions">
                <span class="playlist-action-btn lyrics-btn" data-index="${index}">词</span>
                <span class="playlist-action-btn delete-track-btn" data-index="${index}">×</span>
            </div>
        `;
      item.querySelector(".playlist-item-info").addEventListener("click", () => playSong(index));
      playlistBody.appendChild(item);
    });
  }

  function playSong(index) {
    if (index < 0 || index >= musicState.playlist.length) return;
    musicState.currentIndex = index;
    const track = musicState.playlist[index];
    musicState.parsedLyrics = parseLRC(track.lrcContent || "");
    musicState.currentLyricIndex = -1;
    renderLyrics();
    if (track.isLocal && track.src instanceof Blob) {
      audioPlayer.src = URL.createObjectURL(track.src);
    } else if (!track.isLocal) {
      audioPlayer.src = track.src;
    } else {
      console.error("本地歌曲源错误:", track);
      return;
    }
    audioPlayer.play();
    updatePlaylistUI();
    updatePlayerUI();
    updateMusicProgressBar();
  }

  function togglePlayPause() {
    if (audioPlayer.paused) {
      if (musicState.currentIndex === -1 && musicState.playlist.length > 0) {
        playSong(0);
      } else if (musicState.currentIndex > -1) {
        audioPlayer.play();
      }
    } else {
      audioPlayer.pause();
    }
  }

  function playNext() {
    if (musicState.playlist.length === 0) return;
    let nextIndex;
    switch (musicState.playMode) {
      case "random":
        nextIndex = Math.floor(Math.random() * musicState.playlist.length);
        break;
      case "single":
        playSong(musicState.currentIndex);
        return;
      case "order":
      default:
        nextIndex = (musicState.currentIndex + 1) % musicState.playlist.length;
        break;
    }
    playSong(nextIndex);
  }

  function playPrev() {
    if (musicState.playlist.length === 0) return;
    const newIndex =
      (musicState.currentIndex - 1 + musicState.playlist.length) % musicState.playlist.length;
    playSong(newIndex);
  }

  function changePlayMode() {
    const modes = ["order", "random", "single"];
    const currentModeIndex = modes.indexOf(musicState.playMode);
    musicState.playMode = modes[(currentModeIndex + 1) % modes.length];
    document.getElementById("music-mode-btn").textContent = {
      order: "顺序",
      random: "随机",
      single: "单曲",
    }[musicState.playMode];
  }

  async function addSongFromURL() {
    const url = await showCustomPrompt("添加网络歌曲", "请输入歌曲的URL", "", "url");
    if (!url) return;
    const name = await showCustomPrompt("歌曲信息", "请输入歌名");
    if (!name) return;
    const artist = await showCustomPrompt("歌曲信息", "请输入歌手名");
    if (!artist) return;
    musicState.playlist.push({ name, artist, src: url, isLocal: false });
    await saveGlobalPlaylist();
    updatePlaylistUI();
    if (musicState.currentIndex === -1) {
      musicState.currentIndex = musicState.playlist.length - 1;
      updatePlayerUI();
    }
  }

  async function addSongFromLocal(event) {
    const files = event.target.files;
    if (!files.length) return;

    for (const file of files) {
      let name = file.name.replace(/\.[^/.]+$/, "");
      name = await showCustomPrompt("歌曲信息", "请输入歌名", name);
      if (name === null) continue;

      const artist = await showCustomPrompt("歌曲信息", "请输入歌手名", "未知歌手");
      if (artist === null) continue;

      let lrcContent = "";
      const wantLrc = await showCustomConfirm(
        "导入歌词",
        `要为《${name}》导入歌词文件 (.lrc) 吗？`
      );
      if (wantLrc) {
        lrcContent = await new Promise((resolve) => {
          const lrcInput = document.getElementById("lrc-upload-input");
          const lrcChangeHandler = (e) => {
            const lrcFile = e.target.files[0];
            if (lrcFile) {
              const reader = new FileReader();
              reader.onload = (readEvent) => resolve(readEvent.target.result);
              reader.onerror = () => resolve("");
              reader.readAsText(lrcFile);
            } else {
              resolve("");
            }
            lrcInput.removeEventListener("change", lrcChangeHandler);
            lrcInput.value = "";
          };
          lrcInput.addEventListener("change", lrcChangeHandler);
          lrcInput.click();
        });
      }

      musicState.playlist.push({
        name,
        artist,
        src: file,
        isLocal: true,
        lrcContent: lrcContent,
      });
    }

    await saveGlobalPlaylist();
    updatePlaylistUI();
    if (musicState.currentIndex === -1 && musicState.playlist.length > 0) {
      musicState.currentIndex = 0;
      updatePlayerUI();
    }
    event.target.value = null;
  }

  async function deleteTrack(index) {
    if (index < 0 || index >= musicState.playlist.length) return;
    const track = musicState.playlist[index];
    const wasPlaying = musicState.isPlaying && musicState.currentIndex === index;
    if (track.isLocal && audioPlayer.src.startsWith("blob:") && musicState.currentIndex === index)
      URL.revokeObjectURL(audioPlayer.src);
    musicState.playlist.splice(index, 1);
    await saveGlobalPlaylist();
    if (musicState.playlist.length === 0) {
      if (musicState.isPlaying) audioPlayer.pause();
      audioPlayer.src = "";
      musicState.currentIndex = -1;
      musicState.isPlaying = false;
    } else {
      if (wasPlaying) {
        playNext();
      } else {
        if (musicState.currentIndex >= index)
          musicState.currentIndex = Math.max(0, musicState.currentIndex - 1);
      }
    }
    updatePlayerUI();
    updatePlaylistUI();
  }

  const personaLibraryModal = document.getElementById("persona-library-modal");
  const personaEditorModal = document.getElementById("persona-editor-modal");
  const presetActionsModal = document.getElementById("preset-actions-modal");

  function openPersonaLibrary() {
    renderPersonaLibrary();
    personaLibraryModal.classList.add("visible");
  }

  function closePersonaLibrary() {
    personaLibraryModal.classList.remove("visible");
  }

  function renderPersonaLibrary() {
    const grid = document.getElementById("persona-library-grid");
    grid.innerHTML = "";
    if (state.personaPresets.length === 0) {
      grid.innerHTML =
        '<p style="color: var(--text-secondary); grid-column: 1 / -1; text-align: center; margin-top: 20px;">空空如也~ 点击右上角"添加"来创建你的第一个人设预设吧！</p>';
      return;
    }
    state.personaPresets.forEach((preset) => {
      const item = document.createElement("div");
      item.className = "persona-preset-item";
      item.style.backgroundImage = `url(${preset.avatar})`;
      item.dataset.presetId = preset.id;
      item.addEventListener("click", () => applyPersonaPreset(preset.id));
      addLongPressListener(item, () => showPresetActions(preset.id));
      grid.appendChild(item);
    });
  }

  function showPresetActions(presetId) {
    editingPersonaPresetId = presetId;
    presetActionsModal.classList.add("visible");
  }

  function hidePresetActions() {
    presetActionsModal.classList.remove("visible");
    editingPersonaPresetId = null;
  }

  function applyPersonaPreset(presetId) {
    const preset = state.personaPresets.find((p) => p.id === presetId);
    if (preset) {
      document.getElementById("my-avatar-preview").src = preset.avatar;
      document.getElementById("my-persona").value = preset.persona;
    }
    closePersonaLibrary();
  }

  function openPersonaEditorForCreate() {
    editingPersonaPresetId = null;
    document.getElementById("persona-editor-title").textContent = "添加人设预设";
    document.getElementById("preset-avatar-preview").src = defaultAvatar;
    document.getElementById("preset-persona-input").value = "";
    personaEditorModal.classList.add("visible");
  }

  function openPersonaEditorForEdit() {
    const preset = state.personaPresets.find((p) => p.id === editingPersonaPresetId);
    if (!preset) return;
    document.getElementById("persona-editor-title").textContent = "编辑人设预设";
    document.getElementById("preset-avatar-preview").src = preset.avatar;
    document.getElementById("preset-persona-input").value = preset.persona;
    presetActionsModal.classList.remove("visible");
    personaEditorModal.classList.add("visible");
  }

  async function deletePersonaPreset() {
    const confirmed = await showCustomConfirm(
      "删除预设",
      "确定要删除这个人设预设吗？此操作不可恢复。",
      { confirmButtonClass: "btn-danger" }
    );
    if (confirmed && editingPersonaPresetId) {
      await db.personaPresets.delete(editingPersonaPresetId);
      state.personaPresets = state.personaPresets.filter((p) => p.id !== editingPersonaPresetId);
      hidePresetActions();
      renderPersonaLibrary();
    }
  }

  function closePersonaEditor() {
    personaEditorModal.classList.remove("visible");
    editingPersonaPresetId = null;
  }

  async function savePersonaPreset() {
    const avatar = document.getElementById("preset-avatar-preview").src;
    const persona = document.getElementById("preset-persona-input").value.trim();
    if (avatar === defaultAvatar && !persona) {
      alert("头像和人设不能都为空哦！");
      return;
    }
    if (editingPersonaPresetId) {
      const preset = state.personaPresets.find((p) => p.id === editingPersonaPresetId);
      if (preset) {
        preset.avatar = avatar;
        preset.persona = persona;
        await db.personaPresets.put(preset);
      }
    } else {
      const newPreset = {
        id: "preset_" + Date.now(),
        avatar: avatar,
        persona: persona,
      };
      await db.personaPresets.add(newPreset);
      state.personaPresets.push(newPreset);
    }
    renderPersonaLibrary();
    closePersonaEditor();
  }

  const batteryAlertModal = document.getElementById("battery-alert-modal");

  function showBatteryAlert(imageUrl, text) {
    clearTimeout(batteryAlertTimeout);
    document.getElementById("battery-alert-image").src = imageUrl;
    document.getElementById("battery-alert-text").textContent = text;
    batteryAlertModal.classList.add("visible");
    const closeAlert = () => {
      batteryAlertModal.classList.remove("visible");
      batteryAlertModal.removeEventListener("click", closeAlert);
    };
    batteryAlertModal.addEventListener("click", closeAlert);
    batteryAlertTimeout = setTimeout(closeAlert, 2000);
  }

  function updateBatteryDisplay(battery) {
    const batteryContainer = document.getElementById("status-bar-battery");
    const batteryLevelEl = batteryContainer.querySelector(".battery-level");
    const batteryTextEl = batteryContainer.querySelector(".battery-text");
    const level = Math.floor(battery.level * 100);
    batteryLevelEl.style.width = `${level}%`;
    batteryTextEl.textContent = `${level}%`;
    if (battery.charging) {
      batteryContainer.classList.add("charging");
    } else {
      batteryContainer.classList.remove("charging");
    }
  }

  function handleBatteryChange(battery) {
    updateBatteryDisplay(battery);
    const level = battery.level;
    if (!battery.charging) {
      if (level <= 0.4 && lastKnownBatteryLevel > 0.4 && !alertFlags.hasShown40) {
        showBatteryAlert("img/Battery-Alert.jpg", "有点饿了，可以去找充电器惹");
        alertFlags.hasShown40 = true;
      }
      if (level <= 0.2 && lastKnownBatteryLevel > 0.2 && !alertFlags.hasShown20) {
        showBatteryAlert("img/Battery-Alert2.jpg", "赶紧的充电，要饿死了");
        alertFlags.hasShown20 = true;
      }
      if (level <= 0.1 && lastKnownBatteryLevel > 0.1 && !alertFlags.hasShown10) {
        showBatteryAlert("img/Battery-Alert3.jpg", "已阵亡，还有30秒爆炸");
        alertFlags.hasShown10 = true;
      }
    }
    if (level > 0.4) alertFlags.hasShown40 = false;
    if (level > 0.2) alertFlags.hasShown20 = false;
    if (level > 0.1) alertFlags.hasShown10 = false;
    lastKnownBatteryLevel = level;
  }

  async function initBatteryManager() {
    if ("getBattery" in navigator) {
      try {
        const battery = await navigator.getBattery();
        lastKnownBatteryLevel = battery.level;
        handleBatteryChange(battery);
        battery.addEventListener("levelchange", () => handleBatteryChange(battery));
        battery.addEventListener("chargingchange", () => {
          handleBatteryChange(battery);
          if (battery.charging) {
            showBatteryAlert("img/Battery-Alert4.jpg", "窝爱泥，电量吃饱饱");
          }
        });
      } catch (err) {
        console.error("无法获取电池信息:", err);
        document.querySelector(".battery-text").textContent = "ᗜωᗜ";
      }
    } else {
      console.log("浏览器不支持电池状态API。");
      document.querySelector(".battery-text").textContent = "ᗜωᗜ";
    }
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

  // ▼▼▼ 【全新】红包功能核心函数 ▼▼▼

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
  // ▲▲▲ 替换结束 ▲▲▲

  // 绑定关闭详情按钮的事件
  document.getElementById("close-rp-details-btn").addEventListener("click", () => {
    document.getElementById("red-packet-details-modal").classList.remove("visible");
  });

  // 供全局调用的函数，以便红包卡片上的 onclick 能找到它
  window.handlePacketClick = handlePacketClick;

  // ▲▲▲ 替换结束 ▲▲▲

  // ▼▼▼ 【全新】投票功能核心函数 ▼▼▼

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

  // ▲▲▲ 新函数粘贴结束 ▲▲▲

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

  // ▼▼▼ 用这块【最终确认版】的代码，替换旧的 openBrowser 和 closeBrowser 函数 ▼▼▼

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

  // ▲▲▲ 替换结束 ▲▲▲

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

  // ▼▼▼ 在此处粘贴新函数 ▼▼▼
  /**
   * 从用户指定的API端点获取模型列表并填充到下拉框中
   */
  async function fetchModels() {
    const fetchBtn = document.getElementById("config-fetch-models-btn");
    const urlInput = document.getElementById("config-url-input");
    const keyInput = document.getElementById("config-key-input");
    const selectEl = document.getElementById("config-model-select");

    const apiUrl = urlInput.value.trim();
    const apiKey = keyInput.value.trim();

    if (!apiUrl || !apiKey) {
      alert("请先填写有效的反代地址和密钥！");
      return;
    }

    const originalText = fetchBtn.textContent;
    fetchBtn.disabled = true;
    fetchBtn.textContent = "正在拉取...";

    try {
      const response = await fetch(`${apiUrl}/v1/models`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API错误 (${response.status}): ${errorData.error?.message || "未知错误"}`);
      }

      const data = await response.json();
      const models = data.data; // 通常模型列表在 'data' 字段下

      if (!Array.isArray(models) || models.length === 0) {
        throw new Error("API返回的数据中未找到有效的模型列表。");
      }

      selectEl.innerHTML = ""; // 清空现有选项
      models.forEach((model) => {
        const option = document.createElement("option");
        option.value = model.id;
        option.textContent = model.id;
        selectEl.appendChild(option);
      });

      alert(`成功拉取到 ${models.length} 个模型！`);
    } catch (error) {
      console.error("拉取模型列表失败:", error);
      alert(`拉取模型列表失败：\n${error.message}\n\n请检查反代地址、密钥以及网络连接是否正确。`);
    } finally {
      fetchBtn.disabled = false;
      fetchBtn.textContent = originalText;
    }
  }
  // ▲▲▲ 新函数粘贴结束 ▲▲▲

  // ===================================================================
  // 4. 初始化函数 init()
  // ===================================================================
  async function init() {
    // ==================== 工具函数和常量 ====================
    const $ = (id) => document.getElementById(id);
    const $$ = (selector) => document.querySelectorAll(selector);
    const toggleModal = (id, show) => $(id)?.classList.toggle("visible", show);

    const fileToDataUrl = (file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

    // ==================== 初始化主题和样式 ====================
    const savedTheme = localStorage.getItem("ephone-theme") || "light";
    applyTheme(savedTheme);

    ["custom-bubble-style", "preview-bubble-style"].forEach((id) => {
      const tag = document.createElement("style");
      tag.id = id;
      document.head.appendChild(tag);
    });

    const clearBubbleStyles = () => {
      applyScopedCss("", "#chat-messages", "custom-bubble-style");
      applyScopedCss("", "#settings-preview-area", "preview-bubble-style");
    };
    clearBubbleStyles();

    // ==================== 全局对象挂载 ====================
    Object.assign(window, {
      showScreen,
      renderChatListProxy: renderChatList,
      renderApiSettingsProxy: renderApiSettings,
      renderWallpaperScreenProxy: renderWallpaperScreen,
      renderWorldBookScreenProxy: renderWorldBookScreen,
    });

    // ==================== 数据加载 ====================
    await loadAllDataFromDB();

    const storedCount = parseInt(localStorage.getItem("unreadPostsCount")) || 0;
    updateUnreadIndicator(storedCount);

    if (state.globalSettings?.fontUrl) {
      applyCustomFont(state.globalSettings.fontUrl);
    }

    // ==================== 时钟和界面初始化 ====================
    updateClock();
    setInterval(updateClock, 30000);
    [applyGlobalWallpaper, initBatteryManager, applyAppIcons].forEach((fn) => fn());

    // ==================== 应用图标点击事件 ====================
    $("app-grid").addEventListener("click", (e) => {
      const appIcon = e.target.closest(".app-icon");
      if (appIcon?.dataset.screen) {
        showScreen(appIcon.dataset.screen);
      }
    });

    // ==================== 简单按钮事件批量绑定 ====================
    const simpleEvents = {
      "custom-modal-cancel": hideCustomModal,
      "export-data-btn": exportBackup,
      "import-btn": () => $("import-data-input").click(),
      "transfer-cancel-btn": () => toggleModal("transfer-modal", false),
      "transfer-confirm-btn": sendUserTransfer,
      "wait-reply-btn": handleWaitReplyClick,
      "close-playlist-btn": () => toggleModal("music-playlist-panel", false),
      "add-song-url-btn": addSongFromURL,
      "add-song-local-btn": () => $("local-song-upload-input").click(),
      "cancel-create-post-btn": () => toggleModal("create-post-modal", false),
      "post-upload-local-btn": () => $("post-local-image-input").click(),
      "cancel-create-countdown-btn": () => toggleModal("create-countdown-modal", false),
      "cancel-red-packet-btn": () => toggleModal("red-packet-modal", false),
      "send-group-packet-btn": sendGroupRedPacket,
      "send-direct-packet-btn": sendDirectRedPacket,
      "cancel-persona-editor-btn": closePersonaEditor,
      "save-persona-preset-btn": savePersonaPreset,
      "preset-action-edit": openPersonaEditorForEdit,
      "preset-action-delete": deletePersonaPreset,
      "preset-action-cancel": hidePresetActions,
      "selection-cancel-btn": exitSelectionMode,
      "cancel-message-action-btn": hideMessageActions,
      "edit-message-btn": openAdvancedMessageEditor,
      "copy-message-btn": copyMessageContent,
      "recall-message-btn": handleRecallClick,
      "cancel-post-action-btn": hidePostActions,
      "edit-post-btn": openPostEditor,
      "copy-post-btn": copyPostContent,
      "cancel-contact-picker-btn": () => showScreen("chat-list-screen"),
      "manage-members-btn": () => {
        toggleModal("chat-settings-modal", false);
        openMemberManagementScreen();
      },
      "back-from-member-management": () => {
        showScreen("chat-interface-screen");
        $("chat-settings-btn").click();
      },
      "add-existing-contact-btn": async () => {
        const confirmBtn = $("confirm-contact-picker-btn");
        const newBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
        newBtn.addEventListener("click", handleAddMembersToGroup);
        await openContactPickerForAddMember();
      },
      "create-new-member-btn": createNewMemberInGroup,
      "video-call-btn": handleInitiateCall,
      "group-video-call-btn": handleInitiateCall,
      "hang-up-btn": endVideoCall,
      "cancel-call-btn": () => {
        videoCallState.isAwaitingResponse = false;
        showScreen("chat-interface-screen");
      },
      "join-call-btn": handleUserJoinCall,
      "send-poll-btn": openCreatePollModal,
      "add-poll-option-btn": addPollOptionInput,
      "cancel-create-poll-btn": () => toggleModal("create-poll-modal", false),
      "confirm-create-poll-btn": sendPoll,
      "manage-ai-avatar-library-btn": openAiAvatarLibraryModal,
      "add-ai-avatar-btn": addAvatarToLibrary,
      "close-ai-avatar-library-btn": closeAiAvatarLibraryModal,
      "share-link-btn": openShareLinkModal,
      "cancel-share-link-btn": () => toggleModal("share-link-modal", false),
      "confirm-share-link-btn": sendUserLinkShare,
      "quote-message-btn": startReplyToMessage,
      "cancel-reply-btn": cancelReplyMode,
      "transfer-action-accept": () => handleUserTransferResponse("accepted"),
      "transfer-action-decline": () => handleUserTransferResponse("declined"),
      "transfer-action-cancel": hideTransferActionModal,
      "close-transcript-modal-btn": () => toggleModal("call-transcript-modal", false),
      "browser-back-btn": () => showScreen("chat-interface-screen"),
      "manage-groups-btn": openGroupManager,
      "close-group-manager-btn": () => {
        toggleModal("group-management-modal", false);
        if ($("chat-settings-modal").classList.contains("visible")) {
          $("chat-settings-btn").click();
        }
      },
      "add-new-group-btn": addNewGroup,
      "manage-world-book-categories-btn": openCategoryManager,
      "close-category-manager-btn": () => {
        toggleModal("world-book-category-manager-modal", false);
        renderWorldBookScreen();
      },
      "add-new-category-btn": addNewCategory,
      "selection-favorite-btn": async () => {
        if (selectedMessages.size === 0) return;
        const chat = state.chats[state.activeChatId];
        if (!chat) return;

        const favoritesToAdd = [];
        for (const timestamp of selectedMessages) {
          const existing = await db.favorites.where("originalTimestamp").equals(timestamp).first();
          if (!existing) {
            const messageToSave = chat.history.find((m) => m.timestamp === timestamp);
            if (messageToSave) {
              favoritesToAdd.push({
                type: "chat_message",
                content: messageToSave,
                chatId: state.activeChatId,
                timestamp: Date.now(),
                originalTimestamp: messageToSave.timestamp,
              });
            }
          }
        }

        if (favoritesToAdd.length > 0) {
          await db.favorites.bulkAdd(favoritesToAdd);
          allFavoriteItems = await db.favorites.orderBy("timestamp").reverse().toArray();
          await showCustomAlert("收藏成功", `已成功收藏 ${favoritesToAdd.length} 条消息。`);
        } else {
          await showCustomAlert("提示", "选中的消息均已收藏过。");
        }
        exitSelectionMode();
      },
      "selection-share-btn": () => {
        if (selectedMessages.size > 0) openShareTargetPicker();
      },
      "cancel-share-target-btn": () => toggleModal("share-target-modal", false),
      "close-shared-history-viewer-btn": () => toggleModal("shared-history-viewer-modal", false),
    };

    Object.entries(simpleEvents).forEach(([id, handler]) => {
      $(id)?.addEventListener("click", handler);
    });

    $("add-new-config-btn").addEventListener("click", () => openApiConfigEditor());

    $("api-configs-list").addEventListener("click", async (e) => {
      const target = e.target;
      const item = target.closest(".api-config-item");
      if (!item) return;

      const configId = parseInt(item.dataset.configId);

      if (target.matches('input[type="radio"]')) {
        await setActiveApiConfig(configId);
      } else if (target.classList.contains("edit-btn")) {
        openApiConfigEditor(configId);
      } else if (target.classList.contains("delete-btn")) {
        const config = state.apiConfigs.find((c) => c.id === configId);
        const confirmed = await showCustomConfirm(
          "删除确认",
          `确定要删除配置 "${config.name}" 吗？`,
          { confirmButtonClass: "btn-danger" }
        );
        if (confirmed) {
          await db.apiConfigs.delete(configId);
          state.apiConfigs = state.apiConfigs.filter((c) => c.id !== configId);
          if (state.globalSettings.activeApiConfigId === configId) {
            state.globalSettings.activeApiConfigId = state.apiConfigs[0]?.id || null;
            await db.globalSettings.put(state.globalSettings);
          }
          renderApiSettings();
        }
      }
    });

    // ▼▼▼ 在这行下面添加新代码 ▼▼▼
    $("config-fetch-models-btn").addEventListener("click", fetchModels);
    // ▲▲▲ 添加结束 ▲▲▲

    $("cancel-config-editor-btn").addEventListener("click", () => {
      document.getElementById("api-config-editor-modal").classList.remove("visible");
    });

    $("save-config-btn").addEventListener("click", saveApiConfig);

    // ==================== 模态框覆盖层点击 ====================
    $("custom-modal-overlay").addEventListener("click", (e) => {
      if (e.target === modalOverlay) hideCustomModal();
    });

    // ==================== 文件输入事件 ====================
    $("import-data-input").addEventListener("change", (e) => importBackup(e.target.files[0]));
    $("local-song-upload-input").addEventListener("change", addSongFromLocal);
    $("sticker-upload-input").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const base64Url = await fileToDataUrl(file);
      const name = await showCustomPrompt("命名表情", "请为这个表情命名 (例如：好耶、疑惑)");
      if (name?.trim()) {
        const newSticker = {
          id: "sticker_" + Date.now(),
          url: base64Url,
          name: name.trim(),
        };
        await db.userStickers.add(newSticker);
        state.userStickers.push(newSticker);
        renderStickerPanel();
      } else if (name !== null) {
        alert("表情名不能为空！");
      }
      e.target.value = null;
    });

    // ==================== 返回聊天列表 ====================
    $("back-to-list-btn").addEventListener("click", () => {
      clearBubbleStyles();
      exitSelectionMode();
      state.activeChatId = null;
      showScreen("chat-list-screen");
    });

    // ==================== 创建新聊天 ====================
    $("add-chat-btn").addEventListener("click", async () => {
      const name = await showCustomPrompt("创建新聊天", "请输入Ta的名字");
      if (name?.trim()) {
        const newChatId = "chat_" + Date.now();
        const newChat = {
          id: newChatId,
          name: name.trim(),
          isGroup: false,
          relationship: {
            status: "friend",
            blockedTimestamp: null,
            applicationReason: "",
          },
          status: {
            text: "在线",
            lastUpdate: Date.now(),
            isBusy: false,
          },
          settings: {
            aiPersona: "你是谁呀。",
            myPersona: "我是谁呀。",
            maxMemory: 10,
            aiAvatar: defaultAvatar,
            myAvatar: defaultAvatar,
            background: "",
            theme: "default",
            fontSize: 13,
            customCss: "",
            linkedWorldBookIds: [],
            aiAvatarLibrary: [],
          },
          history: [],
          musicData: { totalTime: 0 },
        };
        state.chats[newChatId] = newChat;
        await db.chats.put(newChat);
        renderChatList();
      }
    });

    // ==================== 创建群聊 ====================
    $("add-group-chat-btn").addEventListener("click", openContactPickerForGroupCreate);

    // ==================== 音乐播放器事件 ====================
    const musicEvents = {
      "listen-together-btn": handleListenTogetherClick,
      "music-exit-btn": () => endListenTogetherSession(true),
      "music-return-btn": returnToChat,
      "music-play-pause-btn": togglePlayPause,
      "music-next-btn": playNext,
      "music-prev-btn": playPrev,
      "music-mode-btn": changePlayMode,
      "music-playlist-btn": () => {
        updatePlaylistUI();
        toggleModal("music-playlist-panel", true);
      },
    };

    Object.entries(musicEvents).forEach(([id, handler]) => {
      $(id).addEventListener("click", handler);
    });

    const audioPlayer = $("audio-player");
    audioPlayer.addEventListener("ended", playNext);
    audioPlayer.addEventListener("timeupdate", updateMusicProgressBar);
    ["pause", "play"].forEach((event) => {
      audioPlayer.addEventListener(event, () => {
        if (musicState.isActive) {
          musicState.isPlaying = event === "play";
          updatePlayerUI();
        }
      });
    });

    $("playlist-body").addEventListener("click", async (e) => {
      const target = e.target;
      if (target.classList.contains("delete-track-btn")) {
        const index = parseInt(target.dataset.index);
        const track = musicState.playlist[index];
        const confirmed = await showCustomConfirm(
          "删除歌曲",
          `确定要从播放列表中删除《${track.name}》吗？`
        );
        if (confirmed) deleteTrack(index);
        return;
      }
      if (target.classList.contains("lyrics-btn")) {
        const index = parseInt(target.dataset.index);
        if (isNaN(index)) return;
        const lrcContent = await new Promise((resolve) => {
          const lrcInput = $("lrc-upload-input");
          const handler = (event) => {
            const file = event.target.files[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (re) => resolve(re.target.result);
              reader.readAsText(file);
            } else {
              resolve(null);
            }
            lrcInput.removeEventListener("change", handler);
            lrcInput.value = "";
          };
          lrcInput.addEventListener("change", handler);
          lrcInput.click();
        });
        if (lrcContent !== null) {
          musicState.playlist[index].lrcContent = lrcContent;
          await saveGlobalPlaylist();
          alert("歌词导入成功！");
          if (musicState.currentIndex === index) {
            musicState.parsedLyrics = parseLRC(lrcContent);
            renderLyrics();
          }
        }
      }
    });

    document.querySelector(".progress-bar")?.addEventListener("click", (e) => {
      if (!audioPlayer.duration) return;
      const barWidth = e.currentTarget.clientWidth;
      audioPlayer.currentTime = (e.offsetX / barWidth) * audioPlayer.duration;
    });

    // ==================== 聊天输入事件 ====================
    const chatInput = $("chat-input");

    const sendMessage = async () => {
      const content = chatInput.value.trim();
      if (!content || !state.activeChatId) return;

      const chat = state.chats[state.activeChatId];
      const msg = {
        role: "user",
        content,
        timestamp: Date.now(),
        ...(currentReplyContext ? { quote: currentReplyContext } : {}),
      };

      chat.history.push(msg);
      await db.chats.put(chat);
      appendMessage(msg, chat);
      renderChatList();

      chatInput.value = "";
      chatInput.style.height = "auto";
      chatInput.focus();
      cancelReplyMode();
    };

    $("send-btn").addEventListener("click", sendMessage);

    chatInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    chatInput.addEventListener("input", () => {
      chatInput.style.height = "auto";
      chatInput.style.height = chatInput.scrollHeight + "px";
    });

    // ==================== 壁纸上传 ====================
    $("wallpaper-upload-input").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (file) {
        newWallpaperBase64 = await fileToDataUrl(file);
        renderWallpaperScreen();
      }
    });

    // ==================== 保存壁纸设置 ====================
    $("save-wallpaper-btn").addEventListener("click", async () => {
      let changesMade = false;
      if (newWallpaperBase64) {
        state.globalSettings.wallpaper = newWallpaperBase64;
        changesMade = true;
      }
      await db.globalSettings.put(state.globalSettings);
      if (changesMade) {
        applyGlobalWallpaper();
        newWallpaperBase64 = null;
      }
      applyAppIcons();
      alert("外观设置已保存并应用！");
      showScreen("home-screen");
    });

    // ==================== 世界书管理 ====================
    $("add-world-book-btn").addEventListener("click", async () => {
      const name = await showCustomPrompt("创建世界书", "请输入书名");
      if (name?.trim()) {
        const newBook = {
          id: "wb_" + Date.now(),
          name: name.trim(),
          content: "",
        };
        await db.worldBooks.add(newBook);
        state.worldBooks.push(newBook);
        renderWorldBookScreen();
        openWorldBookEditor(newBook.id);
      }
    });

    $("save-world-book-btn").addEventListener("click", async () => {
      if (!editingWorldBookId) return;
      const book = state.worldBooks.find((wb) => wb.id === editingWorldBookId);
      if (book) {
        const newName = $("world-book-name-input").value.trim();
        if (!newName) {
          alert("书名不能为空！");
          return;
        }
        book.name = newName;
        book.content = $("world-book-content-input").value;
        const categoryId = $("world-book-category-select").value;
        book.categoryId = categoryId ? parseInt(categoryId) : null;
        await db.worldBooks.put(book);
        $("world-book-editor-title").textContent = newName;
        editingWorldBookId = null;
        renderWorldBookScreen();
        showScreen("world-book-screen");
      }
    });

    // ==================== 聊天消息区域事件委托 ====================
    const chatMessagesHandlers = [
      {
        selector: ".ai-generated-image",
        handler: (el) => {
          const desc = el.dataset.description;
          if (desc) showCustomAlert("照片描述", desc);
        },
      },
      {
        selector: ".red-packet-card",
        handler: (el) => {
          const bubble = el.closest(".message-bubble");
          const ts = parseInt(bubble?.dataset.timestamp);
          if (!isNaN(ts)) handlePacketClick(ts);
        },
      },
      {
        selector: ".link-share-card[data-timestamp]",
        handler: (el) => {
          const ts = parseInt(el.dataset.timestamp);
          if (!isNaN(ts)) {
            el.closest(".is-link-share") ? openSharedHistoryViewer(ts) : openBrowser(ts);
          }
        },
      },
      {
        selector: "IMG[data-hidden-text]",
        handler: (el) => {
          showCustomAlert("图片内容", el.dataset.hiddenText.replace(/<br>/g, "\n"));
        },
      },
      {
        selector: ".voice-message-body",
        handler: (el) => {
          const bubble = el.closest(".message-bubble");
          if (!bubble || bubble.dataset.state === "loading") return;

          const spinner = el.querySelector(".loading-spinner");
          const transcriptEl = bubble.querySelector(".voice-transcript");

          if (bubble.dataset.state === "expanded") {
            transcriptEl.style.display = "none";
            bubble.dataset.state = "collapsed";
          } else {
            bubble.dataset.state = "loading";
            spinner.style.display = "block";

            setTimeout(() => {
              if (document.body.contains(bubble)) {
                const voiceText = bubble.dataset.voiceText || "(无法识别)";
                transcriptEl.textContent = voiceText;
                spinner.style.display = "none";
                transcriptEl.style.display = "block";
                bubble.dataset.state = "expanded";
              }
            }, 500);
          }
        },
      },
      {
        selector: ".recalled-message-placeholder",
        handler: (el) => {
          const chat = state.chats[state.activeChatId];
          const wrapper = el.closest(".message-wrapper");
          if (chat && wrapper) {
            const timestamp = parseInt(wrapper.dataset.timestamp);
            const recalledMsg = chat.history.find((m) => m.timestamp === timestamp);
            if (recalledMsg?.recalledData) {
              const recalled = recalledMsg.recalledData;
              const text =
                recalled.originalType === "text"
                  ? `原文: "${recalled.originalContent}"`
                  : `撤回了一条[${recalled.originalType}]类型的消息`;
              showCustomAlert("已撤回的消息", text);
            }
          }
        },
      },
      {
        selector: ".message-bubble.ai.is-transfer[data-status='pending']",
        handler: (el) => {
          const ts = parseInt(el.dataset.timestamp);
          if (!isNaN(ts)) showTransferActionModal(ts);
        },
      },
    ];

    $("chat-messages").addEventListener("click", (e) => {
      for (const { selector, handler } of chatMessagesHandlers) {
        const el = e.target.closest(selector);
        if (el) {
          handler(el);
          return;
        }
      }
    });

    // ==================== 世界书选择器 ====================
    const worldBookSelectBox = document.querySelector(".custom-multiselect .select-box");
    const worldBookCheckboxesContainer = $("world-book-checkboxes-container");

    function updateWorldBookSelectionDisplay() {
      const checkedBoxes = worldBookCheckboxesContainer.querySelectorAll("input:checked");
      const displayText = document.querySelector(".selected-options-text");
      if (checkedBoxes.length === 0) {
        displayText.textContent = "-- 点击选择 --";
      } else if (checkedBoxes.length > 2) {
        displayText.textContent = `已选择 ${checkedBoxes.length} 项`;
      } else {
        displayText.textContent = Array.from(checkedBoxes)
          .map((cb) => cb.parentElement.textContent.trim())
          .join(", ");
      }
    }

    worldBookSelectBox.addEventListener("click", (e) => {
      e.stopPropagation();
      worldBookCheckboxesContainer.classList.toggle("visible");
      worldBookSelectBox.classList.toggle("expanded");
    });

    worldBookCheckboxesContainer.addEventListener("change", updateWorldBookSelectionDisplay);

    window.addEventListener("click", (e) => {
      if (!document.querySelector(".custom-multiselect").contains(e.target)) {
        worldBookCheckboxesContainer.classList.remove("visible");
        worldBookSelectBox.classList.remove("expanded");
      }
    });

    // ==================== 聊天设置按钮 ====================
    $("chat-settings-btn").addEventListener("click", async () => {
      if (!state.activeChatId) return;
      const chat = state.chats[state.activeChatId];
      const isGroup = chat.isGroup;

      // 显示/隐藏相关控件
      const visibility = {
        "chat-name-group": "block",
        "my-persona-group": "block",
        "my-avatar-group": "block",
        "my-group-nickname-group": isGroup ? "block" : "none",
        "group-avatar-group": isGroup ? "block" : "none",
        "group-members-group": isGroup ? "block" : "none",
        "ai-persona-group": isGroup ? "none" : "block",
        "ai-avatar-group": isGroup ? "none" : "block",
        "assign-group-section": isGroup ? "none" : "block",
      };

      Object.entries(visibility).forEach(([id, display]) => {
        $(id).style.display = display;
      });

      // 加载表单数据
      $("chat-name-input").value = chat.name;
      $("my-persona").value = chat.settings.myPersona;
      $("my-avatar-preview").src =
        chat.settings.myAvatar || (isGroup ? defaultMyGroupAvatar : defaultAvatar);
      $("max-memory").value = chat.settings.maxMemory;

      const bgPreview = $("bg-preview");
      const removeBgBtn = $("remove-bg-btn");
      if (chat.settings.background) {
        bgPreview.src = chat.settings.background;
        bgPreview.style.display = "block";
        removeBgBtn.style.display = "inline-block";
      } else {
        bgPreview.style.display = "none";
        removeBgBtn.style.display = "none";
      }

      if (isGroup) {
        $("my-group-nickname-input").value = chat.settings.myNickname || "";
        $("group-avatar-preview").src = chat.settings.groupAvatar || defaultGroupAvatar;
        renderGroupMemberSettings(chat.members);
      } else {
        $("ai-persona").value = chat.settings.aiPersona;
        $("ai-avatar-preview").src = chat.settings.aiAvatar || defaultAvatar;

        const select = $("assign-group-select");
        select.innerHTML = '<option value="">未分组</option>';
        const groups = await db.qzoneGroups.toArray();
        groups.forEach((group) => {
          const option = document.createElement("option");
          option.value = group.id;
          option.textContent = group.name;
          if (chat.groupId === group.id) option.selected = true;
          select.appendChild(option);
        });
      }

      // 加载世界书
      worldBookCheckboxesContainer.innerHTML = "";
      const linkedIds = new Set(chat.settings.linkedWorldBookIds || []);
      const categories = await db.worldBookCategories.toArray();
      const books = state.worldBooks;

      const hasUncategorized = books.some((book) => !book.categoryId);
      if (hasUncategorized) {
        categories.push({ id: "uncategorized", name: "未分类" });
      }

      const booksByCategoryId = books.reduce((acc, book) => {
        const categoryId = book.categoryId || "uncategorized";
        if (!acc[categoryId]) acc[categoryId] = [];
        acc[categoryId].push(book);
        return acc;
      }, {});

      categories.forEach((category) => {
        const booksInCategory = booksByCategoryId[category.id] || [];
        if (booksInCategory.length > 0) {
          const allInCategoryChecked = booksInCategory.every((book) => linkedIds.has(book.id));
          const header = document.createElement("div");
          header.className = "wb-category-header collapsed";
          header.innerHTML = `
          <span class="arrow">▼</span>
          <input type="checkbox" class="wb-category-checkbox" data-category-id="${category.id}" ${
            allInCategoryChecked ? "checked" : ""
          }>
          <span>${category.name}</span>
        `;

          const bookContainer = document.createElement("div");
          bookContainer.className = "wb-book-container collapsed";
          bookContainer.dataset.containerFor = category.id;

          booksInCategory.forEach((book) => {
            const label = document.createElement("label");
            label.innerHTML = `<input type="checkbox" class="wb-book-checkbox" value="${
              book.id
            }" data-parent-category="${category.id}" ${linkedIds.has(book.id) ? "checked" : ""}> ${
              book.name
            }`;
            bookContainer.appendChild(label);
          });

          worldBookCheckboxesContainer.appendChild(header);
          worldBookCheckboxesContainer.appendChild(bookContainer);
        }
      });

      updateWorldBookSelectionDisplay();

      // 世界书事件委托
      worldBookCheckboxesContainer.addEventListener("click", (e) => {
        const header = e.target.closest(".wb-category-header");
        if (header && !e.target.matches('input[type="checkbox"]')) {
          const categoryId = header.querySelector(".wb-category-checkbox")?.dataset.categoryId;
          if (categoryId) {
            const bookContainer = worldBookCheckboxesContainer.querySelector(
              `.wb-book-container[data-container-for="${categoryId}"]`
            );
            if (bookContainer) {
              header.classList.toggle("collapsed");
              bookContainer.classList.toggle("collapsed");
            }
          }
        }
      });

      worldBookCheckboxesContainer.addEventListener("change", (e) => {
        const target = e.target;
        if (target.classList.contains("wb-category-checkbox")) {
          const categoryId = target.dataset.categoryId;
          const isChecked = target.checked;
          const bookCheckboxes = worldBookCheckboxesContainer.querySelectorAll(
            `input.wb-book-checkbox[data-parent-category="${categoryId}"]`
          );
          bookCheckboxes.forEach((cb) => (cb.checked = isChecked));
        }

        if (target.classList.contains("wb-book-checkbox")) {
          const categoryId = target.dataset.parentCategory;
          if (categoryId) {
            const categoryCheckbox = worldBookCheckboxesContainer.querySelector(
              `input.wb-category-checkbox[data-category-id="${categoryId}"]`
            );
            const allBookCheckboxes = worldBookCheckboxesContainer.querySelectorAll(
              `input.wb-book-checkbox[data-parent-category="${categoryId}"]`
            );
            const allChecked = Array.from(allBookCheckboxes).every((cb) => cb.checked);
            categoryCheckbox.checked = allChecked;
          }
        }

        updateWorldBookSelectionDisplay();
      });

      // 加载预览设置
      const themeRadio = document.querySelector(
        `input[name="theme-select"][value="${chat.settings.theme || "default"}"]`
      );
      if (themeRadio) themeRadio.checked = true;

      const fontSizeSlider = $("font-size-slider");
      fontSizeSlider.value = chat.settings.fontSize || 13;
      $("font-size-value").textContent = `${fontSizeSlider.value}px`;
      $("custom-css-input").value = chat.settings.customCss || "";

      updateSettingsPreview();
      toggleModal("chat-settings-modal", true);
    });

    // ==================== 群成员设置 ====================
    function renderGroupMemberSettings(members) {
      const container = $("group-members-settings");
      container.innerHTML = "";
      members.forEach((member) => {
        const div = document.createElement("div");
        div.className = "member-editor";
        div.dataset.memberId = member.id;
        div.innerHTML = `<img src="${member.avatar}" alt="${member.groupNickname}"><div class="member-name">${member.groupNickname}</div>`;
        div.addEventListener("click", () => openMemberEditor(member.id));
        container.appendChild(div);
      });
    }

    function openMemberEditor(memberId) {
      editingMemberId = memberId;
      const chat = state.chats[state.activeChatId];
      const member = chat.members.find((m) => m.id === memberId);
      $("member-name-input").value = member.groupNickname;
      $("member-persona-input").value = member.persona;
      $("member-avatar-preview").src = member.avatar;
      toggleModal("member-settings-modal", true);
    }

    $("cancel-member-settings-btn").addEventListener("click", () => {
      toggleModal("member-settings-modal", false);
      editingMemberId = null;
    });

    $("save-member-settings-btn").addEventListener("click", () => {
      if (!editingMemberId) return;
      const chat = state.chats[state.activeChatId];
      const member = chat.members.find((m) => m.id === editingMemberId);
      const newNickname = $("member-name-input").value.trim();
      if (!newNickname) {
        alert("群昵称不能为空！");
        return;
      }
      member.groupNickname = newNickname;
      member.persona = $("member-persona-input").value;
      member.avatar = $("member-avatar-preview").src;
      renderGroupMemberSettings(chat.members);
      toggleModal("member-settings-modal", false);
    });

    // ==================== 聊天设置保存 ====================
    $("reset-theme-btn").addEventListener("click", () => {
      $("theme-default").checked = true;
    });

    $("cancel-chat-settings-btn").addEventListener("click", () => {
      toggleModal("chat-settings-modal", false);
    });

    $("save-chat-settings-btn").addEventListener("click", async () => {
      if (!state.activeChatId) return;
      const chat = state.chats[state.activeChatId];
      const newName = $("chat-name-input").value.trim();
      if (!newName) return alert("备注名/群名不能为空！");

      chat.name = newName;
      const selectedThemeRadio = document.querySelector('input[name="theme-select"]:checked');
      chat.settings.theme = selectedThemeRadio ? selectedThemeRadio.value : "default";
      chat.settings.fontSize = parseInt($("font-size-slider").value);
      chat.settings.customCss = $("custom-css-input").value.trim();
      chat.settings.myPersona = $("my-persona").value;
      chat.settings.myAvatar = $("my-avatar-preview").src;

      const checkedBooks = $$("#world-book-checkboxes-container input.wb-book-checkbox:checked");
      chat.settings.linkedWorldBookIds = Array.from(checkedBooks).map((cb) => cb.value);

      if (chat.isGroup) {
        chat.settings.myNickname = $("my-group-nickname-input").value.trim();
        chat.settings.groupAvatar = $("group-avatar-preview").src;
      } else {
        chat.settings.aiPersona = $("ai-persona").value;
        chat.settings.aiAvatar = $("ai-avatar-preview").src;
        const selectedGroupId = $("assign-group-select").value;
        chat.groupId = selectedGroupId ? parseInt(selectedGroupId) : null;
      }

      chat.settings.maxMemory = parseInt($("max-memory").value) || 10;
      await db.chats.put(chat);

      applyScopedCss(chat.settings.customCss, "#chat-messages", "custom-bubble-style");
      toggleModal("chat-settings-modal", false);
      renderChatInterface(state.activeChatId);
      renderChatList();
    });

    $("clear-chat-btn").addEventListener("click", async () => {
      if (!state.activeChatId) return;
      const chat = state.chats[state.activeChatId];
      const confirmed = await showCustomConfirm(
        "清空聊天记录",
        "此操作将永久删除此聊天的所有消息，无法恢复。确定要清空吗？",
        { confirmButtonClass: "btn-danger" }
      );
      if (confirmed) {
        chat.history = [];
        await db.chats.put(chat);
        renderChatInterface(state.activeChatId);
        renderChatList();
        toggleModal("chat-settings-modal", false);
      }
    });

    // ==================== 文件上传统一处理 ====================
    const setupFileUpload = (inputId, callback) => {
      $(inputId)?.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (file) {
          const dataUrl = await fileToDataUrl(file);
          callback(dataUrl);
          e.target.value = null;
        }
      });
    };

    const avatarUploads = {
      "ai-avatar-input": (url) => ($("ai-avatar-preview").src = url),
      "my-avatar-input": (url) => ($("my-avatar-preview").src = url),
      "group-avatar-input": (url) => ($("group-avatar-preview").src = url),
      "member-avatar-input": (url) => ($("member-avatar-preview").src = url),
      "preset-avatar-input": (url) => ($("preset-avatar-preview").src = url),
      "bg-input": (url) => {
        if (state.activeChatId) {
          state.chats[state.activeChatId].settings.background = url;
          const bgPreview = $("bg-preview");
          bgPreview.src = url;
          bgPreview.style.display = "block";
          $("remove-bg-btn").style.display = "inline-block";
        }
      },
    };

    Object.entries(avatarUploads).forEach(([id, cb]) => setupFileUpload(id, cb));

    $("remove-bg-btn").addEventListener("click", () => {
      if (state.activeChatId) {
        state.chats[state.activeChatId].settings.background = "";
        const bgPreview = $("bg-preview");
        bgPreview.src = "";
        bgPreview.style.display = "none";
        $("remove-bg-btn").style.display = "none";
      }
    });

    // ==================== 表情包面板 ====================
    const stickerPanel = $("sticker-panel");
    $("open-sticker-panel-btn").addEventListener("click", () => {
      renderStickerPanel();
      toggleModal("sticker-panel", true);
    });

    $("close-sticker-panel-btn").addEventListener("click", () =>
      toggleModal("sticker-panel", false)
    );

    $("add-sticker-btn").addEventListener("click", async () => {
      const url = await showCustomPrompt("添加表情(URL)", "请输入表情包的图片URL");
      if (!url || !url.trim().startsWith("http")) {
        if (url) alert("请输入有效的URL (以http开头)");
        return;
      }
      const name = await showCustomPrompt("命名表情", "请为这个表情命名 (例如：开心、疑惑)");
      if (name?.trim()) {
        const newSticker = {
          id: "sticker_" + Date.now(),
          url: url.trim(),
          name: name.trim(),
        };
        await db.userStickers.add(newSticker);
        state.userStickers.push(newSticker);
        renderStickerPanel();
      } else if (name !== null) {
        alert("表情名不能为空！");
      }
    });

    $("upload-sticker-btn").addEventListener("click", () => $("sticker-upload-input").click());

    // ==================== 图片和语音消息 ====================
    $("upload-image-btn").addEventListener("click", () => $("image-upload-input").click());

    $("image-upload-input").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file || !state.activeChatId) return;
      const base64Url = await fileToDataUrl(file);
      const chat = state.chats[state.activeChatId];
      const msg = {
        role: "user",
        content: [{ type: "image_url", image_url: { url: base64Url } }],
        timestamp: Date.now(),
      };
      chat.history.push(msg);
      await db.chats.put(chat);
      appendMessage(msg, chat);
      renderChatList();
      e.target.value = null;
    });

    $("voice-message-btn").addEventListener("click", async () => {
      if (!state.activeChatId) return;
      const text = await showCustomPrompt("发送语音", "请输入你想说的内容：");
      if (text?.trim()) {
        const chat = state.chats[state.activeChatId];
        const msg = {
          role: "user",
          type: "voice_message",
          content: text.trim(),
          timestamp: Date.now(),
        };
        chat.history.push(msg);
        await db.chats.put(chat);
        appendMessage(msg, chat);
        renderChatList();
      }
    });

    $("send-photo-btn").addEventListener("click", async () => {
      if (!state.activeChatId) return;
      const description = await showCustomPrompt("发送照片", "请用文字描述您要发送的照片：");
      if (description?.trim()) {
        const chat = state.chats[state.activeChatId];
        const msg = {
          role: "user",
          type: "user_photo",
          content: description.trim(),
          timestamp: Date.now(),
        };
        chat.history.push(msg);
        await db.chats.put(chat);
        appendMessage(msg, chat);
        renderChatList();
      }
    });

    // ==================== 外卖请求 ====================
    const waimaiModal = $("waimai-request-modal");
    $("send-waimai-request-btn").addEventListener("click", () =>
      toggleModal("waimai-request-modal", true)
    );
    $("waimai-cancel-btn").addEventListener("click", () =>
      toggleModal("waimai-request-modal", false)
    );

    $("waimai-confirm-btn").addEventListener("click", async () => {
      if (!state.activeChatId) return;

      const productInfo = $("waimai-product-info").value.trim();
      const amount = parseFloat($("waimai-amount").value);

      if (!productInfo) return alert("请输入商品信息！");
      if (isNaN(amount) || amount <= 0) return alert("请输入有效的代付金额！");

      const chat = state.chats[state.activeChatId];
      const myNickname = chat.isGroup ? chat.settings.myNickname || "我" : "我";

      const msg = {
        role: "user",
        senderName: myNickname,
        type: "waimai_request",
        productInfo,
        amount,
        status: "pending",
        countdownEndTime: Date.now() + 15 * 60 * 1000,
        timestamp: Date.now(),
      };

      chat.history.push(msg);
      await db.chats.put(chat);
      appendMessage(msg, chat);
      renderChatList();

      $("waimai-product-info").value = "";
      $("waimai-amount").value = "";
      toggleModal("waimai-request-modal", false);
    });

    // ==================== 人设库 ====================
    $("open-persona-library-btn").addEventListener("click", openPersonaLibrary);
    $("close-persona-library-btn").addEventListener("click", closePersonaLibrary);
    $("add-persona-preset-btn").addEventListener("click", openPersonaEditorForCreate);

    // ==================== 消息多选删除 ====================
    $("selection-delete-btn").addEventListener("click", async () => {
      if (selectedMessages.size === 0) return;
      const confirmed = await showCustomConfirm(
        "删除消息",
        `确定要删除选中的 ${selectedMessages.size} 条消息吗？这将改变AI的记忆。`,
        { confirmButtonClass: "btn-danger" }
      );
      if (confirmed) {
        const chat = state.chats[state.activeChatId];
        let deletedPollsInfo = [];

        for (const timestamp of selectedMessages) {
          const msg = chat.history.find((m) => m.timestamp === timestamp);
          if (msg?.type === "poll") {
            deletedPollsInfo.push(`关于"${msg.question}"的投票(时间戳: ${msg.timestamp})`);
          }
        }

        chat.history = chat.history.filter((msg) => !selectedMessages.has(msg.timestamp));

        let forgetReason = "一些之前的消息已被用户删除。";
        if (deletedPollsInfo.length > 0) {
          forgetReason += ` 其中包括以下投票：${deletedPollsInfo.join("；")}。`;
        }
        forgetReason +=
          " 你应该像它们从未存在过一样继续对话，并相应地调整你的记忆和行为，不要再提及这些被删除的内容。";

        const forgetInstruction = {
          role: "system",
          content: `[系统提示：${forgetReason}]`,
          timestamp: Date.now(),
          isHidden: true,
        };
        chat.history.push(forgetInstruction);
        await db.chats.put(chat);

        renderChatInterface(state.activeChatId);
        renderChatList();
      }
    });

    $("select-message-btn").addEventListener("click", () => {
      const timestampToSelect = activeMessageTimestamp;
      hideMessageActions();
      if (timestampToSelect) enterSelectionMode(timestampToSelect);
    });

    // ==================== 字体设置 ====================
    const fontUrlInput = $("font-url-input");
    fontUrlInput.addEventListener("input", () => applyCustomFont(fontUrlInput.value.trim(), true));

    $("save-font-btn").addEventListener("click", async () => {
      const newFontUrl = fontUrlInput.value.trim();
      if (!newFontUrl) {
        alert("请输入有效的字体URL。");
        return;
      }
      applyCustomFont(newFontUrl, false);
      state.globalSettings.fontUrl = newFontUrl;
      await db.globalSettings.put(state.globalSettings);
      alert("字体已保存并应用！");
    });

    $("reset-font-btn").addEventListener("click", resetToDefaultFont);

    // ==================== 空间相关 ====================
    $$("#chat-list-bottom-nav .nav-item").forEach((item) => {
      item.addEventListener("click", () => switchToChatListView(item.dataset.view));
    });

    $("qzone-back-btn").addEventListener("click", () => switchToChatListView("messages-view"));
    $("favorites-back-btn").addEventListener("click", () => switchToChatListView("messages-view"));

    $("qzone-nickname").addEventListener("click", async () => {
      const newNickname = await showCustomPrompt(
        "修改昵称",
        "请输入新的昵称",
        state.qzoneSettings.nickname
      );
      if (newNickname?.trim()) {
        state.qzoneSettings.nickname = newNickname.trim();
        await saveQzoneSettings();
        renderQzoneScreen();
      }
    });

    $("qzone-avatar-container").addEventListener("click", () => $("qzone-avatar-input").click());
    $("qzone-banner-container").addEventListener("click", () => $("qzone-banner-input").click());

    $("qzone-avatar-input").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (file) {
        const dataUrl = await fileToDataUrl(file);
        state.qzoneSettings.avatar = dataUrl;
        await saveQzoneSettings();
        renderQzoneScreen();
      }
      e.target.value = null;
    });

    $("qzone-banner-input").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (file) {
        const dataUrl = await fileToDataUrl(file);
        state.qzoneSettings.banner = dataUrl;
        await saveQzoneSettings();
        renderQzoneScreen();
      }
      e.target.value = null;
    });

    // ==================== 动态发布 ====================
    $("create-shuoshuo-btn").addEventListener("click", async () => {
      resetCreatePostModal();
      const modal = $("create-post-modal");
      modal.dataset.mode = "shuoshuo";
      modal.querySelector(".post-mode-switcher").style.display = "none";
      modal.querySelector("#image-mode-content").style.display = "none";
      modal.querySelector("#text-image-mode-content").style.display = "none";
      modal.querySelector("#post-public-text").placeholder = "分享新鲜事...";

      const visibilityGroupsContainer = $("post-visibility-groups");
      visibilityGroupsContainer.innerHTML = "";
      const groups = await db.qzoneGroups.toArray();
      if (groups.length > 0) {
        groups.forEach((group) => {
          const label = document.createElement("label");
          label.style.display = "block";
          label.innerHTML = `<input type="checkbox" name="visibility_group" value="${group.id}"> ${group.name}`;
          visibilityGroupsContainer.appendChild(label);
        });
      } else {
        visibilityGroupsContainer.innerHTML =
          '<p style="color: var(--text-secondary);">没有可用的分组</p>';
      }
      toggleModal("create-post-modal", true);
    });

    $("create-post-btn").addEventListener("click", async () => {
      resetCreatePostModal();
      const modal = $("create-post-modal");
      modal.dataset.mode = "complex";
      modal.querySelector(".post-mode-switcher").style.display = "flex";
      modal.querySelector("#image-mode-content").classList.add("active");
      modal.querySelector("#text-image-mode-content").classList.remove("active");
      modal.querySelector("#post-public-text").placeholder = "分享新鲜事...（非必填的公开文字）";

      const visibilityGroupsContainer = $("post-visibility-groups");
      visibilityGroupsContainer.innerHTML = "";
      const groups = await db.qzoneGroups.toArray();
      if (groups.length > 0) {
        groups.forEach((group) => {
          const label = document.createElement("label");
          label.style.display = "block";
          label.innerHTML = `<input type="checkbox" name="visibility_group" value="${group.id}"> ${group.name}`;
          visibilityGroupsContainer.appendChild(label);
        });
      } else {
        visibilityGroupsContainer.innerHTML =
          '<p style="color: var(--text-secondary);">没有可用的分组</p>';
      }
      toggleModal("create-post-modal", true);
    });

    // ==================== 相册 ====================
    $("open-album-btn").addEventListener("click", async () => {
      await renderAlbumList();
      showScreen("album-screen");
    });

    $("album-back-btn").addEventListener("click", () => {
      showScreen("chat-list-screen");
      switchToChatListView("qzone-screen");
    });

    $("album-photos-back-btn").addEventListener("click", () => {
      state.activeAlbumId = null;
      showScreen("album-screen");
    });

    $("album-upload-photo-btn").addEventListener("click", () => $("album-photo-input").click());

    $("album-photo-input").addEventListener("change", async (e) => {
      if (!state.activeAlbumId) return;
      const files = e.target.files;
      if (!files.length) return;

      const album = await db.qzoneAlbums.get(state.activeAlbumId);

      for (const file of files) {
        const dataUrl = await fileToDataUrl(file);
        await db.qzonePhotos.add({
          albumId: state.activeAlbumId,
          url: dataUrl,
          createdAt: Date.now(),
        });
      }

      const photoCount = await db.qzonePhotos.where("albumId").equals(state.activeAlbumId).count();
      const updateData = { photoCount };

      if (!album.photoCount || album.coverUrl.includes("placeholder")) {
        const firstPhoto = await db.qzonePhotos
          .where("albumId")
          .equals(state.activeAlbumId)
          .first();
        if (firstPhoto) updateData.coverUrl = firstPhoto.url;
      }

      await db.qzoneAlbums.update(state.activeAlbumId, updateData);
      await renderAlbumPhotosScreen();
      await renderAlbumList();

      e.target.value = null;
      alert("照片上传成功！");
    });

    $("photos-grid-page").addEventListener("click", async (e) => {
      const deleteBtn = e.target.closest(".photo-delete-btn");
      const photoThumb = e.target.closest(".photo-thumb");

      if (deleteBtn) {
        e.stopPropagation();
        const photoId = parseInt(deleteBtn.dataset.photoId);
        const confirmed = await showCustomConfirm(
          "删除照片",
          "确定要删除这张照片吗？此操作不可恢复。",
          { confirmButtonClass: "btn-danger" }
        );

        if (confirmed) {
          const deletedPhoto = await db.qzonePhotos.get(photoId);
          if (!deletedPhoto) return;

          await db.qzonePhotos.delete(photoId);

          const album = await db.qzoneAlbums.get(state.activeAlbumId);
          const photoCount = (album.photoCount || 1) - 1;
          const updateData = { photoCount };

          if (album.coverUrl === deletedPhoto.url) {
            const nextPhoto = await db.qzonePhotos
              .where("albumId")
              .equals(state.activeAlbumId)
              .first();
            updateData.coverUrl = nextPhoto ? nextPhoto.url : "img/Album-Cover-Placeholder.png";
          }

          await db.qzoneAlbums.update(state.activeAlbumId, updateData);
          await renderAlbumPhotosScreen();
          await renderAlbumList();
          alert("照片已删除。");
        }
      } else if (photoThumb) {
        openPhotoViewer(photoThumb.src);
      }
    });

    $("photo-viewer-close-btn").addEventListener("click", closePhotoViewer);
    $("photo-viewer-next-btn").addEventListener("click", showNextPhoto);
    $("photo-viewer-prev-btn").addEventListener("click", showPrevPhoto);

    document.addEventListener("keydown", (e) => {
      if (!photoViewerState.isOpen) return;
      if (e.key === "ArrowRight") showNextPhoto();
      else if (e.key === "ArrowLeft") showPrevPhoto();
      else if (e.key === "Escape") closePhotoViewer();
    });

    $("create-album-btn-page").addEventListener("click", async () => {
      const albumName = await showCustomPrompt("创建新相册", "请输入相册名称");
      if (albumName?.trim()) {
        const newAlbum = {
          name: albumName.trim(),
          coverUrl: "img/Album-Cover-Placeholder.png",
          photoCount: 0,
          createdAt: Date.now(),
        };
        await db.qzoneAlbums.add(newAlbum);
        await renderAlbumList();
        alert(`相册 "${albumName}" 创建成功！`);
      } else if (albumName !== null) {
        alert("相册名称不能为空！");
      }
    });

    // ==================== 动态图片上传 ====================
    $("post-local-image-input").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (file) {
        const dataUrl = await fileToDataUrl(file);
        $("post-image-preview").src = dataUrl;
        $("post-image-preview-container").classList.add("visible");
        $("post-image-desc-group").style.display = "block";
      }
    });

    $("post-use-url-btn").addEventListener("click", async () => {
      const url = await showCustomPrompt("输入图片URL", "请输入网络图片的链接", "", "url");
      if (url) {
        $("post-image-preview").src = url;
        $("post-image-preview-container").classList.add("visible");
        $("post-image-desc-group").style.display = "block";
      }
    });

    $("post-remove-image-btn").addEventListener("click", resetCreatePostModal);

    const imageModeBtn = $("switch-to-image-mode");
    const textImageModeBtn = $("switch-to-text-image-mode");
    const imageModeContent = $("image-mode-content");
    const textImageModeContent = $("text-image-mode-content");

    imageModeBtn.addEventListener("click", () => {
      imageModeBtn.classList.add("active");
      textImageModeBtn.classList.remove("active");
      imageModeContent.classList.add("active");
      textImageModeContent.classList.remove("active");
    });

    textImageModeBtn.addEventListener("click", () => {
      textImageModeBtn.classList.add("active");
      imageModeBtn.classList.remove("active");
      textImageModeContent.classList.add("active");
      imageModeContent.classList.remove("active");
    });

    // ==================== 发布动态 ====================
    $("confirm-create-post-btn").addEventListener("click", async () => {
      const modal = $("create-post-modal");
      const mode = modal.dataset.mode;

      const visibilityMode = document.querySelector('input[name="visibility"]:checked').value;
      let visibleGroupIds = null;

      if (visibilityMode === "include") {
        visibleGroupIds = Array.from($$('input[name="visibility_group"]:checked')).map((cb) =>
          parseInt(cb.value)
        );
      }

      let newPost = {};
      const basePostData = {
        timestamp: Date.now(),
        authorId: "user",
        visibleGroupIds,
      };

      if (mode === "shuoshuo") {
        const content = $("post-public-text").value.trim();
        if (!content) {
          alert("说说内容不能为空哦！");
          return;
        }
        newPost = {
          ...basePostData,
          type: "shuoshuo",
          content,
        };
      } else {
        const publicText = $("post-public-text").value.trim();
        const isImageModeActive = $("image-mode-content").classList.contains("active");

        if (isImageModeActive) {
          const imageUrl = $("post-image-preview").src;
          const imageDescription = $("post-image-description").value.trim();
          if (!imageUrl || !(imageUrl.startsWith("http") || imageUrl.startsWith("data:"))) {
            alert("请先添加一张图片再发布动态哦！");
            return;
          }
          if (!imageDescription) {
            alert("请为你的图片添加一个简单的描述（必填，给AI看的）！");
            return;
          }
          newPost = {
            ...basePostData,
            type: "image_post",
            publicText,
            imageUrl,
            imageDescription,
          };
        } else {
          const hiddenText = $("post-hidden-text").value.trim();
          if (!hiddenText) {
            alert("请输入文字图描述！");
            return;
          }
          newPost = {
            ...basePostData,
            type: "text_image",
            publicText,
            hiddenContent: hiddenText,
          };
        }
      }

      const newPostId = await db.qzonePosts.add(newPost);
      let postSummary =
        newPost.content ||
        newPost.publicText ||
        newPost.imageDescription ||
        newPost.hiddenContent ||
        "（无文字内容）";
      postSummary = postSummary.substring(0, 50) + (postSummary.length > 50 ? "..." : "");

      for (const chatId in state.chats) {
        const chat = state.chats[chatId];
        if (chat.isGroup) continue;

        let shouldNotify = false;
        const postVisibleGroups = newPost.visibleGroupIds;

        if (!postVisibleGroups || postVisibleGroups.length === 0) {
          shouldNotify = true;
        } else if (chat.groupId && postVisibleGroups.includes(chat.groupId)) {
          shouldNotify = true;
        }

        if (shouldNotify) {
          const historyMessage = {
            role: "system",
            content: `[系统提示：用户刚刚发布了一条动态(ID: ${newPostId})，内容摘要是："${postSummary}"。你现在可以对这条动态进行评论了。]`,
            timestamp: Date.now(),
            isHidden: true,
          };
          chat.history.push(historyMessage);
          await db.chats.put(chat);
        }
      }

      await renderQzonePosts();
      toggleModal("create-post-modal", false);
      alert("动态发布成功！");
    });

    // ==================== 动态列表滑动删除 ====================
    const postsList = $("qzone-posts-list");
    let swipeState = {
      isDragging: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      activeContainer: null,
      swipeDirection: null,
      isClick: true,
    };

    function resetAllSwipes(exceptThisOne = null) {
      $$(".qzone-post-container").forEach((container) => {
        if (container !== exceptThisOne) {
          container.querySelector(".qzone-post-item")?.classList.remove("swiped");
        }
      });
    }

    const handleSwipeStart = (e) => {
      const targetContainer = e.target.closest(".qzone-post-container");
      if (!targetContainer) return;

      resetAllSwipes(targetContainer);
      swipeState.activeContainer = targetContainer;
      swipeState.isDragging = true;
      swipeState.isClick = true;
      swipeState.swipeDirection = null;
      swipeState.startX = e.type.includes("mouse") ? e.pageX : e.touches[0].pageX;
      swipeState.startY = e.type.includes("mouse") ? e.pageY : e.touches[0].pageY;
      swipeState.activeContainer.querySelector(".qzone-post-item").style.transition = "none";
    };

    const handleSwipeMove = (e) => {
      if (!swipeState.isDragging || !swipeState.activeContainer) return;

      const currentX = e.type.includes("mouse") ? e.pageX : e.touches[0].pageX;
      const currentY = e.type.includes("mouse") ? e.pageY : e.touches[0].pageY;
      const diffX = currentX - swipeState.startX;
      const diffY = currentY - swipeState.startY;
      const absDiffX = Math.abs(diffX);
      const absDiffY = Math.abs(diffY);
      const clickThreshold = 5;

      if (absDiffX > clickThreshold || absDiffY > clickThreshold) {
        swipeState.isClick = false;
      }

      if (swipeState.swipeDirection === null) {
        if (absDiffX > clickThreshold || absDiffY > clickThreshold) {
          swipeState.swipeDirection = absDiffX > absDiffY ? "horizontal" : "vertical";
        }
      }

      if (swipeState.swipeDirection === "vertical") {
        handleSwipeEnd(e);
        return;
      }

      if (swipeState.swipeDirection === "horizontal") {
        e.preventDefault();
        swipeState.currentX = currentX;
        let translation = diffX;
        if (translation > 0) translation = 0;
        if (translation < -90) translation = -90;
        swipeState.activeContainer.querySelector(
          ".qzone-post-item"
        ).style.transform = `translateX(${translation}px)`;
      }
    };

    const handleSwipeEnd = (e) => {
      if (swipeState.isClick) {
        swipeState.isDragging = false;
        swipeState.activeContainer = null;
        return;
      }
      if (!swipeState.isDragging || !swipeState.activeContainer) return;

      const postItem = swipeState.activeContainer.querySelector(".qzone-post-item");
      postItem.style.transition = "transform 0.3s ease";

      const finalX = e.type.includes("touchend") ? e.changedTouches[0].pageX : e.pageX;
      const diffX = finalX - swipeState.startX;
      const swipeThreshold = -40;

      if (swipeState.swipeDirection === "horizontal" && diffX < swipeThreshold) {
        postItem.classList.add("swiped");
        postItem.style.transform = "";
      } else {
        postItem.classList.remove("swiped");
        postItem.style.transform = "";
      }

      Object.assign(swipeState, {
        isDragging: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        activeContainer: null,
        swipeDirection: null,
        isClick: true,
      });
    };

    postsList.addEventListener("mousedown", handleSwipeStart);
    document.addEventListener("mousemove", handleSwipeMove);
    document.addEventListener("mouseup", handleSwipeEnd);
    postsList.addEventListener("touchstart", handleSwipeStart, { passive: false });
    postsList.addEventListener("touchmove", handleSwipeMove, { passive: false });
    postsList.addEventListener("touchend", handleSwipeEnd);

    // ==================== 动态点击事件 ====================
    postsList.addEventListener("click", async (e) => {
      e.stopPropagation();
      const target = e.target;

      if (target.classList.contains("comment-delete-btn")) {
        const postContainer = target.closest(".qzone-post-container");
        if (!postContainer) return;

        const postId = parseInt(postContainer.dataset.postId);
        const commentIndex = parseInt(target.dataset.commentIndex);
        if (isNaN(postId) || isNaN(commentIndex)) return;

        const post = await db.qzonePosts.get(postId);
        if (!post?.comments?.[commentIndex]) return;

        const commentText = post.comments[commentIndex].text;
        const confirmed = await showCustomConfirm(
          "删除评论",
          `确定要删除这条评论吗？\n\n"${commentText.substring(0, 50)}..."`,
          { confirmButtonClass: "btn-danger" }
        );

        if (confirmed) {
          post.comments.splice(commentIndex, 1);
          await db.qzonePosts.update(postId, { comments: post.comments });
          await renderQzonePosts();
          alert("评论已删除。");
        }
        return;
      }

      if (target.classList.contains("post-actions-btn")) {
        const container = target.closest(".qzone-post-container");
        if (container?.dataset.postId) {
          showPostActions(parseInt(container.dataset.postId));
        }
        return;
      }

      if (target.closest(".qzone-post-delete-action")) {
        const container = target.closest(".qzone-post-container");
        if (!container) return;

        const postIdToDelete = parseInt(container.dataset.postId);
        if (isNaN(postIdToDelete)) return;

        const confirmed = await showCustomConfirm("删除动态", "确定要永久删除这条动态吗？", {
          confirmButtonClass: "btn-danger",
        });

        if (confirmed) {
          container.style.transition = "all 0.3s ease";
          container.style.transform = "scale(0.8)";
          container.style.opacity = "0";

          setTimeout(async () => {
            await db.qzonePosts.delete(postIdToDelete);

            const notificationIdentifier = `(ID: ${postIdToDelete})`;
            for (const chatId in state.chats) {
              const chat = state.chats[chatId];
              const originalHistoryLength = chat.history.length;
              chat.history = chat.history.filter(
                (msg) => !(msg.role === "system" && msg.content.includes(notificationIdentifier))
              );
              if (chat.history.length < originalHistoryLength) {
                await db.chats.put(chat);
              }
            }
            await renderQzonePosts();
            alert("动态已删除。");
          }, 300);
        }
        return;
      }

      if (target.tagName === "IMG" && target.dataset.hiddenText) {
        showCustomAlert("图片内容", target.dataset.hiddenText.replace(/<br>/g, "\n"));
        return;
      }

      const icon = target.closest(".action-icon");
      if (icon) {
        const postContainer = icon.closest(".qzone-post-container");
        if (!postContainer) return;
        const postId = parseInt(postContainer.dataset.postId);
        if (isNaN(postId)) return;

        if (icon.classList.contains("like")) {
          const post = await db.qzonePosts.get(postId);
          if (!post) return;
          if (!post.likes) post.likes = [];
          const userNickname = state.qzoneSettings.nickname;
          const userLikeIndex = post.likes.indexOf(userNickname);
          if (userLikeIndex > -1) {
            post.likes.splice(userLikeIndex, 1);
          } else {
            post.likes.push(userNickname);
            icon.classList.add("animate-like");
            icon.addEventListener("animationend", () => icon.classList.remove("animate-like"), {
              once: true,
            });
          }
          await db.qzonePosts.update(postId, { likes: post.likes });
        }

        if (icon.classList.contains("favorite")) {
          const existingFavorite = await db.favorites
            .where({ type: "qzone_post", "content.id": postId })
            .first();
          if (existingFavorite) {
            await db.favorites.delete(existingFavorite.id);
            await showCustomAlert("提示", "已取消收藏");
          } else {
            const postToSave = await db.qzonePosts.get(postId);
            if (postToSave) {
              await db.favorites.add({
                type: "qzone_post",
                content: postToSave,
                timestamp: Date.now(),
              });
              await showCustomAlert("提示", "收藏成功！");
            }
          }
        }

        await renderQzonePosts();
        return;
      }

      const sendBtn = target.closest(".comment-send-btn");
      if (sendBtn) {
        const postContainer = sendBtn.closest(".qzone-post-container");
        if (!postContainer) return;
        const postId = parseInt(postContainer.dataset.postId);
        const commentInput = postContainer.querySelector(".comment-input");
        const commentText = commentInput.value.trim();
        if (!commentText) return alert("评论内容不能为空哦！");

        const post = await db.qzonePosts.get(postId);
        if (!post) return;
        if (!post.comments) post.comments = [];
        post.comments.push({
          commenterName: state.qzoneSettings.nickname,
          text: commentText,
          timestamp: Date.now(),
        });
        await db.qzonePosts.update(postId, { comments: post.comments });

        for (const chatId in state.chats) {
          const chat = state.chats[chatId];
          if (!chat.isGroup) {
            chat.history.push({
              role: "system",
              content: `[系统提示：'${state.qzoneSettings.nickname}' 在ID为${postId}的动态下发表了评论："${commentText}"]`,
              timestamp: Date.now(),
              isHidden: true,
            });
            await db.chats.put(chat);
          }
        }
        commentInput.value = "";
        await renderQzonePosts();
        return;
      }
    });

    // ==================== 收藏页面 ====================
    const favoritesEditBtn = $("favorites-edit-btn");
    const favoritesView = $("favorites-view");
    const favoritesActionBar = $("favorites-action-bar");
    const mainBottomNav = $("chat-list-bottom-nav");
    const favoritesList = $("favorites-list");

    favoritesEditBtn.addEventListener("click", () => {
      isFavoritesSelectionMode = !isFavoritesSelectionMode;
      favoritesView.classList.toggle("selection-mode", isFavoritesSelectionMode);

      if (isFavoritesSelectionMode) {
        favoritesEditBtn.textContent = "完成";
        favoritesActionBar.style.display = "block";
        mainBottomNav.style.display = "none";
        favoritesList.style.paddingBottom = "80px";
      } else {
        favoritesEditBtn.textContent = "编辑";
        favoritesActionBar.style.display = "none";
        mainBottomNav.style.display = "flex";
        favoritesList.style.paddingBottom = "";
        selectedFavorites.clear();
        $$(".favorite-item-card.selected").forEach((card) => card.classList.remove("selected"));
        $("favorites-delete-selected-btn").textContent = `删除 (0)`;
      }
    });

    favoritesList.addEventListener("click", (e) => {
      const target = e.target;
      const card = target.closest(".favorite-item-card");

      if (target.tagName === "IMG" && target.dataset.hiddenText) {
        showCustomAlert("图片内容", target.dataset.hiddenText.replace(/<br>/g, "\n"));
        return;
      }

      if (!isFavoritesSelectionMode) return;
      if (!card) return;

      const favId = parseInt(card.dataset.favid);
      if (isNaN(favId)) return;

      if (selectedFavorites.has(favId)) {
        selectedFavorites.delete(favId);
        card.classList.remove("selected");
      } else {
        selectedFavorites.add(favId);
        card.classList.add("selected");
      }

      $("favorites-delete-selected-btn").textContent = `删除 (${selectedFavorites.size})`;
    });

    $("favorites-delete-selected-btn").addEventListener("click", async () => {
      if (selectedFavorites.size === 0) return;

      const confirmed = await showCustomConfirm(
        "确认删除",
        `确定要从收藏夹中移除这 ${selectedFavorites.size} 条内容吗？`,
        { confirmButtonClass: "btn-danger" }
      );

      if (confirmed) {
        const idsToDelete = [...selectedFavorites];
        await db.favorites.bulkDelete(idsToDelete);
        await showCustomAlert("删除成功", "选中的收藏已被移除。");

        allFavoriteItems = allFavoriteItems.filter((item) => !idsToDelete.includes(item.id));
        displayFilteredFavorites(allFavoriteItems);
        favoritesEditBtn.click();
      }
    });

    // ==================== 收藏搜索 ====================
    const searchInput = $("favorites-search-input");
    const searchClearBtn = $("favorites-search-clear-btn");

    searchInput.addEventListener("input", () => {
      const searchTerm = searchInput.value.trim().toLowerCase();
      searchClearBtn.style.display = searchTerm ? "block" : "none";

      if (!searchTerm) {
        displayFilteredFavorites(allFavoriteItems);
        return;
      }

      const filteredItems = allFavoriteItems.filter((item) => {
        let contentToSearch = "";
        let authorToSearch = "";

        if (item.type === "qzone_post") {
          const post = item.content;
          contentToSearch += (post.publicText || "") + " " + (post.content || "");
          if (post.authorId === "user") {
            authorToSearch = state.qzoneSettings.nickname;
          } else if (state.chats[post.authorId]) {
            authorToSearch = state.chats[post.authorId].name;
          }
        } else if (item.type === "chat_message") {
          const msg = item.content;
          if (typeof msg.content === "string") {
            contentToSearch = msg.content;
          }
          const chat = state.chats[item.chatId];
          if (chat) {
            if (msg.role === "user") {
              authorToSearch = chat.isGroup ? chat.settings.myNickname || "我" : "我";
            } else {
              authorToSearch = chat.isGroup ? msg.senderName : chat.name;
            }
          }
        }

        return (
          contentToSearch.toLowerCase().includes(searchTerm) ||
          authorToSearch.toLowerCase().includes(searchTerm)
        );
      });

      displayFilteredFavorites(filteredItems);
    });

    searchClearBtn.addEventListener("click", () => {
      searchInput.value = "";
      searchClearBtn.style.display = "none";
      displayFilteredFavorites(allFavoriteItems);
      searchInput.focus();
    });

    // ==================== 回忆录 ====================
    document
      .querySelector('.nav-item[data-view="memories-view"]')
      ?.addEventListener("click", () => {
        if (isFavoritesSelectionMode) {
          favoritesEditBtn.click();
        }
        switchToChatListView("memories-view");
        renderMemoriesScreen();
      });

    $("memories-back-btn")?.addEventListener("click", () => switchToChatListView("messages-view"));

    $("add-countdown-btn")?.addEventListener("click", () =>
      toggleModal("create-countdown-modal", true)
    );

    $("confirm-create-countdown-btn")?.addEventListener("click", async () => {
      const title = $("countdown-title-input").value.trim();
      const dateValue = $("countdown-date-input").value;

      if (!title || !dateValue) {
        alert("请填写完整的约定标题和日期！");
        return;
      }

      const targetDate = new Date(dateValue);
      if (isNaN(targetDate) || targetDate <= new Date()) {
        alert("请输入一个有效的、未来的日期！");
        return;
      }

      const newCountdown = {
        chatId: null,
        authorName: "我",
        description: title,
        timestamp: Date.now(),
        type: "countdown",
        targetDate: targetDate.getTime(),
      };

      await db.memories.add(newCountdown);
      toggleModal("create-countdown-modal", false);
      renderMemoriesScreen();
    });

    // ==================== 拉黑功能 ====================
    $("block-chat-btn")?.addEventListener("click", async () => {
      if (!state.activeChatId || state.chats[state.activeChatId].isGroup) return;

      const chat = state.chats[state.activeChatId];
      const confirmed = await showCustomConfirm(
        "确认拉黑",
        `确定要拉黑"${chat.name}"吗？拉黑后您将无法向其发送消息，直到您将Ta移出黑名单，或等待Ta重新申请好友。`,
        { confirmButtonClass: "btn-danger" }
      );

      if (confirmed) {
        chat.relationship.status = "blocked_by_user";
        chat.relationship.blockedTimestamp = Date.now();

        const hiddenMessage = {
          role: "system",
          content: `[系统提示：你刚刚被用户拉黑了。在对方解除拉黑之前，你无法再主动发起对话，也无法回应。]`,
          timestamp: Date.now() + 1,
          isHidden: true,
        };
        chat.history.push(hiddenMessage);
        await db.chats.put(chat);

        toggleModal("chat-settings-modal", false);
        renderChatInterface(state.activeChatId);
        renderChatList();
      }
    });

    $("chat-lock-overlay")?.addEventListener("click", async (e) => {
      const chat = state.chats[state.activeChatId];
      if (!chat) return;

      if (e.target.id === "force-apply-check-btn") {
        alert("正在手动触发好友申请流程，请稍后...");
        await triggerAiFriendApplication(chat.id);
        renderChatInterface(chat.id);
        return;
      }

      if (e.target.id === "unblock-btn") {
        chat.relationship.status = "friend";
        chat.relationship.blockedTimestamp = null;

        const hiddenMessage = {
          role: "system",
          content: `[系统提示：用户刚刚解除了对你的拉黑。现在你们可以重新开始对话了。]`,
          timestamp: Date.now(),
          isHidden: true,
        };
        chat.history.push(hiddenMessage);
        await db.chats.put(chat);
        renderChatInterface(chat.id);
        renderChatList();
        triggerAiResponse();
      } else if (e.target.id === "accept-friend-btn") {
        chat.relationship.status = "friend";
        chat.relationship.applicationReason = "";

        const hiddenMessage = {
          role: "system",
          content: `[系统提示：用户刚刚通过了你的好友申请。你们现在又可以正常聊天了。]`,
          timestamp: Date.now(),
          isHidden: true,
        };
        chat.history.push(hiddenMessage);
        await db.chats.put(chat);
        renderChatInterface(chat.id);
        renderChatList();

        const msg = {
          role: "user",
          content: "我通过了你的好友请求",
          timestamp: Date.now(),
        };
        chat.history.push(msg);
        await db.chats.put(chat);
        appendMessage(msg, chat);
        triggerAiResponse();
      } else if (e.target.id === "reject-friend-btn") {
        chat.relationship.status = "blocked_by_user";
        chat.relationship.blockedTimestamp = Date.now();
        chat.relationship.applicationReason = "";
        await db.chats.put(chat);
        renderChatInterface(chat.id);
      } else if (e.target.id === "apply-friend-btn") {
        const reason = await showCustomPrompt(
          "发送好友申请",
          `请输入你想对"${chat.name}"说的申请理由：`,
          "我们和好吧！"
        );
        if (reason !== null) {
          chat.relationship.status = "pending_ai_approval";
          chat.relationship.applicationReason = reason;
          await db.chats.put(chat);
          renderChatInterface(chat.id);
          renderChatList();
          triggerAiResponse();
        }
      }
    });

    // ==================== 红包功能 ====================
    $("transfer-btn")?.addEventListener("click", handlePaymentButtonClick);

    const rpTabGroup = $("rp-tab-group");
    const rpTabDirect = $("rp-tab-direct");
    const rpContentGroup = $("rp-content-group");
    const rpContentDirect = $("rp-content-direct");

    rpTabGroup?.addEventListener("click", () => {
      rpTabGroup.classList.add("active");
      rpTabDirect.classList.remove("active");
      rpContentGroup.style.display = "block";
      rpContentDirect.style.display = "none";
    });

    rpTabDirect?.addEventListener("click", () => {
      rpTabDirect.classList.add("active");
      rpTabGroup.classList.remove("active");
      rpContentDirect.style.display = "block";
      rpContentGroup.style.display = "none";
    });

    $("rp-group-amount")?.addEventListener("input", (e) => {
      const amount = parseFloat(e.target.value) || 0;
      $("rp-group-total").textContent = `¥ ${amount.toFixed(2)}`;
    });

    $("rp-direct-amount")?.addEventListener("input", (e) => {
      const amount = parseFloat(e.target.value) || 0;
      $("rp-direct-total").textContent = `¥ ${amount.toFixed(2)}`;
    });

    // ==================== 视频通话 ====================
    $("decline-call-btn")?.addEventListener("click", async () => {
      hideIncomingCallModal();
      const chat = state.chats[videoCallState.activeChatId];
      if (!chat) return;

      if (videoCallState.isGroupCall) {
        videoCallState.isUserParticipating = false;
        const systemNote = {
          role: "system",
          content: `[系统提示：用户拒绝了通话邀请，但你们可以自己开始。请你们各自决策是否加入。]`,
          timestamp: Date.now(),
          isHidden: true,
        };
        chat.history.push(systemNote);
        await db.chats.put(chat);
        await triggerAiResponse();
      } else {
        const declineMessage = {
          role: "user",
          content: "我拒绝了你的视频通话请求。",
          timestamp: Date.now(),
        };
        chat.history.push(declineMessage);
        await db.chats.put(chat);
        showScreen("chat-interface-screen");
        appendMessage(declineMessage, chat);
        triggerAiResponse();
      }

      videoCallState.isAwaitingResponse = false;
    });

    $("accept-call-btn")?.addEventListener("click", async () => {
      hideIncomingCallModal();
      videoCallState.initiator = "ai";
      videoCallState.isUserParticipating = true;
      videoCallState.activeChatId = state.activeChatId;

      if (videoCallState.isGroupCall) {
        const chat = state.chats[videoCallState.activeChatId];
        const requester = chat.members.find((m) => m.name === videoCallState.callRequester);
        videoCallState.participants = requester ? [requester] : [];
      }

      startVideoCall();
    });

    $("user-speak-btn")?.addEventListener("click", async () => {
      if (!videoCallState.isActive) return;

      const userAvatar = document.querySelector(
        '.participant-avatar-wrapper[data-participant-id="user"] .participant-avatar'
      );
      if (userAvatar) userAvatar.classList.add("speaking");

      const userInput = await showCustomPrompt("你说", "请输入你想说的话...");

      if (userAvatar) userAvatar.classList.remove("speaking");

      if (userInput?.trim()) {
        triggerAiInCallAction(userInput.trim());
      }
    });

    // ==================== 分组管理 ====================
    $$('input[name="visibility"]').forEach((radio) => {
      radio.addEventListener("change", function () {
        const groupsContainer = $("post-visibility-groups");
        groupsContainer.style.display =
          this.value === "include" || this.value === "exclude" ? "block" : "none";
      });
    });

    $("existing-groups-list")?.addEventListener("click", (e) => {
      if (e.target.classList.contains("delete-group-btn")) {
        const groupId = parseInt(e.target.dataset.id);
        deleteGroup(groupId);
      }
    });

    $("existing-categories-list")?.addEventListener("click", (e) => {
      if (e.target.classList.contains("delete-group-btn")) {
        const categoryId = parseInt(e.target.dataset.id);
        deleteCategory(categoryId);
      }
    });

    // ==================== 群成员管理 ====================
    $("member-management-list")?.addEventListener("click", (e) => {
      if (e.target.classList.contains("remove-member-btn")) {
        removeMemberFromGroup(e.target.dataset.memberId);
      }
    });

    $("contact-picker-list")?.addEventListener("click", (e) => {
      const item = e.target.closest(".contact-picker-item");
      if (!item) return;

      const contactId = item.dataset.contactId;
      item.classList.toggle("selected");

      if (selectedContacts.has(contactId)) {
        selectedContacts.delete(contactId);
      } else {
        selectedContacts.add(contactId);
      }
      updateContactPickerConfirmButton();
    });

    // ==================== 预览设置更新 ====================
    $$('input[name="theme-select"]').forEach((radio) => {
      radio.addEventListener("change", updateSettingsPreview);
    });

    const fontSizeSlider = $("font-size-slider");
    fontSizeSlider?.addEventListener("input", () => {
      $("font-size-value").textContent = `${fontSizeSlider.value}px`;
      updateSettingsPreview();
    });

    $("custom-css-input")?.addEventListener("input", updateSettingsPreview);
    $("reset-custom-css-btn")?.addEventListener("click", () => {
      $("custom-css-input").value = "";
      updateSettingsPreview();
    });

    // ==================== 通话记录 ====================
    $("chat-list-title")?.addEventListener("click", renderCallHistoryScreen);
    $("call-history-back-btn")?.addEventListener("click", () => showScreen("chat-list-screen"));
    $("call-history-list")?.addEventListener("click", (e) => {
      const card = e.target.closest(".call-record-card");
      if (card?.dataset.recordId) {
        showCallTranscript(parseInt(card.dataset.recordId));
      }
    });

    // ==================== 状态编辑 ====================
    $("chat-header-status")?.addEventListener("click", handleEditStatusClick);

    // ==================== 分享功能 ====================
    $("confirm-share-target-btn")?.addEventListener("click", async () => {
      const sourceChat = state.chats[state.activeChatId];
      const selectedTargetIds = Array.from($$(".share-target-checkbox:checked")).map(
        (cb) => cb.dataset.chatId
      );

      if (selectedTargetIds.length === 0) {
        alert("请至少选择一个要分享的聊天。");
        return;
      }

      const sharedHistory = [];
      const sortedTimestamps = [...selectedMessages].sort((a, b) => a - b);
      for (const timestamp of sortedTimestamps) {
        const msg = sourceChat.history.find((m) => m.timestamp === timestamp);
        if (msg) sharedHistory.push(msg);
      }

      const shareCardMessage = {
        role: "user",
        senderName: sourceChat.isGroup ? sourceChat.settings.myNickname || "我" : "我",
        type: "share_card",
        timestamp: Date.now(),
        payload: {
          sourceChatName: sourceChat.name,
          title: `来自"${sourceChat.name}"的聊天记录`,
          sharedHistory,
        },
      };

      for (const targetId of selectedTargetIds) {
        const targetChat = state.chats[targetId];
        if (targetChat) {
          targetChat.history.push(shareCardMessage);
          await db.chats.put(targetChat);
        }
      }

      toggleModal("share-target-modal", false);
      exitSelectionMode();
      await showCustomAlert(
        "分享成功",
        `聊天记录已成功分享到 ${selectedTargetIds.length} 个会话中。`
      );
      renderChatList();
    });

    // ==================== 图标设置 ====================
    $("icon-settings-grid")?.addEventListener("click", async (e) => {
      if (e.target.classList.contains("change-icon-btn")) {
        const item = e.target.closest(".icon-setting-item");
        const iconId = item?.dataset.iconId;
        if (!iconId) return;

        const currentUrl = state.globalSettings.appIcons[iconId];
        const newUrl = await showCustomPrompt(
          `更换"${item.querySelector(".icon-preview").alt}"图标`,
          "请输入新的图片URL",
          currentUrl,
          "url"
        );

        if (newUrl?.trim().startsWith("http")) {
          state.globalSettings.appIcons[iconId] = newUrl.trim();
          item.querySelector(".icon-preview").src = newUrl.trim();
        } else if (newUrl !== null) {
          alert("请输入一个有效的URL！");
        }
      }
    });

    // ==================== 主题切换 ====================
    $("theme-toggle-switch")?.addEventListener("change", toggleTheme);

    // ==================== 最终启动 ====================
    if (state.globalSettings.enableBackgroundActivity) {
      startBackgroundSimulation();
      console.log("后台活动模拟已自动启动。");
    }

    showScreen("home-screen");
  }

  init();
});

// Ensure renderChatListProxy is wired
if (typeof renderChatList === 'function') { window.renderChatListProxy = renderChatList; }
