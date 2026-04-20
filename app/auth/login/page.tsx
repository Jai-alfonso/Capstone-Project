"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Eye,
  EyeOff,
  AlertCircle,
  Mail,
  CheckCircle,
  XCircle,
  Key,
  Loader2,
  Info,
  UserCheck,
  ExternalLink,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";
import {
  getAuth,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";

const handleFirebaseError = (error: any): string => {
  switch (error.code) {
    case "auth/user-not-found":
      return "No account found with this email address. Please check your email or register for an account.";
    case "auth/wrong-password":
      return "Incorrect password. Please try again.";
    case "auth/invalid-email":
      return "Invalid email address format. Please enter a valid email.";
    case "auth/invalid-credential":
      return "Invalid email or password. Please check your credentials.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";
    case "auth/too-many-requests":
      return "Too many failed login attempts. Please try again in a few minutes.";
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection.";
    case "auth/operation-not-allowed":
      return "Email/password sign-in is not enabled. Please contact support.";
    case "auth/email-already-in-use":
      return "This email is already registered. Please try logging in instead.";
    case "auth/weak-password":
      return "Password is too weak. Please use a stronger password.";
    case "auth/missing-password":
      return "Please enter your password.";
    default:
      return "Login failed. Please check your credentials and try again.";
  }
};

export default function LoginPage() {
  const router = useRouter();
  const { login, user, userProfile, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [hasAttemptedLogin, setHasAttemptedLogin] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [firebaseAuthExists, setFirebaseAuthExists] = useState<boolean | null>(
    null
  );
  const [userData, setUserData] = useState<any>(null);
  const [userDocId, setUserDocId] = useState<string>("");
  const [activationStep, setActivationStep] = useState<
    "check" | "activate" | "complete"
  >("check");
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [storedVerificationCode, setStoredVerificationCode] =
    useState<string>("");

  const [resetVerificationStep, setResetVerificationStep] = useState<
    "request" | "verify" | "reset"
  >("request");
  const [resetVerificationCode, setResetVerificationCode] = useState("");
  const [resetVerificationSent, setResetVerificationSent] = useState(false);
  const [sendingResetVerification, setSendingResetVerification] =
    useState(false);
  const [storedResetVerificationCode, setStoredResetVerificationCode] =
    useState<string>("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const [show2FAVerification, setShow2FAVerification] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState("");
  const [twoFactorSuccess, setTwoFactorSuccess] = useState(false);
  const [twoFactorVerificationSent, setTwoFactorVerificationSent] =
    useState(false);
  const [twoFactorStoredCode, setTwoFactorStoredCode] = useState("");
  const [twoFactorUserData, setTwoFactorUserData] = useState<any>(null);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const getDashboardPathByRole = (role: string | undefined): string => {
    let actualRole = role || localStorage.getItem("userRole") || "client";
    actualRole = actualRole.toLowerCase().trim();

    switch (actualRole) {
      case "admin":
        return "/dashboard/admin";
      case "client":
        return "/dashboard/client";
      case "staff":
        return "/dashboard/staff";
      case "attorney":
        return "/dashboard/attorney";
      case "paralegal":
        return "/dashboard/paralegal";
      default:
        return "/dashboard/client";
    }
  };

  const verifyUserRoleAndRedirect = async (userId: string) => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("uid", "==", userId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        const userRole = userData.role?.toLowerCase() || "client";

        localStorage.setItem("userId", userId);
        localStorage.setItem("userFirstName", userData.firstName || "");
        localStorage.setItem("userLastName", userData.lastName || "");
        localStorage.setItem("userEmail", userData.email || "");
        localStorage.setItem("userRole", userRole);

        return userRole;
      }

      return "client";
    } catch (error) {
      return "client";
    }
  };

  const fetchUserProfile = async (userId: string): Promise<any> => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("uid", "==", userId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();

        if (userData.accountStatus !== "active") {
          return null;
        }

        const profile = {
          id: userDoc.id,
          ...userData,
        };
        return profile;
      }

      const currentUser = getAuth().currentUser;
      if (currentUser?.email) {
        const emailQuery = query(
          usersRef,
          where("email", "==", currentUser.email)
        );
        const emailSnapshot = await getDocs(emailQuery);

        if (!emailSnapshot.empty) {
          const userDoc = emailSnapshot.docs[0];
          const userData = userDoc.data();

          if (userData.accountStatus !== "active") {
            return null;
          }

          const profile = {
            id: userDoc.id,
            ...userData,
          };
          return profile;
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  };

  const checkTwoFactorStatus = async (email: string): Promise<boolean> => {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const usersRef = collection(db, "users");
      const usersQuery = query(usersRef, where("email", "==", normalizedEmail));
      const usersSnapshot = await getDocs(usersQuery);

      if (!usersSnapshot.empty) {
        const userDoc = usersSnapshot.docs[0];
        const userData = userDoc.data();

        return (
          userData.twoFactorEnabled === true ||
          userData.twofactorEnabled === true
        );
      }

      return false;
    } catch (error) {
      return false;
    }
  };

  useEffect(() => {
    const redirectUser = async () => {
      if (!loading && user && !hasAttemptedLogin && user.emailVerified) {
        const dbCheck = await checkEmailInUsersDatabase(user.email || "");
        if (dbCheck.exists && dbCheck.userData?.accountStatus !== "active") {
          setError("Your account is not active. Please contact support.");
          return;
        }

        const userRole = await verifyUserRoleAndRedirect(user.uid);
        const redirectPath = getDashboardPathByRole(userRole);
        router.push(redirectPath);
      }
    };

    redirectUser();
  }, [user, loading, hasAttemptedLogin, router]);

  const checkEmailInUsersDatabase = async (
    email: string
  ): Promise<{
    exists: boolean;
    name?: string;
    userData?: any;
    docId?: string;
  }> => {
    try {
      const normalizedEmail = email.toLowerCase().trim();

      const usersRef = collection(db, "users");
      const usersQuery = query(usersRef, where("email", "==", normalizedEmail));
      const usersSnapshot = await getDocs(usersQuery);

      const existsInUsers = !usersSnapshot.empty;

      if (existsInUsers) {
        const userDoc = usersSnapshot.docs[0];
        const userData = userDoc.data();
        const name = `${userData.firstName || ""} ${
          userData.lastName || ""
        }`.trim();

        return {
          exists: true,
          name: name || undefined,
          userData: userData,
          docId: userDoc.id,
        };
      }

      return { exists: false };
    } catch (error: any) {
      return { exists: false };
    }
  };

  const checkEmailInFirebaseAuth = async (
    email: string
  ): Promise<{
    exists: boolean;
    hasPassword: boolean;
    signInMethods: string[];
  }> => {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const auth = getAuth();

      const signInMethods = await fetchSignInMethodsForEmail(
        auth,
        normalizedEmail
      );

      return {
        exists: signInMethods.length > 0,
        hasPassword: signInMethods.includes("password"),
        signInMethods,
      };
    } catch (error: any) {
      return {
        exists: false,
        hasPassword: false,
        signInMethods: [],
      };
    }
  };

  const checkEmailVerifiedStatus = async (email: string): Promise<boolean> => {
    try {
      const dbCheck = await checkEmailInUsersDatabase(email);
      if (dbCheck.exists && dbCheck.userData) {
        const emailVerified = dbCheck.userData.emailVerified;
        const isVerified =
          emailVerified === true ||
          emailVerified === "true" ||
          emailVerified === 1;
        return isVerified;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const isUserVerifiedAndActive = async (
    email: string
  ): Promise<{ verified: boolean; active: boolean; reason?: string }> => {
    try {
      const dbCheck = await checkEmailInUsersDatabase(email);
      if (!dbCheck.exists) {
        return { verified: false, active: false, reason: "Account not found" };
      }

      const userData = dbCheck.userData;
      if (!userData) {
        return {
          verified: false,
          active: false,
          reason: "User data not found",
        };
      }

      const isActive = userData.accountStatus === "active";

      let isVerified = false;
      const emailVerified = userData.emailVerified;

      if (
        emailVerified === true ||
        emailVerified === "true" ||
        emailVerified === 1
      ) {
        isVerified = true;
      } else if (
        emailVerified === false ||
        emailVerified === "false" ||
        emailVerified === 0
      ) {
        isVerified = false;
      } else if (emailVerified === undefined || emailVerified === null) {
        isVerified = false;
      } else {
        isVerified = !!emailVerified;
      }

      const result = {
        verified: isVerified,
        active: isActive,
        reason: !isActive
          ? "Account not active"
          : !isVerified
          ? "Email not verified"
          : undefined,
      };

      return result;
    } catch (error) {
      return {
        verified: false,
        active: false,
        reason: "Error checking account status",
      };
    }
  };

  const resetForm = () => {
    setResetEmail("");
    setEmailExists(null);
    setFirebaseAuthExists(null);
    setUserName("");
    setUserData(null);
    setUserDocId("");
    setIsLoading(false);
    setActivationStep("check");
    setError("");
    setSuccess("");
    setResetVerificationStep("request");
    setResetVerificationCode("");
    setResetVerificationSent(false);
  };

  const generateVerificationCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    return code;
  };

  const sendVerificationEmail = async (
    email: string,
    code: string,
    clientName: string,
    type:
      | "email-verification"
      | "password-reset"
      | "2fa-login" = "email-verification"
  ) => {
    try {
      const endpoint = "/api/email";

      let subject = "";
      let message = "";
      let originalMessage = "";

      switch (type) {
        case "email-verification":
          subject = "Email Verification Code - Delgado Law Office";
          message = `Your email verification code is: ${code}\n\nPlease enter this code on the verification page to complete your email verification.\n\nThis code will expire in 30 minutes.`;
          originalMessage = `Please verify your email address using the code above to access your account.`;
          break;
        case "password-reset":
          subject = "Password Reset Verification Code - Delgado Law Office";
          message = `Your password reset verification code is: ${code}\n\nPlease enter this code on the password reset page to verify your identity and reset your password.\n\nThis code will expire in 30 minutes.`;
          originalMessage = `Please verify your identity using the code above to reset your password.`;
          break;
        case "2fa-login":
          subject = "Two-Factor Authentication Code - Delgado Law Office";
          message = `Your two-factor authentication code is: ${code}\n\nPlease enter this code to complete your login.\n\nThis code will expire in 30 minutes.`;
          originalMessage = `Please enter this code to complete your login with two-factor authentication.`;
          break;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: email,
          subject: subject,
          message: message,
          adminName: "Delgado Law Office",
          clientName: clientName,
          inquiryId: `${type}-${Date.now()}`,
          originalMessage: originalMessage,
          verificationCode: code,
          type: type,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send email: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      throw error;
    }
  };

  const handleSendVerification = async () => {
    if (!formData.email) return;

    setSendingVerification(true);
    setVerificationError("");
    setVerificationSent(false);

    try {
      const dbCheck = await checkEmailInUsersDatabase(formData.email);

      if (!dbCheck.exists || !dbCheck.docId) {
        setVerificationError(
          "Account not found in users database. Please register first."
        );
        setSendingVerification(false);
        return;
      }

      if (dbCheck.userData?.accountStatus !== "active") {
        setVerificationError(
          "Your account is not active. Please activate your account first."
        );
        setSendingVerification(false);
        return;
      }

      const isVerified = await checkEmailVerifiedStatus(formData.email);
      if (isVerified) {
        setVerificationError(
          "Your email is already verified. You can login now."
        );
        setSendingVerification(false);
        return;
      }

      const verificationCode = generateVerificationCode();

      setStoredVerificationCode(verificationCode);

      sessionStorage.setItem(
        `verification_${formData.email}`,
        JSON.stringify({
          code: verificationCode,
          expiresAt: Date.now() + 30 * 60 * 1000,
          email: formData.email,
        })
      );

      const clientName = dbCheck.userData?.firstName
        ? `${dbCheck.userData.firstName} ${
            dbCheck.userData.lastName || ""
          }`.trim()
        : "User";

      try {
        await sendVerificationEmail(
          formData.email,
          verificationCode,
          clientName,
          "email-verification"
        );
        setVerificationSent(true);
        setSuccess("Verification code sent to your email!");
      } catch (emailError) {
        setVerificationSent(true);
        setSuccess(
          "Verification code generated. Please check the console for the code."
        );
      }

      setUserDocId(dbCheck.docId);
      setUserData(dbCheck.userData);
      setVerificationError("");

      setSendingVerification(false);
    } catch (error: any) {
      setVerificationError(
        `Failed to send verification code: ${
          error.message || "Please try again."
        }`
      );
      setSendingVerification(false);
    }
  };

  const handleVerifyEmailCode = async () => {
    if (!verificationCode.trim()) {
      setVerificationError("Please enter the verification code");
      return;
    }

    if (verificationCode.length !== 6) {
      setVerificationError("Verification code must be 6 digits");
      return;
    }

    setIsVerifyingEmail(true);
    setVerificationError("");

    try {
      const sessionVerification = sessionStorage.getItem(
        `verification_${formData.email}`
      );
      let expectedCode = storedVerificationCode;
      let expiresAt = Date.now() + 30 * 60 * 1000;

      if (sessionVerification) {
        try {
          const parsed = JSON.parse(sessionVerification);
          if (parsed.code) expectedCode = parsed.code;
          if (parsed.expiresAt) expiresAt = parsed.expiresAt;
        } catch (e) {}
      }

      if (Date.now() > expiresAt) {
        throw new Error(
          "Verification code has expired. Please request a new one."
        );
      }

      if (expectedCode !== verificationCode) {
        throw new Error(
          "Invalid verification code. Please check and try again."
        );
      }

      const dbCheck = await checkEmailInUsersDatabase(formData.email);
      if (dbCheck.exists && dbCheck.docId) {
        const userDocRef = doc(db, "users", dbCheck.docId);

        const userDocSnap = await getDoc(userDocRef);
        const currentUserData = userDocSnap.exists() ? userDocSnap.data() : {};

        await setDoc(
          userDocRef,
          {
            ...currentUserData,
            emailVerified: true,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        setUserData({
          ...userData,
          emailVerified: true,
        });
      } else {
        throw new Error("User not found in database.");
      }

      setVerificationSuccess(true);
      setVerificationError("");
      setSuccess("Email verified successfully! You can now login.");

      sessionStorage.removeItem(`verification_${formData.email}`);
      setStoredVerificationCode("");

      setTimeout(() => {
        setShowEmailVerification(false);
        setVerificationCode("");
        setVerificationSent(false);
        setVerificationSuccess(false);
        if (formData.password) {
          handleSubmit(new Event("submit") as any);
        }
      }, 3000);
    } catch (err: any) {
      setVerificationError(err.message || "Failed to verify code.");
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  const send2FAVerification = async (userData: any) => {
    setIsVerifying2FA(true);
    setTwoFactorError("");
    setTwoFactorSuccess(false);

    try {
      const verificationCode = generateVerificationCode();
      setTwoFactorStoredCode(verificationCode);

      sessionStorage.setItem(
        `2fa_login_${userData.email}`,
        JSON.stringify({
          code: verificationCode,
          expiresAt: Date.now() + 30 * 60 * 1000,
          email: userData.email,
        })
      );

      const clientName = userData.firstName
        ? `${userData.firstName} ${userData.lastName || ""}`.trim()
        : "User";

      try {
        await sendVerificationEmail(
          userData.email,
          verificationCode,
          clientName,
          "2fa-login"
        );
        setTwoFactorVerificationSent(true);
        setSuccess("Two-factor authentication code sent to your email!");
      } catch (emailError) {
        setTwoFactorVerificationSent(true);
        setSuccess(
          "Two-factor authentication code generated. Please check the console for the code."
        );
      }

      setTwoFactorUserData(userData);
      setShow2FAVerification(true);
    } catch (error: any) {
      setTwoFactorError(
        `Failed to send 2FA code: ${error.message || "Please try again."}`
      );
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const verify2FACode = async () => {
    if (!twoFactorCode.trim()) {
      setTwoFactorError("Please enter the verification code");
      return;
    }

    if (twoFactorCode.length !== 6) {
      setTwoFactorError("Verification code must be 6 digits");
      return;
    }

    setIsVerifying2FA(true);
    setTwoFactorError("");

    try {
      const sessionVerification = sessionStorage.getItem(
        `2fa_login_${twoFactorUserData.email}`
      );
      let expectedCode = twoFactorStoredCode;
      let expiresAt = Date.now() + 30 * 60 * 1000;

      if (sessionVerification) {
        try {
          const parsed = JSON.parse(sessionVerification);
          if (parsed.code) expectedCode = parsed.code;
          if (parsed.expiresAt) expiresAt = parsed.expiresAt;
        } catch (e) {}
      }

      if (Date.now() > expiresAt) {
        throw new Error(
          "Verification code has expired. Please request a new one."
        );
      }

      if (expectedCode !== twoFactorCode) {
        throw new Error(
          "Invalid verification code. Please check and try again."
        );
      }

      sessionStorage.removeItem(`2fa_login_${twoFactorUserData.email}`);
      setTwoFactorStoredCode("");

      setTwoFactorSuccess(true);
      setTwoFactorError("");
      setSuccess("Two-factor authentication successful! Redirecting...");

      localStorage.setItem(`2fa_verified_${twoFactorUserData.email}`, "true");

      setTimeout(async () => {
        const userRole = await verifyUserRoleAndRedirect(twoFactorUserData.uid);
        const redirectPath = getDashboardPathByRole(userRole);

        setShow2FAVerification(false);
        setTwoFactorCode("");
        router.push(redirectPath);
      }, 1500);
    } catch (err: any) {
      setTwoFactorError(err.message || "Failed to verify code.");
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const handleSendResetVerification = async () => {
    if (!resetEmail) return;

    setSendingResetVerification(true);
    setError("");
    setSuccess("");

    try {
      const dbCheck = await checkEmailInUsersDatabase(resetEmail);

      if (!dbCheck.exists || !dbCheck.docId) {
        setError("Account not found in users database. Please register first.");
        setSendingResetVerification(false);
        return;
      }

      if (dbCheck.userData?.accountStatus !== "active") {
        setError(
          "Your account is not active. Please activate your account first."
        );
        setSendingResetVerification(false);
        return;
      }

      const verificationCode = generateVerificationCode();

      setStoredResetVerificationCode(verificationCode);

      sessionStorage.setItem(
        `reset_verification_${resetEmail}`,
        JSON.stringify({
          code: verificationCode,
          expiresAt: Date.now() + 30 * 60 * 1000,
          email: resetEmail,
        })
      );

      const clientName = dbCheck.userData?.firstName
        ? `${dbCheck.userData.firstName} ${
            dbCheck.userData.lastName || ""
          }`.trim()
        : "User";

      try {
        await sendVerificationEmail(
          resetEmail,
          verificationCode,
          clientName,
          "password-reset"
        );
        setResetVerificationSent(true);
        setSuccess("Password reset verification code sent to your email!");
      } catch (emailError) {
        setResetVerificationSent(true);
        setSuccess(
          "Verification code generated. Please check the console for the code."
        );
      }

      setUserDocId(dbCheck.docId);
      setUserData(dbCheck.userData);
      setError("");

      setSendingResetVerification(false);
      setResetVerificationStep("verify");
    } catch (error: any) {
      setError(
        `Failed to send verification code: ${
          error.message || "Please try again."
        }`
      );
      setSendingResetVerification(false);
    }
  };

  const handleVerifyResetCode = async () => {
    if (!resetVerificationCode.trim()) {
      setError("Please enter the verification code");
      return;
    }

    if (resetVerificationCode.length !== 6) {
      setError("Verification code must be 6 digits");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const sessionVerification = sessionStorage.getItem(
        `reset_verification_${resetEmail}`
      );
      let expectedCode = storedResetVerificationCode;
      let expiresAt = Date.now() + 30 * 60 * 1000;

      if (sessionVerification) {
        try {
          const parsed = JSON.parse(sessionVerification);
          if (parsed.code) expectedCode = parsed.code;
          if (parsed.expiresAt) expiresAt = parsed.expiresAt;
        } catch (e) {}
      }

      if (Date.now() > expiresAt) {
        throw new Error(
          "Verification code has expired. Please request a new one."
        );
      }

      if (expectedCode !== resetVerificationCode) {
        throw new Error(
          "Invalid verification code. Please check and try again."
        );
      }

      sessionStorage.removeItem(`reset_verification_${resetEmail}`);
      setStoredResetVerificationCode("");

      setResetVerificationStep("reset");
      setError("");
      setSuccess(
        "Verification successful! Click below to send password reset email."
      );
    } catch (err: any) {
      setError(err.message || "Failed to verify code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFirebasePasswordReset = async () => {
    if (!resetEmail) {
      setError("Please enter your email address");
      return;
    }

    setIsResettingPassword(true);
    setError("");

    try {
      const auth = getAuth();

      const actionCodeSettings = {
        url: `${
          window.location.origin
        }/auth/login?resetSuccess=true&email=${encodeURIComponent(resetEmail)}`,
        handleCodeInApp: false,
      };

      await sendPasswordResetEmail(auth, resetEmail, actionCodeSettings);

      setSuccess(
        <div className="space-y-3">
          <p className="font-medium text-green-900">
            ✅ Password Reset Email Sent!
          </p>
          <p className="text-sm">
            Check your email for the password reset link:
            <strong className="ml-1">{resetEmail}</strong>
          </p>
          <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
            <p className="text-sm text-blue-700 font-medium mb-1">
              📧 Important: Check these locations:
            </p>
            <ul className="text-sm text-blue-700 list-disc pl-4 space-y-1">
              <li>
                Your <strong>inbox</strong> (including spam/junk folder)
              </li>
              <li>
                <strong>Promotions tab</strong> if using Gmail
              </li>
              <li>
                <strong>Updates tab</strong> if using Gmail
              </li>
              <li>Wait 1-2 minutes for the email to arrive</li>
            </ul>
          </div>
          <div className="bg-gray-50 p-2 rounded-md">
            <p className="text-xs text-gray-600">
              <strong>Note:</strong> The reset link expires in 1 hour and can
              only be used once.
            </p>
          </div>
        </div>
      );

      setTimeout(() => {
        setShowForgotPassword(false);
        resetForm();
      }, 5000);
    } catch (err: any) {
      const errorMessage = handleFirebaseError(err);
      setError(errorMessage);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const activateUserAccount = async () => {
    if (!resetEmail || !userDocId) return;

    if (userData?.accountStatus === "active") {
      setError("Account is already active.");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");
    setActivationStep("activate");

    try {
      const userDocRef = doc(db, "users", userDocId);

      await updateDoc(userDocRef, {
        accountStatus: "active",
        updatedAt: serverTimestamp(),
      });

      if (userData?.role === "client") {
        const clientDocRef = doc(db, "clients", userDocId);
        await setDoc(
          clientDocRef,
          {
            status: "active",
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        ).catch(() => {});
      }

      setSuccess("Account activated successfully! You can now log in.");
      setActivationStep("complete");
      setUserData({ ...userData, accountStatus: "active" });

      setTimeout(() => {
        setActivationStep("check");
      }, 2000);
    } catch (error: any) {
      setError(`Failed to activate account: ${error.message}`);
      setActivationStep("check");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!resetEmail || !resetEmail.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    const dbCheck = await checkEmailInUsersDatabase(resetEmail);

    if (!dbCheck.exists) {
      setError("No account found with this email address in our system.");
      return;
    }

    if (dbCheck.userData?.accountStatus !== "active") {
      setError(
        <div className="space-y-3">
          <p className="font-medium">Account Activation Required</p>
          <p className="text-sm">
            Your account exists but is not active. Please activate your account
            first.
          </p>
          <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
            <p className="text-sm text-yellow-700 font-medium mb-1">
              Click the button below to activate your account:
            </p>
            <Button
              type="button"
              onClick={activateUserAccount}
              disabled={isLoading}
              className="w-full bg-yellow-600 hover:bg-yellow-700 mt-2"
            >
              {isLoading ? "Activating..." : "Activate Account"}
            </Button>
          </div>
        </div>
      );
      return;
    }

    await handleSendResetVerification();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");
    setShowEmailVerification(false);
    setShow2FAVerification(false);
    setHasAttemptedLogin(true);

    try {
      const dbCheck = await checkEmailInUsersDatabase(formData.email);

      if (!dbCheck.exists) {
        setError(
          "No account found with this email address. Please check your email or register for an account."
        );
        setIsLoading(false);
        setHasAttemptedLogin(false);
        return;
      }

      if (dbCheck.userData?.accountStatus !== "active") {
        setError(
          <div className="space-y-3">
            <p className="font-medium">Account Not Active</p>
            <p className="text-sm">
              Your account exists in our system but is not active. Please
              activate your account to login.
            </p>
            <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200 mt-2">
              <p className="text-sm text-yellow-700 font-medium mb-1">
                Need to activate your account?
              </p>
              <Button
                type="button"
                onClick={() => {
                  setShowForgotPassword(true);
                  setResetEmail(formData.email);
                  handleResetEmailChange(formData.email);
                }}
                className="w-full bg-yellow-600 hover:bg-yellow-700"
              >
                Activate Account
              </Button>
            </div>
          </div>
        );
        setIsLoading(false);
        setHasAttemptedLogin(false);
        return;
      }

      const isVerified = await checkEmailVerifiedStatus(formData.email);

      if (!isVerified) {
        setUserData(dbCheck.userData);
        setUserDocId(dbCheck.docId || "");
        setShowEmailVerification(true);
        setError("Please verify your email before logging in.");
        setIsLoading(false);
        setHasAttemptedLogin(false);
        return;
      }

      try {
        const auth = getAuth();
        const userCredential = await signInWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );

        const userStatus = await isUserVerifiedAndActive(formData.email);

        if (!userStatus.active) {
          setError("Your account is not active. Please contact support.");
          setIsLoading(false);
          setHasAttemptedLogin(false);
          return;
        }

        const manualProfile = await fetchUserProfile(userCredential.user.uid);

        if (!manualProfile) {
          setError("Account configuration error. Please contact support.");
          setIsLoading(false);
          return;
        }

        if (manualProfile.accountStatus !== "active") {
          setError("Your account is not active. Please contact support.");
          setIsLoading(false);
          setHasAttemptedLogin(false);
          return;
        }

        if (dbCheck.exists && dbCheck.docId) {
          const userDocRef = doc(db, "users", dbCheck.docId);
          await setDoc(
            userDocRef,
            {
              lastLoginAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }

        const is2FAEnabled = await checkTwoFactorStatus(formData.email);

        if (is2FAEnabled) {
          setTwoFactorUserData({
            ...manualProfile,
            uid: userCredential.user.uid,
            email: formData.email,
          });

          await send2FAVerification({
            ...manualProfile,
            uid: userCredential.user.uid,
            email: formData.email,
          });

          setIsLoading(false);
          return;
        }

        const userRole = await verifyUserRoleAndRedirect(
          userCredential.user.uid
        );
        const redirectPath = getDashboardPathByRole(userRole);

        setSuccess("Login successful! Redirecting...");
        setTimeout(() => {
          router.push(redirectPath);
        }, 1000);
      } catch (authError: any) {
        const errorMessage = handleFirebaseError(authError);
        setError(errorMessage);
        setHasAttemptedLogin(false);
      }
    } catch (err: any) {
      setError("An unexpected error occurred. Please try again.");
      setHasAttemptedLogin(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetEmailChange = async (email: string) => {
    setResetEmail(email);
    setEmailExists(null);
    setFirebaseAuthExists(null);
    setUserName("");
    setUserData(null);
    setUserDocId("");
    setActivationStep("check");
    setResetVerificationStep("request");
    setResetVerificationCode("");
    setResetVerificationSent(false);

    if (email && email.includes("@")) {
      setCheckingEmail(true);
      try {
        const dbResult = await checkEmailInUsersDatabase(email);

        setEmailExists(dbResult.exists);
        if (dbResult.name) {
          setUserName(dbResult.name);
        }
        if (dbResult.userData) {
          setUserData(dbResult.userData);
        }
        if (dbResult.docId) {
          setUserDocId(dbResult.docId);
        }

        if (dbResult.exists) {
          const authCheck = await checkEmailInFirebaseAuth(email);
          setFirebaseAuthExists(authCheck.exists);
        }
      } catch (error: any) {
        setEmailExists(false);
        setFirebaseAuthExists(false);
        setUserName("");
        setUserData(null);
        setUserDocId("");
      } finally {
        setCheckingEmail(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2">
            <div className="p-3 rounded-lg">
              <Image
                src="/logo.jpg"
                alt="Delgado Law Office Logo"
                width={32}
                height={32}
                className="rounded"
              />
            </div>
            <div className="text-left">
              <div className="font-bold text-2xl text-white font-serif">
                Delgado Law Office
              </div>
            </div>
          </Link>
        </div>

        {/* 2FA Verification Modal */}
        {show2FAVerification && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="text-xl">
                  Two-Factor Authentication
                </CardTitle>
                <CardDescription>
                  An extra layer of security for your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                {twoFactorSuccess ? (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Two-Factor Authentication Successful!
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      You are being redirected to your dashboard.
                    </p>
                    <div className="flex justify-center">
                      <div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                      <h3 className="font-semibold text-blue-900 mb-2">
                        Two-Factor Authentication Required
                      </h3>
                      <p className="text-sm text-blue-700 mb-2">
                        {twoFactorVerificationSent
                          ? "A 6-digit verification code has been sent to:"
                          : "A 6-digit verification code will be sent to:"}
                      </p>
                      <p className="font-medium text-blue-900">
                        {formData.email}
                      </p>
                      {twoFactorVerificationSent && (
                        <div className="mt-3 p-2 bg-green-100 rounded">
                          <div className="flex items-center justify-center">
                            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                            <span className="text-sm text-green-700">
                              Verification code sent! Check your email.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {twoFactorError && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{twoFactorError}</AlertDescription>
                      </Alert>
                    )}

                    {!twoFactorVerificationSent ? (
                      <div className="space-y-4">
                        <Alert className="mb-4 border-yellow-200 bg-yellow-50">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <AlertDescription className="text-yellow-800">
                            Two-factor authentication is enabled for your
                            account.
                          </AlertDescription>
                        </Alert>

                        <Button
                          onClick={() => send2FAVerification(twoFactorUserData)}
                          disabled={isVerifying2FA}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          {isVerifying2FA ? (
                            <span className="flex items-center justify-center">
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Sending Verification Code...
                            </span>
                          ) : (
                            "Send Verification Code"
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4 mb-6">
                        <div>
                          <Label
                            htmlFor="twoFactorCode"
                            className="text-gray-700 block mb-2"
                          >
                            Enter Verification Code *
                          </Label>
                          <Input
                            id="twoFactorCode"
                            type="text"
                            value={twoFactorCode}
                            onChange={(e) => {
                              const value = e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 6);
                              setTwoFactorCode(value);
                              setTwoFactorError("");
                            }}
                            placeholder="123456"
                            className="text-center text-2xl font-mono tracking-widest"
                            maxLength={6}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            6-digit code sent to your email
                          </p>
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            onClick={verify2FACode}
                            disabled={
                              isVerifying2FA || twoFactorCode.length !== 6
                            }
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            {isVerifying2FA ? (
                              <span className="flex items-center justify-center">
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Verifying...
                              </span>
                            ) : (
                              "Verify Code"
                            )}
                          </Button>

                          <Button
                            onClick={() =>
                              send2FAVerification(twoFactorUserData)
                            }
                            variant="outline"
                            disabled={isVerifying2FA}
                            className="flex-1"
                          >
                            {isVerifying2FA ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Key className="h-3 w-3 mr-1" />
                            )}
                            Resend Code
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>Note:</strong> The verification code expires in
                        30 minutes.
                      </p>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setShow2FAVerification(false);
                          setTwoFactorCode("");
                          setTwoFactorError("");
                          setTwoFactorVerificationSent(false);
                          setTwoFactorStoredCode("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-serif text-navy-900">
              Welcome Back
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showForgotPassword && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <Card className="w-full max-w-md">
                  <CardHeader>
                    <CardTitle className="text-xl">
                      {resetVerificationStep === "request"
                        ? "Reset Password"
                        : resetVerificationStep === "verify"
                        ? "Verify Identity"
                        : "Send Reset Link"}
                    </CardTitle>
                    <CardDescription>
                      {resetVerificationStep === "request"
                        ? "Enter your email address to reset your password."
                        : resetVerificationStep === "verify"
                        ? "Enter the verification code sent to your email."
                        : "Click below to send Firebase password reset email."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {error && typeof error === "string" && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    {success && (
                      <Alert className="mb-4 border-green-200 bg-green-50">
                        <Mail className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          {success}
                        </AlertDescription>
                      </Alert>
                    )}

                    {activationStep === "activate" ? (
                      <div className="text-center py-4">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Key className="h-8 w-8 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          {userData?.accountStatus === "active" &&
                          firebaseAuthExists === false
                            ? "Setting up Authentication..."
                            : "Activating Account..."}
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Please wait while we process your account.
                        </p>
                        <div className="flex justify-center">
                          <div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                        </div>
                      </div>
                    ) : activationStep === "complete" ? (
                      <div className="text-center py-4">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          {success.includes("activated")
                            ? "Account Activated Successfully!"
                            : success.includes("sent")
                            ? "Password Reset Email Sent!"
                            : "Success!"}
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">{success}</p>
                        <div className="flex space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                              setShowForgotPassword(false);
                              resetForm();
                              if (resetEmail) {
                                setFormData({ ...formData, email: resetEmail });
                              }
                            }}
                          >
                            Close
                          </Button>
                          {success.includes("activated") && (
                            <Button
                              type="button"
                              onClick={() => {
                                setShowForgotPassword(false);
                                resetForm();
                                setFormData({ ...formData, email: resetEmail });
                              }}
                              className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                              Continue to Login
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <>
                        {resetVerificationStep === "request" && (
                          <form
                            onSubmit={handleForgotPassword}
                            className="space-y-4"
                          >
                            <div>
                              <Label htmlFor="reset-email">Email Address</Label>
                              <div className="relative">
                                <Input
                                  id="reset-email"
                                  type="email"
                                  value={resetEmail}
                                  onChange={(e) =>
                                    handleResetEmailChange(e.target.value)
                                  }
                                  placeholder="Enter your email"
                                  required
                                  autoFocus
                                  className={
                                    emailExists === false
                                      ? "border-red-300"
                                      : emailExists === true
                                      ? userData?.accountStatus === "active"
                                        ? firebaseAuthExists === true
                                          ? "border-green-300"
                                          : "border-yellow-300"
                                        : "border-orange-300"
                                      : ""
                                  }
                                />
                                {checkingEmail && (
                                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                                  </div>
                                )}
                                {emailExists === true && !checkingEmail && (
                                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    {userData?.accountStatus === "active" ? (
                                      firebaseAuthExists === true ? (
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                      ) : firebaseAuthExists === false ? (
                                        <Info className="h-4 w-4 text-yellow-500" />
                                      ) : null
                                    ) : (
                                      <UserCheck className="h-4 w-4 text-orange-500" />
                                    )}
                                  </div>
                                )}
                                {emailExists === false && !checkingEmail && (
                                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <XCircle className="h-4 w-4 text-red-500" />
                                  </div>
                                )}
                              </div>

                              <div className="mt-2 text-sm space-y-1">
                                {checkingEmail && (
                                  <div className="text-gray-500 flex items-center">
                                    <div className="animate-spin h-3 w-3 border-2 border-gray-400 border-t-transparent rounded-full mr-2"></div>
                                    Checking users database...
                                  </div>
                                )}
                                {emailExists === true && !checkingEmail && (
                                  <div className="space-y-1">
                                    <p
                                      className={`flex items-center ${
                                        userData?.accountStatus === "active"
                                          ? "text-green-600"
                                          : "text-orange-600"
                                      }`}
                                    >
                                      {userData?.accountStatus === "active" ? (
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                      ) : (
                                        <UserCheck className="h-3 w-3 mr-1" />
                                      )}
                                      Account{" "}
                                      {userData?.accountStatus === "active"
                                        ? "verified in users database"
                                        : "found (needs activation)"}
                                    </p>
                                    {userName && (
                                      <p className="text-gray-600 text-xs">
                                        Name:{" "}
                                        <span className="font-medium">
                                          {userName}
                                        </span>
                                      </p>
                                    )}

                                    {userData?.accountStatus !== "active" ? (
                                      <div className="space-y-2">
                                        <p className="text-xs text-orange-500">
                                          ⚠️ Account needs activation
                                        </p>
                                        <div className="bg-orange-50 p-2 rounded-md border border-orange-200">
                                          <p className="text-xs text-orange-700 mb-2">
                                            Your account exists in our users
                                            database but is not active. Click
                                            the button below to activate it.
                                          </p>
                                          <Button
                                            type="button"
                                            size="sm"
                                            onClick={activateUserAccount}
                                            disabled={isLoading}
                                            className="w-full bg-orange-600 hover:bg-orange-700"
                                          >
                                            {isLoading
                                              ? "Activating..."
                                              : "Activate Account"}
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        <p className="text-xs text-green-500">
                                          ✓ Ready to send verification code
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          Click "Send Verification Code" to
                                          receive verification code first, then
                                          Firebase password reset link.
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {emailExists === false &&
                                  !checkingEmail &&
                                  resetEmail.includes("@") && (
                                    <div className="space-y-1">
                                      <p className="text-red-600 flex items-center">
                                        <XCircle className="h-3 w-3 mr-1" />
                                        No account found in users database
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        ✗ Cannot send password reset email to
                                        unregistered email
                                      </p>
                                    </div>
                                  )}
                              </div>
                            </div>

                            <div className="flex space-x-2">
                              <Button
                                type="button"
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                  setShowForgotPassword(false);
                                  resetForm();
                                }}
                                disabled={isLoading || sendingResetVerification}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                className="flex-1 bg-navy-700 hover:bg-navy-800"
                                disabled={
                                  isLoading ||
                                  sendingResetVerification ||
                                  checkingEmail ||
                                  emailExists === false ||
                                  (emailExists === true &&
                                    userData?.accountStatus !== "active")
                                }
                              >
                                {sendingResetVerification ? (
                                  <span className="flex items-center">
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Sending...
                                  </span>
                                ) : (
                                  "Send Verification Code"
                                )}
                              </Button>
                            </div>
                          </form>
                        )}

                        {resetVerificationStep === "verify" && (
                          <div className="space-y-4">
                            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                              <h3 className="font-semibold text-blue-900 mb-2">
                                Verification Code Sent
                              </h3>
                              <p className="text-sm text-blue-700 mb-2">
                                A 6-digit verification code has been sent to:
                              </p>
                              <p className="font-medium text-blue-900">
                                {resetEmail}
                              </p>
                              {resetVerificationSent && (
                                <div className="mt-3 p-2 bg-green-100 rounded">
                                  <div className="flex items-center justify-center">
                                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                                    <span className="text-sm text-green-700">
                                      Verification code sent! Check your email.
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div>
                              <Label htmlFor="reset-verification-code">
                                Enter Verification Code *
                              </Label>
                              <Input
                                id="reset-verification-code"
                                type="text"
                                value={resetVerificationCode}
                                onChange={(e) => {
                                  const value = e.target.value
                                    .replace(/\D/g, "")
                                    .slice(0, 6);
                                  setResetVerificationCode(value);
                                  setError("");
                                }}
                                placeholder="123456"
                                className="text-center text-2xl font-mono tracking-widest"
                                maxLength={6}
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                6-digit code sent to your email
                              </p>
                            </div>

                            <div className="flex space-x-2">
                              <Button
                                onClick={handleVerifyResetCode}
                                disabled={
                                  isLoading ||
                                  resetVerificationCode.length !== 6
                                }
                                className="flex-1 bg-green-600 hover:bg-green-700"
                              >
                                {isLoading ? (
                                  <span className="flex items-center justify-center">
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Verifying...
                                  </span>
                                ) : (
                                  "Verify Code"
                                )}
                              </Button>

                              <Button
                                onClick={handleSendResetVerification}
                                variant="outline"
                                disabled={sendingResetVerification}
                                className="flex-1"
                              >
                                {sendingResetVerification ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <Key className="h-3 w-3 mr-1" />
                                )}
                                Resend Code
                              </Button>
                            </div>

                            <div className="mt-4">
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                  setResetVerificationStep("request");
                                  setResetVerificationCode("");
                                  setError("");
                                }}
                                className="w-full"
                              >
                                Back to Email Entry
                              </Button>
                            </div>
                          </div>
                        )}

                        {resetVerificationStep === "reset" && (
                          <div className="space-y-4">
                            <div className="mb-4 p-4 bg-green-50 rounded-lg">
                              <h3 className="font-semibold text-green-900 mb-2">
                                Identity Verified Successfully!
                              </h3>

                              <p className="text-sm text-gray-600">
                                A secure password reset link will be sent to:
                                <span className="font-medium">
                                  {" "}
                                  {resetEmail}
                                </span>
                              </p>
                            </div>

                            <div className="flex space-x-2">
                              <Button
                                type="button"
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                  setResetVerificationStep("verify");
                                }}
                                disabled={isResettingPassword}
                              >
                                Back
                              </Button>
                              <Button
                                onClick={handleFirebasePasswordReset}
                                disabled={isResettingPassword}
                                className="flex-1 bg-green-600 hover:bg-green-700"
                              >
                                {isResettingPassword ? (
                                  <span className="flex items-center justify-center">
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Sending...
                                  </span>
                                ) : (
                                  "Send Password Reset Email"
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    <div className="mt-4 text-sm text-gray-500">
                      <div className="flex items-start mb-2">
                        <div
                          className={`p-1 rounded mr-2 ${
                            userData?.accountStatus === "active"
                              ? firebaseAuthExists === true
                                ? "bg-green-100"
                                : "bg-yellow-100"
                              : "bg-orange-100"
                          }`}
                        >
                          {userData?.accountStatus === "active" ? (
                            firebaseAuthExists === true ? (
                              <CheckCircle className="h-3 w-3 text-green-600" />
                            ) : (
                              <Info className="h-3 w-3 text-yellow-600" />
                            )
                          ) : (
                            <UserCheck className="h-3 w-3 text-orange-600" />
                          )}
                        </div>
                        <div>
                          <p
                            className={`font-medium ${
                              userData?.accountStatus === "active"
                                ? firebaseAuthExists === true
                                  ? "text-green-900"
                                  : "text-yellow-900"
                                : "text-orange-900"
                            }`}
                          >
                            Account Status:
                          </p>
                          <div className="mt-1 text-xs space-y-1">
                            <div className="flex items-center">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  emailExists === true
                                    ? userData?.accountStatus === "active"
                                      ? firebaseAuthExists === true
                                        ? "bg-green-500"
                                        : "bg-yellow-500"
                                      : "bg-orange-500"
                                    : "bg-gray-300"
                                } mr-2`}
                              ></div>
                              <span>
                                {emailExists === true
                                  ? userData?.accountStatus === "active"
                                    ? firebaseAuthExists === true
                                      ? "✓ Active account with authentication"
                                      : "✓ Active account (needs authentication setup)"
                                    : "⚠️ Inactive account (needs activation)"
                                  : "Checking users database..."}
                              </span>
                            </div>
                            {firebaseAuthExists === false &&
                              userData?.accountStatus === "active" && (
                                <p className="text-xs text-yellow-600 mt-1">
                                  Note: Password reset requires Firebase
                                  authentication setup
                                </p>
                              )}
                          </div>
                        </div>
                      </div>
                      <p className="text-xs mt-2 text-gray-400">
                        {resetVerificationStep === "request"
                          ? "Enter email to send verification code"
                          : resetVerificationStep === "verify"
                          ? "Enter verification code to proceed"
                          : "Click button to send Firebase password reset email"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {showEmailVerification && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <Card className="w-full max-w-md">
                  <CardHeader>
                    <CardTitle className="text-xl">Verify Your Email</CardTitle>
                    <CardDescription>
                      Please verify your email address to continue.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {verificationSuccess ? (
                      <div className="text-center py-4">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          Email Verified Successfully!
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                          You can now login to your account.
                        </p>
                        <Button
                          type="button"
                          onClick={() => {
                            setShowEmailVerification(false);
                            setVerificationSuccess(false);
                            if (formData.password) {
                              handleSubmit(new Event("submit") as any);
                            }
                          }}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          Continue to Login
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                          <h3 className="font-semibold text-blue-900 mb-2">
                            Email Verification Required
                          </h3>
                          <p className="text-sm text-blue-700 mb-2">
                            {verificationSent
                              ? "A 6-digit verification code has been sent to:"
                              : "A 6-digit verification code will be sent to:"}
                          </p>
                          <p className="font-medium text-blue-900">
                            {formData.email}
                          </p>
                          {verificationSent && (
                            <div className="mt-3 p-2 bg-green-100 rounded">
                              <div className="flex items-center justify-center">
                                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                                <span className="text-sm text-green-700">
                                  Verification code sent! Check your email.
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {verificationError && (
                          <Alert variant="destructive" className="mb-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              {verificationError}
                            </AlertDescription>
                          </Alert>
                        )}

                        {!verificationSent ? (
                          <div className="space-y-4">
                            <Alert className="mb-4 border-yellow-200 bg-yellow-50">
                              <AlertCircle className="h-4 w-4 text-yellow-600" />
                              <AlertDescription className="text-yellow-800">
                                Your email needs verification before you can
                                login.
                              </AlertDescription>
                            </Alert>

                            <Button
                              onClick={handleSendVerification}
                              disabled={sendingVerification}
                              className="w-full bg-green-600 hover:bg-green-700"
                            >
                              {sendingVerification ? (
                                <span className="flex items-center justify-center">
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Sending Verification Code...
                                </span>
                              ) : (
                                "Send Verification Code"
                              )}
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4 mb-6">
                            <div>
                              <Label
                                htmlFor="verificationCode"
                                className="text-gray-700 block mb-2"
                              >
                                Enter Verification Code *
                              </Label>
                              <Input
                                id="verificationCode"
                                type="text"
                                value={verificationCode}
                                onChange={(e) => {
                                  const value = e.target.value
                                    .replace(/\D/g, "")
                                    .slice(0, 6);
                                  setVerificationCode(value);
                                  setVerificationError("");
                                }}
                                placeholder="123456"
                                className="text-center text-2xl font-mono tracking-widest"
                                maxLength={6}
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                6-digit code sent to your email
                              </p>
                            </div>

                            <div className="flex space-x-2">
                              <Button
                                onClick={handleVerifyEmailCode}
                                disabled={
                                  isVerifyingEmail ||
                                  verificationCode.length !== 6
                                }
                                className="flex-1 bg-green-600 hover:bg-green-700"
                              >
                                {isVerifyingEmail ? (
                                  <span className="flex items-center justify-center">
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Verifying...
                                  </span>
                                ) : (
                                  "Verify Email"
                                )}
                              </Button>

                              <Button
                                onClick={handleSendVerification}
                                variant="outline"
                                disabled={sendingVerification}
                                className="flex-1"
                              >
                                {sendingVerification ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <Key className="h-3 w-3 mr-1" />
                                )}
                                Resend Code
                              </Button>
                            </div>
                          </div>
                        )}

                        <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            <strong>Note:</strong> The verification code expires
                            in 30 minutes.
                          </p>
                        </div>

                        <div className="mt-4 flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setShowEmailVerification(false);
                              setVerificationCode("");
                              setVerificationError("");
                              setVerificationSent(false);
                              setStoredVerificationCode("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {error && !showEmailVerification && !show2FAVerification && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && !show2FAVerification && (
              <Alert className="mb-4 border-green-200 bg-green-50">
                <AlertCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {success}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <Button
                  type="button"
                  variant="link"
                  className="text-sm text-navy-700 hover:underline p-0 h-auto"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Forgot password?
                </Button>
              </div>

              <Button
                type="submit"
                className="w-full bg-navy-700 hover:bg-navy-800 rounded-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <Link
                  href="/auth/register"
                  className="text-navy-700 hover:underline font-medium"
                >
                  Register here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Link href="/" className="text-gray-300 hover:text-white text-sm">
            ← Back to Website
          </Link>
        </div>
      </div>
    </div>
  );
}
