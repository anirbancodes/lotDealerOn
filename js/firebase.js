import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { fc } from "/js/c.js";
import {
  getDoc,
  doc,
  arrayUnion,
  runTransaction,
  increment,
  getFirestore,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

import { fetchDate } from "./time.js";
const app = initializeApp(fc);
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
      let agents = docSnap2.data().agents;
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
    let email = i.email;
    document.getElementById("agents").innerHTML +=
      `<div class="client">
    <div style="display: flex; justify-content: space-between">
      <p>` +
      i.name +
      `</p>
      <p style="display: none;" id="day-sale-` +
      email +
      `">Day Sale: -</p>
      <p class="hollow-btn-text" id="showBtn-` +
      email +
      `">Show Day Sale</p>
    </div>
    <p style="margin-top: -15px">` +
      email +
      `</p>
    <div style="display: flex; justify-content: space-around">
      <button class="btn-submit" id="add-` +
      email +
      `">+</button>
      <button class="btn-submit" id="subs-` +
      email +
      `">-</button>
      <button class="btn-submit" id="details-` +
      email +
      `">Details</button>
    </div>
    <input type="number" class="cred-amt"  placeholder="0" id="credAmt-` +
      email +
      `">
  </div>`;
    emails.push(email);
  });
  addDOMfunc(emails);
}

async function addDOMfunc(emails) {
  emails.forEach((u_email) => {
    let addBtn = document.getElementById(`add-${u_email}`);
    addBtn.addEventListener("click", async (e) => {
      const dealerEmail = auth.currentUser.email;
      let amount = Number(document.getElementById(`credAmt-${u_email}`).value);
      if (amount < 1) {
        alert("Enter min. 1 credit");
        return;
      }
      await addCred(dealerEmail, u_email, amount);
    });

    let subsBtn = document.getElementById(`subs-${u_email}`);
    subsBtn.addEventListener("click", async (e) => {
      const dealerEmail = auth.currentUser.email;
      let amount = Number(document.getElementById(`credAmt-${u_email}`).value);
      if (amount < 1) {
        alert("Enter min. 1 credit");
        return;
      }
      await subsCred(dealerEmail, u_email, amount);
    });

    let detailsBtn = document.getElementById(`details-${u_email}`);
    detailsBtn.addEventListener("click", async (e) => {
      window.location = `./agent-details/index.html?a=${u_email}`;
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
    document.getElementById(`day-sale-${mail}`).innerText = "₹0";
    return;
  }
  let totSale = 0;
  let keys = Object.keys(daySale.data());
  keys.forEach((dtime) => {
    totSale += daySale[dtime];
  });
  document.getElementById(`showBtn-${mail}`).style.display = "none";
  document.getElementById(`day-sale-${mail}`).style.display = "";
  document.getElementById(`day-sale-${mail}`).innerText = "Today: ₹" + totSale;
}

async function addCred(dealerEmail, u_email, amount) {
  try {
    let { date, time } = await fetchDate();
    await runTransaction(db, async (transaction) => {
      const balance = (
        await transaction.get(doc(db, "dealers", dealerEmail))
      ).data().credit;
      if (balance < amount) {
        alert("Not enough balance. Add credits");
        return;
      } else {
        const creditsDateDoc = await transaction.get(
          doc(db, "dealers", dealerEmail, "credits", date)
        );

        const agentCreditDate = await transaction.get(
          doc(db, "agents", u_email, "credits", date)
        );

        if (!creditsDateDoc.exists()) {
          transaction.set(doc(db, "dealers", dealerEmail, "credits", date), {});
        }
        if (!agentCreditDate.exists()) {
          transaction.set(doc(db, "agents", u_email, "credits", date), {});
        }
        transaction.update(doc(db, "dealers", dealerEmail), {
          credit: increment(-1 * amount),
        });

        transaction.update(doc(db, "agents", u_email), {
          credit: increment(amount),
        });
        transaction.update(doc(db, "agents", u_email, "offline", "lotto"), {
          credit: increment(amount),
        });
        transaction.update(doc(db, "agents", u_email, "credits", date), {
          lotto: arrayUnion({
            time: time,
            dg: "d",
            amt: amount,
          }),
        });
        transaction.update(doc(db, "dealers", dealerEmail, "credits", date), {
          agents: arrayUnion({
            time: time,
            amt: amount,
            email: u_email,
          }),
        });
      }
    });
    console.log("Transaction successfully committed!");
    document.getElementById(`credAmt-${u_email}`).value = 0;
    let newCredit = (await getDoc(doc(db, "dealers", dealerEmail))).data()
      .credit;
    document.getElementById("user-credit").textContent = newCredit;
  } catch (e) {
    alert("Error, failed.");
  }
}

async function subsCred(dealerEmail, u_email, amount) {
  try {
    let { date, time } = await fetchDate();

    await runTransaction(db, async (transaction) => {
      const agentBalance = (
        await transaction.get(doc(db, "agents", u_email))
      ).data().credit;
      if (agentBalance < amount) {
        alert("Not enough balance in agent");
        return;
      } else {
        const creditsDateDoc = await transaction.get(
          doc(db, "dealers", dealerEmail, "credits", date)
        );
        const agentCreditDate = await transaction.get(
          doc(db, "agents", u_email, "credits", date)
        );

        if (!creditsDateDoc.exists()) {
          transaction.set(doc(db, "dealers", dealerEmail, "credits", date), {});
        }
        if (!agentCreditDate.exists()) {
          transaction.set(doc(db, "agents", u_email, "credits", date), {});
        }

        transaction.update(doc(db, "dealers", dealerEmail), {
          credit: increment(amount),
        });

        transaction.update(doc(db, "agents", u_email), {
          credit: increment(-1 * amount),
        });
        transaction.update(doc(db, "agents", u_email, "offline", "lotto"), {
          credit: increment(-1 * amount),
        });
        transaction.update(doc(db, "agents", u_email, "credits", date), {
          lotto: arrayUnion({
            time: time,
            dg: "d",
            amt: -1 * amount,
          }),
        });
        transaction.update(doc(db, "dealers", dealerEmail, "credits", date), {
          agents: arrayUnion({
            time: time,
            amt: -1 * amount,
            email: u_email,
          }),
        });
      }
    });
    console.log("Transaction successfully committed!");
    document.getElementById(`credAmt-${u_email}`).value = 0;
    let newCredit = (await getDoc(doc(db, "dealers", dealerEmail))).data()
      .credit;
    document.getElementById("user-credit").textContent = newCredit;
  } catch (e) {
    alert("Error, failed");
  }
}
