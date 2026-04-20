
"use client";

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
import { AlertCircle, Mail, Shield, Clock, Key } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<any>(null);
  const [cooldown, setCooldown] = useState(0);
  const [verificationCode, setVerificationCode] = useState("");

  
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError("Please enter a valid email address");
      setIsLoading(false);
      return;
    }

    
    if (cooldown > 0) {
      setError(
        `Please wait ${cooldown} seconds before requesting another code`
      );
      setIsLoading(false);
      return;
    }

    try {
      console.log("Requesting verification code for:", email);

      
      const response = await fetch("/api/auth/send-reset-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response:", text.substring(0, 200));
        throw new Error(
          `Server returned non-JSON response: ${response.status}`
        );
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      console.log("API response:", result);

      
      if (result.code) {
        setVerificationCode(result.code);
        localStorage.setItem("resetEmail", email);
      }

      setSuccess(result);
      setCooldown(60);
      setEmail("");
    } catch (err: any) {
      console.error("API error:", err);
      setError(`Failed to send verification code: ${err.message}`);
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
              Reset Your Password
            </CardTitle>
            <CardDescription className="text-gray-600">
              Enter your email to receive a verification code
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success ? (
              <div className="space-y-4">
                <Alert className="border-green-200 bg-green-50">
                  <div className="flex items-start">
                    <Mail className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
                    <div>
                      <AlertDescription className="text-green-800 font-medium mb-1">
                        {success.message}
                      </AlertDescription>
                      {success.code && (
                        <AlertDescription className="text-green-700">
                          For testing, use code: {success.code}
                        </AlertDescription>
                      )}
                    </div>
                  </div>
                </Alert>

                {/* Show verification code for testing */}
                {verificationCode && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center mb-2">
                      <Key className="h-4 w-4 text-blue-600 mr-2" />
                      <span className="text-sm font-medium text-blue-900">
                        Testing Code
                      </span>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold tracking-wider text-blue-700">
                        {verificationCode}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Copy this code for the next step
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <Button
                    onClick={() => {
                      
                      localStorage.setItem(
                        "resetEmail",
                        success.email || email
                      );
                      router.push(
                        `/auth/verify-code?email=${encodeURIComponent(
                          success.email || email
                        )}`
                      );
                    }}
                    className="w-full bg-navy-700 hover:bg-navy-800"
                  >
                    Continue to Verify Code
                  </Button>

                  <Button
                    onClick={() => {
                      setSuccess(null);
                      setVerificationCode("");
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    Enter Different Email
                  </Button>
                </div>

                {cooldown > 0 && (
                  <div className="text-center text-sm text-gray-500">
                    <Clock className="h-3 w-3 inline mr-1" />
                    Request new code in {formatTime(cooldown)}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-gray-700 mb-1 block">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    disabled={cooldown > 0}
                    className={cooldown > 0 ? "opacity-50" : ""}
                  />
                  {cooldown > 0 && (
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      Request new code in {formatTime(cooldown)}
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-navy-700 hover:bg-navy-800 h-11"
                  disabled={isLoading || cooldown > 0}
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
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
  Sending Code...
</span>
                  ) : (
                    "Send Verification Code"
                  )}
                </Button>
              </form>
            )}

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="text-center space-y-3">
                <p className="text-sm text-gray-600">
                  Remember your password?{" "}
                  <Link
                    href="/auth/login"
                    className="text-navy-700 hover:underline font-medium"
                  >
                    Back to Sign In
                  </Link>
                </p>

                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Shield className="h-4 w-4 text-blue-600 mr-2" />
                    <h4 className="font-medium text-sm text-blue-900">
                      Two-Step Verification
                    </h4>
                  </div>
                  <div className="space-y-1 text-xs text-blue-700">
                    <p>• Enter your email to receive a verification code</p>
                    <p>• Verify the code in the next step</p>
                    <p>• Create a new password after verification</p>
                  </div>
                </div>
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
    </div>
  );
}
