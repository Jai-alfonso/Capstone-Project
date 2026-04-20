"use client";

import {useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AdminDashboardLayout } from "@/components/admin-dashboard-layout";
import {
  Calendar,
  Users,
  Search,
  Filter,
  Eye,
  Trash2,
  Plus,
  MoreHorizontal,
  Mail,
  Phone,
  Briefcase,
  FileText,
  Save,
  X,
  User,
  Printer,
  MapPin,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { db } from "@/firebase/config";
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  arrayRemove,
} from "firebase/firestore";
import { toast } from "sonner";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { PDFGenerator } from "@/lib/pdf-generator";
import UserService from "@/lib/user-service";

interface UserData {
  id: string;
  uid: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  createdAt?: any;
  updatedAt?: any;
}

interface Client {
  id: string;
  uid: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  priority: string;
  joinDate: string;
  totalCases: number;
  activeCases: number;
  lastContact: string;
  notes?: ClientNote[];
  createdAt?: any;
  updatedAt?: any;
  userData?: UserData;
}

interface ClientNote {
  id: string;
  content: string;
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
}

interface Appointment {
  id: string;
  clientId: string;
  uid: string;
  clientName: string;
  date: string;
  time: string;
  type: string;
  status: string;
  description: string;
  location: string;
  consultationType: string;
  createdAt: any;
  updatedAt: any;
}

interface Case {
  id: string;
  clientId: string;
  uid: string;
  clientName: string;
  title: string;
  description: string;
  caseType: string;
  serviceType: string;
  status: "active" | "closed" | "pending" | "on_hold";
  priority: "low" | "medium" | "high";
  openedDate: string;
  closedDate?: string;
  notes?: string;
  processSteps?: any[];
  processType?: string;
  progressPercentage?: number;
  createdAt?: any;
  updatedAt?: any;
}

