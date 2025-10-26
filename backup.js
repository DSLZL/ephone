// ▼▼▼ 用这个【已包含 memories】的版本，完整替换旧的 exportBackup 函数 ▼▼▼
document.addEventListener("DOMContentLoaded", () => {
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
        apiConfig,
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
        db.apiConfig.get("main"),
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
        apiConfig,
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

        if (data.apiConfig) await db.apiConfig.put(data.apiConfig);
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
});
