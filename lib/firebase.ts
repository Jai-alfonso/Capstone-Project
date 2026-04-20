import { initializeApp } from "firebase/app";
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

let app: any = null;
let authInstance: any = null;
let dbInstance: any = null;
let storageInstance: any = null;
let functionsInstance: any = null;

try {
  app = initializeApp(firebaseConfig);
  console.log("[v0] Firebase app initialized");

  try {
    authInstance = getAuth(app);
    console.log("[v0] Firebase auth service initialized");
  } catch (authError: any) {
    console.warn(
      "[v0] Firebase auth initialization failed (using localStorage fallback):",
      authError.message
    );
    authInstance = null;
  }

  try {
    dbInstance = getFirestore(app);
    console.log("[v0] Firebase firestore initialized");
  } catch (dbError: any) {
    console.warn(
      "[v0] Firebase firestore initialization failed:",
      dbError.message
    );
    dbInstance = null;
  }

  try {
    storageInstance = getStorage(app);
    console.log("[v0] Firebase storage initialized");
  } catch (storageError: any) {
    console.warn(
      "[v0] Firebase storage initialization failed:",
      storageError.message
    );
    storageInstance = null;
  }

  try {
    functionsInstance = getFunctions(app);
    console.log("[v0] Firebase functions initialized");

    if (
      process.env.NODE_ENV === "development" &&
      typeof window !== "undefined"
    ) {
    }
  } catch (functionsError: any) {
    console.warn(
      "[v0] Firebase functions initialization failed:",
      functionsError.message
    );
    functionsInstance = null;
  }
} catch (error: any) {
  console.warn("[v0] Firebase initialization error:", error.message);
  app = null;
}

export const auth = authInstance;
export const db = dbInstance;
export const storage = storageInstance;
export const functions = functionsInstance;
export const firebaseApp = app;

export default app;
