import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

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

async function tryRegister(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log(`SUCCESS: Created user ${email} with password: ${password}`);
    return true;
  } catch (error) {
    console.log(`CREATE FAILED for ${email}: ${error.code} - ${error.message}`);
    return false;
  }
}

async function tryLogin(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log(`SUCCESS: Logged in as ${email} with password: ${password}`);
    return true;
  } catch (error) {
    console.log(`LOGIN FAILED for ${email} with password "${password}": ${error.code}`);
    return false;
  }
}

async function main() {
  const emails = ['admin@ptb.com', 'account@ptb.com', 'sam.dev@ptb.com'];
  const commonPasswords = ['admin123', 'admin', 'password', 'password123', 'admin@123', 'ptbadmin', 'ptb123', 'ptb@123'];
  
  for (const email of emails) {
    for (const pw of commonPasswords) {
      const ok = await tryLogin(email, pw);
      if (ok) {
        console.log(`FOUND IT! Email: ${email}, Password: ${pw}`);
        process.exit(0);
      }
    }
  }

  console.log("Common passwords failed. Let's try registering admin@ptb.com...");
  await tryRegister('admin@ptb.com', 'admin123');
  await tryRegister('account@ptb.com', 'account123');
}

main();
