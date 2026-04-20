// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getAuth } from "firebase/auth"

const firebaseConfig = {
  apiKey: "AIzaSyBh163L6sInonJPzyJkTKFgcfCUdfixuVc",
  authDomain: "lawdelgado-f695b.firebaseapp.com",
  projectId: "lawdelgado-f695b",
  storageBucket: "lawdelgado-f695b.firebasestorage.app",
  messagingSenderId: "186700328046",
  appId: "1:186700328046:web:49f39451dd6d2231fc0a7f",
  measurementId: "G-B0343W9JMX"
};

// Check if all required environment variables are present
const isFirebaseConfigured = Object.values(firebaseConfig).every((value) => value !== undefined)

let app: any = null
let db: any = null
let auth: any = null

if (isFirebaseConfigured) {
  // Initialize Firebase only if properly configured
  app = initializeApp(firebaseConfig)
  db = getFirestore(app)
  auth = getAuth(app)
} else {
  console.warn("Firebase environment variables are not configured. Using mock objects.")
  // Create mock objects to prevent errors
  db = {
    collection: () => ({
      get: () => Promise.resolve({ docs: [] }),
    }),
  }
  auth = {
    currentUser: null,
  }
}

export { db, auth }
export default app
