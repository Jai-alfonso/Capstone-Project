// scripts/init-status.js
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  // Your Firebase config
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function initializeStatusCollection() {
  try {
    // Create admin status document
    const adminStatus = {
      userId: "admin_user",
      isOnline: true,
      lastSeen: new Date(),
      userName: "Atty. Alia Jan Delgado",
      role: "admin",
    };

    await setDoc(doc(db, "status", "admin_user"), adminStatus);
    console.log("Admin status document created");

    console.log("Status collection initialization complete!");
  } catch (error) {
    console.error("Error initializing status collection:", error);
  }
}

initializeStatusCollection();
