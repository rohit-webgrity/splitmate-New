let deferredPrompt;

const installBtn = document.getElementById("installBtn");
const installBtn2 = document.getElementById("installBtn2");

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  installBtn.classList.remove("hidden");
  installBtn2.classList.remove("hidden");
});

function installApp() {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();

  deferredPrompt.userChoice.then(() => {
    deferredPrompt = null;
    installBtn.classList.add("hidden");
    installBtn2.classList.add("hidden");
  });
}

installBtn.addEventListener("click", installApp);
installBtn2.addEventListener("click", installApp);

document.getElementById("year").innerText = new Date().getFullYear();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}