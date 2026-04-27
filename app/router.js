const routes = {
  dashboard: {
    title: "Dashboard",
    render: () => `
      <div class="card">
        <h3>Welcome to SplitMate</h3>
        <p>Your trips and expenses will appear here after login.</p>
      </div>

      <div class="card">
        <h3>Quick Actions</h3>
        <button class="primary-btn">Create New Trip</button>
      </div>
    `
  },

  trips: {
    title: "Trips",
    render: () => `
      <div class="card">
        <h3>Your Trips</h3>
        <p>No trips yet. Login in Phase 3 will enable trip loading.</p>
      </div>
    `
  },

  settings: {
    title: "Settings",
    render: () => `
      <div class="card">
        <h3>App Settings</h3>
        <p>Profile and logout options will come in later phases.</p>
      </div>
    `
  }
};

function navigate(route) {
  const pageTitle = document.getElementById("pageTitle");
  const pageContent = document.getElementById("pageContent");

  if (!routes[route]) route = "dashboard";

  pageTitle.innerText = routes[route].title;
  pageContent.innerHTML = routes[route].render();

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.dataset.route === route) btn.classList.add("active");
  });

  history.pushState({ route }, "", `#${route}`);
}

window.addEventListener("popstate", (e) => {
  if (e.state && e.state.route) {
    navigate(e.state.route);
  }
});