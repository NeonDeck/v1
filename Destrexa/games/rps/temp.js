import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getDatabase,
  ref,
  child,
  get,
  set,
  update,
  push,
  remove,
  onValue,
  onDisconnect,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyC-KsTzmlZILj1OLJWRSl1vOtD3MIK6_Po",
  authDomain: "rpsgame-4944a.firebaseapp.com",
  databaseURL: "https://rpsgame-4944a-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "rpsgame-4944a",
  storageBucket: "rpsgame-4944a.firebasestorage.app",
  messagingSenderId: "729078057844",
  appId: "1:729078057844:web:df57ddeda67ca33963fa21",
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export {
  app,
  database,
  ref,
  child,
  get,
  set,
  update,
  push,
  remove,
  onValue,
  onDisconnect,
  serverTimestamp,
};
