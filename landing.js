let deferredPrompt;

const installBtn = document.getElementById("installBtn");
const installBtn2 = document.getElementById("installBtn2");

function showInstallButtons() {
  installBtn.classList.remove("hidden");
  installBtn2.classList.remove("hidden");
}

function hideInstallButtons() {
  installBtn.classList.add("hidden");
  installBtn2.classList.add("hidden");
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallButtons();
});

function installApp() {
  if (!deferredPrompt) {
    alert("Install option is not available right now. Please open in Chrome and use Add to Home Screen.");
    return;
  }

  deferredPrompt.prompt();

  deferredPrompt.userChoice.then(() => {
    deferredPrompt = null;
    hideInstallButtons();
  });
}

installBtn.addEventListener("click", installApp);
installBtn2.addEventListener("click", installApp);

document.getElementById("year").innerText = new Date().getFullYear();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}