/**
 * Admin Account Setup Script
 * 
 * This script helps you set up the admin account in localStorage for testing.
 * Run this in your browser console on localhost to create the admin user.
 * 
 * Admin UID: aUz5GRXgOER5UljVGEnpO4asQij2
 * 
 * Usage:
 * 1. Open your app in the browser (http://localhost:3000)
 * 2. Open Developer Tools (F12)
 * 3. Go to Console tab
 * 4. Copy and paste this entire script
 * 5. Press Enter to execute
 */

const ADMIN_UID = "aUz5GRXgOER5UljVGEnpO4asQij2";

// Admin account details - CHANGE THESE
const adminAccount = {
  uid: ADMIN_UID,
  email: "admin@delgadolaw.com", // Change this to your admin email
  firstName: "Admin",
  lastName: "User",
  phone: "9123456789",
  role: "admin",
  passwordHash: "admin123", // Change this to your desired password
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// Get existing registered users
const registeredUsers = JSON.parse(localStorage.getItem("registeredUsers") || "[]");

// Check if admin already exists
const existingAdminIndex = registeredUsers.findIndex(u => u.uid === ADMIN_UID);

if (existingAdminIndex !== -1) {
  // Update existing admin
  registeredUsers[existingAdminIndex] = adminAccount;
  console.log("✅ Admin account updated!");
} else {
  // Add new admin
  registeredUsers.push(adminAccount);
  console.log("✅ Admin account created!");
}

// Save back to localStorage
localStorage.setItem("registeredUsers", JSON.stringify(registeredUsers));

console.log("📋 Admin Account Details:");
console.log("  Email:", adminAccount.email);
console.log("  Password:", adminAccount.passwordHash);
console.log("  Role: admin");
console.log("  UID:", ADMIN_UID);
console.log("\n🔐 You can now login with these credentials!");
console.log("   After login, you will be redirected to /dashboard/admin");
