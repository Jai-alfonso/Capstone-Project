"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Edit,
  Save,
  X,
  Shield,
  ShieldOff,
  AlertCircle,
  Calendar,
  Key,
  CheckCircle,
  XCircle,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { updateDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/config";
import { AdminDashboardLayout } from "@/components/admin-dashboard-layout";
import { onAuthStateChanged } from "firebase/auth";
import {
  getAuth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";

interface FullUserProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  phone: string;
  role: string;
  accountStatus: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  address?: string;
  createdAt: any;
  updatedAt?: any;
  lastLoginAt?: any;
  verificationCode?: string;
  verificationSentAt?: string;
  emergencyContact?: string;
  notes?: string;
  refresh?: () => void;
}

export default function AdminProfilePage() {
  const [userProfile, setUserProfile] = useState<FullUserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    emergencyContact: "",
    notes: "",
  });

  // 2FA States
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState("");
  const [twoFactorSuccess, setTwoFactorSuccess] = useState("");
  const [sendingVerification, setSendingVerification] = useState(false);
  const [storedVerificationCode, setStoredVerificationCode] = useState("");

  // Password Change States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordChangeStep, setPasswordChangeStep] = useState<
    "confirm" | "verify" | "reset"
  >("confirm");
  const [currentPassword, setCurrentPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [passwordVerificationCode, setPasswordVerificationCode] = useState("");
  const [passwordVerificationSent, setPasswordVerificationSent] =
    useState(false);
  const [passwordStoredVerificationCode, setPasswordStoredVerificationCode] =
    useState("");
  const [passwordChangeError, setPasswordChangeError] = useState("");
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState("");
  const [isConfirmingPassword, setIsConfirmingPassword] = useState(false);
  const [isVerifyingPasswordCode, setIsVerifyingPasswordCode] = useState(false);
  const [isSendingPasswordReset, setIsSendingPasswordReset] = useState(false);

  // General States
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loading2FA, setLoading2FA] = useState(true);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    if (typeof timestamp === "string") {
      return new Date(timestamp).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return "N/A";
  };

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const userId = localStorage.getItem("userId");
        const userEmail = localStorage.getItem("userEmail");
        const userFirstName = localStorage.getItem("userFirstName");
        const userLastName = localStorage.getItem("userLastName");
        const userRole = localStorage.getItem("userRole");

        if (userId) {
          const userDocRef = doc(db, "users", userId);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log("Fetched user data from Firestore:", userData);

            const profile: FullUserProfile = {
              uid: userId,
              email: userData.email || userEmail || "",
              firstName: userData.firstName || userFirstName || "",
              lastName: userData.lastName || userLastName || "",
              role: userData.role || userRole || "admin",
              accountStatus: userData.accountStatus || "active",
              emailVerified: userData.emailVerified || false,
              twoFactorEnabled: userData.twoFactorEnabled || false,
              phone: userData.phone || "",
              address: userData.address || "",
              emergencyContact: userData.emergencyContact || "",
              notes: userData.notes || "",
              createdAt: userData.createdAt || new Date(),
              updatedAt: userData.updatedAt || null,
              lastLoginAt: userData.lastLoginAt || null,
            };

            setUserProfile(profile);
            setProfileData({
              firstName: profile.firstName || "",
              lastName: profile.lastName || "",
              email: profile.email || "",
              phone: profile.phone || "",
              address: profile.address || "",
              emergencyContact: profile.emergencyContact || "",
              notes: profile.notes || "",
            });

            setIs2FAEnabled(profile.twoFactorEnabled || false);
            console.log("2FA Status from Firestore:", profile.twoFactorEnabled);
          } else {
            const profile: FullUserProfile = {
              uid: userId,
              email: userEmail || "",
              firstName: userFirstName || "",
              lastName: userLastName || "",
              role: userRole || "admin",
              accountStatus: "active",
              emailVerified: true,
              twoFactorEnabled: false,
              phone: "",
              address: "",
              createdAt: new Date(),
            };

            setUserProfile(profile);
            setProfileData({
              firstName: userFirstName || "",
              lastName: userLastName || "",
              email: userEmail || "",
              phone: "",
              address: "",
              emergencyContact: "",
              notes: "",
            });
          }
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
      } finally {
        setIsLoading(false);
        setLoading2FA(false);
      }
    };

    loadUserProfile();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            const twoFactorStatus = userData.twoFactorEnabled || false;

            console.log("Auth state changed, 2FA status:", twoFactorStatus);
            setIs2FAEnabled(twoFactorStatus);

            if (userProfile) {
              setUserProfile((prev) =>
                prev
                  ? {
                      ...prev,
                      twoFactorEnabled: twoFactorStatus,
                    }
                  : null
              );
            }
          }
        } catch (error) {
          console.error("Error fetching 2FA status:", error);
        }
      }
    });

    return () => unsubscribe();
  }, [userProfile]);

  const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const sendVerificationEmail = async (
    email: string,
    code: string,
    clientName: string,
    type: "2fa-verification" | "password-reset"
  ) => {
    try {
      const endpoint = "/api/email";
      let subject = "";
      let message = "";
      let originalMessage = "";

      if (type === "2fa-verification") {
        subject =
          "Two-Factor Authentication Verification Code - Delgado Law Office";
        message = `Your two-factor authentication verification code is: ${code}\n\nPlease enter this code to enable two-factor authentication for your account.\n\nThis code will expire in 30 minutes.`;
        originalMessage = `Please verify your identity using the code above to enable two-factor authentication.`;
      } else {
        subject = "Password Change Verification Code - Delgado Law Office";
        message = `Your password change verification code is: ${code}\n\nPlease enter this code to verify your identity and proceed with the password change.\n\nThis code will expire in 30 minutes.`;
        originalMessage = `Please verify your identity using the code above to change your password.`;
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

  // Password Change Functions
  const handleInitiatePasswordChange = () => {
    setShowPasswordModal(true);
    setPasswordChangeStep("confirm");
    setCurrentPassword("");
    setPasswordVerificationCode("");
    setPasswordVerificationSent(false);
    setPasswordChangeError("");
    setPasswordChangeSuccess("");
  };

  const handleConfirmCurrentPassword = async () => {
    if (!currentPassword || !userProfile?.email) {
      setPasswordChangeError("Please enter your current password");
      return;
    }

    setIsConfirmingPassword(true);
    setPasswordChangeError("");

    try {
      const auth = getAuth();
      await signInWithEmailAndPassword(
        auth,
        userProfile.email,
        currentPassword
      );

      // If successful, send verification code
      const verificationCode = generateVerificationCode();
      setPasswordStoredVerificationCode(verificationCode);

      sessionStorage.setItem(
        `password_change_${userProfile.email}`,
        JSON.stringify({
          code: verificationCode,
          expiresAt: Date.now() + 30 * 60 * 1000,
          email: userProfile.email,
        })
      );

      const clientName = userProfile.firstName
        ? `${userProfile.firstName} ${userProfile.lastName || ""}`.trim()
        : "User";

      try {
        await sendVerificationEmail(
          userProfile.email,
          verificationCode,
          clientName,
          "password-reset"
        );
        setPasswordVerificationSent(true);
        setPasswordChangeSuccess("Verification code sent to your email!");
      } catch (emailError) {
        setPasswordVerificationSent(true);
        setPasswordChangeSuccess(
          "Verification code generated. Please check the console for the code."
        );
      }

      setPasswordChangeStep("verify");
    } catch (error: any) {
      if (error.code === "auth/wrong-password") {
        setPasswordChangeError("Incorrect password. Please try again.");
      } else if (error.code === "auth/too-many-requests") {
        setPasswordChangeError("Too many attempts. Please try again later.");
      } else {
        setPasswordChangeError(`Failed to verify password: ${error.message}`);
      }
    } finally {
      setIsConfirmingPassword(false);
    }
  };

  const handleVerifyPasswordCode = async () => {
    if (!passwordVerificationCode.trim()) {
      setPasswordChangeError("Please enter the verification code");
      return;
    }

    if (passwordVerificationCode.length !== 6) {
      setPasswordChangeError("Verification code must be 6 digits");
      return;
    }

    setIsVerifyingPasswordCode(true);
    setPasswordChangeError("");

    try {
      const sessionVerification = sessionStorage.getItem(
        `password_change_${userProfile?.email}`
      );
      let expectedCode = passwordStoredVerificationCode;
      let expiresAt = Date.now() + 30 * 60 * 1000;

      if (sessionVerification) {
        try {
          const parsed = JSON.parse(sessionVerification);
          if (parsed.code) expectedCode = parsed.code;
          if (parsed.expiresAt) expiresAt = parsed.expiresAt;
        } catch (e) {}
      }

      if (Date.now() > expiresAt) {
        throw new Error("Verification code has expired. Please try again.");
      }

      if (expectedCode !== passwordVerificationCode) {
        throw new Error(
          "Invalid verification code. Please check and try again."
        );
      }

      sessionStorage.removeItem(`password_change_${userProfile!.email}`);
      setPasswordStoredVerificationCode("");
      setPasswordChangeStep("reset");
      setPasswordChangeSuccess(
        "Verification successful! Click below to send password reset email."
      );
    } catch (err: any) {
      setPasswordChangeError(err.message || "Failed to verify code.");
    } finally {
      setIsVerifyingPasswordCode(false);
    }
  };

  const handleSendPasswordResetEmail = async () => {
    if (!userProfile?.email) {
      setPasswordChangeError("Email not found");
      return;
    }

    setIsSendingPasswordReset(true);
    setPasswordChangeError("");

    try {
      const auth = getAuth();
      const actionCodeSettings = {
        url: `${window.location.origin}/dashboard/admin/profile?passwordResetSuccess=true`,
        handleCodeInApp: false,
      };

      await sendPasswordResetEmail(auth, userProfile.email, actionCodeSettings);

      setPasswordChangeSuccess(
        <div className="space-y-3">
          <p className="font-medium text-green-900">
            ✅ Password Reset Email Sent!
          </p>
          <p className="text-sm">
            Check your email for the password reset link:
            <strong className="ml-1">{userProfile.email}</strong>
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

      // Reset form after 5 seconds
      setTimeout(() => {
        setShowPasswordModal(false);
        resetPasswordChangeFlow();
      }, 5000);
    } catch (err: any) {
      switch (err.code) {
        case "auth/user-not-found":
          setPasswordChangeError(
            "No authentication account found with this email."
          );
          break;
        case "auth/invalid-email":
          setPasswordChangeError("Invalid email address format.");
          break;
        case "auth/too-many-requests":
          setPasswordChangeError(
            "Too many requests. Please wait a few minutes."
          );
          break;
        case "auth/operation-not-allowed":
          setPasswordChangeError(
            <div className="space-y-3">
              <p className="font-medium">Email Service Configuration Issue</p>
              <p className="text-sm">
                Password reset emails are not properly configured in Firebase.
              </p>
              <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
                <p className="text-sm text-yellow-700 font-medium mb-1">
                  Action Required:
                </p>
                <ol className="text-sm text-yellow-700 list-decimal pl-4 space-y-1">
                  <li>Go to Firebase Console → Authentication → Templates</li>
                  <li>
                    Make sure SMTP settings are <strong>disabled</strong>{" "}
                    (unchecked)
                  </li>
                  <li>Save the changes</li>
                  <li>Try sending the reset email again</li>
                </ol>
                <div className="flex space-x-2 mt-3">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      window.open(
                        "https://console.firebase.google.com/project/_/authentication/emails",
                        "_blank"
                      );
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Open Firebase Console
                  </Button>
                </div>
              </div>
            </div>
          );
          break;
        default:
          setPasswordChangeError(`Failed to send reset email: ${err.message}`);
      }
    } finally {
      setIsSendingPasswordReset(false);
    }
  };

  const resetPasswordChangeFlow = () => {
    setPasswordChangeStep("confirm");
    setCurrentPassword("");
    setPasswordVerificationCode("");
    setPasswordVerificationSent(false);
    setPasswordChangeError("");
    setPasswordChangeSuccess("");
    setShowPasswordModal(false);
  };

  // Existing functions (handleSave, handleCancel, handleEnable2FA, etc.)
  const handleSave = async () => {
    if (!userProfile?.uid) {
      setSaveError("User profile not found - no UID");
      return;
    }

    setIsSaving(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      const userDocRef = doc(db, "users", userProfile.uid);

      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        throw new Error("User document not found in database");
      }

      const currentData = userDoc.data();

      const updatedData = {
        ...currentData,
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        fullName: `${profileData.firstName} ${profileData.lastName}`,
        phone: profileData.phone,
        address: profileData.address,
        emergencyContact: profileData.emergencyContact,
        notes: profileData.notes,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(userDocRef, updatedData);

      localStorage.setItem("userFirstName", profileData.firstName);
      localStorage.setItem("userLastName", profileData.lastName);

      setSaveSuccess("Profile updated successfully!");
      setIsEditing(false);

      console.log("Profile saved to database:", updatedData);

      setUserProfile((prev) =>
        prev
          ? {
              ...prev,
              firstName: profileData.firstName,
              lastName: profileData.lastName,
              phone: profileData.phone,
              address: profileData.address,
              emergencyContact: profileData.emergencyContact,
              notes: profileData.notes,
            }
          : null
      );
    } catch (error: any) {
      setSaveError(`Failed to save profile: ${error.message}`);
      console.error("Error saving profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (userProfile) {
      setProfileData({
        firstName: userProfile.firstName || "",
        lastName: userProfile.lastName || "",
        email: userProfile.email || "",
        phone: userProfile.phone || "",
        address: userProfile.address || "",
        emergencyContact: userProfile.emergencyContact || "",
        notes: userProfile.notes || "",
      });
    }
    setIsEditing(false);
  };

  const handleEnable2FA = async () => {
    if (!userProfile?.uid) {
      setTwoFactorError("User profile not found - no UID");
      return;
    }

    setSendingVerification(true);
    setTwoFactorError("");
    setTwoFactorSuccess("");

    try {
      const verificationCode = generateVerificationCode();
      setStoredVerificationCode(verificationCode);

      sessionStorage.setItem(
        `2fa_verification_${userProfile.email}`,
        JSON.stringify({
          code: verificationCode,
          expiresAt: Date.now() + 30 * 60 * 1000,
          email: userProfile.email,
        })
      );

      const clientName = userProfile.firstName
        ? `${userProfile.firstName} ${userProfile.lastName || ""}`.trim()
        : "User";

      try {
        await sendVerificationEmail(
          userProfile.email,
          verificationCode,
          clientName,
          "2fa-verification"
        );
        setTwoFactorSuccess("Verification code sent to your email!");
      } catch (emailError) {
        setTwoFactorSuccess(
          "Verification code generated. Please check the console for the code."
        );
      }

      setShow2FAModal(true);
    } catch (error: any) {
      setTwoFactorError(
        `Failed to enable 2FA: ${error.message || "Please try again."}`
      );
    } finally {
      setSendingVerification(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!userProfile?.uid) {
      setTwoFactorError("User profile not found - no UID");
      return;
    }

    setIsVerifying2FA(true);
    setTwoFactorError("");

    try {
      const userDocRef = doc(db, "users", userProfile.uid);

      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        throw new Error("User document not found");
      }

      const currentData = userDoc.data();

      await updateDoc(userDocRef, {
        ...currentData,
        twoFactorEnabled: false,
        updatedAt: serverTimestamp(),
      });

      setIs2FAEnabled(false);
      setTwoFactorSuccess(
        "Two-factor authentication has been disabled successfully."
      );

      console.log("2FA disabled in database");

      setUserProfile((prev) =>
        prev ? { ...prev, twoFactorEnabled: false } : null
      );

      localStorage.setItem("user2FAEnabled", "false");
    } catch (error: any) {
      setTwoFactorError(
        `Failed to disable 2FA: ${error.message || "Please try again."}`
      );
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const handleVerify2FACode = async () => {
    if (!verificationCode.trim()) {
      setTwoFactorError("Please enter the verification code");
      return;
    }

    if (verificationCode.length !== 6) {
      setTwoFactorError("Verification code must be 6 digits");
      return;
    }

    setIsVerifying2FA(true);
    setTwoFactorError("");

    try {
      const sessionVerification = sessionStorage.getItem(
        `2fa_verification_${userProfile?.email}`
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

      const userDocRef = doc(db, "users", userProfile!.uid);

      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        throw new Error("User document not found");
      }

      const currentData = userDoc.data();

      await updateDoc(userDocRef, {
        ...currentData,
        twoFactorEnabled: true,
        updatedAt: serverTimestamp(),
      });

      setIs2FAEnabled(true);
      setTwoFactorSuccess(
        "Two-factor authentication has been enabled successfully!"
      );
      setShow2FAModal(false);
      setVerificationCode("");

      sessionStorage.removeItem(`2fa_verification_${userProfile!.email}`);
      setStoredVerificationCode("");

      console.log("2FA enabled in database");

      setUserProfile((prev) =>
        prev ? { ...prev, twoFactorEnabled: true } : null
      );

      localStorage.setItem("user2FAEnabled", "true");
    } catch (err: any) {
      setTwoFactorError(err.message || "Failed to verify code.");
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const get2FABadgeColor = () => {
    return is2FAEnabled
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-gray-100 text-gray-800 border-gray-200";
  };

  const get2FAButtonText = () => {
    if (sendingVerification) return "Enabling...";
    if (isVerifying2FA) return "Disabling...";
    return is2FAEnabled ? "Disable 2FA" : "Enable 2FA";
  };

  const get2FAStatusText = () => {
    return is2FAEnabled ? "Enabled" : "Disabled";
  };

  if (isLoading) {
    return (
      <AdminDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-700 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              Loading profile...
            </p>
          </div>
        </div>
      </AdminDashboardLayout>
    );
  }

  if (!userProfile) {
    return (
      <AdminDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Unable to load profile. Please try logging in again.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </AdminDashboardLayout>
    );
  }

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-playfair text-navy-900 dark:text-white">
              Admin Profile
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your personal information and preferences
            </p>
          </div>
          {!isEditing ? (
            <Button
              onClick={() => setIsEditing(true)}
              className="bg-navy-700 hover:bg-navy-800"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                className="bg-green-600 hover:bg-green-700"
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
              <Button onClick={handleCancel} variant="outline">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </div>

        {saveError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        )}

        {saveSuccess && (
          <Alert className="border-green-200 bg-green-50">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {saveSuccess}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="text-center">
                <div className="w-24 h-24 bg-navy-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <User className="h-12 w-12 text-white" />
                </div>
                <CardTitle className="text-xl font-playfair">
                  {profileData.firstName} {profileData.lastName}
                </CardTitle>
                <CardDescription className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span className="text-sm">Administrator</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">
                      {formatDate(userProfile.createdAt)}
                    </span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Mail className="h-4 w-4" />
                  <span>{profileData.email}</span>
                  {userProfile.emailVerified && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Phone className="h-4 w-4" />
                  <span>{profileData.phone || "Not set"}</span>
                </div>
                {profileData.address && (
                  <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="h-4 w-4 mt-0.5" />
                    <span>{profileData.address}</span>
                  </div>
                )}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Security Status:
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${get2FABadgeColor()} border`}
                    >
                      {get2FAStatusText()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-600 dark:text-gray-400">
                      User ID:
                    </span>
                    <span className="font-mono text-xs">
                      {userProfile.uid
                        ? userProfile.uid.substring(0, 8) + "..."
                        : "N/A"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your personal details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={profileData.firstName}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          firstName: e.target.value,
                        })
                      }
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={profileData.lastName}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          lastName: e.target.value,
                        })
                      }
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) =>
                      setProfileData({ ...profileData, email: e.target.value })
                    }
                    disabled={true}
                  />
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-600">Email Status:</span>
                    {userProfile.emailVerified ? (
                      <span className="flex items-center gap-1 text-sm text-green-600">
                        <CheckCircle className="h-3 w-3" />
                        Verified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-sm text-red-600">
                        <XCircle className="h-3 w-3" />
                        Not Verified
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) =>
                      setProfileData({ ...profileData, phone: e.target.value })
                    }
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={profileData.address}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        address: e.target.value,
                      })
                    }
                    disabled={!isEditing}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>
              Manage your account preferences and security
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Account Role</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your current account role
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  Administrator
                </span>
              </div>
            </div>

            {/* Change Password Section - UPDATED */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Change Password</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Update your account password
                </p>
              </div>
              <Button variant="outline" onClick={handleInitiatePasswordChange}>
                <Lock className="h-4 w-4 mr-2" />
                Change Password
              </Button>
            </div>

            {/* 2FA Section */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-medium">Two-Factor Authentication</h4>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${get2FABadgeColor()} border`}
                  >
                    {get2FAStatusText()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {is2FAEnabled
                    ? "Adds an extra layer of security to your account"
                    : "Add an extra layer of security to your account"}
                </p>
              </div>
              {is2FAEnabled ? (
                <Button
                  onClick={handleDisable2FA}
                  variant="outline"
                  disabled={isVerifying2FA}
                  className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200 hover:border-red-300"
                >
                  {isVerifying2FA ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ShieldOff className="h-4 w-4 mr-2" />
                  )}
                  {get2FAButtonText()}
                </Button>
              ) : (
                <Button
                  onClick={handleEnable2FA}
                  variant="outline"
                  disabled={sendingVerification}
                  className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200 hover:border-green-300"
                >
                  {sendingVerification ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4 mr-2" />
                  )}
                  {get2FAButtonText()}
                </Button>
              )}
            </div>

            {twoFactorError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{twoFactorError}</AlertDescription>
              </Alert>
            )}

            {twoFactorSuccess && (
              <Alert className="mb-4 border-green-200 bg-green-50">
                <AlertCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {twoFactorSuccess}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-xl">
                {passwordChangeStep === "confirm"
                  ? "Confirm Current Password"
                  : passwordChangeStep === "verify"
                  ? "Verify Identity"
                  : "Reset Password"}
              </CardTitle>
              <CardDescription>
                {passwordChangeStep === "confirm"
                  ? "Enter your current password to proceed"
                  : passwordChangeStep === "verify"
                  ? "Enter the verification code sent to your email"
                  : "Send password reset link to your email"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {passwordChangeError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{passwordChangeError}</AlertDescription>
                </Alert>
              )}

              {passwordChangeSuccess && (
                <Alert className="mb-4 border-green-200 bg-green-50">
                  <AlertCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    {passwordChangeSuccess}
                  </AlertDescription>
                </Alert>
              )}

              {passwordChangeStep === "confirm" && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter your current password"
                        required
                        autoFocus
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                        onClick={() =>
                          setShowCurrentPassword(!showCurrentPassword)
                        }
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      onClick={handleConfirmCurrentPassword}
                      disabled={isConfirmingPassword || !currentPassword}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {isConfirmingPassword ? (
                        <span className="flex items-center justify-center">
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Verifying...
                        </span>
                      ) : (
                        "Verify Password"
                      )}
                    </Button>
                    <Button
                      onClick={resetPasswordChangeFlow}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {passwordChangeStep === "verify" && (
                <div className="space-y-4">
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">
                      Verification Code Sent
                    </h3>
                    <p className="text-sm text-blue-700 mb-2">
                      A 6-digit verification code has been sent to:
                    </p>
                    <p className="font-medium text-blue-900">
                      {userProfile.email}
                    </p>
                    {passwordVerificationSent && (
                      <div className="mt-3 p-2 bg-green-100 rounded">
                        <div className="flex items-center justify-center">
                          <Key className="h-4 w-4 text-green-600 mr-2" />
                          <span className="text-sm text-green-700">
                            Verification code sent! Check your email.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="password-verification-code">
                      Enter Verification Code *
                    </Label>
                    <Input
                      id="password-verification-code"
                      type="text"
                      value={passwordVerificationCode}
                      onChange={(e) => {
                        const value = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 6);
                        setPasswordVerificationCode(value);
                        setPasswordChangeError("");
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
                      onClick={handleVerifyPasswordCode}
                      disabled={
                        isVerifyingPasswordCode ||
                        passwordVerificationCode.length !== 6
                      }
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {isVerifyingPasswordCode ? (
                        <span className="flex items-center justify-center">
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Verifying...
                        </span>
                      ) : (
                        "Verify Code"
                      )}
                    </Button>
                    <Button
                      onClick={() => setPasswordChangeStep("confirm")}
                      variant="outline"
                      className="flex-1"
                    >
                      Back
                    </Button>
                  </div>
                </div>
              )}

              {passwordChangeStep === "reset" && (
                <div className="space-y-4">
                  <div className="mb-4 p-4 bg-green-50 rounded-lg">
                    <h3 className="font-semibold text-green-900 mb-2">
                      Identity Verified Successfully!
                    </h3>
                    <p className="text-sm text-green-700 mb-2">
                      Click the button below to send Firebase's password reset
                      email.
                    </p>
                    <p className="text-sm text-gray-600">
                      A secure password reset link will be sent to:
                      <span className="font-medium"> {userProfile.email}</span>
                    </p>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      onClick={handleSendPasswordResetEmail}
                      disabled={isSendingPasswordReset}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {isSendingPasswordReset ? (
                        <span className="flex items-center justify-center">
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </span>
                      ) : (
                        "Send Password Reset Email"
                      )}
                    </Button>
                    <Button
                      onClick={() => setPasswordChangeStep("verify")}
                      variant="outline"
                      className="flex-1"
                    >
                      Back
                    </Button>
                  </div>
                </div>
              )}

              <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> The verification code expires in 30
                  minutes.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2FA Modal (existing) */}
      {show2FAModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-xl">
                Enable Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Verify your identity to enable two-factor authentication
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">
                  Verification Code Sent
                </h3>
                <p className="text-sm text-blue-700 mb-2">
                  A 6-digit verification code has been sent to:
                </p>
                <p className="font-medium text-blue-900">{userProfile.email}</p>
                {twoFactorSuccess && (
                  <div className="mt-3 p-2 bg-green-100 rounded">
                    <div className="flex items-center justify-center">
                      <Key className="h-4 w-4 text-green-600 mr-2" />
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

              <div className="space-y-4 mb-6">
                <div>
                  <Label
                    htmlFor="2fa-verification-code"
                    className="text-gray-700 block mb-2"
                  >
                    Enter Verification Code *
                  </Label>
                  <Input
                    id="2fa-verification-code"
                    type="text"
                    value={verificationCode}
                    onChange={(e) => {
                      const value = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6);
                      setVerificationCode(value);
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
                    onClick={handleVerify2FACode}
                    disabled={isVerifying2FA || verificationCode.length !== 6}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {isVerifying2FA ? (
                      <span className="flex items-center justify-center">
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Verifying...
                      </span>
                    ) : (
                      "Verify & Enable 2FA"
                    )}
                  </Button>

                  <Button
                    onClick={() => {
                      setShow2FAModal(false);
                      setVerificationCode("");
                      setTwoFactorError("");
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>

              <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> The verification code expires in 30
                  minutes.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AdminDashboardLayout>
  );
}
