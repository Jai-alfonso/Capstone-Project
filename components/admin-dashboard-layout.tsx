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
  Users,
  MessageSquare,
  User,
  LogOut,
  Menu,
  X,
  BarChart3,
  Calendar,
  FileText,
  Settings,
  Mail,
  HelpCircle,
  Bell,
  Calendar as CalendarIcon,
  Clock,
  XCircle,
  Shield,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import { auth, db } from "@/lib/firebase/config";
import {
  doc,
  getDoc,
  collection,
  collectionGroup,
  query,
  where,
  onSnapshot,
  getDocs,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import {
  handleLogout,
  cleanupAllListeners,
  isLogoutInProgress,
} from "@/lib/auth-service";
import { Badge } from "@/components/ui/badge";

interface AdminDashboardLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: "Dashboard", href: "/dashboard/admin", icon: Home },
  { name: "Clients", href: "/dashboard/admin/clients", icon: Users },
  {
    name: "Appointments",
    href: "/dashboard/admin/appointments",
    icon: Calendar,
  },
  { name: "Reports", href: "/dashboard/admin/reports", icon: BarChart3 },
  { name: "Audit Logs", href: "/dashboard/admin/audit-logs", icon: FileText },
  { name: "Notifications", href: "/dashboard/admin/notifications", icon: Bell },
];

