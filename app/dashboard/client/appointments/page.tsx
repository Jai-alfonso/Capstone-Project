"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarIcon,
  Clock,
  MapPin,
  Plus,
  Video,
  Phone,
  RefreshCw,
  Search,
  Eye,
  Mail,
  Link as LinkIcon,
  AlertCircle,
  User,
  Briefcase,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  CheckCircle,
  Clock as ClockIcon,
  FileText,
  Sparkles,
  ListTodo,
  Layers,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ClientDashboardLayout } from "@/components/client-dashboard-layout";
import { ScheduleAppointmentModal } from "@/components/schedule-appointment-modal";
import { AppointmentOptionsMenu } from "@/components/appointment-options-menu";
import { RescheduleAppointmentModal } from "@/components/reschedule-appointment-modal";
import { CancelAppointmentModal } from "@/components/cancel-appointment-modal";
import AppointmentService, { Appointment } from "@/lib/appointment-service";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { format } from "date-fns";
import { db } from "@/firebase/config";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useFirestoreCleanup } from "@/hooks/useFirestoreCleanup";
import { isLogoutInProgress } from "@/lib/auth-service";

const AppointmentDetailsModal = dynamic(
  () =>
    import("@/components/appointment-details-modal").then(
      (mod) => mod.AppointmentDetailsModal
    ),
  { ssr: false }
);

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

