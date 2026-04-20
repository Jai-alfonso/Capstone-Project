import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyBh163L6sInonJPzyJkTKFgcfCUdfixuVc",
  authDomain: "lawdelgado-f695b.firebaseapp.com",
  projectId: "lawdelgado-f695b",
  storageBucket: "lawdelgado-f695b.firebasestorage.app",
  messagingSenderId: "186700328046",
  appId: "1:186700328046:web:49f39451dd6d2231fc0a7f",
  measurementId: "G-B0343W9JMX",
};

// --- Initialization Logic ---

let app;
try {
  // Check if a Firebase app has already been initialized to prevent 
  // "Firebase: App named '[DEFAULT]' already exists" error during builds/reloads.
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  console.log("[v0] Firebase app initialized/retrieved successfully");
} catch (error: any) {
  console.error("[v0] Firebase initialization error:", error.message);
}

// Initialize services with safe fallbacks
const authInstance = app ? getAuth(app) : null;
if (authInstance) console.log("[v0] Firebase auth service initialized");

const dbInstance = app ? getFirestore(app) : null;
if (dbInstance) console.log("[v0] Firebase firestore initialized");

const storageInstance = app ? getStorage(app) : null;
if (storageInstance) console.log("[v0] Firebase storage initialized");

const functionsInstance = app ? getFunctions(app) : null;
if (functionsInstance) console.log("[v0] Firebase functions initialized");

// --- Exports ---

export { authInstance as auth };
export { dbInstance as db };
export { storageInstance as storage };
export { functionsInstance as functions };
export { app as firebaseApp };

export default app;