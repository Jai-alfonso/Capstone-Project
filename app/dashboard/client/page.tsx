"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  Clock,
  Video,
  Phone,
  MapPin,
  User,
  Briefcase,
  FileText,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  ChevronDown,
  Eye,
  Plus,
  Calendar as CalendarIcon,
  FileCheck,
  Gavel,
  Scale,
  Award,
  ArrowRight,
  BarChart,
  Users,
  MessageSquare,
  Download,
  Bell,
  RefreshCw,
} from "lucide-react";
import { ClientDashboardLayout } from "@/components/client-dashboard-layout";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { toast } from "sonner";
import { ScheduleAppointmentModal } from "@/components/schedule-appointment-modal";
import AppointmentService from "@/lib/appointment-service";
import MessagingService from "@/lib/message-service";
import { format } from "date-fns";
import { db } from "@/firebase/config";
import {
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";

// Import the auth service functions for listener management
import {
  registerListener,
  unregisterListener,
  isLogoutInProgress,
  cleanupAllListeners,
} from "@/lib/auth-service";

interface Appointment {
  id: string;
  title: string;
  type: string;
  date: string;
  time: string;
  client: string;
  clientId: string;
  clientEmail: string;
  clientPhone: string;
  attorney: string;
  attorneyId: string;
  attorneyName: string;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "rescheduled";
  location: string;
  description: string;
  consultationType: "online" | "in-person";
  videoLink?: string;
  rescheduleReason?: string;
  cancellationReason?: string;
  rescheduledBy?: string;
  cancelledBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface CaseProcessStep {
  id: string;
  name: string;
  status: "pending" | "in_progress" | "completed" | "skipped";
  completedDate?: string;
  notes?: string;
  order: number;
}

interface Case {
  id?: string;
  clientId: string;
  clientName: string;
  title: string;
  description: string;
  caseType: string;
  serviceType: string;
  status: "active" | "closed" | "pending" | "on_hold";
  priority: "low" | "medium" | "high";
  assignedTo?: string;
  assignedDate?: string;
  openedDate: string;
  closedDate?: string;
  notes?: string;
  documents?: string[];
  processSteps?: CaseProcessStep[];
  processType?: string;
  currentStep?: number;
  progressPercentage?: number;
  createdAt?: any;
  updatedAt?: any;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  appointmentId?: string;
  caseId?: string;
  userId?: string;
}

export default function ClientDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    email: string;
    phone: string;
  } | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [conversationId, setConversationId] = useState<string>("");
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    activeCases: 0,
    upcomingAppointments: 0,
    totalAppointments: 0,
    caseProgress: 0,
    unreadNotifications: 0,
    unreadMessages: 0,
  });

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userData = {
          id: user.uid,
          name: user.displayName || "Client",
          email: user.email || "",
          phone: user.phoneNumber || "",
        };

        setCurrentUser(userData);
        localStorage.setItem("userId", user.uid);
        localStorage.setItem("userEmail", user.email || "");

        // Get conversation for the user
        try {
          const clientName = user.displayName || user.email || "Client";
          const conversation = await MessagingService.getOrCreateConversation(
            user.uid,
            clientName,
            user.email || ""
          );
          setConversationId(conversation.id);
        } catch (error) {
          console.error("Error getting conversation:", error);
        }
      } else {
        const fallbackUser = {
          id: localStorage.getItem("userId") || `USER-${Date.now()}`,
          name: "Client",
          email: localStorage.getItem("userEmail") || "",
          phone: "",
        };
        setCurrentUser(fallbackUser);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser?.id || !conversationId || isLogoutInProgress()) {
      console.log(
        "[Dashboard] Skipping messages listener - logout in progress or missing data"
      );
      return;
    }

    // Simplified query to avoid composite index error
    // Get all messages for the conversation and filter client-side
    const messagesRef = collection(db, "messages");
    const q = query(messagesRef, where("conversationId", "==", conversationId));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        if (isLogoutInProgress()) {
          console.log("[Dashboard] Blocked messages update during logout");
          return;
        }

        let unreadCount = 0;
        querySnapshot.forEach((doc) => {
          const messageData = doc.data();
          // Filter client-side: non-client messages that are unread
          if (
            messageData.senderRole !== "client" &&
            messageData.read === false
          ) {
            unreadCount++;
          }
        });

        setUnreadMessageCount(unreadCount);
        setStats((prev) => ({ ...prev, unreadMessages: unreadCount }));
      },
      (error) => {
        if (!isLogoutInProgress()) {
          console.error("Error subscribing to messages:", error);
          setUnreadMessageCount(0);
        }
      }
    );

    const listenerId = registerListener(unsubscribe, "dashboard-messages");

    return () => {
      unsubscribe();
      if (listenerId) unregisterListener(listenerId);
    };
  }, [currentUser?.id, conversationId]);

  useEffect(() => {
    if (!currentUser?.id || isLogoutInProgress()) {
      console.log(
        "[Dashboard] Skipping appointments listener - logout in progress"
      );
      return;
    }

    const loadDashboardData = async () => {
      if (isLogoutInProgress()) {
        console.log("[Dashboard] Skipping data load - logout in progress");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        await Promise.all([
          loadAppointments(),
          loadCases(),
          loadNotifications(),
        ]);
      } catch (error) {
        if (!isLogoutInProgress()) {
          console.error("Error loading dashboard data:", error);
          toast.error("Failed to load dashboard data");
        }
      } finally {
        if (!isLogoutInProgress()) {
          setIsLoading(false);
        }
      }
    };

    loadDashboardData();

    const unsubscribe = AppointmentService.subscribeToAppointments(
      (realTimeAppointments) => {
        if (isLogoutInProgress()) {
          console.log("[Dashboard] Blocked appointments update during logout");
          return;
        }
        const userAppointments = realTimeAppointments.filter(
          (apt) => apt.clientId === currentUser.id
        );
        setAppointments(userAppointments);
        calculateStats(
          userAppointments,
          cases,
          notifications,
          unreadMessageCount
        );
      },
      currentUser.id
    );

    if (unsubscribe) {
      const listenerId = registerListener(
        unsubscribe,
        "dashboard-appointments"
      );

      return () => {
        unsubscribe();
        if (listenerId) unregisterListener(listenerId);
      };
    }
  }, [currentUser]);

  useEffect(() => {
    calculateStats(appointments, cases, notifications, unreadMessageCount);
  }, [appointments, cases, notifications, unreadMessageCount]);

  // Add component cleanup effect
  useEffect(() => {
    return () => {
      console.log("[Dashboard] Component unmounting");
    };
  }, []);

  const loadAppointments = async () => {
    if (isLogoutInProgress()) {
      console.log(
        "[Dashboard] Skipping appointments load - logout in progress"
      );
      return [];
    }

    try {
      if (!currentUser?.id) return [];

      const userAppointments = await AppointmentService.getAppointmentsByClient(
        currentUser.id
      );
      setAppointments(userAppointments);
      return userAppointments;
    } catch (error) {
      if (!isLogoutInProgress()) {
        console.error("Error loading appointments:", error);
        toast.error("Failed to load appointments");
      }
      return [];
    }
  };

  const loadCases = async () => {
    if (isLogoutInProgress()) {
      console.log("[Dashboard] Skipping cases load - logout in progress");
      return [];
    }

    try {
      if (!currentUser?.id || !db) return [];

      const casesRef = collection(db, "cases");

      let casesData: Case[] = [];

      try {
        const casesQuery = query(
          casesRef,
          where("clientId", "==", currentUser.id)
        );
        const querySnapshot = await getDocs(casesQuery);

        querySnapshot.forEach((doc) => {
          const data = doc.data() as Omit<Case, "id">;
          casesData.push({
            id: doc.id,
            ...data,
            progressPercentage: calculateCaseProgress(data.processSteps),
            currentStep: getCurrentStepIndex(data.processSteps),
          });
        });
      } catch (error) {
        if (!isLogoutInProgress()) {
          console.log(
            "Query by clientId failed or returned no results:",
            error
          );
        }
      }

      if (casesData.length === 0 && currentUser.name) {
        try {
          const casesByNameQuery = query(
            casesRef,
            where("clientName", "==", currentUser.name)
          );
          const nameQuerySnapshot = await getDocs(casesByNameQuery);

          nameQuerySnapshot.forEach((doc) => {
            const data = doc.data() as Omit<Case, "id">;
            casesData.push({
              id: doc.id,
              ...data,
              progressPercentage: calculateCaseProgress(data.processSteps),
              currentStep: getCurrentStepIndex(data.processSteps),
            });
          });
        } catch (error) {
          if (!isLogoutInProgress()) {
            console.log("Query by clientName failed:", error);
          }
        }
      }

      if (casesData.length === 0 && currentUser.email) {
        try {
          const clientsRef = collection(db, "clients");
          const clientQuery = query(
            clientsRef,
            where("email", "==", currentUser.email)
          );
          const clientSnapshot = await getDocs(clientQuery);

          if (!clientSnapshot.empty) {
            const clientDoc = clientSnapshot.docs[0];
            const clientData = clientDoc.data();

            const casesByClientIdQuery = query(
              casesRef,
              where("clientId", "==", clientDoc.id)
            );
            const clientCasesSnapshot = await getDocs(casesByClientIdQuery);

            clientCasesSnapshot.forEach((doc) => {
              const data = doc.data() as Omit<Case, "id">;
              casesData.push({
                id: doc.id,
                ...data,
                progressPercentage: calculateCaseProgress(data.processSteps),
                currentStep: getCurrentStepIndex(data.processSteps),
              });
            });
          }
        } catch (error) {
          if (!isLogoutInProgress()) {
            console.log("Query by email failed:", error);
          }
        }
      }

      console.log("Loaded cases:", casesData);
      setCases(casesData);
      return casesData;
    } catch (error) {
      if (!isLogoutInProgress()) {
        console.error("Error loading cases:", error);
      }
      return [];
    }
  };

  const calculateCaseProgress = (processSteps?: CaseProcessStep[]): number => {
    if (!processSteps || processSteps.length === 0) return 0;

    const completedSteps = processSteps.filter(
      (step) => step.status === "completed"
    ).length;
    const totalSteps = processSteps.length;

    return Math.round((completedSteps / totalSteps) * 100);
  };

  const getCurrentStepIndex = (processSteps?: CaseProcessStep[]): number => {
    if (!processSteps || processSteps.length === 0) return 0;

    const currentStepIndex = processSteps.findIndex(
      (step) => step.status !== "completed"
    );

    return currentStepIndex >= 0 ? currentStepIndex : processSteps.length - 1;
  };

  const loadNotifications = async () => {
    if (isLogoutInProgress()) {
      console.log(
        "[Dashboard] Skipping notifications load - logout in progress"
      );
      return [];
    }

    try {
      if (!currentUser?.id || !db) return [];

      const notificationsRef = collection(db, "notifications");

      const q = query(notificationsRef, where("userId", "==", currentUser.id));

      const querySnapshot = await getDocs(q);
      const notificationsData: Notification[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<Notification, "id">;
        notificationsData.push({
          id: doc.id,
          ...data,
        });
      });

      notificationsData.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      console.log("Loaded notifications:", notificationsData);
      setNotifications(notificationsData);

      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (isLogoutInProgress()) {
          console.log("[Dashboard] Blocked notifications update during logout");
          return;
        }

        const updatedNotifications: Notification[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as Omit<Notification, "id">;
          updatedNotifications.push({
            id: doc.id,
            ...data,
          });
        });

        updatedNotifications.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        setNotifications(updatedNotifications);
      });

      // Register this listener too
      const listenerId = registerListener(
        unsubscribe,
        "dashboard-notifications"
      );

      return () => {
        unsubscribe();
        if (listenerId) unregisterListener(listenerId);
      };
    } catch (error) {
      if (!isLogoutInProgress()) {
        console.error("Error loading notifications:", error);

        const mockNotifications: Notification[] = [
          {
            id: "1",
            type: "appointment",
            title: "Welcome to LegalEase",
            message:
              "Your dashboard is ready. Schedule your first appointment!",
            read: false,
            timestamp: new Date().toISOString(),
            userId: currentUser?.id,
          },
          {
            id: "2",
            type: "system",
            title: "Getting Started",
            message: "Complete your profile to get the most out of LegalEase",
            read: false,
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            userId: currentUser?.id,
          },
        ];

        setNotifications(mockNotifications);
        return mockNotifications;
      }
      return [];
    }
  };

  const calculateStats = (
    appointmentsData: Appointment[],
    casesData: Case[],
    notificationsData: Notification[],
    unreadMessagesCount: number
  ) => {
    if (isLogoutInProgress()) {
      console.log(
        "[Dashboard] Skipping stats calculation - logout in progress"
      );
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    const upcomingAppointments = appointmentsData.filter(
      (apt) =>
        apt.date >= today &&
        apt.status !== "cancelled" &&
        apt.status !== "completed"
    ).length;

    const activeCases = casesData.filter((c) => c.status === "active").length;

    const activeCasesData = casesData.filter((c) => c.status === "active");
    const averageProgress =
      activeCasesData.length > 0
        ? Math.round(
            activeCasesData.reduce(
              (sum, c) => sum + (c.progressPercentage || 0),
              0
            ) / activeCasesData.length
          )
        : 0;

    const unreadNotifications = notificationsData.filter((n) => !n.read).length;

    setStats({
      activeCases,
      upcomingAppointments,
      totalAppointments: appointmentsData.length,
      caseProgress: averageProgress,
      unreadNotifications,
      unreadMessages: unreadMessagesCount,
    });

    console.log("Updated stats:", {
      activeCases,
      upcomingAppointments,
      totalAppointments: appointmentsData.length,
      caseProgress: averageProgress,
      unreadNotifications,
      unreadMessages: unreadMessagesCount,
      totalCases: casesData.length,
      totalNotifications: notificationsData.length,
    });
  };

  const handleSelectDate = async (
    date: Date,
    time: string,
    consultationType: string,
    selectedCaseId?: string,
    appointmentPurpose?: string,
    caseStepInfo?: {
      currentStep?: number;
      currentStepName?: string;
      processSteps?: any[];
      progressPercentage?: number;
    }
  ) => {
    try {
      if (!currentUser) {
        toast.error("Please sign in to schedule an appointment.");
        return;
      }

      const availabilityCheck = await AppointmentService.isTimeSlotAvailable(
        date,
        time
      );

      if (!availabilityCheck.available) {
        toast.error(
          availabilityCheck.reason || "This time slot is not available."
        );
        return;
      }

      const dateStr = format(date, "yyyy-MM-dd");
      const location =
        consultationType === "online" ? "Virtual Consultation" : "Office Visit";

      // Use provided appointmentPurpose or generate from consultation type
      const title =
        appointmentPurpose ||
        `${
          consultationType === "online" ? "Online" : "In-Person"
        } Consultation`;
      const description =
        appointmentPurpose ||
        `${
          consultationType === "online" ? "Video" : "In-person"
        } consultation scheduled`;

      const newAppointment = await AppointmentService.addAppointment({
        title: title,
        type:
          consultationType === "online"
            ? "Online Consultation"
            : "In-Person Consultation",
        date: dateStr,
        time: time,
        client: currentUser.name,
        clientId: currentUser.id,
        clientEmail: currentUser.email,
        clientPhone: currentUser.phone,
        attorney: "Atty. Alia Jan Delgado",
        attorneyId: "atty.alia_jan_delgado",
        attorneyName: "Atty. Alia Jan Delgado",
        status: "pending",
        location: location,
        description: description,
        consultationType: consultationType as "online" | "in-person",
        caseId: selectedCaseId, // Save the case ID for follow-up appointments
        caseStepInfo: caseStepInfo, // Save case step information
        appointmentPurpose: appointmentPurpose, // Save the detailed appointment purpose
      });

      if (newAppointment) {
        const successMessage =
          selectedCaseId && caseStepInfo
            ? `Appointment scheduled for case step ${
                caseStepInfo.currentStepName ||
                `Step ${(caseStepInfo.currentStep || 0) + 1}`
              }!`
            : "Appointment request submitted successfully!";

        toast.success(successMessage);
        toast.info("The law office will review and confirm your appointment.");
        setIsScheduleModalOpen(false);

        loadAppointments();
      }
    } catch (error: any) {
      console.error("Error scheduling appointment:", error);
      toast.error(error.message || "Failed to schedule appointment");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
      case "confirmed":
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "cancelled":
      case "closed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "rescheduled":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "on_hold":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getCaseIcon = (caseType: string) => {
    const type = caseType.toLowerCase();
    if (type.includes("divorce") || type.includes("family"))
      return <Users className="h-5 w-5" />;
    if (type.includes("criminal")) return <Gavel className="h-5 w-5" />;
    if (type.includes("civil") || type.includes("litigation"))
      return <Scale className="h-5 w-5" />;
    if (type.includes("contract") || type.includes("business"))
      return <FileCheck className="h-5 w-5" />;
    return <Briefcase className="h-5 w-5" />;
  };

  const getProcessStepStatusIcon = (status: CaseProcessStep["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case "pending":
        return <Clock className="h-4 w-4 text-gray-400" />;
      case "skipped":
        return <ArrowRight className="h-4 w-4 text-gray-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getUpcomingAppointments = () => {
    if (isLogoutInProgress()) {
      console.log(
        "[Dashboard] Skipping upcoming appointments filter - logout in progress"
      );
      return [];
    }

    const today = new Date().toISOString().split("T")[0];
    return appointments
      .filter(
        (apt) =>
          apt.date >= today &&
          apt.status !== "cancelled" &&
          apt.status !== "completed"
      )
      .sort((a, b) => {
        if (a.date === b.date) {
          return a.time.localeCompare(b.time);
        }
        return a.date.localeCompare(b.date);
      })
      .slice(0, 3);
  };

  const getActiveCases = () => {
    if (isLogoutInProgress()) {
      console.log(
        "[Dashboard] Skipping active cases filter - logout in progress"
      );
      return [];
    }

    return cases
      .filter((c) => c.status === "active")
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority =
          priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
        const bPriority =
          priorityOrder[b.priority as keyof typeof priorityOrder] || 0;

        if (bPriority !== aPriority) {
          return bPriority - aPriority;
        }

        return (b.progressPercentage || 0) - (a.progressPercentage || 0);
      })
      .slice(0, 3);
  };

  const handleRefresh = async () => {
    if (isLogoutInProgress()) {
      console.log("[Dashboard] Skipping refresh - logout in progress");
      return;
    }

    try {
      setIsLoading(true);
      await Promise.all([loadAppointments(), loadCases(), loadNotifications()]);
      toast.success("Dashboard refreshed successfully!");
    } catch (error) {
      toast.error("Failed to refresh dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewCaseDetails = (caseId: string) => {
    if (isLogoutInProgress()) {
      console.log(
        "[Dashboard] Blocked case details navigation - logout in progress"
      );
      return;
    }

    router.push(`/dashboard/client/cases/${caseId}`);
  };

  const handleViewAppointmentDetails = (appointmentId: string) => {
    if (isLogoutInProgress()) {
      console.log(
        "[Dashboard] Blocked appointment details navigation - logout in progress"
      );
      return;
    }

    router.push(`/dashboard/client/appointments#${appointmentId}`);
  };

  const handleMarkNotificationAsRead = async (notificationId: string) => {
    try {
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );

      toast.success("Notification marked as read");
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Failed to mark notification as read");
    }
  };

  const handleMessagesClick = () => {
    if (isLogoutInProgress()) {
      console.log(
        "[Dashboard] Blocked messages navigation - logout in progress"
      );
      return;
    }

    router.push("/dashboard/client/messages");
  };

  if (isLoading) {
    return (
      <ClientDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-navy-700 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
      </ClientDashboardLayout>
    );
  }

  return (
    <ClientDashboardLayout>
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold font-serif bg-gradient-to-r from-navy-900 to-navy-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                Welcome back, {currentUser?.name || "Client"}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg mt-2">
                Here's your legal case management overview
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              <span>Active Services: {stats.activeCases}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Upcoming Appointments: {stats.upcomingAppointments}</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span>Overall Progress: {stats.caseProgress}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span>Unread Notifications: {stats.unreadNotifications}</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Active Services Card */}
          <Card className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Active Services
              </CardTitle>
              <div className="p-3 bg-navy-700 dark:bg-navy-600 rounded-xl">
                <Briefcase className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats.activeCases}
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mt-1">
                {stats.activeCases > 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span>Managing your legal matters</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 text-yellow-500" />
                    <span>No active cases yet</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Appointments Card */}
          <Card className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Upcoming Appointments
              </CardTitle>
              <div className="p-3 bg-navy-700 dark:bg-navy-600 rounded-xl">
                <Calendar className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats.upcomingAppointments}
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mt-1">
                <Calendar className="h-3 w-3 text-blue-500" />
                <span>Scheduled consultations</span>
              </div>
            </CardContent>
          </Card>

          {/* Case Progress Card */}
          <Card className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Overall Progress
              </CardTitle>
              <div className="p-3 bg-navy-700 dark:bg-navy-600 rounded-xl">
                <BarChart className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats.caseProgress}%
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mt-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span>Average case completion</span>
              </div>
              {stats.caseProgress > 0 && (
                <Progress value={stats.caseProgress} className="h-2 mt-2" />
              )}
            </CardContent>
          </Card>

          {/* Notifications Card */}
          <Card className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Unread Notifications
              </CardTitle>
              <div className="p-3 bg-navy-700 dark:bg-navy-600 rounded-xl">
                <Bell className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {stats.unreadNotifications}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Active Services Section */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-navy-700 dark:bg-navy-600 rounded-lg">
                      <Briefcase className="h-5 w-5 text-white" />
                    </div>
                    Active Services
                  </CardTitle>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Your ongoing legal matters
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {getActiveCases().length === 0 ? (
                <></>
              ) : (
                <div className="space-y-4">
                  {getActiveCases().map((caseItem) => {
                    const isExpanded = expandedCaseId === caseItem.id;
                    const currentStep =
                      caseItem.processSteps?.[caseItem.currentStep || 0];

                    return (
                      <div
                        key={caseItem.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                      >
                        <div
                          className="p-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          onClick={() =>
                            setExpandedCaseId(isExpanded ? null : caseItem.id!)
                          }
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-navy-100 dark:bg-navy-900/50 rounded-lg">
                                {getCaseIcon(caseItem.caseType)}
                              </div>
                              <div>
                                <h4 className="font-semibold text-lg">
                                  {caseItem.title}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge
                                    className={getStatusColor(caseItem.status)}
                                  >
                                    {caseItem.status}
                                  </Badge>
                                  <Badge
                                    className={getPriorityColor(
                                      caseItem.priority
                                    )}
                                  >
                                    {caseItem.priority}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {caseItem.caseType} • {caseItem.serviceType}
                                </p>
                              </div>
                            </div>
                            <ChevronDown
                              className={`h-5 w-5 text-gray-500 transition-transform ${
                                isExpanded ? "transform rotate-180" : ""
                              }`}
                            />
                          </div>

                          {/* Progress Bar */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                Progress: {caseItem.progressPercentage || 0}%
                              </span>
                              <span className="text-xs text-gray-500">
                                Opened:{" "}
                                {new Date(
                                  caseItem.openedDate
                                ).toLocaleDateString()}
                              </span>
                            </div>
                            <Progress
                              value={caseItem.progressPercentage || 0}
                              className="h-2"
                            />
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                            {/* Current Step */}
                            {currentStep && (
                              <div className="mb-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <TrendingUp className="h-4 w-4 text-blue-500" />
                                  <h5 className="font-medium text-gray-900 dark:text-white">
                                    Current Step
                                  </h5>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                  {getProcessStepStatusIcon(currentStep.status)}
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                      {currentStep.name}
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      Step {currentStep.order} of{" "}
                                      {caseItem.processSteps?.length}
                                      {currentStep.completedDate &&
                                        ` • Completed: ${currentStep.completedDate}`}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Case Description */}
                            {caseItem.description && (
                              <div className="mb-4">
                                <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                                  Case Description
                                </h5>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {caseItem.description}
                                </p>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2">
                              {caseItem.documents &&
                                caseItem.documents.length > 0 && (
                                  <Button size="sm" variant="outline">
                                    <Download className="h-4 w-4 mr-1" />
                                    Documents ({caseItem.documents.length})
                                  </Button>
                                )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Appointments Section */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-navy-700 dark:bg-navy-600 rounded-lg">
                      <CalendarIcon className="h-5 w-5 text-white" />
                    </div>
                    Upcoming Appointments
                  </CardTitle>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Your scheduled consultations
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {getUpcomingAppointments().length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No Upcoming Appointments
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Schedule your first consultation
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {getUpcomingAppointments().map((appointment) => {
                    const isVirtual = appointment.consultationType === "online";
                    const hasVideoLink = !!appointment.videoLink;

                    return (
                      <div
                        key={appointment.id}
                        className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-lg">
                              {appointment.type}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                className={getStatusColor(appointment.status)}
                              >
                                {appointment.status}
                              </Badge>
                              {isVirtual && (
                                <Badge
                                  variant="outline"
                                  className="bg-blue-50 text-blue-700 border-blue-200"
                                >
                                  <Video className="h-3 w-3 mr-1" />
                                  Virtual
                                </Badge>
                              )}
                              {!isVirtual && (
                                <Badge
                                  variant="outline"
                                  className="bg-purple-50 text-purple-700 border-purple-200"
                                >
                                  <MapPin className="h-3 w-3 mr-1" />
                                  In-Person
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {new Date(appointment.date).toLocaleDateString(
                                "en-US",
                                {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                }
                              )}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {appointment.time}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">
                              Attorney: {appointment.attorney}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            {isVirtual ? (
                              <Video className="h-4 w-4 text-gray-400" />
                            ) : (
                              <MapPin className="h-4 w-4 text-gray-400" />
                            )}
                            <span className="text-gray-600 dark:text-gray-400">
                              {appointment.location}
                            </span>
                          </div>
                        </div>

                        {/* Video Link */}
                        {isVirtual && hasVideoLink && (
                          <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Video className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                  Video Link Ready
                                </span>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() =>
                                  window.open(
                                    appointment.videoLink,
                                    "_blank",
                                    "noopener,noreferrer"
                                  )
                                }
                              >
                                Join Call
                              </Button>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 mt-4">
                          {appointment.status === "confirmed" &&
                            isVirtual &&
                            hasVideoLink && (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() =>
                                  window.open(
                                    appointment.videoLink,
                                    "_blank",
                                    "noopener,noreferrer"
                                  )
                                }
                              >
                                <Video className="h-4 w-4 mr-1" />
                                Join Now
                              </Button>
                            )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <ScheduleAppointmentModal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          onSelectDate={handleSelectDate}
          appointmentService={AppointmentService}
          currentUser={currentUser || { id: "", name: "", email: "", phone: "" }}
          cases={cases}
        />
      </div>
    </ClientDashboardLayout>
  );
}

