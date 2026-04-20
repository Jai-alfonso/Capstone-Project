"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { NotificationsCard } from "@/components/notifications-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users,
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Clock,
  Eye,
  Plus,
  X,
  CheckCircle,
  Briefcase,
  CalendarIcon as CalendarIconLucide,
  Video,
  Phone,
  MapPin,
  User,
  ChevronDown,
  TrendingUp as TrendingUpIcon,
  RefreshCw,
  Search,
} from "lucide-react";
import { AdminDashboardLayout } from "@/components/admin-dashboard-layout";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { db } from "@/firebase/config";
import { collection, getDocs, query, where } from "firebase/firestore";
import AppointmentService, { Appointment } from "@/lib/appointment-service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ScheduleAppointmentModal } from "@/components/schedule-appointment-modal";
import { AppointmentDetailsModal } from "@/components/appointment-details-modal";
import { RescheduleAppointmentModal } from "@/components/reschedule-appointment-modal";
import { CancelAppointmentModal } from "@/components/cancel-appointment-modal";

// Import the auth service functions for listener management
import {
  registerListener,
  unregisterListener,
  isLogoutInProgress,
  cleanupAllListeners,
} from "@/lib/auth-service";

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

interface Activity {
  id: string;
  action: string;
  details: string;
  time: string;
  user: string;
  type: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [selectedAppointmentForDetails, setSelectedAppointmentForDetails] =
    useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [filteredAppointments, setFilteredAppointments] = useState<
    Appointment[]
  >([]);

  const [dashboardStats, setDashboardStats] = useState([
    {
      title: "Upcoming Appointments",
      value: "0",
      change: "+0%",
      trend: "up",
      icon: Calendar,
      color: "text-gray-700 dark:text-gray-300",
      bgColor: "bg-gray-50 dark:bg-gray-800",
    },
    {
      title: "Total Clients",
      value: "0",
      change: "-0%",
      trend: "down",
      icon: Users,
      color: "text-gray-700 dark:text-gray-300",
      bgColor: "bg-gray-100 dark:bg-gray-800",
    },
    {
      title: "Active Services",
      value: "0",
      change: "+0%",
      trend: "up",
      icon: Briefcase,
      color: "text-gray-700 dark:text-gray-300",
      bgColor: "bg-gray-50 dark:bg-gray-700",
    },
    {
      title: "Pending Consultations",
      value: "0",
      change: "+0%",
      trend: "up",
      icon: AlertCircle,
      color: "text-gray-700 dark:text-gray-300",
      bgColor: "bg-gray-50 dark:bg-gray-700",
    },
  ]);

  useEffect(() => {
    console.log(
      "[Admin Dashboard] Setting up real-time appointment subscription..."
    );

    const loadAppointments = async () => {
      if (isLogoutInProgress()) {
        console.log(
          "[Admin Dashboard] Skipping appointments load - logout in progress"
        );
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const allAppointments = await AppointmentService.getAllAppointments();
        console.log(
          "[Admin Dashboard] Initial load:",
          allAppointments.length,
          "appointments"
        );
        setAppointments(allAppointments);
        updateDashboardStats(allAppointments, clients, cases);
        generateRecentActivities(allAppointments);
        setIsLoading(false);
      } catch (error) {
        if (!isLogoutInProgress()) {
          console.error("[Admin Dashboard] Error loading appointments:", error);
        }
        setIsLoading(false);
      }
    };

    loadAppointments();

    const unsubscribe = AppointmentService.subscribeToAppointments(
      (appointments) => {
        if (isLogoutInProgress()) {
          console.log(
            "[Admin Dashboard] Blocked real-time update - logout in progress"
          );
          return;
        }

        console.log(
          "[Admin Dashboard] Real-time update received:",
          appointments.length,
          "appointments"
        );
        setAppointments(appointments);
        updateDashboardStats(appointments, clients, cases);
        generateRecentActivities(appointments);
        setIsLoading(false);
      }
    );

    const listenerId = registerListener(
      unsubscribe,
      "admin-dashboard-appointments"
    );

    return () => {
      unsubscribe();
      if (listenerId) unregisterListener(listenerId);
    };
  }, []);

  useEffect(() => {
    const loadClientsAndCases = async () => {
      if (isLogoutInProgress()) {
        console.log(
          "[Admin Dashboard] Skipping clients/cases load - logout in progress"
        );
        return;
      }

      try {
        await Promise.all([loadClients(), loadCases()]);
      } catch (error) {
        if (!isLogoutInProgress()) {
          console.error("Error loading clients and cases:", error);
        }
      }
    };

    loadClientsAndCases();
  }, []);

