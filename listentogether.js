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
    const wantLrc = await showCustomConfirm("导入歌词", `要为《${name}》导入歌词文件 (.lrc) 吗？`);
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
