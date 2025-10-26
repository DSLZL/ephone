// ===================================================================
// 2. 数据库结构定义
// ===================================================================
document.addEventListener("DOMContentLoaded", () => {
  db.version(23).stores({
    chats: "&id, isGroup, groupId",
    apiConfig: "&id",
    globalSettings: "&id",
    userStickers: "&id, url, name",
    worldBooks: "&id, name, categoryId", // <-- 【核心修改1】在这里添加 categoryId
    worldBookCategories: "++id, name", // <-- 【核心修改2】新增这个表
    musicLibrary: "&id",
    personaPresets: "&id",
    qzoneSettings: "&id",
    qzonePosts: "++id, timestamp",
    qzoneAlbums: "++id, name, createdAt",
    qzonePhotos: "++id, albumId",
    favorites: "++id, type, timestamp, originalTimestamp",
    qzoneGroups: "++id, name",
    memories: "++id, chatId, timestamp, type, targetDate",
    callRecords: "++id, chatId, timestamp, customName", // <--【核心修改】在这里加上 customName
  });
});
