import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBh163L6sInonJPzyJkTKFgcfCUdfixuVc",
  authDomain: "lawdelgado-f695b.firebaseapp.com",
  projectId: "lawdelgado-f695b",
  storageBucket: "lawdelgado-f695b.firebasestorage.app",
  messagingSenderId: "186700328046",
  appId: "1:186700328046:web:49f39451dd6d2231fc0a7f",
  measurementId: "G-B0343W9JMX",
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
