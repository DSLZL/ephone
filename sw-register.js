// sw-register.js

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        console.log("ServiceWorker registration successful with scope: ", registration.scope);

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          newWorker.addEventListener("statechange", () => {
            // 当新的 Service Worker 安装完成并且当前页面已被 Service Worker 控制时
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // 一个新的 Service Worker 已安装，但正在等待激活 (waiting)
              // 此时是提示用户更新的最佳时机
              const notification = document.getElementById("update-notification");
              if (notification) notification.style.display = "block";
            }
          });
        });
      })
      .catch((err) => {
        console.log("ServiceWorker registration failed: ", err);
      });
  });

  const reloadButton = document.getElementById("reload-page");
  if (reloadButton) {
    reloadButton.addEventListener("click", () => {
      // 向正在等待的 Service Worker 发送消息，让它调用 skipWaiting() 来激活自己
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg && reg.waiting) {
          reg.waiting.postMessage({ action: "skipWaiting" });
        }
      });
      // 移除不可靠的延时刷新，依赖 'controllerchange' 事件来处理刷新
    });
  }

  // 监听 controllerchange 事件。这个事件在新 Service Worker 接管页面控制权时触发
  // 这是执行页面刷新的最可靠时机
  let refreshing;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    // 只有在新的 Service Worker 接管后才刷新页面
    window.location.reload();
    refreshing = true;
  });
}
