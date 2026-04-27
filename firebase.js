import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyADwKJg2OaZ6u9KS0IZnBNuh7b6WQzUi9s",
  authDomain: "splitmate-377d3.firebaseapp.com",
  projectId: "splitmate-377d3",
  storageBucket: "splitmate-377d3.appspot.com",
  messagingSenderId: "687180461001",
  appId: "1:687180461001:web:9bdf3e99660dd799216e18",
  measurementId: "G-62DKK0X4D7"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);