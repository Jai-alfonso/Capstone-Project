"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ClientDashboardLayout } from "@/components/client-dashboard-layout";
import MessagingService, { Message, Conversation } from "@/lib/message-service";
import { useAuth } from "@/hooks/useAuth";

export default function ClientMessagesPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const hasMarkedReadRef = useRef(false);

  useEffect(() => {
    if (authLoading) {
      console.log("Waiting for auth to load...");
      return;
    }

    if (!user || !userProfile) {
      console.log("User not authenticated");
      setLoading(false);
      setError("Please sign in to access messages");
      return;
    }

    const initConversation = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("Initializing conversation for user:", user.uid);

        const clientName =
          `${userProfile.firstName || ""} ${
            userProfile.lastName || ""
          }`.trim() ||
          user.email ||
          "Client";

        const conv = await MessagingService.getOrCreateConversation(
          user.uid,
          clientName,
          user.email
        );

        console.log("Conversation initialized:", conv);
        setConversation(conv);
        hasMarkedReadRef.current = false;
      } catch (error: any) {
        console.error("Error initializing conversation:", error);
        setError(
          error.message || "Failed to load conversation. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    initConversation();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [user, userProfile, authLoading]);

  useEffect(() => {
    if (!conversation || !user) return;

    console.log(
      "Setting up message subscription for conversation:",
      conversation.id
    );

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    const unsubscribe = MessagingService.getMessages(
      conversation.id,
      (fetchedMessages) => {
        console.log("Received messages:", fetchedMessages.length);
        setMessages(fetchedMessages);

        const unreadMessages = fetchedMessages.filter(
          (msg) => msg.senderRole !== "client" && !msg.read
        );

        if (unreadMessages.length > 0 && !hasMarkedReadRef.current) {
          console.log("Marking", unreadMessages.length, "messages as read");
          MessagingService.markMessagesAsRead(conversation.id, user.uid);
          hasMarkedReadRef.current = true;
        }
      },
      (error) => {
        console.error("Message subscription error:", error);
        setError("Connection to chat lost. Please refresh the page.");
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [conversation, user]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages]);

  useEffect(() => {
    if (conversation && user && !hasMarkedReadRef.current) {
      const timer = setTimeout(() => {
        console.log("Marking all messages as read on page load");
        MessagingService.markMessagesAsRead(conversation.id, user.uid);
        hasMarkedReadRef.current = true;
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [conversation, user]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversation || !user || !userProfile) return;

    try {
      setSending(true);
      console.log("Sending message:", newMessage);

      const messageData = {
        text: newMessage,
        senderId: user.uid,
        senderName:
          `${userProfile.firstName || ""} ${
            userProfile.lastName || ""
          }`.trim() ||
          user.email ||
          "Client",
        senderRole: "client" as const,
      };

      await MessagingService.sendMessage(conversation.id, messageData);
      setNewMessage("");
    } catch (error: any) {
      console.error("Error sending message:", error);
      setError("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sending) {
        handleSendMessage();
      }
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return "";

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Error formatting time:", error);
      return "";
    }
  };

  const formatFullTimestamp = (timestamp: any) => {
    if (!timestamp) return "";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const weekday = date.toLocaleDateString(undefined, { weekday: "long" });
      const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return `${weekday} at ${time}`;
    } catch (error) {
      console.error("Error formatting full timestamp:", error);
      return "";
    }
  };

  const isFirstMessageOfDay = (currentMessage: any, index: number) => {
    if (index === 0) return true;
    const currentDate = currentMessage.timestamp?.toDate
      ? currentMessage.timestamp.toDate().toLocaleDateString()
      : new Date(currentMessage.timestamp).toLocaleDateString();
    const previousDate = messages[index - 1].timestamp?.toDate
      ? messages[index - 1].timestamp.toDate().toLocaleDateString()
      : new Date(messages[index - 1].timestamp).toLocaleDateString();
    return currentDate !== previousDate;
  };

  const retryConnection = () => {
    setError(null);
    if (user && userProfile) {
      const initConversation = async () => {
        try {
          setLoading(true);
          const clientName =
            `${userProfile.firstName || ""} ${
              userProfile.lastName || ""
            }`.trim() ||
            user.email ||
            "Client";
          const conv = await MessagingService.getOrCreateConversation(
            user.uid,
            clientName,
            user.email
          );
          setConversation(conv);
        } catch (error) {
          console.error("Retry failed:", error);
          setError("Failed to reconnect. Please refresh the page.");
        } finally {
          setLoading(false);
        }
      };
      initConversation();
    }
  };

  if (authLoading || loading) {
    return (
      <ClientDashboardLayout>
        <div className="flex items-center justify-center h-[70vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-red-600 mx-auto" />
            <p className="mt-4 text-gray-600">Loading messages...</p>
          </div>
        </div>
      </ClientDashboardLayout>
    );
  }

  return (
    <ClientDashboardLayout>
      <div className="space-y-6 h-full">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold font-serif bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
            Messages
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Chat directly with the office staff about your case.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex justify-between items-center">
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={retryConnection}
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Card className="flex-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm flex flex-col overflow-hidden h-[calc(100vh-200px)]">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-700 dark:to-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Atty. Alia Jan Delgado
                </h2>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {conversation ? "Online" : "Connecting..."}
                </p>
              </div>
              {conversation && (
                <div className="text-xs text-gray-500">
                  Conversation ID: {conversation.id.substring(0, 8)}...
                </div>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                    <Send className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 mb-2">No messages yet</p>
                  <p className="text-sm text-gray-400">
                    Start the conversation by sending a message below
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Any inquiries from the contact form will appear here
                    automatically.
                  </p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const formatReadStatus = () => {
                    if (message.senderRole === "client") {
                      if (message.read) {
                        const timestamp = message.timestamp;
                        const date = timestamp?.toDate
                          ? timestamp.toDate()
                          : new Date(timestamp);
                        const time = date.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                        return `Read ${time}`;
                      }
                      return "Delivered";
                    }
                    return "";
                  };

                  return (
                    <div key={message.id}>
                      {isFirstMessageOfDay(message, index) && (
                        <div className="w-full flex justify-center">
                          <p className="text-xs text-gray-500">{formatFullTimestamp(message.timestamp)}</p>
                        </div>
                      )}

                      <div className={`flex gap-2 ${
                        message.senderRole === "client" ? "justify-end" : "justify-start"
                      }`}>
                        {message.senderRole === "client" && (
                          <div className="flex items-center">
                            <p className="text-xs text-gray-500 italic">{formatReadStatus()}</p>
                          </div>
                        )}

                        <div
                          className={`max-w-xs px-4 py-2 rounded-lg ${
                            message.senderRole === "client"
                              ? "bg-red-100 text-gray-900 shadow-md"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-xs opacity-90">
                              {message.senderName}
                            </span>
                            {!message.read &&
                              message.senderRole === "client" && (
                                <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                              )}
                          </div>
                          <p className="text-sm">{message.text}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            <div className="flex gap-2">
              <Input
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 focus:border-red-500 focus:ring-red-500"
                disabled={!conversation || sending}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || !conversation || sending}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                size="icon"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            {!conversation && (
              <p className="text-xs text-red-500 mt-2 text-center">
                Unable to connect to chat. Please refresh the page.
              </p>
            )}
          </div>
        </Card>
      </div>
    </ClientDashboardLayout>
  );
}
