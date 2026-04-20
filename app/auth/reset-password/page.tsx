"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Lock, ShieldCheck } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  getAuth,
  confirmPasswordReset,
  verifyPasswordResetCode,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";

// --- Logic Component ---
function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string | JSX.Element>("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"verify" | "reset">("verify");
  const [actionCode, setActionCode] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isActivationFlow, setIsActivationFlow] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);

  useEffect(() => {
    // Correctly using searchParams hook instead of window.location
    const modeParam = searchParams.get("mode");
    const oobCode = searchParams.get("oobCode");
    const activateParam = searchParams.get("activate");

    if (modeParam === "resetPassword" && oobCode) {
      setMode("reset");
      setActionCode(oobCode);
      setIsActivationFlow(activateParam === "true");
      verifyResetLink(oobCode);
    } else {
      setMode("verify");
      setCheckingLink(false);
    }
  }, [searchParams]);

  const verifyResetLink = async (code: string) => {
    try {
      const auth = getAuth();
      const email = await verifyPasswordResetCode(auth, code);
      setUserEmail(email);
      setCheckingLink(false);
      console.log("✅ Reset link verified for email:", email);
    } catch (err: any) {
      console.error("❌ Error verifying reset link:", err);
      setError("Invalid or expired reset link. Please request a new one.");
      setCheckingLink(false);
    }
  };

  const activateUserAccount = async (email: string) => {
    try {
      console.log("🔄 Activating account for:", email);
      const normalizedEmail = email.toLowerCase().trim();
      const usersRef = collection(db, "users");
      const usersQuery = query(usersRef, where("email", "==", normalizedEmail));
      const usersSnapshot = await getDocs(usersQuery);

      if (!usersSnapshot.empty) {
        const userDoc = usersSnapshot.docs[0];
        const userDocRef = doc(db, "users", userDoc.id);
        const userData = userDoc.data();

        await updateDoc(userDocRef, {
          accountStatus: "active",
          emailVerified: true,
          updatedAt: new Date().toISOString(),
          ...(userData.authUid ? { authUid: userData.authUid } : {}),
        });

        console.log("✅ Account activated in Firestore for:", email);
        return true;
      }
      return false;
    } catch (error) {
      console.error("❌ Error activating account:", error);
      return false;
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!password) {
      setError("Please enter a new password");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const auth = getAuth();
      await confirmPasswordReset(auth, actionCode, password);
      console.log("✅ Password reset successfully for:", userEmail);

      try {
        const userCredential = await signInWithEmailAndPassword(auth, userEmail, password);
        if (!userCredential.user.emailVerified) {
          await sendEmailVerification(userCredential.user);
        }
        await signOut(auth);
      } catch (loginError) {
        console.log("ℹ️ Could not auto-login, but that's okay");
      }

      if (isActivationFlow && userEmail) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const activated = await activateUserAccount(userEmail);

        if (activated) {
          setSuccess(
            <div className="space-y-2">
              <p className="font-medium">✅ Account Activated Successfully!</p>
              <p>Your password has been set and your account is now active.</p>
              <p className="text-sm text-gray-600">The account status has been updated to "active".</p>
            </div>
          );
        } else {
          setSuccess(
            <div className="space-y-2">
              <p className="font-medium">✅ Password Reset Successfully!</p>
              <Button
                variant="outline"
                className="w-full mt-2"
                onClick={() => activateUserAccount(userEmail)}
              >
                Manually Activate Account
              </Button>
            </div>
          );
        }
      } else {
        setSuccess("✅ Password reset successfully! You can now log in with your new password.");
      }

      setTimeout(() => {
        router.push("/auth/login");
      }, 3000);
    } catch (err: any) {
      setError(`Failed to reset password: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- UI RENDERING ---

  if (checkingLink) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-gray-800 flex items-center justify-center p-4">
        <Card className="shadow-2xl w-full max-w-md">
          <CardContent className="text-center py-8">
            <div className="animate-spin h-12 w-12 border-4 border-navy-300 border-t-navy-700 rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Verifying reset link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mode === "verify") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-gray-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-serif text-navy-900">Reset Password</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Please use the reset link sent to your email.</AlertDescription>
              </Alert>
              <div className="mt-6 text-center">
                <Button onClick={() => router.push("/auth/login")} className="bg-navy-700 hover:bg-navy-800">
                  Back to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {isActivationFlow ? <ShieldCheck className="h-8 w-8 text-green-600" /> : <Lock className="h-8 w-8 text-green-600" />}
            </div>
            <CardTitle className="text-2xl font-serif text-navy-900">
              {isActivationFlow ? "Activate Your Account" : "Create New Password"}
            </CardTitle>
            {userEmail && <p className="text-sm text-gray-500 mt-1">For: <span className="font-medium">{userEmail}</span></p>}
          </CardHeader>
          <CardContent>
            {error && <Alert variant="destructive" className="mb-4"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
            {success && <Alert className="mb-4 border-green-200 bg-green-50"><CheckCircle className="h-4 w-4 text-green-600" /><AlertDescription className="text-green-800">{success}</AlertDescription></Alert>}

            {!success && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <Label htmlFor="password">{isActivationFlow ? "Set Password" : "New Password"}</Label>
                  <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input id="confirmPassword" type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full bg-navy-700 hover:bg-navy-800" disabled={isLoading}>
                  {isLoading ? "Processing..." : isActivationFlow ? "Activate Account" : "Reset Password"}
                </Button>
              </form>
            )}

            {success && (
              <div className="mt-4">
                <Button onClick={() => router.push("/auth/login")} className="w-full bg-green-600 hover:bg-green-700">Go to Login</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// --- Main Export with Suspense ---
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-navy-900 flex items-center justify-center text-white">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}