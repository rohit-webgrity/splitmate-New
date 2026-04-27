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
  getDoc,
  serverTimestamp,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const tripsPerPage = 20;
let lastVisibleDoc = null;

function getUser() {
  const user = localStorage.getItem("splitmate_user");
  return user ? JSON.parse(user) : null;
}

function openModal(title, bodyHTML, onConfirm) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="modal-close" id="closeModal">✕</button>
      </div>

      <div class="modal-body">
        ${bodyHTML}
      </div>

      <div class="modal-footer">
        <button class="modal-cancel" id="cancelModal">Cancel</button>
        <button class="modal-confirm" id="confirmModal">Continue</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  function close() {
    overlay.remove();
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  document.getElementById("closeModal").addEventListener("click", close);
  document.getElementById("cancelModal").addEventListener("click", close);

  document.getElementById("confirmModal").addEventListener("click", async () => {
    await onConfirm(close);
  });
}

function calculateBalances(expenses, members) {
  const totalsPaid = {};
  const totalsOwe = {};

  members.forEach((uid) => {
    totalsPaid[uid] = 0;
    totalsOwe[uid] = 0;
  });

  expenses.forEach((exp) => {
    totalsPaid[exp.paidBy] += exp.amount;

    const share = exp.amount / exp.splitBetween.length;

    exp.splitBetween.forEach((uid) => {
      totalsOwe[uid] += share;
    });
  });

  const balances = {};
  members.forEach((uid) => {
    balances[uid] = totalsPaid[uid] - totalsOwe[uid];
  });

  const creditors = [];
  const debtors = [];

  members.forEach((uid) => {
    if (balances[uid] > 0) creditors.push({ uid, amount: balances[uid] });
    if (balances[uid] < 0) debtors.push({ uid, amount: -balances[uid] });
  });

  const settlements = [];

  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const payAmount = Math.min(debtor.amount, creditor.amount);

    settlements.push({
      from: debtor.uid,
      to: creditor.uid,
      amount: payAmount
    });

    debtor.amount -= payAmount;
    creditor.amount -= payAmount;

    if (debtor.amount <= 0.01) i++;
    if (creditor.amount <= 0.01) j++;
  }

  return settlements;
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
      navigate(`trip-${docSnap.id}`);
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

function createTripModal() {
  openModal(
    "Create Trip",
    `
      <label>Trip Name</label>
      <input type="text" id="tripNameInput" placeholder="Goa Trip" />

      <label>Description</label>
      <textarea id="tripDescInput" placeholder="Trip description..."></textarea>
    `,
    async (close) => {
      const user = getUser();
      if (!user) return;

      const tripName = document.getElementById("tripNameInput").value.trim();
      const description = document.getElementById("tripDescInput").value.trim();

      if (!tripName) {
        alert("Trip name required.");
        return;
      }

      const tripCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      await addDoc(collection(db, "trips"), {
        tripName,
        description,
        organizerId: user.uid,
        tripCode,
        members: [user.uid],
        createdAt: serverTimestamp()
      });

      close();
      await fetchTrips(true);
    }
  );
}

function joinTripModal() {
  openModal(
    "Join Trip",
    `
      <label>Trip Code</label>
      <input type="text" id="tripCodeInput" placeholder="ABC123" />
    `,
    async (close) => {
      const user = getUser();
      if (!user) return;

      const tripCode = document.getElementById("tripCodeInput").value.trim().toUpperCase();

      if (!tripCode) {
        alert("Trip code required.");
        return;
      }

      const tripsRef = collection(db, "trips");

      const q = query(tripsRef, where("tripCode", "==", tripCode), limit(1));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        alert("Invalid trip code.");
        return;
      }

      const tripDoc = snapshot.docs[0];

      await updateDoc(doc(db, "trips", tripDoc.id), {
        members: arrayUnion(user.uid)
      });

      close();
      await fetchTrips(true);
    }
  );
}

async function fetchTripDetails(tripId) {
  const tripRef = doc(db, "trips", tripId);
  const tripSnap = await getDoc(tripRef);

  if (!tripSnap.exists()) return null;

  return { id: tripSnap.id, ...tripSnap.data() };
}

