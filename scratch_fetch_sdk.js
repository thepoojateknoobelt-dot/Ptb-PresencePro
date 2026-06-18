import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getDatabase, ref, get, child } from 'firebase/database';

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
const db = getDatabase(app);

const passwords = [
  'admin',
  'admin123',
  'admin1234',
  'admin@123',
  'admin@1234',
  'ptbadmin',
  'ptbadmin123',
  'ptb@123',
  'password',
  'password123',
  '123456',
  '12345678'
];

async function main() {
  const email = 'admin@ptb.com';
  for (const pw of passwords) {
    try {
      console.log(`Trying ${email} with password "${pw}"...`);
      const cred = await signInWithEmailAndPassword(auth, email, pw);
      console.log(`\nSUCCESS! Logged in as ${email} with password "${pw}"`);
      
      console.log("Reading /Employees from RTDB...");
      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, 'Employees'));
      if (snapshot.exists()) {
        console.log("Success! Data keys:", Object.keys(snapshot.val()));
        console.log("Sample employee:", Object.values(snapshot.val())[0]);
      } else {
        console.log("No data available at /Employees");
      }
      process.exit(0);
    } catch (err) {
      console.log(`Failed for "${pw}":`, err.code || err.message);
      if (err.code === 'auth/too-many-requests') {
        console.log("Hit rate limit. Sleeping for 15 seconds...");
        await new Promise(resolve => setTimeout(resolve, 15000));
      } else {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
  }
  process.exit(0);
}

main();
