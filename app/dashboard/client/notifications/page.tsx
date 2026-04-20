"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  X,
  Check,
  Eye,
  CalendarCheck,
  CalendarX,
  Users,
  XCircle,
  CheckCircle2,
  CalendarDays,
  Clock4,
  FileText,
  MoreHorizontal,
} from "lucide-react";
import { ClientDashboardLayout } from "@/components/client-dashboard-layout";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationService } from "@/lib/notification-service";
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  setDoc,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";

// App-specific notification type to avoid colliding with DOM `Notification`
interface AppNotification {
  id: string;
  type: "appointment";
  notificationType:
    | "new_appointment"
    | "cancelled_appointment"
    | "rescheduled_appointment"
    | "confirmed_appointment"
    | "completed_appointment";
  title: string;
  message: string;
  metadata: {
    [key: string]: any;
    appointmentId?: string;
    clientName?: string;
    clientEmail?: string;
    clientPhone?: string;
    oldDate?: string;
    oldTime?: string;
    newDate?: string;
    newTime?: string;
    date?: string;
    time?: string;
    serviceType?: string;
    cancelledBy?: string;
    cancellationReason?: string;
    rescheduledBy?: string;
    rescheduleReason?: string;
    confirmedBy?: string;
  };
  timestamp: any;
  read: boolean;
  priority: "high" | "medium" | "low";
  source: "firestore" | "appointments";
  userId?: string;
  appointmentId?: string;
  createdAt?: any;
}

