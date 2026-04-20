import { getDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Timestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export interface User {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  role: string;
  phone: string;
  createdAt: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  accountStatus?: string;
  address?: string;
  lastLoginAt?: string | null;
  updatedAt?: string;
  verificationSentAt?: string;
  emergencyContact?: string;
  notes?: string;

  refresh?: () => void;
}

export interface Case {
  id: string;
  clientId: string;
  title: string;
  description: string;
  caseType: string;
  status:
    | "filed"
    | "under-review"
    | "court-hearing"
    | "motion-hearings"
    | "closed";
  priority: "low" | "medium" | "high";
  assignedLawyer: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  nextHearing?: Timestamp;
  documents: string[];
}

export interface Appointment {
  id: string;
  clientId: string;
  lawyerId: string;
  title: string;
  description: string;
  subject: string;
  message: string;
  date: Timestamp;
  duration: number;
  status:
    | "pending"
    | "confirmed"
    | "ongoing"
    | "completed"
    | "cancelled"
    | "no-show";
  meetingType: "in-person" | "video-call" | "phone-call";
  serviceType: "complex" | "simple" | "pending-review";
  legalService?: string;
  adminNotes?: string;
  progressStages?: ProgressStage[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  rescheduleHistory?: RescheduleRecord[];
}

export interface ProgressStage {
  id: string;
  name: string;
  description: string;
  status: "pending" | "in-progress" | "completed";
  completedAt?: Timestamp;
  order: number;
}

export interface RescheduleRecord {
  oldDate: Timestamp;
  newDate: Timestamp;
  reason: string;
  rescheduledBy: string;
  rescheduledAt: Timestamp;
}

export interface AttorneyAvailability {
  id: string;
  date: Timestamp;
  isAvailable: boolean;
  reason?: string;
  timeRange?: string;
  blockedSlots?: string[];
  createdAt: Timestamp;
}

export interface Document {
  id: string;
  caseId: string;
  clientId: string;
  name: string;
  type: string;
  url: string;
  size: number;
  uploadedBy: string;
  createdAt: Timestamp;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Timestamp;
}

export const createUser = async (uid: string, userData: any) => {
  try {
    const users = JSON.parse(localStorage.getItem("users") || "{}");
    const userRole = userData.role || "client";

    users[uid] = {
      ...userData,
      id: uid,
      role: userRole,
      email: userData.email,
      firstName: userData.firstName || "",
      lastName: userData.lastName || "",
      phone: userData.phone || "",
      createdAt: userData.createdAt || new Date().toISOString(),
      updatedAt: userData.updatedAt || new Date().toISOString(),
    };
    localStorage.setItem("users", JSON.stringify(users));
    console.log("[v0] User created with role:", userRole, "UID:", uid);
    return uid;
  } catch (error) {
    console.warn("[v0] Could not create user:", error);
    return uid;
  }
};

export const getUser = async (uid: string): Promise<User | null> => {
  try {
    console.log("[Firestore] Fetching user with UID:", uid);

    const userDoc = await getDoc(doc(db, "users", uid));

    if (!userDoc.exists()) {
      console.log("[Firestore] No user document found for UID:", uid);
      return null;
    }

    const data = userDoc.data();

    // ALWAYS use Firestore's emailVerified value
    // This is because our custom registration flow doesn't use Firebase's built-in email verification
    let emailVerified = data.emailVerified || false;

    console.log(
      "[Firestore] Using Firestore emailVerified value:",
      emailVerified
    );

    // REMOVED: The code that checks Firebase Auth's emailVerified
    // We don't need this because we have our own verification system

    console.log("[Firestore] User data fetched:", {
      uid: uid,
      email: data.email,
      emailVerified: emailVerified, // This is from Firestore
      accountStatus: data.accountStatus,
      role: data.role,
    });

    const user: User = {
      uid: data.uid || uid,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      fullName: data.fullName,
      role: data.role || "client",
      phone: data.phone || "",
      emailVerified: emailVerified, // Use Firestore value
      twoFactorEnabled: data.twoFactorEnabled || false,
      accountStatus:
        data.accountStatus ||
        (emailVerified ? "active" : "pending-verification"),
      address: data.address || "",
      createdAt:
        data.createdAt?.toDate().toISOString() || new Date().toISOString(),
      lastLoginAt: data.lastLoginAt?.toDate().toISOString() || null,
      updatedAt:
        data.updatedAt?.toDate().toISOString() || new Date().toISOString(),
      verificationSentAt: data.verificationSentAt,
      emergencyContact: data.emergencyContact,
      notes: data.notes,
    };

    return user;
  } catch (error) {
    console.error("[Firestore] Error getting user:", error);
    return null;
  }
};

export const updateUser = async (userId: string, updates: Partial<User>) => {
  try {
    console.log("[Firestore] Updating user:", userId, updates);

    await updateDoc(doc(db, "users", userId), {
      ...updates,
      updatedAt: new Date(),
    });

    const users = JSON.parse(localStorage.getItem("users") || "{}");
    if (users[userId]) {
      users[userId] = {
        ...users[userId],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem("users", JSON.stringify(users));
    }

    console.log("[Firestore] User updated successfully");
  } catch (error) {
    console.warn("[Firestore] Could not update user:", error);
    throw error;
  }
};
