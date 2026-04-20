"use client";

import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AdminDashboardLayout } from "@/components/admin-dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Send, User, Phone, Mail, Clock } from "lucide-react";
import MessagingService, { Message, Conversation } from "@/lib/message-service";
import { useAuth } from "@/hooks/useAuth";

export default function AdminMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unsubscribeRefs = useRef<(() => void)[]>([]);

  const { user, userProfile } = useAuth();

  useEffect(() => {
    const unsubscribe = MessagingService.getConversations(
      (fetchedConversations) => {
        console.log("Received conversations:", fetchedConversations.length);
        setConversations(fetchedConversations);
        setLoading(false);
      }
    );

    unsubscribeRefs.current.push(unsubscribe);

    return () => {
      unsubscribeRefs.current.forEach((unsub) => unsub());
      unsubscribeRefs.current = [];
    };
  }, []);

  useEffect(() => {
    if (!selectedConversation) return;

    console.log("Selected conversation:", selectedConversation.id);

    const unsubscribe = MessagingService.getMessages(
      selectedConversation.id,
      (fetchedMessages) => {
        console.log("Received messages:", fetchedMessages.length);
        setMessages(fetchedMessages);

        if (user?.uid) {
          MessagingService.markMessagesAsRead(
            selectedConversation.id,
            user.uid
          );
        }
      }
    );

    unsubscribeRefs.current.push(unsubscribe);

    return () => {
      unsubscribe();
    };
  }, [selectedConversation, user?.uid]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages]);

  const handleSelectConversation = (conversation: Conversation) => {
    console.log("Selecting conversation:", conversation.id);
    setSelectedConversation(conversation);
    setNewMessage("");
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user || !userProfile) {
      console.error("Cannot send message: Missing user or conversation");
      return;
    }

    try {
      console.log("Sending admin message:", newMessage);

      const messageData = {
        text: newMessage,
        senderId: user.uid,
        senderName: userProfile.firstName || "Atty. Alia Jan Delgado",
        senderRole: "admin" as const,
      };

      console.log("Message data:", messageData);
      await MessagingService.sendMessage(selectedConversation.id, messageData);
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return "Invalid Date";

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diff = now.getTime() - date.getTime();

      if (diff < 24 * 60 * 60 * 1000) {
        return date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      } else if (diff < 7 * 24 * 60 * 60 * 1000) {
        return date.toLocaleDateString([], { weekday: "short" });
      } else {
        return date.toLocaleDateString([], { month: "short", day: "numeric" });
      }
    } catch (error) {
      console.error("Error formatting time:", error);
      return "Invalid Date";
    }
  };

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return "";

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Error formatting message time:", error);
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

  return (
    <AdminDashboardLayout>
      <div className="space-y-6 h-full">
        <div>
          <h1 className="text-3xl font-bold text-navy-900 dark:text-white">
            Messages
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage client conversations
            {conversations.length > 0 &&
              ` • ${conversations.length} conversation${
                conversations.length > 1 ? "s" : ""
              }`}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-200px)]">
          {/* Conversations List - NO CHANGES */}
          <Card className="col-span-1 lg:col-span-1 border-gray-200 dark:border-gray-700 flex flex-col min-h-0 overflow-hidden">
            <CardHeader className="pb-3 shrink-0">
              <CardTitle className="text-lg">Clients</CardTitle>
              <CardDescription>
                {conversations.length} active conversation
                {conversations.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full w-full">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-600">
                      Loading conversations...
                    </p>
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No conversations yet</p>
                  </div>
                ) : (
                  <div className="space-y-1 px-4">
                    {conversations.map((conversation) => (
                      <button
                        key={conversation.id}
                        onClick={() => handleSelectConversation(conversation)}
                        className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                          selectedConversation?.id === conversation.id
                            ? "bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500"
                            : "hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <User className="h-3 w-3 text-gray-500" />
                              <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                                {conversation.clientName}
                              </h4>
                              {conversation.unreadCount > 0 && (
                                <Badge className="bg-red-500 text-white text-xs h-5 min-w-5 flex items-center justify-center">
                                  {conversation.unreadCount}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                              {conversation.lastMessage}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="h-3 w-3 text-gray-400" />
                              <p className="text-xs text-gray-500">
                                {formatTime(conversation.lastMessageTime)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Area - FIXED SCROLLING SECTION */}
          <Card className="col-span-1 lg:col-span-3 border-gray-200 dark:border-gray-700 flex flex-col min-h-0 h-full">
            {selectedConversation ? (
              <>
                <CardHeader className="border-b border-gray-200 dark:border-gray-700 shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        {selectedConversation.clientName}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-1">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          Client ID:{" "}
                          {selectedConversation.clientId?.substring(0, 8) ||
                            "N/A"}
                          ...
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {selectedConversation.createdAt?.toDate
                            ? selectedConversation.createdAt
                                .toDate()
                                .toLocaleDateString()
                            : "Invalid Date"}
                        </span>
                      </CardDescription>
                    </div>
                    {selectedConversation.unreadCount > 0 && (
                      <Badge className="bg-red-500 text-white">
                        {selectedConversation.unreadCount} unread
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                {/* FIXED: This container controls scrolling */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  {/* Messages Area - This scrolls */}
                  <div className="flex-1 overflow-hidden p-4">
                    <ScrollArea className="h-full pr-4">
                      <div className="space-y-4">
                        {messages.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <p>No messages yet in this conversation</p>
                          </div>
                        ) : (
                          messages.map((message, index) => {
                            const formatReadStatus = () => {
                              if (message.senderRole === "admin") {
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
                                  message.senderRole === "admin" ? "justify-end" : "justify-start"
                                }`}>
                                  {message.senderRole === "admin" && (
                                    <div className="flex items-center">
                                      <p className="text-xs text-gray-500 italic">{formatReadStatus()}</p>
                                    </div>
                                  )}

                                  <div className={`max-w-xs px-4 py-2 rounded-lg ${
                                    message.senderRole === "admin"
                                      ? "bg-red-100 text-gray-900 rounded-br-none"
                                      : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none"
                                  }`}>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-medium text-xs opacity-90">{message.senderName}</span>
                                      {!message.read && message.senderRole === "client" && (
                                        <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
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
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 p-4 shrink-0">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type your reply..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="flex-1 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || !user}
                        className="bg-red-500 hover:bg-red-600 text-white"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    No conversation selected
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Select a client to start messaging
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AdminDashboardLayout>
  );
}
