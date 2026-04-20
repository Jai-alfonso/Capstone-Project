"use client"
import { createContext, useContext, type ReactNode } from "react"
import { useAuth } from "@/hooks/useAuth"
import type { User as FirebaseUser } from "firebase/auth"
import type { User } from "@/lib/firestore"
import type { AuthResult } from "@/lib/firebase-auth"

interface AuthContextType {
  user: FirebaseUser | null
  userProfile: User | null
  loading: boolean
  mfaRequired: boolean
  mfaResolver: any
  login: (email: string, password: string) => Promise<AuthResult>
  register: (
    email: string,
    password: string,
    userProfile: {
      firstName: string
      lastName: string
      phone: string
      mfaMethod: "email" | "sms" | "authenticator"
    },
  ) => Promise<AuthResult>
  logout: () => Promise<{ success: boolean; error?: string }>
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>
  completeMFAWithSMS: (verificationCode: string) => Promise<AuthResult>
  completeMFAWithTOTP: (totpCode: string) => Promise<AuthResult>
  enrollSMSMFA: (phoneNumber: string, recaptchaVerifier: any) => Promise<any>
  enrollTOTPMFA: () => Promise<any>
  completeTOTPEnrollment: (secret: any, totpCode: string) => Promise<any>
  getMFAFactors: () => any[]
  unenrollMFA: (factorUid: string) => Promise<any>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAuth()

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export const useAuthContext = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider")
  }
  return context
}