export default function AppointmentsPage() {
  const { register, unregister } = useFirestoreCleanup("appointments-page");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<
    Appointment[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [selectedAppointmentForDetails, setSelectedAppointmentForDetails] =
    useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    email: string;
    phone: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [expandedAppointmentId, setExpandedAppointmentId] = useState<
    string | null
  >(null);
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);

  // Refs to track subscriptions
  const authUnsubscribeRef = useRef<(() => void) | null>(null);
  const appointmentsUnsubscribeRef = useRef<(() => void) | null>(null);
  const listenerIdsRef = useRef<string[]>([]);

  useEffect(() => {
    const auth = getAuth();

    const handleAuthStateChange = async (user: any) => {
      // If logout is in progress, skip processing
      if (isLogoutInProgress()) {
        console.log("[Appointments] Skipping auth change - logout in progress");
        return;
      }

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
      } else {
        // Clean up listeners when user logs out
        cleanupListeners();

        const fallbackUser = {
          id: localStorage.getItem("userId") || `USER-${Date.now()}`,
          name: "Client",
          email: localStorage.getItem("userEmail") || "",
          phone: "",
        };
        setCurrentUser(fallbackUser);
      }
    };

    authUnsubscribeRef.current = onAuthStateChanged(
      auth,
      handleAuthStateChange
    );

    return () => {
      if (authUnsubscribeRef.current) {
        authUnsubscribeRef.current();
      }
      cleanupListeners();
    };
  }, []);

  // Cleanup function for listeners
  const cleanupListeners = () => {
    // Clean up appointments listener
    if (appointmentsUnsubscribeRef.current) {
      try {
        appointmentsUnsubscribeRef.current();
      } catch (error) {
        console.error("Error cleaning up appointments listener:", error);
      }
      appointmentsUnsubscribeRef.current = null;
    }

    // Clean up registered listener IDs
    listenerIdsRef.current.forEach((id) => {
      try {
        unregister(id);
      } catch (error) {
        console.error("Error unregistering listener:", error);
      }
    });
    listenerIdsRef.current = [];
  };

  useEffect(() => {
    // Don't load data if logout is in progress
    if (isLogoutInProgress()) {
      console.log("[Appointments] Skipping data load - logout in progress");
      return;
    }

    if (!currentUser?.id) {
      // If no user, clear data
      setAppointments([]);
      setFilteredAppointments([]);
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Clean up any existing listeners first
        cleanupListeners();

        // Load appointments with safe wrapper
        const userAppointments = await loadAppointmentsSafely(currentUser.id);
        setAppointments(userAppointments);

        // Load client data and cases
        await Promise.all([loadClientData(), loadCases()]);

        // Set up real-time listener with safe wrapper
        const unsubscribe = setupAppointmentsListenerSafely(currentUser.id);
        if (unsubscribe) {
          const id = register(unsubscribe);
          listenerIdsRef.current.push(id);
          appointmentsUnsubscribeRef.current = unsubscribe;
        }
      } catch (error: any) {
        // Don't log permission-denied errors during logout
        if (error.code === "permission-denied" && isLogoutInProgress()) {
          console.log(
            "[Appointments] Permission denied - logout in progress, ignoring"
          );
          return;
        }

        console.error("[Appointments] Error loading appointments:", error);
        setError("Failed to load appointments. Please refresh the page.");
        toast.error("Failed to load appointments. Please refresh the page.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    return () => {
      cleanupListeners();
    };
  }, [currentUser]);

  // Safe wrapper for loading appointments
  const loadAppointmentsSafely = async (clientId: string) => {
    if (isLogoutInProgress()) {
      console.log(
        "[Appointments] Skipping appointments load - logout in progress"
      );
      return [];
    }

    try {
      const userAppointments = await AppointmentService.getAppointmentsByClient(
        clientId
      );
      return userAppointments;
    } catch (error: any) {
      // Check for permission denied specifically
      if (error.code === "permission-denied") {
        if (isLogoutInProgress()) {
          console.log(
            "[Appointments] Permission denied during logout - ignoring"
          );
          return [];
        }
        throw error;
      }
      throw error;
    }
  };

  // Safe wrapper for setting up real-time listener
  const setupAppointmentsListenerSafely = (clientId: string) => {
    if (isLogoutInProgress()) {
      console.log(
        "[Appointments] Skipping listener setup - logout in progress"
      );
      return null;
    }

    try {
      const unsubscribe = AppointmentService.subscribeToAppointments(
        (realTimeAppointments) => {
          // Don't update state if logout is in progress
          if (isLogoutInProgress()) {
            console.log(
              "[Appointments] Skipping state update - logout in progress"
            );
            return;
          }
          setAppointments(realTimeAppointments);
        },
        clientId
      );

      return unsubscribe;
    } catch (error: any) {
      // Don't log permission-denied errors during logout
      if (error.code === "permission-denied" && isLogoutInProgress()) {
        console.log("[Appointments] Listener permission denied during logout");
        return null;
      }
      console.error("[Appointments] Error setting up listener:", error);
      return null;
    }
  };

  const loadClientData = async () => {
    try {
      // Don't load data if logout is in progress
      if (isLogoutInProgress()) {
        console.log("[Appointments] Skipping client load - logout in progress");
        return;
      }

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
      // Don't log permission-denied errors during logout
      if (error.code === "permission-denied" && isLogoutInProgress()) {
        console.log(
          "[Appointments] Client data permission denied during logout"
        );
        return;
      }
      console.error("Error loading clients:", error);
    }
  };

  const loadCases = async () => {
    try {
      // Don't load data if logout is in progress
      if (isLogoutInProgress()) {
        console.log("[Appointments] Skipping cases load - logout in progress");
        return;
      }

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
      // Don't log permission-denied errors during logout
      if (error.code === "permission-denied" && isLogoutInProgress()) {
        console.log(
          "[Appointments] Cases data permission denied during logout"
        );
        return;
      }
      console.error("Error loading cases:", error);
    }
  };

  const getMyCases = () => {
    if (!currentUser) {
      console.log("No current user");
      return [];
    }

    console.log("Current user:", currentUser);
    console.log("Available clients:", clients.length);
    console.log("Available cases:", cases.length);

    const client = clients.find(
      (c) =>
        c.userId === currentUser.id ||
        c.email === currentUser.email ||
        c.id === currentUser.id
    );

    if (!client) {
      console.log("No client found for current user");
      return [];
    }

    // Construct full name from firstName and lastName
    const clientFullName = `${client.firstName || ""} ${client.lastName || ""}`.trim();
    console.log("=== DEBUGGING getMyCases ===");
    console.log("Current user:", currentUser?.name, "ID:", currentUser?.id);
    console.log("Found client:", client.firstName, client.lastName, "ID:", client.id, "userId:", client.userId);
    console.log("Constructed full name:", clientFullName);
    console.log("Total available cases:", cases.length);
    console.log("All cases clientNames:", cases.map(c => ({ title: c.title, clientName: c.clientName, clientId: c.clientId })));

    const clientCases = cases.filter((c) => {
      // Primary match: check if case's clientId matches the client's id or userId
      const primaryMatch =
        c.clientId === client.id ||
        c.clientId === client.userId;

      // Secondary match: check name-based matching using constructed full name
      const secondaryMatch = clientFullName
        ? c.clientName === clientFullName ||
          (c.clientName &&
            c.clientName.toLowerCase().includes(clientFullName.toLowerCase())) ||
          (c.clientName &&
            clientFullName.toLowerCase().includes(c.clientName.toLowerCase()))
        : false;

      // Tertiary match: check against currentUser.name if client doesn't have firstName/lastName
      const tertiaryMatch = currentUser?.name
        ? c.clientName === currentUser.name ||
          (c.clientName &&
            c.clientName.toLowerCase().includes(currentUser.name.toLowerCase())) ||
          (c.clientName &&
            currentUser.name.toLowerCase().includes(c.clientName.toLowerCase()))
        : false;

      const matches = primaryMatch || secondaryMatch || tertiaryMatch;

      console.log("Checking case:", c.title, "primaryMatch:", primaryMatch, "secondaryMatch:", secondaryMatch, "tertiaryMatch:", tertiaryMatch, "case.clientId:", c.clientId, "case.clientName:", c.clientName);

      if (matches) {
        console.log("✓ MATCH FOUND:", c.title);
      }
      return matches;
    });

    console.log("Final result - Client cases found:", clientCases.length);
    console.log("=== END DEBUG ===");
    return clientCases;
  };

  useEffect(() => {
    let filtered = appointments;

    if (searchQuery) {
      filtered = filtered.filter(
        (appointment) =>
          appointment.title
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          appointment.description
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          appointment.appointmentPurpose
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          appointment.attorney
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          appointment.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          appointment.location
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
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
  }, [appointments, searchQuery, statusFilter]);

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

  const getCaseStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "closed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
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
    if (!location) return <MapPin className="h-4 w-4" />;

    const locationLower = location.toLowerCase();
    if (
      locationLower.includes("video") ||
      locationLower.includes("virtual") ||
      locationLower.includes("online")
    ) {
      return <Video className="h-4 w-4" />;
    } else if (locationLower.includes("phone")) {
      return <Phone className="h-4 w-4" />;
    } else {
      return <MapPin className="h-4 w-4" />;
    }
  };

  const handleRefresh = async () => {
    if (!currentUser?.id || isLogoutInProgress()) {
      console.log(
        "[Appointments] Skipping refresh - no user or logout in progress"
      );
      return;
    }

    setRefreshing(true);
    try {
      const userAppointments = await loadAppointmentsSafely(currentUser.id);
      setAppointments(userAppointments);

      await Promise.all([loadClientData(), loadCases()]);

      toast.success("Appointments refreshed successfully!");
    } catch (error: any) {
      // Don't log permission-denied errors during logout
      if (error.code === "permission-denied" && isLogoutInProgress()) {
        console.log("[Appointments] Refresh permission denied during logout");
        return;
      }
      console.error("Error refreshing appointments:", error);
      toast.error("Failed to refresh appointments. Please try again.");
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  const handleViewDetails = (appointment: Appointment) => {
    setSelectedAppointmentForDetails(appointment);
    setIsDetailsModalOpen(true);
  };

  const handleReschedule = (id: string) => {
    const appointment = appointments.find((apt) => apt.id === id);
    if (appointment) {
      setSelectedAppointment(appointment);
      setIsRescheduleModalOpen(true);
    }
  };

  const handleRescheduleSubmit = async (
    appointmentId: string,
    newDate: Date,
    newTime: string,
    reason: string
  ) => {
    try {
      if (!currentUser || isLogoutInProgress()) {
        toast.error("Please sign in to reschedule appointments.");
        return;
      }

      const availabilityCheck = await AppointmentService.isTimeSlotAvailable(
        newDate,
        newTime
      );

      if (!availabilityCheck.available) {
        toast.error(
          availabilityCheck.reason || "This time slot is not available."
        );
        return;
      }

      const dateStr = format(newDate, "yyyy-MM-dd");
      // Use rescheduleAppointment method which creates notifications
      const updated = await AppointmentService.rescheduleAppointment(
        appointmentId,
        dateStr,
        newTime,
        reason,
        "client"
      );

      if (updated) {
        toast.success("Reschedule request submitted successfully!");
        toast.info("The law office will review and respond to your request.");

        setIsRescheduleModalOpen(false);
        setSelectedAppointment(null);
      } else {
        toast.error("Failed to submit reschedule request. Please try again.");
      }
    } catch (error: any) {
      console.error("Error rescheduling appointment:", error);
      toast.error(
        error.message ||
          "Failed to submit reschedule request. Please try again."
      );
    }
  };

  const handleCancel = (id: string) => {
    const appointment = appointments.find((apt) => apt.id === id);
    if (appointment) {
      setSelectedAppointment(appointment);
      setIsCancelModalOpen(true);
    }
  };

  const handleCancelSubmit = async (appointmentId: string, reason: string) => {
    try {
      if (!currentUser || isLogoutInProgress()) {
        toast.error("Please sign in to cancel appointments.");
        return;
      }

      // Use cancelAppointment method which creates notifications
      const updated = await AppointmentService.cancelAppointment(
        appointmentId,
        reason,
        "client"
      );

      if (updated) {
        toast.success("Appointment cancelled successfully!");
        toast.info("Both you and the law office have been notified.");

        setIsCancelModalOpen(false);
        setSelectedAppointment(null);
      } else {
        toast.error("Failed to cancel appointment. Please try again.");
      }
    } catch (error: any) {
      console.error("Error cancelling appointment:", error);
      toast.error(
        error.message || "Failed to cancel appointment. Please try again."
      );
    }
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
      processSteps?: CaseProcessStep[];
      progressPercentage?: number;
    }
  ) => {
    try {
      if (!currentUser || isLogoutInProgress()) {
        toast.error("Please sign in to schedule an appointment.");
        return;
      }

      if (!date || !time || !consultationType) {
        toast.error("Please select date, time, and consultation type.");
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

      const selectedCase = selectedCaseId
        ? cases.find((c) => c.id === selectedCaseId)
        : null;

      let purpose = "";
      let appointmentTitle = "";

      if (selectedCase) {
        purpose = `Discuss case: ${selectedCase.title}`;
        appointmentTitle = `Consultation - ${selectedCase.title}`;
      } else if (appointmentPurpose) {
        purpose = appointmentPurpose;
        appointmentTitle = `General Consultation - ${appointmentPurpose.substring(
          0,
          30
        )}${appointmentPurpose.length > 30 ? "..." : ""}`;
      } else {
        purpose = "General legal consultation";
        appointmentTitle = `${
          consultationType === "online" ? "Online" : "In-Person"
        } Consultation`;
      }

      const appointmentData: any = {
        title: appointmentTitle,
        type:
          consultationType === "online"
            ? "Online Consultation"
            : "In-Person Consultation",
        date: dateStr,
        time: time,
        client: currentUser.name,
        clientId: currentUser.id,
        clientEmail: currentUser.email,
        clientPhone: currentUser.phone || "",
        attorney: "Atty. Alia Jan Delgado",
        attorneyId: "atty.alia_jan_delgado",
        attorneyName: "Atty. Alia Jan Delgado",
        status: "pending",
        location: location,
        description: purpose,
        appointmentPurpose: purpose,
        consultationType: consultationType as "online" | "in-person",
        ...(selectedCase && {
          caseId: selectedCase.id,
          caseTitle: selectedCase.title,
          caseType: selectedCase.caseType,
          caseServiceType: selectedCase.serviceType,
          casePriority: selectedCase.priority,
          caseProgress: selectedCase.progressPercentage || 0,
          currentCaseStep:
            caseStepInfo?.currentStep || selectedCase.currentStep || 0,
          currentCaseStepName:
            caseStepInfo?.currentStepName ||
            selectedCase.processSteps?.[selectedCase.currentStep || 0]?.name ||
            "",
          caseProcessSteps: selectedCase.processSteps || [],
          appointmentCaseStep:
            caseStepInfo?.currentStep || selectedCase.currentStep || 0,
          appointmentCaseStepName:
            caseStepInfo?.currentStepName ||
            selectedCase.processSteps?.[selectedCase.currentStep || 0]?.name ||
            "",
        }),
      };

      const newAppointment = await AppointmentService.addAppointment(
        appointmentData
      );

      if (newAppointment) {
        toast.success(
          selectedCase
            ? `Appointment scheduled for case: ${selectedCase.title}`
            : `Appointment scheduled: ${purpose}`
        );
        toast.info("The law office will review and confirm your appointment.");

        setIsScheduleModalOpen(false);

        handleRefresh();
      } else {
        toast.error("Failed to submit appointment request. Please try again.");
      }
    } catch (error: any) {
      console.error("Error scheduling appointment:", error);

      let errorMessage = "Failed to schedule appointment. Please try again.";

      if (error.message) {
        if (error.message.includes("already booked")) {
          errorMessage =
            "This time slot is already booked. Please select another time.";
        } else if (error.message.includes("past")) {
          errorMessage = "Cannot schedule appointments in the past.";
        } else if (error.message.includes("unavailable")) {
          errorMessage = "The selected date or time is unavailable.";
        } else {
          errorMessage = error.message;
        }
      }

      toast.error(errorMessage);
    }
  };

  const handleStatusChange = async (
    appointmentId: string,
    newStatus: string
  ) => {
    try {
      await AppointmentService.updateAppointment(appointmentId, {
        status: newStatus as Appointment["status"],
        updatedAt: new Date().toISOString(),
      });

      toast.success(`Appointment ${newStatus} successfully!`);
      handleRefresh();
    } catch (error: any) {
      console.error("Error updating appointment status:", error);
      toast.error(error.message || "Failed to update appointment status.");
    }
  };

  const handleStartVideoCall = (appointment: Appointment) => {
    if (!appointment.videoLink) {
      toast.error("No video link available for this appointment.");
      return;
    }

    window.open(appointment.videoLink, "_blank", "noopener,noreferrer");

    toast.info("Opening video call in new tab...");
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

  const isInPersonAppointment = (appointment: Appointment) => {
    return (
      appointment.consultationType === "in-person" ||
      (appointment.location &&
        (appointment.location.toLowerCase().includes("office") ||
          appointment.location.toLowerCase().includes("in-person") ||
          appointment.location.toLowerCase().includes("physical")))
    );
  };

  const hasVideoLink = (appointment: Appointment) => {
    return !!appointment.videoLink && appointment.videoLink.trim() !== "";
  };

  const myCases = getMyCases();
  console.log("myCases for modal:", myCases);
  const activeCasesCount = myCases.filter((c) => c.status === "active").length;
  const averageProgress =
    myCases.length > 0
      ? Math.round(
          myCases.reduce((sum, c) => sum + (c.progressPercentage || 0), 0) /
            myCases.length
        )
      : 0;

  if (!currentUser || isLoading) {
    return (
      <ClientDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-navy-700 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your appointments...</p>
          </div>
        </div>
      </ClientDashboardLayout>
    );
  }

  return (
    <ClientDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-playfair text-navy-900 dark:text-white">
              My Appointments
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your consultations and meetings
            </p>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <CalendarIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Appointments</p>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {filteredAppointments.length} of {appointments.length}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Briefcase className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active Cases</p>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {activeCasesCount} of {myCases.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              className="bg-navy-700 hover:bg-navy-800"
              onClick={() => setIsScheduleModalOpen(true)}
              disabled={isLogoutInProgress()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Schedule Appointment
            </Button>
          </div>
        </div>

        {/* General Consultation Info Card removed per request */}

        {/* Error Message */}
        {error && !isLogoutInProgress() && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search appointments by title, purpose, attorney..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                disabled={isLogoutInProgress()}
              />
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
        </div>

        {/* Appointments List */}
        <div className="space-y-4">
          {filteredAppointments.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="p-8 text-center">
                <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  {appointments.length === 0
                    ? "No Appointments Yet"
                    : "No Matching Appointments"}
                </h3>
                <p className="text-gray-500 mb-4">
                  {appointments.length === 0
                    ? "Schedule your first appointment to get started with legal consultation"
                    : "No appointments match your search criteria"}
                </p>
                {appointments.length === 0 && !isLogoutInProgress() && (
                  <Button
                    className="bg-navy-700 hover:bg-navy-800"
                    onClick={() => setIsScheduleModalOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Appointment
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredAppointments.map((appointment) => {
              const appointmentCase = getCaseForAppointment(appointment);

              return (
                <div key={appointment.id} className="space-y-4">
                  <Card className="hover:shadow-md transition-shadow border-gray-200 dark:border-gray-700">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-navy-900 dark:text-white">
                              {appointment.title ||
                                appointment.type ||
                                "Appointment"}
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
                            {isInPersonAppointment(appointment) && (
                              <Badge
                                variant="outline"
                                className="bg-purple-50 text-purple-700 border-purple-200"
                              >
                                <MapPin className="h-3 w-3 mr-1" />
                                In-Person
                              </Badge>
                            )}
                            {appointment.caseTitle ? (
                              <Badge
                                variant="outline"
                                className="bg-green-50 text-green-700 border-green-200"
                              >
                                <Briefcase className="h-3 w-3 mr-1" />
                                Case Related
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-yellow-50 text-yellow-700 border-yellow-200"
                              >
                                <Sparkles className="h-3 w-3 mr-1" />
                                General Consultation
                              </Badge>
                            )}
                          </div>

                          {/* Appointment Purpose/Description */}
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

                          {/* Case Step Information - Show current step when appointment was scheduled */}
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
                                    <span>
                                      Case Progress at time of scheduling:
                                    </span>
                                    <span className="font-bold">
                                      {appointment.caseProgress}%
                                    </span>
                                  </div>
                                  <Progress
                                    value={appointment.caseProgress}
                                    className="h-2"
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          {/* Appointment Info Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                            <div className="flex items-center gap-2 text-sm">
                              <CalendarIcon className="h-4 w-4 text-navy-700 dark:text-navy-300" />
                              <span className="text-gray-600 dark:text-gray-400">
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
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-navy-700 dark:text-navy-300" />
                              <span className="text-gray-600 dark:text-gray-400">
                                {appointment.time}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              {getLocationIcon(appointment.location)}
                              <span className="text-gray-600 dark:text-gray-400">
                                {appointment.location}
                              </span>
                            </div>
                          </div>

                          {/* Attorney Info */}
                          <div className="flex items-center gap-2 text-sm mt-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              {appointment.attorney}
                            </span>
                          </div>
                        </div>
                        <AppointmentOptionsMenu
                          appointmentId={appointment.id}
                          onReschedule={handleReschedule}
                          onCancel={handleCancel}
                          appointmentStatus={appointment.status}
                          disabled={isLogoutInProgress()}
                        />
                      </div>

                      {/* Show Case Process Steps if available */}
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
                            className="mt-4"
                          >
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-between"
                                disabled={isLogoutInProgress()}
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
                                  Case Process Steps
                                </h4>

                                {/* Show progress */}
                                {appointmentCase.progressPercentage !==
                                  undefined && (
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

                                {/* Process Steps Timeline */}
                                <div className="space-y-2">
                                  {appointmentCase.processSteps.map(
                                    (step, index) => {
                                      const isCurrentStep =
                                        index ===
                                        (appointment.appointmentCaseStep ||
                                          appointmentCase.currentStep ||
                                          0);
                                      const isCompleted =
                                        step.status === "completed";
                                      const isInProgress =
                                        step.status === "in_progress";

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
                                            {getProcessStepStatusIcon(
                                              step.status
                                            )}
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
                                              Step {step.order + 1} of{" "}
                                              {
                                                appointmentCase.processSteps
                                                  ?.length
                                              }
                                              {step.completedDate &&
                                                ` • Completed: ${step.completedDate}`}
                                              {step.notes && ` • ${step.notes}`}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    }
                                  )}
                                </div>

                                {/* Current step info */}
                                {appointment.appointmentCaseStepName && (
                                  <div className="mt-4 p-3 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 rounded-lg border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2">
                                      <CheckCircle className="h-4 w-4 text-blue-600" />
                                      <span className="font-bold text-blue-800 dark:text-blue-300">
                                        This appointment was scheduled to
                                        discuss:
                                      </span>
                                    </div>
                                    <p className="mt-1 font-medium text-blue-900 dark:text-blue-200">
                                      Step {appointment.appointmentCaseStep + 1}
                                      : {appointment.appointmentCaseStepName}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}

                      {/* Video Link Display */}
                      {hasVideoLink(appointment) && (
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
                              onClick={() => handleStartVideoCall(appointment)}
                              disabled={isLogoutInProgress()}
                            >
                              <Video className="h-3 w-3 mr-1" />
                              Join
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Missing Video Link Warning */}
                      {isVirtualAppointment(appointment) &&
                        appointment.status === "confirmed" &&
                        !hasVideoLink(appointment) && (
                          <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200 dark:border-yellow-800">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-yellow-600" />
                              <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                                Video Link Pending
                              </span>
                              <span className="text-sm text-yellow-600 dark:text-yellow-400">
                                Video link will be provided before the meeting
                              </span>
                            </div>
                          </div>
                        )}

                      {/* Additional Info */}
                      {(appointment.rescheduleReason ||
                        appointment.cancellationReason) && (
                        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {appointment.rescheduleReason
                              ? "Reschedule Reason"
                              : "Cancellation Reason"}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {appointment.rescheduleReason ||
                              appointment.cancellationReason}
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(appointment)}
                          disabled={isLogoutInProgress()}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                        {appointment.status === "confirmed" &&
                          hasVideoLink(appointment) && (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleStartVideoCall(appointment)}
                              disabled={isLogoutInProgress()}
                            >
                              <Video className="h-4 w-4 mr-1" />
                              Start Call
                            </Button>
                          )}

                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })
          )}
        </div>

        {/* Schedule Appointment Modal */}
        <ScheduleAppointmentModal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          onSelectDate={handleSelectDate}
          appointmentService={AppointmentService}
          currentUser={currentUser}
          cases={myCases}
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
              isClient={true}
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
              isClient={true}
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
            isAdmin={false}
            onStatusChange={handleStatusChange}
            onCancel={(id) => {
              const appointment = appointments.find((apt) => apt.id === id);
              if (appointment) {
                setSelectedAppointment(appointment);
                setIsCancelModalOpen(true);
              }
            }}
            onReschedule={(id) => {
              const appointment = appointments.find((apt) => apt.id === id);
              if (appointment) {
                setSelectedAppointment(appointment);
                setIsRescheduleModalOpen(true);
              }
            }}
          />
        )}
      </div>
    </ClientDashboardLayout>
  );
}


