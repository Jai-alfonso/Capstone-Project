import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  Timestamp,
  deleteDoc,
  limit,
  serverTimestamp,
  writeBatch,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderRole: "client" | "admin";
  timestamp: Timestamp;
  read: boolean;
  conversationId: string;
  type?: "text" | "image" | "file";
  fileUrl?: string;
  fileName?: string;
}

export interface Conversation {
  id: string;
  clientId: string;
  clientName: string;
  lastMessage: string;
  lastMessageTime: Timestamp;
  unreadCount: number;
  adminId: string;
  createdAt: Timestamp;
  isArchived?: boolean;
  archivedAt?: Timestamp;
  clientEmail?: string;
  status?: "active" | "resolved" | "pending";
  assignedAdmin?: string;
  tags?: string[];
}

export interface Inquiry {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  dateSubmitted: Timestamp;
  status: "unread" | "read" | "replied" | "archived";
  type: "inquiry";
  userId?: string;
  conversationId?: string;
  replyMessage?: string;
  repliedAt?: Timestamp;
  repliedBy?: string;
  emailSent?: boolean;
  emailSentAt?: Timestamp;
  emailError?: string;
}

class MessagingService {
  private readonly MESSAGES_COLLECTION = "messages";
  private readonly CONVERSATIONS_COLLECTION = "conversations";
  private readonly INQUIRIES_COLLECTION = "inquiries";
  private readonly WELCOME_ADMIN_ID = "admin";
  private readonly WELCOME_ADMIN_NAME = "Atty. Alia Jan Delgado";

  private readonly EMAIL_API_URL = "/api/email";

  private getFirestore() {
    return db;
  }

