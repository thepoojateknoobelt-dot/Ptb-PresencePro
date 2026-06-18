import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

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
  console.log("Sleeping for 15 seconds to clear any rate limits...");
  await new Promise(resolve => setTimeout(resolve, 15000));
  
  try {
    const email = 'sam.dev@ptb.com';
    const pw = 'ptbadmin';
    console.log(`Trying ${email} with pw ${pw}...`);
    const cred = await signInWithEmailAndPassword(auth, email, pw);
    console.log(`SUCCESS! logged in as ${email}`);
    const token = await cred.user.getIdToken();
    console.log("Token:", token);
    
    const empUrl = `https://presencepro-ptb-default-rtdb.firebaseio.com/Employees.json?auth=${token}`;
    const res = await fetch(empUrl);
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Data:", data);
  } catch (err) {
    console.log("Failed:", err.message);
  }
}

main();
