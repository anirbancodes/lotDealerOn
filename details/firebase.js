import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import {
  getDoc,
  doc,
  getFirestore,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { fc } from "/js/c.js";
const app = initializeApp(fc);
const db = getFirestore(app);
const auth = getAuth();
//import { fetchTime } from "./index.js";
onAuthStateChanged(auth, (user) => {
  if (user) {
    const uid = user.uid;
    //showUserEmail(user.email);
    const params = new URL(document.location).searchParams;
    const agent_email = params.get("a");
    loadAgentData(agent_email);
  } else {
    window.location = "/pages/login.html";
  }
});
async function loadAgentData(email) {
  const ref = doc(db, "agents", email);
  const docSnap = await getDoc(ref);
  if (docSnap.exists()) {
    let data = docSnap.data();
    showUserCredits(data.name, data.credit);
    saleTbody(email);
  }
}

function showUserCredits(name, credit) {
  document.getElementById("profile-name").textContent += name;
  document.getElementById("user-credit").textContent = credit;
}
async function saleTbody(email, date) {
  if (!date) {
    let now = new Date();
    let date1 =
      now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate();
    date = date1;
  }
  const ref = doc(db, "agents", email, "offline", "lotto", "sale", date);
  const docSnap = await getDoc(ref);
  document.getElementById("sale-tbody").innerHTML = "";
  document.getElementById("dayTotSale").innerHTML = 0;
  if (docSnap.exists()) {
    const sale = docSnap.data();
    if (!sale) {
      document.getElementById("sale-tbody").innerHTML = "";
      document.getElementById("dayTotSale").innerHTML = "No sale on " + date;
    } else {
      document.getElementById(
        "sale-tbody"
      ).innerHTML = `<li class="table-header">
            <div class="col">Match</div>
            <div class="col">Sale</div>
          </li>`;
      let totsale = 0;
      let keys = Object.keys(sale);
      keys.forEach((dtime) => {
        totsale += sale[dtime];
        document.getElementById("sale-tbody").innerHTML +=
          `<li class="table-row">
      <div class="col" data-label="Job Id">` +
          dtime +
          `</div>
      <div class="col" data-label="Customer Name" >` +
          sale[dtime] +
          `</div>
    </li>`;
      });
      document.getElementById("dayTotSale").innerHTML = totsale;
    }
  }
}
const showBtn = document.getElementById("showBtn");
showBtn.addEventListener("click", () => {
  let date = document.getElementById("date").value;
  let i1 = date.indexOf("-"),
    i2 = date.lastIndexOf("-");
  date =
    date.substring(0, i1 + 1) +
    (Number(date.substring(i1 + 1, i2)) / 10) * 10 +
    "-" +
    (Number(date.substring(i2 + 1, i2 + 3)) / 10) * 10;
  const params = new URL(document.location).searchParams;
  const ae = params.get("a");
  saleTbody(ae, date);
});
