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

import { fetchDate } from "./time.js";
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();

const logoutBtn = document.getElementById("logoutBtn");
logoutBtn.addEventListener("click", (e) => {
  signOut(auth)
    .then(() => {
      //logout
    })
    .catch((error) => {
      alert(error);
    });
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    const uid = user.uid;
    loadUserData(user.email);
  } else {
    window.location = "/pages/login.html";
  }
});

async function loadUserData(email) {
  const ref = doc(db, "dealers", email);
  const docSnap = await getDoc(ref);
  if (docSnap.exists()) {
    let data = docSnap.data();
    showUserCredits(data.name, data.credit);
    const ref2 = doc(db, "dealers", email, "online", "lotto");
    const docSnap2 = await getDoc(ref2);
    if (docSnap2.exists()) {
      let agents = docSnap2.data().clients;
      drawClientList(agents);
    }
  }
}

function showUserCredits(name, credit) {
  document.getElementById("profile-name").textContent = name;
  document.getElementById("user-credit").textContent = credit;
}

async function drawClientList(data) {
  document.getElementById("agents").innerHTML = "";

  let emails = [];
  data.forEach(async (i) => {
    document.getElementById("agents").innerHTML +=
      `<div class="client">
    <div style="display: flex; justify-content: space-between">
      <p>` +
      i.name +
      `</p>
      <p style="display: none;" id="day-sale-` +
      i.email +
      `">Day Sale: 5000</p>
      <p class="hollow-btn-text" id="showBtn-` +
      i.email +
      `">Show Day Sale</p>
    </div>
    <p style="margin-top: -15px">` +
      i.email +
      `</p>
    <div style="display: flex; justify-content: space-around">
      <button class="btn-submit" id="add-` +
      i.email +
      `">+</button>
      <button class="btn-submit" id="subs-` +
      i.email +
      `">-</button>
      <button class="btn-submit" id="details-` +
      i.email +
      `">Details</button>
    </div>
    <input type="number" class="cred-amt"  placeholder="0" id="credAmt-` +
      i.email +
      `"
  </div>`;
    emails.push(i.email);
  });
  addDOMfunc(emails);
}

async function addDOMfunc(emails) {
  emails.forEach((u_email) => {
    let addBtn = document.getElementById(`add-${u_email}`);
    addBtn.addEventListener("click", async (e) => {
      const dealerEmail = auth.currentUser.email;
      let amount = Number(document.getElementById(`credAmt-${u_email}`).value);
      await addCred(dealerEmail, u_email, amount);
    });

    let subsBtn = document.getElementById(`subs-${u_email}`);
    subsBtn.addEventListener("click", async (e) => {
      const dealerEmail = auth.currentUser.email;
      let amount = Number(document.getElementById(`credAmt-${u_email}`).value);
      await subsCred(dealerEmail, u_email, amount);
    });

    let detailsBtn = document.getElementById(`details-${u_email}`);
    detailsBtn.addEventListener("click", async (e) => {
      details(dealerEmail, u_email);
    });

    let showBtn = document.getElementById(`showBtn-${u_email}`);
    showBtn.addEventListener("click", async (e) => {
      daySale(u_email);
    });
  });
}

async function daySale(mail) {
  let { date } = await fetchDate();
  const daySale = await getDoc(
    doc(db, "agents", mail, "offline", "lotto", "sale", date)
  );
  if (!daySale.exists()) {
    document.getElementById(`showBtn-${mail}`).style.display = "none";
    document.getElementById(`day-sale-${mail}`).style.display = "";
    document.getElementById(`day-sale-${mail}`).innerText = "No sale today";
    return;
  }
  let totSale = 0;
  let keys = Object.keys(daySale.data());
  keys.forEach((dtime) => {
    totSale += daySale[dtime];
  });
  document.getElementById(`showBtn-${mail}`).style.display = "none";
  document.getElementById(`day-sale-${mail}`).style.display = "";
  document.getElementById(`day-sale-${mail}`).innerText = "Today: " + totSale;
}

async function addCred(dealerEmail, u_email, amount) {
  try {
    let { date, time } = await fetchDate();
    await runTransaction(db, async (transaction) => {
      const creditsDateDoc = await transaction.get(
        doc(db, "dealers", dealerEmail, "credits", date)
      );

      if (!creditsDateDoc.exists()) {
        transaction.set(doc(db, "dealers", dealerEmail, "credits", date), {});
      }
      transaction.update(doc(db, "dealers", dealerEmail), {
        credit: increment(-1 * amount),
      });

      transaction.update(doc(db, "agents", u_email), {
        credit: increment(amount),
      });
      transaction.set(doc(db, "dealers", dealerEmail, "credits", date), {
        agents: arrayUnion({
          time: time,
          amt: amount,
          email: u_email,
        }),
      });
    });
    console.log("Transaction successfully committed!");
    document.getElementById(`credAmt-${u_email}`).value = 0;
    let newCredit = (await getDoc(doc(db, "dealers", dealerEmail))).data()
      .credit;
    document.getElementById("user-credit").textContent = newCredit;
  } catch (e) {
    alert("Transaction failed: " + e);
  }
}

async function subsCred(dealerEmail, u_email, amount) {
  try {
    let { date, time } = await fetchDate();
    console.log(time, date);
    await runTransaction(db, async (transaction) => {
      const creditsDateDoc = await transaction.get(
        doc(db, "dealers", dealerEmail, "credits", date)
      );

      if (!creditsDateDoc.exists()) {
        transaction.set(doc(db, "dealers", dealerEmail, "credits", date), {});
      }
      transaction.update(doc(db, "dealers", dealerEmail), {
        credit: increment(amount),
      });

      transaction.update(doc(db, "agents", u_email), {
        credit: increment(-1 * amount),
      });
      transaction.update(doc(db, "dealers", dealerEmail, "credits", date), {
        agents: arrayUnion({
          time: time,
          amt: -1 * amount,
          email: u_email,
        }),
      });
    });
    console.log("Transaction successfully committed!");
    document.getElementById(`credAmt-${u_email}`).value = 0;
    let newCredit = (await getDoc(doc(db, "dealers", dealerEmail))).data()
      .credit;
    document.getElementById("user-credit").textContent = newCredit;
  } catch (e) {
    alert("Transaction failed: " + e);
  }
}