export function AdminDashboardLayout({ children }: AdminDashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [unreadInquiriesCount, setUnreadInquiriesCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);

  const authUnsubscribeRef = useRef<(() => void) | null>(null);
  const firestoreUnsubscribesRef = useRef<(() => void)[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const checkAuth = () => {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        const storedUser = localStorage.getItem("currentUser");

        if (storedUser) {
          clearAllStorage();
        }

        window.location.href = "/auth/login";
        return;
      }
    };

    checkAuth();

    return () => {
      mountedRef.current = false;
      cleanupListeners();
    };
  }, [router]);

  const cleanupListeners = () => {
    firestoreUnsubscribesRef.current.forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch (error) {
        console.error(
          "[Admin Layout] Error cleaning up Firestore listener:",
          error
        );
      }
    });
    firestoreUnsubscribesRef.current = [];

    if (authUnsubscribeRef.current) {
      authUnsubscribeRef.current();
      authUnsubscribeRef.current = null;
    }
  };

  const clearAllStorage = () => {
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

    try {
      sessionStorage.clear();
    } catch (e) {}
  };

  useEffect(() => {
    if (isLogoutInProgress()) {
      return;
    }

    const setupNotificationListeners = async () => {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        return;
      }

      try {
        console.log(
          "[Admin Layout] Setting up notification listeners for user:",
          currentUser.uid
        );

        const notificationsRef = collection(db, "notifications");
        const adminNotificationsQuery = query(
          notificationsRef,
          where("userId", "==", currentUser.uid),
          where("type", "==", "appointment")
        );

        const firestoreNotificationsUnsubscribe = onSnapshot(
          adminNotificationsQuery,
          (snapshot) => {
            if (!mountedRef.current || isLogoutInProgress()) return;

            const firestoreNotifications = snapshot.docs
              .map((doc) => {
                const data = doc.data();
                return {
                  id: `firestore_${doc.id}`,
                  ...data,
                  source: "firestore",
                };
              })
              .filter((notif) => !notif.read);

            const unreadAppointmentCount = firestoreNotifications.length;

            if (mountedRef.current) {
              console.log(
                "[Admin Layout] Unread notifications:",
                unreadAppointmentCount
              );
              setUnreadNotificationCount(unreadAppointmentCount);
            }
          },
          (error) => {
            if (error.code === "permission-denied" && isLogoutInProgress()) {
              return;
            }
            console.error(
              "[Admin Layout] Error in notifications listener:",
              error
            );
          }
        );

        const conversationsRef = collection(db, "conversations");

        const conversationsUnsubscribe = onSnapshot(
          conversationsRef,
          (snapshot) => {
            if (!mountedRef.current || isLogoutInProgress()) return;

            let totalUnreadMessages = 0;
            const conversations = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));

            conversations.forEach((conv: any) => {
              if (conv.unreadCount && conv.unreadCount > 0) {
                totalUnreadMessages += conv.unreadCount;
              }
            });

            console.log(
              "[Admin Layout] Total unread messages from conversations:",
              totalUnreadMessages
            );

            if (mountedRef.current) {
              setUnreadMessagesCount(totalUnreadMessages);
            }
          },
          (error) => {
            if (error.code === "permission-denied" && isLogoutInProgress()) {
              return;
            }
            console.error(
              "[Admin Layout] Error in conversations listener:",
              error
            );
          }
        );

        const inquiriesRef = collection(db, "inquiries");
        const inquiriesUnsubscribe = onSnapshot(
          inquiriesRef,
          (snapshot) => {
            if (!mountedRef.current || isLogoutInProgress()) return;

            let unreadCount = 0;
            snapshot.docs.forEach((doc) => {
              const data = doc.data();
              if (data.status === "unread") {
                unreadCount++;
              }
            });

            console.log("[Admin Layout] Unread inquiries:", unreadCount);

            if (mountedRef.current) {
              setUnreadInquiriesCount(unreadCount);
            }
          },
          (error) => {
            if (error.code === "permission-denied" && isLogoutInProgress()) {
              return;
            }
            console.error("[Admin Layout] Error in inquiries listener:", error);
          }
        );

        firestoreUnsubscribesRef.current.push(
          firestoreNotificationsUnsubscribe
        );
        firestoreUnsubscribesRef.current.push(inquiriesUnsubscribe);
        firestoreUnsubscribesRef.current.push(conversationsUnsubscribe);

        console.log("[Admin Layout] All listeners set up successfully");
      } catch (error) {
        console.error(
          "[Admin Layout] Error setting up notification listeners:",
          error
        );
      }
    };

    setupNotificationListeners();

    return () => {
      cleanupListeners();
    };
  }, []);

  // Additional, reliable listener: count unread messages sent by clients
  // across all conversations using a collectionGroup query. This ensures
  // the admin badge shows even if conversation docs don't store unreadCount.
  useEffect(() => {
    if (isLogoutInProgress()) return;

    try {
      // Query the root `messages` collection for unread messages (avoids
      // collectionGroup index requirements) and filter by senderRole
      // client-side.
      const messagesRef = collection(db, "messages");
      const q = query(messagesRef, where("read", "==", false));

      const unsub = onSnapshot(
        q,
        (snapshot) => {
          if (!mountedRef.current) return;

          let count = 0;
          snapshot.docs.forEach((doc) => {
            const data: any = doc.data();
            if (data?.senderRole === "client") count++;
          });

          console.log("[Admin Layout] collectionGroup unread client messages:", count);
          setUnreadMessagesCount(count);
        },
        (err) => {
          if (err.code === "permission-denied" && isLogoutInProgress()) return;
          console.error("[Admin Layout] collectionGroup messages listener error:", err);
        }
      );

      firestoreUnsubscribesRef.current.push(unsub);

      return () => {
        try {
          unsub();
        } catch (e) {}
      };
    } catch (error) {
      console.error("[Admin Layout] Error setting up collectionGroup listener:", error);
    }
  }, []);

  const handleAuthStateChange = async (user: any) => {
    if (!mountedRef.current) return;

    if (isLogoutInProgress()) {
      if (mountedRef.current) setIsLoading(false);
      return;
    }

    if (user) {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();

          const isEmailVerified = userData.emailVerified || false;
          if (mountedRef.current) setEmailVerified(isEmailVerified);

          const userRole = userData.role?.toLowerCase() || "admin";

          if (userRole !== "admin") {
            clearAllStorage();

            setTimeout(() => {
              if (mountedRef.current) {
                if (userRole === "client") {
                  window.location.href = "/dashboard/client";
                } else if (userRole === "staff") {
                  window.location.href = "/dashboard/staff";
                } else if (userRole === "attorney") {
                  window.location.href = "/dashboard/attorney";
                } else if (userRole === "paralegal") {
                  window.location.href = "/dashboard/paralegal";
                } else {
                  window.location.href = "/auth/login";
                }
              }
            }, 1000);
            return;
          }

          if (mountedRef.current) {
            setFirstName(userData.firstName || "");
            setLastName(userData.lastName || "");
            setUserEmail(userData.email || "");
          }

          localStorage.setItem("userFirstName", userData.firstName || "");
          localStorage.setItem("userLastName", userData.lastName || "");
          localStorage.setItem("userEmail", userData.email || "");
          localStorage.setItem("userRole", userRole);
          localStorage.setItem("userId", user.uid);
          localStorage.setItem("currentUser", JSON.stringify(user));
        } else {
          handleLogoutClick();
        }
      } catch (error: any) {
        console.error("[Admin Layout] Error fetching user data:", error);
        if (error.code === "permission-denied" && isLogoutInProgress()) {
          return;
        }
        handleLogoutClick();
      }
    } else {
      clearAllStorage();

      if (pathname.includes("/dashboard/") || pathname.includes("/admin/")) {
        if (mountedRef.current) {
          window.location.href = "/auth/login";
        }
      }
    }

    if (mountedRef.current) setIsLoading(false);
  };

  useEffect(() => {
    if (isLogoutInProgress()) {
      if (mountedRef.current) setIsLoading(false);
      return;
    }

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
  }, [router, pathname]);

  const handleLogoutClick = async () => {
    if (isLoggingOut || !mountedRef.current) return;

    try {
      setIsLoggingOut(true);
      setIsLoading(true);

      cleanupListeners();
      cleanupAllListeners();

      clearAllStorage();

      await handleLogout(router);

      if (mountedRef.current) {
        setFirstName("");
        setLastName("");
        setUserEmail("");
        setUnreadMessagesCount(0);
        setUnreadInquiriesCount(0);
        setNotifications([]);
        setUnreadNotificationCount(0);
        setEmailVerified(null);
      }
    } catch (error) {
      console.error("[Admin Layout] Logout error:", error);

      cleanupListeners();
      clearAllStorage();

      window.location.href = "/auth/login";
    } finally {
      if (mountedRef.current) {
        setIsLoggingOut(false);
        setIsLoading(false);
      }
    }
  };

  const totalMessagesUnread = unreadMessagesCount + unreadInquiriesCount;

  useEffect(() => {
    console.log("[Admin Layout Debug] Unread counts:", {
      messages: unreadMessagesCount,
      inquiries: unreadInquiriesCount,
      total: totalMessagesUnread,
      notifications: unreadNotificationCount,
    });
  }, [unreadMessagesCount, unreadInquiriesCount, unreadNotificationCount]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-navy-700 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-navy-700 dark:text-navy-300">
            Loading admin dashboard...
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
                Your email address needs to be verified to access the admin
                dashboard.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  <strong>Note:</strong> Admin accounts require email
                  verification. Please check your email or contact the system
                  administrator.
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
                onClick={() => router.push("/dashboard/admin")}
                className="flex items-center group relative flex-shrink-0"
                title="Delgado Law Admin"
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
              <div className="hidden lg:flex items-center gap-3">
                {navigation.map((item) => {
                  if (item.name === "Appointments") {
                    return (
                      <div key={item.name} className="flex items-center gap-3">
                        <button
                          onClick={() => router.push(item.href)}
                          className={`relative flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 group overflow-hidden whitespace-nowrap ${
                            pathname === item.href
                              ? "bg-gradient-to-r from-red-500 to-red-600 dark:from-red-500 dark:to-red-600 text-white dark:text-white shadow-md"
                              : "text-white dark:text-white hover:bg-gradient-to-r hover:from-red-500/20 hover:to-red-600/20 dark:hover:from-red-500/20 dark:hover:to-red-600/20 hover:text-white dark:hover:text-white hover:shadow-md hover:scale-105"
                          }`}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                          <item.icon
                            className={`mr-1.5 h-4 w-4 transition-all duration-300 group-hover:scale-110`}
                          />
                          <span className="relative z-10">{item.name}</span>
                        </button>

                        <DropdownMenu
                          open={messagesOpen}
                          onOpenChange={setMessagesOpen}
                        >
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className={`relative flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 group overflow-hidden whitespace-nowrap ${
                                pathname === "/dashboard/admin/inquiries" ||
                                pathname === "/dashboard/admin/messages"
                                  ? "bg-gradient-to-r from-red-500 to-red-600 dark:from-red-500 dark:to-red-600 text-white dark:text-white shadow-md"
                                  : "text-white dark:text-white hover:bg-gradient-to-r hover:from-red-500/20 hover:to-red-600/20 dark:hover:from-red-500/20 dark:hover:to-red-600/20 hover:text-white dark:hover:text-white hover:shadow-md hover:scale-105"
                              }`}
                              disabled={isLoggingOut}
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                              <div className="relative mr-1.5">
                                <MessageSquare
                                  className={`h-4 w-4 transition-all duration-300 group-hover:scale-110`}
                                />
                                {totalMessagesUnread > 0 && (
                                  <Badge
                                    variant="destructive"
                                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs animate-pulse"
                                  >
                                    {totalMessagesUnread > 9
                                      ? "9+"
                                      : totalMessagesUnread}
                                  </Badge>
                                )}
                              </div>
                              <span className="relative z-10">Messages</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="center"
                            className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 shadow-2xl min-w-[200px]"
                          >
                            <DropdownMenuLabel className="text-navy-900 dark:text-navy-100 text-xs font-medium">
                              Communication
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setMessagesOpen(false);
                                router.push("/dashboard/admin/inquiries");
                              }}
                              className={`hover:bg-gradient-to-r hover:from-red-50 hover:to-red-25 dark:hover:from-red-900/20 dark:hover:to-red-800/20 transition-all duration-200 cursor-pointer rounded-lg m-1 ${
                                pathname === "/dashboard/admin/inquiries"
                                  ? "bg-gradient-to-r from-red-50 to-red-25 dark:from-red-900/20 dark:to-red-800/20"
                                  : ""
                              }`}
                              disabled={isLoggingOut}
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center">
                                  <HelpCircle className="mr-2 h-4 w-4" />
                                  Inquiries
                                </div>
                                {unreadInquiriesCount > 0 && (
                                  <Badge
                                    variant="destructive"
                                    className="h-5 w-5 flex items-center justify-center p-0 text-xs"
                                  >
                                    {unreadInquiriesCount}
                                  </Badge>
                                )}
                              </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setMessagesOpen(false);
                                router.push("/dashboard/admin/messages");
                              }}
                              className={`hover:bg-gradient-to-r hover:from-red-50 hover:to-red-25 dark:hover:from-red-900/20 dark:hover:to-red-800/20 transition-all duration-200 cursor-pointer rounded-lg m-1 ${
                                pathname === "/dashboard/admin/messages"
                                  ? "bg-gradient-to-r from-red-50 to-red-25 dark:from-red-900/20 dark:to-red-800/20"
                                  : ""
                              }`}
                              disabled={isLoggingOut}
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center">
                                  <Mail className="mr-2 h-4 w-4" />
                                  Messages
                                </div>
                                {unreadMessagesCount > 0 && (
                                  <Badge
                                    variant="destructive"
                                    className="h-5 w-5 flex items-center justify-center p-0 text-xs"
                                  >
                                    {unreadMessagesCount}
                                  </Badge>
                                )}
                              </div>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Notifications button removed from this location - rendered to the right beside admin profile */}
                      </div>
                    );
                  }

                  if (item.name === "Notifications" || item.name === "Audit Logs") {
                    return null;
                  }

                  if (item.name === "Reports") {
                    return (
                      <DropdownMenu key={item.name}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`relative flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 group overflow-hidden whitespace-nowrap ${
                              pathname === "/dashboard/admin/reports" ||
                              pathname === "/dashboard/admin/audit-logs"
                                ? "bg-gradient-to-r from-red-500 to-red-600 dark:from-red-500 dark:to-red-600 text-white dark:text-white shadow-md"
                                : "text-white dark:text-white hover:bg-gradient-to-r hover:from-red-500/20 hover:to-red-600/20 dark:hover:from-red-500/20 dark:hover:to-red-600/20 hover:text-white dark:hover:text-white hover:shadow-md hover:scale-105"
                            }`}
                            disabled={isLoggingOut}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                            <item.icon className="mr-1.5 h-4 w-4 transition-all duration-300 group-hover:scale-110" />
                            <span className="relative z-10">Reports</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="center"
                          className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 shadow-2xl min-w-[180px]"
                        >
                          <DropdownMenuLabel className="text-navy-900 dark:text-navy-100 text-xs font-medium">
                            Records & Compliance
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => router.push("/dashboard/admin/reports")}
                            className="hover:bg-gradient-to-r hover:from-red-50 hover:to-red-25 dark:hover:from-red-900/20 dark:hover:to-red-800/20 transition-all duration-200 cursor-pointer rounded-lg m-1"
                            disabled={isLoggingOut}
                          >
                            <div className="flex items-center">
                              <BarChart3 className="mr-2 h-4 w-4" />
                              Reports
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => router.push("/dashboard/admin/audit-logs")}
                            className="hover:bg-gradient-to-r hover:from-red-50 hover:to-red-25 dark:hover:from-red-900/20 dark:hover:to-red-800/20 transition-all duration-200 cursor-pointer rounded-lg m-1"
                            disabled={isLoggingOut}
                          >
                            <div className="flex items-center">
                              <FileText className="mr-2 h-4 w-4" />
                              Audit Logs
                            </div>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    );
                  }

                  return (
                    <button
                      key={item.name}
                      onClick={() => router.push(item.href)}
                      className={`relative flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 group overflow-hidden whitespace-nowrap ${
                        pathname === item.href
                          ? "bg-gradient-to-r from-red-500 to-red-600 dark:from-red-500 dark:to-red-600 text-white dark:text-white shadow-md"
                          : "text-white dark:text-white hover:bg-gradient-to-r hover:from-red-500/20 hover:to-red-600/20 dark:hover:from-red-500/20 dark:hover:to-red-600/20 hover:text-white dark:hover:text-white hover:shadow-md hover:scale-105"
                      }`}
                      disabled={isLoggingOut}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                      <item.icon
                        className={`mr-1.5 h-4 w-4 transition-all duration-300 group-hover:scale-110`}
                      />
                      <span className="relative z-10">{item.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Notifications button beside Reports and Admin Profile */}
              <button
                onClick={() => router.push("/dashboard/admin/notifications")}
                className={`relative flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 group overflow-hidden whitespace-nowrap ${
                  pathname === "/dashboard/admin/notifications"
                    ? "bg-gradient-to-r from-red-500 to-red-600 dark:from-red-500 dark:to-red-600 text-white dark:text-white shadow-md"
                    : "text-white dark:text-white hover:bg-gradient-to-r hover:from-red-500/20 hover:to-red-600/20 dark:hover:from-red-500/20 dark:hover:to-red-600/20 hover:text-white dark:hover:text-white hover:shadow-md hover:scale-105"
                }`}
                disabled={isLoggingOut}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                <div className="relative mr-1.5">
                  <Bell className={`h-4 w-4 transition-all duration-300 group-hover:scale-110`} />
                  {unreadNotificationCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs animate-pulse"
                    >
                      {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                    </Badge>
                  )}
                </div>
                <span className="relative z-10">Notifications</span>
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hover:bg-red-500/20 dark:hover:bg-red-500/20 transition-all duration-300 hover:scale-110 hover:shadow-lg rounded-lg"
                    title="Admin Menu"
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
                          : "Admin"}
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
                            : "Admin Account"}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Role: Administrator
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
                    onClick={() => router.push("/dashboard/admin/profile")}
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
                  if (item.name === "Appointments") {
                    return (
                      <div key={item.name} className="space-y-1">
                        <button
                          onClick={() => {
                            setMobileMenuOpen(false);
                            router.push(item.href);
                          }}
                          className={`flex items-center w-full px-3 py-3 text-sm font-medium rounded-lg transition-all duration-300 group relative overflow-hidden ${
                            pathname === item.href
                              ? "bg-gradient-to-r from-red-500 to-red-600 dark:from-red-500 dark:to-red-600 text-white dark:text-white shadow-md"
                              : "text-white dark:text-white hover:bg-gradient-to-r hover:from-red-500/20 hover:to-red-600/20 dark:hover:from-red-500/20 dark:hover:to-red-600/20 hover:text-white dark:hover:text-white hover:shadow-md hover:scale-105"
                          }`}
                          disabled={isLoggingOut}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                          <item.icon className="mr-3 h-5 w-5 transition-all duration-300 group-hover:scale-110" />
                          <span className="relative z-10">{item.name}</span>
                        </button>

                        <div className="pl-4 space-y-1 border-l border-navy-600/50 ml-3">
                          <div className="text-xs text-white/70 pl-3 py-1">
                            Communication
                          </div>
                          {totalMessagesUnread > 0 && (
                            <div className="flex items-center justify-between px-3 py-2">
                              <span className="text-sm font-medium text-white">
                                Messages
                              </span>
                              <Badge
                                variant="destructive"
                                className="h-5 w-5 flex items-center justify-center p-0 text-xs"
                              >
                                {totalMessagesUnread}
                              </Badge>
                            </div>
                          )}
                          <button
                            onClick={() => {
                              setMobileMenuOpen(false);
                              router.push("/dashboard/admin/inquiries");
                            }}
                            className={`flex items-center w-full px-3 py-3 text-sm font-medium rounded-lg transition-all duration-300 group relative overflow-hidden ${
                              pathname === "/dashboard/admin/inquiries"
                                ? "bg-gradient-to-r from-red-500/80 to-red-600/80 dark:from-red-500/80 dark:to-red-600/80 text-white dark:text-white shadow-md"
                                : "text-white dark:text-white hover:bg-gradient-to-r hover:from-red-500/20 hover:to-red-600/20 dark:hover:from-red-500/20 dark:hover:to-red-600/20 hover:text-white dark:hover:text-white hover:shadow-md"
                            }`}
                            disabled={isLoggingOut}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center">
                                <HelpCircle className="mr-3 h-5 w-5 transition-all duration-300 group-hover:scale-110" />
                                <span className="relative z-10">Inquiries</span>
                              </div>
                              {unreadInquiriesCount > 0 && (
                                <Badge
                                  variant="destructive"
                                  className="h-5 w-5 flex items-center justify-center p-0 text-xs"
                                >
                                  {unreadInquiriesCount}
                                </Badge>
                              )}
                            </div>
                          </button>
                          <button
                            onClick={() => {
                              setMobileMenuOpen(false);
                              router.push("/dashboard/admin/messages");
                            }}
                            className={`flex items-center w-full px-3 py-3 text-sm font-medium rounded-lg transition-all duration-300 group relative overflow-hidden ${
                              pathname === "/dashboard/admin/messages"
                                ? "bg-gradient-to-r from-red-500/80 to-red-600/80 dark:from-red-500/80 dark:to-red-600/80 text-white dark:text-white shadow-md"
                                : "text-white dark:text-white hover:bg-gradient-to-r hover:from-red-500/20 hover:to-red-600/20 dark:hover:from-red-500/20 dark:hover:to-red-600/20 hover:text-white dark:hover:text-white hover:shadow-md"
                            }`}
                            disabled={isLoggingOut}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center">
                                <Mail className="mr-3 h-5 w-5 transition-all duration-300 group-hover:scale-110" />
                                <span className="relative z-10">Messages</span>
                              </div>
                              {unreadMessagesCount > 0 && (
                                <Badge
                                  variant="destructive"
                                  className="h-5 w-5 flex items-center justify-center p-0 text-xs"
                                >
                                  {unreadMessagesCount}
                                </Badge>
                              )}
                            </div>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (item.name === "Reports") {
                    return (
                      <div key={item.name} className="space-y-1">
                        <button
                          onClick={() => {
                            setMobileMenuOpen(false);
                            router.push(item.href);
                          }}
                          className={`flex items-center w-full px-3 py-3 text-sm font-medium rounded-lg transition-all duration-300 group relative overflow-hidden ${
                            pathname === item.href ||
                            pathname === "/dashboard/admin/audit-logs"
                              ? "bg-gradient-to-r from-red-500 to-red-600 dark:from-red-500 dark:to-red-600 text-white dark:text-white shadow-md"
                              : "text-white dark:text-white hover:bg-gradient-to-r hover:from-red-500/20 hover:to-red-600/20 dark:hover:from-red-500/20 dark:hover:to-red-600/20 hover:text-white dark:hover:text-white hover:shadow-md hover:scale-105"
                          }`}
                          disabled={isLoggingOut}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                          <item.icon className="mr-3 h-5 w-5 transition-all duration-300 group-hover:scale-110" />
                          <span className="relative z-10">{item.name}</span>
                        </button>

                        <div className="pl-4 space-y-1 border-l border-navy-600/50 ml-3">
                          <div className="text-xs text-white/70 pl-3 py-1">
                            Records & Compliance
                          </div>
                          <button
                            onClick={() => {
                              setMobileMenuOpen(false);
                              router.push("/dashboard/admin/reports");
                            }}
                            className={`flex items-center w-full px-3 py-3 text-sm font-medium rounded-lg transition-all duration-300 group relative overflow-hidden ${
                              pathname === "/dashboard/admin/reports"
                                ? "bg-gradient-to-r from-red-500/80 to-red-600/80 dark:from-red-500/80 dark:to-red-600/80 text-white dark:text-white shadow-md"
                                : "text-white dark:text-white hover:bg-gradient-to-r hover:from-red-500/20 hover:to-red-600/20 dark:hover:from-red-500/20 dark:hover:to-red-600/20 hover:text-white dark:hover:text-white hover:shadow-md"
                            }`}
                            disabled={isLoggingOut}
                          >
                            <div className="flex items-center">
                              <BarChart3 className="mr-3 h-5 w-5 transition-all duration-300 group-hover:scale-110" />
                              <span className="relative z-10">Reports</span>
                            </div>
                          </button>
                          <button
                            onClick={() => {
                              setMobileMenuOpen(false);
                              router.push("/dashboard/admin/audit-logs");
                            }}
                            className={`flex items-center w-full px-3 py-3 text-sm font-medium rounded-lg transition-all duration-300 group relative overflow-hidden ${
                              pathname === "/dashboard/admin/audit-logs"
                                ? "bg-gradient-to-r from-red-500/80 to-red-600/80 dark:from-red-500/80 dark:to-red-600/80 text-white dark:text-white shadow-md"
                                : "text-white dark:text-white hover:bg-gradient-to-r hover:from-red-500/20 hover:to-red-600/20 dark:hover:from-red-500/20 dark:hover:to-red-600/20 hover:text-white dark:hover:text-white hover:shadow-md"
                            }`}
                            disabled={isLoggingOut}
                          >
                            <div className="flex items-center">
                              <FileText className="mr-3 h-5 w-5 transition-all duration-300 group-hover:scale-110" />
                              <span className="relative z-10">Audit Logs</span>
                            </div>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (item.name === "Notifications") {
                    return (
                      <button
                        key={item.name}
                        onClick={() => {
                          setMobileMenuOpen(false);
                          router.push("/dashboard/admin/notifications");
                        }}
                        className={`flex items-center w-full px-3 py-3 text-sm font-medium rounded-lg transition-all duration-300 group relative overflow-hidden ${
                          pathname === item.href
                            ? "bg-gradient-to-r from-red-500 to-red-600 dark:from-red-500 dark:to-red-600 text-white dark:text-white shadow-md"
                            : "text-white dark:text-white hover:bg-gradient-to-r hover:from-red-500/20 hover:to-red-600/20 dark:hover:from-red-500/20 dark:hover:to-red-600/20 hover:text-white dark:hover:text-white hover:shadow-md hover:scale-105"
                        }`}
                        disabled={isLoggingOut}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                        <div className="relative mr-3">
                          <Bell className="h-5 w-5 transition-all duration-300 group-hover:scale-110" />
                          {unreadNotificationCount > 0 && (
                            <Badge
                              variant="destructive"
                              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs animate-pulse"
                            >
                              {unreadNotificationCount}
                            </Badge>
                          )}
                        </div>
                        <span className="relative z-10">{item.name}</span>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        router.push(item.href);
                      }}
                      className={`flex items-center w-full px-3 py-3 text-sm font-medium rounded-lg transition-all duration-300 group relative overflow-hidden ${
                        pathname === item.href
                          ? "bg-gradient-to-r from-red-500 to-red-600 dark:from-red-500 dark:to-red-600 text-white dark:text-white shadow-md"
                          : "text-white dark:text-white hover:bg-gradient-to-r hover:from-red-500/20 hover:to-red-600/20 dark:hover:from-red-500/20 dark:hover:to-red-600/20 hover:text-white dark:hover:text-white hover:shadow-md hover:scale-105"
                      }`}
                      disabled={isLoggingOut}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                      <item.icon className="mr-3 h-5 w-5 transition-all duration-300 group-hover:scale-110" />
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
