// ===================================================================
// 4. 初始化函数 init()
// ===================================================================
async function init() {
  // ▼▼▼ 在 init() 函数的【最开头】，粘贴下面这两行代码 ▼▼▼
  const savedTheme = localStorage.getItem("ephone-theme") || "light"; // 默认为日间模式
  applyTheme(savedTheme);
  // ▲▲▲ 粘贴结束 ▲▲▲

  // ▼▼▼ 新增代码 ▼▼▼
  const customBubbleStyleTag = document.createElement("style");
  customBubbleStyleTag.id = "custom-bubble-style";
  document.head.appendChild(customBubbleStyleTag);
  // ▲▲▲ 新增结束 ▲▲▲

  // ▼▼▼ 新增代码 ▼▼▼
  const previewBubbleStyleTag = document.createElement("style");
  previewBubbleStyleTag.id = "preview-bubble-style";
  document.head.appendChild(previewBubbleStyleTag);
  // ▲▲▲ 新增结束 ▲▲▲

  // ▼▼▼ 修改这两行 ▼▼▼
  applyScopedCss("", "#chat-messages", "custom-bubble-style"); // 清除真实聊天界面的自定义样式
  applyScopedCss("", "#settings-preview-area", "preview-bubble-style"); // 清除预览区的自定义样式
  // ▲▲▲ 修改结束 ▲▲▲

  window.showScreen = showScreen;
  window.renderChatListProxy = renderChatList;
  window.renderApiSettingsProxy = renderApiSettings;
  window.renderWallpaperScreenProxy = renderWallpaperScreen;
  window.renderWorldBookScreenProxy = renderWorldBookScreen;

  await loadAllDataFromDB();

  // 初始化未读动态计数
  const storedCount = parseInt(localStorage.getItem("unreadPostsCount")) || 0;
  updateUnreadIndicator(storedCount);

  // ▲▲▲ 代码添加结束 ▲▲▲

  if (state.globalSettings && state.globalSettings.fontUrl) {
    applyCustomFont(state.globalSettings.fontUrl);
  }

  updateClock();
  setInterval(updateClock, 1000 * 30);
  applyGlobalWallpaper();
  initBatteryManager();

  applyAppIcons();

  document.getElementById("app-grid").addEventListener("click", (e) => {
    const appIcon = e.target.closest(".app-icon");
    if (appIcon && appIcon.dataset.screen) {
      showScreen(appIcon.dataset.screen);
    }
  });

  // ==========================================================
  // --- 各种事件监听器 ---
  // ==========================================================

  document.getElementById("custom-modal-cancel").addEventListener("click", hideCustomModal);
  document.getElementById("custom-modal-overlay").addEventListener("click", (e) => {
    if (e.target === modalOverlay) hideCustomModal();
  });
  document.getElementById("export-data-btn").addEventListener("click", exportBackup);
  document
    .getElementById("import-btn")
    .addEventListener("click", () => document.getElementById("import-data-input").click());
  document
    .getElementById("import-data-input")
    .addEventListener("change", (e) => importBackup(e.target.files[0]));
  document.getElementById("back-to-list-btn").addEventListener("click", () => {
    // ▼▼▼ 修改这两行 ▼▼▼
    applyScopedCss("", "#chat-messages", "custom-bubble-style"); // 清除真实聊天界面的自定义样式
    applyScopedCss("", "#settings-preview-area", "preview-bubble-style"); // 清除预览区的自定义样式
    // ▲▲▲ 修改结束 ▲▲▲

    exitSelectionMode();
    state.activeChatId = null;
    showScreen("chat-list-screen");
  });

  document.getElementById("add-chat-btn").addEventListener("click", async () => {
    const name = await showCustomPrompt("创建新聊天", "请输入Ta的名字");
    if (name && name.trim()) {
      const newChatId = "chat_" + Date.now();
      const newChat = {
        id: newChatId,
        name: name.trim(),
        isGroup: false,
        relationship: {
          status: "friend", // 'friend', 'blocked_by_user', 'pending_user_approval'
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
          customCss: "", // <--- 新增这行
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

  // ▼▼▼ 【修正】创建群聊按钮现在打开联系人选择器 ▼▼▼
  document
    .getElementById("add-group-chat-btn")
    .addEventListener("click", openContactPickerForGroupCreate);
  // ▲▲▲ 替换结束 ▲▲▲
  document
    .getElementById("transfer-cancel-btn")
    .addEventListener("click", () =>
      document.getElementById("transfer-modal").classList.remove("visible")
    );
  document.getElementById("transfer-confirm-btn").addEventListener("click", sendUserTransfer);

  document
    .getElementById("listen-together-btn")
    .addEventListener("click", handleListenTogetherClick);
  document
    .getElementById("music-exit-btn")
    .addEventListener("click", () => endListenTogetherSession(true));
  document.getElementById("music-return-btn").addEventListener("click", returnToChat);
  document.getElementById("music-play-pause-btn").addEventListener("click", togglePlayPause);
  document.getElementById("music-next-btn").addEventListener("click", playNext);
  document.getElementById("music-prev-btn").addEventListener("click", playPrev);
  document.getElementById("music-mode-btn").addEventListener("click", changePlayMode);
  document.getElementById("music-playlist-btn").addEventListener("click", () => {
    updatePlaylistUI();
    document.getElementById("music-playlist-panel").classList.add("visible");
  });
  document
    .getElementById("close-playlist-btn")
    .addEventListener("click", () =>
      document.getElementById("music-playlist-panel").classList.remove("visible")
    );
  document.getElementById("add-song-url-btn").addEventListener("click", addSongFromURL);
  document
    .getElementById("add-song-local-btn")
    .addEventListener("click", () => document.getElementById("local-song-upload-input").click());
  document.getElementById("local-song-upload-input").addEventListener("change", addSongFromLocal);
  audioPlayer.addEventListener("ended", playNext);
  audioPlayer.addEventListener("pause", () => {
    if (musicState.isActive) {
      musicState.isPlaying = false;
      updatePlayerUI();
    }
  });
  audioPlayer.addEventListener("play", () => {
    if (musicState.isActive) {
      musicState.isPlaying = true;
      updatePlayerUI();
    }
  });

  const chatInput = document.getElementById("chat-input");
  // ▼▼▼ 找到 id="send-btn" 的 click 事件监听器 ▼▼▼
  document.getElementById("send-btn").addEventListener("click", async () => {
    const content = chatInput.value.trim();
    if (!content || !state.activeChatId) return;

    const chat = state.chats[state.activeChatId];

    // --- 【核心修改】在这里添加 ---
    const msg = {
      role: "user",
      content,
      timestamp: Date.now(),
    };

    // 检查当前是否处于引用回复模式
    if (currentReplyContext) {
      msg.quote = currentReplyContext; // 将引用信息附加到消息对象上
    }
    // --- 【修改结束】 ---

    chat.history.push(msg);
    await db.chats.put(chat);
    appendMessage(msg, chat);
    renderChatList();
    chatInput.value = "";
    chatInput.style.height = "auto";
    chatInput.focus();

    // --- 【核心修改】发送后，取消引用模式 ---
    cancelReplyMode();
  });
  document.getElementById("wait-reply-btn").addEventListener("click", handleWaitReplyClick);
  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      document.getElementById("send-btn").click();
    }
  });
  chatInput.addEventListener("input", () => {
    chatInput.style.height = "auto";
    chatInput.style.height = chatInput.scrollHeight + "px";
  });

  document.getElementById("wallpaper-upload-input").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (file) {
      const dataUrl = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result);
        reader.onerror = () => rej(reader.error);
        reader.readAsDataURL(file);
      });
      newWallpaperBase64 = dataUrl;
      renderWallpaperScreen();
    }
  });
  // ▼▼▼ 用这整块代码，替换旧的 save-wallpaper-btn 事件监听器 ▼▼▼
  document.getElementById("save-wallpaper-btn").addEventListener("click", async () => {
    let changesMade = false;

    // 保存壁纸
    if (newWallpaperBase64) {
      state.globalSettings.wallpaper = newWallpaperBase64;
      changesMade = true;
    }

    // 【核心修改】保存图标设置（它已经在内存中了，我们只需要把整个globalSettings存起来）
    await db.globalSettings.put(state.globalSettings);

    // 应用所有更改
    if (changesMade) {
      applyGlobalWallpaper();
      newWallpaperBase64 = null;
    }
    applyAppIcons(); // 重新应用所有图标

    alert("外观设置已保存并应用！");
    showScreen("home-screen");
  });
  // ▲▲▲ 替换结束 ▲▲▲
  document.getElementById("save-api-settings-btn").addEventListener("click", async () => {
    state.apiConfig.proxyUrl = document.getElementById("proxy-url").value.trim();
    state.apiConfig.apiKey = document.getElementById("api-key").value.trim();
    state.apiConfig.model = document.getElementById("model-select").value;
    state.apiConfig.enableStream = document.getElementById("stream-switch").checked;
    state.apiConfig.hideStreamResponse = document.getElementById("hide-stream-switch").checked;
    await db.apiConfig.put(state.apiConfig);

    // 在 'save-api-settings-btn' 的 click 事件监听器内部
    // await db.apiConfig.put(state.apiConfig); 这行之后

    // ▼▼▼ 将之前那段保存后台活动设置的逻辑，替换为下面这个增强版 ▼▼▼

    const backgroundSwitch = document.getElementById("background-activity-switch");
    const intervalInput = document.getElementById("background-interval-input");
    const newEnableState = backgroundSwitch.checked;
    const oldEnableState = state.globalSettings.enableBackgroundActivity || false;

    // 只有在用户“从关到开”时，才弹出警告
    if (newEnableState && !oldEnableState) {
      const userConfirmed = confirm(
        "【高费用警告】\n\n" +
          "您正在启用“后台角色活动”功能。\n\n" +
          "这会使您的AI角色们在您不和他们聊天时，也能“独立思考”并主动给您发消息或进行社交互动，极大地增强沉浸感。\n\n" +
          "但请注意：\n" +
          "这会【在后台自动、定期地调用API】，即使您不进行任何操作。根据您的角色数量和检测间隔，这可能会导致您的API费用显著增加。\n\n" +
          "您确定要开启吗？"
      );

      if (!userConfirmed) {
        backgroundSwitch.checked = false; // 用户取消，把开关拨回去
        return; // 阻止后续逻辑
      }
    }

    state.globalSettings.enableBackgroundActivity = newEnableState;
    state.globalSettings.backgroundActivityInterval = parseInt(intervalInput.value) || 60;
    state.globalSettings.blockCooldownHours =
      parseFloat(document.getElementById("block-cooldown-input").value) || 1;
    await db.globalSettings.put(state.globalSettings);

    // 动态启动或停止模拟器
    stopBackgroundSimulation();
    if (state.globalSettings.enableBackgroundActivity) {
      startBackgroundSimulation();
      console.log(`后台活动模拟已启动，间隔: ${state.globalSettings.backgroundActivityInterval}秒`);
    } else {
      console.log("后台活动模拟已停止。");
    }
    // ▲▲▲ 替换结束 ▲▲▲

    alert("API设置已保存!");
  });

  // gemini 密钥聚焦的时候显示明文
  const ApiKeyInput = document.getElementById("api-key");
  ApiKeyInput.addEventListener("focus", (e) => {
    e.target.setAttribute("type", "text");
  });
  ApiKeyInput.addEventListener("blur", (e) => {
    e.target.setAttribute("type", "password");
  });

  document.getElementById("fetch-models-btn").addEventListener("click", async () => {
    const url = document.getElementById("proxy-url").value.trim();
    const key = document.getElementById("api-key").value.trim();
    if (!url || !key) return alert("请先填写反代地址和密钥");
    try {
      let isGemini = url === GEMINI_API_URL;
      let response; // 声明 response 变量

      if (isGemini) {
        // Gemini API 使用一个简单的 GET 请求，密钥在 URL 中
        response = await fetch(`${GEMINI_API_URL}?key=${getRandomValue(key)}`);
      } else {
        // 对于 OpenAI 兼容的 API，我们明确地将方法设置为 GET
        response = await fetch(`${url}/v1/models`, {
          method: "GET", // 核心修改：明确声明使用 GET 方法
          headers: {
            Authorization: `Bearer ${key}`,
          },
        });
      }

      if (!response.ok) throw new Error(`无法获取模型列表, 状态: ${response.status}`); // 添加了更具体的错误状态
      const data = await response.json();
      let models = isGemini ? data.models : data.data;
      if (isGemini) {
        models = models.map((model) => {
          const parts = model.name.split("/");
          return {
            id: parts.length > 1 ? parts[1] : model.name,
          };
        });
      }
      const modelSelect = document.getElementById("model-select");
      modelSelect.innerHTML = "";
      models.forEach((model) => {
        const option = document.createElement("option");
        option.value = model.id;
        option.textContent = model.id;
        if (model.id === state.apiConfig.model) option.selected = true;
        modelSelect.appendChild(option);
      });
      alert("模型列表已更新");
    } catch (error) {
      alert(`拉取模型失败: ${error.message}`);
    }
  });
  document.getElementById("add-world-book-btn").addEventListener("click", async () => {
    const name = await showCustomPrompt("创建世界书", "请输入书名");
    if (name && name.trim()) {
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
  document.getElementById("save-world-book-btn").addEventListener("click", async () => {
    if (!editingWorldBookId) return;
    const book = state.worldBooks.find((wb) => wb.id === editingWorldBookId);
    if (book) {
      const newName = document.getElementById("world-book-name-input").value.trim();
      if (!newName) {
        alert("书名不能为空！");
        return;
      }
      book.name = newName;
      book.content = document.getElementById("world-book-content-input").value;

      // ▼▼▼ 【核心修改】在这里保存分类ID ▼▼▼
      const categoryId = document.getElementById("world-book-category-select").value;
      // 如果选择了“未分类”，存入 null；否则存入数字ID
      book.categoryId = categoryId ? parseInt(categoryId) : null;
      // ▲▲▲ 修改结束 ▲▲▲

      await db.worldBooks.put(book);
      document.getElementById("world-book-editor-title").textContent = newName;
      editingWorldBookId = null;
      renderWorldBookScreen();
      showScreen("world-book-screen");
    }
  });
  document.getElementById("chat-messages").addEventListener("click", (e) => {
    const aiImage = e.target.closest(".ai-generated-image");
    if (aiImage) {
      const description = aiImage.dataset.description;
      if (description) showCustomAlert("照片描述", description);
      return;
    }
  });

  const chatSettingsModal = document.getElementById("chat-settings-modal");
  const worldBookSelectBox = document.querySelector(".custom-multiselect .select-box");
  const worldBookCheckboxesContainer = document.getElementById("world-book-checkboxes-container");

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
  document
    .getElementById("world-book-checkboxes-container")
    .addEventListener("change", updateWorldBookSelectionDisplay);
  window.addEventListener("click", (e) => {
    if (!document.querySelector(".custom-multiselect").contains(e.target)) {
      worldBookCheckboxesContainer.classList.remove("visible");
      worldBookSelectBox.classList.remove("expanded");
    }
  });

  // ▼▼▼ 请用这段【完整、全新的代码】替换旧的 chat-settings-btn 点击事件 ▼▼▼
  document.getElementById("chat-settings-btn").addEventListener("click", async () => {
    if (!state.activeChatId) return;
    const chat = state.chats[state.activeChatId];
    const isGroup = chat.isGroup;

    // --- 统一显示/隐藏控件 ---
    document.getElementById("chat-name-group").style.display = "block";
    document.getElementById("my-persona-group").style.display = "block";
    document.getElementById("my-avatar-group").style.display = "block";
    document.getElementById("my-group-nickname-group").style.display = isGroup ? "block" : "none";
    document.getElementById("group-avatar-group").style.display = isGroup ? "block" : "none";
    document.getElementById("group-members-group").style.display = isGroup ? "block" : "none";
    document.getElementById("ai-persona-group").style.display = isGroup ? "none" : "block";
    document.getElementById("ai-avatar-group").style.display = isGroup ? "none" : "block";

    // 【核心修改1】根据是否为群聊，显示或隐藏“好友分组”区域
    document.getElementById("assign-group-section").style.display = isGroup ? "none" : "block";

    // --- 加载表单数据 ---
    document.getElementById("chat-name-input").value = chat.name;
    document.getElementById("my-persona").value = chat.settings.myPersona;
    document.getElementById("my-avatar-preview").src =
      chat.settings.myAvatar || (isGroup ? defaultMyGroupAvatar : defaultAvatar);
    document.getElementById("max-memory").value = chat.settings.maxMemory;
    const bgPreview = document.getElementById("bg-preview");
    const removeBgBtn = document.getElementById("remove-bg-btn");
    if (chat.settings.background) {
      bgPreview.src = chat.settings.background;
      bgPreview.style.display = "block";
      removeBgBtn.style.display = "inline-block";
    } else {
      bgPreview.style.display = "none";
      removeBgBtn.style.display = "none";
    }

    if (isGroup) {
      document.getElementById("my-group-nickname-input").value = chat.settings.myNickname || "";
      document.getElementById("group-avatar-preview").src =
        chat.settings.groupAvatar || defaultGroupAvatar;
      renderGroupMemberSettings(chat.members);
    } else {
      document.getElementById("ai-persona").value = chat.settings.aiPersona;
      document.getElementById("ai-avatar-preview").src = chat.settings.aiAvatar || defaultAvatar;

      // 【核心修改2】如果是单聊，就加载分组列表到下拉框
      const select = document.getElementById("assign-group-select");
      select.innerHTML = '<option value="">未分组</option>'; // 清空并设置默认选项
      const groups = await db.qzoneGroups.toArray();
      groups.forEach((group) => {
        const option = document.createElement("option");
        option.value = group.id;
        option.textContent = group.name;
        // 如果当前好友已经有分组，就默认选中它
        if (chat.groupId === group.id) {
          option.selected = true;
        }
        select.appendChild(option);
      });
    }

    // 加载世界书
    // ▼▼▼ 用下面这段【全新逻辑】替换掉原来简单的 forEach 循环 ▼▼▼

    const worldBookCheckboxesContainer = document.getElementById("world-book-checkboxes-container");
    worldBookCheckboxesContainer.innerHTML = "";
    const linkedIds = new Set(chat.settings.linkedWorldBookIds || []);

    // 1. 获取所有分类和世界书
    const categories = await db.worldBookCategories.toArray();
    const books = state.worldBooks;

    // 【核心改造】如果存在未分类的书籍，就创建一个“虚拟分类”
    const hasUncategorized = books.some((book) => !book.categoryId);
    if (hasUncategorized) {
      categories.push({ id: "uncategorized", name: "未分类" });
    }

    // 2. 将书籍按分类ID进行分组
    const booksByCategoryId = books.reduce((acc, book) => {
      const categoryId = book.categoryId || "uncategorized";
      if (!acc[categoryId]) {
        acc[categoryId] = [];
      }
      acc[categoryId].push(book);
      return acc;
    }, {});

    // 3. 遍历分类，创建带折叠功能的列表
    categories.forEach((category) => {
      const booksInCategory = booksByCategoryId[category.id] || [];
      if (booksInCategory.length > 0) {
        const allInCategoryChecked = booksInCategory.every((book) => linkedIds.has(book.id));

        const header = document.createElement("div");
        header.className = "wb-category-header";
        header.innerHTML = `
            <span class="arrow">▼</span>
            <input type="checkbox" class="wb-category-checkbox" data-category-id="${category.id}" ${
              allInCategoryChecked ? "checked" : ""
            }>
            <span>${category.name}</span>
        `;

        const bookContainer = document.createElement("div");
        bookContainer.className = "wb-book-container";
        bookContainer.dataset.containerFor = category.id;

        booksInCategory.forEach((book) => {
          const isChecked = linkedIds.has(book.id);
          const label = document.createElement("label");
          label.innerHTML = `<input type="checkbox" class="wb-book-checkbox" value="${
            book.id
          }" data-parent-category="${category.id}" ${isChecked ? "checked" : ""}> ${book.name}`;
          bookContainer.appendChild(label);
        });

        // --- ★ 核心修改 #1 在这里 ★ ---
        // 默认将分类设置为折叠状态
        header.classList.add("collapsed");
        bookContainer.classList.add("collapsed");
        // --- ★ 修改结束 ★ ---

        worldBookCheckboxesContainer.appendChild(header);
        worldBookCheckboxesContainer.appendChild(bookContainer);
      }
    });

    updateWorldBookSelectionDisplay(); // 更新顶部的已选数量显示

    // ▲▲▲ 替换结束 ▲▲▲

    // ▼▼▼ 在 updateWorldBookSelectionDisplay(); 的下一行，粘贴这整块新代码 ▼▼▼

    // 使用事件委托来处理所有点击和勾选事件，效率更高
    worldBookCheckboxesContainer.addEventListener("click", (e) => {
      const header = e.target.closest(".wb-category-header");
      if (header && !e.target.matches('input[type="checkbox"]')) {
        const categoryId = header.querySelector(".wb-category-checkbox")?.dataset.categoryId;
        // 【修改】现在 categoryId 可能是数字，也可能是 "uncategorized" 字符串，所以这个判断能通过了！
        if (categoryId) {
          // <-- 把原来的 !categoryId return; 改成这样
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

      // 如果点击的是分类的“全选”复选框
      if (target.classList.contains("wb-category-checkbox")) {
        const categoryId = target.dataset.categoryId;
        const isChecked = target.checked;
        // 找到这个分类下的所有书籍复选框，并将它们的状态设置为与分类复选框一致
        const bookCheckboxes = worldBookCheckboxesContainer.querySelectorAll(
          `input.wb-book-checkbox[data-parent-category="${categoryId}"]`
        );
        bookCheckboxes.forEach((cb) => (cb.checked = isChecked));
      }

      // 如果点击的是单个书籍的复选框
      if (target.classList.contains("wb-book-checkbox")) {
        const categoryId = target.dataset.parentCategory;
        if (categoryId) {
          // 检查它是否属于一个分类
          const categoryCheckbox = worldBookCheckboxesContainer.querySelector(
            `input.wb-category-checkbox[data-category-id="${categoryId}"]`
          );
          const allBookCheckboxes = worldBookCheckboxesContainer.querySelectorAll(
            `input.wb-book-checkbox[data-parent-category="${categoryId}"]`
          );
          // 检查该分类下是否所有书籍都被选中了
          const allChecked = Array.from(allBookCheckboxes).every((cb) => cb.checked);
          // 同步分类“全选”复选框的状态
          categoryCheckbox.checked = allChecked;
        }
      }

      // 每次变更后都更新顶部的已选数量显示
      updateWorldBookSelectionDisplay();
    });

    // ▲▲▲ 粘贴结束 ▲▲▲

    // 加载并更新所有预览相关控件
    const themeRadio = document.querySelector(
      `input[name="theme-select"][value="${chat.settings.theme || "default"}"]`
    );
    if (themeRadio) themeRadio.checked = true;
    const fontSizeSlider = document.getElementById("font-size-slider");
    fontSizeSlider.value = chat.settings.fontSize || 13;
    document.getElementById("font-size-value").textContent = `${fontSizeSlider.value}px`;
    const customCssInput = document.getElementById("custom-css-input");
    customCssInput.value = chat.settings.customCss || "";

    updateSettingsPreview();
    document.getElementById("chat-settings-modal").classList.add("visible");
  });
  // ▲▲▲ 替换结束 ▲▲▲

  function renderGroupMemberSettings(members) {
    const container = document.getElementById("group-members-settings");
    container.innerHTML = "";
    members.forEach((member) => {
      const div = document.createElement("div");
      div.className = "member-editor";
      div.dataset.memberId = member.id;
      // ★★★【核心重构】★★★
      // 显示的是 groupNickname
      div.innerHTML = `<img src="${member.avatar}" alt="${member.groupNickname}"><div class="member-name">${member.groupNickname}</div>`;
      div.addEventListener("click", () => openMemberEditor(member.id));
      container.appendChild(div);
    });
  }

  function openMemberEditor(memberId) {
    editingMemberId = memberId;
    const chat = state.chats[state.activeChatId];
    const member = chat.members.find((m) => m.id === memberId);
    document.getElementById("member-name-input").value = member.groupNickname;
    document.getElementById("member-persona-input").value = member.persona;
    document.getElementById("member-avatar-preview").src = member.avatar;
    document.getElementById("member-settings-modal").classList.add("visible");
  }
  document.getElementById("cancel-member-settings-btn").addEventListener("click", () => {
    document.getElementById("member-settings-modal").classList.remove("visible");
    editingMemberId = null;
  });
  document.getElementById("save-member-settings-btn").addEventListener("click", () => {
    if (!editingMemberId) return;
    const chat = state.chats[state.activeChatId];
    const member = chat.members.find((m) => m.id === editingMemberId);

    // ★★★【核心重构】★★★
    const newNickname = document.getElementById("member-name-input").value.trim();
    if (!newNickname) {
      alert("群昵称不能为空！");
      return;
    }
    member.groupNickname = newNickname; // 只修改群昵称
    member.persona = document.getElementById("member-persona-input").value;
    member.avatar = document.getElementById("member-avatar-preview").src;

    renderGroupMemberSettings(chat.members);
    document.getElementById("member-settings-modal").classList.remove("visible");
  });
  document.getElementById("reset-theme-btn").addEventListener("click", () => {
    document.getElementById("theme-default").checked = true;
  });
  document.getElementById("cancel-chat-settings-btn").addEventListener("click", () => {
    chatSettingsModal.classList.remove("visible");
  });

  document.getElementById("save-chat-settings-btn").addEventListener("click", async () => {
    if (!state.activeChatId) return;
    const chat = state.chats[state.activeChatId];
    const newName = document.getElementById("chat-name-input").value.trim();
    if (!newName) return alert("备注名/群名不能为空！");
    chat.name = newName;
    const selectedThemeRadio = document.querySelector('input[name="theme-select"]:checked');
    chat.settings.theme = selectedThemeRadio ? selectedThemeRadio.value : "default";

    chat.settings.fontSize = parseInt(document.getElementById("font-size-slider").value);
    chat.settings.customCss = document.getElementById("custom-css-input").value.trim();

    chat.settings.myPersona = document.getElementById("my-persona").value;
    chat.settings.myAvatar = document.getElementById("my-avatar-preview").src;
    const checkedBooks = document.querySelectorAll(
      "#world-book-checkboxes-container input.wb-book-checkbox:checked"
    );
    chat.settings.linkedWorldBookIds = Array.from(checkedBooks).map((cb) => cb.value);

    if (chat.isGroup) {
      chat.settings.myNickname = document.getElementById("my-group-nickname-input").value.trim();
      chat.settings.groupAvatar = document.getElementById("group-avatar-preview").src;
    } else {
      chat.settings.aiPersona = document.getElementById("ai-persona").value;
      chat.settings.aiAvatar = document.getElementById("ai-avatar-preview").src;
      const selectedGroupId = document.getElementById("assign-group-select").value;
      chat.groupId = selectedGroupId ? parseInt(selectedGroupId) : null;
    }

    chat.settings.maxMemory = parseInt(document.getElementById("max-memory").value) || 10;
    await db.chats.put(chat);

    applyScopedCss(chat.settings.customCss, "#chat-messages", "custom-bubble-style");

    chatSettingsModal.classList.remove("visible");
    renderChatInterface(state.activeChatId);
    renderChatList();
  });
  document.getElementById("clear-chat-btn").addEventListener("click", async () => {
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
      chatSettingsModal.classList.remove("visible");
    }
  });

  const setupFileUpload = (inputId, callback) => {
    document.getElementById(inputId).addEventListener("change", async (event) => {
      const file = event.target.files[0];
      if (file) {
        const dataUrl = await new Promise((res, rej) => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result);
          reader.onerror = () => rej(reader.error);
          reader.readAsDataURL(file);
        });
        callback(dataUrl);
        event.target.value = null;
      }
    });
  };
  setupFileUpload(
    "ai-avatar-input",
    (base64) => (document.getElementById("ai-avatar-preview").src = base64)
  );
  setupFileUpload(
    "my-avatar-input",
    (base64) => (document.getElementById("my-avatar-preview").src = base64)
  );
  setupFileUpload(
    "group-avatar-input",
    (base64) => (document.getElementById("group-avatar-preview").src = base64)
  );
  setupFileUpload(
    "member-avatar-input",
    (base64) => (document.getElementById("member-avatar-preview").src = base64)
  );
  setupFileUpload("bg-input", (base64) => {
    if (state.activeChatId) {
      state.chats[state.activeChatId].settings.background = base64;
      const bgPreview = document.getElementById("bg-preview");
      bgPreview.src = base64;
      bgPreview.style.display = "block";
      document.getElementById("remove-bg-btn").style.display = "inline-block";
    }
  });
  setupFileUpload(
    "preset-avatar-input",
    (base64) => (document.getElementById("preset-avatar-preview").src = base64)
  );
  document.getElementById("remove-bg-btn").addEventListener("click", () => {
    if (state.activeChatId) {
      state.chats[state.activeChatId].settings.background = "";
      const bgPreview = document.getElementById("bg-preview");
      bgPreview.src = "";
      bgPreview.style.display = "none";
      document.getElementById("remove-bg-btn").style.display = "none";
    }
  });

  const stickerPanel = document.getElementById("sticker-panel");
  document.getElementById("open-sticker-panel-btn").addEventListener("click", () => {
    renderStickerPanel();
    stickerPanel.classList.add("visible");
  });
  document
    .getElementById("close-sticker-panel-btn")
    .addEventListener("click", () => stickerPanel.classList.remove("visible"));
  document.getElementById("add-sticker-btn").addEventListener("click", async () => {
    const url = await showCustomPrompt("添加表情(URL)", "请输入表情包的图片URL");
    if (!url || !url.trim().startsWith("http")) return url && alert("请输入有效的URL (以http开头)");
    const name = await showCustomPrompt("命名表情", "请为这个表情命名 (例如：开心、疑惑)");
    if (name && name.trim()) {
      const newSticker = {
        id: "sticker_" + Date.now(),
        url: url.trim(),
        name: name.trim(),
      };
      await db.userStickers.add(newSticker);
      state.userStickers.push(newSticker);
      renderStickerPanel();
    } else if (name !== null) alert("表情名不能为空！");
  });
  document
    .getElementById("upload-sticker-btn")
    .addEventListener("click", () => document.getElementById("sticker-upload-input").click());
  document.getElementById("sticker-upload-input").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64Url = reader.result;
      const name = await showCustomPrompt("命名表情", "请为这个表情命名 (例如：好耶、疑惑)");
      if (name && name.trim()) {
        const newSticker = {
          id: "sticker_" + Date.now(),
          url: base64Url,
          name: name.trim(),
        };
        await db.userStickers.add(newSticker);
        state.userStickers.push(newSticker);
        renderStickerPanel();
      } else if (name !== null) alert("表情名不能为空！");
    };
    event.target.value = null;
  });

  document
    .getElementById("upload-image-btn")
    .addEventListener("click", () => document.getElementById("image-upload-input").click());
  document.getElementById("image-upload-input").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file || !state.activeChatId) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Url = e.target.result;
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
    };
    reader.readAsDataURL(file);
    event.target.value = null;
  });
  document.getElementById("voice-message-btn").addEventListener("click", async () => {
    if (!state.activeChatId) return;
    const text = await showCustomPrompt("发送语音", "请输入你想说的内容：");
    if (text && text.trim()) {
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
  document.getElementById("send-photo-btn").addEventListener("click", async () => {
    if (!state.activeChatId) return;
    const description = await showCustomPrompt("发送照片", "请用文字描述您要发送的照片：");
    if (description && description.trim()) {
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

  // ▼▼▼ 【全新】外卖请求功能事件绑定 ▼▼▼
  const waimaiModal = document.getElementById("waimai-request-modal");
  document.getElementById("send-waimai-request-btn").addEventListener("click", () => {
    waimaiModal.classList.add("visible");
  });

  document.getElementById("waimai-cancel-btn").addEventListener("click", () => {
    waimaiModal.classList.remove("visible");
  });

  document.getElementById("waimai-confirm-btn").addEventListener("click", async () => {
    if (!state.activeChatId) return;

    const productInfoInput = document.getElementById("waimai-product-info");
    const amountInput = document.getElementById("waimai-amount");

    const productInfo = productInfoInput.value.trim();
    const amount = parseFloat(amountInput.value);

    if (!productInfo) {
      alert("请输入商品信息！");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      alert("请输入有效的代付金额！");
      return;
    }

    const chat = state.chats[state.activeChatId];
    const now = Date.now();

    // 【核心修正】在这里获取用户自己的昵称
    const myNickname = chat.isGroup ? chat.settings.myNickname || "我" : "我";

    const msg = {
      role: "user",
      // 【核心修正】将获取到的昵称，作为 senderName 添加到消息对象中
      senderName: myNickname,
      type: "waimai_request",
      productInfo: productInfo,
      amount: amount,
      status: "pending",
      countdownEndTime: now + 15 * 60 * 1000,
      timestamp: now,
    };

    chat.history.push(msg);
    await db.chats.put(chat);
    appendMessage(msg, chat);
    renderChatList();

    productInfoInput.value = "";
    amountInput.value = "";
    waimaiModal.classList.remove("visible");
  });
  document.getElementById("open-persona-library-btn").addEventListener("click", openPersonaLibrary);
  document
    .getElementById("close-persona-library-btn")
    .addEventListener("click", closePersonaLibrary);
  document
    .getElementById("add-persona-preset-btn")
    .addEventListener("click", openPersonaEditorForCreate);
  document
    .getElementById("cancel-persona-editor-btn")
    .addEventListener("click", closePersonaEditor);
  document.getElementById("save-persona-preset-btn").addEventListener("click", savePersonaPreset);
  document.getElementById("preset-action-edit").addEventListener("click", openPersonaEditorForEdit);
  document.getElementById("preset-action-delete").addEventListener("click", deletePersonaPreset);
  document.getElementById("preset-action-cancel").addEventListener("click", hidePresetActions);

  document.getElementById("selection-cancel-btn").addEventListener("click", exitSelectionMode);

  // ▼▼▼ 【最终加强版】用这块代码替换旧的 selection-delete-btn 事件监听器 ▼▼▼
  document.getElementById("selection-delete-btn").addEventListener("click", async () => {
    if (selectedMessages.size === 0) return;
    const confirmed = await showCustomConfirm(
      "删除消息",
      `确定要删除选中的 ${selectedMessages.size} 条消息吗？这将改变AI的记忆。`,
      { confirmButtonClass: "btn-danger" }
    );
    if (confirmed) {
      const chat = state.chats[state.activeChatId];

      // 1. 【核心加强】在删除前，检查被删除的消息中是否包含投票
      let deletedPollsInfo = [];
      for (const timestamp of selectedMessages) {
        const msg = chat.history.find((m) => m.timestamp === timestamp);
        if (msg && msg.type === "poll") {
          deletedPollsInfo.push(`关于“${msg.question}”的投票(时间戳: ${msg.timestamp})`);
        }
      }

      // 2. 更新后端的历史记录
      chat.history = chat.history.filter((msg) => !selectedMessages.has(msg.timestamp));

      // 3. 【核心加强】构建更具体的“遗忘指令”
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

      // 4. 将包含“遗忘指令”的、更新后的chat对象存回数据库
      await db.chats.put(chat);

      // 5. 最后才更新UI
      renderChatInterface(state.activeChatId);
      renderChatList();
    }
  });
  // ▲▲▲ 替换结束 ▲▲▲

  const fontUrlInput = document.getElementById("font-url-input");
  fontUrlInput.addEventListener("input", () => applyCustomFont(fontUrlInput.value.trim(), true));
  document.getElementById("save-font-btn").addEventListener("click", async () => {
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
  document.getElementById("reset-font-btn").addEventListener("click", resetToDefaultFont);

  document.querySelectorAll("#chat-list-bottom-nav .nav-item").forEach((item) => {
    item.addEventListener("click", () => switchToChatListView(item.dataset.view));
  });
  document
    .getElementById("qzone-back-btn")
    .addEventListener("click", () => switchToChatListView("messages-view"));
  document.getElementById("qzone-nickname").addEventListener("click", async () => {
    const newNickname = await showCustomPrompt(
      "修改昵称",
      "请输入新的昵称",
      state.qzoneSettings.nickname
    );
    if (newNickname && newNickname.trim()) {
      state.qzoneSettings.nickname = newNickname.trim();
      await saveQzoneSettings();
      renderQzoneScreen();
    }
  });
  document
    .getElementById("qzone-avatar-container")
    .addEventListener("click", () => document.getElementById("qzone-avatar-input").click());
  document
    .getElementById("qzone-banner-container")
    .addEventListener("click", () => document.getElementById("qzone-banner-input").click());
  document.getElementById("qzone-avatar-input").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (file) {
      const dataUrl = await new Promise((res) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result);
        reader.readAsDataURL(file);
      });
      state.qzoneSettings.avatar = dataUrl;
      await saveQzoneSettings();
      renderQzoneScreen();
    }
    event.target.value = null;
  });
  document.getElementById("qzone-banner-input").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (file) {
      const dataUrl = await new Promise((res) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result);
        reader.readAsDataURL(file);
      });
      state.qzoneSettings.banner = dataUrl;
      await saveQzoneSettings();
      renderQzoneScreen();
    }
    event.target.value = null;
  });

  // ▼▼▼ 【修正后】的“说说”按钮事件 ▼▼▼
  document.getElementById("create-shuoshuo-btn").addEventListener("click", async () => {
    // 1. 重置并获取模态框
    resetCreatePostModal();
    const modal = document.getElementById("create-post-modal");

    // 2. 设置为“说说”模式
    modal.dataset.mode = "shuoshuo";

    // 3. 隐藏与图片/文字图相关的部分
    modal.querySelector(".post-mode-switcher").style.display = "none";
    modal.querySelector("#image-mode-content").style.display = "none";
    modal.querySelector("#text-image-mode-content").style.display = "none";

    // 4. 修改主输入框的提示语，使其更符合“说说”的场景
    modal.querySelector("#post-public-text").placeholder = "分享新鲜事...";

    // 5. 准备并显示模态框
    const visibilityGroupsContainer = document.getElementById("post-visibility-groups");
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
    modal.classList.add("visible");
  });

  // ▼▼▼ 【修正后】的“动态”（图片）按钮事件 ▼▼▼
  document.getElementById("create-post-btn").addEventListener("click", async () => {
    // 1. 重置并获取模态框
    resetCreatePostModal();
    const modal = document.getElementById("create-post-modal");

    // 2. 设置为“复杂动态”模式
    modal.dataset.mode = "complex";

    // 3. 确保与图片/文字图相关的部分是可见的
    modal.querySelector(".post-mode-switcher").style.display = "flex";
    // 显式激活“上传图片”模式...
    modal.querySelector("#image-mode-content").classList.add("active");
    // ...同时确保“文字图”模式是隐藏的
    modal.querySelector("#text-image-mode-content").classList.remove("active");

    // 4. 恢复主输入框的默认提示语
    modal.querySelector("#post-public-text").placeholder = "分享新鲜事...（非必填的公开文字）";

    // 5. 准备并显示模态框（与“说说”按钮的逻辑相同）
    const visibilityGroupsContainer = document.getElementById("post-visibility-groups");
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
    modal.classList.add("visible");
  });
  document.getElementById("open-album-btn").addEventListener("click", async () => {
    await renderAlbumList();
    showScreen("album-screen");
  });
  document.getElementById("album-back-btn").addEventListener("click", () => {
    showScreen("chat-list-screen");
    switchToChatListView("qzone-screen");
  });

  // --- ↓↓↓ 从这里开始复制 ↓↓↓ ---

  document.getElementById("album-photos-back-btn").addEventListener("click", () => {
    state.activeAlbumId = null;
    showScreen("album-screen");
  });

  document
    .getElementById("album-upload-photo-btn")
    .addEventListener("click", () => document.getElementById("album-photo-input").click());

  document.getElementById("album-photo-input").addEventListener("change", async (event) => {
    if (!state.activeAlbumId) return;
    const files = event.target.files;
    if (!files.length) return;

    const album = await db.qzoneAlbums.get(state.activeAlbumId);

    for (const file of files) {
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
      await db.qzonePhotos.add({
        albumId: state.activeAlbumId,
        url: dataUrl,
        createdAt: Date.now(),
      });
    }

    const photoCount = await db.qzonePhotos.where("albumId").equals(state.activeAlbumId).count();
    const updateData = { photoCount };

    if (!album.photoCount || album.coverUrl.includes("placeholder")) {
      const firstPhoto = await db.qzonePhotos.where("albumId").equals(state.activeAlbumId).first();
      if (firstPhoto) updateData.coverUrl = firstPhoto.url;
    }

    await db.qzoneAlbums.update(state.activeAlbumId, updateData);
    await renderAlbumPhotosScreen();
    await renderAlbumList();

    event.target.value = null;
    alert("照片上传成功！");
  });

  // --- ↑↑↑ 复制到这里结束 ↑↑↑ ---

  // --- ↓↓↓ 从这里开始复制，完整替换掉旧的 photos-grid-page 监听器 ↓↓↓ ---

  document.getElementById("photos-grid-page").addEventListener("click", async (e) => {
    const deleteBtn = e.target.closest(".photo-delete-btn");
    const photoThumb = e.target.closest(".photo-thumb");

    if (deleteBtn) {
      e.stopPropagation(); // 阻止事件冒泡到图片上
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
      // 这就是恢复的图片点击放大功能！
      openPhotoViewer(photoThumb.src);
    }
  });

  // 恢复图片查看器的控制事件
  document.getElementById("photo-viewer-close-btn").addEventListener("click", closePhotoViewer);
  document.getElementById("photo-viewer-next-btn").addEventListener("click", showNextPhoto);
  document.getElementById("photo-viewer-prev-btn").addEventListener("click", showPrevPhoto);

  // 恢复键盘左右箭头和ESC键的功能
  document.addEventListener("keydown", (e) => {
    if (!photoViewerState.isOpen) return;

    if (e.key === "ArrowRight") {
      showNextPhoto();
    } else if (e.key === "ArrowLeft") {
      showPrevPhoto();
    } else if (e.key === "Escape") {
      closePhotoViewer();
    }
  });

  // --- ↑↑↑ 复制到这里结束 ↑↑↑ ---

  document.getElementById("create-album-btn-page").addEventListener("click", async () => {
    const albumName = await showCustomPrompt("创建新相册", "请输入相册名称");
    if (albumName && albumName.trim()) {
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

  document
    .getElementById("cancel-create-post-btn")
    .addEventListener("click", () =>
      document.getElementById("create-post-modal").classList.remove("visible")
    );
  document
    .getElementById("post-upload-local-btn")
    .addEventListener("click", () => document.getElementById("post-local-image-input").click());
  document.getElementById("post-local-image-input").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        document.getElementById("post-image-preview").src = e.target.result;
        document.getElementById("post-image-preview-container").classList.add("visible");
        document.getElementById("post-image-desc-group").style.display = "block";
      };
      reader.readAsDataURL(file);
    }
  });
  document.getElementById("post-use-url-btn").addEventListener("click", async () => {
    const url = await showCustomPrompt("输入图片URL", "请输入网络图片的链接", "", "url");
    if (url) {
      document.getElementById("post-image-preview").src = url;
      document.getElementById("post-image-preview-container").classList.add("visible");
      document.getElementById("post-image-desc-group").style.display = "block";
    }
  });
  document
    .getElementById("post-remove-image-btn")
    .addEventListener("click", () => resetCreatePostModal());
  const imageModeBtn = document.getElementById("switch-to-image-mode");
  const textImageModeBtn = document.getElementById("switch-to-text-image-mode");
  const imageModeContent = document.getElementById("image-mode-content");
  const textImageModeContent = document.getElementById("text-image-mode-content");
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

  // ▼▼▼ 【最终修正版】的“发布”按钮事件，已修复权限漏洞 ▼▼▼
  document.getElementById("confirm-create-post-btn").addEventListener("click", async () => {
    const modal = document.getElementById("create-post-modal");
    const mode = modal.dataset.mode;

    // --- 1. 获取通用的可见性设置 ---
    const visibilityMode = document.querySelector('input[name="visibility"]:checked').value;
    let visibleGroupIds = null;

    if (visibilityMode === "include") {
      visibleGroupIds = Array.from(
        document.querySelectorAll('input[name="visibility_group"]:checked')
      ).map((cb) => parseInt(cb.value));
    }

    let newPost = {};
    const basePostData = {
      timestamp: Date.now(),
      authorId: "user",
      // 【重要】在这里就把权限信息存好
      visibleGroupIds: visibleGroupIds,
    };

    // --- 2. 根据模式构建不同的 post 对象 ---
    if (mode === "shuoshuo") {
      const content = document.getElementById("post-public-text").value.trim();
      if (!content) {
        alert("说说内容不能为空哦！");
        return;
      }
      newPost = {
        ...basePostData,
        type: "shuoshuo",
        content: content,
      };
    } else {
      // 处理 'complex' 模式 (图片/文字图)
      const publicText = document.getElementById("post-public-text").value.trim();
      const isImageModeActive = document
        .getElementById("image-mode-content")
        .classList.contains("active");

      if (isImageModeActive) {
        const imageUrl = document.getElementById("post-image-preview").src;
        const imageDescription = document.getElementById("post-image-description").value.trim();
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
          publicText: publicText,
          imageUrl: imageUrl,
          imageDescription: imageDescription,
        };
      } else {
        // 文字图模式
        const hiddenText = document.getElementById("post-hidden-text").value.trim();
        if (!hiddenText) {
          alert("请输入文字图描述！");
          return;
        }
        newPost = {
          ...basePostData,
          type: "text_image",
          publicText: publicText,
          hiddenContent: hiddenText,
        };
      }
    }

    // --- 3. 保存到数据库 ---
    const newPostId = await db.qzonePosts.add(newPost);
    let postSummary =
      newPost.content ||
      newPost.publicText ||
      newPost.imageDescription ||
      newPost.hiddenContent ||
      "（无文字内容）";
    postSummary = postSummary.substring(0, 50) + (postSummary.length > 50 ? "..." : "");

    // --- 4. 【核心修正】带有权限检查的通知循环 ---
    for (const chatId in state.chats) {
      const chat = state.chats[chatId];
      if (chat.isGroup) continue; // 跳过群聊

      let shouldNotify = false;
      const postVisibleGroups = newPost.visibleGroupIds;

      // 判断条件1：如果动态是公开的 (没有设置任何可见分组)
      if (!postVisibleGroups || postVisibleGroups.length === 0) {
        shouldNotify = true;
      }
      // 判断条件2：如果动态设置了部分可见，并且当前角色在可见分组内
      else if (chat.groupId && postVisibleGroups.includes(chat.groupId)) {
        shouldNotify = true;
      }

      // 只有满足条件的角色才会被通知
      if (shouldNotify) {
        const historyMessage = {
          role: "system",
          content: `[系统提示：用户刚刚发布了一条动态(ID: ${newPostId})，内容摘要是：“${postSummary}”。你现在可以对这条动态进行评论了。]`,
          timestamp: Date.now(),
          isHidden: true,
        };
        chat.history.push(historyMessage);
        await db.chats.put(chat);
      }
    }
    // --- 修正结束 ---

    await renderQzonePosts();
    modal.classList.remove("visible");
    alert("动态发布成功！");
  });

  // ▼▼▼ 请用这【一整块】包含所有滑动和点击事件的完整代码，替换掉旧的 postsList 事件监听器 ▼▼▼

  const postsList = document.getElementById("qzone-posts-list");
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
    document.querySelectorAll(".qzone-post-container").forEach((container) => {
      if (container !== exceptThisOne) {
        container.querySelector(".qzone-post-item").classList.remove("swiped");
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
        if (absDiffX > absDiffY) {
          swipeState.swipeDirection = "horizontal";
        } else {
          swipeState.swipeDirection = "vertical";
        }
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
      swipeState.activeContainer.querySelector(".qzone-post-item").style.transform =
        `translateX(${translation}px)`;
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

    swipeState.isDragging = false;
    swipeState.startX = 0;
    swipeState.startY = 0;
    swipeState.currentX = 0;
    swipeState.activeContainer = null;
    swipeState.swipeDirection = null;
    swipeState.isClick = true;
  };

  // --- 绑定所有滑动事件 ---
  postsList.addEventListener("mousedown", handleSwipeStart);
  document.addEventListener("mousemove", handleSwipeMove);
  document.addEventListener("mouseup", handleSwipeEnd);
  postsList.addEventListener("touchstart", handleSwipeStart, {
    passive: false,
  });
  postsList.addEventListener("touchmove", handleSwipeMove, {
    passive: false,
  });
  postsList.addEventListener("touchend", handleSwipeEnd);

  // --- 绑定所有点击事件 ---
  postsList.addEventListener("click", async (e) => {
    e.stopPropagation();
    const target = e.target;

    // --- 新增：处理评论删除按钮 ---
    if (target.classList.contains("comment-delete-btn")) {
      const postContainer = target.closest(".qzone-post-container");
      if (!postContainer) return;

      const postId = parseInt(postContainer.dataset.postId);
      const commentIndex = parseInt(target.dataset.commentIndex);
      if (isNaN(postId) || isNaN(commentIndex)) return;

      const post = await db.qzonePosts.get(postId);
      if (!post || !post.comments || !post.comments[commentIndex]) return;

      const commentText = post.comments[commentIndex].text;
      const confirmed = await showCustomConfirm(
        "删除评论",
        `确定要删除这条评论吗？\n\n“${commentText.substring(0, 50)}...”`,
        { confirmButtonClass: "btn-danger" }
      );

      if (confirmed) {
        // 从数组中移除该评论
        post.comments.splice(commentIndex, 1);
        // 更新数据库
        await db.qzonePosts.update(postId, { comments: post.comments });
        // 重新渲染列表以反映更改
        await renderQzonePosts();
        alert("评论已删除。");
      }
      return; // 处理完后直接返回
    }

    if (target.classList.contains("post-actions-btn")) {
      const container = target.closest(".qzone-post-container");
      if (container && container.dataset.postId) {
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
      const hiddenText = target.dataset.hiddenText;
      showCustomAlert("图片内容", hiddenText.replace(/<br>/g, "\n"));
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
            content: `[系统提示：'${state.qzoneSettings.nickname}' 在ID为${postId}的动态下发表了评论：“${commentText}”]`,
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
  // ▲▲▲ 替换结束 ▲▲▲

  // ▼▼▼ 在 init() 函数的事件监听器区域，粘贴下面这两行 ▼▼▼

  // 绑定动态页和收藏页的返回按钮
  document
    .getElementById("qzone-back-btn")
    .addEventListener("click", () => switchToChatListView("messages-view"));
  document
    .getElementById("favorites-back-btn")
    .addEventListener("click", () => switchToChatListView("messages-view"));

  // ▲▲▲ 添加结束 ▲▲▲

  // ▼▼▼ 在 init() 函数的事件监听器区域，检查并确保你有这段完整的代码 ▼▼▼

  // 收藏页搜索功能
  const searchInput = document.getElementById("favorites-search-input");
  const searchClearBtn = document.getElementById("favorites-search-clear-btn");

  searchInput.addEventListener("input", () => {
    const searchTerm = searchInput.value.trim().toLowerCase();

    // 控制清除按钮的显示/隐藏
    searchClearBtn.style.display = searchTerm ? "block" : "none";

    if (!searchTerm) {
      displayFilteredFavorites(allFavoriteItems); // 如果搜索框为空，显示所有
      return;
    }

    // 筛选逻辑
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

      // 同时搜索内容和作者，并且不区分大小写
      return (
        contentToSearch.toLowerCase().includes(searchTerm) ||
        authorToSearch.toLowerCase().includes(searchTerm)
      );
    });

    displayFilteredFavorites(filteredItems);
  });

  // 清除按钮的点击事件
  searchClearBtn.addEventListener("click", () => {
    searchInput.value = "";
    searchClearBtn.style.display = "none";
    displayFilteredFavorites(allFavoriteItems);
    searchInput.focus();
  });

  // ▲▲▲ 代码检查结束 ▲▲▲

  // ▼▼▼ 新增/修改的事件监听器 ▼▼▼

  // 为聊天界面的批量收藏按钮绑定事件
  // 为聊天界面的批量收藏按钮绑定事件 (已修正)
  document.getElementById("selection-favorite-btn").addEventListener("click", async () => {
    if (selectedMessages.size === 0) return;
    const chat = state.chats[state.activeChatId];
    if (!chat) return;

    const favoritesToAdd = [];
    const timestampsToFavorite = [...selectedMessages];

    for (const timestamp of timestampsToFavorite) {
      // 【核心修正1】使用新的、高效的索引进行查询
      const existing = await db.favorites.where("originalTimestamp").equals(timestamp).first();

      if (!existing) {
        const messageToSave = chat.history.find((msg) => msg.timestamp === timestamp);
        if (messageToSave) {
          favoritesToAdd.push({
            type: "chat_message",
            content: messageToSave,
            chatId: state.activeChatId,
            timestamp: Date.now(), // 这是收藏操作发生的时间
            originalTimestamp: messageToSave.timestamp, // 【核心修正2】保存原始消息的时间戳到新字段
          });
        }
      }
    }

    if (favoritesToAdd.length > 0) {
      await db.favorites.bulkAdd(favoritesToAdd);
      allFavoriteItems = await db.favorites.orderBy("timestamp").reverse().toArray(); // 更新全局收藏缓存
      await showCustomAlert("收藏成功", `已成功收藏 ${favoritesToAdd.length} 条消息。`);
    } else {
      await showCustomAlert("提示", "选中的消息均已收藏过。");
    }

    exitSelectionMode();
  });

  // 收藏页面的"编辑"按钮事件 (已修正)
  const favoritesEditBtn = document.getElementById("favorites-edit-btn");
  const favoritesView = document.getElementById("favorites-view");
  const favoritesActionBar = document.getElementById("favorites-action-bar");
  const mainBottomNav = document.getElementById("chat-list-bottom-nav"); // 获取主导航栏
  const favoritesList = document.getElementById("favorites-list"); // 获取收藏列表

  favoritesEditBtn.addEventListener("click", () => {
    isFavoritesSelectionMode = !isFavoritesSelectionMode;
    favoritesView.classList.toggle("selection-mode", isFavoritesSelectionMode);

    if (isFavoritesSelectionMode) {
      // --- 进入编辑模式 ---
      favoritesEditBtn.textContent = "完成";
      favoritesActionBar.style.display = "block"; // 显示删除操作栏
      mainBottomNav.style.display = "none"; // ▼ 新增：隐藏主导航栏
      favoritesList.style.paddingBottom = "80px"; // ▼ 新增：给列表底部增加空间
    } else {
      // --- 退出编辑模式 ---
      favoritesEditBtn.textContent = "编辑";
      favoritesActionBar.style.display = "none"; // 隐藏删除操作栏
      mainBottomNav.style.display = "flex"; // ▼ 新增：恢复主导航栏
      favoritesList.style.paddingBottom = ""; // ▼ 新增：恢复列表默认padding

      // 退出时清空所有选择
      selectedFavorites.clear();
      document
        .querySelectorAll(".favorite-item-card.selected")
        .forEach((card) => card.classList.remove("selected"));
      document.getElementById("favorites-delete-selected-btn").textContent = `删除 (0)`;
    }
  });

  // ▼▼▼ 将它【完整替换】为下面这段修正后的代码 ▼▼▼
  // 收藏列表的点击选择事件 (事件委托)
  document.getElementById("favorites-list").addEventListener("click", (e) => {
    const target = e.target;
    const card = target.closest(".favorite-item-card");

    // 【新增】处理文字图点击，这段逻辑要放在最前面，保证任何模式下都生效
    if (target.tagName === "IMG" && target.dataset.hiddenText) {
      const hiddenText = target.dataset.hiddenText;
      showCustomAlert("图片内容", hiddenText.replace(/<br>/g, "\n"));
      return; // 处理完就退出，不继续执行选择逻辑
    }

    // 如果不在选择模式，则不执行后续的选择操作
    if (!isFavoritesSelectionMode) return;

    // --- 以下是原有的选择逻辑，保持不变 ---
    if (!card) return;

    const favId = parseInt(card.dataset.favid);
    if (isNaN(favId)) return;

    // 切换选择状态
    if (selectedFavorites.has(favId)) {
      selectedFavorites.delete(favId);
      card.classList.remove("selected");
    } else {
      selectedFavorites.add(favId);
      card.classList.add("selected");
    }

    // 更新底部删除按钮的计数
    document.getElementById("favorites-delete-selected-btn").textContent =
      `删除 (${selectedFavorites.size})`;
  });

  // ▼▼▼ 将它【完整替换】为下面这段修正后的代码 ▼▼▼
  // 收藏页面批量删除按钮事件
  document.getElementById("favorites-delete-selected-btn").addEventListener("click", async () => {
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

      // 【核心修正1】从前端缓存中也移除被删除的项
      allFavoriteItems = allFavoriteItems.filter((item) => !idsToDelete.includes(item.id));

      // 【核心修正2】使用更新后的缓存，立即重新渲染列表
      displayFilteredFavorites(allFavoriteItems);

      // 最后，再退出编辑模式
      favoritesEditBtn.click(); // 模拟点击"完成"按钮来退出编辑模式
    }
  });

  // ▼▼▼ 在 init() 函数末尾添加 ▼▼▼
  if (state.globalSettings.enableBackgroundActivity) {
    startBackgroundSimulation();
    console.log("后台活动模拟已自动启动。");
  }
  // ▲▲▲ 添加结束 ▲▲▲

  // ▼▼▼ 【这是最终的正确代码】请粘贴这段代码到 init() 的事件监听器区域末尾 ▼▼▼

  // --- 统一处理所有影响预览的控件的事件 ---

  // 1. 监听主题选择
  document.querySelectorAll('input[name="theme-select"]').forEach((radio) => {
    radio.addEventListener("change", updateSettingsPreview);
  });

  // 2. 监听字体大小滑块
  const fontSizeSlider = document.getElementById("font-size-slider");
  fontSizeSlider.addEventListener("input", () => {
    // a. 实时更新数值显示
    document.getElementById("font-size-value").textContent = `${fontSizeSlider.value}px`;
    // b. 更新预览
    updateSettingsPreview();
  });

  // 3. 监听自定义CSS输入框
  const customCssInputForPreview = document.getElementById("custom-css-input");
  customCssInputForPreview.addEventListener("input", updateSettingsPreview);

  // 4. 监听重置按钮
  document.getElementById("reset-theme-btn").addEventListener("click", () => {
    document.getElementById("theme-default").checked = true;
    updateSettingsPreview();
  });

  document.getElementById("reset-custom-css-btn").addEventListener("click", () => {
    document.getElementById("custom-css-input").value = "";
    updateSettingsPreview();
  });

  // ▲▲▲ 粘贴结束 ▲▲▲

  // ▼▼▼ 请将这段【新代码】粘贴到 init() 的事件监听器区域末尾 ▼▼▼
  document.querySelectorAll('input[name="visibility"]').forEach((radio) => {
    radio.addEventListener("change", function () {
      const groupsContainer = document.getElementById("post-visibility-groups");
      if (this.value === "include" || this.value === "exclude") {
        groupsContainer.style.display = "block";
      } else {
        groupsContainer.style.display = "none";
      }
    });
  });
  // ▲▲▲ 新代码粘贴结束 ▲▲▲

  // ▼▼▼ 请将这段【新代码】粘贴到 init() 的事件监听器区域末尾 ▼▼▼
  document.getElementById("manage-groups-btn").addEventListener("click", openGroupManager);
  document.getElementById("close-group-manager-btn").addEventListener("click", () => {
    document.getElementById("group-management-modal").classList.remove("visible");
    // 刷新聊天设置里的分组列表
    const chatSettingsBtn = document.getElementById("chat-settings-btn");
    if (document.getElementById("chat-settings-modal").classList.contains("visible")) {
      chatSettingsBtn.click(); // 再次点击以重新打开
    }
  });

  document.getElementById("add-new-group-btn").addEventListener("click", addNewGroup);
  document.getElementById("existing-groups-list").addEventListener("click", (e) => {
    if (e.target.classList.contains("delete-group-btn")) {
      const groupId = parseInt(e.target.dataset.id);
      deleteGroup(groupId);
    }
  });
  // ▲▲▲ 新代码粘贴结束 ▲▲▲

  // ▼▼▼ 请将这段【新代码】粘贴到 init() 的事件监听器区域末尾 ▼▼▼
  // 消息操作菜单的按钮事件
  document
    .getElementById("cancel-message-action-btn")
    .addEventListener("click", hideMessageActions);
  // ▼▼▼ 【修正】使用新的编辑器入口 ▼▼▼
  document.getElementById("edit-message-btn").addEventListener("click", openAdvancedMessageEditor);
  // ▲▲▲ 替换结束 ▲▲▲
  document.getElementById("copy-message-btn").addEventListener("click", copyMessageContent);

  // ▼▼▼ 在这里添加新代码 ▼▼▼
  document.getElementById("recall-message-btn").addEventListener("click", handleRecallClick);
  // ▲▲▲ 添加结束 ▲▲▲

  // ▼▼▼ 请用这段【修正后】的代码替换旧的 select-message-btn 事件监听器 ▼▼▼
  document.getElementById("select-message-btn").addEventListener("click", () => {
    // 【核心修复】在关闭菜单前，先捕获时间戳
    const timestampToSelect = activeMessageTimestamp;
    hideMessageActions();
    // 使用捕获到的值
    if (timestampToSelect) {
      enterSelectionMode(timestampToSelect);
    }
  });
  // ▲▲▲ 替换结束 ▲▲▲

  // ▼▼▼ 在 init() 函数的事件监听器区域末尾添加 ▼▼▼

  // 动态操作菜单的按钮事件
  document.getElementById("edit-post-btn").addEventListener("click", openPostEditor);
  document.getElementById("copy-post-btn").addEventListener("click", copyPostContent);
  document.getElementById("cancel-post-action-btn").addEventListener("click", hidePostActions);

  // ▲▲▲ 添加结束 ▲▲▲

  // ▼▼▼ 【新增】联系人选择器事件绑定 ▼▼▼
  document.getElementById("cancel-contact-picker-btn").addEventListener("click", () => {
    showScreen("chat-list-screen");
  });

  document.getElementById("contact-picker-list").addEventListener("click", (e) => {
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

  // ▼▼▼ 【新增】绑定“管理群成员”按钮事件 ▼▼▼
  document.getElementById("manage-members-btn").addEventListener("click", () => {
    // 在切换屏幕前，先隐藏当前的聊天设置弹窗
    document.getElementById("chat-settings-modal").classList.remove("visible");
    // 然后再打开成员管理屏幕
    openMemberManagementScreen();
  });
  // ▲▲▲ 新增代码结束 ▲▲▲

  // ▼▼▼ 【最终完整版】群成员管理功能事件绑定 ▼▼▼
  document.getElementById("back-from-member-management").addEventListener("click", () => {
    showScreen("chat-interface-screen");
    document.getElementById("chat-settings-btn").click();
  });
  // ▲▲▲ 替换结束 ▲▲▲

  document.getElementById("member-management-list").addEventListener("click", (e) => {
    // 【已恢复】移除成员的事件
    if (e.target.classList.contains("remove-member-btn")) {
      removeMemberFromGroup(e.target.dataset.memberId);
    }
  });

  document.getElementById("add-existing-contact-btn").addEventListener("click", async () => {
    // 【已恢复】从好友列表添加的事件
    // 【关键】为“完成”按钮绑定“拉人入群”的逻辑
    const confirmBtn = document.getElementById("confirm-contact-picker-btn");
    // 使用克隆节点方法清除旧的事件监听器，防止重复绑定
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    newConfirmBtn.addEventListener("click", handleAddMembersToGroup);

    await openContactPickerForAddMember();
  });

  document
    .getElementById("create-new-member-btn")
    .addEventListener("click", createNewMemberInGroup);
  // ▲▲▲ 替换结束 ▲▲▲

  // ▼▼▼ 【全新】视频通话功能事件监听器 ▼▼▼

  // 绑定单聊和群聊的发起按钮
  document.getElementById("video-call-btn").addEventListener("click", handleInitiateCall);
  document.getElementById("group-video-call-btn").addEventListener("click", handleInitiateCall);

  // 绑定“挂断”按钮
  document.getElementById("hang-up-btn").addEventListener("click", endVideoCall);

  // 绑定“取消呼叫”按钮
  document.getElementById("cancel-call-btn").addEventListener("click", () => {
    videoCallState.isAwaitingResponse = false;
    showScreen("chat-interface-screen");
  });

  // 【全新】绑定“加入通话”按钮
  document.getElementById("join-call-btn").addEventListener("click", handleUserJoinCall);

  // ▼▼▼ 用这个【已修复并激活旁观模式】的版本替换旧的 decline-call-btn 事件监听器 ▼▼▼
  // 绑定来电请求的“拒绝”按钮
  document.getElementById("decline-call-btn").addEventListener("click", async () => {
    hideIncomingCallModal();
    const chat = state.chats[videoCallState.activeChatId];
    if (!chat) return;

    // 【核心修正】在这里，我们将拒绝的逻辑与API调用连接起来
    if (videoCallState.isGroupCall) {
      videoCallState.isUserParticipating = false; // 标记用户为旁观者

      // 1. 创建一条隐藏消息，通知AI用户拒绝了
      const systemNote = {
        role: "system",
        content: `[系统提示：用户拒绝了通话邀请，但你们可以自己开始。请你们各自决策是否加入。]`,
        timestamp: Date.now(),
        isHidden: true,
      };
      chat.history.push(systemNote);
      await db.chats.put(chat);

      // 2. 【关键】触发AI响应，让它们自己决定要不要开始群聊
      // 这将会在后台处理，如果AI们决定开始，最终会调用 startVideoCall()
      await triggerAiResponse();
    } else {
      // 单聊拒绝逻辑保持不变
      const declineMessage = {
        role: "user",
        content: "我拒绝了你的视频通话请求。",
        timestamp: Date.now(),
      };
      chat.history.push(declineMessage);
      await db.chats.put(chat);

      // 回到聊天界面并显示拒绝消息
      showScreen("chat-interface-screen");
      appendMessage(declineMessage, chat);

      // 让AI对你的拒绝做出回应
      triggerAiResponse();
    }

    // 清理状态，以防万一
    videoCallState.isAwaitingResponse = false;
  });
  // ▲▲▲ 替换结束 ▲▲▲

  // ▼▼▼ 用这个【已修复重复头像BUG】的版本替换旧的 accept-call-btn 事件监听器 ▼▼▼
  // 绑定来电请求的“接听”按钮
  document.getElementById("accept-call-btn").addEventListener("click", async () => {
    hideIncomingCallModal();

    videoCallState.initiator = "ai";
    videoCallState.isUserParticipating = true;
    videoCallState.activeChatId = state.activeChatId;

    // 【核心修正】我们在这里不再手动添加用户到 participants 列表
    if (videoCallState.isGroupCall) {
      // 对于群聊，我们只把【发起通话的AI】加入参与者列表
      const chat = state.chats[videoCallState.activeChatId];
      const requester = chat.members.find((m) => m.name === videoCallState.callRequester);
      if (requester) {
        // 清空可能存在的旧数据，然后只添加发起者
        videoCallState.participants = [requester];
      } else {
        videoCallState.participants = []; // 如果找不到发起者，就清空
      }
    }

    // 无论单聊还是群聊，直接启动通话界面！
    startVideoCall();
  });
  // ▲▲▲ 替换结束 ▲▲▲

  // ▼▼▼ 请用这个【已增加用户高亮】的全新版本，完整替换旧的 user-speak-btn 事件监听器 ▼▼▼
  // 绑定用户在通话中发言的按钮
  document.getElementById("user-speak-btn").addEventListener("click", async () => {
    if (!videoCallState.isActive) return;

    // ★★★★★ 核心新增：在弹出输入框前，先找到并高亮用户头像 ★★★★★
    const userAvatar = document.querySelector(
      '.participant-avatar-wrapper[data-participant-id="user"] .participant-avatar'
    );
    if (userAvatar) {
      userAvatar.classList.add("speaking");
    }

    const userInput = await showCustomPrompt("你说", "请输入你想说的话...");

    // ★★★★★ 核心新增：无论用户是否输入，只要关闭输入框就移除高亮 ★★★★★
    if (userAvatar) {
      userAvatar.classList.remove("speaking");
    }

    if (userInput && userInput.trim()) {
      triggerAiInCallAction(userInput.trim());
    }
  });
  // ▲▲▲ 替换结束 ▲▲▲

  // ▼▼▼ 【新增】回忆录相关事件绑定 ▼▼▼
  // 1. 将“回忆”页签和它的视图连接起来
  document.querySelector('.nav-item[data-view="memories-view"]').addEventListener("click", () => {
    // 在切换前，确保"收藏"页面的编辑模式已关闭
    if (isFavoritesSelectionMode) {
      document.getElementById("favorites-edit-btn").click();
    }
    switchToChatListView("memories-view");
    renderMemoriesScreen(); // 点击时渲染
  });

  // 2. 绑定回忆录界面的返回按钮
  document
    .getElementById("memories-back-btn")
    .addEventListener("click", () => switchToChatListView("messages-view"));

  // ▲▲▲ 新增结束 ▲▲▲

  // 【全新】约定/倒计时功能事件绑定
  document.getElementById("add-countdown-btn").addEventListener("click", () => {
    document.getElementById("create-countdown-modal").classList.add("visible");
  });
  document.getElementById("cancel-create-countdown-btn").addEventListener("click", () => {
    document.getElementById("create-countdown-modal").classList.remove("visible");
  });
  document.getElementById("confirm-create-countdown-btn").addEventListener("click", async () => {
    const title = document.getElementById("countdown-title-input").value.trim();
    const dateValue = document.getElementById("countdown-date-input").value;

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
      chatId: null, // 用户创建的，不属于任何特定AI
      authorName: "我",
      description: title,
      timestamp: Date.now(),
      type: "countdown",
      targetDate: targetDate.getTime(),
    };

    await db.memories.add(newCountdown);
    document.getElementById("create-countdown-modal").classList.remove("visible");
    renderMemoriesScreen();
  });

  // 【全新】拉黑功能事件绑定
  document.getElementById("block-chat-btn").addEventListener("click", async () => {
    if (!state.activeChatId || state.chats[state.activeChatId].isGroup) return;

    const chat = state.chats[state.activeChatId];
    const confirmed = await showCustomConfirm(
      "确认拉黑",
      `确定要拉黑“${chat.name}”吗？拉黑后您将无法向其发送消息，直到您将Ta移出黑名单，或等待Ta重新申请好友。`,
      { confirmButtonClass: "btn-danger" }
    );

    if (confirmed) {
      chat.relationship.status = "blocked_by_user";
      chat.relationship.blockedTimestamp = Date.now();

      // ▼▼▼ 在这里添加下面的代码 ▼▼▼
      const hiddenMessage = {
        role: "system",
        content: `[系统提示：你刚刚被用户拉黑了。在对方解除拉黑之前，你无法再主动发起对话，也无法回应。]`,
        timestamp: Date.now() + 1,
        isHidden: true,
      };
      chat.history.push(hiddenMessage);
      // ▲▲▲ 添加结束 ▲▲▲

      await db.chats.put(chat);

      // 关闭设置弹窗，并刷新聊天界面
      document.getElementById("chat-settings-modal").classList.remove("visible");
      renderChatInterface(state.activeChatId);
      // 刷新聊天列表，可能会有UI变化
      renderChatList();
    }
  });

  document.getElementById("chat-lock-overlay").addEventListener("click", async (e) => {
    const chat = state.chats[state.activeChatId];
    if (!chat) return;

    if (e.target.id === "force-apply-check-btn") {
      alert(
        "正在手动触发好友申请流程，请稍后...\n如果API调用成功，将弹出提示。如果失败，也会有错误提示。如果长时间无反应，说明AI可能决定暂时不申请。"
      );
      await triggerAiFriendApplication(chat.id);
      renderChatInterface(chat.id);
      return;
    }

    if (e.target.id === "unblock-btn") {
      chat.relationship.status = "friend";
      chat.relationship.blockedTimestamp = null;

      // ▼▼▼ 在这里添加下面的代码 ▼▼▼
      const hiddenMessage = {
        role: "system",
        content: `[系统提示：用户刚刚解除了对你的拉黑。现在你们可以重新开始对话了。]`,
        timestamp: Date.now(),
        isHidden: true,
      };
      chat.history.push(hiddenMessage);
      // ▲▲▲ 添加结束 ▲▲▲

      await db.chats.put(chat);
      renderChatInterface(chat.id);
      renderChatList();
      triggerAiResponse(); // 【可选但推荐】解除后让AI主动说点什么
    } else if (e.target.id === "accept-friend-btn") {
      chat.relationship.status = "friend";
      chat.relationship.applicationReason = "";

      // ▼▼▼ 在这里添加下面的代码 ▼▼▼
      const hiddenMessage = {
        role: "system",
        content: `[系统提示：用户刚刚通过了你的好友申请。你们现在又可以正常聊天了。]`,
        timestamp: Date.now(),
        isHidden: true,
      };
      chat.history.push(hiddenMessage);
      // ▲▲▲ 添加结束 ▲▲▲

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
    }
    // 【新增】处理申请好友按钮的点击事件
    else if (e.target.id === "apply-friend-btn") {
      const reason = await showCustomPrompt(
        "发送好友申请",
        `请输入你想对“${chat.name}”说的申请理由：`,
        "我们和好吧！"
      );
      // 只有当用户输入了内容并点击“确定”后才继续
      if (reason !== null) {
        // 更新关系状态为“等待AI批准”
        chat.relationship.status = "pending_ai_approval";
        chat.relationship.applicationReason = reason;
        await db.chats.put(chat);

        // 刷新UI，显示“等待通过”的界面
        renderChatInterface(chat.id);
        renderChatList();

        // 【关键】触发AI响应，让它去处理这个好友申请
        triggerAiResponse();
      }
    }
  });

  // ▼▼▼ 【全新】红包功能事件绑定 ▼▼▼

  // 1. 将原有的转账按钮(￥)的点击事件，重定向到新的总入口函数
  document.getElementById("transfer-btn").addEventListener("click", handlePaymentButtonClick);

  // 2. 红包模态框内部的控制按钮
  document.getElementById("cancel-red-packet-btn").addEventListener("click", () => {
    document.getElementById("red-packet-modal").classList.remove("visible");
  });
  document.getElementById("send-group-packet-btn").addEventListener("click", sendGroupRedPacket);
  document.getElementById("send-direct-packet-btn").addEventListener("click", sendDirectRedPacket);

  // 3. 红包模态框的页签切换逻辑
  const rpTabGroup = document.getElementById("rp-tab-group");
  const rpTabDirect = document.getElementById("rp-tab-direct");
  const rpContentGroup = document.getElementById("rp-content-group");
  const rpContentDirect = document.getElementById("rp-content-direct");

  rpTabGroup.addEventListener("click", () => {
    rpTabGroup.classList.add("active");
    rpTabDirect.classList.remove("active");
    rpContentGroup.style.display = "block";
    rpContentDirect.style.display = "none";
  });
  rpTabDirect.addEventListener("click", () => {
    rpTabDirect.classList.add("active");
    rpTabGroup.classList.remove("active");
    rpContentDirect.style.display = "block";
    rpContentGroup.style.display = "none";
  });

  // 4. 实时更新红包金额显示
  document.getElementById("rp-group-amount").addEventListener("input", (e) => {
    const amount = parseFloat(e.target.value) || 0;
    document.getElementById("rp-group-total").textContent = `¥ ${amount.toFixed(2)}`;
  });
  document.getElementById("rp-direct-amount").addEventListener("input", (e) => {
    const amount = parseFloat(e.target.value) || 0;
    document.getElementById("rp-direct-total").textContent = `¥ ${amount.toFixed(2)}`;
  });

  // ▲▲▲ 新事件绑定结束 ▲▲▲

  // ▼▼▼ 【全新添加】使用事件委托处理红包点击，修复失效问题 ▼▼▼
  document.getElementById("chat-messages").addEventListener("click", (e) => {
    // 1. 找到被点击的红包卡片
    const packetCard = e.target.closest(".red-packet-card");
    if (!packetCard) return; // 如果点击的不是红包，就什么也不做

    // 2. 从红包卡片的父级.message-bubble获取时间戳
    const messageBubble = packetCard.closest(".message-bubble");
    if (!messageBubble || !messageBubble.dataset.timestamp) return;

    // 3. 调用我们现有的处理函数
    const timestamp = parseInt(messageBubble.dataset.timestamp);
    handlePacketClick(timestamp);
  });
  // ▲▲▲ 新增代码结束 ▲▲▲

  // ▼▼▼ 【全新】投票功能事件监听器 ▼▼▼
  // 在输入框工具栏添加按钮
  document.getElementById("send-poll-btn").addEventListener("click", openCreatePollModal);

  // 投票创建模态框的按钮
  document.getElementById("add-poll-option-btn").addEventListener("click", addPollOptionInput);
  document.getElementById("cancel-create-poll-btn").addEventListener("click", () => {
    document.getElementById("create-poll-modal").classList.remove("visible");
  });
  document.getElementById("confirm-create-poll-btn").addEventListener("click", sendPoll);

  // 使用事件委托处理投票卡片内的所有点击事件
  document.getElementById("chat-messages").addEventListener("click", (e) => {
    const pollCard = e.target.closest(".poll-card");
    if (!pollCard) return;

    const timestamp = parseInt(pollCard.dataset.pollTimestamp);
    if (isNaN(timestamp)) return;

    // 点击了选项
    const optionItem = e.target.closest(".poll-option-item");
    if (optionItem && !pollCard.classList.contains("closed")) {
      handleUserVote(timestamp, optionItem.dataset.option);
      return;
    }

    // 点击了动作按钮（结束投票/查看结果）
    const actionBtn = e.target.closest(".poll-action-btn");
    if (actionBtn) {
      if (pollCard.classList.contains("closed")) {
        showPollResults(timestamp);
      } else {
        endPoll(timestamp);
      }
      return;
    }

    // 如果是已结束的投票，点击卡片任何地方都可以查看结果
    if (pollCard.classList.contains("closed")) {
      showPollResults(timestamp);
    }
  });
  // ▲▲▲ 新事件监听器粘贴结束 ▲▲▲

  // ▼▼▼ 【全新】AI头像库功能事件绑定 ▼▼▼
  document
    .getElementById("manage-ai-avatar-library-btn")
    .addEventListener("click", openAiAvatarLibraryModal);
  document.getElementById("add-ai-avatar-btn").addEventListener("click", addAvatarToLibrary);
  document
    .getElementById("close-ai-avatar-library-btn")
    .addEventListener("click", closeAiAvatarLibraryModal);
  // ▲▲▲ 新增结束 ▲▲▲

  // ▼▼▼ 在 init() 的事件监听区域，粘贴这段【新代码】▼▼▼
  document.getElementById("icon-settings-grid").addEventListener("click", async (e) => {
    if (e.target.classList.contains("change-icon-btn")) {
      const item = e.target.closest(".icon-setting-item");
      const iconId = item.dataset.iconId;
      if (!iconId) return;

      const currentUrl = state.globalSettings.appIcons[iconId];
      const newUrl = await showCustomPrompt(
        `更换“${item.querySelector(".icon-preview").alt}”图标`,
        "请输入新的图片URL",
        currentUrl,
        "url"
      );

      if (newUrl && newUrl.trim().startsWith("http")) {
        // 仅在内存中更新，等待用户点击“保存”
        state.globalSettings.appIcons[iconId] = newUrl.trim();
        // 实时更新设置页面的预览图
        item.querySelector(".icon-preview").src = newUrl.trim();
      } else if (newUrl !== null) {
        alert("请输入一个有效的URL！");
      }
    }
  });
  // ▲▲▲ 新代码粘贴结束 ▲▲▲

  // ▼▼▼ 在 init() 函数的末尾，粘贴这段【全新的事件监听器】 ▼▼▼

  document.getElementById("chat-messages").addEventListener("click", (e) => {
    // 使用 .closest() 向上查找被点击的卡片
    const linkCard = e.target.closest(".link-share-card");
    if (linkCard) {
      const timestamp = parseInt(linkCard.dataset.timestamp);
      if (!isNaN(timestamp)) {
        openBrowser(timestamp); // 调用我们的函数
      }
    }
  });

  // 浏览器返回按钮的事件监听，确保它只绑定一次
  document.getElementById("browser-back-btn").addEventListener("click", () => {
    showScreen("chat-interface-screen");
  });

  // ▲▲▲ 新代码粘贴结束 ▲▲▲

  // ▼▼▼ 在 init() 函数的末尾，粘贴这段【全新的事件监听器】 ▼▼▼

  // 1. 绑定输入框上方“分享链接”按钮的点击事件
  document.getElementById("share-link-btn").addEventListener("click", openShareLinkModal);

  // 2. 绑定模态框中“取消”按钮的点击事件
  document.getElementById("cancel-share-link-btn").addEventListener("click", () => {
    document.getElementById("share-link-modal").classList.remove("visible");
  });

  // 3. 绑定模态框中“分享”按钮的点击事件
  document.getElementById("confirm-share-link-btn").addEventListener("click", sendUserLinkShare);

  // ▲▲▲ 新代码粘贴结束 ▲▲▲

  document.getElementById("theme-toggle-switch").addEventListener("change", toggleTheme);

  // ▼▼▼ 在 init() 的事件监听器区域，粘贴下面这几行 ▼▼▼
  // 绑定消息操作菜单中的“引用”按钮
  document.getElementById("quote-message-btn").addEventListener("click", startReplyToMessage);

  // 绑定回复预览栏中的“取消”按钮
  document.getElementById("cancel-reply-btn").addEventListener("click", cancelReplyMode);
  // ▲▲▲ 粘贴结束 ▲▲▲

  // 在你的 init() 函数的事件监听器区域...

  // ▼▼▼ 用这段代码替换旧的转账卡片点击事件 ▼▼▼
  document.getElementById("chat-messages").addEventListener("click", (e) => {
    // 1. 向上查找被点击的元素是否在一个消息气泡内
    const bubble = e.target.closest(".message-bubble");
    if (!bubble) return; // 如果不在，就退出

    // 2. 【核心修正】在这里添加严格的筛选条件
    // 必须是 AI 的消息 (.ai)
    // 必须是转账类型 (.is-transfer)
    // 必须是我们标记为“待处理”的 (data-status="pending")
    if (
      bubble.classList.contains("ai") &&
      bubble.classList.contains("is-transfer") &&
      bubble.dataset.status === "pending"
    ) {
      // 3. 只有满足所有条件，才执行后续逻辑
      const timestamp = parseInt(bubble.dataset.timestamp);
      if (!isNaN(timestamp)) {
        showTransferActionModal(timestamp);
      }
    }
  });
  // ▲▲▲ 替换结束 ▲▲▲

  // 在 init() 的事件监听区域添加
  document
    .getElementById("transfer-action-accept")
    .addEventListener("click", () => handleUserTransferResponse("accepted"));
  document
    .getElementById("transfer-action-decline")
    .addEventListener("click", () => handleUserTransferResponse("declined"));
  document
    .getElementById("transfer-action-cancel")
    .addEventListener("click", hideTransferActionModal);

  // ▼▼▼ 用这段【新代码】替换旧的通话记录事件绑定 ▼▼▼

  document.getElementById("chat-list-title").addEventListener("click", renderCallHistoryScreen);

  // 2. 绑定通话记录页面的“返回”按钮
  document.getElementById("call-history-back-btn").addEventListener("click", () => {
    // 【核心修改】返回到聊天列表页面，而不是聊天界面
    showScreen("chat-list-screen");
  });

  // 3. 监听卡片点击的逻辑保持不变
  document.getElementById("call-history-list").addEventListener("click", (e) => {
    const card = e.target.closest(".call-record-card");
    if (card && card.dataset.recordId) {
      showCallTranscript(parseInt(card.dataset.recordId));
    }
  });

  // 4. 关闭详情弹窗的逻辑保持不变
  document.getElementById("close-transcript-modal-btn").addEventListener("click", () => {
    document.getElementById("call-transcript-modal").classList.remove("visible");
  });

  // ▲▲▲ 替换结束 ▲▲▲

  document.getElementById("chat-messages").addEventListener("click", (e) => {
    // 1. 检查点击的是否是语音条
    const voiceBody = e.target.closest(".voice-message-body");
    if (!voiceBody) return;

    // 2. 找到相关的DOM元素
    const bubble = voiceBody.closest(".message-bubble");
    if (!bubble) return;

    const spinner = voiceBody.querySelector(".loading-spinner");
    const transcriptEl = bubble.querySelector(".voice-transcript");

    // 如果正在加载中，则不响应点击
    if (bubble.dataset.state === "loading") {
      return;
    }

    // 3. 如果文字已经展开，则收起
    if (bubble.dataset.state === "expanded") {
      transcriptEl.style.display = "none";
      bubble.dataset.state = "collapsed";
    }
    // 4. 如果是收起状态，则开始“转录”流程
    else {
      bubble.dataset.state = "loading"; // 进入加载状态
      spinner.style.display = "block"; // 显示加载动画

      // 模拟1.5秒的语音识别过程
      setTimeout(() => {
        // 检查此时元素是否还存在（可能用户已经切换了聊天）
        if (document.body.contains(bubble)) {
          const voiceText = bubble.dataset.voiceText || "(无法识别)";
          transcriptEl.textContent = voiceText; // 填充文字

          spinner.style.display = "none"; // 隐藏加载动画
          transcriptEl.style.display = "block"; // 显示文字
          bubble.dataset.state = "expanded"; // 进入展开状态
        }
      }, 500);
    }
  });

  document.getElementById("chat-header-status").addEventListener("click", handleEditStatusClick);

  // 在 init() 的事件监听器区域添加
  document.getElementById("selection-share-btn").addEventListener("click", () => {
    if (selectedMessages.size > 0) {
      openShareTargetPicker(); // 打开我们即将创建的目标选择器
    }
  });

  // 在 init() 的事件监听器区域添加
  document.getElementById("confirm-share-target-btn").addEventListener("click", async () => {
    const sourceChat = state.chats[state.activeChatId];
    const selectedTargetIds = Array.from(
      document.querySelectorAll(".share-target-checkbox:checked")
    ).map((cb) => cb.dataset.chatId);

    if (selectedTargetIds.length === 0) {
      alert("请至少选择一个要分享的聊天。");
      return;
    }

    // 1. 打包聊天记录
    const sharedHistory = [];
    const sortedTimestamps = [...selectedMessages].sort((a, b) => a - b);
    for (const timestamp of sortedTimestamps) {
      const msg = sourceChat.history.find((m) => m.timestamp === timestamp);
      if (msg) {
        sharedHistory.push(msg);
      }
    }

    // 2. 创建分享卡片消息对象
    const shareCardMessage = {
      role: "user",
      senderName: sourceChat.isGroup ? sourceChat.settings.myNickname || "我" : "我",
      type: "share_card",
      timestamp: Date.now(),
      payload: {
        sourceChatName: sourceChat.name,
        title: `来自“${sourceChat.name}”的聊天记录`,
        sharedHistory: sharedHistory,
      },
    };

    // 3. 循环发送到所有目标聊天
    for (const targetId of selectedTargetIds) {
      const targetChat = state.chats[targetId];
      if (targetChat) {
        targetChat.history.push(shareCardMessage);
        await db.chats.put(targetChat);
      }
    }

    // 4. 收尾工作
    document.getElementById("share-target-modal").classList.remove("visible");
    exitSelectionMode(); // 退出多选模式
    await showCustomAlert(
      "分享成功",
      `聊天记录已成功分享到 ${selectedTargetIds.length} 个会话中。`
    );
    renderChatList(); // 刷新列表，可能会有新消息提示
  });

  // 绑定取消按钮
  document.getElementById("cancel-share-target-btn").addEventListener("click", () => {
    document.getElementById("share-target-modal").classList.remove("visible");
  });

  // 在 init() 的事件监听器区域添加
  document.getElementById("chat-messages").addEventListener("click", (e) => {
    // ...你已有的其他点击事件逻辑...

    // 新增逻辑：处理分享卡片的点击
    const shareCard = e.target.closest(".link-share-card[data-timestamp]");
    if (shareCard && shareCard.closest(".message-bubble.is-link-share")) {
      const timestamp = parseInt(shareCard.dataset.timestamp);
      openSharedHistoryViewer(timestamp);
    }
  });

  // 绑定查看器的关闭按钮
  document.getElementById("close-shared-history-viewer-btn").addEventListener("click", () => {
    document.getElementById("shared-history-viewer-modal").classList.remove("visible");
  });

  // 创建新函数来处理渲染逻辑
  function openSharedHistoryViewer(timestamp) {
    const chat = state.chats[state.activeChatId];
    const message = chat.history.find((m) => m.timestamp === timestamp);
    if (!message || message.type !== "share_card") return;

    const viewerModal = document.getElementById("shared-history-viewer-modal");
    const viewerTitle = document.getElementById("shared-history-viewer-title");
    const viewerContent = document.getElementById("shared-history-viewer-content");

    viewerTitle.textContent = message.payload.title;
    viewerContent.innerHTML = ""; // 清空旧内容

    // 【核心】复用 createMessageElement 来渲染每一条被分享的消息
    message.payload.sharedHistory.forEach((sharedMsg) => {
      // 注意：这里我们传入的是 sourceChat 对象，以确保头像、昵称等正确
      const sourceChat =
        Object.values(state.chats).find((c) => c.name === message.payload.sourceChatName) || chat;
      const bubbleEl = createMessageElement(sharedMsg, sourceChat);
      if (bubbleEl) {
        viewerContent.appendChild(bubbleEl);
      }
    });

    viewerModal.classList.add("visible");
  }

  audioPlayer.addEventListener("timeupdate", updateMusicProgressBar);

  audioPlayer.addEventListener("pause", () => {
    if (musicState.isActive) {
      musicState.isPlaying = false;
      updatePlayerUI();
    }
  });
  audioPlayer.addEventListener("play", () => {
    if (musicState.isActive) {
      musicState.isPlaying = true;
      updatePlayerUI();
    }
  });

  document.getElementById("playlist-body").addEventListener("click", async (e) => {
    const target = e.target;
    if (target.classList.contains("delete-track-btn")) {
      const index = parseInt(target.dataset.index);
      const track = musicState.playlist[index];
      const confirmed = await showCustomConfirm(
        "删除歌曲",
        `确定要从播放列表中删除《${track.name}》吗？`
      );
      if (confirmed) {
        deleteTrack(index);
      }
      return;
    }
    if (target.classList.contains("lyrics-btn")) {
      const index = parseInt(target.dataset.index);
      if (isNaN(index)) return;
      const lrcContent = await new Promise((resolve) => {
        const lrcInput = document.getElementById("lrc-upload-input");
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

  document.querySelector(".progress-bar").addEventListener("click", (e) => {
    if (!audioPlayer.duration) return;
    const progressBar = e.currentTarget;
    const barWidth = progressBar.clientWidth;
    const clickX = e.offsetX;
    audioPlayer.currentTime = (clickX / barWidth) * audioPlayer.duration;
  });

  // ▼▼▼ 在 init() 函数的事件监听器区域，粘贴这段新代码 ▼▼▼

  // 使用事件委托来处理所有“已撤回消息”的点击事件
  document.getElementById("chat-messages").addEventListener("click", (e) => {
    // 检查被点击的元素或其父元素是否是“已撤回”提示
    const placeholder = e.target.closest(".recalled-message-placeholder");
    if (!placeholder) return; // 如果不是，就退出

    // 如果是，就从聊天记录中找到对应的数据并显示
    const chat = state.chats[state.activeChatId];
    const wrapper = placeholder.closest(".message-wrapper"); // 找到它的父容器
    if (chat && wrapper) {
      // 从父容器上找到时间戳
      const timestamp = parseInt(wrapper.dataset.timestamp);
      const recalledMsg = chat.history.find((m) => m.timestamp === timestamp);

      if (recalledMsg && recalledMsg.recalledData) {
        let originalContentText = "";
        const recalled = recalledMsg.recalledData;

        if (recalled.originalType === "text") {
          originalContentText = `原文: "${recalled.originalContent}"`;
        } else {
          originalContentText = `撤回了一条[${recalled.originalType}]类型的消息`;
        }
        showCustomAlert("已撤回的消息", originalContentText);
      }
    }
  });

  // ▲▲▲ 新代码粘贴结束 ▲▲▲

  // ▼▼▼ 在 init() 的事件监听器区域，粘贴这段新代码 ▼▼▼
  document
    .getElementById("manage-world-book-categories-btn")
    .addEventListener("click", openCategoryManager);
  document.getElementById("close-category-manager-btn").addEventListener("click", () => {
    document.getElementById("world-book-category-manager-modal").classList.remove("visible");
    renderWorldBookScreen(); // 关闭后刷新主列表
  });
  document.getElementById("add-new-category-btn").addEventListener("click", addNewCategory);
  document.getElementById("existing-categories-list").addEventListener("click", (e) => {
    if (e.target.classList.contains("delete-group-btn")) {
      const categoryId = parseInt(e.target.dataset.id);
      deleteCategory(categoryId);
    }
  });
  // ▲▲▲ 新代码粘贴结束 ▲▲▲

  // ===================================================================
  // 5. 启动！

  showScreen("home-screen");
}

init();
