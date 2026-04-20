import { db } from "./firebase/config";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
  onSnapshot,
} from "firebase/firestore";

export interface Notification {
  id: string;
  userId: string;
  type: "appointment" | "message" | "inquiry" | "system" | "document" | "case";
  title: string;
  message: string;
  metadata?: {
    appointmentId?: string;
    conversationId?: string;
    inquiryId?: string;
    documentId?: string;
    caseId?: string;
    clientName?: string;
    senderName?: string;
    [key: string]: any;
  };
  read: boolean;
  priority: "low" | "medium" | "high";
  createdAt: Timestamp | Date;
  actionUrl?: string;
}

export class NotificationService {
  private static cleanMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) return undefined;
    
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (value !== undefined && value !== null) {
        cleaned[key] = value;
      }
    }
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }

  static async createNotification(
    notification: Omit<Notification, "id" | "createdAt">
  ): Promise<string> {
    try {
      const notificationsRef = collection(db, "notifications");
      const notificationData = {
        ...notification,
        metadata: this.cleanMetadata(notification.metadata),
        createdAt: Timestamp.now(),
      };
      const docRef = await addDoc(notificationsRef, notificationData);
      return docRef.id;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  static async getNotifications(userId: string): Promise<Notification[]> {
    try {
      const notificationsRef = collection(db, "notifications");
      const q = query(
        notificationsRef,
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Notification[];
    } catch (error) {
      console.error("Error getting notifications:", error);
      return [];
    }
  }

  static async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const notificationRef = doc(db, "notifications", notificationId);
      await updateDoc(notificationRef, {
        read: true,
      });
      return true;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return false;
    }
  }

  static async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const notifications = await this.getNotifications(userId);
      const unreadNotifications = notifications.filter((n) => !n.read);

      const updatePromises = unreadNotifications.map((notification) =>
        this.markAsRead(notification.id)
      );

      await Promise.all(updatePromises);
      return true;
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      return false;
    }
  }

  static async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const notificationRef = doc(db, "notifications", notificationId);
      await deleteDoc(notificationRef);
      return true;
    } catch (error) {
      console.error("Error deleting notification:", error);
      return false;
    }
  }

  static subscribeToNotifications(
    userId: string,
    callback: (notifications: Notification[]) => void
  ): () => void {
    const notificationsRef = collection(db, "notifications");
    const q = query(
      notificationsRef,
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Notification[];
      callback(notifications);
    });

    return unsubscribe;
  }

  static async createAppointmentNotification(
    userId: string,
    appointmentId: string,
    clientName: string,
    type: "new" | "cancelled" | "updated" | "reminder"
  ): Promise<string> {
    const title =
      type === "new"
        ? "New Appointment Request"
        : type === "cancelled"
        ? "Appointment Cancelled"
        : type === "updated"
        ? "Appointment Updated"
        : "Appointment Reminder";

    const message =
      type === "new"
        ? `New appointment request from ${clientName}`
        : type === "cancelled"
        ? `Appointment with ${clientName} has been cancelled`
        : type === "updated"
        ? `Appointment with ${clientName} has been updated`
        : `Reminder: Appointment with ${clientName} is coming up`;

    return this.createNotification({
      userId,
      type: "appointment",
      title,
      message,
      metadata: { appointmentId, clientName },
      read: false,
      priority: type === "cancelled" ? "medium" : "high",
      actionUrl: `/dashboard/admin/appointments/${appointmentId}`,
    });
  }

  static async createMessageNotification(
    userId: string,
    conversationId: string,
    senderName: string,
    message: string
  ): Promise<string> {
    return this.createNotification({
      userId,
      type: "message",
      title: "New Message",
      message: `New message from ${senderName}`,
      metadata: { conversationId, senderName, message },
      read: false,
      priority: "high",
      actionUrl: `/dashboard/admin/messages`,
    });
  }

  static async createInquiryNotification(
    userId: string,
    inquiryId: string,
    clientName: string,
    subject: string
  ): Promise<string> {
    return this.createNotification({
      userId,
      type: "inquiry",
      title: "New Inquiry",
      message: `New inquiry from ${clientName}`,
      metadata: { inquiryId, clientName, subject },
      read: false,
      priority: "high",
      actionUrl: `/dashboard/admin/inquiries`,
    });
  }
}
