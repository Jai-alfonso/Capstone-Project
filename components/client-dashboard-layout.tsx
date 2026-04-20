"use client";

import type React from "react";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home,
  Calendar,
  MessageSquare,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  Settings,
  Shield,
} from "lucide-react";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import { auth, db } from "@/lib/firebase/config";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { handleLogout, isLogoutInProgress } from "@/lib/auth-service";
import { Badge } from "@/components/ui/badge";

interface ClientDashboardLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: "Dashboard", href: "/dashboard/client", icon: Home },
  {
    name: "Appointments",
    href: "/dashboard/client/appointments",
    icon: Calendar,
  },
  { name: "Messages", href: "/dashboard/client/messages", icon: MessageSquare },
  {
    name: "Notifications",
    href: "/dashboard/client/notifications",
    icon: Bell,
  },
];

export function ClientDashboardLayout({
  children,
}: ClientDashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [userId, setUserId] = useState<string>("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [shouldHardRedirect, setShouldHardRedirect] = useState(false);

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const messagesUnsubscribeRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef(true);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const authUnsubscribeRef = useRef<(() => void) | null>(null);
  const redirectInProgressRef = useRef(false);

  const safeRedirect = (url: string) => {
    if (!isMountedRef.current || redirectInProgressRef.current) return;

    redirectInProgressRef.current = true;
    console.log("[Client Layout] Safe redirect to:", url);

    setTimeout(() => {
      if (isMountedRef.current) {
        window.location.href = url;
      }
    }, 100);
  };

  useEffect(() => {
    const checkAuth = () => {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        const storedUser = localStorage.getItem("currentUser");

        if (storedUser) {
          console.log(
            "[Client Layout] Found stale user data in localStorage, clearing..."
          );
          clearAllStorage();
        }

        console.log(
          "[Client Layout] No authenticated user, redirecting to login"
        );
        if (isMountedRef.current && !redirectInProgressRef.current) {
          safeRedirect("/auth/login");
        }
        return;
      }
    };

    checkAuth();

    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      cleanupAllListeners();
    };
  }, [router]);

  const clearAllStorage = () => {
    const itemsToRemove = [
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
      "userId",
    ];

    itemsToRemove.forEach((item) => {
      try {
        localStorage.removeItem(item);
      } catch (e) {}
    });

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith("2fa_verified_") ||
          key.startsWith("verification_") ||
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

    try {
      sessionStorage.clear();
    } catch (e) {}
  };

  const cleanupAllListeners = () => {
    if (authUnsubscribeRef.current) {
      authUnsubscribeRef.current();
      authUnsubscribeRef.current = null;
    }

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (messagesUnsubscribeRef.current) {
      messagesUnsubscribeRef.current();
      messagesUnsubscribeRef.current = null;
    }

    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    const handleAuthStateChange = async (user: any) => {
      if (!isMountedRef.current || redirectInProgressRef.current) return;

      if (isLogoutInProgress() || isLoggingOut) {
        console.log(
          "[Client Layout] Skipping auth change - logout in progress"
        );
        if (isMountedRef.current) setIsLoading(false);
        return;
      }

      if (user) {
        console.log("[Client Layout] User authenticated:", user.uid);

        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log("[Client Layout] User data from Firestore:", userData);

            const isEmailVerified = userData.emailVerified || false;
            if (isMountedRef.current) setEmailVerified(isEmailVerified);

            const userRole = userData.role?.toLowerCase() || "client";

            if (userRole !== "client") {
              console.error(
                "[Client Layout] WRONG ROLE DETECTED:",
                userData.role,
                "Redirecting to appropriate dashboard..."
              );

              clearAllStorage();

              setTimeout(() => {
                if (isMountedRef.current && !redirectInProgressRef.current) {
                  if (userRole === "admin") {
                    safeRedirect("/dashboard/admin");
                  } else if (userRole === "staff") {
                    safeRedirect("/dashboard/staff");
                  } else if (userRole === "attorney") {
                    safeRedirect("/dashboard/attorney");
                  } else if (userRole === "paralegal") {
                    safeRedirect("/dashboard/paralegal");
                  } else {
                    safeRedirect("/dashboard/client");
                  }
                }
              }, 1000);
              return;
            }

            if (isMountedRef.current) {
              setFirstName(userData.firstName || "");
              setLastName(userData.lastName || "");
              setUserEmail(userData.email || "");
              setUserId(user.uid);
            }

            localStorage.setItem("userFirstName", userData.firstName || "");
            localStorage.setItem("userLastName", userData.lastName || "");
            localStorage.setItem("userEmail", userData.email || "");
            localStorage.setItem("userRole", userRole);
            localStorage.setItem("userId", user.uid);
            localStorage.setItem("currentUser", JSON.stringify(user));
          } else {
            console.error(
              "[Client Layout] User document not found in Firestore"
            );

            handleLogoutClick();
          }
        } catch (error: any) {
          if (error.code === "permission-denied" && isLogoutInProgress()) {
            console.log(
              "[Client Layout] Permission denied during logout - ignoring"
            );
            return;
          }

          console.error("[Client Layout] Error fetching user data:", error);
          handleLogoutClick();
        }
      } else {
        console.log("[Client Layout] No user authenticated - cleaning up");

        clearAllStorage();

        if (
          (pathname.includes("/dashboard/") || pathname.includes("/client/")) &&
          !redirectInProgressRef.current
        ) {
          console.log(
            "[Client Layout] Redirecting to login from protected page"
          );
          safeRedirect("/auth/login");
        }
      }

      if (isMountedRef.current) {
        setIsLoading(false);
      }
    };

    authUnsubscribeRef.current = onAuthStateChanged(
      auth,
      handleAuthStateChange
    );

    return () => {
      if (authUnsubscribeRef.current) {
        authUnsubscribeRef.current();
        authUnsubscribeRef.current = null;
      }
    };
  }, [router, pathname, isLoggingOut]);

  useEffect(() => {
    if (isLogoutInProgress() || isLoggingOut || !userId) {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      return;
    }

    console.log(
      "[Client Layout] Setting up notifications listener for:",
      userId
    );

    const setupNotificationsListener = () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      try {
        const notificationsRef = collection(db, "notifications");

        const q = query(
          notificationsRef,
          where("userId", "==", userId),
          where("type", "==", "appointment")
        );

        const unsubscribe = onSnapshot(
          q,
          (querySnapshot) => {
            if (
              isMountedRef.current &&
              !isLogoutInProgress() &&
              !isLoggingOut
            ) {
              const unreadCount = querySnapshot.docs.filter((doc) => {
                const data = doc.data();
                return !data.read || data.read === false;
              }).length;

              console.log(
                "[Client Layout] Unread notification count:",
                unreadCount,
                "Total docs:",
                querySnapshot.docs.length
              );
              setUnreadNotificationCount(unreadCount);
            }
          },
          (error) => {
            if (
              error.code === "permission-denied" &&
              (isLogoutInProgress() || isLoggingOut)
            ) {
              console.log(
                "[Client Layout] Notifications listener permission denied during logout"
              );
              return;
            }

            if (error.code === "failed-precondition") {
              console.warn(
                "[Client Layout] Firestore index missing for notifications query. Creating simpler query..."
              );

              try {
                const simpleQ = query(
                  notificationsRef,
                  where("userId", "==", userId)
                );

                const simpleUnsubscribe = onSnapshot(simpleQ, (snapshot) => {
                  if (
                    isMountedRef.current &&
                    !isLogoutInProgress() &&
                    !isLoggingOut
                  ) {
                    const unreadCount = snapshot.docs.filter((doc) => {
                      const data = doc.data();
                      return data.type === "appointment" && data.read === false;
                    }).length;
                    console.log(
                      "[Client Layout] Simple query unread count:",
                      unreadCount
                    );
                    setUnreadNotificationCount(unreadCount);
                  }
                });

                unsubscribeRef.current = simpleUnsubscribe;
                return;
              } catch (simpleError) {
                console.error(
                  "[Client Layout] Simple query also failed:",
                  simpleError
                );
              }
            }

            console.error("Error subscribing to notifications count:", error);

            if (
              isMountedRef.current &&
              !isLogoutInProgress() &&
              !isLoggingOut
            ) {
              console.log(
                "[Client Layout] Reconnecting notifications listener..."
              );
              if (cleanupTimeoutRef.current) {
                clearTimeout(cleanupTimeoutRef.current);
              }
              cleanupTimeoutRef.current = setTimeout(
                setupNotificationsListener,
                5000
              );
            }
          }
        );

        unsubscribeRef.current = unsubscribe;
        console.log("[Client Layout] Notifications listener setup complete");
      } catch (error) {
        console.error(
          "[Client Layout] Error setting up notifications listener:",
          error
        );
      }
    };

    setupNotificationsListener();

    return () => {
      console.log("[Client Layout] Cleaning up notifications listener");
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
        cleanupTimeoutRef.current = null;
      }
    };
  }, [userId, isLoggingOut]);

  const getUnreadMessageCount = async (userId: string): Promise<number> => {
    if (!userId) return 0;

    try {
      console.log("[Client Layout] Getting unread message count for:", userId);

      const conversationsRef = collection(db, "conversations");
      const conversationsQuery = query(
        conversationsRef,
        where("clientId", "==", userId)
      );

      const conversationsSnapshot = await getDocs(conversationsQuery);
      let totalUnread = 0;

      console.log(
        `[Client Layout] Found ${conversationsSnapshot.size} conversations for user ${userId}`
      );

      for (const conversationDoc of conversationsSnapshot.docs) {
        const conversationId = conversationDoc.id;

        try {
          // messages are stored in the root `messages` collection with a
          // `conversationId` field — query that collection for this
          // conversation's messages.
          const messagesRef = collection(db, "messages");
          const mQuery = query(messagesRef, where("conversationId", "==", conversationId));
          const messagesSnapshot = await getDocs(mQuery);

          messagesSnapshot.forEach((msgDoc) => {
            const msgData = msgDoc.data();

            if (msgData.read === false && msgData.senderRole !== "client") {
              totalUnread++;
              console.log(
                `[Client Layout] Found unread message: ${msgData.text?.substring(0, 50)}...`
              );
            }
          });
        } catch (error) {
          console.error(
            `Error fetching messages for conversation ${conversationId}:`,
            error
          );
        }
      }

      console.log(`[Client Layout] Total unread messages: ${totalUnread}`);
      return totalUnread;
    } catch (error) {
      console.error(
        "[Client Layout] Error getting unread message count:",
        error
      );
      return 0;
    }
  };

  useEffect(() => {
    if (isLogoutInProgress() || isLoggingOut || !userId) {
      if (messagesUnsubscribeRef.current) {
        messagesUnsubscribeRef.current();
        messagesUnsubscribeRef.current = null;
      }
      return;
    }

    console.log("[Client Layout] Setting up messages listener for:", userId);

    const setupMessagesListener = () => {
      if (messagesUnsubscribeRef.current) {
        messagesUnsubscribeRef.current();
        messagesUnsubscribeRef.current = null;
      }

      try {
        const conversationsRef = collection(db, "conversations");

        const q = query(conversationsRef, where("clientId", "==", userId));

        const unsubscribe = onSnapshot(
          q,
          async (querySnapshot) => {
            if (!isMountedRef.current || isLogoutInProgress() || isLoggingOut) {
              return;
            }

            console.log(
              `[Client Layout] Conversations updated: ${querySnapshot.size} conversations found`
            );

            const unreadCount = await getUnreadMessageCount(userId);

            if (
              isMountedRef.current &&
              !isLogoutInProgress() &&
              !isLoggingOut
            ) {
              console.log(
                `[Client Layout] Setting unread message count to: ${unreadCount}`
              );
              setUnreadMessageCount(unreadCount);
            }
          },
          (error) => {
            if (
              error.code === "permission-denied" &&
              (isLogoutInProgress() || isLoggingOut)
            ) {
              console.log(
                "[Client Layout] Conversations listener permission denied during logout"
              );
              return;
            }

            console.error("Error subscribing to conversations:", error);

            if (
              isMountedRef.current &&
              !isLogoutInProgress() &&
              !isLoggingOut
            ) {
              console.log("[Client Layout] Reconnecting messages listener...");
              if (cleanupTimeoutRef.current) {
                clearTimeout(cleanupTimeoutRef.current);
              }
              cleanupTimeoutRef.current = setTimeout(
                setupMessagesListener,
                5000
              );
            }
          }
        );

        messagesUnsubscribeRef.current = unsubscribe;
        console.log("[Client Layout] Messages listener setup complete");

        getUnreadMessageCount(userId).then((count) => {
          if (isMountedRef.current && !isLogoutInProgress() && !isLoggingOut) {
            console.log(
              `[Client Layout] Initial unread message count: ${count}`
            );
            setUnreadMessageCount(count);
          }
        });
      } catch (error) {
        console.error(
          "[Client Layout] Error setting up messages listener:",
          error
        );
      }
    };

    setupMessagesListener();

    return () => {
      console.log("[Client Layout] Cleaning up messages listener");
      if (messagesUnsubscribeRef.current) {
        messagesUnsubscribeRef.current();
        messagesUnsubscribeRef.current = null;
      }
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
        cleanupTimeoutRef.current = null;
      }
    };
  }, [userId, isLoggingOut]);

  useEffect(() => {
    if (!userId || isLogoutInProgress() || isLoggingOut) return;

    const updateMessageCount = async () => {
      const count = await getUnreadMessageCount(userId);
      if (isMountedRef.current && !isLogoutInProgress() && !isLoggingOut) {
        setUnreadMessageCount(count);
      }
    };

    updateMessageCount();
  }, [pathname, userId, isLoggingOut]);

  // Quick visual fallback: if a cached unread count exists in localStorage
  // (set by other parts of the app or server), show it immediately while
  // Firestore listeners initialize.
  useEffect(() => {
    try {
      const cached = localStorage.getItem("unreadMessageCount");
      if (cached) {
        const n = parseInt(cached, 10);
        if (!isNaN(n) && n > 0) {
          setUnreadMessageCount(n);
          console.log("[Client Layout] Using cached unreadMessageCount:", n);
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const handleLogoutClick = async () => {
    if (isLoggingOut || !isMountedRef.current) return;

    try {
      setIsLoggingOut(true);
      setIsLoading(true);
      redirectInProgressRef.current = true;

      console.log("[Client Layout] Starting logout process...");

      cleanupAllListeners();

      clearAllStorage();

      await handleLogout(router);

      if (isMountedRef.current) {
        setFirstName("");
        setLastName("");
        setUserEmail("");
        setUserId("");
        setUnreadNotificationCount(0);
        setUnreadMessageCount(0);
        setEmailVerified(null);
      }

      console.log("[Client Layout] Logout completed");
    } catch (error) {
      console.error("[Client Layout] Logout error:", error);

      clearAllStorage();

      window.location.href = "/auth/login";
    } finally {
      if (isMountedRef.current) {
        setIsLoggingOut(false);
        setIsLoading(false);
      }
    }
  };

  const handleNotificationsClick = () => {
    router.push("/dashboard/client/notifications");
  };

  const handleMessagesClick = () => {
    router.push("/dashboard/client/messages");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-navy-700 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-navy-700 dark:text-navy-300">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (emailVerified === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-10 w-10 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Email Verification Required
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Your email address needs to be verified to access the dashboard.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  <strong>Note:</strong> Your account was created but email
                  verification is pending. Please check your email for the
                  verification code or contact support if you didn't receive it.
                </p>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={handleLogoutClick}
                  variant="outline"
                  className="flex-1"
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? "Logging out..." : "Logout"}
                </Button>
                <Button
                  onClick={() => safeRedirect("/auth/register")}
                  className="flex-1 bg-navy-700 hover:bg-navy-800"
                >
                  Register Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <nav className="bg-gradient-to-r from-navy-800 to-navy-900 dark:from-navy-900 dark:to-navy-950 backdrop-blur-xl shadow-lg border-b border-navy-700/50 dark:border-navy-800/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-6">
              <button
                onClick={() => router.push("/dashboard/client")}
                className="flex items-center group relative flex-shrink-0"
                title="Delgado Law Client"
                disabled={isLoggingOut}
              >
                <div className="transition-all duration-500 shadow-lg group-hover:shadow-xl group-hover:shadow-red-400/25 group-hover:scale-110 transform rounded-xl overflow-hidden">
                  <Image
                    src="/logo.jpg"
                    alt="Delgado Law Office Logo"
                    width={40}
                    height={40}
                    className="group-hover:rotate-12 transition-transform duration-500"
                  />
                </div>
              </button>

              <div className="hidden md:block">
                <span className="text-white font-bold text-lg">
                  Delgado Law Office
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="hidden lg:flex items-center gap-4">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        if (item.name === "Notifications") {
                          handleNotificationsClick();
                        } else if (item.name === "Messages") {
                          handleMessagesClick();
                        } else {
                          router.push(item.href);
                        }
                      }}
                      className={`relative flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 group overflow-hidden whitespace-nowrap ${
                        isActive
                          ? "bg-gradient-to-r from-red-500 to-red-600 dark:from-red-500 dark:to-red-600 text-white dark:text-white shadow-md"
                          : "text-white dark:text-white hover:bg-gradient-to-r hover:from-red-500/20 hover:to-red-600/20 dark:hover:from-red-500/20 dark:hover:to-red-600/20 hover:text-white dark:hover:text-white hover:shadow-md hover:scale-105"
                      }`}
                      disabled={isLoggingOut}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                      <div className="relative">
                        <Icon
                          className={`mr-1.5 h-4 w-4 transition-all duration-300 group-hover:scale-110`}
                        />
                        {item.name === "Notifications" &&
                          unreadNotificationCount > 0 && (
                            <Badge
                              variant="destructive"
                              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs animate-pulse"
                            >
                              {unreadNotificationCount > 9
                                ? "9+"
                                : unreadNotificationCount}
                            </Badge>
                          )}
                        {item.name === "Messages" && unreadMessageCount > 0 && (
                          <Badge
                            variant="destructive"
                            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs animate-pulse"
                          >
                            {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                          </Badge>
                        )}
                      </div>
                      <span className="relative z-10">{item.name}</span>
                    </button>
                  );
                })}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hover:bg-red-500/20 dark:hover:bg-red-500/20 transition-all duration-300 hover:scale-110 hover:shadow-lg rounded-lg"
                    title="Client Menu"
                    disabled={isLoading || isLoggingOut}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-red-400 to-red-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:shadow-red-400/25 transition-all duration-300">
                        {firstName ? (
                          <span className="text-white font-bold text-sm">
                            {firstName.charAt(0).toUpperCase()}
                          </span>
                        ) : (
                          <User className="h-4 w-4 text-white" />
                        )}
                      </div>
                      <span className="hidden sm:block text-white text-sm font-medium">
                        {firstName && lastName
                          ? `${firstName} ${lastName}`
                          : "Client"}
                      </span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 shadow-2xl"
                >
                  <DropdownMenuLabel className="text-navy-900 dark:text-navy-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-red-400 to-red-500 rounded-full flex items-center justify-center">
                        {firstName ? (
                          <span className="text-white font-bold text-xs">
                            {firstName.charAt(0).toUpperCase()}
                          </span>
                        ) : (
                          <User className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">
                          {firstName && lastName
                            ? `${firstName} ${lastName}`
                            : "Client Account"}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Role: Client
                        </div>
                        <div className="text-xs text-gray-400 truncate max-w-[200px]">
                          {userEmail}
                        </div>
                        {emailVerified !== null && (
                          <div
                            className={`text-xs mt-0.5 ${
                              emailVerified
                                ? "text-green-600"
                                : "text-yellow-600"
                            }`}
                          >
                            {emailVerified
                              ? "✓ Email Verified"
                              : "⚠ Email Not Verified"}
                          </div>
                        )}
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => router.push("/dashboard/client/profile")}
                    className="hover:bg-gradient-to-r hover:from-red-50 hover:to-red-25 dark:hover:from-red-900/20 dark:hover:to-red-800/20 transition-all duration-200 cursor-pointer rounded-lg m-1"
                    disabled={isLoggingOut}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogoutClick}
                    className="hover:bg-gradient-to-r hover:from-red-50 hover:to-red-25 dark:hover:from-red-900/20 dark:hover:to-red-800/20 transition-all duration-200 rounded-lg m-1 text-red-600 dark:text-red-400"
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-red-400 border-t-transparent rounded-full mr-2"></div>
                        Logging out...
                      </>
                    ) : (
                      <>
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                className="lg:hidden hover:bg-red-500/20 p-2 rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-lg text-white"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                disabled={isLoading || isLoggingOut}
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6 transition-transform duration-300 rotate-90" />
                ) : (
                  <Menu className="h-6 w-6 transition-transform duration-300" />
                )}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-navy-700/50 dark:border-navy-800/50 py-4 bg-navy-700/50 dark:bg-navy-800/50 backdrop-blur-xl">
              <div className="space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        if (item.name === "Notifications") {
                          handleNotificationsClick();
                        } else if (item.name === "Messages") {
                          handleMessagesClick();
                        } else {
                          router.push(item.href);
                        }
                      }}
                      className={`flex items-center w-full px-3 py-3 text-sm font-medium rounded-lg transition-all duration-300 group relative overflow-hidden ${
                        isActive
                          ? "bg-gradient-to-r from-red-500 to-red-600 dark:from-red-500 dark:to-red-600 text-white dark:text-white shadow-md"
                          : "text-white dark:text-white hover:bg-gradient-to-r hover:from-red-500/20 hover:to-red-600/20 dark:hover:from-red-500/20 dark:hover:to-red-600/20 hover:text-white dark:hover:text-white hover:shadow-md hover:scale-105"
                      }`}
                      disabled={isLoggingOut}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                      <div className="relative mr-3">
                        <Icon className="h-5 w-5 transition-all duration-300 group-hover:scale-110" />
                        {item.name === "Notifications" &&
                          unreadNotificationCount > 0 && (
                            <Badge
                              variant="destructive"
                              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs animate-pulse"
                            >
                              {unreadNotificationCount > 9
                                ? "9+"
                                : unreadNotificationCount}
                            </Badge>
                          )}
                        {item.name === "Messages" && unreadMessageCount > 0 && (
                          <Badge
                            variant="destructive"
                            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs animate-pulse"
                          >
                            {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                          </Badge>
                        )}
                      </div>
                      <span className="relative z-10">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="relative">
          {isLoggingOut ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-navy-700 dark:text-navy-300">
                  Logging out...
                </p>
              </div>
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
}
