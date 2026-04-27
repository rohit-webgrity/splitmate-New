import { db } from "../firebase.js";

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const tripsPerPage = 20;
let lastVisibleDoc = null;

function getUser() {
  const user = localStorage.getItem("splitmate_user");
  return user ? JSON.parse(user) : null;
}

async function fetchTrips(reset = false) {
  const user = getUser();
  if (!user) return;

  if (reset) {
    lastVisibleDoc = null;
    document.getElementById("tripList").innerHTML = "";
  }

  const tripsRef = collection(db, "trips");

  let q;

  if (lastVisibleDoc) {
    q = query(
      tripsRef,
      where("members", "array-contains", user.uid),
      orderBy("createdAt", "desc"),
      startAfter(lastVisibleDoc),
      limit(tripsPerPage)
    );
  } else {
    q = query(
      tripsRef,
      where("members", "array-contains", user.uid),
      orderBy("createdAt", "desc"),
      limit(tripsPerPage)
    );
  }

  const snapshot = await getDocs(q);

  if (snapshot.empty && reset) {
    document.getElementById("tripList").innerHTML = `
      <div class="card">
        <h3>No trips found</h3>
        <p>Create a new trip or join using a trip code.</p>
      </div>
    `;
    return;
  }

  snapshot.forEach((docSnap) => {
    const trip = docSnap.data();

    const card = document.createElement("div");
    card.className = "card trip-card";

    card.innerHTML = `
      <h3>${trip.tripName}</h3>
      <p>${trip.description || ""}</p>
      <div class="trip-meta">
        <span>Code: <strong>${trip.tripCode}</strong></span>
      </div>
    `;

    card.addEventListener("click", () => {
      alert("Trip page will open in Phase 5.");
    });

    document.getElementById("tripList").appendChild(card);
  });

  lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];

  if (snapshot.docs.length === tripsPerPage) {
    const loadMoreBtn = document.createElement("button");
    loadMoreBtn.className = "primary-btn";
    loadMoreBtn.innerText = "Load More Trips";

    loadMoreBtn.addEventListener("click", async () => {
      loadMoreBtn.remove();
      await fetchTrips(false);
    });

    document.getElementById("tripList").appendChild(loadMoreBtn);
  }
}

async function createTrip() {
  const user = getUser();
  if (!user) return;

  const tripName = prompt("Enter Trip Name");
  if (!tripName) return;

  const description = prompt("Enter Trip Description (optional)") || "";

  const tripCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  const tripData = {
    tripName: tripName.trim(),
    description: description.trim(),
    organizerId: user.uid,
    tripCode,
    members: [user.uid],
    createdAt: serverTimestamp()
  };

  await addDoc(collection(db, "trips"), tripData);

  alert("Trip created successfully!");
  await fetchTrips(true);
}

async function joinTrip() {
  const user = getUser();
  if (!user) return;

  const tripCode = prompt("Enter Trip Code");
  if (!tripCode) return;

  const tripsRef = collection(db, "trips");

  const q = query(
    tripsRef,
    where("tripCode", "==", tripCode.trim().toUpperCase()),
    limit(1)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    alert("Invalid trip code.");
    return;
  }

  const tripDoc = snapshot.docs[0];
  const tripId = tripDoc.id;

  await updateDoc(doc(db, "trips", tripId), {
    members: arrayUnion(user.uid)
  });

  alert("Joined trip successfully!");
  await fetchTrips(true);
}

export const routes = {
  dashboard: {
    title: "Dashboard",
    render: async () => {
      return `
        <div class="card">
          <h3>Your Trips</h3>
          <p>Create a trip or join one using trip code.</p>

          <button id="createTripBtn" class="primary-btn">Create Trip</button>
          <button id="joinTripBtn" class="google-btn">Join Trip</button>
        </div>

        <div id="tripList"></div>
      `;
    },
    afterRender: async () => {
      document.getElementById("createTripBtn").addEventListener("click", createTrip);
      document.getElementById("joinTripBtn").addEventListener("click", joinTrip);

      await fetchTrips(true);
    }
  },

  trips: {
    title: "Trips",
    render: async () => {
      return `
        <div class="card">
          <h3>Trips</h3>
          <p>Detailed trip list view will come in Phase 5.</p>
        </div>
      `;
    }
  },

  settings: {
    title: "Settings",
    render: async () => {
      return `
        <div class="card">
          <h3>Settings</h3>
          <p>Profile settings will be added later.</p>
        </div>
      `;
    }
  }
};

export async function navigate(route) {
  const pageTitle = document.getElementById("pageTitle");
  const pageContent = document.getElementById("pageContent");

  if (!routes[route]) route = "dashboard";

  pageTitle.innerText = routes[route].title;

  const html = await routes[route].render();
  pageContent.innerHTML = html;

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.dataset.route === route) btn.classList.add("active");
  });

  location.hash = route;

  if (routes[route].afterRender) {
    await routes[route].afterRender();
  }
}

window.addEventListener("hashchange", async () => {
  const route = location.hash.replace("#", "") || "dashboard";
  await navigate(route);
});