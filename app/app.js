import { navigate } from "./router.js";

const user = localStorage.getItem("splitmate_user");

if (!user) {
  location.href = "./pages/login.html";
}

window.addEventListener("load", async () => {
  setTimeout(async () => {
    const splash = document.getElementById("splash");
    const app = document.getElementById("app");

    splash.classList.add("hide");

    setTimeout(async () => {
      splash.style.display = "none";
      app.classList.remove("hidden");

      const route = location.hash.replace("#", "") || "dashboard";
      await navigate(route);

      document.querySelectorAll(".nav-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          await navigate(btn.dataset.route);
        });
      });

    }, 400);

  }, 900);
});