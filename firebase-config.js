import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBXtEGP27s1QZpIME_MhNGUripHapBeHUA",
  authDomain: "envolve-fit-f584e.firebaseapp.com",
  projectId: "envolve-fit-f584e",
  storageBucket: "envolve-fit-f584e.firebasestorage.app",
  messagingSenderId: "964049525357",
  appId: "1:964049525357:web:febd36d1c582d962b1fd64"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
