import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export interface User {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  role: string;
  accountStatus: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  twoFactorEnabled: boolean;
  address?: string;
  verificationSentAt?: string;
  emergencyContact?: string;
  notes?: string;
}

export default class UserService {
  static async getUserById(userId: string): Promise<User | null> {
    try {
      console.log("[UserService.getUserById] Fetching user document for ID:", userId);
      const userDoc = await getDoc(doc(db, "users", userId));
      
      if (userDoc.exists()) {
        const userData = { uid: userDoc.id, ...userDoc.data() } as User;
        console.log("[UserService.getUserById] ✓ User document found:", {
          uid: userData.uid,
          fullName: userData.fullName,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          role: userData.role,
        });
        return userData;
      } else {
        console.warn("[UserService.getUserById] ✗ User document does not exist for ID:", userId);
        return null;
      }
    } catch (error) {
      console.error("[UserService.getUserById] ✗ Error fetching user:", error);
      return null;
    }
  }
}