export default function AdminReportsPage() {
  const [dateRange, setDateRange] = useState("this-month");
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientDetailsModalOpen, setClientDetailsModalOpen] = useState(false);
  const [addNoteModalOpen, setAddNoteModalOpen] = useState(false);
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [deleteNoteConfirmModalOpen, setDeleteNoteConfirmModalOpen] =
    useState(false);
  const [noteToDelete, setNoteToDelete] = useState<{
    clientId: string;
    noteId: string;
    noteContent: string;
  } | null>(null);
  const [newNote, setNewNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [adminUserData, setAdminUserData] = useState<any>(null);
  const { logAction } = useAuditLogger();

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
    loadAllData();
  }, [dateRange]);

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

  const loadAllData = async () => {
    try {
      setIsLoading(true);
      await loadUsers();
      await loadFirebaseClients();
      await Promise.all([loadAppointments(), loadCases()]);

      await logAction(
        "Data Load",
        "Reports Dashboard",
        "Loaded all reports, clients, appointments, and cases data",
        "Info"
      );
    } catch (error: any) {
      console.error("Error loading data:", error);
      await logAction(
        "Data Load Error",
        "Reports Dashboard",
        `Failed to load data: ${error.message}`,
        "Critical"
      );
      toast.error("Failed to load data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      if (!db) {
        console.error("Firebase database not initialized");
        return;
      }

      const usersRef = collection(db, "users");
      const querySnapshot = await getDocs(usersRef);
      const usersData: UserData[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        usersData.push({
          id: doc.id,
          uid: data.uid || doc.id,
          name:
            data.name ||
            data.displayName ||
            `${data.firstName || ""} ${data.lastName || ""}`.trim() ||
            "Unknown User",
          firstName: data.firstName,
          lastName: data.lastName,
          fullName: data.fullName || data.name,
          email: data.email || "No email",
          phone: data.phone || data.phoneNumber || "No phone",
          role: data.role || "client",
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });

      console.log(`Loaded ${usersData.length} users from database`);
      setAllUsers(usersData);
    } catch (error: any) {
      console.error("Error loading users:", error);
      setAllUsers([]);
    }
  };

  const loadFirebaseClients = async () => {
    try {
      if (!db) {
        console.error("Firebase database not initialized");
        toast.error("Database connection error");
        return;
      }

      const clientsRef = collection(db, "clients");
      const querySnapshot = await getDocs(clientsRef);
      const clientsData: Client[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const notesWithDates =
          data.notes?.map((note: any) => ({
            ...note,
            createdAt: note.createdAt?.toDate?.() || new Date(note.createdAt),
            updatedAt: note.updatedAt?.toDate?.() || new Date(note.updatedAt),
          })) || [];

        const currentDate = new Date().toLocaleDateString();

        const clientUid = data.uid || data.clientId || "";
        const userData = allUsers.find(
          (user) =>
            user.uid === clientUid ||
            user.email === data.email ||
            user.id === clientUid
        );

        clientsData.push({
          id: doc.id,
          uid: clientUid,
          name: data.name || userData?.fullName || userData?.name || "Unknown Client",
          email: data.email || userData?.email || "No email",
          phone: data.phone || userData?.phone || "No phone",
          address: data.address || data.street || "",
          city: data.city || "",
          state: data.state || data.province || "",
          zipCode: data.zipCode || data.postalCode || "",
          country: data.country || "",
          priority: data.priority || "Medium",
          joinDate:
            data.joinDate ||
            data.createdAt?.toDate?.()?.toLocaleDateString() ||
            currentDate,
          totalCases: data.totalCases || 0,
          activeCases: data.activeCases || 0,
          lastContact:
            data.lastContact ||
            data.updatedAt?.toDate?.()?.toLocaleDateString() ||
            currentDate,
          notes: notesWithDates,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          userData: userData,
        });
      });

      console.log(`Loaded ${clientsData.length} clients from database`);
      setClients(clientsData);

      if (clientsData.length === 0) {
        toast.info("No clients found in database");
      }
    } catch (error: any) {
      console.error("Error loading clients:", error);
      toast.error("Failed to load clients");
      setClients([]);
    }
  };

  const loadAppointments = async () => {
    try {
      if (!db) {
        console.error("Firebase database not initialized");
        return;
      }

      const appointmentsRef = collection(db, "appointments");
      const querySnapshot = await getDocs(appointmentsRef);
      const appointmentsData: Appointment[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const clientUid = data.clientId || data.uid || "";
        const clientEmail = data.clientEmail || data.email || "";

        const client = clients.find(
          (c) =>
            c.uid === clientUid ||
            c.id === clientUid ||
            (clientEmail && c.email === clientEmail)
        );

        const user = allUsers.find(
          (u) =>
            u.uid === clientUid ||
            u.id === clientUid ||
            (clientEmail && u.email === clientEmail)
        );

        const clientName =
          data.clientName ||
          data.client ||
          client?.name ||
          user?.name ||
          user?.fullName ||
          `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
          "Unknown Client";

        appointmentsData.push({
          id: doc.id,
          clientId: clientUid,
          uid: clientUid,
          clientName: clientName,
          date: data.date || new Date().toISOString().split("T")[0],
          time: data.time || "00:00",
          type: data.type || "Consultation",
          status: data.status || "pending",
          description: data.description || "No description",
          location: data.location || "Office",
          consultationType: data.consultationType || "in-person",
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });

      console.log(
        `Loaded ${appointmentsData.length} appointments from database`
      );
      setAppointments(appointmentsData);
    } catch (error: any) {
      console.error("Error loading appointments:", error);
      setAppointments([]);
    }
  };

  const loadCases = async () => {
    try {
      if (!db) {
        console.error("Firebase database not initialized");
        return;
      }

      const casesRef = collection(db, "cases");
      const querySnapshot = await getDocs(casesRef);
      const casesData: Case[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const clientUid = data.clientId || data.uid || "";
        const clientEmail = data.clientEmail || data.email || "";

        const client = clients.find(
          (c) =>
            c.uid === clientUid ||
            c.id === clientUid ||
            (clientEmail && c.email === clientEmail)
        );

        const user = allUsers.find(
          (u) =>
            u.uid === clientUid ||
            u.id === clientUid ||
            (clientEmail && u.email === clientEmail)
        );

        const clientName =
          data.clientName ||
          client?.name ||
          user?.name ||
          user?.fullName ||
          `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
          "Unknown Client";

        casesData.push({
          id: doc.id,
          clientId: data.clientId || clientUid || "",
          uid: clientUid,
          clientName: clientName,
          title: data.title || "Untitled Case",
          description: data.description || "No description",
          caseType: data.caseType || "Other",
          serviceType: data.serviceType || "Consultation",
          status: data.status || "pending",
          priority: data.priority || "medium",
          openedDate: data.openedDate || new Date().toISOString().split("T")[0],
          closedDate: data.closedDate,
          notes: data.notes || "",
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });

      console.log(`Loaded ${casesData.length} cases from database`);
      setCases(casesData);
    } catch (error: any) {
      console.error("Error loading cases:", error);
      setCases([]);
    }
  };

  const handleViewClientDetails = (client: Client) => {
    setSelectedClient(client);
    setClientDetailsModalOpen(true);

    logAction(
      "View Client Details",
      `Client: ${client.id}`,
      `Viewed detailed information for client ${client.name}`,
      "Info"
    );
  };

  const handleAddNote = async () => {
    if (!selectedClient || !newNote.trim()) {
      toast.error("Please enter a note");
      return;
    }

    try {
      if (!db) {
        toast.error("Database connection error");
        return;
      }

      const note: ClientNote = {
        id: Date.now().toString(),
        content: newNote.trim(),
        createdBy: adminUserData?.fullName || adminUserData?.name || "Admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedNotes = [...(selectedClient.notes || []), note];

      const clientRef = doc(db, "clients", selectedClient.id);
      await updateDoc(clientRef, {
        notes: updatedNotes,
        updatedAt: Timestamp.now(),
      });

      setClients((prev) =>
        prev.map((client) =>
          client.id === selectedClient.id
            ? { ...client, notes: updatedNotes }
            : client
        )
      );

      setSelectedClient((prev) =>
        prev ? { ...prev, notes: updatedNotes } : null
      );

      setNewNote("");
      setAddNoteModalOpen(false);

      toast.success("Note added successfully");

      await logAction(
        "Add Client Note",
        `Client: ${selectedClient.id}`,
        `Added note to client ${selectedClient.name}: "${newNote.substring(
          0,
          50
        )}${newNote.length > 50 ? "..." : ""}"`,
        "Info"
      );
    } catch (error: any) {
      console.error("Error adding note:", error);
      toast.error("Failed to add note");
      await logAction(
        "Add Client Note Error",
        `Client: ${selectedClient?.id}`,
        `Failed to add note: ${error.message}`,
        "Critical"
      );
    }
  };

  const handleDeleteNote = (
    clientId: string,
    noteId: string,
    noteContent: string
  ) => {
    setNoteToDelete({ clientId, noteId, noteContent });
    setDeleteNoteConfirmModalOpen(true);
  };

  const confirmDeleteNote = async () => {
    if (!noteToDelete) return;

    try {
      const { clientId, noteId } = noteToDelete;

      if (!db) {
        toast.error("Database connection error");
        return;
      }

      const client = clients.find((c) => c.id === clientId);
      if (!client) {
        toast.error("Client not found");
        return;
      }

      const noteToRemove = client.notes?.find((note) => note.id === noteId);
      if (!noteToRemove) {
        toast.error("Note not found");
        return;
      }

      const clientRef = doc(db, "clients", clientId);
      await updateDoc(clientRef, {
        notes: arrayRemove(noteToRemove),
        updatedAt: Timestamp.now(),
      });

      const updatedNotes =
        client.notes?.filter((note) => note.id !== noteId) || [];

      setClients((prev) =>
        prev.map((client) =>
          client.id === clientId ? { ...client, notes: updatedNotes } : client
        )
      );

      if (selectedClient?.id === clientId) {
        setSelectedClient((prev) =>
          prev ? { ...prev, notes: updatedNotes } : null
        );
      }

      setDeleteNoteConfirmModalOpen(false);
      setNoteToDelete(null);

      toast.success("Note deleted successfully");

      await logAction(
        "Delete Client Note",
        `Client: ${clientId}`,
        `Deleted note from client ${client.name}`,
        "Warning"
      );
    } catch (error: any) {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note");
      await logAction(
        "Delete Client Note Error",
        `Client: ${noteToDelete?.clientId}`,
        `Failed to delete note: ${error.message}`,
        "Critical"
      );
    }
  };

  const handleDeleteClient = (client: Client) => {
    setClientToDelete(client);
    setDeleteConfirmModalOpen(true);
  };

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;

    try {
      if (!db) {
        toast.error("Database connection error");
        return;
      }

      const clientRef = doc(db, "clients", clientToDelete.id);
      await deleteDoc(clientRef);

      setClients((prev) =>
        prev.filter((client) => client.id !== clientToDelete.id)
      );

      if (selectedClient?.id === clientToDelete.id) {
        setSelectedClient(null);
        setClientDetailsModalOpen(false);
      }

      setDeleteConfirmModalOpen(false);
      setClientToDelete(null);

      toast.success("Client deleted successfully");

      await logAction(
        "Delete Client",
        `Client: ${clientToDelete.id}`,
        `Deleted client ${clientToDelete.name}`,
        "Warning"
      );
    } catch (error: any) {
      console.error("Error deleting client:", error);
      toast.error("Failed to delete client");
      await logAction(
        "Delete Client Error",
        `Client: ${clientToDelete.id}`,
        `Failed to delete client: ${error.message}`,
        "Critical"
      );
    }
  };

  const downloadClientReport = async (client: Client) => {
    try {
      const pdfGen = new PDFGenerator();

      // Get client's appointments and cases
      const clientAppointments = getClientAppointments(client.id);
      const clientCases = getClientCases(client.id);

      // Format appointments data for PDF
      const appointmentsData = clientAppointments.map(apt => ({
        date: apt.date || '',
        time: apt.time || '',
        type: apt.type || '',
        location: apt.location || '',
        status: apt.status || '',
        client: client.name || 'Unknown',
      }));

      // Format cases data for PDF
      const casesData = clientCases.map(caseItem => ({
        title: caseItem.title || '',
        serviceType: caseItem.serviceType || '',
        status: caseItem.status || '',
        openedDate: caseItem.openedDate || '',
        description: caseItem.description || '',
        clientName: client.name || 'Unknown',
        caseType: caseItem.caseType || '',
        processSteps: caseItem.processSteps && Array.isArray(caseItem.processSteps) ? caseItem.processSteps : [],
        processType: caseItem.processType || 'simple',
        progressPercentage: caseItem.progressPercentage || 0,
      }));

      // Generate the Client Information Report
      pdfGen.generateClientInformationReport(
        {
          name: client.name || 'Unknown Client',
          email: client.email || 'No email',
          phone: client.phone || 'No phone',
          address: client.address,
          activeCases: client.activeCases || 0,
          notes: client.notes || [],
        },
        appointmentsData,
        casesData,
        adminUserData?.fullName || 'Administrator',
        adminUserData?.email || 'N/A'
      );

      const filename = `Client_Information_Report_${client.name?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdfGen.download(filename);

      toast.success(`Client Information Report for ${client.name} downloaded successfully`);

      await logAction(
        "Download Client Report",
        `Client: ${client.id}`,
        `Downloaded Client Information Report for ${client.name}`,
        "Info"
      );
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate report");
    }
  };

  const getClientAppointments = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return [];

    return appointments.filter((appointment) =>
      appointment.clientId === clientId ||
      appointment.uid === clientId ||
      appointment.clientId === client.uid ||
      appointment.uid === client.uid ||
      (client.email &&
        appointment.clientName &&
        clients.find(
          (c) =>
            c.email === client.email &&
            (c.id === appointment.clientId || c.uid === appointment.uid)
        ))
    );
  };

  const getClientCases = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return [];

    return cases.filter((caseItem) =>
      caseItem.clientId === clientId ||
      caseItem.uid === clientId ||
      caseItem.clientId === client.uid ||
      caseItem.uid === client.uid ||
      (client.email &&
        caseItem.clientName &&
        clients.find(
          (c) =>
            c.email === client.email &&
            (c.id === caseItem.clientId || c.uid === caseItem.uid)
        ))
    );
  };

  const getPriorityColor = (priority: string) => {
    if (!priority)
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";

    switch (priority.toLowerCase()) {
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

  const filteredClients = clients.filter((client) => {
    const name = client?.name || "";
    const email = client?.email || "";
    const phone = client?.phone || "";
    const address = client?.address || "";
    const city = client?.city || "";

    const searchLower = searchQuery.toLowerCase();

    return (
      name.toLowerCase().includes(searchLower) ||
      email.toLowerCase().includes(searchLower) ||
      phone.includes(searchQuery) ||
      address.toLowerCase().includes(searchLower) ||
      city.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "Unknown";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const CustomDropdownMenu = ({
    children,
    trigger,
  }: {
    children: React.ReactNode;
    trigger: React.ReactNode;
  }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div className="relative">
        <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
            <div className="py-1">{children}</div>
          </div>
        )}
      </div>
    );
  };

  const CustomDropdownMenuItem = ({
    children,
    onClick,
    icon: Icon,
    destructive = false,
  }: {
    children: React.ReactNode;
    onClick: () => void;
    icon?: any;
    destructive?: boolean;
  }) => (
    <button
      className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
        destructive
          ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
      }`}
      onClick={onClick}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-playfair text-navy-900 dark:text-white">
              Client Reports & Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Comprehensive client insights, appointments, cases, and notes
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search clients by name, email, phone, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
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
            <Button variant="outline" onClick={() => setSearchQuery("")}>
              <Filter className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>

        <Tabs defaultValue="clients" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="clients">
              Clients ({clients.length})
            </TabsTrigger>
            <TabsTrigger value="appointments">
              Appointments ({appointments.length})
            </TabsTrigger>
            <TabsTrigger value="cases">Cases ({cases.length})</TabsTrigger>
            <TabsTrigger value="reports">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin h-8 w-8 border-2 border-navy-700 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Loading clients...</p>
              </div>
            ) : filteredClients.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    {searchQuery
                      ? "No matching clients found"
                      : "No clients in database"}
                  </h3>
                  <p className="text-gray-500">
                    {searchQuery
                      ? "Try a different search term"
                      : "Add clients to get started"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClients.map((client) => {
                  const clientAppointments = getClientAppointments(
                    client.id
                  );
                  const clientCases = getClientCases(client.id);

                  return (
                    <Card
                      key={client.id}
                      className="hover:shadow-lg transition-shadow"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="space-y-2">
                            <h3 className="text-lg font-bold text-navy-900 dark:text-white">
                              {client.name || "Unknown Client"}
                            </h3>
                            <div className="flex items-center gap-2">
                              <Badge
                                className={getPriorityColor(
                                  client.priority
                                )}
                              >
                                {client.priority || "Medium"}
                              </Badge>
                              {client.userData && (
                                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                  <User className="h-3 w-3 mr-1" />
                                  User Account
                                </Badge>
                              )}
                            </div>
                          </div>
                          <CustomDropdownMenu
                            trigger={
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            }
                          >
                            <CustomDropdownMenuItem
                              onClick={() =>
                                handleViewClientDetails(client)
                              }
                              icon={Eye}
                            >
                              View Details
                            </CustomDropdownMenuItem>
                            <CustomDropdownMenuItem
                              onClick={() => downloadClientReport(client)}
                              icon={Printer}
                            >
                              Download Report
                            </CustomDropdownMenuItem>
                            <CustomDropdownMenuItem
                              onClick={() => {
                                setSelectedClient(client);
                                setAddNoteModalOpen(true);
                              }}
                              icon={FileText}
                            >
                              Add Note
                            </CustomDropdownMenuItem>
                            <Separator className="my-1" />
                            <CustomDropdownMenuItem
                              onClick={() => handleDeleteClient(client)}
                              icon={Trash2}
                              destructive
                            >
                              Delete Client
                            </CustomDropdownMenuItem>
                          </CustomDropdownMenu>
                        </div>

                        <div className="space-y-3 mb-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="h-4 w-4" />
                            <span className="truncate">
                              {client.email || "No email"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="h-4 w-4" />
                            <span>{client.phone || "No phone"}</span>
                          </div>
                          {client.address && (
                            <div className="flex items-start gap-2 text-sm text-gray-600">
                              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span className="truncate">
                                {client.address}
                                {client.city && `, ${client.city}`}
                              </span>
                            </div>
                          )}
                          {client.uid && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <User className="h-4 w-4" />
                              <span className="truncate text-xs">
                                UID: {client.uid.substring(0, 8)}...
                              </span>
                            </div>
                          )}
                          <div className="text-sm text-gray-500">
                            Joined: {formatDate(client.joinDate)}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                          <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
                            <div className="font-semibold text-gray-700 dark:text-gray-300">
                              Appointments
                            </div>
                            <div className="text-lg font-bold">
                              {clientAppointments.length}
                            </div>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
                            <div className="font-semibold text-gray-700 dark:text-gray-300">
                              Cases
                            </div>
                            <div className="text-lg font-bold">
                              {clientCases.length}
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => handleViewClientDetails(client)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Full Details
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="appointments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Appointments</CardTitle>
                <CardDescription>
                  View and manage client appointments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {appointments.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      No appointments in database
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {appointments.map((appointment) => {
                      const client = clients.find(
                        (c) =>
                          c.id === appointment.clientId ||
                          c.uid === appointment.uid
                      );
                      const user = allUsers.find(
                        (u) =>
                          u.uid === appointment.uid ||
                          u.id === appointment.clientId
                      );

                      const displayName =
                        client?.name ||
                        user?.fullName ||
                        user?.name ||
                        appointment.clientName ||
                        "Unknown Client";

                      return (
                        <div
                          key={appointment.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <div className="font-medium">
                              {appointment.type || "Consultation"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {displayName} • {formatDate(appointment.date)}{" "}
                              at {appointment.time}
                            </div>
                            {appointment.uid && (
                              <div className="text-xs text-gray-400 mt-1">
                                UID: {appointment.uid.substring(0, 8)}...
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const foundClient = clients.find(
                                (c) =>
                                  c.uid === appointment.uid ||
                                  c.id === appointment.clientId
                              );
                              if (foundClient)
                                handleViewClientDetails(foundClient);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cases" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Cases</CardTitle>
                <CardDescription>
                  View and manage client cases
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cases.length === 0 ? (
                  <div className="text-center py-8">
                    <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No cases in database</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cases.map((caseItem) => {
                      const client = clients.find(
                        (c) =>
                          c.id === caseItem.clientId ||
                          c.uid === caseItem.uid
                      );
                      const user = allUsers.find(
                        (u) =>
                          u.uid === caseItem.uid ||
                          u.id === caseItem.clientId
                      );

                      const displayName =
                        client?.name ||
                        user?.fullName ||
                        user?.name ||
                        caseItem.clientName ||
                        "Unknown Client";

                      return (
                        <div
                          key={caseItem.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <div className="font-medium">
                              {caseItem.title || "Untitled Case"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {displayName} •{" "}
                              {caseItem.serviceType || "Consultation"}
                            </div>
                            {caseItem.uid && (
                              <div className="text-xs text-gray-400 mt-1">
                                UID: {caseItem.uid.substring(0, 8)}...
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const foundClient = clients.find(
                                (c) =>
                                  c.uid === caseItem.uid ||
                                  c.id === caseItem.clientId
                              );
                              if (foundClient)
                                handleViewClientDetails(foundClient);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Clients
                  </CardTitle>
                  <Users className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {clients.length}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    All registered clients
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Users
                  </CardTitle>
                  <User className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {allUsers.length}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    All system users
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Appointments
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {appointments.length}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    All appointments
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Cases
                  </CardTitle>
                  <Briefcase className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {cases.length}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    All client cases
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Client Details Modal */}
      <Dialog
        open={clientDetailsModalOpen}
        onOpenChange={setClientDetailsModalOpen}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-2xl font-serif text-navy-900 dark:text-white">
                  {selectedClient?.name || "Client"}'s Details
                </DialogTitle>
                <DialogDescription>
                  Complete client information, appointments, cases, and
                  notes
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedClient && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Client Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">
                        Full Name
                      </Label>
                      <p className="font-medium">
                        {selectedClient.name || "Unknown Client"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Email</Label>
                      <p className="font-medium">
                        {selectedClient.email || "No email"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Phone</Label>
                      <p className="font-medium">
                        {selectedClient.phone || "No phone"}
                      </p>
                    </div>
                    {selectedClient.address && (
                      <div>
                        <Label className="text-sm font-medium">
                          Address
                        </Label>
                        <p className="font-medium">
                          {selectedClient.address}
                          {selectedClient.city && (
                            <>, {selectedClient.city}</>
                          )}
                          {selectedClient.state && (
                            <>, {selectedClient.state}</>
                          )}
                          {selectedClient.zipCode && (
                            <> {selectedClient.zipCode}</>
                          )}
                          {selectedClient.country && (
                            <>, {selectedClient.country}</>
                          )}
                        </p>
                      </div>
                    )}
                    <div>
                      <Label className="text-sm font-medium">User ID</Label>
                      <p className="font-medium text-sm font-mono">
                        {selectedClient.uid || "No UID"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">
                        Priority
                      </Label>
                      <Badge
                        className={getPriorityColor(
                          selectedClient.priority
                        )}
                      >
                        {selectedClient.priority || "Medium"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {selectedClient.userData && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-5 w-5" />
                        User Account Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">
                          User Name
                        </Label>
                        <p className="font-medium">
                          {selectedClient.userData.name}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">
                          User Email
                        </Label>
                        <p className="font-medium">
                          {selectedClient.userData.email}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">
                          User Phone
                        </Label>
                        <p className="font-medium">
                          {selectedClient.userData.phone}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">
                          {getClientAppointments(selectedClient.id).length}
                        </div>
                        <p className="text-sm text-gray-500">
                          Appointments
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">
                          {getClientCases(selectedClient.id).length}
                        </div>
                        <p className="text-sm text-gray-500">Cases</p>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600">
                          {selectedClient.activeCases || 0}
                        </div>
                        <p className="text-sm text-gray-500">
                          Active Cases
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-orange-600">
                          {selectedClient.notes?.length || 0}
                        </div>
                        <p className="text-sm text-gray-500">Notes</p>
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-gray-500">
                      <p>Joined: {formatDate(selectedClient.joinDate)}</p>
                      <p>
                        Last Contact:{" "}
                        {formatDate(selectedClient.lastContact)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Appointments</CardTitle>
                  <CardDescription>
                    Client's appointment history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {getClientAppointments(selectedClient.id).length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      No appointments scheduled
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {getClientAppointments(selectedClient.id).map(
                        (appointment) => (
                          <div
                            key={appointment.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div>
                              <div className="font-medium">
                                {appointment.type || "Consultation"}
                              </div>
                              <div className="text-sm text-gray-500">
                                {formatDate(appointment.date)} at{" "}
                                {appointment.time || "00:00"} •{" "}
                                {appointment.location || "Office"}
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Cases</CardTitle>
                  <CardDescription>Client's legal cases</CardDescription>
                </CardHeader>
                <CardContent>
                  {getClientCases(selectedClient.id).length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      No cases created
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {getClientCases(selectedClient.id).map((caseItem) => (
                        <div
                          key={caseItem.id}
                          className="p-3 border rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium">
                              {caseItem.title || "Untitled Case"}
                            </div>
                            <Badge
                              className={getPriorityColor(
                                caseItem.priority
                              )}
                            >
                              {caseItem.priority || "medium"}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {caseItem.description || "No description"}
                          </p>
                          <div className="text-xs text-gray-500">
                            {caseItem.serviceType || "Consultation"} •
                            Opened: {formatDate(caseItem.openedDate)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Client Notes</CardTitle>
                  <CardDescription>
                    Notes and observations about the client
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedClient.notes &&
                    selectedClient.notes.length > 0 ? (
                      <div className="space-y-3">
                        {selectedClient.notes.map((note, index) => (
                          <div
                            key={note.id}
                            className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg relative group"
                          >
                            <button
                              onClick={() =>
                                handleDeleteNote(
                                  selectedClient.id,
                                  note.id,
                                  note.content
                                )
                              }
                              className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete note"
                            >
                              <X className="h-4 w-4" />
                            </button>
                            <div className="flex items-center justify-between mb-2 pr-6">
                              <span className="text-sm font-medium">
                                Note #{index + 1}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(
                                  note.createdAt
                                ).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-gray-700 dark:text-gray-300 pr-6">
                              {note.content}
                            </p>
                            <div className="text-xs text-gray-500 mt-2">
                              Added by: {note.createdBy || "Admin"}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">
                        No notes added yet
                      </p>
                    )}

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setAddNoteModalOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Note
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Note Modal */}
      <Dialog open={addNoteModalOpen} onOpenChange={setAddNoteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Add Note for {selectedClient?.name || "Client"}
            </DialogTitle>
            <DialogDescription>
              Add a note about this client. Notes are visible to all admins.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="note">Note Content</Label>
              <Textarea
                id="note"
                placeholder="Enter your note here..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="mt-1"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddNoteModalOpen(false);
                setNewNote("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddNote}>
              <Save className="h-4 w-4 mr-2" />
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Note Confirmation Modal */}
      <Dialog
        open={deleteNoteConfirmModalOpen}
        onOpenChange={setDeleteNoteConfirmModalOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Note</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this note? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          {noteToDelete && (
            <div className="py-4">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Note Content:
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 p-3 rounded border">
                  {noteToDelete.noteContent}
                </div>
                <div className="text-sm text-red-600 dark:text-red-400 mt-2">
                  This note will be permanently deleted.
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteNoteConfirmModalOpen(false);
                setNoteToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteNote}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Client Confirmation Modal */}
      <Dialog
        open={deleteConfirmModalOpen}
        onOpenChange={setDeleteConfirmModalOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">
              Delete Client
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this client? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {clientToDelete && (
            <div className="py-4">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {clientToDelete.name}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {clientToDelete.email} • {clientToDelete.phone}
                </div>
                {clientToDelete.address && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Address: {clientToDelete.address}
                  </div>
                )}
                {clientToDelete.uid && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    User ID: {clientToDelete.uid.substring(0, 12)}...
                  </div>
                )}
                <div className="text-sm text-red-600 dark:text-red-400 mt-2">
                  This will permanently delete all client information,
                  notes, and associated data.
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmModalOpen(false);
                setClientToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteClient}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminDashboardLayout>
  );
}