  useEffect(() => {
    if (isLogoutInProgress()) {
      console.log(
        "[Admin Dashboard] Skipping stats update - logout in progress"
      );
      return;
    }

    updateDashboardStats(appointments, clients, cases);
  }, [appointments, clients, cases]);

  useEffect(() => {
    if (isLogoutInProgress()) {
      console.log(
        "[Admin Dashboard] Skipping appointment filtering - logout in progress"
      );
      setFilteredAppointments([]);
      return;
    }

    let filtered = appointments;

    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (appointment) => appointment.status === statusFilter
      );
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
          appointment.type?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    const today = new Date().toISOString().split("T")[0];
    filtered = filtered.filter((apt) => apt.date === today);

    setFilteredAppointments(filtered);
  }, [appointments, searchQuery, statusFilter]);

  // Add component cleanup effect
  useEffect(() => {
    return () => {
      console.log("[Admin Dashboard] Component unmounting");
    };
  }, []);

  const loadClients = async () => {
    if (isLogoutInProgress()) {
      console.log(
        "[Admin Dashboard] Skipping clients load - logout in progress"
      );
      setClients([]);
      return;
    }

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
      if (!isLogoutInProgress()) {
        console.error("Error loading clients:", error);
      }
    }
  };

  const loadCases = async () => {
    if (isLogoutInProgress()) {
      console.log("[Admin Dashboard] Skipping cases load - logout in progress");
      setCases([]);
      return;
    }

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
      if (!isLogoutInProgress()) {
        console.error("Error loading cases:", error);
      }
    }
  };

  const updateDashboardStats = (
    appointments: Appointment[],
    clients: Client[],
    cases: Case[]
  ) => {
    if (isLogoutInProgress()) {
      console.log(
        "[Admin Dashboard] Skipping stats calculation - logout in progress"
      );
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    const upcomingAppointmentsCount = appointments.filter(
      (apt) => apt.date >= today && apt.status !== "cancelled"
    ).length;

    const totalClientsCount = clients.filter(
      (client) => !client.archived
    ).length;

    const activeCasesCount = cases.filter(
      (caseItem) => caseItem.status === "active"
    ).length;

    const pendingAppointmentsCount = appointments.filter(
      (apt) => apt.status === "pending"
    ).length;

    setDashboardStats([
      {
        title: "Upcoming Appointments",
        value: upcomingAppointmentsCount.toString(),
        change: "+0%",
        trend: "up",
        icon: Calendar,
        color: "text-gray-700 dark:text-gray-300",
        bgColor: "bg-gray-50 dark:bg-gray-800",
      },
      {
        title: "Total Clients",
        value: totalClientsCount.toString(),
        change: "-0%",
        trend: "down",
        icon: Users,
        color: "text-gray-700 dark:text-gray-300",
        bgColor: "bg-gray-100 dark:bg-gray-800",
      },
      {
        title: "Active Services",
        value: activeCasesCount.toString(),
        change: "+0%",
        trend: "up",
        icon: Briefcase,
        color: "text-gray-700 dark:text-gray-300",
        bgColor: "bg-gray-50 dark:bg-gray-700",
      },
      {
        title: "Pending Consultations",
        value: pendingAppointmentsCount.toString(),
        change: "+0%",
        trend: "up",
        icon: AlertCircle,
        color: "text-gray-700 dark:text-gray-300",
        bgColor: "bg-gray-50 dark:bg-gray-700",
      },
    ]);
  };

  const generateRecentActivities = (appointments: Appointment[]) => {
    if (isLogoutInProgress()) {
      console.log(
        "[Admin Dashboard] Skipping activities generation - logout in progress"
      );
      return;
    }

    const activities: Activity[] = [];

    const recentAppointments = appointments
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 5);

    recentAppointments.forEach((apt, index) => {
      activities.push({
        id: `apt-${index}`,
        action: `Appointment ${apt.status}`,
        details: `${apt.client} - ${apt.type}`,
        time: `${apt.date} at ${apt.time}`,
        user: apt.client,
        type: "appointment",
      });
    });

    const recentCases = cases
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      )
      .slice(0, 3);

    recentCases.forEach((caseItem, index) => {
      activities.push({
        id: `case-${index}`,
        action: `Case ${caseItem.status}`,
        details: `${caseItem.title} - ${caseItem.caseType}`,
        time: caseItem.openedDate,
        user: caseItem.clientName,
        type: "case",
      });
    });

    setRecentActivities(activities);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
      case "active":
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

  const getStatusDisplay = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "case":
        return <Briefcase className="h-4 w-4" />;
      case "document":
        return <FileText className="h-4 w-4" />;
      case "appointment":
        return <Calendar className="h-4 w-4" />;
      case "payment":
        return <DollarSign className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const viewCaseProgress = (case_: any) => {
    if (isLogoutInProgress()) {
      console.log(
        "[Admin Dashboard] Blocked case progress view - logout in progress"
      );
      return;
    }

    setSelectedCase(case_);
  };

  const closeModal = () => {
    setSelectedCase(null);
  };

  const handleViewDetails = (appointment: Appointment) => {
    if (isLogoutInProgress()) {
      console.log(
        "[Admin Dashboard] Blocked view details - logout in progress"
      );
      return;
    }

    setSelectedAppointmentForDetails(appointment);
    setIsDetailsModalOpen(true);
  };

  const handleReschedule = (id: string) => {
    if (isLogoutInProgress()) {
      console.log("[Admin Dashboard] Blocked reschedule - logout in progress");
      return;
    }

    const appointment = appointments.find((apt) => apt.id === id);
    if (appointment) {
      setSelectedAppointment(appointment);
      setIsRescheduleModalOpen(true);
    }
  };

  const handleCancel = (id: string) => {
    if (isLogoutInProgress()) {
      console.log("[Admin Dashboard] Blocked cancel - logout in progress");
      return;
    }

    const appointment = appointments.find((apt) => apt.id === id);
    if (appointment) {
      setSelectedAppointment(appointment);
      setIsCancelModalOpen(true);
    }
  };

  const handleSelectDate = async (
    date: Date,
    time: string,
    consultationType: string
  ) => {
    if (isLogoutInProgress()) {
      console.log("[Admin Dashboard] Blocked schedule - logout in progress");
      toast({
        title: "Logout in Progress",
        description: "Cannot schedule appointment during logout",
        variant: "destructive",
      });
      return;
    }

    try {
      const availabilityCheck = await AppointmentService.isTimeSlotAvailable(
        date,
        time
      );
      if (!availabilityCheck.available) {
        toast({
          title: "Time Slot Unavailable",
          description:
            availabilityCheck.reason || "This time slot is not available",
          variant: "destructive",
        });
        return;
      }

      const dateStr = date.toISOString().split("T")[0];
      const newAppointment = await AppointmentService.addAppointment({
        title: `${
          consultationType === "online" ? "Online" : "In-Person"
        } Consultation`,
        type:
          consultationType === "online"
            ? "Online Consultation"
            : "In-Person Consultation",
        date: dateStr,
        time: time,
        client: "Client Name",
        clientId: "admin-created",
        clientEmail: "",
        clientPhone: "",
        attorney: "Atty. Alia Jan Delgado",
        attorneyId: "atty_alia_jan_delgado",
        attorneyName: "Atty. Alia Jan Delgado",
        status: "pending",
        location:
          consultationType === "online"
            ? "Virtual Consultation"
            : "Office Visit",
        description: `${
          consultationType === "online" ? "Video" : "In-person"
        } consultation scheduled`,
        consultationType: consultationType as "online" | "in-person",
      });

      if (newAppointment) {
        toast({
          title: "Success",
          description: "Appointment scheduled successfully!",
        });
      }
    } catch (error: any) {
      if (!isLogoutInProgress()) {
        console.error("Error scheduling appointment:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to schedule appointment",
          variant: "destructive",
        });
      }
    }
  };

  const handleOpenScheduleModal = () => {
    if (isLogoutInProgress()) {
      console.log(
        "[Admin Dashboard] Blocked schedule modal - logout in progress"
      );
      return;
    }

    setIsScheduleModalOpen(true);
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

  const getCasesForClient = (clientId: string) => {
    if (isLogoutInProgress()) return [];

    let clientCases = cases.filter((c) => c.clientId === clientId);
    if (clientCases.length === 0) {
      const client = clients.find((c) => c.id === clientId);
      if (client) {
        clientCases = cases.filter((c) => c.clientName === client.name);
      }
    }
    return clientCases;
  };

  const getUpcomingAppointments = () => {
    if (isLogoutInProgress()) return [];

    const now = new Date();
    const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const parseDateTime = (apt: Appointment) => {
      try {
        return new Date(`${apt.date} ${apt.time}`);
      } catch {
        return new Date(0);
      }
    };

    return appointments
      .map((apt) => ({ ...apt, __date: parseDateTime(apt) }))
      .filter((apt) => {
        const d = apt.__date as Date;
        return (
          d instanceof Date &&
          !isNaN(d.getTime()) &&
          d >= now &&
          d <= weekAhead &&
          apt.status !== "cancelled"
        );
      })
      .sort((a, b) => (a.__date as Date).getTime() - (b.__date as Date).getTime());
  };

  const getRecentCases = () => {
    if (isLogoutInProgress()) return [];

    return cases
      .filter((caseItem) => caseItem.status === "active")
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      )
      .slice(0, 5);
  };

  // Stub functions for missing handlers
  const handleRescheduleSubmit = async (
    id: string,
    newDate: Date,
    newTime: string,
    reason?: string
  ) => {
    if (isLogoutInProgress()) {
      console.log(
        "[Admin Dashboard] Blocked reschedule submit - logout in progress"
      );
      return;
    }

    console.log("Rescheduling appointment", id, newDate, newTime, reason);
    // Implement reschedule logic here
  };

  const handleCancelSubmit = async (id: string, reason?: string) => {
    if (isLogoutInProgress()) {
      console.log(
        "[Admin Dashboard] Blocked cancel submit - logout in progress"
      );
      return;
    }

    console.log("Cancelling appointment", id, reason);
    // Implement cancel logic here
  };

  if (isLoading) {
    return (
      <AdminDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-navy-700 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard data...</p>
          </div>
        </div>
      </AdminDashboardLayout>
    );
  }

  return (
    <AdminDashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold font-serif bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg mt-2">
                Welcome back, Atty. Delgado. Here's your law office overview.
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Appointments: {appointments.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Clients: {clients.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              <span>
                Active Cases:{" "}
                {cases.filter((c) => c.status === "active").length}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dashboardStats.map((stat, index) => (
            <Card
              key={index}
              className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-shadow duration-300"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {stat.title}
                </CardTitle>
                <div className="p-3 bg-navy-700 dark:bg-navy-600 rounded-xl shadow-sm">
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {stat.value}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp
                    className={`h-3 w-3 ${
                      stat.trend === "up" ? "text-green-500" : "text-red-500"
                    }`}
                  />
                  <span
                    className={
                      stat.trend === "up" ? "text-green-500" : "text-red-500"
                    }
                  >
                    {stat.change}
                  </span>
                  <span>from last week</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Upcoming Appointments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-navy-700 dark:bg-navy-600 rounded-lg shadow-sm">
                      <Calendar className="h-5 w-5 text-white" />
                    </div>
                    Upcoming Appointments
                  </CardTitle>
                  <CardDescription className="text-base">
                    Recent upcoming appointments (next 7 days)
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-navy-700 border-navy-200"
                  >
                    {getUpcomingAppointments().length} appointments
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/admin/appointments')}>
                    View All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {getUpcomingAppointments().length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No upcoming appointments
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Schedule appointments to see them here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {getUpcomingAppointments().map((appointment) => {
                    const client = getClientForAppointment(appointment);
                    const clientCases = client
                      ? getCasesForClient(client.id)
                      : [];

                    return (
                      <div
                        key={appointment.id}
                        className="flex items-center justify-between p-4 border border-gray-200/50 dark:border-gray-700/50 rounded-xl bg-gradient-to-r from-gray-50/50 to-white/50 dark:from-gray-800/50 dark:to-gray-700/50 hover:shadow-lg transition-all duration-300"
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={`p-3 rounded-xl ${
                              isVirtualAppointment(appointment)
                                ? "bg-blue-100 dark:bg-blue-900/50"
                                : "bg-green-100 dark:bg-green-900/50"
                            }`}
                          >
                            {isVirtualAppointment(appointment) ? (
                              <Video className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold text-lg">
                              {appointment.client}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {appointment.type}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-gray-500 dark:text-gray-500">
                                {appointment.time} • {appointment.location}
                              </p>
                              {clientCases.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  <Briefcase className="h-3 w-3 mr-1" />
                                  {clientCases.length} cases
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge className={getStatusColor(appointment.status)}>
                            {getStatusDisplay(appointment.status)}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewDetails(appointment)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Services */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-navy-700 dark:bg-navy-600 rounded-lg shadow-sm">
                      <Briefcase className="h-5 w-5 text-white" />
                    </div>
                    Active Services
                  </CardTitle>
                  <CardDescription className="text-base">
                    Recent active services requiring attention
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="text-navy-700 border-navy-200"
                >
                  {getRecentCases().length} active
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {getRecentCases().length === 0 ? (
                <div className="text-center py-12">
                  <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No active services
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    All services are currently closed or on hold
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {getRecentCases().map((caseItem) => (
                    <div
                      key={caseItem.id}
                      className="flex items-center justify-between p-4 border border-gray-200/50 dark:border-gray-700/50 rounded-xl bg-gradient-to-r from-gray-50/50 to-white/50 dark:from-gray-800/50 dark:to-gray-700/50 hover:shadow-lg transition-all duration-300"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-navy-100 dark:bg-navy-900/50 rounded-xl">
                          <FileText className="h-5 w-5 text-navy-600 dark:text-navy-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">
                            {caseItem.title}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {caseItem.clientName}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={getStatusColor(caseItem.status)}>
                              {caseItem.status}
                            </Badge>
                            <Badge
                              className={getPriorityColor(caseItem.priority)}
                            >
                              {caseItem.priority}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {caseItem.caseType}
                            </span>
                          </div>
                          <div className="mt-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-600 dark:text-gray-400">
                                Progress: {caseItem.progressPercentage || 0}%
                              </span>
                            </div>
                            <Progress
                              value={caseItem.progressPercentage || 0}
                              className="h-2"
                            />
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => viewCaseProgress(caseItem)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Case Progress Modal */}
        {selectedCase && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-in fade-in-0 duration-300"
            onClick={closeModal}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold font-serif text-gray-900 dark:text-white">
                      Track Case Progress
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Track the status of your legal matter
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closeModal}
                    className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="space-y-6">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg">
                        Case Reference Number
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs bg-transparent"
                      >
                        Print
                      </Button>
                    </div>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {selectedCase.id}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      This case reference number was submitted by our office.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-6">Case Status</h3>
                    <div className="flex items-center justify-between relative">
                      {selectedCase.processSteps?.map(
                        (step: CaseProcessStep, index: number) => (
                          <div
                            key={index}
                            className="flex flex-col items-center relative z-10"
                          >
                            <div
                              className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
                                step.status === "completed"
                                  ? "bg-green-500 text-white"
                                  : step.status === "in_progress"
                                  ? "bg-yellow-500 text-white"
                                  : "bg-gray-300 text-gray-500"
                              }`}
                            >
                              {step.status === "completed" ? (
                                <CheckCircle className="h-8 w-8" />
                              ) : step.status === "in_progress" ? (
                                <Clock className="h-8 w-8" />
                              ) : (
                                <FileText className="h-8 w-8" />
                              )}
                            </div>
                            <div className="text-center">
                              <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                                {step.name}
                              </h4>
                              {step.completedDate && (
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  Completed: {step.completedDate}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      )}
                      <div className="absolute top-8 left-8 right-8 h-1 bg-gray-300 dark:bg-gray-600 -z-0">
                        <div
                          className="h-full bg-green-500 transition-all duration-500"
                          style={{
                            width: `${
                              (selectedCase.progressPercentage || 0) > 100
                                ? 100
                                : selectedCase.progressPercentage || 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">
                      Current Status: {selectedCase.status}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Progress: {selectedCase.progressPercentage || 0}%
                    </p>
                    <p className="text-sm">{selectedCase.description}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Appointment Modals */}
        <ScheduleAppointmentModal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          onSelectDate={handleSelectDate}
          appointmentService={AppointmentService}
        />

        {selectedAppointmentForDetails && (
          <AppointmentDetailsModal
            isOpen={isDetailsModalOpen}
            onClose={() => {
              setIsDetailsModalOpen(false);
              setSelectedAppointmentForDetails(null);
            }}
            appointmentId={selectedAppointmentForDetails.id}
            isAdmin={true}
            onStatusChange={() => {}}
            onCancel={handleCancel}
            onReschedule={handleReschedule}
            onRefresh={() => {}}
          />
        )}

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
      </div>
    </AdminDashboardLayout>
  );
}
