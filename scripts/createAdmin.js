const { initializeApp } = require("firebase/app");
const { 
  getAuth, 
  createUserWithEmailAndPassword, 
  updateProfile 
} = require("firebase/auth");
const { 
  getFirestore, 
  doc, 
  setDoc, 
  serverTimestamp 
} = require("firebase/firestore");

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createAdminUser(email, password, firstName, lastName) {
  try {
    // Create auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update profile
    await updateProfile(user, {
      displayName: `${firstName} ${lastName}`
    });

    // Create user document with admin role
    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, {
      uid: user.uid,
      email: email,
      firstName: firstName,
      lastName: lastName,
      fullName: `${firstName} ${lastName}`,
      role: "admin",
      emailVerified: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log(`✅ Admin user created successfully: ${email}`);
    console.log(`User ID: ${user.uid}`);
    
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
  }
}

// Run the function
createAdminUser(
  "admin@delgadolaw.com", 
  "StrongPassword123!",
  "Admin",
  "User"
);