async function fetchTripExpenses(tripId) {
  const expensesRef = collection(db, "trips", tripId, "expenses");

  const q = query(expensesRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  const expenses = [];

  snapshot.forEach((docSnap) => {
    expenses.push({ id: docSnap.id, ...docSnap.data() });
  });

  return expenses;
}

function addExpenseModal(tripId) {
  openModal(
    "Add Expense",
    `
      <label>Expense Title</label>
      <input type="text" id="expenseTitleInput" placeholder="Dinner" />

      <label>Amount (₹)</label>
      <input type="number" id="expenseAmountInput" placeholder="1200" />
    `,
    async (close) => {
      const user = getUser();
      if (!user) return;

      const title = document.getElementById("expenseTitleInput").value.trim();
      const amount = parseFloat(document.getElementById("expenseAmountInput").value.trim());

      if (!title) {
        alert("Title required.");
        return;
      }

      if (isNaN(amount) || amount <= 0) {
        alert("Valid amount required.");
        return;
      }

      await addDoc(collection(db, "trips", tripId, "expenses"), {
        title,
        amount,
        paidBy: user.uid,
        splitBetween: [user.uid],
        createdAt: serverTimestamp()
      });

      close();
      await navigate(`trip-${tripId}`);
    }
  );
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
      document.getElementById("createTripBtn").addEventListener("click", createTripModal);
      document.getElementById("joinTripBtn").addEventListener("click", joinTripModal);
      await fetchTrips(true);
    }
  },

  settings: {
    title: "Settings",
    render: async () => {
      return `
        <div class="card">
          <h3>Settings</h3>
          <p>Profile and logout will be added later.</p>
        </div>
      `;
    }
  }
};

export async function navigate(route) {
  const pageTitle = document.getElementById("pageTitle");
  const pageContent = document.getElementById("pageContent");
  const backBtn = document.getElementById("backBtn");

  if (!route) route = "dashboard";

  if (route.startsWith("trip-")) {
    const tripId = route.replace("trip-", "");

    const trip = await fetchTripDetails(tripId);
    if (!trip) {
      pageTitle.innerText = "Trip Not Found";
      pageContent.innerHTML = `
        <div class="card">
          <h3>Trip not found</h3>
        </div>
      `;
      return;
    }

    const expenses = await fetchTripExpenses(tripId);
    const settlements = calculateBalances(expenses, trip.members);

    pageTitle.innerText = trip.tripName;

    backBtn.classList.remove("hidden");
    backBtn.onclick = () => navigate("dashboard");

    let expensesHtml = "";

    if (expenses.length === 0) {
      expensesHtml = `
        <div class="card">
          <h3>No expenses yet</h3>
          <p>Add your first expense.</p>
        </div>
      `;
    } else {
      expenses.forEach((exp) => {
        expensesHtml += `
          <div class="card">
            <h3>${exp.title}</h3>
            <p>Amount: ₹${exp.amount}</p>
          </div>
        `;
      });
    }

    let settlementHtml = "";

    if (settlements.length === 0) {
      settlementHtml = `
        <div class="card">
          <h3>No dues</h3>
          <p>Everyone is settled.</p>
        </div>
      `;
    } else {
      settlementHtml += `<div class="card"><h3>Who owes whom</h3>`;
      settlements.forEach((s) => {
        settlementHtml += `<p><strong>${s.from}</strong> pays <strong>${s.to}</strong> ₹${s.amount.toFixed(2)}</p>`;
      });
      settlementHtml += `</div>`;
    }

    pageContent.innerHTML = `
      <div class="card">
        <h3>Trip Members</h3>
        <p>Total Members: ${trip.members.length}</p>
        <p>Trip Code: <strong>${trip.tripCode}</strong></p>
        <button id="addExpenseBtn" class="primary-btn">Add Expense</button>
      </div>

      ${expensesHtml}

      ${settlementHtml}
    `;

    document.getElementById("addExpenseBtn").addEventListener("click", () => {
      addExpenseModal(tripId);
    });

    location.hash = route;
    return;
  }

  if (!routes[route]) route = "dashboard";

  pageTitle.innerText = routes[route].title;
  backBtn.classList.add("hidden");

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