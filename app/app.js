window.addEventListener("load", () => {
  setTimeout(() => {
    document.getElementById("splash").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");

    const route = location.hash.replace("#", "") || "dashboard";
    navigate(route);

    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        navigate(btn.dataset.route);
      });
    });

  }, 1200);
});