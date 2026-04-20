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
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AdminDashboardLayout } from "@/components/admin-dashboard-layout";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  User,
  Mail,
  Phone as PhoneIcon,
  Clock,
  MessageSquare,
  Mail as MailIcon,
  Eye,
  Archive,
  Loader2,
  AlertCircle,
  CheckCircle,
  UserCheck,
} from "lucide-react";
import MessagingService, { Inquiry } from "@/lib/message-service";
import { useAuth } from "@/hooks/useAuth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [replying, setReplying] = useState(false);
  const [converting, setConverting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [filteredInquiries, setFilteredInquiries] = useState<Inquiry[]>([]);
  const [actionResult, setActionResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const unsubscribeRefs = useRef<(() => void)[]>([]);

  const { user } = useAuth();

  useEffect(() => {
    console.log("[Inquiries Page] Page component mounted");
    console.log("[Inquiries Page] User:", user);
  }, [user]);

  useEffect(() => {
    console.log("[Inquiries Page] Setting up inquiry listener");

    const unsubscribe = MessagingService.getInquiries((fetchedInquiries) => {
      console.log(
        "[Inquiries Page] Received inquiries:",
        fetchedInquiries.length
      );
      setInquiries(fetchedInquiries);
      setLoading(false);
    });

    unsubscribeRefs.current.push(unsubscribe);

    return () => {
      console.log("[Inquiries Page] Cleaning up listeners");
      unsubscribeRefs.current.forEach((unsub) => unsub());
      unsubscribeRefs.current = [];
    };
  }, []);

  useEffect(() => {
    if (statusFilter === "all") {
      setFilteredInquiries(inquiries);
    } else {
      setFilteredInquiries(
        inquiries.filter((inquiry) => inquiry.status === statusFilter)
      );
    }
  }, [inquiries, statusFilter]);

  const handleSelectInquiry = (inquiry: Inquiry) => {
    console.log("[Inquiries Page] Selecting inquiry:", inquiry.id);
    setSelectedInquiry(inquiry);
    setReplyMessage("");
    setActionResult(null);
  };

  const handleReplyToInquiry = async () => {
    if (!replyMessage.trim() || !selectedInquiry || !user) {
      setActionResult({
        success: false,
        message: "Please enter a reply message",
      });
      return;
    }

    try {
      setReplying(true);
      setActionResult(null);

      await MessagingService.replyToInquiry(
        selectedInquiry.id,
        replyMessage,
        "Atty. Alia Jan Delgado"
      );

      setReplyMessage("");
      setActionResult({
        success: true,
        message: "Reply sent successfully via email!",
      });

      setTimeout(() => {
        const updatedInquiry = { ...selectedInquiry, status: "replied" };
        setSelectedInquiry(updatedInquiry);
      }, 100);
    } catch (error: any) {
      console.error("[Inquiries Page] Error replying to inquiry:", error);
      setActionResult({
        success: false,
        message: error.message || "Failed to send reply. Please try again.",
      });
    } finally {
      setReplying(false);
    }
  };

  const handleConvertToConversation = async () => {
    if (!selectedInquiry || !user) return;

    try {
      setConverting(true);
      setActionResult(null);

      const conversation = await MessagingService.convertInquiryToConversation(
        selectedInquiry.id
      );

      setActionResult({
        success: true,
        message: `Inquiry converted to conversation! You can now chat with the user in the Messages section.`,
      });

      setTimeout(() => {
        const updatedInquiry = {
          ...selectedInquiry,
          status: "replied",
          conversationId: conversation.id,
        };
        setSelectedInquiry(updatedInquiry);
      }, 100);
    } catch (error: any) {
      console.error("[Inquiries Page] Error converting inquiry:", error);
      setActionResult({
        success: false,
        message:
          error.message || "Failed to convert inquiry. Please try again.",
      });
    } finally {
      setConverting(false);
    }
  };

  const handleUpdateStatus = async (
    inquiryId: string,
    status: Inquiry["status"]
  ) => {
    try {
      await MessagingService.updateInquiryStatus(inquiryId, status);

      if (selectedInquiry?.id === inquiryId) {
        setSelectedInquiry({ ...selectedInquiry, status });
      }

      setInquiries((prev) =>
        prev.map((inquiry) =>
          inquiry.id === inquiryId ? { ...inquiry, status } : inquiry
        )
      );
    } catch (error) {
      console.error("[Inquiries Page] Error updating status:", error);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return "";

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("[Inquiries Page] Error formatting time:", error);
      return "";
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      unread: "bg-red-500",
      read: "bg-blue-500",
      replied: "bg-green-500",
      archived: "bg-gray-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      unread: "Unread",
      read: "Read",
      replied: "Replied",
      archived: "Archived",
    };
    return texts[status] || status;
  };

  return (
    <AdminDashboardLayout>
      <div className="space-y-6 h-full">
        <div>
          <h1 className="text-3xl font-bold text-navy-900 dark:text-white">
            Contact Inquiries
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage contact form submissions from clients and visitors
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-200px)]">
          <Card className="col-span-1 lg:col-span-1 border-gray-200 dark:border-gray-700 flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Inquiries</CardTitle>
              <CardDescription>
                {filteredInquiries.length} of {inquiries.length} total
              </CardDescription>
              <div className="mt-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="unread">Unread</SelectItem>
                    <SelectItem value="read">Read</SelectItem>
                    <SelectItem value="replied">Replied</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              <ScrollArea className="h-full">
                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-red-600 mx-auto" />
                    <p className="mt-2 text-sm text-gray-600">
                      Loading inquiries...
                    </p>
                  </div>
                ) : filteredInquiries.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MailIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No inquiries found</p>
                  </div>
                ) : (
                  <div className="space-y-1 px-4 pb-4">
                    {filteredInquiries.map((inquiry) => (
                      <button
                        key={inquiry.id}
                        onClick={() => handleSelectInquiry(inquiry)}
                        className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                          selectedInquiry?.id === inquiry.id
                            ? "bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500"
                            : "hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {inquiry.userId ? (
                                <UserCheck className="h-3 w-3 text-green-500" />
                              ) : (
                                <User className="h-3 w-3 text-gray-500" />
                              )}
                              <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                                {inquiry.firstName} {inquiry.lastName}
                              </h4>
                              <Badge
                                className={`text-white text-xs h-5 px-1 ${getStatusBadge(
                                  inquiry.status
                                )}`}
                              >
                                {getStatusText(inquiry.status)}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                              {inquiry.subject}
                            </p>
                            <div className="flex items-center justify-between mt-1">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-gray-400" />
                                <p className="text-xs text-gray-500">
                                  {formatTime(inquiry.dateSubmitted)}
                                </p>
                              </div>
                              {inquiry.conversationId && (
                                <MessageSquare className="h-3 w-3 text-green-500" />
                              )}
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

          <Card className="col-span-1 lg:col-span-3 border-gray-200 dark:border-gray-700 flex flex-col">
            {selectedInquiry ? (
              <>
                <CardHeader className="border-b border-gray-200 dark:border-gray-700 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {selectedInquiry.userId ? (
                          <UserCheck className="h-5 w-5 text-green-500" />
                        ) : (
                          <User className="h-5 w-5" />
                        )}
                        {selectedInquiry.firstName} {selectedInquiry.lastName}
                      </CardTitle>
                      <CardDescription className="flex flex-col gap-1 mt-1">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {selectedInquiry.email}
                          </span>
                          {selectedInquiry.phone && (
                            <span className="flex items-center gap-1">
                              <PhoneIcon className="h-3 w-3" />
                              {selectedInquiry.phone}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(selectedInquiry.dateSubmitted)}
                        </div>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={selectedInquiry.status}
                        onValueChange={(value) =>
                          handleUpdateStatus(
                            selectedInquiry.id,
                            value as Inquiry["status"]
                          )
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unread">Unread</SelectItem>
                          <SelectItem value="read">Read</SelectItem>
                          <SelectItem value="replied">Replied</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                      {selectedInquiry.userId && (
                        <Badge className="bg-green-500">Registered</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 p-4 overflow-hidden flex flex-col">
                  {actionResult && (
                    <Alert
                      className={`mb-4 ${
                        actionResult.success
                          ? "bg-green-50 border-green-200"
                          : "bg-red-50 border-red-200"
                      }`}
                    >
                      {actionResult.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <AlertDescription
                        className={
                          actionResult.success
                            ? "text-green-800"
                            : "text-red-800"
                        }
                      >
                        {actionResult.message}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="mb-6">
                    <h3 className="font-semibold text-lg mb-2">
                      Subject: {selectedInquiry.subject}
                    </h3>

                    {selectedInquiry.emailSent !== undefined && (
                      <div className="mt-2 mb-3 flex items-center gap-2">
                        {selectedInquiry.emailError && (
                          <span className="text-xs text-red-500">
                            Error: {selectedInquiry.emailError}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                        {selectedInquiry.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-4">
                    {!selectedInquiry.conversationId &&
                      selectedInquiry.userId && (
                        <Button
                          onClick={handleConvertToConversation}
                          disabled={converting}
                          variant="outline"
                          className="border-green-500 text-green-600 hover:bg-green-50"
                        >
                          {converting ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <MessageSquare className="h-4 w-4 mr-2" />
                          )}
                          Convert to Chat
                        </Button>
                      )}
                  </div>

                  {!selectedInquiry.userId && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                      <h3 className="font-semibold text-lg mb-4">
                        Reply via Email
                      </h3>
                      <Textarea
                        placeholder="Type your reply to the client..."
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        rows={6}
                        className="mb-4"
                      />
                      <div className="flex justify-end">
                        <Button
                          onClick={handleReplyToInquiry}
                          disabled={!replyMessage.trim() || replying}
                          className="bg-red-500 hover:bg-red-600 text-white"
                        >
                          {replying ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          Send Email Reply
                        </Button>
                      </div>
                    </div>
                  )}

                  {selectedInquiry.userId && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mt-6">
                      <h3 className="font-semibold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
                        <UserCheck className="h-4 w-4" />
                        Registered User
                      </h3>
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        This user has an account. You can chat with them
                        directly in the Messages section.
                        {selectedInquiry.conversationId
                          ? " A conversation has already been created."
                          : " Click 'Convert to Chat' to start a conversation."}
                      </p>
                    </div>
                  )}
                </CardContent>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MailIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    No inquiry selected
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Select an inquiry from the list to view details and reply
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
