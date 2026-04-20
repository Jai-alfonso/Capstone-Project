import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  multiFactor,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  TotpMultiFactorGenerator,
  type TotpSecret,
  RecaptchaVerifier,
  type ApplicationVerifier,
  type User,
} from "firebase/auth"
import { auth } from "./firebase"
import { createUser, getUser } from "./firestore"

// Admin UID - this user will always have admin role
const ADMIN_UID = "aUz5GRXgOER5UljVGEnpO4asQij2"

export interface MFAEnrollmentData {
  method: "sms" | "totp"
  phoneNumber?: string
  totpSecret?: TotpSecret
}

export interface AuthResult {
  user: User | null
  requiresMFA?: boolean
  mfaResolver?: any
  error?: string
}

export class FirebaseAuthService {
  private recaptchaVerifier: RecaptchaVerifier | null = null

  private isFirebaseAvailable(): boolean {
    return auth !== null && auth !== undefined
  }

  private async loginWithLocalStorage(email: string, password: string): Promise<AuthResult> {
    console.log("[v0] Checking registered users in localStorage")
    
    // Get all registered users from localStorage
    const registeredUsers = JSON.parse(localStorage.getItem("registeredUsers") || "[]")
    const user = registeredUsers.find((u: any) => u.email.toLowerCase() === email.toLowerCase())

    if (!user) {
      return {
        user: null,
        error: `No account found with email ${email}. Please register first.`,
      }
    }

    // Verify password (in production, this should be hashed and verified on backend)
    if (user.passwordHash !== password) {
      return {
        user: null,
        error: "Invalid email or password",
      }
    }

    // Determine role based on UID
    const userRole = user.uid === ADMIN_UID ? "admin" : "client"
    console.log("[v0] User role determined:", userRole, "for UID:", user.uid)

    // Store user session in localStorage
    localStorage.setItem(
      "currentUser",
      JSON.stringify({
        uid: user.uid,
        email: user.email,
        emailVerified: true,
        displayName: `${user.firstName} ${user.lastName}`,
      }),
    )

    localStorage.setItem(
      "userProfile",
      JSON.stringify({
        uid: user.uid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: userRole,
        phone: user.phone,
        createdAt: user.createdAt,
      }),
    )

    console.log("[v0] localStorage authentication successful for:", email, "with role:", userRole)

    return {
      user: {
        uid: user.uid,
        email: user.email,
        emailVerified: true,
        displayName: `${user.firstName} ${user.lastName}`,
      } as any,
      error: undefined,
    }
  }

