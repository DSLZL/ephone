document.addEventListener("DOMContentLoaded", () => {
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
});
