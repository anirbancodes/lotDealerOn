const firebaseConfig = {
  apiKey: "AIzaSyAVgBu0P69xgUHnZ2Cc4G5IX6gHtb4-MBE",
  authDomain: "qclottery.firebaseapp.com",
  projectId: "qclottery",
  storageBucket: "qclottery.appspot.com",
  messagingSenderId: "650163027647",
  appId: "1:650163027647:web:961de905315b549657500a",
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import {
  getDoc,
  doc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  runTransaction,
  increment,
  setDoc,
  writeBatch,
  getFirestore,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

async function add(user_email) {
  const amt = document.getElementById(`credChange-${user_email}`).value;
  if (confirm(`${user_email} : Add ${amt} ?`) == true) {
    alert("You pressed OK!");
  } else {
    alert("You canceled!");
  }
  await updateDoc(
    doc(db, "users", user_email),
    {
      credHist: arrayUnion({ time: date, trans: amt, how: "Dealer Added" }),
      credit: increment(amt),
      credits: arrayUnion({ time: date, trans: amt, how: "Dealer Added" }),
    },
    { merge: true }
  );
  //minus from dealer
}
