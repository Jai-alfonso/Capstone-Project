"use client";

import { useState, useEffect } from "react";
import {
  type User as FirebaseUser,
  onAuthStateChanged,
  sendPasswordResetEmail,
  reload,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUser, type User } from "@/lib/firestore";
import { firebaseAuth, type AuthResult } from "@/lib/firebase-auth";
import { useRouter, usePathname } from "next/navigation";

export const useAuth = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaResolver, setMfaResolver] = useState<any>(null);
  const [show2FAVerification, setShow2FAVerification] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const isAdmin = (profile: User | null) => {
    return profile?.role === "admin";
  };

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

  const shouldRedirect = (
    profileRole: string,
    currentPath: string,
    profileEmailVerified: boolean
  ): boolean => {
    // Don't redirect if we're on registration pages
    if (currentPath.includes("/auth/register")) {
      console.log("[v0] On registration page, skipping redirect");
      return false;
    }

    // Don't redirect if we're already on an admin page
    if (profileRole === "admin" && currentPath.startsWith("/dashboard/admin")) {
      console.log("[v0] Already on admin page, skipping redirect");
      return false;
    }

    // Don't redirect if we're already on the correct dashboard
    const expectedPath = getDashboardPathByRole(profileRole);
    if (currentPath === expectedPath || currentPath.startsWith(expectedPath)) {
      console.log("[v0] Already on correct dashboard, skipping redirect");
      return false;
    }

    return true;
  };

  const reloadUserProfile = async () => {
    if (!user?.uid) return null;

    try {
      console.log("[v0] Reloading user profile for:", user.uid);
      const profile = await getUser(user.uid);
      if (profile) {
        setUserProfile(profile);
        localStorage.setItem("userProfile", JSON.stringify(profile));
        return profile;
      }
    } catch (error) {
      console.error("[v0] Error reloading profile:", error);
    }
    return null;
  };

  useEffect(() => {
    // REMOVED: isRegistering logic since we don't have it in the database

    if (!auth) {
      console.warn("[v0] Auth not initialized, checking localStorage");

      const storedUser = localStorage.getItem("currentUser");
      const storedProfile = localStorage.getItem("userProfile");

      if (storedUser && storedProfile) {
        const parsedUser = JSON.parse(storedUser);
        const parsedProfile = JSON.parse(storedProfile);

        setUser(parsedUser);
        setUserProfile(parsedProfile);
        setTwoFactorEnabled(parsedProfile.twoFactorEnabled || false);
        console.log(
          "[v0] User restored from localStorage, role:",
          parsedProfile.role,
          "emailVerified:",
          parsedProfile.emailVerified,
          "2FA enabled:",
          parsedProfile.twoFactorEnabled
        );
      }

      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log(
        "[v0] Auth state changed:",
        firebaseUser?.uid,
        "Firebase emailVerified:",
        firebaseUser?.emailVerified
      );
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          console.log(
            "[v0] Attempting to load user profile for:",
            firebaseUser.uid
          );

          const profile = await getUser(firebaseUser.uid);

          if (profile) {
            const finalRole = profile.role || "client";
            const updatedProfile = {
              ...profile,
              role: finalRole,
              // Use the emailVerified from Firestore (our custom verification system)
              emailVerified: profile.emailVerified,
              twoFactorEnabled: profile.twoFactorEnabled || false,
              accountStatus: profile.accountStatus || "active",
              phone: profile.phone || "",
              address: profile.address || "",
              refresh: reloadUserProfile,
            };

            setUserProfile(updatedProfile);
            setTwoFactorEnabled(updatedProfile.twoFactorEnabled || false);

            localStorage.setItem("currentUser", JSON.stringify(firebaseUser));
            localStorage.setItem("userProfile", JSON.stringify(updatedProfile));

            // Check if 2FA verification is already done
            const twoFactorVerified = localStorage.getItem(
              `2fa_verified_${firebaseUser.email}`
            );

            // If 2FA is enabled but not verified, don't redirect yet
            if (updatedProfile.twoFactorEnabled && !twoFactorVerified) {
              console.log(
                "[v0] 2FA enabled but not verified yet, waiting for verification"
              );
              return;
            }

            // Only redirect if needed and if email is verified
            if (updatedProfile.emailVerified) {
              if (
                shouldRedirect(
                  finalRole,
                  pathname,
                  updatedProfile.emailVerified
                )
              ) {
                const redirectPath = getDashboardPathByRole(finalRole);
                console.log("[v0] Redirecting to:", redirectPath);
                router.push(redirectPath);
              }
            }
          } else {
            console.log(
              "[v0] No user profile found in Firestore for:",
              firebaseUser.uid
            );

            const minimalProfile: User = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              firstName: firebaseUser.displayName?.split(" ")[0] || "User",
              lastName:
                firebaseUser.displayName?.split(" ").slice(1).join(" ") || "",
              role: "client",
              phone: "",
              // Use false as default since we don't know
              emailVerified: false,
              twoFactorEnabled: false,
              accountStatus: "pending-verification",
              address: "",
              createdAt: new Date().toISOString(),
            };

            setUserProfile(minimalProfile);
            setTwoFactorEnabled(false);
            console.log("[v0] Created minimal profile");

            localStorage.setItem("currentUser", JSON.stringify(firebaseUser));
            localStorage.setItem("userProfile", JSON.stringify(minimalProfile));

            // Only redirect if needed and email is verified
            // Since minimal profile has emailVerified: false, no redirect happens
          }
        } catch (error: any) {
          console.error("[v0] Error getting user profile:", error.message);

          const storedProfile = localStorage.getItem("userProfile");
          if (storedProfile) {
            const parsedProfile = JSON.parse(storedProfile);
            setUserProfile(parsedProfile);
            setTwoFactorEnabled(parsedProfile.twoFactorEnabled || false);
            console.log(
              "[v0] Using localStorage profile with role:",
              parsedProfile.role,
              "emailVerified:",
              parsedProfile.emailVerified,
              "2FA enabled:",
              parsedProfile.twoFactorEnabled
            );

            // Check if 2FA verification is already done
            const twoFactorVerified = localStorage.getItem(
              `2fa_verified_${parsedProfile.email}`
            );

            // If 2FA is enabled but not verified, don't redirect yet
            if (parsedProfile.twoFactorEnabled && !twoFactorVerified) {
              console.log(
                "[v0] 2FA enabled but not verified yet, waiting for verification"
              );
              return;
            }

            // Only redirect if needed and email is verified
            if (
              parsedProfile.emailVerified &&
              shouldRedirect(
                parsedProfile.role,
                pathname,
                parsedProfile.emailVerified
              )
            ) {
              const redirectPath = getDashboardPathByRole(parsedProfile.role);
              router.push(redirectPath);
            }
          } else {
            const minimalProfile: User = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              firstName: firebaseUser.displayName?.split(" ")[0] || "User",
              lastName:
                firebaseUser.displayName?.split(" ").slice(1).join(" ") || "",
              role: "client",
              phone: "",
              emailVerified: false,
              twoFactorEnabled: false,
              accountStatus: "pending-verification",
              address: "",
              createdAt: new Date().toISOString(),
            };
            setUserProfile(minimalProfile);
            setTwoFactorEnabled(false);
            console.log("[v0] Created minimal profile on error");

            // No redirect since emailVerified is false
          }
        }
      } else {
        // User signed out
        setUserProfile(null);
        setMfaRequired(false);
        setMfaResolver(null);
        setTwoFactorEnabled(false);
        setShow2FAVerification(false);

        // Clear all localStorage items
        localStorage.removeItem("currentUser");
        localStorage.removeItem("userProfile");
        localStorage.removeItem("userRole");
        localStorage.removeItem("userId");
        localStorage.removeItem("userFirstName");
        localStorage.removeItem("userLastName");
        localStorage.removeItem("userEmail");

        // Clear 2FA verification flag
        if (user?.email) {
          localStorage.removeItem(`2fa_verified_${user.email}`);
        }
      }

      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [router, pathname]);

  const login = async (
    email: string,
    password: string
  ): Promise<AuthResult> => {
    try {
      console.log("[v0] Starting login for:", email);
      const result = await firebaseAuth.signIn(email, password);

      if (result.requiresMFA) {
        setMfaRequired(true);
        setMfaResolver(result.mfaResolver);
        console.log("[v0] MFA required for login");
      }

      if (result.user) {
        setUser(result.user as any);

        try {
          const profile = await getUser(result.user.uid);
          if (profile) {
            const completeProfile = {
              ...profile,
              emailVerified: profile.emailVerified, // Use Firestore value
              twoFactorEnabled: profile.twoFactorEnabled || false,
              accountStatus: profile.accountStatus || "active",
              refresh: reloadUserProfile,
            };
            setUserProfile(completeProfile);
            setTwoFactorEnabled(completeProfile.twoFactorEnabled || false);

            localStorage.setItem("currentUser", JSON.stringify(result.user));
            localStorage.setItem(
              "userProfile",
              JSON.stringify(completeProfile)
            );

            // Check email verification status
            if (!completeProfile.emailVerified) {
              console.log("[v0] Email not verified after login");
              return {
                user: result.user,
                requiresVerification: true,
                message: "Please verify your email to access the dashboard.",
              };
            }

            // Check if 2FA is enabled
            if (completeProfile.twoFactorEnabled) {
              console.log("[v0] 2FA is enabled for this user");
              setShow2FAVerification(true);
              return { user: result.user, requires2FA: true };
            } else {
              // 2FA not enabled, redirect only if needed
              const redirectPath = getDashboardPathByRole(completeProfile.role);
              if (
                shouldRedirect(
                  completeProfile.role,
                  pathname,
                  completeProfile.emailVerified
                )
              ) {
                console.log("[v0] Redirecting to:", redirectPath);
                router.push(redirectPath);
              }
            }
          }
        } catch (error) {
          console.error("[v0] Error loading profile after login:", error);
        }
      }

      return result;
    } catch (error: any) {
      console.error("[v0] Login error:", error.message);
      return { user: null, error: error.message };
    }
  };

  const register = async (
    email: string,
    password: string,
    userProfileData: {
      firstName: string;
      lastName: string;
      phone: string;
    }
  ): Promise<AuthResult> => {
    try {
      console.log("[v0] Starting registration for:", email);

      const role = "client";
      console.log("[v0] Assigning role:", role, "for email:", email);

      const userData = {
        firstName: userProfileData.firstName,
        lastName: userProfileData.lastName,
        phone: userProfileData.phone,
        role: role,
      };

      const result = await firebaseAuth.register(email, password, userData);
      console.log(
        "[v0] Registration completed:",
        result.user?.uid,
        "with role:",
        role
      );

      return result;
    } catch (error: any) {
      console.error("[v0] Registration error in useAuth:", error.message);
      return { user: null, error: error.message };
    }
  };

  const completeMFAWithSMS = async (
    verificationCode: string
  ): Promise<AuthResult> => {
    if (!mfaResolver) {
      return { user: null, error: "No MFA resolver available" };
    }

    try {
      const result = await firebaseAuth.completeMFAWithSMS(
        mfaResolver,
        verificationCode
      );
      if (result.user) {
        setMfaRequired(false);
        setMfaResolver(null);
      }
      return result;
    } catch (error: any) {
      return { user: null, error: error.message };
    }
  };

  const completeMFAWithTOTP = async (totpCode: string): Promise<AuthResult> => {
    if (!mfaResolver) {
      return { user: null, error: "No MFA resolver available" };
    }

    try {
      const result = await firebaseAuth.completeMFAWithTOTP(
        mfaResolver,
        totpCode
      );
      if (result.user) {
        setMfaRequired(false);
        setMfaResolver(null);
      }
      return result;
    } catch (error: any) {
      return { user: null, error: error.message };
    }
  };

  const complete2FAVerification = async (email: string): Promise<void> => {
    try {
      localStorage.setItem(`2fa_verified_${email}`, "true");
      setShow2FAVerification(false);

      const profile = userProfile;
      if (profile) {
        const redirectPath = getDashboardPathByRole(profile.role);
        console.log("[v0] 2FA verified, redirecting to:", redirectPath);
        router.push(redirectPath);
      }
    } catch (error) {
      console.error("[v0] Error completing 2FA verification:", error);
    }
  };

  const enrollSMSMFA = async (phoneNumber: string, recaptchaVerifier: any) => {
    return await firebaseAuth.enrollSMSMFA(phoneNumber, recaptchaVerifier);
  };

  const enrollTOTPMFA = async () => {
    return await firebaseAuth.enrollTOTPMFA();
  };

  const completeTOTPEnrollment = async (secret: any, totpCode: string) => {
    return await firebaseAuth.completeTOTPEnrollment(secret, totpCode);
  };

  const getMFAFactors = () => {
    return firebaseAuth.getMFAFactors();
  };

  const unenrollMFA = async (factorUid: string) => {
    return await firebaseAuth.unenrollMFA(factorUid);
  };

  const logout = async () => {
    try {
      console.log("[v0] Starting logout process");
      await firebaseAuth.signOut();

      setUser(null);
      setUserProfile(null);
      setMfaRequired(false);
      setMfaResolver(null);
      setTwoFactorEnabled(false);
      setShow2FAVerification(false);

      // Clear all localStorage items
      localStorage.removeItem("currentUser");
      localStorage.removeItem("userProfile");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userId");
      localStorage.removeItem("userFirstName");
      localStorage.removeItem("userLastName");
      localStorage.removeItem("userEmail");

      // Clear 2FA verification flag
      if (user?.email) {
        localStorage.removeItem(`2fa_verified_${user.email}`);
      }

      console.log("[v0] Logout completed successfully");
      return { success: true };
    } catch (error: any) {
      console.error("[v0] Logout error:", error.message);
      return { success: false, error: error.message };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      if (!auth) {
        return { success: false, error: "Auth not initialized" };
      }
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const updateUserRole = async (
    userId: string,
    newRole: "admin" | "client"
  ) => {
    console.log(`[v0] Updating user ${userId} role to ${newRole}`);
  };

  const forceRefreshUser = async () => {
    if (user) {
      await reload(user);
      await reloadUserProfile();
    }
  };

  return {
    user,
    userProfile,
    loading,
    mfaRequired,
    mfaResolver,
    show2FAVerification,
    twoFactorEnabled,
    isAdmin: () => isAdmin(userProfile),
    login,
    register,
    logout,
    resetPassword,
    completeMFAWithSMS,
    completeMFAWithTOTP,
    complete2FAVerification,
    enrollSMSMFA,
    enrollTOTPMFA,
    completeTOTPEnrollment,
    getMFAFactors,
    unenrollMFA,
    updateUserRole,
    forceRefreshUser,
  };
};
