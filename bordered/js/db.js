// database schema definition for Dexie (safely callable before app.main.js)
window.EP = window.EP || {};
window.EP.defineStores = function(db) {
  db.version(23).stores({ 
    chats: '&id, isGroup, groupId', 
    apiConfig: '&id', 
    globalSettings: '&id', 
    userStickers: '&id, url, name',
    worldBooks: '&id, name, categoryId', // <-- 保持原注释
    worldBookCategories: '++id, name',    // <-- 保持原注释
    musicLibrary: '&id', 
    personaPresets: '&id',
    qzoneSettings: '&id',
    qzonePosts: '++id, timestamp', 
    qzoneAlbums: '++id, name, createdAt',
    qzonePhotos: '++id, albumId',
    favorites: '++id, type, timestamp, originalTimestamp',
    qzoneGroups: '++id, name',
    memories: '++id, chatId, timestamp, type, targetDate' ,
    callRecords: '++id, chatId, timestamp, customName' // <-- 保持原注释
  });
  window.EP.db = db;
  return db;
};