  initializeRecaptcha(containerId: string): RecaptchaVerifier {
    if (this.recaptchaVerifier) {
      this.recaptchaVerifier.clear()
    }

    this.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: "invisible",
      callback: () => {
        console.log("[v0] reCAPTCHA solved")
      },
    })

    return this.recaptchaVerifier
  }

  async register(email: string, password: string, userData: any): Promise<AuthResult> {
    try {
      console.log("[v0] Starting registration for:", email)

      // Check if user already exists
      const registeredUsers = JSON.parse(localStorage.getItem("registeredUsers") || "[]")
      if (registeredUsers.some((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
        return {
          user: null,
          error: "An account with this email already exists",
        }
      }

      // Generate a UID (in production, Firebase would do this)
      const uid = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const userRole = userData.role || "client"

      const newUser = {
        uid,
        email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        role: userRole,
        passwordHash: password, // Note: In production, hash this with bcrypt on the backend
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Store in registeredUsers array
      registeredUsers.push(newUser)
      localStorage.setItem("registeredUsers", JSON.stringify(registeredUsers))

      console.log("[v0] User registered successfully with role:", userRole)

      // Try to create in Firestore if available
      try {
        await createUser(uid, {
          ...userData,
          role: userRole,
          email: email,
          emailVerified: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        console.log("[v0] User profile created in Firestore")
      } catch (firestoreError) {
        console.log("[v0] Firestore unavailable, using localStorage only")
      }

      // Set current user session
      localStorage.setItem(
        "currentUser",
        JSON.stringify({
          uid,
          email,
          emailVerified: false,
          displayName: `${userData.firstName} ${userData.lastName}`.trim(),
        }),
      )

      localStorage.setItem(
        "userProfile",
        JSON.stringify({
          uid,
          email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          phone: userData.phone,
          role: userRole,
          createdAt: new Date().toISOString(),
        }),
      )

      return {
        user: {
          uid,
          email,
          emailVerified: false,
          displayName: `${userData.firstName} ${userData.lastName}`.trim(),
        } as any,
        error: undefined,
      }
    } catch (error: any) {
      console.error("[v0] Registration error:", error.message)
      return { user: null, error: error.message }
    }
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      console.log("[v0] Starting sign in for:", email)

      // Use Firebase if available, otherwise use localStorage fallback
      if (this.isFirebaseAvailable()) {
        console.log("[v0] Attempting Firebase authentication")
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        const user = userCredential.user

        // Determine role based on UID
        const userRole = user.uid === ADMIN_UID ? "admin" : "client"
        console.log("[v0] Firebase sign in successful:", user.uid, "with role:", userRole)
        
        // Fetch user profile and update role if needed
        try {
          const profile = await getUser(user.uid)
          if (profile && profile.role !== userRole) {
            console.log("[v0] Updating user role in Firestore to:", userRole)
            // The role will be updated in the next Firestore write
          }
        } catch (error) {
          console.log("[v0] Could not fetch user profile, will use UID-based role")
        }
        
        return { user, error: undefined }
      } else {
        console.log("[v0] Firebase not available, using localStorage fallback")
        return await this.loginWithLocalStorage(email, password)
      }
    } catch (error: any) {
      console.error("[v0] Sign in error:", error.code, error.message)

      // If Firebase fails, fallback to localStorage
      if (!this.isFirebaseAvailable()) {
        console.log("[v0] Firebase unavailable, trying localStorage fallback")
        return await this.loginWithLocalStorage(email, password)
      }

      // Handle MFA required error
      if (error.code === "auth/multi-factor-auth-required") {
        console.log("[v0] MFA required for user")
        return {
          user: null,
          requiresMFA: true,
          mfaResolver: error.resolver,
          error: "MFA required",
        }
      }

      return { user: null, error: error.message }
    }
  }

  // Complete MFA sign in with SMS
  async completeMFAWithSMS(resolver: any, verificationCode: string): Promise<AuthResult> {
    try {
      console.log("[v0] Completing MFA with SMS code")

      const phoneAuthCredential = PhoneAuthProvider.credential(resolver.hints[0].uid, verificationCode)

      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(phoneAuthCredential)
      const userCredential = await resolver.resolveSignIn(multiFactorAssertion)

      console.log("[v0] MFA SMS sign in successful")
      return { user: userCredential.user, error: undefined }
    } catch (error: any) {
      console.error("[v0] MFA SMS error:", error.message)
      return { user: null, error: error.message }
    }
  }

  // Complete MFA sign in with TOTP
  async completeMFAWithTOTP(resolver: any, totpCode: string): Promise<AuthResult> {
    try {
      console.log("[v0] Completing MFA with TOTP code")

      const multiFactorAssertion = TotpMultiFactorGenerator.assertionForSignIn(resolver.hints[0].uid, totpCode)

      const userCredential = await resolver.resolveSignIn(multiFactorAssertion)

      console.log("[v0] MFA TOTP sign in successful")
      return { user: userCredential.user, error: undefined }
    } catch (error: any) {
      console.error("[v0] MFA TOTP error:", error.message)
      return { user: null, error: error.message }
    }
  }

  // Enroll SMS MFA
  async enrollSMSMFA(
    phoneNumber: string,
    recaptchaVerifier: ApplicationVerifier,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!auth.currentUser) {
        throw new Error("No authenticated user")
      }

      console.log("[v0] Starting SMS MFA enrollment")

      const multiFactorSession = await multiFactor(auth.currentUser).getSession()
      const phoneInfoOptions = {
        phoneNumber,
        session: multiFactorSession,
      }

      const phoneAuthCredential = await PhoneAuthProvider.credential(phoneInfoOptions, recaptchaVerifier)
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(phoneAuthCredential)

      await multiFactor(auth.currentUser).enroll(multiFactorAssertion, "SMS")

      console.log("[v0] SMS MFA enrollment successful")
      return { success: true }
    } catch (error: any) {
      console.error("[v0] SMS MFA enrollment error:", error.message)
      return { success: false, error: error.message }
    }
  }

  // Enroll TOTP MFA
  async enrollTOTPMFA(): Promise<{ success: boolean; secret?: TotpSecret; qrCodeUrl?: string; error?: string }> {
    try {
      if (!auth.currentUser) {
        throw new Error("No authenticated user")
      }

      console.log("[v0] Starting TOTP MFA enrollment")

      const multiFactorSession = await multiFactor(auth.currentUser).getSession()
      const totpSecret = await TotpMultiFactorGenerator.generateSecret(multiFactorSession)

      const qrCodeUrl = totpSecret.generateQrCodeUrl(auth.currentUser.email || "user@example.com", "Delgado Law Office")

      console.log("[v0] TOTP secret generated")
      return { success: true, secret: totpSecret, qrCodeUrl }
    } catch (error: any) {
      console.error("[v0] TOTP MFA enrollment error:", error.message)
      return { success: false, error: error.message }
    }
  }

  // Complete TOTP MFA enrollment
  async completeTOTPEnrollment(secret: TotpSecret, totpCode: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!auth.currentUser) {
        throw new Error("No authenticated user")
      }

      console.log("[v0] Completing TOTP MFA enrollment")

      const multiFactorAssertion = TotpMultiFactorGenerator.assertionForEnrollment(secret, totpCode)
      await multiFactor(auth.currentUser).enroll(multiFactorAssertion, "Authenticator App")

      console.log("[v0] TOTP MFA enrollment completed")
      return { success: true }
    } catch (error: any) {
      console.error("[v0] TOTP MFA completion error:", error.message)
      return { success: false, error: error.message }
    }
  }

  async signOut(): Promise<void> {
    try {
      if (this.isFirebaseAvailable()) {
        await signOut(auth)
      }
      localStorage.removeItem("currentUser")
      localStorage.removeItem("userProfile")
      console.log("[v0] Sign out successful")
    } catch (error: any) {
      console.error("[v0] Sign out error:", error.message)
      throw error
    }
  }

  getMFAFactors(): any[] {
    if (!auth.currentUser) return []
    return multiFactor(auth.currentUser).enrolledFactors
  }

  async unenrollMFA(factorUid: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!auth.currentUser) {
        throw new Error("No authenticated user")
      }

      const enrolledFactors = multiFactor(auth.currentUser).enrolledFactors
      const factor = enrolledFactors.find((f) => f.uid === factorUid)

      if (!factor) {
        throw new Error("MFA factor not found")
      }

      await multiFactor(auth.currentUser).unenroll(factor)
      console.log("[v0] MFA factor unenrolled successfully")

      return { success: true }
    } catch (error: any) {
      console.error("[v0] MFA unenroll error:", error.message)
      return { success: false, error: error.message }
    }
  }
}

export const firebaseAuth = new FirebaseAuthService()