export default function ClientNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser({
          id: user.uid,
          name: user.displayName || "Client",
          email: user.email || "",
        });
        localStorage.setItem("userId", user.uid);
        localStorage.setItem("userRole", "client");
      } else {
        const fallbackUser = {
          id: localStorage.getItem("userId") || `USER-${Date.now()}`,
          name: "Client",
          email: "",
        };
        setCurrentUser(fallbackUser);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;

    let unsubscribeFunctions: (() => void)[] = [];

    const loadAppointmentNotifications = async () => {
      try {
        setIsLoading(true);
        unsubscribeFunctions = [];

        const notificationsRef = collection(db, "notifications");

        // Load Firestore notifications for this client only
        const userNotificationsQuery = query(
          notificationsRef,
          where("userId", "==", currentUser.id),
          where("type", "==", "appointment")
        );

        console.log(`[CLIENT NOTIFICATIONS] Querying Firestore notifications for userId: ${currentUser.id}`);

        const firestoreNotificationsUnsubscribe = onSnapshot(
          userNotificationsQuery,
          (snapshot) => {
            console.log(
              `[CLIENT NOTIFICATIONS] Firestore notifications snapshot: ${snapshot.docs.length}`
            );
            snapshot.docs.forEach((d) => {
              const _data = d.data();
              console.log("[CLIENT NOTIFICATIONS] firestore doc:", d.id, {
                userId: _data.userId,
                notificationType: _data.notificationType,
                type: _data.type,
                metadata: _data.metadata,
              });
            });
            let firestoreNotifications = snapshot.docs
              .map((docSnap) => {
                const data = docSnap.data();
                return {
                  id: `firestore_${docSnap.id}`,
                  type: "appointment" as const,
                  notificationType:
                    data.notificationType as AppNotification["notificationType"],
                  title: data.title || "Appointment Notification",
                  message: data.message || "",
                  metadata: data.metadata || {},
                  timestamp: data.createdAt || Timestamp.now(),
                  read: data.read || false,
                  priority: data.priority || "medium",
                  source: "firestore",
                  userId: data.userId,
                  appointmentId: data.metadata?.appointmentId,
                  createdAt: data.createdAt,
                };
              })
              .filter((notif) => notif !== null) as AppNotification[];

            // Only include persisted appointment notifications that are admin-initiated
            const allowedTypes = new Set([
              "confirmed_appointment",
              "cancelled_appointment",
              "rescheduled_appointment",
            ]);

            firestoreNotifications = firestoreNotifications.filter(
              (f) => f.notificationType && allowedTypes.has(f.notificationType)
            );

            firestoreNotifications = firestoreNotifications.sort((a, b) => {
              const timeA = a.timestamp?.toDate
                ? a.timestamp.toDate()
                : new Date(a.timestamp);
              const timeB = b.timestamp?.toDate
                ? b.timestamp.toDate()
                : new Date(b.timestamp);
              return timeB.getTime() - timeA.getTime();
            });

            updateNotifications("firestore", firestoreNotifications);
          },
          (error) => {
            console.error("Firestore onSnapshot error:", error);
            // Fallback: fetch once if realtime listener fails
            getDocs(userNotificationsQuery)
              .then((snapshot) => {
                console.log(
                  `[CLIENT NOTIFICATIONS] Firestore fallback fetch returned: ${snapshot.docs.length}`
                );
                snapshot.docs.forEach((d) => {
                  const _data = d.data();
                  console.log("[CLIENT NOTIFICATIONS] firestore fallback doc:", d.id, {
                    userId: _data.userId,
                    notificationType: _data.notificationType,
                    type: _data.type,
                    metadata: _data.metadata,
                  });
                });
                let firestoreNotifications = snapshot.docs
                  .map((docSnap) => {
                    const data = docSnap.data();
                    return {
                      id: `firestore_${docSnap.id}`,
                      type: "appointment" as const,
                      notificationType:
                        data.notificationType as AppNotification["notificationType"],
                      title: data.title || "Appointment Notification",
                      message: data.message || "",
                      metadata: data.metadata || {},
                      timestamp: data.createdAt || Timestamp.now(),
                      read: data.read || false,
                      priority: data.priority || "medium",
                      source: "firestore",
                      userId: data.userId,
                      appointmentId: data.metadata?.appointmentId,
                      createdAt: data.createdAt,
                    };
                  })
                  .filter((notif) => notif !== null) as AppNotification[];

                const allowedTypes = new Set([
                  "confirmed_appointment",
                  "cancelled_appointment",
                  "rescheduled_appointment",
                ]);

                firestoreNotifications = firestoreNotifications.filter(
                  (f) => f.notificationType && allowedTypes.has(f.notificationType)
                );

                firestoreNotifications = firestoreNotifications.sort((a, b) => {
                  const timeA = a.timestamp?.toDate
                    ? a.timestamp.toDate()
                    : new Date(a.timestamp);
                  const timeB = b.timestamp?.toDate
                    ? b.timestamp.toDate()
                    : new Date(b.timestamp);
                  return timeB.getTime() - timeA.getTime();
                });

                updateNotifications("firestore", firestoreNotifications);
              })
              .catch((err) => {
                console.error("Error fetching firestore notifications fallback:", err);
              });
          }
        );

        // Don't create notifications from appointments - they're created by admin
        unsubscribeFunctions = [firestoreNotificationsUnsubscribe];
      } catch (error) {
        console.error("Error loading appointment notifications:", error);
        toast.error("Failed to load appointment notifications");
      } finally {
        setIsLoading(false);
      }
    };

    

    loadAppointmentNotifications();

    return () => {
      unsubscribeFunctions.forEach((unsub) => unsub());
    };
  }, [currentUser]);

  

  const updateNotifications = (
    source: string,
    newNotifications: AppNotification[]
  ) => {
    setNotifications(() => {
      // For client notifications, completely replace with new data from Firestore
      const sorted = newNotifications.sort((a, b) => {
        const timeA = a.timestamp?.toDate
          ? a.timestamp.toDate()
          : new Date(a.timestamp);
        const timeB = b.timestamp?.toDate
          ? b.timestamp.toDate()
          : new Date(b.timestamp);
        return timeB.getTime() - timeA.getTime();
      });

      return sorted;
    });
  };

  const markAsRead = async (id: string) => {
    try {
      const notification = notifications.find((n) => n.id === id);
      if (!notification) return;

      let firestoreIds: string[] = [];

      // Handle notifications that already have a Firestore ID
      if (id.startsWith("firestore_")) {
        firestoreIds.push(id.replace("firestore_", ""));
      } else if (id.startsWith("appointment_")) {
        // For appointment-type notifications, find ALL corresponding Firestore documents
        const appointmentId = notification.appointmentId || notification.metadata?.appointmentId;
        if (appointmentId) {
          const firestoreNotifications = notifications.filter(
            (n) =>
              n.source === "firestore" &&
              (n.appointmentId === appointmentId || 
               n.metadata?.appointmentId === appointmentId)
          );

          firestoreIds = firestoreNotifications
            .filter((n) => n.id.startsWith("firestore_"))
            .map((n) => n.id.replace("firestore_", ""));
        }
      }

      // Update all matching Firestore documents
      if (firestoreIds.length > 0) {
        const updatePromises = firestoreIds.map(async (firestoreId) => {
          const notificationRef = doc(db, "notifications", firestoreId);
          await updateDoc(notificationRef, {
            read: true,
            updatedAt: Timestamp.now(),
          });
        });
        await Promise.all(updatePromises);
      }

      // Update local state - mark this notification and any related ones as read
      const appointmentId = notification.appointmentId || notification.metadata?.appointmentId;
      setNotifications((prev) =>
        prev.map((notif) => {
          if (notif.id === id) {
            return { ...notif, read: true };
          }
          // Also mark related appointment notifications as read
          if (
            appointmentId &&
            (notif.appointmentId === appointmentId || 
             notif.metadata?.appointmentId === appointmentId)
          ) {
            return { ...notif, read: true };
          }
          return notif;
        })
      );

      toast.success("Notification marked as read");
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Failed to mark notification as read");
    }
  };

  const markAllAsRead = async () => {
    if (!currentUser?.id) return;

    try {
      // Get all unread Firestore notification IDs
      const firestoreIds = notifications
        .filter((n) => (n.source === "firestore" || n.id.startsWith("firestore_")) && !n.read)
        .map((n) => n.id.startsWith("firestore_") ? n.id.replace("firestore_", "") : null)
        .filter((id) => id !== null) as string[];

      // Update all in Firestore
      const updatePromises = firestoreIds.map(async (firestoreId) => {
        const notificationRef = doc(db, "notifications", firestoreId);
        return updateDoc(notificationRef, {
          read: true,
          updatedAt: Timestamp.now(),
        });
      });

      await Promise.all(updatePromises);

      // Update local state
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, read: true }))
      );

      toast.success("All appointment notifications marked as read");
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast.error("Failed to mark all notifications as read");
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      let firestoreId: string | null = null;

      if (id.startsWith("firestore_")) {
        firestoreId = id.replace("firestore_", "");
      }

      if (firestoreId) {
        const notificationRef = doc(db, "notifications", firestoreId);
        await updateDoc(notificationRef, {
          read: true,
          updatedAt: Timestamp.now(),
        });

        setNotifications((prev) =>
          prev.filter((notification) => notification.id !== id)
        );

        toast.success("Notification marked as read and archived");
      } else {
        setNotifications((prev) =>
          prev.filter((notification) => notification.id !== id)
        );
        toast.success("Notification removed");
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error("Failed to delete notification");
    }
  };

  const refreshNotifications = async () => {
    if (!currentUser?.id) return;

    try {
      setIsRefreshing(true);
      const firestoreNotifications = await NotificationService.getNotifications(
        currentUser.id
      );

      const appointmentFirestoreNotifications = firestoreNotifications.filter(
        (notif: any) => notif.type === "appointment"
      );

      const firestoreNotificationsFormatted: AppNotification[] =
        appointmentFirestoreNotifications.map((notif: any) => ({
          id: `firestore_${notif.id}`,
          type: "appointment",
          notificationType:
            notif.notificationType as AppNotification["notificationType"],
          title: notif.title,
          message: notif.message,
          metadata: notif.metadata,
          timestamp: notif.createdAt || Timestamp.now(),
          read: notif.read || false,
          priority: notif.priority || "medium",
          source: "firestore",
          userId: notif.userId,
          appointmentId: notif.metadata?.appointmentId,
          createdAt: notif.createdAt,
        }));

      // Keep only admin-initiated appointment notifications
      const allowedTypes = new Set([
        "confirmed_appointment",
        "cancelled_appointment",
        "rescheduled_appointment",
      ]);

      const firestoreNotificationsFiltered = firestoreNotificationsFormatted.filter(
        (f) => f.notificationType && allowedTypes.has(f.notificationType)
      );

      const realTimeNotifications = notifications.filter(
        (n) => n.source === "appointments"
      );

      const allNotifications = [
        ...realTimeNotifications,
        ...firestoreNotificationsFiltered,
      ];

      const uniqueNotifications = Array.from(
        new Map(
          allNotifications.map((n) => {
            const key = `${n.metadata?.appointmentId}_${n.notificationType}`;
            return [key, n];
          })
        ).values()
      ).sort((a, b) => {
        const timeA = a.timestamp?.toDate
          ? a.timestamp.toDate()
          : new Date(a.timestamp);
        const timeB = b.timestamp?.toDate
          ? b.timestamp.toDate()
          : new Date(b.timestamp);
        return timeB.getTime() - timeA.getTime();
      });

      setNotifications(uniqueNotifications);
      toast.success("Appointment notifications refreshed");
    } catch (error) {
      toast.error("Failed to refresh notifications");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleNotificationAction = (notification: AppNotification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Clients should navigate to client appointments, not admin routes
    if (notification.metadata?.appointmentId) {
      router.push(`/dashboard/client/appointments?appointmentId=${notification.metadata.appointmentId}`);
    } else {
      router.push("/dashboard/client/appointments");
    }
  };

  const getNotificationTime = (timestamp: any) => {
    try {
      let date: Date;
      if (timestamp instanceof Timestamp) {
        date = timestamp.toDate();
      } else if (typeof timestamp === "string") {
        date = new Date(timestamp);
      } else if (timestamp?.toDate) {
        date = timestamp.toDate();
      } else {
        date = new Date();
      }

      if (isToday(date)) {
        return format(date, "h:mm a");
      } else if (isYesterday(date)) {
        return "Yesterday";
      } else {
        return formatDistanceToNow(date, { addSuffix: true });
      }
    } catch (error) {
      return "Recently";
    }
  };

  const formatNotificationDate = (timestamp: any) => {
    try {
      let date: Date;
      if (timestamp instanceof Timestamp) {
        date = timestamp.toDate();
      } else if (typeof timestamp === "string") {
        date = new Date(timestamp);
      } else if (timestamp?.toDate) {
        date = timestamp.toDate();
      } else {
        date = new Date();
      }
      return format(date, "MMM d, yyyy h:mm a");
    } catch (error) {
      return "Unknown date";
    }
  };

  const groupedNotifications = notifications.reduce((groups, notification) => {
    try {
      let date: Date;
      if (notification.timestamp instanceof Timestamp) {
        date = notification.timestamp.toDate();
      } else if (typeof notification.timestamp === "string") {
        date = new Date(notification.timestamp);
      } else if (notification.timestamp?.toDate) {
        date = notification.timestamp.toDate();
      } else {
        date = new Date();
      }

      let dateKey: string;

      if (isToday(date)) {
        dateKey = "Today";
      } else if (isYesterday(date)) {
        dateKey = "Yesterday";
      } else {
        dateKey = format(date, "MMMM d, yyyy");
      }

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }

      groups[dateKey].push(notification);
      return groups;
    } catch (error) {
      if (!groups["Recent"]) {
        groups["Recent"] = [];
      }
      groups["Recent"].push(notification);
      return groups;
    }
  }, {} as Record<string, AppNotification[]>);

  const filteredNotifications = Object.entries(groupedNotifications).reduce(
    (acc, [date, notifs]) => {
      const filtered = notifs.filter((notification) => {
        if (filter === "all") return true;
        if (filter === "unread") return !notification.read;
        if (filter === "read") return notification.read;
        if (filter === "new")
          return notification.notificationType === "new_appointment";
        if (filter === "cancelled")
          return notification.notificationType === "cancelled_appointment";
        if (filter === "rescheduled")
          return notification.notificationType === "rescheduled_appointment";
        if (filter === "confirmed")
          return notification.notificationType === "confirmed_appointment";
        if (filter === "completed")
          return notification.notificationType === "completed_appointment";
        return true;
      });

      if (filtered.length > 0) {
        acc[date] = filtered;
      }

      return acc;
    },
    {} as Record<string, AppNotification[]>
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (isLoading) {
    return (
      <ClientDashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64 mt-2" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>

          <Skeleton className="h-10 w-full" />

          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </ClientDashboardLayout>
    );
  }

  return (
    <ClientDashboardLayout>
      <div className="space-y-6">
        {/* Header - Clean design like client */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-playfair text-navy-900 dark:text-white">
              Notifications
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Stay updated with appointment status changes
            </p>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-sm text-gray-500">
                Showing {notifications.length} appointment notification
                {notifications.length !== 1 ? "s" : ""}
              </p>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreadCount} unread
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button onClick={markAllAsRead} variant="outline" size="sm">
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark All as Read
              </Button>
            )}
          </div>
        </div>

        {/* Filter Tabs - Simplified like client */}
        <Tabs defaultValue="all" onValueChange={setFilter}>
          <TabsList className="grid grid-cols-3 md:w-auto">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">Unread</TabsTrigger>
              <TabsTrigger value="read">Read</TabsTrigger>
            </TabsList>
        </Tabs>

        {/* Notifications List */}
        <div className="space-y-6">
          {Object.entries(filteredNotifications).length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No appointment notifications found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {filter === "unread"
                  ? "You don't have any unread appointment notifications."
                  : filter === "read"
                  ? "You don't have any read appointment notifications."
                  : filter === "new"
                  ? "You don't have any new appointment notifications."
                  : "You don't have any appointment notifications yet."}
              </p>
            </div>
          ) : (
            Object.entries(filteredNotifications).map(
              ([date, dateNotifications]) => (
                <div key={date} className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {date}
                  </h3>
                  {dateNotifications.map((notification) => (
                    <Card
                      key={notification.id}
                      className={`cursor-pointer hover:shadow-md transition-all border-l-4 ${
                        notification.priority === "high"
                          ? "border-l-red-500"
                          : notification.priority === "medium"
                          ? "border-l-yellow-500"
                          : "border-l-green-500"
                      } ${
                        notification.priority === "high"
                          ? "bg-red-50 dark:bg-red-950/20"
                          : notification.priority === "medium"
                          ? "bg-yellow-50 dark:bg-yellow-950/20"
                          : "bg-green-50 dark:bg-green-950/20"
                      } ${
                        !notification.read
                          ? "border-opacity-100"
                          : "border-opacity-50"
                      }`}
                      onClick={() => handleNotificationAction(notification)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          {/* Icon with colored background */}
                          <div
                            className={`p-2 rounded-lg ${
                              notification.notificationType ===
                              "new_appointment"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                : notification.notificationType ===
                                  "cancelled_appointment"
                                ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                : notification.notificationType ===
                                  "rescheduled_appointment"
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                : notification.notificationType ===
                                  "confirmed_appointment"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : notification.notificationType ===
                                  "completed_appointment"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                            }`}
                          >
                            {notification.notificationType ===
                            "new_appointment" ? (
                              <Calendar className="h-4 w-4" />
                            ) : notification.notificationType ===
                              "cancelled_appointment" ? (
                              <CalendarX className="h-4 w-4" />
                            ) : notification.notificationType ===
                              "rescheduled_appointment" ? (
                              <RefreshCw className="h-4 w-4" />
                            ) : notification.notificationType ===
                              "confirmed_appointment" ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : notification.notificationType ===
                              "completed_appointment" ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <Bell className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h3
                                  className={`font-medium ${
                                    !notification.read ? "font-semibold" : ""
                                  }`}
                                >
                                  {notification.title}
                                  {!notification.read && (
                                    <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
                                  )}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                                  {notification.message}
                                </p>

                                {/* Appointment Details - Simplified */}
                                {notification.metadata && (
                                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                                    <div className="flex items-center gap-2 text-sm">
                                      <Calendar className="h-3 w-3 text-blue-600" />
                                      <span className="text-blue-700 dark:text-blue-300">
                                        {notification.metadata.clientName} -{" "}
                                        {notification.metadata.date} at{" "}
                                        {notification.metadata.time}
                                      </span>
                                    </div>
                                    {notification.metadata.appointmentId && (
                                      <div className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                                        ID:{" "}
                                        {notification.metadata.appointmentId.substring(
                                          0,
                                          8
                                        )}
                                        ...
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  className={
                                    notification.notificationType ===
                                    "new_appointment"
                                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                      : notification.notificationType ===
                                        "cancelled_appointment"
                                      ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                      : notification.notificationType ===
                                        "rescheduled_appointment"
                                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                      : notification.notificationType ===
                                        "confirmed_appointment"
                                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                      : notification.notificationType ===
                                        "completed_appointment"
                                      ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                                      : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                                  }
                                  variant="outline"
                                >
                                  {notification.notificationType ===
                                  "new_appointment"
                                    ? "New Appointment"
                                    : notification.notificationType ===
                                      "cancelled_appointment"
                                    ? "Cancelled"
                                    : notification.notificationType ===
                                      "rescheduled_appointment"
                                    ? "Rescheduled"
                                    : notification.notificationType ===
                                      "confirmed_appointment"
                                    ? "Confirmed"
                                    : notification.notificationType ===
                                      "completed_appointment"
                                    ? "Completed"
                                    : "Appointment"}
                                </Badge>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
  {!notification.read && (
    <DropdownMenuItem
      onClick={(e) => {
        e.stopPropagation();
        markAsRead(notification.id);
      }}
    >
      <Check className="h-4 w-4 mr-2" />
      Mark as read
    </DropdownMenuItem>
  )}
  {notification.metadata?.appointmentId && (
    <DropdownMenuItem
      onClick={(e) => {
        e.stopPropagation();
        window.location.href = `/dashboard/client/appointments?appointmentId=${notification.metadata?.appointmentId}`;
      }}
    >
      <Eye className="h-4 w-4 mr-2" />
      View Appointment
    </DropdownMenuItem>
  )}
  <DropdownMenuItem
    onClick={(e) => {
      e.stopPropagation();
      window.location.href = "/dashboard/client/appointments";
    }}
  >
    <Calendar className="h-4 w-4 mr-2" />
    My Appointments
  </DropdownMenuItem>
  <DropdownMenuItem
    onClick={(e) => {
      e.stopPropagation();
      deleteNotification(notification.id);
    }}
    className="text-red-600"
  >
    <X className="h-4 w-4 mr-2" />
    Mark as read & archive
  </DropdownMenuItem>
</DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                              <div className="flex items-center gap-4">
                                <span
                                  title={formatNotificationDate(
                                    notification.timestamp
                                  )}
                                >
                                  {getNotificationTime(notification.timestamp)}
                                </span>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs ${
                                    notification.priority === "high"
                                      ? "bg-red-100 text-red-800"
                                      : notification.priority === "medium"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-green-100 text-green-800"
                                  }`}
                                >
                                  {notification.priority} priority
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {!notification.read && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markAsRead(notification.id);
                                    }}
                                  >
                                    <Check className="h-3 w-3 mr-1" />
                                    Mark read
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )
            )
          )}
        </div>
      </div>
    </ClientDashboardLayout>
  );
}
