"use client";

import type React from "react";
import Image from "next/image";
import {
  Eye,
  EyeOff,
  Mail,
  AlertCircle,
  CheckCircle,
  Loader2,
  Key,
  X,
} from "lucide-react";

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
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  });
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string>("");
  const [storedFormData, setStoredFormData] = useState<any>(null);
  const [checkingExistingName, setCheckingExistingName] = useState(false);

  const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const sendVerificationEmail = async (email: string, code: string) => {
    try {
      console.log("Sending verification code to:", email);

      const response = await fetch("/api/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: email,
          subject: "Email Verification Code - Delgado Law Office",
          message: `Your verification code is: ${code}\n\nPlease enter this code on the verification page to complete your registration.\n\nThis code will expire in 30 minutes.`,
          adminName: "Delgado Law Office",
          clientName: `${formData.firstName} ${formData.lastName}`,
          inquiryId: `verify-${Date.now()}`,
          originalMessage: `Welcome to Delgado Law Office! Please verify your email address using the code above.`,
          verificationCode: code,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send verification email");
      }

      return result;
    } catch (error) {
      console.error("Error sending verification email:", error);
      throw error;
    }
  };

  const checkIfNameExists = async (
    firstName: string,
    lastName: string,
    excludeEmail?: string
  ) => {
    try {
      setCheckingExistingName(true);

      const cleanFirstName = firstName.trim().toLowerCase();
      const cleanLastName = lastName.trim().toLowerCase();

      console.log(
        "Checking if name exists in Firebase:",
        cleanFirstName,
        cleanLastName
      );

      // Check users collection
      const usersQuery = query(
        collection(db, "users"),
        where("firstName", "==", cleanFirstName),
        where("lastName", "==", cleanLastName)
      );

      const usersSnapshot = await getDocs(usersQuery);

      if (!usersSnapshot.empty) {
        console.log("Found existing user with same name");
        return true;
      }

      // Check clients collection
      const clientsQuery = query(
        collection(db, "clients"),
        where("firstName", "==", cleanFirstName),
        where("lastName", "==", cleanLastName)
      );

      const clientsSnapshot = await getDocs(clientsQuery);

      if (!clientsSnapshot.empty) {
        console.log("Found existing client with same name");
        return true;
      }

      // Check pending registrations and clean up expired ones
      const pendingQuery = query(
        collection(db, "pendingRegistrations"),
        where("firstName", "==", cleanFirstName),
        where("lastName", "==", cleanLastName)
      );

      const pendingSnapshot = await getDocs(pendingQuery);
      const now = Date.now();

      if (!pendingSnapshot.empty) {
        // Filter out the current user's own pending registration
        const otherPendingDocs = pendingSnapshot.docs.filter(doc => {
          const data = doc.data();
          return excludeEmail ? data.email !== excludeEmail.toLowerCase() : true;
        });

        // Clean up expired registrations
        const expiredDocs: any[] = [];
        const validDocs: any[] = [];

        for (const doc of otherPendingDocs) {
          const data = doc.data();
          const expiresAt = data.expiresAt?.toMillis?.() || data.expiresAt || 0;
          
          if (expiresAt <= now) {
            expiredDocs.push(doc);
          } else if (expiresAt > now) {
            validDocs.push(doc);
          }
        }

        // Delete expired registrations
        if (expiredDocs.length > 0) {
          console.log("Cleaning up", expiredDocs.length, "expired pending registrations");
          await Promise.all(
            expiredDocs.map(doc => 
              deleteDoc(doc.ref).catch(err => 
                console.error("Error deleting expired pending registration:", err)
              )
            )
          );
        }

        // Check if there are any valid pending registrations from OTHER users
        if (validDocs.length > 0) {
          const data = validDocs[0].data();
          const expiresAt = data.expiresAt?.toMillis?.() || data.expiresAt || 0;
          console.log("Found valid pending registration with same name from different user, expires in:", expiresAt - now, "ms");
          return true;
        }
      }

      console.log("No existing name found");
      return false;
    } catch (error: any) {
      console.error("Error checking existing name:", error);
      if (error.code === "permission-denied") {
        console.warn(
          "Permission denied for name checking. Please update security rules."
        );
        return false;
      }
      return false;
    } finally {
      setCheckingExistingName(false);
    }
  };

  const checkIfEmailExists = async (email: string) => {
    try {
      const pendingRegistrationsRef = doc(
        db,
        "pendingRegistrations",
        email.toLowerCase()
      );
      const pendingSnapshot = await getDoc(pendingRegistrationsRef);

      if (pendingSnapshot.exists()) {
        const data = pendingSnapshot.data();
        const expiresAt = data.expiresAt?.toMillis?.() || data.expiresAt || 0;
        const now = Date.now();
        
        // If expired, clean up and return not exists
        if (expiresAt && now >= expiresAt) {
          console.log("Cleaning up expired pending registration for email:", email);
          try {
            await deleteDoc(pendingRegistrationsRef);
          } catch (deleteError) {
            console.error("Error deleting expired pending registration:", deleteError);
          }
          // Continue to check other sources
        } else if (expiresAt && now < expiresAt) {
          // Still valid
          return { exists: true, type: "pending" };
        }
      }
      
      const usersQuery = query(
        collection(db, "users"),
        where("email", "==", email.toLowerCase())
      );

      const usersSnapshot = await getDocs(usersQuery);
      if (!usersSnapshot.empty) {
        return { exists: true, type: "registered" };
      }

      return { exists: false, type: null };
    } catch (error: any) {
      console.error("Error checking email:", error);
      return { exists: false, type: null };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError("Please enter your full name");
      setIsLoading(false);
      return;
    }

    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError("Please enter a valid email address");
      setIsLoading(false);
      return;
    }

    if (!formData.phone.match(/^[0-9]{10}$/)) {
      setError("Phone number must be 10 digits (e.g., 9123456789)");
      setIsLoading(false);
      return;
    }

    if (!formData.address.trim()) {
      setError("Please enter your address");
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      setIsLoading(false);
      return;
    }

    const hasUpperCase = /[A-Z]/.test(formData.password);
    const hasLowerCase = /[a-z]/.test(formData.password);
    const hasNumbers = /\d/.test(formData.password);

    if (!(hasUpperCase && hasLowerCase && hasNumbers)) {
      setError(
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      );
      setIsLoading(false);
      return;
    }

    if (!formData.agreeToTerms) {
      setError("Please agree to the terms and conditions");
      setIsLoading(false);
      return;
    }

    try {
      console.log("Checking if email already exists:", formData.email);
      const emailCheck = await checkIfEmailExists(formData.email);

      if (emailCheck.exists) {
        if (emailCheck.type === "registered") {
          setError(
            "This email is already registered. Please use a different email or try signing in."
          );
        } else if (emailCheck.type === "pending") {
          setError(
            "A verification code was already sent to this email. Please check your email or wait for the code to expire."
          );
        }
        setIsLoading(false);
        return;
      }

      console.log("Checking if name already exists...");
      const nameExists = await checkIfNameExists(
        formData.firstName,
        formData.lastName,
        formData.email // Exclude current email from duplicate check
      );
      if (nameExists) {
        setError(
          "An account with this first name and last name already exists. Please use a different name."
        );
        setIsLoading(false);
        return;
      }

      const verificationCode = generateVerificationCode();
      setGeneratedCode(verificationCode);

      const tempUserId = `temp_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      setPendingUserId(tempUserId);
      setStoredFormData({ ...formData });

      const verificationData = {
        email: formData.email.toLowerCase(),
        firstName: formData.firstName.trim().toLowerCase(),
        lastName: formData.lastName.trim().toLowerCase(),
        phone: formData.phone,
        address: formData.address.trim(),
        password: formData.password,
        code: verificationCode,
        expiresAt: Date.now() + 30 * 60 * 1000,
        verified: false,
        createdAt: serverTimestamp(),
        tempUserId: tempUserId,
      };

      console.log("Saving verification data to Firestore...");
      const verificationDocRef = doc(
        db,
        "pendingRegistrations",
        formData.email.toLowerCase()
      );
      await setDoc(verificationDocRef, verificationData);
      console.log("Verification data saved");

      console.log("Sending verification email...");
      await sendVerificationEmail(formData.email, verificationCode);

      console.log("Verification email sent!");
      setShowVerificationModal(true);
      setVerificationError("");
      setVerificationSuccess(false);
      setVerificationCode("");
    } catch (err: any) {
      console.error("Registration error:", err);

      if (formData.email) {
        try {
          await deleteDoc(
            doc(db, "pendingRegistrations", formData.email.toLowerCase())
          );
        } catch (cleanupError) {
          console.error("Error cleaning up:", cleanupError);
        }
      }

      switch (err.code) {
        case "auth/email-already-in-use":
          setError(
            "This email is already registered. Please use a different email or try signing in."
          );
          break;
        case "permission-denied":
          setError(
            "Database permission denied. This might be a security rule issue. Please contact support."
          );
          break;
        default:
          if (err.message && err.message.includes("verification")) {
            setError("Failed to send verification email. Please try again.");
          } else {
            setError(
              err.message ||
                "An error occurred during registration. Please try again."
            );
          }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim() || !storedFormData) {
      setVerificationError("Please enter the verification code");
      return;
    }

    if (verificationCode.length !== 6) {
      setVerificationError("Verification code must be 6 digits");
      return;
    }

    setIsVerifying(true);
    setVerificationError("");

    try {
      console.log("Verifying code for email:", storedFormData.email);

      const verificationDocRef = doc(
        db,
        "pendingRegistrations",
        storedFormData.email.toLowerCase()
      );
      const verificationData = await getDoc(verificationDocRef);

      if (!verificationData.exists()) {
        throw new Error("Verification data not found. Please register again.");
      }

      const data = verificationData.data();
      console.log("Found verification data:", data);

      // Convert Firestore Timestamp to milliseconds
      const expiresAt = data.expiresAt?.toMillis?.() || data.expiresAt || 0;
      const now = Date.now();
      
      if (expiresAt && now > expiresAt) {
        // Cleanup expired document
        try {
          await deleteDoc(verificationDocRef);
        } catch (deleteError) {
          console.error("Error deleting expired verification:", deleteError);
        }
        throw new Error(
          "Verification code has expired. Please request a new one."
        );
      }

      if (data.code !== verificationCode) {
        throw new Error(
          "Invalid verification code. Please check and try again."
        );
      }

      console.log("Final check for duplicate name...");
      const nameExists = await checkIfNameExists(
        storedFormData.firstName,
        storedFormData.lastName,
        storedFormData.email // Exclude current email from duplicate check
      );
      if (nameExists) {
        await deleteDoc(verificationDocRef);
        throw new Error(
          "An account with this first name and last name already exists. Please use a different name."
        );
      }

      const emailCheck = await checkIfEmailExists(storedFormData.email);
      if (emailCheck.exists && emailCheck.type === "registered") {
        await deleteDoc(verificationDocRef);
        throw new Error(
          "This email is already registered. Please use a different email or try signing in."
        );
      }

      console.log("Creating Firebase Auth user...");
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        storedFormData.email,
        storedFormData.password
      );

      const user = userCredential.user;
      console.log("User created with UID:", user.uid);

      await updateProfile(user, {
        displayName: `${storedFormData.firstName} ${storedFormData.lastName}`,
      });

      const userData = {
        uid: user.uid,
        email: storedFormData.email.toLowerCase(),
        firstName: storedFormData.firstName.trim().toLowerCase(),
        lastName: storedFormData.lastName.trim().toLowerCase(),
        fullName: `${storedFormData.firstName.trim()} ${storedFormData.lastName.trim()}`,
        phone: `+63${storedFormData.phone}`,
        address: storedFormData.address.trim(),
        emailVerified: true,
        role: "client",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        accountStatus: "active",
        lastLoginAt: null,
      };

      console.log("Creating user document...");
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, userData);
      console.log("User document created");

      const clientData = {
        userId: user.uid,
        firstName: storedFormData.firstName.trim().toLowerCase(),
        lastName: storedFormData.lastName.trim().toLowerCase(),
        email: storedFormData.email.toLowerCase(),
        phone: `+63${storedFormData.phone}`,
        address: storedFormData.address.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: "active",
        registrationDate: new Date().toISOString(),
      };

      console.log("Creating client document...");
      const clientDocRef = doc(db, "clients", user.uid);
      await setDoc(clientDocRef, clientData);
      console.log("Client document created");

      await deleteDoc(verificationDocRef);

      console.log("Registration completed successfully!");
      setVerificationSuccess(true);

      setTimeout(() => {
        setShowVerificationModal(false);
        router.push("/auth/login?registered=true");
      }, 3000);
    } catch (err: any) {
      console.error("Verification error:", err);
      if (err.code === "auth/email-already-in-use") {
        try {
          const verificationDocRef = doc(
            db,
            "pendingRegistrations",
            storedFormData.email.toLowerCase()
          );
          await deleteDoc(verificationDocRef);
        } catch (cleanupError) {
          console.error("Error cleaning up:", cleanupError);
        }

        setVerificationError(
          "This email is already registered. Please use a different email or try signing in."
        );
      } else if (err.code === "permission-denied") {
        setVerificationError(
          "Database permission denied. Please contact support."
        );
      } else {
        setVerificationError(
          err.message || "Failed to verify code. Please try again."
        );
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!storedFormData) return;

    try {
      setIsVerifying(true);
      setVerificationError("");

      const newCode = generateVerificationCode();
      setGeneratedCode(newCode);

      const verificationDocRef = doc(
        db,
        "pendingRegistrations",
        storedFormData.email.toLowerCase()
      );
      const currentData = await getDoc(verificationDocRef);

      if (!currentData.exists()) {
        throw new Error("Verification data not found. Please register again.");
      }

      await updateDoc(verificationDocRef, {
        code: newCode,
        expiresAt: Date.now() + 30 * 60 * 1000,
        updatedAt: new Date().toISOString(),
      });

      await sendVerificationEmail(storedFormData.email, newCode);

      setVerificationError("");
      setVerificationSuccess(false);
    } catch (error: any) {
      console.error("Error resending code:", error);
      setVerificationError("Failed to resend code. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCloseVerification = () => {
    if (!verificationSuccess) {
      if (
        confirm(
          "Are you sure you want to cancel registration? Your verification code will expire."
        )
      ) {
        setShowVerificationModal(false);
        if (storedFormData?.email) {
          deleteDoc(
            doc(db, "pendingRegistrations", storedFormData.email.toLowerCase())
          ).catch((err) => console.error("Error cleaning up:", err));
        }
        setStoredFormData(null);
        setPendingUserId(null);
      }
    } else {
      setShowVerificationModal(false);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      console.log("Auth state changed:", user?.uid);
    });
    return () => unsubscribe();
  }, []);

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

        <Card className="shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-serif text-navy-900">
              Create Account
            </CardTitle>
            <CardDescription className="text-gray-600">
              Register for access to our secure legal services portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className="text-gray-700">
                    First Name *
                  </Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    placeholder="John"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-gray-700">
                    Last Name *
                  </Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    placeholder="Doe"
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              {checkingExistingName && (
                <div className="p-2 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-700 flex items-center">
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                    Checking if name already exists...
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="email" className="text-gray-700">
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="john.doe@example.com"
                  required
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  A verification code will be sent to this address
                </p>
              </div>

              <div>
                <Label htmlFor="phone" className="text-gray-700">
                  Phone Number *
                </Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                    +63
                  </span>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                      })
                    }
                    placeholder="9123456789"
                    className="pl-12"
                    maxLength={10}
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Enter 10 digits without spaces (e.g., 9123456789)
                </p>
              </div>

              <div>
                <Label htmlFor="address" className="text-gray-700">
                  Address *
                </Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Enter your complete address"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-gray-700">
                  Password *
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="Create a strong password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-gray-500">
                    Password must contain:
                  </p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    <li
                      className={`flex items-center ${
                        formData.password.length >= 8 ? "text-green-600" : ""
                      }`}
                    >
                      • At least 8 characters
                    </li>
                    <li
                      className={`flex items-center ${
                        /[A-Z]/.test(formData.password) ? "text-green-600" : ""
                      }`}
                    >
                      • One uppercase letter
                    </li>
                    <li
                      className={`flex items-center ${
                        /[a-z]/.test(formData.password) ? "text-green-600" : ""
                      }`}
                    >
                      • One lowercase letter
                    </li>
                    <li
                      className={`flex items-center ${
                        /\d/.test(formData.password) ? "text-green-600" : ""
                      }`}
                    >
                      • One number
                    </li>
                  </ul>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-gray-700">
                  Confirm Password *
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                    placeholder="Confirm your password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {formData.confirmPassword &&
                  formData.password !== formData.confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">
                      Passwords do not match
                    </p>
                  )}
              </div>

              <div className="flex items-start space-x-3 pt-2">
                <Checkbox
                  id="terms"
                  checked={formData.agreeToTerms}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      agreeToTerms: checked as boolean,
                    })
                  }
                  className="mt-1"
                />
                <Label
                  htmlFor="terms"
                  className="text-sm text-gray-600 leading-5"
                >
                  I agree to the{" "}
                  <Link
                    href="/terms"
                    className="text-navy-700 hover:underline font-medium"
                  >
                    Terms and Conditions
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    className="text-navy-700 hover:underline font-medium"
                  >
                    Privacy Policy
                  </Link>
                </Label>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Key className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Email Verification Required
                    </p>
                    <p className="text-xs text-blue-700">
                      A 6-digit verification code will be sent to your email.
                      You must enter this code to complete your registration.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-navy-700 hover:bg-navy-800 rounded-full h-11 text-base font-medium"
                disabled={isLoading || checkingExistingName}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Sending Verification Code...
                  </span>
                ) : (
                  "Send Verification Code"
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{" "}
                  <Link
                    href="/auth/login"
                    className="text-navy-700 hover:underline font-medium"
                  >
                    Sign in here
                  </Link>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-gray-300 hover:text-white text-sm inline-flex items-center"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              ></path>
            </svg>
            Back to Website
          </Link>
        </div>
      </div>

      <Dialog
        open={showVerificationModal}
        onOpenChange={handleCloseVerification}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Mail className="h-5 w-5 mr-2 text-blue-600" />
                Email Verification
              </span>
              {!verificationSuccess && (
                <button
                  onClick={handleCloseVerification}
                  className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </DialogTitle>
            <DialogDescription>
              Please verify your email address to complete registration
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">
                Verification Code Sent
              </h3>
              <p className="text-sm text-blue-700 mb-2">
                We've sent a 6-digit verification code to:
              </p>
              <p className="font-medium text-blue-900">
                {storedFormData?.email || formData.email}
              </p>

              {verificationSuccess && (
                <div className="mt-3 p-2 bg-green-100 rounded">
                  <div className="flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span className="text-sm text-green-700">
                      Email verified successfully! Your account has been
                      created. Redirecting to login...
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <Label
                  htmlFor="modal-verification-code"
                  className="text-gray-700 block mb-2"
                >
                  Enter Verification Code *
                </Label>
                <Input
                  id="modal-verification-code"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setVerificationCode(value);
                    setVerificationError("");
                  }}
                  placeholder="123456"
                  className="text-center text-2xl font-mono tracking-widest"
                  maxLength={6}
                  disabled={verificationSuccess}
                />
                <p className="text-xs text-gray-500 mt-1">
                  6-digit code sent to your email
                </p>
              </div>

              {verificationError && (
                <Alert variant="destructive" className="text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{verificationError}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleVerifyCode}
                disabled={
                  isVerifying ||
                  verificationSuccess ||
                  verificationCode.length !== 6
                }
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isVerifying ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying & Creating Account...
                  </span>
                ) : verificationSuccess ? (
                  <span className="flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Account Created Successfully
                  </span>
                ) : (
                  "Verify & Create Account"
                )}
              </Button>

              <div className="text-center">
                <Button
                  onClick={handleResendCode}
                  variant="outline"
                  disabled={isVerifying || verificationSuccess}
                  className="text-sm"
                >
                  {isVerifying ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Key className="h-3 w-3 mr-1" />
                  )}
                  Resend Verification Code
                </Button>
              </div>
            </div>

            <div className="space-y-3 text-left">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-navy-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-navy-700 font-bold text-sm">1</span>
                </div>
                <p className="text-sm text-gray-600">
                  <strong>Check your email inbox</strong> (including spam/junk
                  folder)
                </p>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-navy-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-navy-700 font-bold text-sm">2</span>
                </div>
                <p className="text-sm text-gray-600">
                  <strong>Enter the 6-digit code</strong> from the email above
                </p>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-navy-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-navy-700 font-bold text-sm">3</span>
                </div>
                <p className="text-sm text-gray-600">
                  <strong>Click "Verify & Create Account"</strong> to complete
                  registration
                </p>
              </div>
            </div>

            <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> The verification code expires in 30
                minutes. Your account will only be created after successful
                verification.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
