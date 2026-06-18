import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDTUan3f_kGG43rU6nBk6tBNyGV7lDBUUM",
  authDomain: "presencepro-ptb.firebaseapp.com",
  projectId: "presencepro-ptb",
  storageBucket: "presencepro-ptb.firebasestorage.app",
  messagingSenderId: "899670758678",
  appId: "1:899670758678:web:fc8c485a6702a1648fac37",
  measurementId: "G-SV1SSCGC42",
  databaseURL: "https://presencepro-ptb-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function main() {
  const email = 'new_user@ptb.com';
  const password = 'password123';
  let user;
  try {
    console.log(`Registering ${email}...`);
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    user = cred.user;
    console.log("Registered!");
  } catch (err) {
    console.log("Registration failed, trying login...", err.message);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      user = cred.user;
      console.log("Logged in!");
    } catch (loginErr) {
      console.error("Login failed too:", loginErr.message);
    }
  }

  if (user) {
    const token = await user.getIdToken();
    const empUrl = `https://presencepro-ptb-default-rtdb.firebaseio.com/Employees.json?auth=${token}`;
    const res = await fetch(empUrl);
    console.log("Fetch status:", res.status);
    const data = await res.json();
    console.log("Response:", data);
  }
}

main();
