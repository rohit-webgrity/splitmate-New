import { auth } from "../firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  confirmPasswordReset
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

const popup = document.getElementById("popup");

function showPopup(message) {
  popup.innerText = message;
  popup.classList.add("show");

  setTimeout(() => {
    popup.classList.remove("show");
  }, 3000);
}

function saveSession(user) {
  localStorage.setItem("splitmate_user", JSON.stringify({
    uid: user.uid,
    email: user.email
  }));
}

const provider = new GoogleAuthProvider();

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      saveSession(res.user);
      location.href = "../app.html";
    } catch (err) {
      showPopup(err.code + " - " + err.message);
    }
  });

  document.getElementById("googleLogin").addEventListener("click", async () => {
    try {
      const res = await signInWithPopup(auth, provider);
      saveSession(res.user);
      location.href = "../app.html";
    } catch (err) {
      showPopup(err.code + " - " + err.message);
    }
  });

  document.getElementById("forgotBtn").addEventListener("click", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();

    if (!email) {
      showPopup("Please enter your email first.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      showPopup("A password resetting mail has been sent to your registered mail address.");
    } catch (err) {
      showPopup(err.code + " - " + err.message);
    }
  });
}

const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(res.user);

      showPopup("An authentication mail has been sent to your provided email address. Please visit to confirm.");

      saveSession(res.user);

      setTimeout(() => {
        location.href = "../app.html";
      }, 2000);

    } catch (err) {
      showPopup(err.code + " - " + err.message);
    }
  });

  document.getElementById("googleSignup").addEventListener("click", async () => {
    try {
      const res = await signInWithPopup(auth, provider);
      saveSession(res.user);
      location.href = "../app.html";
    } catch (err) {
      showPopup(err.code + " - " + err.message);
    }
  });
}

const resetForm = document.getElementById("resetForm");
if (resetForm) {
  resetForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const newPassword = document.getElementById("newPassword").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();

    if (newPassword !== confirmPassword) {
      showPopup("Passwords do not match.");
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const oobCode = urlParams.get("oobCode");

    if (!oobCode) {
      showPopup("Invalid password reset link.");
      return;
    }

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      showPopup("Password updated successfully.");

      setTimeout(() => {
        location.href = "login.html";
      }, 2000);

    } catch (err) {
      showPopup(err.code + " - " + err.message);
    }
  });
}