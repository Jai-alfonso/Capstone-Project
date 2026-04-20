"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/firebase/config";
import { collection, getDocs } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarIcon,
  Clock,
  Eye,
  User,
  MapPin,
  Video,
  Phone,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Clock as ClockIcon,
  Mail,
  Link as LinkIcon,
  ListTodo,
  Layers,
  Printer,
  Filter,
  RefreshCw,
  CalendarX,
  Search,
  Briefcase,
  AlertCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import UserService from "@/lib/user-service";
import { useToast } from "@/hooks/use-toast";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { PDFGenerator } from "@/lib/pdf-generator";
import { AdminDashboardLayout } from "@/components/admin-dashboard-layout";
import { ManageAvailabilityModal } from "@/components/manage-availability-modal";
import { AppointmentOptionsMenu } from "@/components/appointment-options-menu";
import { AppointmentDetailsModal } from "@/components/appointment-details-modal";
import { RescheduleAppointmentModal } from "@/components/reschedule-appointment-modal";
import { CancelAppointmentModal } from "@/components/cancel-appointment-modal";
import AppointmentService, { Appointment } from "@/lib/appointment-service";

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: string;
  priority: string;
  joinDate: string;
  totalCases: number;
  activeCases: number;
  lastContact: string;
  archived: boolean;
  userId?: string;
  createdAt?: any;
  updatedAt?: any;
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

