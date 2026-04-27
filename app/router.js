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

async function fetchTripDetails(tripId) {
  const tripRef = doc(db, "trips", tripId);
  const tripSnap = await getDoc(tripRef);

  if (!tripSnap.exists()) {
    return null;
  }

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

async function addExpense(tripId) {
  const user = getUser();
  if (!user) return;

  const title = prompt("Expense Title (Example: Dinner)");
  if (!title) return;

  const amountStr = prompt("Amount (Example: 1200)");
  if (!amountStr) return;

  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) {
    alert("Invalid amount.");
    return;
  }

  const expenseData = {
    title: title.trim(),
    amount,
    paidBy: user.uid,
    splitBetween: [user.uid],
    createdAt: serverTimestamp()
  };

  await addDoc(collection(db, "trips", tripId, "expenses"), expenseData);

  alert("Expense added!");
  await navigate(`trip-${tripId}`);
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
      addExpense(tripId);
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