"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { AlertCircle, Mail, Lock, Shield, Clock } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";

// --- Logic Component ---
function VerifyCodeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes in seconds
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    } else if (typeof window !== "undefined") {
      const storedEmail = localStorage.getItem("resetEmail");
      if (storedEmail) {
        setEmail(storedEmail);
      }
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [searchParams]);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) value = value.charAt(0);
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      if (nextInput) (nextInput as HTMLInputElement).focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      if (prevInput) (prevInput as HTMLInputElement).focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split("");
      const newCode = [...code];
      digits.forEach((digit, index) => {
        if (index < 6) newCode[index] = digit;
      });
      setCode(newCode);
    }
  };

  const verifyCode = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      setError("Please enter the complete 6-digit code");
      setIsLoading(false);
      return;
    }

    if (!email) {
      setError("Email not found. Please restart the process.");
      setIsLoading(false);
      return;
    }

    if (timeLeft <= 0) {
      setError("Verification code has expired. Please request a new one.");
      setIsLoading(false);
      return;
    }

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email.toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("Invalid verification code. Please try again.");
        setAttempts(attempts + 1);
        setIsLoading(false);
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      const userId = userDoc.id;

      if (userData.resetCode !== fullCode) {
        const currentAttempts = attempts + 1;
        setAttempts(currentAttempts);
        const remainingAttempts = 3 - currentAttempts;
        setError(remainingAttempts > 0 ? `Invalid code. ${remainingAttempts} attempts remaining` : "No attempts remaining");
        setIsLoading(false);
        return;
      }

      const codeExpiry = userData.resetCodeExpiry || 0;
      if (Date.now() > codeExpiry) {
        setError("Verification code has expired.");
        setIsLoading(false);
        return;
      }

      const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const tokenExpiry = Date.now() + 900000;

      await updateDoc(doc(db, "users", userId), {
        resetToken,
        resetTokenExpiry: tokenExpiry,
        resetCode: null,
        resetCodeExpiry: null,
        resetCodeAttempts: 0,
        updatedAt: new Date().toISOString(),
      });

      if (typeof window !== "undefined") {
        localStorage.setItem("resetEmail", email);
        localStorage.setItem("resetToken", resetToken);
      }

      setSuccess("✓ Code verified successfully! Redirecting...");
      setTimeout(() => {
        router.push(`/auth/change-password?email=${encodeURIComponent(email)}&token=${resetToken}`);
      }, 1500);
    } catch (err: any) {
      setError("Failed to verify code. Please try again.");
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) return;
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/auth/send-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      setSuccess("✓ New verification code sent to your email!");
      setTimeLeft(900);
      setAttempts(0);
      setCode(["", "", "", "", "", ""]);
    } catch (err: any) {
      setError("Failed to resend code.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-serif text-navy-900">Enter Verification Code</CardTitle>
            <CardDescription>Enter the 6-digit code sent to <span className="font-medium text-navy-700">{email}</span></CardDescription>
          </CardHeader>
          <CardContent>
            {error && <Alert variant="destructive" className="mb-4"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
            {success ? (
              <Alert className="mb-4 border-green-200 bg-green-50"><Mail className="h-5 w-5 text-green-600 mr-3" /><AlertDescription className="text-green-800">{success}</AlertDescription></Alert>
            ) : (
              <>
                <div className="mb-6">
                  <Label className="text-gray-700 mb-3 block text-center">6-Digit Verification Code</Label>
                  <div className="flex justify-center space-x-2" onPaste={handlePaste}>
                    {code.map((digit, index) => (
                      <Input key={index} id={`code-${index}`} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={(e) => handleCodeChange(index, e.target.value)} onKeyDown={(e) => handleKeyDown(index, e)} className="w-12 h-14 text-center text-xl font-bold" disabled={isLoading || timeLeft <= 0} />
                    ))}
                  </div>
                </div>
                <div className="mb-6 text-center text-sm text-gray-600">
                  <Clock className="h-4 w-4 inline mr-1" /> Code expires in: <span className={timeLeft < 60 ? "text-red-600 font-bold" : "text-green-600 font-bold"}>{formatTime(timeLeft)}</span>
                </div>
                <div className="space-y-3">
                  <Button onClick={verifyCode} className="w-full bg-navy-700 hover:bg-navy-800" disabled={isLoading || timeLeft <= 0 || code.join("").length !== 6}>
                    {isLoading ? "Verifying..." : "Verify Code"}
                  </Button>
                  <div className="flex space-x-2">
                    <Button onClick={handleResendCode} variant="outline" className="flex-1" disabled={timeLeft > 300}>Resend Code</Button>
                    <Button onClick={() => router.push("/auth/forgot-password")} variant="outline" className="flex-1">Change Email</Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// --- Main Export with Suspense ---
export default function VerifyCodePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-navy-900 flex items-center justify-center text-white">Loading Verification...</div>}>
      <VerifyCodeForm />
    </Suspense>
  );
}