export default function AdminAppointmentsPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<
    Appointment[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [selectedAppointmentForDetails, setSelectedAppointmentForDetails] =
    useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCases, setIsLoadingCases] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedAppointmentId, setExpandedAppointmentId] = useState<
    string | null
  >(null);
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);
  const { toast } = useToast();
  const { logAction, logAppointmentAction } = useAuditLogger();
  
  const [adminUserData, setAdminUserData] = useState<any>(null);
  const [dateRange, setDateRange] = useState("all-time");

  // Helper function to format date range
  const formatDateRange = (range: string): string => {
    const dateRangeMap: { [key: string]: string } = {
      "today": "Today",
      "this-week": "This Week",
      "this-month": "This Month",
      "this-year": "This Year",
      "all-time": "All Time"
    };
    return dateRangeMap[range] || range;
  };

  useEffect(() => {
    console.log("[Admin] Setting up real-time appointment subscription...");

    const unsubscribe = AppointmentService.subscribeToAppointments(
      (appointments) => {
        console.log(
          "[Admin] Real-time update received:",
          appointments.length,
          "appointments"
        );

        const publicAppointments = appointments.filter(
          (a) => a.clientId !== "admin-created"
        );
        setAppointments(publicAppointments);
        setIsLoading(false);
        setRefreshing(false);
      }
    );

    const loadAppointments = async () => {
      try {
        setIsLoading(true);
        const allAppointments = await AppointmentService.getAllAppointments();
        console.log(
          "[Admin] Initial load:",
          allAppointments.length,
          "appointments"
        );

        setAppointments(
          allAppointments.filter((a) => a.clientId !== "admin-created")
        );
        setIsLoading(false);
      } catch (error) {
        console.error("[Admin] Error loading appointments:", error);
        setIsLoading(false);
      }
    };

    loadAppointments();

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const loadClientsAndCases = async () => {
      try {
        setIsLoadingCases(true);
        await Promise.all([loadClients(), loadCases()]);
      } catch (error) {
        console.error("Error loading clients and cases:", error);
      } finally {
        setIsLoadingCases(false);
      }
    };

    if (!isLoading) {
      loadClientsAndCases();
    }
  }, [isLoading]);

  useEffect(() => {
    let filtered = appointments;

    if (dateRange !== "all-time") {
      const now = new Date();
      filtered = filtered.filter((appointment) => {
        const appointmentDate = new Date(appointment.date);
        switch (dateRange) {
          case "today":
            return appointmentDate.toDateString() === now.toDateString();
          case "this-week":
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);
            return (
              appointmentDate >= startOfWeek && appointmentDate <= endOfWeek
            );
          case "this-month":
            return (
              appointmentDate.getMonth() === now.getMonth() &&
              appointmentDate.getFullYear() === now.getFullYear()
            );
          case "this-year":
            return appointmentDate.getFullYear() === now.getFullYear();
          default:
            return true;
        }
      });
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (appointment) =>
          appointment.client
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          appointment.title
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          appointment.appointmentPurpose
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          appointment.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          appointment.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          appointment.clientEmail
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          appointment.clientPhone?.includes(searchQuery) ||
          appointment.videoLink
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          appointment.caseTitle
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (appointment) => appointment.status === statusFilter
      );
    }

    filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    setFilteredAppointments(filtered);
  }, [appointments, searchQuery, statusFilter, dateRange]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser?.uid) {
        try {
          const data = await UserService.getUserById(firebaseUser.uid);
          setAdminUserData(data);
        } catch (error) {
          console.error("Error fetching admin user data:", error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const loadClients = async () => {
    try {
      if (!db) {
        setClients([]);
        return;
      }

      const clientsRef = collection(db, "clients");
      const querySnapshot = await getDocs(clientsRef);
      const clientsData: Client[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<Client, "id">;
        clientsData.push({
          id: doc.id,
          ...data,
        });
      });

      const userProfilesSnapshot = await getDocs(
        collection(db, "userProfiles")
      );

      userProfilesSnapshot.forEach((doc) => {
        const userData = doc.data();

        if (
          userData.role === "client" &&
          !clientsData.find((c) => c.email === userData.email)
        ) {
          clientsData.push({
            id: doc.id,
            name:
              `${userData.firstName || ""} ${userData.lastName || ""}`.trim() ||
              "Unknown Client",
            email: userData.email || "",
            phone: userData.phone || "+63",
            address: "Address not provided",
            status: "active",
            priority: "normal",
            joinDate: userData.createdAt
              ? new Date(userData.createdAt.toMillis()).toLocaleDateString()
              : new Date().toLocaleDateString(),
            totalCases: 0,
            activeCases: 0,
            lastContact: new Date().toLocaleDateString(),
            archived: false,
            userId: doc.id,
            createdAt: userData.createdAt,
            updatedAt: userData.updatedAt,
          });
        }
      });

      setClients(clientsData);
    } catch (error: any) {
      console.error("Error loading clients:", error);
    }
  };

  const loadCases = async () => {
    try {
      if (!db) return;

      const casesRef = collection(db, "cases");
      const querySnapshot = await getDocs(casesRef);
      const casesData: Case[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<Case, "id">;

        let progressPercentage = 0;
        let currentStep = 0;

        if (data.processSteps && data.processSteps.length > 0) {
          const completedSteps = data.processSteps.filter(
            (step) => step.status === "completed"
          ).length;
          const totalSteps = data.processSteps.length;
          progressPercentage = Math.round((completedSteps / totalSteps) * 100);

          const currentStepIndex = data.processSteps.findIndex(
            (step) => step.status !== "completed"
          );
          currentStep =
            currentStepIndex >= 0
              ? currentStepIndex
              : data.processSteps.length - 1;
        }

        casesData.push({
          id: doc.id,
          ...data,
          progressPercentage,
          currentStep,
        });
      });

      setCases(casesData);
    } catch (error: any) {
      console.error("Error loading cases:", error);
    }
  };

  const getClientForAppointment = (appointment: Appointment) => {
    if (appointment.clientId) {
      return clients.find(
        (c) =>
          c.id === appointment.clientId || c.userId === appointment.clientId
      );
    }

    if (appointment.clientEmail) {
      return clients.find((c) => c.email === appointment.clientEmail);
    }

    if (appointment.client) {
      return clients.find(
        (c) =>
          c.name.toLowerCase().includes(appointment.client.toLowerCase()) ||
          appointment.client.toLowerCase().includes(c.name.toLowerCase())
      );
    }

    return null;
  };

  const getCaseForAppointment = (appointment: Appointment) => {
    if (appointment.caseId) {
      return cases.find((c) => c.id === appointment.caseId);
    }

    if (appointment.caseTitle) {
      return cases.find((c) => c.title === appointment.caseTitle);
    }

    return null;
  };

  const getProcessStepStatusIcon = (status: CaseProcessStep["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "in_progress":
        return <ClockIcon className="h-4 w-4 text-blue-500 animate-pulse" />;
      case "skipped":
        return <ChevronRight className="h-4 w-4 text-gray-400" />;
      case "pending":
      default:
        return <ClockIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "rescheduled":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStatusDisplay = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getLocationIcon = (location: string) => {
    if (
      location.includes("Video") ||
      location.includes("Virtual") ||
      location.includes("Online")
    ) {
      return <Video className="h-4 w-4" />;
    } else if (location.includes("Phone")) {
      return <Phone className="h-4 w-4" />;
    } else {
      return <MapPin className="h-4 w-4" />;
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const allAppointments = await AppointmentService.getAllAppointments();
      setAppointments(allAppointments);

      await Promise.all([loadClients(), loadCases()]);

      await logAction(
        "Appointments Refresh",
        "Appointments Dashboard",
        "Refreshed appointments list with client case data",
        "Info"
      );

      toast({
        title: "Refreshed",
        description: "Appointments list has been refreshed",
      });
    } catch (error) {
      console.error("Error refreshing appointments:", error);

      await logAction(
        "Appointments Refresh Error",
        "Appointments Dashboard",
        `Failed to refresh appointments: ${error}`,
        "Warning"
      );

      toast({
        title: "Error",
        description: "Failed to refresh appointments",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  const handleViewDetails = (appointment: Appointment) => {
    setSelectedAppointmentForDetails(appointment);
    setIsDetailsModalOpen(true);

    logAction(
      "View Appointment Details",
      `Appointment: ${appointment.id}`,
      `Viewed details for appointment with ${appointment.client} on ${appointment.date} at ${appointment.time}`,
      "Info"
    );
  };

  const handleStatusChange = async (
    appointmentId: string,
    newStatus: string,
    videoLink?: string
  ) => {
    try {
      const appointment = appointments.find((apt) => apt.id === appointmentId);
      if (!appointment) return;

      const isVirtual =
        appointment.consultationType === "online" ||
        (appointment.location &&
          (appointment.location.toLowerCase().includes("virtual") ||
            appointment.location.toLowerCase().includes("video") ||
            appointment.location.toLowerCase().includes("online")));

      if (
        newStatus === "confirmed" &&
        isVirtual &&
        !appointment.videoLink &&
        !videoLink
      ) {
        toast({
          title: "Video Link Required",
          description:
            "Virtual consultations require a video link before confirmation",
          variant: "destructive",
        });

        await logAppointmentAction(
          "Confirmation Attempt",
          appointmentId,
          appointment.title || appointment.type || "Appointment",
          `Attempted to confirm virtual appointment without video link for ${appointment.client}`,
          "Warning"
        );
        return;
      }

      const updated = await AppointmentService.updateAppointmentStatus(
        appointmentId,
        newStatus as any,
        videoLink
      );

      if (updated) {
        await logAppointmentAction(
          (newStatus.charAt(0).toUpperCase() + newStatus.slice(1)) as any,
          appointmentId,
          appointment.title || appointment.type || "Appointment",
          `Changed appointment status from ${appointment.status} to ${newStatus} for client ${appointment.client}`,
          newStatus === "cancelled"
            ? "Warning"
            : newStatus === "confirmed"
            ? "Info"
            : "Low"
        );

        if (appointment.clientId && newStatus === "confirmed") {
          await AppointmentService.createClientNotification(
            appointment.clientId,
            {
              notificationType: "confirmed_appointment",
              title: "Appointment Confirmed",
              message: `Your appointment on ${new Date(
                appointment.date
              ).toLocaleDateString()} at ${
                appointment.time
              } has been confirmed.${
                videoLink ? ` Video link: ${videoLink}` : ""
              }`,
              appointmentId: appointmentId,
              metadata: {
                appointmentId: appointmentId,
                date: appointment.date || "",
                time: appointment.time || "",
                clientName: appointment.clientName || appointment.client || "",
                serviceType: appointment.type || appointment.appointmentPurpose || "",
                consultationType: appointment.consultationType || "in-person",
                location: appointment.location || "",
                confirmedBy: "admin",
                ...(videoLink && { videoLink: videoLink }),
              },
            }
          );
        }

        toast({
          title: "Success",
          description: `Appointment ${newStatus} successfully`,
        });

        if (newStatus === "confirmed") {
          setIsDetailsModalOpen(false);
          setSelectedAppointmentForDetails(null);
        }

        handleRefresh();
      }
    } catch (error: any) {
      console.error("Error changing appointment status:", error);

      await logAction(
        "Appointment Status Change Error",
        `Appointment: ${appointmentId}`,
        `Failed to change status to ${newStatus}: ${error.message}`,
        "Critical"
      );

      toast({
        title: "Error",
        description: error.message || "Failed to change appointment status",
        variant: "destructive",
      });
    }
  };

  const handleReschedule = (id: string) => {
    const appointment = appointments.find((apt) => apt.id === id);
    if (appointment) {
      setSelectedAppointment(appointment);
      setIsRescheduleModalOpen(true);

      logAction(
        "Initiate Appointment Reschedule",
        `Appointment: ${appointment.id}`,
        `Started reschedule process for appointment with ${appointment.client}`,
        "Info"
      );
    }
  };

  const handleRescheduleSubmit = async (
    appointmentId: string,
    newDate: Date,
    newTime: string,
    reason: string
  ) => {
    try {
      const availabilityCheck = await AppointmentService.isTimeSlotAvailable(
        newDate,
        newTime
      );
      if (!availabilityCheck.available) {
        toast({
          title: "Time Slot Unavailable",
          description:
            availabilityCheck.reason || "This time slot is not available",
          variant: "destructive",
        });

        await logAppointmentAction(
          "Reschedule Attempt",
          appointmentId,
          selectedAppointment?.title ||
            selectedAppointment?.type ||
            "Appointment",
          `Time slot unavailable: ${newDate.toDateString()} at ${newTime}. Reason: ${
            availabilityCheck.reason
          }`,
          "Warning"
        );
        return;
      }

      const dateStr = newDate.toISOString().split("T")[0];
      const updated = await AppointmentService.rescheduleAppointment(
        appointmentId,
        dateStr,
        newTime,
        reason,
        "admin"
      );

      if (updated && selectedAppointment) {
        await logAppointmentAction(
          "Rescheduled",
          appointmentId,
          selectedAppointment.title ||
            selectedAppointment.type ||
            "Appointment",
          `Rescheduled appointment from ${selectedAppointment.date} at ${selectedAppointment.time} to ${dateStr} at ${newTime}. Reason: ${reason}`,
          "Medium"
        );

        await AppointmentService.createClientNotification(
          selectedAppointment.clientId || "",
          {
            type: "appointment",
            title: "Appointment Rescheduled",
            message: `Your appointment has been rescheduled to ${newDate.toLocaleDateString()} at ${newTime}. Reason: ${reason}`,
            appointmentId: appointmentId,
          }
        );

        toast({
          title: "Success",
          description:
            "Appointment rescheduled successfully. Client has been notified.",
        });
      }
    } catch (error: any) {
      console.error("Error rescheduling appointment:", error);

      await logAction(
        "Appointment Reschedule Error",
        `Appointment: ${appointmentId}`,
        `Failed to reschedule: ${error.message}`,
        "Critical"
      );

      toast({
        title: "Error",
        description: error.message || "Failed to reschedule appointment",
        variant: "destructive",
      });
    }
  };

  const handleCancel = (id: string) => {
    const appointment = appointments.find((apt) => apt.id === id);
    if (appointment) {
      setSelectedAppointment(appointment);
      setIsCancelModalOpen(true);

      logAction(
        "Initiate Appointment Cancellation",
        `Appointment: ${appointment.id}`,
        `Started cancellation process for appointment with ${appointment.client}`,
        "Warning"
      );
    }
  };

  const handleCancelSubmit = async (appointmentId: string, reason: string) => {
    try {
      const updated = await AppointmentService.cancelAppointment(
        appointmentId,
        reason,
        "admin"
      );

      if (updated && selectedAppointment) {
        await logAppointmentAction(
          "Cancelled",
          appointmentId,
          selectedAppointment.title ||
            selectedAppointment.type ||
            "Appointment",
          `Cancelled appointment for ${selectedAppointment.client}. Reason: ${reason}`,
          "Warning"
        );

        await AppointmentService.createClientNotification(
          selectedAppointment.clientId || "",
          {
            type: "appointment",
            title: "Appointment Cancelled",
            message: `Your appointment has been cancelled. Reason: ${reason}`,
            appointmentId: appointmentId,
          }
        );

        toast({
          title: "Success",
          description:
            "Appointment cancelled successfully. Client has been notified.",
        });
      }
    } catch (error: any) {
      console.error("Error cancelling appointment:", error);

      await logAction(
        "Appointment Cancellation Error",
        `Appointment: ${appointmentId}`,
        `Failed to cancel: ${error.message}`,
        "Critical"
      );

      toast({
        title: "Error",
        description: error.message || "Failed to cancel appointment",
        variant: "destructive",
      });
    }
  };

  const handleConfirmAppointment = async (appointmentId: string) => {
    try {
      const appointment = appointments.find((apt) => apt.id === appointmentId);
      if (!appointment) return;

      const isVirtual =
        appointment.consultationType === "online" ||
        (appointment.location &&
          (appointment.location.toLowerCase().includes("virtual") ||
            appointment.location.toLowerCase().includes("video") ||
            appointment.location.toLowerCase().includes("online")));

      if (isVirtual && !appointment.videoLink) {
        setSelectedAppointmentForDetails(appointment);
        setIsDetailsModalOpen(true);

        await logAppointmentAction(
          "Confirmation Pending",
          appointment.id,
          appointment.title || appointment.type || "Appointment",
          `Virtual appointment requires video link before confirmation for ${appointment.client}`,
          "Info"
        );
        return;
      }

      const updated = await AppointmentService.updateAppointmentStatus(
        appointmentId,
        "confirmed"
      );

      if (updated) {
        await logAppointmentAction(
          "Confirmed",
          appointmentId,
          appointment.title || appointment.type || "Appointment",
          `Confirmed appointment for ${appointment.client}`,
          "Info"
        );

        await AppointmentService.createClientNotification(
          appointment.clientId || "",
          {
            type: "appointment",
            title: "Appointment Confirmed",
            message: `Your appointment on ${new Date(
              appointment.date
            ).toLocaleDateString()} at ${appointment.time} has been confirmed.${
              appointment.videoLink
                ? ` Video link: ${appointment.videoLink}`
                : ""
            }`,
            appointmentId: appointmentId,
          }
        );

        toast({
          title: "Success",
          description: "Appointment confirmed. Client has been notified.",
        });

        handleRefresh();
      }
    } catch (error: any) {
      console.error("Error confirming appointment:", error);

      await logAction(
        "Appointment Confirmation Error",
        `Appointment: ${appointmentId}`,
        `Failed to confirm appointment: ${error.message}`,
        "Critical"
      );

      toast({
        title: "Error",
        description: error.message || "Failed to confirm appointment",
        variant: "destructive",
      });
    }
  };

  const handleCompleteAppointment = async (appointmentId: string) => {
    try {
      const updated = await AppointmentService.completeAppointment(
        appointmentId
      );

      if (updated) {
        const appointment = appointments.find(
          (apt) => apt.id === appointmentId
        );

        if (appointment) {
          await logAppointmentAction(
            "Completed",
            appointmentId,
            appointment.title || appointment.type || "Appointment",
            `Marked appointment as completed for ${appointment.client}`,
            "Info"
          );
        }

        toast({
          title: "Success",
          description: "Appointment marked as completed.",
        });

        handleRefresh();
      }
    } catch (error: any) {
      console.error("Error completing appointment:", error);

      await logAction(
        "Appointment Completion Error",
        `Appointment: ${appointmentId}`,
        `Failed to mark as completed: ${error.message}`,
        "Critical"
      );

      toast({
        title: "Error",
        description: error.message || "Failed to mark appointment as completed",
        variant: "destructive",
      });
    }
  };

  const handleStartVideoCall = (appointment: Appointment) => {
    if (!appointment.videoLink) {
      toast({
        title: "No Video Link",
        description: "Please add a video link to this appointment first",
        variant: "destructive",
      });

      logAction(
        "Video Call Attempt Failed",
        `Appointment: ${appointment.id}`,
        `Attempted to start video call without video link for ${appointment.client}`,
        "Warning"
      );
      return;
    }

    window.open(appointment.videoLink, "_blank", "noopener,noreferrer");

    logAction(
      "Video Call Started",
      `Appointment: ${appointment.id}`,
      `Started video call with ${appointment.client}`,
      "Info"
    );

    toast({
      title: "Starting Video Call",
      description: "Video call is opening in a new tab",
    });
  };

  const handleRefreshDetails = () => {
    handleRefresh();
  };

  const handleOpenAvailabilityModal = () => {
    setIsAvailabilityModalOpen(true);

    logAction(
      "Manage Availability",
      "Appointments System",
      "Opened availability management modal",
      "Info"
    );
  };

  const isVirtualAppointment = (appointment: Appointment) => {
    return (
      appointment.consultationType === "online" ||
      (appointment.location &&
        (appointment.location.toLowerCase().includes("virtual") ||
          appointment.location.toLowerCase().includes("video") ||
          appointment.location.toLowerCase().includes("online")))
    );
  };

  const hasVideoLink = (appointment: Appointment) => {
    return !!appointment.videoLink && appointment.videoLink.trim() !== "";
  };

  const printAppointmentReports = () => {
    if (filteredAppointments.length === 0) {
      toast({
        title: "Error",
        description: "No appointments to download",
        variant: "destructive",
      });
      return;
    }

    try {
      const pdfGen = new PDFGenerator();
      
      const appointmentsData = filteredAppointments.map(apt => ({
        client: apt.client,
        type: apt.type || apt.title || 'Consultation',
        date: apt.date,
        time: apt.time,
        location: apt.location,
        status: apt.status,
      }));
      
      pdfGen.generateAppointmentsReport(
        appointmentsData,
        formatDateRange(dateRange),
        adminUserData?.fullName || 'Administrator',
        adminUserData?.email || 'N/A'
      );
      
      const filename = `Appointment_Reports_${new Date().toISOString().split('T')[0]}.pdf`;
      pdfGen.download(filename);
      
      toast({
        title: "Success",
        description: "Appointment reports downloaded successfully",
      });

      logAction(
        "Download Appointment Reports",
        "Appointments Dashboard",
        `Downloaded ${filteredAppointments.length} appointment reports`,
        "Info"
      );
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF report",
        variant: "destructive",
      });
    }
  };

  const AppointmentCaseInfo = ({
    appointment,
  }: {
    appointment: Appointment;
  }) => {
    const appointmentCase = getCaseForAppointment(appointment);

    if (!appointmentCase) return null;

    return (
      <div className="mt-4 space-y-4">
        {appointment.appointmentCaseStepName && (
          <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-md border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <ListTodo className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Case Step at time of scheduling:
              </span>
              <span className="font-bold text-blue-800 dark:text-blue-200">
                Step {appointment.appointmentCaseStep + 1}:{" "}
                {appointment.appointmentCaseStepName}
              </span>
            </div>
            {appointment.caseProgress !== undefined && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 mb-1">
                  <span>Case Progress at time of scheduling:</span>
                  <span className="font-bold">{appointment.caseProgress}%</span>
                </div>
                <Progress value={appointment.caseProgress} className="h-2" />
              </div>
            )}
          </div>
        )}

        {appointmentCase &&
          appointmentCase.processSteps &&
          appointmentCase.processSteps.length > 0 && (
            <Collapsible
              open={expandedAppointmentId === appointment.id}
              onOpenChange={() =>
                setExpandedAppointmentId(
                  expandedAppointmentId === appointment.id
                    ? null
                    : appointment.id
                )
              }
              className="mt-3"
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    <span>View Case Process Steps</span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      expandedAppointmentId === appointment.id
                        ? "rotate-180"
                        : ""
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <ListTodo className="h-4 w-4" />
                    Case Process Steps - {appointmentCase.title}
                  </h4>

                  {appointmentCase.progressPercentage !== undefined && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          Overall Progress
                        </span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {appointmentCase.progressPercentage}%
                        </span>
                      </div>
                      <Progress
                        value={appointmentCase.progressPercentage}
                        className="h-2"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    {appointmentCase.processSteps.map((step, index) => {
                      const isCurrentStep =
                        index ===
                        (appointment.appointmentCaseStep ||
                          appointmentCase.currentStep ||
                          0);
                      const isCompleted = step.status === "completed";
                      const isInProgress = step.status === "in_progress";

                      return (
                        <div
                          key={step.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border ${
                            isCurrentStep
                              ? "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-blue-200 dark:border-blue-800"
                              : isCompleted
                              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                              : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                          }`}
                        >
                          <div className="flex-shrink-0">
                            {getProcessStepStatusIcon(step.status)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {step.name}
                                </span>
                                {isCurrentStep && (
                                  <Badge
                                    variant="outline"
                                    className="bg-blue-100 text-blue-700 border-blue-300"
                                  >
                                    Scheduled at this step
                                  </Badge>
                                )}
                              </div>
                              <Badge
                                className={`
                                ${
                                  isCompleted
                                    ? "bg-green-100 text-green-800"
                                    : ""
                                }
                                ${
                                  isInProgress
                                    ? "bg-blue-100 text-blue-800"
                                    : ""
                                }
                                ${
                                  step.status === "pending"
                                    ? "bg-gray-100 text-gray-800"
                                    : ""
                                }
                                ${
                                  step.status === "skipped"
                                    ? "bg-gray-100 text-gray-800"
                                    : ""
                                }
                              `}
                              >
                                {step.status.replace("_", " ")}
                              </Badge>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {step.completedDate &&
                                `Completed: ${step.completedDate}`}
                              {step.notes && ` • ${step.notes}`}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {appointment.appointmentCaseStepName && (
                    <div className="mt-4 p-3 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 rounded-lg border border-blue-300 dark:border-blue-700">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                        <span className="font-bold text-blue-800 dark:text-blue-300">
                          This appointment was scheduled to discuss:
                        </span>
                      </div>
                      <p className="mt-1 font-medium text-blue-900 dark:text-blue-200">
                        Step {appointment.appointmentCaseStep + 1}:{" "}
                        {appointment.appointmentCaseStepName}
                      </p>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <AdminDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-navy-700 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading appointments...</p>
          </div>
        </div>
      </AdminDashboardLayout>
    );
  }

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-playfair text-navy-900 dark:text-white">
              Appointments
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage client appointments and consultations with case
              progress tracking
            </p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-gray-500">
                Appointments: {appointments.length} • Clients:{" "}
                {clients.length} • Cases: {cases.length}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="h-6 w-6 p-0"
                title="Refresh"
              >
                <RefreshCw
                  className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={printAppointmentReports}
              className="bg-white hover:bg-gray-50 border-navy-200"
            >
              <Printer className="h-4 w-4 mr-2" />
              Download Reports (PDF)
            </Button>
            <Button variant="outline" onClick={handleOpenAvailabilityModal}>
              <CalendarX className="h-4 w-4 mr-2" />
              Manage Availability
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search appointments by client name, purpose, email, phone, ID, or video link..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="this-year">This Year</SelectItem>
                <SelectItem value="all-time">All Time</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setDateRange("all-time");
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>

        <Tabs
          defaultValue="all"
          className="w-full md:w-auto"
          onValueChange={setStatusFilter}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-4">
          {filteredAppointments.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="p-8 text-center">
                <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  No Appointments Found
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchQuery ||
                  statusFilter !== "all" ||
                  dateRange !== "all-time"
                    ? "No appointments match your search criteria"
                    : "No appointments scheduled yet"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredAppointments.map((appointment) => {
              const client = getClientForAppointment(appointment);

              return (
                <Card
                  key={appointment.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-navy-900 dark:text-white">
                            {appointment.type || appointment.title}
                          </h3>
                          <Badge
                            className={getStatusColor(appointment.status)}
                          >
                            {getStatusDisplay(appointment.status)}
                          </Badge>
                          {isVirtualAppointment(appointment) && (
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-200"
                            >
                              <Video className="h-3 w-3 mr-1" />
                              Virtual
                            </Badge>
                          )}
                          {appointment.caseTitle && (
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-200"
                            >
                              <Briefcase className="h-3 w-3 mr-1" />
                              Case Related
                            </Badge>
                          )}
                        </div>

                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                          {appointment.caseTitle ? (
                            <div>
                              <p className="text-gray-900 dark:text-white font-medium">
                                Case: {appointment.caseTitle}
                              </p>
                              {appointment.appointmentPurpose && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {appointment.appointmentPurpose}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-gray-900 dark:text-white font-medium">
                              {appointment.appointmentPurpose ||
                                appointment.description ||
                                "General Legal Consultation"}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">
                              {appointment.client}
                            </span>
                            {appointment.clientId === "admin-created" && (
                              <Badge variant="outline" className="text-xs">
                                Admin Created
                              </Badge>
                            )}
                          </div>
                          {appointment.clientEmail && (
                            <div className="flex items-center gap-1 text-gray-600">
                              <Mail className="h-3 w-3" />
                              {appointment.clientEmail}
                            </div>
                          )}
                          {appointment.clientPhone && (
                            <div className="flex items-center gap-1 text-gray-600">
                              <Phone className="h-3 w-3" />
                              {appointment.clientPhone}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <AppointmentOptionsMenu
                          appointmentId={appointment.id}
                          onReschedule={handleReschedule}
                          onCancel={handleCancel}
                          appointmentStatus={appointment.status}
                          isAdmin={true}
                          onConfirm={() =>
                            handleConfirmAppointment(appointment.id)
                          }
                          onComplete={() =>
                            handleCompleteAppointment(appointment.id)
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <CalendarIcon className="h-4 w-4 text-navy-700 dark:text-navy-300" />
                        <span>
                          {new Date(appointment.date).toLocaleDateString(
                            "en-US",
                            {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Clock className="h-4 w-4 text-navy-700 dark:text-navy-300" />
                        <span>{appointment.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        {getLocationIcon(appointment.location)}
                        <span>{appointment.location}</span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">
                          ID: {appointment.id}
                        </span>
                      </div>
                    </div>

                    <AppointmentCaseInfo appointment={appointment} />

                    {isVirtualAppointment(appointment) &&
                      appointment.videoLink && (
                        <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <LinkIcon className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                                Video Link:
                              </span>
                              <a
                                href={appointment.videoLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline dark:text-blue-400 truncate max-w-xs"
                                title={appointment.videoLink}
                              >
                                {appointment.videoLink.length > 50
                                  ? `${appointment.videoLink.substring(
                                      0,
                                      50
                                    )}...`
                                  : appointment.videoLink}
                              </a>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() =>
                                handleStartVideoCall(appointment)
                              }
                            >
                              <Video className="h-3 w-3 mr-1" />
                              Join
                            </Button>
                          </div>
                        </div>
                      )}

                    {isVirtualAppointment(appointment) &&
                      appointment.status === "confirmed" &&
                      !appointment.videoLink && (
                        <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200 dark:border-yellow-800">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                              Missing Video Link
                            </span>
                            <span className="text-sm text-yellow-600 dark:text-yellow-400">
                              This virtual appointment needs a video link
                            </span>
                          </div>
                        </div>
                      )}

                    {(appointment.rescheduleReason ||
                      appointment.cancellationReason) && (
                      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {appointment.rescheduleReason
                            ? "Reschedule Reason"
                            : "Cancellation Reason"}
                          :
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {appointment.rescheduleReason ||
                            appointment.cancellationReason}
                          {appointment.rescheduledBy &&
                            ` (by ${appointment.rescheduledBy})`}
                          {appointment.cancelledBy &&
                            ` (by ${appointment.cancelledBy})`}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(appointment)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                      {client && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push(
                              `/dashboard/admin/clients/${client.id}`
                            )
                          }
                        >
                          <User className="h-4 w-4 mr-1" />
                          View Client
                        </Button>
                      )}
                      {appointment.status === "confirmed" &&
                        isVirtualAppointment(appointment) &&
                        hasVideoLink(appointment) && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() =>
                              handleStartVideoCall(appointment)
                            }
                          >
                            <Video className="h-4 w-4 mr-1" />
                            Start Call
                          </Button>
                        )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <ManageAvailabilityModal
          isOpen={isAvailabilityModalOpen}
          onClose={() => setIsAvailabilityModalOpen(false)}
          onUpdate={handleRefresh}
        />

        {selectedAppointment && (
          <>
            <RescheduleAppointmentModal
              isOpen={isRescheduleModalOpen}
              onClose={() => {
                setIsRescheduleModalOpen(false);
                setSelectedAppointment(null);
              }}
              appointmentId={selectedAppointment.id}
              currentDate={new Date(selectedAppointment.date)}
              currentTime={selectedAppointment.time}
              onReschedule={handleRescheduleSubmit}
              isClient={false}
              appointmentService={AppointmentService}
            />

            <CancelAppointmentModal
              isOpen={isCancelModalOpen}
              onClose={() => {
                setIsCancelModalOpen(false);
                setSelectedAppointment(null);
              }}
              appointmentId={selectedAppointment.id}
              appointmentDetails={{
                title:
                  selectedAppointment.title ||
                  selectedAppointment.type ||
                  "Appointment",
                date: new Date(selectedAppointment.date),
                time: selectedAppointment.time,
                client: selectedAppointment.client,
              }}
              onCancel={handleCancelSubmit}
              isClient={false}
            />
          </>
        )}

        {selectedAppointmentForDetails && (
          <AppointmentDetailsModal
            isOpen={isDetailsModalOpen}
            onClose={() => {
              setIsDetailsModalOpen(false);
              setSelectedAppointmentForDetails(null);
            }}
            appointmentId={selectedAppointmentForDetails.id}
            isAdmin={true}
            onStatusChange={handleStatusChange}
            onCancel={(id) => handleCancel(id)}
            onReschedule={(id) => handleReschedule(id)}
            onRefresh={handleRefreshDetails}
          />
        )}
      </div>
    </AdminDashboardLayout>
  );
}