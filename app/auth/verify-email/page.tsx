"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  MailCheck,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  getAuth,
  applyActionCode,
  checkActionCode,
} from "firebase/auth";
import { doc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

// --- Logic Component ---
function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string | React.ReactNode>("");
  const [actionType, setActionType] = useState<"verifyEmail" | "activate">("verifyEmail");
  const [verifiedEmail, setVerifiedEmail] = useState("");

  useEffect(() => {
    const handleVerification = async () => {
      try {
        const mode = searchParams.get("mode");
        const actionCode = searchParams.get("oobCode");
        const action = searchParams.get("action");
        const email = searchParams.get("email");
        const userId = searchParams.get("userId");

        setVerifiedEmail(email || "");

        if (!actionCode) {
          setStatus("error");
          setMessage("Invalid verification link. No action code provided.");
          return;
        }

        const auth = getAuth();

        if (mode === "verifyEmail" || action === "activate") {
          console.log("🔐 Processing email verification...");

          try {
            // First check if the action code is valid
            const info = await checkActionCode(auth, actionCode);
            console.log("✅ Action code is valid for email:", info.data.email);

            // Apply the email verification code
            await applyActionCode(auth, actionCode);
            console.log("✅ Email verified successfully");

            // Handle account activation if needed
            if (action === "activate" && userId && email) {
              setActionType("activate");
              console.log("🔄 Activating account in Firestore...");

              const userDocRef = doc(db, "users", userId);
              const userDoc = await getDoc(userDocRef);

              if (userDoc.exists()) {
                const userData = userDoc.data();

                if (userData.accountStatus === "pending-verification") {
                  await updateDoc(userDocRef, {
                    accountStatus: "active",
                    emailVerified: true,
                    updatedAt: serverTimestamp(),
                  });

                  console.log("✅ Account activated in Firestore");
                  setStatus("success");
                  setMessage(
                    <div className="space-y-3">
                      <p className="font-medium text-lg">🎉 Account Activated Successfully!</p>
                      <p>Your email has been verified and your account is now active.</p>
                      <div className="bg-green-50 p-3 rounded-md border border-green-200 mt-2">
                        <p className="text-sm text-green-800">You can now log in or reset your password.</p>
                      </div>
                    </div>
                  );
                } else if (userData.accountStatus === "active") {
                  setStatus("success");
                  setMessage("Your account is already active. You can log in now.");
                } else {
                  setStatus("success");
                  setMessage("Email verified successfully. Your account status will be updated shortly.");
                }
              } else {
                setStatus("error");
                setMessage("User account not found. Please contact support.");
              }
            } else {
              setActionType("verifyEmail");
              setStatus("success");
              setMessage("Email verified successfully! You can now log in to your account.");
            }
          } catch (error: any) {
            console.error("❌ Verification error:", error);
            if (error.code === "auth/invalid-action-code") {
              setStatus("error");
              setMessage("This verification link has expired or is invalid. Please request a new one.");
            } else {
              setStatus("error");
              setMessage(`Verification failed: ${error.message}`);
            }
          }
        } else if (mode === "resetPassword") {
          router.push(`/auth/reset-password?oobCode=${actionCode}`);
          return;
        } else {
          setStatus("error");
          setMessage("Unknown action type in verification link.");
        }
      } catch (error: any) {
        console.error("❌ General verification error:", error);
        setStatus("error");
        setMessage("An unexpected error occurred. Please try again.");
      }
    };

    handleVerification();
  }, [router, searchParams]);

  const handleContinue = () => {
    const queryParams = new URLSearchParams();
    queryParams.append("verified", "true");
    if (verifiedEmail) queryParams.append("email", verifiedEmail);
    router.push(`/auth/login?${queryParams.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2">
            <div className="p-3 rounded-lg">
              <Image src="/logo.jpg" alt="Logo" width={32} height={32} className="rounded" />
            </div>
            <div className="font-bold text-2xl text-white font-serif">Delgado Law Office</div>
          </Link>
        </div>

        <Card className="shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-serif text-navy-900">
              {actionType === "activate" ? "Account Activation" : "Email Verification"}
            </CardTitle>
            <CardDescription>
              {actionType === "activate" ? "Activating your account" : "Verifying your email address"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status === "loading" && (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />
                </div>
                <h3 className="text-lg font-medium">Verifying Your Email</h3>
                <p className="text-sm text-gray-600">Please wait while we verify your email address...</p>
              </div>
            )}

            {status === "error" && (
              <div className="text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="h-10 w-10 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-red-900 mb-2">Verification Failed</h3>
                <Alert variant="destructive" className="mb-6 text-left">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{typeof message === "string" ? message : "Invalid link"}</AlertDescription>
                </Alert>
                <div className="space-y-3">
                  <Button onClick={() => router.push("/auth/login")} className="w-full bg-navy-700 hover:bg-navy-800">Go to Login</Button>
                  <Button onClick={() => router.push("/")} variant="outline" className="w-full">Return to Home</Button>
                </div>
              </div>
            )}

            {status === "success" && (
              <div className="text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  {actionType === "activate" ? <ShieldCheck className="h-10 w-10 text-green-600" /> : <MailCheck className="h-10 w-10 text-green-600" />}
                </div>
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  {actionType === "activate" ? "Account Activated!" : "Email Verified!"}
                </h3>
                <div className="mb-6">{message}</div>
                {verifiedEmail && (
                  <div className="bg-gray-50 p-3 rounded-md mb-4 text-left">
                    <p className="text-sm font-medium text-gray-700">Verified Email:</p>
                    <p className="text-gray-900 font-medium">{verifiedEmail}</p>
                  </div>
                )}
                <div className="space-y-3">
                  <Button onClick={handleContinue} className="w-full bg-navy-700 hover:bg-navy-800">
                    {actionType === "activate" ? "Continue to Login" : "Go to Login"}
                  </Button>
                  <Button onClick={() => router.push("/")} variant="outline" className="w-full">Return to Home</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// --- Main Export with Suspense ---
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-navy-900 flex items-center justify-center text-white">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 text-white animate-spin mx-auto" />
          <p>Initialising verification...</p>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}