  private cleanFirestoreData(data: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) {
        continue;
      }
      cleaned[key] = value;
    }

    return cleaned;
  }

  private cleanMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) return undefined;
    
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (value !== undefined && value !== null) {
        cleaned[key] = value;
      }
    }
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }

  async getOrCreateConversation(
    clientId: string,
    clientName: string,
    clientEmail?: string
  ): Promise<Conversation> {
    try {
      console.log("Creating or getting conversation for:", clientId);

      const db = this.getFirestore();
      const conversationsRef = collection(db, this.CONVERSATIONS_COLLECTION);

      const q = query(
        conversationsRef,
        where("clientId", "==", clientId),
        limit(1)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        const conversation = this.convertToConversation(docSnap);
        console.log("Found existing conversation:", conversation.id);
        return conversation;
      }

      return await this.createNewConversation(
        clientId,
        clientName,
        clientEmail
      );
    } catch (error: any) {
      console.error("Error in getOrCreateConversation:", error);

      return this.createNewConversation(clientId, clientName, clientEmail);
    }
  }

  private async createNewConversation(
    clientId: string,
    clientName: string,
    clientEmail?: string
  ): Promise<Conversation> {
    const db = this.getFirestore();
    const conversationsRef = collection(db, this.CONVERSATIONS_COLLECTION);
    const now = Timestamp.now();

    const conversationData = {
      clientId,
      clientName,
      clientEmail: clientEmail || "",
      lastMessage: "Conversation started",
      lastMessageTime: now,
      unreadCount: 0,
      adminId: this.WELCOME_ADMIN_ID,
      createdAt: now,
      isArchived: false,
      status: "active",
    };

    const docRef = await addDoc(conversationsRef, conversationData);
    console.log("Created new conversation:", docRef.id);

    await this.sendWelcomeMessage(docRef.id, clientName);

    return {
      id: docRef.id,
      ...conversationData,
    } as Conversation;
  }

  private convertToConversation(
    docSnap: QueryDocumentSnapshot<DocumentData>
  ): Conversation {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      clientId: data.clientId || "",
      clientName: data.clientName || "",
      clientEmail: data.clientEmail || "",
      lastMessage: data.lastMessage || "No messages yet",
      lastMessageTime: data.lastMessageTime || Timestamp.now(),
      unreadCount: data.unreadCount || 0,
      adminId: data.adminId || this.WELCOME_ADMIN_ID,
      createdAt: data.createdAt || Timestamp.now(),
      isArchived: data.isArchived || false,
      status: data.status || "active",
      assignedAdmin: data.assignedAdmin || "",
      tags: data.tags || [],
    };
  }

  private async sendWelcomeMessage(conversationId: string, clientName: string) {
    try {
      const db = this.getFirestore();
      const messagesRef = collection(db, this.MESSAGES_COLLECTION);

      const welcomeMessage = {
        text: `Welcome ${clientName}! I'm Atty. Alia Jan Delgado. How can I help you with your case today?`,
        senderId: this.WELCOME_ADMIN_ID,
        senderName: this.WELCOME_ADMIN_NAME,
        senderRole: "admin" as const,
        timestamp: serverTimestamp(),
        read: false,
        conversationId,
        type: "text" as const,
      };

      await addDoc(messagesRef, welcomeMessage);
      console.log("Welcome message sent");
    } catch (error) {
      console.error("Error sending welcome message:", error);
    }
  }

  async sendMessage(
    conversationId: string,
    messageData: {
      text: string;
      senderId: string;
      senderName: string;
      senderRole: "client" | "admin";
      type?: "text" | "image" | "file";
      fileUrl?: string;
      fileName?: string;
    }
  ): Promise<string> {
    try {
      console.log("Sending message to conversation:", conversationId);

      if (!messageData.text?.trim() && !messageData.fileUrl) {
        throw new Error("Message text or file is required");
      }

      const db = this.getFirestore();
      const messagesRef = collection(db, this.MESSAGES_COLLECTION);

      const message = {
        ...messageData,
        text: messageData.text?.trim() || "",
        conversationId,
        timestamp: serverTimestamp(),
        // New messages are unread by the recipient until they read them
        read: false,
        type: messageData.type || "text",
        fileUrl: messageData.fileUrl || "",
        fileName: messageData.fileName || "",
      };

      const docRef = await addDoc(messagesRef, message);

      await this.updateConversationLastMessage(
        conversationId,
        messageData.text ||
          (messageData.fileName
            ? `Sent a file: ${messageData.fileName}`
            : "Sent a file"),
        messageData.senderRole
      );

      // Create notification for admin when client sends a message
      if (messageData.senderRole === "client") {
        await this.createMessageNotificationForAdmin(
          conversationId,
          messageData.senderName,
          messageData.text || `Sent a file: ${messageData.fileName}`
        );
      }

      console.log("Message sent with ID:", docRef.id);
      return docRef.id;
    } catch (error: any) {
      console.error("Error sending message:", error);
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  private async updateConversationLastMessage(
    conversationId: string,
    text: string,
    senderRole: "client" | "admin"
  ) {
    try {
      const db = this.getFirestore();
      const conversationRef = doc(
        db,
        this.CONVERSATIONS_COLLECTION,
        conversationId
      );

      const updates: any = {
        lastMessage: text.length > 50 ? text.substring(0, 47) + "..." : text,
        lastMessageTime: serverTimestamp(),
        status: "active",
      };

      const conversationSnap = await getDoc(conversationRef);
      if (conversationSnap.exists()) {
        const currentData = conversationSnap.data();
        const currentUnread = currentData.unreadCount || 0;

        if (senderRole === "client") {
          updates.unreadCount = currentUnread + 1;
        } else {
          updates.unreadCount = 0;
        }
      }

      await updateDoc(conversationRef, updates);
      console.log("Conversation updated with last message");
    } catch (error) {
      console.error("Error updating conversation:", error);
    }
  }

  getMessages(
    conversationId: string,
    callback: (messages: Message[]) => void,
    onError?: (error: Error) => void
  ) {
    console.log(`Subscribing to messages for conversation: ${conversationId}`);

    const db = this.getFirestore();
    const messagesRef = collection(db, this.MESSAGES_COLLECTION);
    const q = query(
      messagesRef,
      where("conversationId", "==", conversationId),
      orderBy("timestamp", "asc")
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const messages = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              text: doc.data().text || "",
              senderId: doc.data().senderId,
              senderName: doc.data().senderName,
              senderRole: doc.data().senderRole,
              timestamp: doc.data().timestamp || Timestamp.now(),
              read: doc.data().read || false,
              conversationId: doc.data().conversationId,
              type: doc.data().type || "text",
              fileUrl: doc.data().fileUrl,
              fileName: doc.data().fileName,
            } as Message)
        );

        console.log(`Received ${messages.length} messages`);
        callback(messages);
      },
      (error) => {
        console.error("Error in message subscription:", error);
        if (onError) onError(error);
        callback([]);
      }
    );
  }

  async markMessagesAsRead(conversationId: string, userId: string) {
    try {
      console.log(
        `Marking messages as read for conversation: ${conversationId}`
      );

      const db = this.getFirestore();
      const messagesRef = collection(db, this.MESSAGES_COLLECTION);
      const q = query(
        messagesRef,
        where("conversationId", "==", conversationId),
        where("read", "==", false),
        where("senderId", "!=", userId)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const batch = writeBatch(db);

        snapshot.docs.forEach((messageDoc) => {
          const messageRef = doc(db, this.MESSAGES_COLLECTION, messageDoc.id);
          batch.update(messageRef, { read: true });
        });

        const conversationRef = doc(
          db,
          this.CONVERSATIONS_COLLECTION,
          conversationId
        );
        batch.update(conversationRef, { unreadCount: 0 });

        await batch.commit();
        console.log(`Marked ${snapshot.docs.length} messages as read`);
      }
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  }

  getConversations(
    callback: (conversations: Conversation[]) => void,
    onError?: (error: Error) => void
  ) {
    console.log("Subscribing to conversations");

    const db = this.getFirestore();
    const conversationsRef = collection(db, this.CONVERSATIONS_COLLECTION);

    const q = query(
      conversationsRef,
      orderBy("lastMessageTime", "desc"),
      limit(50)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const conversations = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              clientId: data.clientId || "",
              clientName: data.clientName || "",
              clientEmail: data.clientEmail || "",
              lastMessage: data.lastMessage || "No messages yet",
              lastMessageTime: data.lastMessageTime || Timestamp.now(),
              unreadCount: data.unreadCount || 0,
              adminId: data.adminId || this.WELCOME_ADMIN_ID,
              createdAt: data.createdAt || Timestamp.now(),
              isArchived: data.isArchived || false,
              status: data.status || "active",
            } as Conversation;
          })
          .filter((conv) => !conv.isArchived);

        console.log(`Received ${conversations.length} active conversations`);
        callback(conversations);
      },
      (error) => {
        console.error("Error in conversations subscription:", error);
        if (onError) onError(error);
        callback([]);
      }
    );
  }

  async saveInquiry(inquiryData: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
    userId?: string;
  }): Promise<string> {
    try {
      console.log("Saving inquiry:", inquiryData.email);

      const db = this.getFirestore();
      const inquiriesRef = collection(db, this.INQUIRIES_COLLECTION);

      const inquiry: Record<string, any> = {
        firstName: inquiryData.firstName || "",
        lastName: inquiryData.lastName || "",
        email: inquiryData.email || "",
        subject: inquiryData.subject || "",
        message: inquiryData.message || "",
        dateSubmitted: serverTimestamp(),
        status: "unread",
        type: "inquiry",
      };

      if (inquiryData.phone !== undefined && inquiryData.phone !== "") {
        inquiry.phone = inquiryData.phone;
      }

      if (inquiryData.userId !== undefined && inquiryData.userId !== "") {
        inquiry.userId = inquiryData.userId;
      }

      console.log("Inquiry data to save:", inquiry);

      const docRef = await addDoc(inquiriesRef, inquiry);
      console.log("Inquiry saved with ID:", docRef.id);

      if (inquiryData.userId && inquiryData.userId.trim() !== "") {
        try {
          const conversation = await this.getOrCreateConversation(
            inquiryData.userId,
            `${inquiryData.firstName} ${inquiryData.lastName}`,
            inquiryData.email
          );

          await this.sendMessage(conversation.id, {
            text: `[Contact Form] ${inquiryData.subject}\n\n${inquiryData.message}`,
            senderId: inquiryData.userId,
            senderName: `${inquiryData.firstName} ${inquiryData.lastName}`,
            senderRole: "client" as const,
          });

          await updateDoc(doc(db, this.INQUIRIES_COLLECTION, docRef.id), {
            conversationId: conversation.id,
          });

          return `conversation:${conversation.id}`;
        } catch (convError) {
          console.error("Error creating conversation for inquiry:", convError);
        }
      }

      return `inquiry:${docRef.id}`;
    } catch (error: any) {
      console.error("Error saving inquiry:", error);
      throw new Error(`Failed to save inquiry: ${error.message}`);
    }
  }

  getInquiries(
    callback: (inquiries: Inquiry[]) => void,
    filters?: {
      status?: string;
    },
    onError?: (error: Error) => void
  ) {
    console.log("Subscribing to inquiries");

    const db = this.getFirestore();
    const inquiriesRef = collection(db, this.INQUIRIES_COLLECTION);

    const constraints: any[] = [];

    if (filters?.status) {
      constraints.push(where("status", "==", filters.status));
    }

    constraints.push(orderBy("dateSubmitted", "desc"));

    const q = query(inquiriesRef, ...constraints);

    return onSnapshot(
      q,
      (snapshot) => {
        const inquiries = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            email: data.email || "",
            phone: data.phone || "",
            subject: data.subject || "",
            message: data.message || "",
            dateSubmitted: data.dateSubmitted || Timestamp.now(),
            status: data.status || "unread",
            type: data.type || "inquiry",
            userId: data.userId || "",
            conversationId: data.conversationId || "",
            replyMessage: data.replyMessage || "",
            repliedAt: data.repliedAt || null,
            repliedBy: data.repliedBy || "",
            emailSent: data.emailSent || false,
            emailSentAt: data.emailSentAt || null,
            emailError: data.emailError || "",
          } as Inquiry;
        });

        console.log(`Received ${inquiries.length} inquiries`);
        callback(inquiries);
      },
      (error) => {
        console.error("Error in inquiries subscription:", error);
        if (onError) onError(error);
        callback([]);
      }
    );
  }

  async convertInquiryToConversation(inquiryId: string): Promise<Conversation> {
    try {
      const db = this.getFirestore();
      const inquiryRef = doc(db, this.INQUIRIES_COLLECTION, inquiryId);
      const inquirySnap = await getDoc(inquiryRef);

      if (!inquirySnap.exists()) {
        throw new Error("Inquiry not found");
      }

      const inquiryData = inquirySnap.data();

      const clientId = `guest_${inquiryData.email.replace(
        /[^a-zA-Z0-9]/g,
        "_"
      )}_${Date.now()}`;

      const conversation = await this.getOrCreateConversation(
        clientId,
        `${inquiryData.firstName} ${inquiryData.lastName}`,
        inquiryData.email
      );

      await this.sendMessage(conversation.id, {
        text: `[Contact Form] ${inquiryData.subject}\n\n${inquiryData.message}`,
        senderId: clientId,
        senderName: `${inquiryData.firstName} ${inquiryData.lastName}`,
        senderRole: "client" as const,
      });

      await updateDoc(inquiryRef, {
        conversationId: conversation.id,
        status: "replied",
      });

      console.log(
        `Converted inquiry ${inquiryId} to conversation ${conversation.id}`
      );
      return conversation;
    } catch (error: any) {
      console.error("Error converting inquiry to conversation:", error);
      throw new Error(`Failed to convert inquiry: ${error.message}`);
    }
  }

  async replyToInquiry(
    inquiryId: string,
    adminMessage: string,
    adminName: string
  ): Promise<void> {
    try {
      console.log("Attempting to reply to inquiry:", inquiryId);

      const db = this.getFirestore();
      const inquiryRef = doc(db, this.INQUIRIES_COLLECTION, inquiryId);
      const inquirySnap = await getDoc(inquiryRef);

      if (!inquirySnap.exists()) {
        throw new Error("Inquiry not found");
      }

      const inquiry = inquirySnap.data();
      const clientName = `${inquiry.firstName} ${inquiry.lastName}`;

      await updateDoc(inquiryRef, {
        status: "replied",
        replyMessage: adminMessage,
        repliedAt: serverTimestamp(),
        repliedBy: adminName,
      });

      console.log("Local status updated, attempting to send email...");

      try {
        await this.sendEmailViaAPI({
          to: inquiry.email,
          subject: `Re: ${inquiry.subject} - Delgado Law Office`,
          message: adminMessage,
          adminName: adminName,
          clientName: clientName,
          inquiryId: inquiryId,
          originalMessage: inquiry.message,
        });

        await updateDoc(inquiryRef, {
          emailSent: true,
          emailSentAt: serverTimestamp(),
          emailError: null,
        });

        console.log("Email sent successfully via API");
      } catch (emailError: any) {
        console.warn("Email API failed:", emailError);

        await updateDoc(inquiryRef, {
          emailSent: false,
          emailError: emailError.message || "Failed to send email",
        });
      }

      console.log(`Successfully processed inquiry ${inquiryId}`);
    } catch (error: any) {
      console.error("Error in replyToInquiry:", error);
      throw new Error(`Failed to process inquiry reply: ${error.message}`);
    }
  }

  private async sendEmailViaAPI(emailData: {
    to: string;
    subject: string;
    message: string;
    adminName: string;
    clientName: string;
    inquiryId: string;
    originalMessage?: string;
  }): Promise<void> {
    try {
      console.log(`Sending email via API to: ${emailData.to}`);

      const response = await fetch(this.EMAIL_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: emailData.to,
          subject: emailData.subject,
          message: emailData.message,
          adminName: emailData.adminName,
          clientName: emailData.clientName,
          inquiryId: emailData.inquiryId,
          originalMessage: emailData.originalMessage || "",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Email API failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Email sending failed");
      }

      console.log("Email sent successfully via API:", result);
    } catch (error: any) {
      console.error("Error sending email via API:", error);
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  async sendEmailNotification(
    to: string,
    subject: string,
    message: string,
    firstName?: string,
    lastName?: string,
    adminName?: string
  ): Promise<void> {
    const clientName =
      firstName && lastName ? `${firstName} ${lastName}` : "Client";

    try {
      await this.sendEmailViaAPI({
        to,
        subject,
        message,
        adminName: adminName || this.WELCOME_ADMIN_NAME,
        clientName,
        inquiryId: "notification",
        originalMessage: "",
      });
    } catch (error) {
      console.warn("Email service unavailable:", error);
    }
  }

  async updateInquiryStatus(
    inquiryId: string,
    status: Inquiry["status"]
  ): Promise<void> {
    try {
      const db = this.getFirestore();
      const inquiryRef = doc(db, this.INQUIRIES_COLLECTION, inquiryId);
      await updateDoc(inquiryRef, { status });
      console.log(`Updated inquiry ${inquiryId} status to ${status}`);
    } catch (error: any) {
      console.error("Error updating inquiry status:", error);
      throw new Error(`Failed to update inquiry: ${error.message}`);
    }
  }

  static formatTimestamp(timestamp: Timestamp): string {
    if (!timestamp) return "";
    try {
      const date = timestamp.toDate();
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours < 24) {
        return date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      } else if (diffHours < 48) {
        return "Yesterday";
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      return "";
    }
  }

  private async createMessageNotificationForAdmin(
    conversationId: string,
    clientName: string,
    messageText: string
  ) {
    // Make notification creation non-blocking to prevent timeouts
    // Use setTimeout(fn, 0) to schedule in background
    setTimeout(async () => {
      try {
        const notificationsRef = collection(db, "notifications");

        // Hardcode an admin UID to avoid querying users collection
        const adminUid = "jpsEnY2B8xZZU9WAoFoUbXaYrnE3";

        const truncatedMessage = messageText.length > 100
          ? messageText.substring(0, 97) + "..."
          : messageText;

        const notificationData = {
          userId: adminUid,
          type: "message",
          title: `New message from ${clientName}`,
          message: truncatedMessage,
          metadata: this.cleanMetadata({
            conversationId,
            clientName,
            senderRole: "client",
          }),
          read: false,
          priority: "high",
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        console.log("[MessageService] Creating notification for admin (background):", adminUid, notificationData);
        await addDoc(notificationsRef, notificationData);
        console.log("[MessageService] Successfully created message notification (background)");
      } catch (error) {
        // Don't throw - background operation should not block main flow
        console.error("[MessageService] Error creating message notification (non-critical):", error);
      }
    }, 0);
  }
}

const messagingService = new MessagingService();
export default messagingService;
