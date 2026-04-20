import { getAuth, signOut } from "firebase/auth";
import { type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

interface ActiveListener {
  id: string;
  unsubscribe: () => void;
  component: string;
  timestamp: Date;
}

const activeListeners: ActiveListener[] = [];
let isLoggingOut = false;

export const setLogoutFlag = (flag: boolean) => {
  isLoggingOut = flag;
};

export const isLogoutInProgress = (): boolean => {
  return isLoggingOut;
};

export const registerListener = (
  unsubscribe: () => void,
  component: string = "unknown"
): string => {
  if (isLoggingOut) {
    console.warn(
      `[Auth Service] Blocked listener registration from ${component} during logout`
    );
    unsubscribe();
    return "";
  }

  const listenerId = `listener_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  activeListeners.push({
    id: listenerId,
    unsubscribe,
    component,
    timestamp: new Date(),
  });

  console.log(
    `[Auth Service] Registered listener from ${component}. Total: ${activeListeners.length}`
  );
  return listenerId;
};

/**
 * Remove a specific listener from cleanup tracking
 */
export const unregisterListener = (listenerId: string) => {
  const index = activeListeners.findIndex((l) => l.id === listenerId);
  if (index > -1) {
    activeListeners.splice(index, 1);
  }
};

/**
 * Clean up all active Firestore listeners
 */
export const cleanupAllListeners = () => {
  console.log(
    `[Auth Service] Cleaning up ${activeListeners.length} active listeners`
  );

  setLogoutFlag(true);

  const listenersToCleanup = [...activeListeners];

  listenersToCleanup.forEach((listener, index) => {
    try {
      console.log(
        `[Auth Service] Cleaning up listener ${index + 1} from ${
          listener.component
        }`
      );
      listener.unsubscribe();
    } catch (error) {
      console.warn(
        `[Auth Service] Error cleaning up listener ${index + 1}:`,
        error
      );
    }
  });

  activeListeners.length = 0;

  setTimeout(() => {
    setLogoutFlag(false);
    console.log(`[Auth Service] Logout flag reset`);
  }, 1000);
};

/**
 * Enhanced logout handler with comprehensive cleanup
 */
export const handleLogout = async (router: AppRouterInstance) => {
  try {
    console.log("[Auth Service] Starting enhanced logout process...");

    setLogoutFlag(true);

    cleanupAllListeners();

    const clearStorageSafely = () => {
      const itemsToRemove = [
        "userId",
        "userFirstName",
        "userLastName",
        "userEmail",
        "userPhone",
        "userRole",
        "authToken",
        "firebaseUser",
        "currentUser",
        "userProfile",
        "hasAttemptedLogin",
      ];

      itemsToRemove.forEach((item) => {
        try {
          localStorage.removeItem(item);
        } catch (e) {}
      });

      try {
        sessionStorage.clear();
      } catch (e) {}

      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (
            key &&
            (key.startsWith("2fa_verified_") ||
              key.startsWith("verification_") ||
              key.startsWith("reset_verification_") ||
              key.startsWith("mfa_") ||
              key.includes("2fa") ||
              key.includes("verification"))
          ) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => {
          try {
            localStorage.removeItem(key);
          } catch (e) {}
        });
      } catch (e) {}
    };

    clearStorageSafely();

    const auth = getAuth();
    console.log("[Auth Service] Signing out from Firebase...");

    const signOutPromise = signOut(auth);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Sign out timeout")), 5000)
    );

    await Promise.race([signOutPromise, timeoutPromise]);

    try {
      if (auth.currentUser) {
        await auth.currentUser?.reload();
      }
    } catch (reloadError) {}

    await new Promise((resolve) => setTimeout(resolve, 300));

    console.log("[Auth Service] Redirecting to login...");

    setTimeout(() => {
      window.location.href = "/auth/login";
    }, 100);

    setTimeout(() => {
      if (
        window.location.pathname.includes("/dashboard/") ||
        window.location.pathname.includes("/client/")
      ) {
        window.location.reload();
      }
    }, 300);

    console.log("[Auth Service] Enhanced logout completed");
    return { success: true, message: "Logged out successfully" };
  } catch (error: any) {
    console.error("[Auth Service] Enhanced logout error:", error);

    try {
      cleanupAllListeners();
      localStorage.clear();
      sessionStorage.clear();
    } catch (storageError) {
      console.error(
        "[Auth Service] Error during emergency cleanup:",
        storageError
      );
    }

    setTimeout(() => {
      window.location.href = "/auth/login";
    }, 100);

    return {
      success: false,
      message: error.message || "An error occurred during logout",
    };
  }
};

export const checkAuthState = async (): Promise<boolean> => {
  if (isLogoutInProgress()) {
    console.log("[Auth Check] Skipping - logout in progress");
    return false;
  }

  try {
    const auth = getAuth();
    await auth.authStateReady();

    const user = auth.currentUser;

    if (!user) {
      const hasStaleData =
        localStorage.getItem("currentUser") ||
        localStorage.getItem("userProfile") ||
        localStorage.getItem("userRole");

      if (hasStaleData) {
        console.log("[Auth Check] Found stale data, clearing...");
        localStorage.removeItem("currentUser");
        localStorage.removeItem("userProfile");
        localStorage.removeItem("hasAttemptedLogin");
      }

      return false;
    }

    return true;
  } catch (error) {
    console.error("[Auth Check] Error checking auth state:", error);
    return false;
  }
};

export const getActiveListenerInfo = () => {
  return {
    count: activeListeners.length,
    listeners: activeListeners.map((l) => ({
      component: l.component,
      age: Date.now() - l.timestamp.getTime(),
    })),
  };
};
