"use client";

import { useState, useEffect } from "react";
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
import { AdminDashboardLayout } from "@/components/admin-dashboard-layout";
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
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";

// Define notification types - appointment and message related
interface Notification {
  id: string;
  type: "appointment" | "message";
  notificationType?:
    | "new_appointment"
    | "cancelled_appointment"
    | "rescheduled_appointment"
    | "confirmed_appointment"
    | "completed_appointment";
  title: string;
  message: string;
  metadata?: {
    appointmentId?: string;
    conversationId?: string;
    clientName?: string;
    clientEmail?: string;
    clientPhone?: string;
    senderRole?: string;
    oldDate?: string;
    oldTime?: string;
    newDate?: string;
    newTime?: string;
    date?: string;
    time?: string;
    serviceType?: string;
    consultationType?: string;
    location?: string;
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
  // Add these fields for Firestore compatibility
  userId?: string;
  appointmentId?: string;
  createdAt?: any;
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState("all");
  const [timeRange, setTimeRange] = useState<"today" | "week" | "month" | "year" | "all-time">("all-time");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);

  // Get current authenticated user info
  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser({
          id: user.uid,
          name: user.displayName || "Admin",
          email: user.email || "",
        });
        localStorage.setItem("userId", user.uid);
        localStorage.setItem("userRole", "admin");
      } else {
        const fallbackUser = {
          id: localStorage.getItem("userId") || `USER-${Date.now()}`,
          name: "Admin",
          email: "",
        };
        setCurrentUser(fallbackUser);
      }
    });

    return () => unsubscribe();
  }, []);

  // Save notification to Firestore for persistence
  const saveNotificationToFirestore = async (notification: Notification) => {
    if (!currentUser?.id) return null;

    try {
      const notificationsRef = collection(db, "notifications");
      const notificationData = {
        userId: currentUser.id,
        type: notification.type,
        notificationType: notification.notificationType,
        title: notification.title,
        message: notification.message,
        metadata: notification.metadata || {},
        appointmentId: notification.metadata?.appointmentId || "",
        read: notification.read,
        priority: notification.priority,
        createdAt: notification.timestamp || Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Check if notification already exists
      const q = query(
        notificationsRef,
        where("userId", "==", currentUser.id),
        where(
          "appointmentId",
          "==",
          notification.metadata?.appointmentId || ""
        ),
        where("notificationType", "==", notification.notificationType)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // Create new notification
        const docRef = await addDoc(notificationsRef, notificationData);
        return docRef.id;
      } else {
        // Update existing notification
        const existingDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, "notifications", existingDoc.id), {
          ...notificationData,
          updatedAt: Timestamp.now(),
        });
        return existingDoc.id;
      }
    } catch (error) {
      console.error("Error saving notification to Firestore:", error);
      return null;
    }
  };

  // Load appointment notifications only
  useEffect(() => {
    if (!currentUser?.id) return;

    let unsubscribeFunctions: (() => void)[] = [];

    const loadAppointmentNotifications = async () => {
      try {
        setIsLoading(true);
        unsubscribeFunctions = [];

        // 1. Load existing Firestore notifications (both appointment and message)
        const firestoreNotifications =
          await NotificationService.getNotifications(currentUser.id);
        const relevantFirestoreNotifications = firestoreNotifications.filter(
          (notif: any) => notif.type === "appointment" || notif.type === "message"
        );

        // Convert to Notification format
        const firestoreNotificationsFormatted: Notification[] =
          relevantFirestoreNotifications.map((notif: any) => ({
            id: `firestore_${notif.id}`,
            type: notif.type,
            notificationType:
              notif.notificationType as Notification["notificationType"],
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

        // 2. Load appointments from appointments collection
        const appointmentsRef = collection(db, "appointments");

        // Listen to all appointments for real-time updates
        const appointmentsQuery = query(appointmentsRef);

        const appointmentsUnsubscribe = onSnapshot(
          appointmentsQuery,
          async (snapshot) => {
            const appointmentNotifications: Notification[] = [];

            // Process each appointment
            for (const docSnap of snapshot.docs) {
              const data = docSnap.data();
              const appointmentId = docSnap.id;
              const createdAt = data.createdAt?.toDate?.() || new Date();

              // Check appointment status and create appropriate notification
              if (data.status === "pending") {
                // New appointment - only show if created within last 24 hours
                const twentyFourHoursAgo = new Date(
                  Date.now() - 24 * 60 * 60 * 1000
                );
                if (createdAt > twentyFourHoursAgo) {
                  // Check if this notification already exists in Firestore
                  const existingFirestoreNotif =
                    firestoreNotificationsFormatted.find(
                      (n) =>
                        n.metadata?.appointmentId === appointmentId &&
                        n.notificationType === "new_appointment"
                    );

                  const notification: Notification = {
                    id:
                      existingFirestoreNotif?.id ||
                      `appointment_new_${appointmentId}_${createdAt.getTime()}`,
                    type: "appointment",
                    notificationType: "new_appointment",
                    title: "New Appointment Request",
                    message: `New appointment request from ${
                      data.client || data.clientName || "a client"
                    }`,
                    metadata: {
                      appointmentId,
                      clientName: data.client || data.clientName || "Client",
                      clientEmail: data.clientEmail || "",
                      clientPhone: data.clientPhone || "",
                      date: data.date,
                      time: data.time,
                      serviceType:
                        data.type ||
                        data.appointmentPurpose ||
                        "Legal Consultation",
                      consultationType: data.consultationType || "in-person",
                      location: data.location || "Office",
                    },
                    timestamp: data.createdAt || Timestamp.now(),
                    read: existingFirestoreNotif?.read || false,
                    priority: "high",
                    source: "appointments",
                    userId: currentUser.id,
                    appointmentId: appointmentId,
                  };

                  // Save to Firestore if it doesn't exist
                  if (!existingFirestoreNotif) {
                    const firestoreId = await saveNotificationToFirestore(
                      notification
                    );
                    if (firestoreId) {
                      notification.id = `firestore_${firestoreId}`;
                      notification.source = "firestore";
                    }
                  }

                  appointmentNotifications.push(notification);
                }
              } else if (data.status === "cancelled") {
                // Cancelled appointment
                const updatedAt = data.updatedAt?.toDate?.() || new Date();
                const twentyFourHoursAgo = new Date(
                  Date.now() - 24 * 60 * 60 * 1000
                );

                if (updatedAt > twentyFourHoursAgo) {
                  // Check if this notification already exists in Firestore
                  const existingFirestoreNotif =
                    firestoreNotificationsFormatted.find(
                      (n) =>
                        n.metadata?.appointmentId === appointmentId &&
                        n.notificationType === "cancelled_appointment"
                    );

                  const notification: Notification = {
                    id:
                      existingFirestoreNotif?.id ||
                      `appointment_cancelled_${appointmentId}_${updatedAt.getTime()}`,
                    type: "appointment",
                    notificationType: "cancelled_appointment",
                    title: "Appointment Cancelled",
                    message: `Appointment cancelled by ${
                      data.cancelledBy || data.client || "a client"
                    }`,
                    metadata: {
                      appointmentId,
                      clientName: data.client || data.clientName || "Client",
                      date: data.date,
                      time: data.time,
                      cancelledBy: data.cancelledBy || "Client",
                      cancellationReason:
                        data.cancellationReason || "No reason provided",
                      serviceType:
                        data.type ||
                        data.appointmentPurpose ||
                        "Legal Consultation",
                    },
                    timestamp: data.updatedAt || Timestamp.now(),
                    read: existingFirestoreNotif?.read || false,
                    priority: "medium",
                    source: "appointments",
                    userId: currentUser.id,
                    appointmentId: appointmentId,
                  };

                  // Save to Firestore if it doesn't exist
                  if (!existingFirestoreNotif) {
                    const firestoreId = await saveNotificationToFirestore(
                      notification
                    );
                    if (firestoreId) {
                      notification.id = `firestore_${firestoreId}`;
                      notification.source = "firestore";
                    }
                  }

                  appointmentNotifications.push(notification);
                }
              }
              // Add similar logic for other statuses: confirmed, rescheduled, completed
            }

            // Sort by timestamp descending
            appointmentNotifications.sort((a, b) => {
              const timeA = a.timestamp?.toDate
                ? a.timestamp.toDate()
                : new Date(a.timestamp);
              const timeB = b.timestamp?.toDate
                ? b.timestamp.toDate()
                : new Date(b.timestamp);
              return timeB.getTime() - timeA.getTime();
            });

            updateNotifications("appointments", appointmentNotifications);
          }
        );

        // 3. Listen for Firestore notifications updates
        const notificationsRef = collection(db, "notifications");
        const userNotificationsQuery = query(
          notificationsRef,
          where("userId", "==", currentUser.id)
        );

        const firestoreNotificationsUnsubscribe = onSnapshot(
          userNotificationsQuery,
          (snapshot) => {
            const firestoreNotifications = snapshot.docs
              .map((docSnap) => {
                const data = docSnap.data();
                // Filter for appointment type on client side
                if (data.type !== "appointment") return null;

                return {
                  id: `firestore_${docSnap.id}`,
                  type: "appointment" as const,
                  notificationType:
                    data.notificationType as Notification["notificationType"],
                  title: data.title || "Appointment Notification",
                  message: data.message || "",
                  metadata: data.metadata,
                  timestamp: data.createdAt || Timestamp.now(),
                  read: data.read || false,
                  priority: data.priority || "medium",
                  source: "firestore" as const,
                  userId: data.userId,
                  appointmentId: data.metadata?.appointmentId,
                  createdAt: data.createdAt,
                };
              })
              .filter((notif): notif is Notification => notif !== null)
              .sort((a, b) => {
                const timeA = a.timestamp?.toDate
                  ? a.timestamp.toDate()
                  : new Date(a.timestamp);
                const timeB = b.timestamp?.toDate
                  ? b.timestamp.toDate()
                  : new Date(b.timestamp);
                return timeB.getTime() - timeA.getTime();
              });

            updateNotifications("firestore", firestoreNotifications);
          }
        );

        // Store unsubscribe functions
        unsubscribeFunctions = [
          appointmentsUnsubscribe,
          firestoreNotificationsUnsubscribe,
        ];
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
    newNotifications: Notification[]
  ) => {
    setNotifications((prev) => {
      // Create a map of existing notifications by ID for quick lookup
      const existingNotifications = new Map(prev.map((n) => [n.id, n]));

      // Update with new notifications
      newNotifications.forEach((newNotif) => {
        existingNotifications.set(newNotif.id, newNotif);
      });

      // Convert back to array and sort by timestamp
      const updated = Array.from(existingNotifications.values()).sort(
        (a, b) => {
          const timeA = a.timestamp?.toDate
            ? a.timestamp.toDate()
            : new Date(a.timestamp);
          const timeB = b.timestamp?.toDate
            ? b.timestamp.toDate()
            : new Date(b.timestamp);
          return timeB.getTime() - timeA.getTime();
        }
      );

      return updated;
    });
  };

  const markAsRead = async (id: string) => {
    try {
      // Extract the actual Firestore document ID
      let firestoreId: string | null = null;

      if (id.startsWith("firestore_")) {
        firestoreId = id.replace("firestore_", "");
      } else if (id.startsWith("appointment_")) {
        // For appointment-based notifications, find the Firestore equivalent
        const notification = notifications.find((n) => n.id === id);
        if (notification?.appointmentId && notification.notificationType) {
          // Look for the Firestore version of this notification
          const firestoreNotification = notifications.find(
            (n) =>
              n.source === "firestore" &&
              n.metadata?.appointmentId ===
                notification.metadata?.appointmentId &&
              n.notificationType === notification.notificationType
          );

          if (firestoreNotification?.id.startsWith("firestore_")) {
            firestoreId = firestoreNotification.id.replace("firestore_", "");
          }
        }
      }

      // Update in Firestore if we have an ID
      if (firestoreId) {
        const notificationRef = doc(db, "notifications", firestoreId);
        await updateDoc(notificationRef, {
          read: true,
          updatedAt: Timestamp.now(),
        });
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id
            ? { ...notification, read: true }
            : notification
        )
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
      // Get all Firestore notification IDs
      const firestoreIds = notifications
        .filter((n) => n.source === "firestore" && !n.read)
        .map((n) => n.id.replace("firestore_", ""));

      // Update all in Firestore
      const updatePromises = firestoreIds.map(async (firestoreId) => {
        const notificationRef = doc(db, "notifications", firestoreId);
        return updateDoc(notificationRef, {
          read: true,
          updatedAt: Timestamp.now(),
        });
      });

      await Promise.all(updatePromises);

      // Update local state for all notifications
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
      // Extract the Firestore document ID
      let firestoreId: string | null = null;

      if (id.startsWith("firestore_")) {
        firestoreId = id.replace("firestore_", "");
      }

      // Delete from Firestore if we have an ID
      if (firestoreId) {
        const notificationRef = doc(db, "notifications", firestoreId);
        await updateDoc(notificationRef, {
          read: true, // Mark as read instead of deleting to preserve history
          updatedAt: Timestamp.now(),
        });

        // Remove from local state
        setNotifications((prev) =>
          prev.filter((notification) => notification.id !== id)
        );

        toast.success("Notification marked as read and archived");
      } else {
        // For non-Firestore notifications, just remove from local state
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
      // Reload Firestore notifications
      const firestoreNotifications = await NotificationService.getNotifications(
        currentUser.id
      );

      // Filter appointment and message notifications
      const relevantFirestoreNotifications = firestoreNotifications.filter(
        (notif: any) => notif.type === "appointment" || notif.type === "message"
      );

      // Convert to Notification format
      const firestoreNotificationsFormatted: Notification[] =
        relevantFirestoreNotifications.map((notif: any) => ({
          id: `firestore_${notif.id}`,
          type: notif.type,
          notificationType:
            notif.notificationType as Notification["notificationType"],
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

      // Keep existing real-time appointment notifications
      const realTimeNotifications = notifications.filter(
        (n) => n.source === "appointments"
      );

      // Combine and deduplicate
      const allNotifications = [
        ...realTimeNotifications,
        ...firestoreNotificationsFormatted,
      ];

      const uniqueNotifications = Array.from(
        new Map(
          allNotifications.map((n) => {
            // Create a unique key based on appointment ID and notification type
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

  const handleNotificationAction = (notification: Notification) => {
    // Mark as read first
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate to appointment details
    if (notification.metadata?.appointmentId) {
      window.open(
        `/dashboard/admin/appointments?view=${notification.metadata.appointmentId}`,
        "_blank"
      );
    } else {
      window.open("/dashboard/admin/appointments", "_blank");
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
  }, {} as Record<string, Notification[]>);

  const filteredNotifications = Object.entries(groupedNotifications).reduce(
    (acc, [date, notifs]) => {
      const filtered = notifs.filter((notification) => {
        // Apply status filter
        if (filter === "all") {
          // Continue to time range check
        } else if (filter === "unread") {
          if (notification.read) return false;
        } else if (filter === "read") {
          if (!notification.read) return false;
        }

        // Apply time range filter
        const notifDate = notification.timestamp?.toDate?.() || notification.createdAt?.toDate?.() || new Date();
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const notifDay = new Date(notifDate.getFullYear(), notifDate.getMonth(), notifDate.getDate());

        if (timeRange === "today") {
          return notifDay.getTime() === today.getTime();
        } else if (timeRange === "week") {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return notifDate >= weekAgo;
        } else if (timeRange === "month") {
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return notifDate >= monthAgo;
        } else if (timeRange === "year") {
          const yearAgo = new Date(today);
          yearAgo.setFullYear(yearAgo.getFullYear() - 1);
          return notifDate >= yearAgo;
        }

        // "all-time" or default
        return true;
      });

      if (filtered.length > 0) {
        acc[date] = filtered;
      }

      return acc;
    },
    {} as Record<string, Notification[]>
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (isLoading) {
    return (
      <AdminDashboardLayout>
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
      </AdminDashboardLayout>
    );
  }

  return (
    <AdminDashboardLayout>
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

        {/* Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Tabs defaultValue="all" onValueChange={setFilter} className="flex-1">
            <TabsList className="grid grid-cols-3 md:w-auto">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">Unread</TabsTrigger>
              <TabsTrigger value="read">Read</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Time Range Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                {timeRange === "today"
                  ? "Today"
                  : timeRange === "week"
                  ? "This Week"
                  : timeRange === "month"
                  ? "This Month"
                  : timeRange === "year"
                  ? "This Year"
                  : "All Time"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTimeRange("today")}>
                Today
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTimeRange("week")}>
                This Week
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTimeRange("month")}>
                This Month
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTimeRange("year")}>
                This Year
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTimeRange("all-time")}>
                All Time
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

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
                  ? "You don't have any unread notifications."
                  : filter === "read"
                  ? "You don't have any read notifications."
                  : "You don't have any notifications yet."}
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
                              notification.type === "message"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                                : notification.notificationType ===
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
                                : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                            }`}
                          >
                            {notification.type === "message" ? (
                              <Mail className="h-4 w-4" />
                            ) : notification.notificationType ===
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
                            ) : (
                              <CheckCircle className="h-4 w-4" />
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
                                      : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
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
                                    : "Completed"}
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
                                          window.open(
                                            `/dashboard/admin/appointments?view=${notification.metadata?.appointmentId}`,
                                            "_blank"
                                          );
                                        }}
                                      >
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Appointment
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(
                                          "/dashboard/admin/appointments",
                                          "_blank"
                                        );
                                      }}
                                    >
                                      <Calendar className="h-4 w-4 mr-2" />
                                      All Appointments
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
    </AdminDashboardLayout>
  );
}
