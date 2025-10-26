document.addEventListener("DOMContentLoaded", () => {
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
});
