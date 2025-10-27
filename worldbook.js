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
