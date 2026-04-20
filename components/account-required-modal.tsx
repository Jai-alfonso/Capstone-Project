"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertCircle } from "lucide-react";

interface AccountRequiredModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerText?: string;
}

export function AccountRequiredModal({
  open,
  onOpenChange,
  triggerText = "Schedule Consultation",
}: AccountRequiredModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const router = useRouter();

  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  const handleCreateAccount = () => {
    setIsOpen(false);
    router.push("/auth/register");
  };

  const handleSignIn = () => {
    setIsOpen(false);
    router.push("/auth/login");
  };

  if (open !== undefined) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[400px] p-0 bg-white rounded-lg">
          <div className="p-8 text-center">
            <DialogHeader className="mb-6">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <DialogTitle className="text-xl font-serif font-bold text-gray-900">
                Account Required
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <p className="text-gray-600 leading-relaxed">
                You need to have an account to access our consultation services.
                Please create an account or sign in to continue.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  onClick={handleCreateAccount}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-full transition-all duration-300"
                >
                  Create Account
                </Button>
                <Button
                  onClick={handleSignIn}
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-full transition-all duration-300 bg-transparent"
                >
                  Sign In
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-red-600 hover:bg-red-700 text-white rounded-full px-8 py-3 text-lg font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg transform">
          {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] p-0 bg-white rounded-lg">
        <div className="p-8 text-center">
          <DialogHeader className="mb-6">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-xl font-serif font-bold text-gray-900">
              Account Required
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-gray-600 leading-relaxed">
              You need to have an account to access our consultation services.
              Please create an account or sign in to continue.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={handleCreateAccount}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-full transition-all duration-300"
              >
                Create Account
              </Button>
              <Button
                onClick={handleSignIn}
                variant="outline"
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-full transition-all duration-300 bg-transparent"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
