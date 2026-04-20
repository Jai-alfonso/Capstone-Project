"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/firebase/config";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
  Timestamp,
  query,
  where,
} from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  Search,
  Plus,
  Eye,
  Edit,
  Mail,
  Phone,
  MapPin,
  FileText,
  Calendar,
  MoreHorizontal,
  Trash2,
  Briefcase,
  CheckCircle,
  XCircle,
  UserPlus,
  UserCheck,
  Shield,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Clock,
  TrendingUp,
  Printer,
  Calendar as CalendarIcon,
  Filter,
  Download,
  File,
} from "lucide-react";
import { AdminDashboardLayout } from "@/components/admin-dashboard-layout";
import { AdvancedFilters } from "@/components/advanced-filters";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { PrintHeader } from "@/components/print-header";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import UserService, { User as UserServiceUser } from "@/lib/user-service";
import { PDFGenerator } from "@/lib/pdf-generator";

interface User {
  id: string;
  uid: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phone?: string;
  role?: string;
  address?: string;
  accountStatus?: string;
  emailVerified?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

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
  specificService?: string;
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

// Case Process Definitions
const CASE_PROCESSES = {
  simple: {
    name: "Simple / One-Time Legal Services",
    steps: [
      { id: "received", name: "Case Received", order: 1 },
      { id: "processing", name: "Service Processing", order: 2 },
      { id: "completed", name: "Service Completed", order: 3 },
      { id: "closed", name: "Case Closed", order: 4 },
    ],
  },
  civil: {
    name: "Civil Cases Process",
    steps: [
      { id: "consultation", name: "Initial Consultation", order: 1 },
      { id: "assessment", name: "Case Assessment / Document Review", order: 2 },
      { id: "drafting", name: "Drafting of Pleadings", order: 3 },
      { id: "review", name: "Client Review & Signing", order: 4 },
      { id: "filing", name: "Filing in Court & Payment of Fees", order: 5 },
      { id: "summons", name: "Issuance & Service of Summons", order: 6 },
      { id: "pre_trial", name: "Preliminary Conference / Pre-Trial", order: 7 },
      { id: "trial", name: "Trial Proper (multiple hearings)", order: 8 },
      { id: "evidence", name: "Submission of Evidence & Memoranda", order: 9 },
      { id: "decision", name: "Court Decision Released", order: 10 },
      { id: "motion", name: "Optional Motion / Appeal", order: 11 },
      { id: "closed", name: "Case Closed", order: 12 },
    ],
  },
  criminal: {
    name: "Criminal Cases Process",
    steps: [
      { id: "consultation", name: "Initial Consultation", order: 1 },
      { id: "affidavit", name: "Affidavit Drafting & Execution", order: 2 },
      { id: "filing", name: "Filing with Prosecutor", order: 3 },
      { id: "investigation", name: "Preliminary Investigation", order: 4 },
      { id: "resolution", name: "Prosecutor's Resolution", order: 5 },
      { id: "arraignment", name: "Arraignment", order: 6 },
      { id: "pre_trial", name: "Pre-Trial Conference", order: 7 },
      { id: "trial", name: "Trial Proper (Prosecution & Defense)", order: 8 },
      { id: "memoranda", name: "Submission of Memoranda", order: 9 },
      { id: "judgment", name: "Promulgation of Judgment", order: 10 },
      { id: "appeal", name: "Optional Appeal", order: 11 },
      { id: "execution", name: "Execution of Judgment", order: 12 },
      { id: "closed", name: "Case Closed", order: 13 },
    ],
  },
  special: {
    name: "Special Proceedings",
    steps: [
      { id: "consultation", name: "Initial Consultation", order: 1 },
      { id: "gathering", name: "Document Gathering", order: 2 },
      { id: "filing", name: "Drafting & Filing of Petition", order: 3 },
      { id: "evaluation", name: "Court Evaluation", order: 4 },
      { id: "publication", name: "Publication (if required)", order: 5 },
      { id: "hearings", name: "Hearings", order: 6 },
      { id: "evidence", name: "Submission of Evidence", order: 7 },
      { id: "order", name: "Court Order Issued", order: 8 },
      { id: "implementation", name: "Implementation of Order", order: 9 },
      { id: "closed", name: "Case Closed", order: 10 },
    ],
  },
  administrative: {
    name: "Administrative / Quasi-Judicial Cases",
    steps: [
      { id: "consultation", name: "Initial Consultation", order: 1 },
      { id: "filing", name: "Filing of Complaint / Response", order: 2 },
      { id: "mediation", name: "Mediation / Conciliation", order: 3 },
      { id: "position", name: "Submission of Position Papers", order: 4 },
      { id: "hearings", name: "Hearings / Conferences", order: 5 },
      { id: "decision", name: "Decision Issued", order: 6 },
      { id: "appeal", name: "Optional Appeal", order: 7 },
      { id: "closed", name: "Case Closed", order: 8 },
    ],
  },
  pleadings: {
    name: "Preparation of Pleadings / Motions",
    steps: [
      { id: "received", name: "Request Received", order: 1 },
      { id: "drafting", name: "Drafting", order: 2 },
      { id: "review", name: "Client Review & Revision", order: 3 },
      { id: "filing", name: "Filing / Submission", order: 4 },
      { id: "awaiting", name: "Awaiting Court Action", order: 5 },
      { id: "closed", name: "Closed (per pleading)", order: 6 },
    ],
  },
  appearance: {
    name: "Court Appearance / Representation",
    steps: [
      { id: "scheduled", name: "Scheduled Appearance", order: 1 },
      { id: "attendance", name: "Court Attendance", order: 2 },
      { id: "outcome", name: "Hearing Outcome Recorded", order: 3 },
      { id: "repeat", name: "Repeat as Needed", order: 4 },
      { id: "resolution", name: "Case Resolution", order: 5 },
      { id: "closed", name: "Case Closed", order: 6 },
    ],
  },
  retainer: {
    name: "Retainer Cases",
    steps: [
      { id: "activated", name: "Retainer Activated", order: 1 },
      { id: "consultations", name: "Regular Consultations", order: 2 },
      { id: "legal_work", name: "Ongoing Legal Work", order: 3 },
      { id: "review", name: "Monthly Review", order: 4 },
      { id: "termination", name: "Retainer Termination or Renewal", order: 5 },
      { id: "closed", name: "Case Closed", order: 6 },
    ],
  },
  complex: {
    name: "Other Complex Cases",
    steps: [
      { id: "consultation", name: "Initial Consultation", order: 1 },
      { id: "gathering", name: "Document Gathering", order: 2 },
      { id: "filing", name: "Filing of Application / Petition", order: 3 },
      { id: "review", name: "Agency or Court Review", order: 4 },
      { id: "hearings", name: "Hearings / Interviews", order: 5 },
      { id: "compliance", name: "Compliance with Requirements", order: 6 },
      { id: "decision", name: "Decision Released", order: 7 },
      { id: "closed", name: "Case Closed", order: 8 },
    ],
  },
  corporate: {
    name: "Corporate & Licensing Cases",
    steps: [
      { id: "requirements", name: "Requirements Gathering", order: 1 },
      { id: "preparation", name: "Form Preparation", order: 2 },
      { id: "submission", name: "Submission to Agency", order: 3 },
      { id: "payment", name: "Payment of Fees", order: 4 },
      {
        id: "compliance",
        name: "Compliance with Additional Requirements",
        order: 5,
      },
      { id: "release", name: "Release of License / Certificate", order: 6 },
      { id: "closed", name: "Case Closed", order: 7 },
    ],
  },
};

const SERVICE_TYPE_TO_PROCESS: Record<string, keyof typeof CASE_PROCESSES> = {
  consultation: "simple",
  documentation: "simple",
  representation: "appearance",
  mediation: "administrative",
  arbitration: "administrative",
  litigation: "civil",
  contract: "pleadings",
  estate: "special",
  "one-time": "simple",
  "case-based": "civil",
  "project-based": "pleadings",
  retainer: "retainer",
  // Default mappings based on case type
  "legal-consultation": "simple",
  civil: "civil",
  criminal: "criminal",
  "special-proceedings": "special",
  administrative: "administrative",
  pleadings: "pleadings",
  appearance: "appearance",
  accounting: "simple",
  corporate: "corporate",
  audit: "simple",
  "accounting-tax": "simple",
  tax: "simple",
  other: "complex",
};

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isAddCaseModalOpen, setIsAddCaseModalOpen] = useState(false);
  const [isEditCaseModalOpen, setIsEditCaseModalOpen] = useState(false);
  const [isDeleteClientModalOpen, setIsDeleteClientModalOpen] = useState(false);
  const [isDeleteCaseModalOpen, setIsDeleteCaseModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [caseToDelete, setCaseToDelete] = useState<{
    caseId: string;
    clientId: string;
    caseTitle: string;
  } | null>(null);
  const [searchExistingUser, setSearchExistingUser] = useState("");
  const [searchExistingClient, setSearchExistingClient] = useState("");
  const [filteredExistingUsers, setFilteredExistingUsers] = useState<User[]>(
    []
  );
  const [filteredExistingClients, setFilteredExistingClients] = useState<
    Client[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [activeTab, setActiveTab] = useState("clients");
  const [addClientMode, setAddClientMode] = useState<"existing" | "new">(
    "existing"
  );
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);



  const [newClient, setNewClient] = useState({
    name: "",
    phone: "+63",
    address: "",
    email: "",
    userId: "",
    source: "Unknown",
    otherInfo: "",
    status: "Active",
    priority: "Medium",
  });

  const [newCase, setNewCase] = useState({
    clientId: "",
    clientName: "",
    title: "",
    description: "",
    caseType: "",
    serviceType: "",
    specificService: "",
    status: "active" as Case["status"],
    priority: "medium" as Case["priority"],
    assignedDate: new Date().toISOString().split("T")[0],
    openedDate: new Date().toISOString().split("T")[0],
    notes: "",
    processType: "",
  });

  const [editCase, setEditCase] = useState({
    id: "",
    title: "",
    description: "",
    caseType: "",
    serviceType: "",
    specificService: "",
    status: "active" as Case["status"],
    priority: "medium" as Case["priority"],
    notes: "",
    processSteps: [] as CaseProcessStep[],
  });

  const [filters, setFilters] = useState({
    dateRange: { from: "", to: "" },
    status: [] as string[],
    caseType: [] as string[],
    attorney: "",
    priority: "" as string,
    sortBy: "date" as string,
    sortOrder: "desc" as "asc" | "desc",
  });

  const { logAction, logCaseAction, logUserAction } = useAuditLogger();
  const [adminUserData, setAdminUserData] = useState<UserServiceUser | null>(null);

  // Fetch admin user data once on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser?.uid) {
        try {
          const data = await UserService.getUserById(firebaseUser.uid);
          if (data) {
            setAdminUserData(data as UserServiceUser);
          }
        } catch (error) {
          console.error("Error fetching admin user data:", error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    loadData();
  }, [showArchived, activeTab]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([loadUsers(), loadClients(), loadCases()]);

      await logAction(
        "Data Load",
        "Clients & Cases Dashboard",
        `Loaded ${clients.length} clients and ${cases.length} cases`,
        "Info"
      );
    } catch (error: any) {
      await logAction(
        "Data Load Error",
        "Clients & Cases Dashboard",
        `Failed to load data: ${error.message}`,
        "Critical"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      if (!db) return;

      const usersData: User[] = [];
      const userProfilesRef = collection(db, "userProfiles");
      const userProfilesSnapshot = await getDocs(userProfilesRef);

      userProfilesSnapshot.forEach((doc) => {
        const data = doc.data();
        const fullName =
          data.fullName ||
          `${data.firstName || ""} ${data.lastName || ""}`.trim() ||
          "Unnamed User";

        usersData.push({
          id: doc.id,
          uid: data.uid || doc.id,
          email: data.email || "",
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          fullName: fullName,
          phone: data.phone || "",
          role: data.role || "user",
          address: data.address || "", // Add address field
          accountStatus: data.accountStatus || "active",
          emailVerified: data.emailVerified || false,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });

      const usersRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersRef);

      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        const existingUserIndex = usersData.findIndex(
          (u) => u.email === data.email
        );

        if (existingUserIndex === -1) {
          const fullName =
            data.fullName ||
            `${data.firstName || ""} ${data.lastName || ""}`.trim() ||
            data.email ||
            "Unnamed User";

          usersData.push({
            id: doc.id,
            uid: data.uid || doc.id,
            email: data.email || "",
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            fullName: fullName,
            phone: data.phone || "",
            role: data.role || "user",
            address: data.address || "",
            accountStatus: data.accountStatus || "active",
            emailVerified: data.emailVerified || false,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        }
      });

      setUsers(usersData);
      handleSearchExistingUser(searchExistingUser);
    } catch (error: any) {
      toast.error("Failed to load users. Please try again.");
    }
  };

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
        if (data.archived === showArchived) {
          clientsData.push({
            id: doc.id,
            ...data,
          });
        }
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

      clientsData.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      setClients(clientsData);
    } catch (error: any) {
      toast.error("Failed to load clients. Please try again.");
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

        // Calculate progress if process steps exist
        let progressPercentage = 0;
        let currentStep = 0;

        if (data.processSteps && data.processSteps.length > 0) {
          const completedSteps = data.processSteps.filter(
            (step) => step.status === "completed"
          ).length;
          const totalSteps = data.processSteps.length;
          progressPercentage = Math.round((completedSteps / totalSteps) * 100);

          // Find current step (first step that's not completed)
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
      toast.error("Failed to load cases. Please try again.");
    }
  };

  // Printable Reports Functions
const printClientReports = () => {
  if (filteredClients.length === 0) {
    toast.error("No clients to download");
    return;
  }

  try {
    const pdfGen = new PDFGenerator();
    
    // Prepare data
    const clientsData = filteredClients.map(client => ({
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: client.address,
      city: client.city,
      state: client.state,
      zipCode: client.zipCode,
      priority: client.priority,
      uid: client.uid,
    }));
    
    pdfGen.generateAllClientsReport(
      clientsData,
      adminUserData?.fullName || adminUserData?.name || 'Administrator',
      adminUserData?.email || 'N/A'
    );
    
    const filename = `Client_Reports_${new Date().toISOString().split('T')[0]}.pdf`;
    pdfGen.download(filename);
    
    toast.success("Client reports downloaded successfully");
    
    logAction(
      "Download Client Reports",
      "Clients Dashboard",
      `Downloaded ${filteredClients.length} client reports`,
      "Info"
    );
  } catch (error) {
    console.error("Error generating PDF:", error);
    toast.error("Failed to generate PDF report");
  }
};

const printCaseReports = () => {
  if (sortedCases.length === 0) {
    toast.error("No cases to download");
    return;
  }

  try {
    const pdfGen = new PDFGenerator();
    
    // Prepare data
    const casesData = sortedCases.map(caseItem => ({
      title: caseItem.title,
      clientName: caseItem.clientName,
      caseType: caseItem.caseType,
      serviceType: caseItem.serviceType,
      status: caseItem.status,
      priority: caseItem.priority,
      openedDate: caseItem.openedDate,
      description: caseItem.description,
    }));
    
    pdfGen.generateCasesReport(
      casesData,
      'All Time',
      adminUserData?.fullName || adminUserData?.name || 'Administrator',
      adminUserData?.email || 'N/A'
    );
    
    const filename = `Case_Reports_${new Date().toISOString().split('T')[0]}.pdf`;
    pdfGen.download(filename);
    
    toast.success("Case reports downloaded successfully");
    
    logAction(
      "Download Case Reports",
      "Cases Dashboard",
      `Downloaded ${sortedCases.length} case reports`,
      "Info"
    );
  } catch (error) {
    console.error("Error generating PDF:", error);
    toast.error("Failed to generate PDF report");
  }
};


const printCaseDetails = (client: Client) => {
  try {
    const pdfGen = new PDFGenerator();
    
    const clientCasesList = clientCases(client.id);
    
    if (clientCasesList.length === 0) {
      toast.error("This client has no services to print");
      return;
    }
    
    // Prepare cases data with process steps
    const casesData = clientCasesList.map(c => {
      // Determine processType - try multiple sources
      let processType = c.processType;
      
      // If not set, try to determine from serviceType
      if (!processType && c.serviceType) {
        processType = SERVICE_TYPE_TO_PROCESS[c.serviceType.toLowerCase()];
      }
      
      // If still not set, try from caseType
      if (!processType && c.caseType) {
        processType = SERVICE_TYPE_TO_PROCESS[c.caseType.toLowerCase()];
      }
      
      // Final fallback
      if (!processType) {
        processType = 'simple';
      }

      return {
        title: c.title || 'Untitled Case',
        serviceType: c.serviceType || 'Consultation',
        status: c.status,
        openedDate: c.openedDate,
        description: c.description,
        clientName: client.name,
        caseType: c.caseType || 'Other',
        processSteps: c.processSteps && Array.isArray(c.processSteps) ? c.processSteps : [],
        processType: processType,
        progressPercentage: c.progressPercentage,
      };
    });
    
    pdfGen.generateCaseDetailsReport(
      {
        name: client.name,
        email: client.email,
        phone: client.phone,
        address: client.address,
        activeCases: client.activeCases,
      },
      [],
      casesData,
      adminUserData?.fullName || 'Administrator',
      adminUserData?.email || 'N/A'
    );
    
    const filename = `Case_Details_${client.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdfGen.download(filename);
    
    toast.success("Case details downloaded successfully");

    logAction(
      "Download Case Details",
      `Client: ${client.id}`,
      `Downloaded detailed case report for client ${client.name} with ${clientCasesList.length} services`,
      "Info"
    );
  } catch (error) {
    console.error("Error generating PDF:", error);
    toast.error("Failed to generate PDF report");
  }
};



  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.startsWith("+63")) {
      const numbers = value.slice(3).replace(/\D/g, "");
      if (numbers.length <= 10) {
        setNewClient({ ...newClient, phone: "+63" + numbers });
      }
    } else if (value === "" || value === "+") {
      setNewClient({ ...newClient, phone: "+63" });
    }
  };

  const handleSearchExistingUser = (search: string) => {
    setSearchExistingUser(search);

    if (search.trim() === "") {
      const filtered = users.filter(
        (user) =>
          user.role !== "admin" &&
          user.role !== "attorney" &&
          !clients.some(
            (client) =>
              client.email === user.email ||
              (client.userId && client.userId === user.id)
          )
      );
      setFilteredExistingUsers(filtered);
    } else {
      const filtered = users.filter(
        (user) =>
          (user.fullName?.toLowerCase().includes(search.toLowerCase()) ||
            user.email?.toLowerCase().includes(search.toLowerCase()) ||
            user.phone?.toLowerCase().includes(search.toLowerCase())) &&
          !clients.some(
            (client) =>
              client.email === user.email ||
              (client.userId && client.userId === user.id)
          ) &&
          user.role !== "admin" &&
          user.role !== "attorney"
      );
      setFilteredExistingUsers(filtered);
    }
  };

  const handleSelectUserForClient = (user: User) => {
    setNewClient({
      name:
        user.fullName ||
        `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
        "Unknown Client",
      phone: user.phone || "+63",
      address: user.address || "Address not provided",
      email: user.email || "",
      userId: user.id,
                    source: "Unknown",
                    otherInfo: "",
      status: "Active",
      priority: "Medium",
    });
    setSearchExistingUser(user.fullName || user.email || "");
    setFilteredExistingUsers([]);
  };

  const handleAddClient = async () => {
    if (addClientMode === "existing" && !newClient.userId) {
      toast.error("Please select an existing user");
      await logAction(
        "Client Creation Failed",
        "Client Management",
        "Attempted to add client without selecting existing user",
        "Warning"
      );
      return;
    }

    if (addClientMode === "new") {
      if (
        !newClient.name ||
        !newClient.email ||
        newClient.phone === "+63" ||
        !newClient.address
      ) {
        toast.error("Please fill in all required fields");
        await logAction(
          "Client Creation Failed",
          "Client Management",
          `Missing required fields for new client: ${newClient.name}`,
          "Warning"
        );
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newClient.email)) {
        toast.error("Please enter a valid email address");
        await logAction(
          "Client Creation Failed",
          "Client Management",
          `Invalid email format: ${newClient.email}`,
          "Warning"
        );
        return;
      }

      if (newClient.phone.length !== 13) {
        toast.error(
          "Please enter a valid phone number (+63 followed by 10 digits)"
        );
        await logAction(
          "Client Creation Failed",
          "Client Management",
          `Invalid phone number: ${newClient.phone}`,
          "Warning"
        );
        return;
      }
    }

    try {
      const clientData = {
        name: newClient.name,
        email: newClient.email,
        phone: newClient.phone,
        address: newClient.address,
        source: newClient.source === "Unknown" ? null : newClient.source || null,
        otherInfo: newClient.otherInfo || null,
        status: newClient.status,
        priority: newClient.priority,
        joinDate: new Date().toLocaleDateString(),
        totalCases: 0,
        activeCases: 0,
        lastContact: new Date().toLocaleDateString(),
        archived: false,
        userId: newClient.userId || null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, "clients"), clientData);

      // Enhanced logging with more details
      await logAction(
        addClientMode === "existing"
          ? "Client Created (From User)"
          : "Client Created (New)",
        `Client ID: ${docRef.id}`,
        `${
          addClientMode === "existing"
            ? "Converted existing user to"
            : "Added new"
        } client: "${newClient.name}" (${newClient.email}) 
         Status: ${newClient.status} | Priority: ${
          newClient.priority
        } | Phone: ${newClient.phone}
         Address: ${newClient.address}`,
        "Info"
      );

      if (newClient.userId) {
        try {
          const userRef = doc(db, "userProfiles", newClient.userId);
          await updateDoc(userRef, {
            role: "client",
            updatedAt: Timestamp.now(),
          });

          await logUserAction(
            "Role Updated to Client",
            newClient.email,
            `User "${newClient.name}" role changed to client and client profile created`,
            "Info"
          );
        } catch (updateError: any) {
          await logAction(
            "User Role Update Failed",
            `User ID: ${newClient.userId}`,
            `Failed to update user role to client: ${updateError.message}`,
            "Warning"
          );
        }
      }

      setNewClient({
        name: "",
        phone: "+63",
        address: "",
        email: "",
        userId: "",
        source: "Unknown",
        otherInfo: "",
        status: "Active",
        priority: "Medium",
      });
      setSearchExistingUser("");

      setIsAddClientModalOpen(false);
      toast.success("Client added successfully!");
      loadData();
    } catch (error: any) {
      await logAction(
        "Client Creation Error",
        "Client Management",
        `Failed to add client "${newClient.name}": ${error.message}`,
        "Critical"
      );
      toast.error(
        `Failed to add client: ${error?.message || "Please try again."}`
      );
    }
  };

  const getProcessForServiceType = (serviceType: string, caseType: string) => {
    // First try direct mapping from service type
    const processKey = SERVICE_TYPE_TO_PROCESS[serviceType];
    if (processKey) {
      return processKey;
    }

    // Fall back to case type mapping
    return SERVICE_TYPE_TO_PROCESS[caseType] || "simple";
  };

  const initializeProcessSteps = (processType: keyof typeof CASE_PROCESSES) => {
    const process = CASE_PROCESSES[processType];
    if (!process) return [];

    return process.steps.map((step) => ({
      id: step.id,
      name: step.name,
      status: "pending" as const,
      order: step.order,
      completedDate: "",
      notes: "",
    }));
  };

  const handleOpenAddCase = () => {
    setNewCase({
      clientId: "",
      clientName: "",
      title: "",
      description: "",
      caseType: "",
      serviceType: "",
      specificService: "",
      status: "active",
      priority: "medium",
      assignedDate: new Date().toISOString().split("T")[0],
      openedDate: new Date().toISOString().split("T")[0],
      notes: "",
      processType: "",
    });
    setSearchExistingClient("");
    setFilteredExistingClients(clients);
    setIsAddCaseModalOpen(true);

    logAction(
      "Open Add Case Modal",
      "Case Management",
      "Opened modal to add new case",
      "Info"
    );
  };

  const handleSearchExistingClient = (search: string) => {
    setSearchExistingClient(search);
    if (search.trim() === "") {
      setFilteredExistingClients(clients);
    } else {
      const filtered = clients.filter(
        (client) =>
          client.name.toLowerCase().includes(search.toLowerCase()) ||
          client.email.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredExistingClients(filtered);
    }
  };

  const handleSelectClientForCase = (client: Client) => {
    setNewCase({
      ...newCase,
      clientId: client.id,
      clientName: client.name,
    });
    setSelectedClient(client);
    setSearchExistingClient(client.name);
    setFilteredExistingClients([]);
  };

  const handleAddCase = async () => {
    if (
      !newCase.clientId ||
      !newCase.specificService ||
      !newCase.caseType ||
      !newCase.serviceType
    ) {
      toast.error("Please fill in all required fields");
      await logAction(
        "Case Creation Failed",
        "Case Management",
        `Missing required fields for new case: ${newCase.title || "Untitled"}`,
        "Warning"
      );
      return;
    }

    try {
      // Determine process type based on service type and case type
      const processType = getProcessForServiceType(
        newCase.serviceType,
        newCase.caseType
      );
      const processSteps = initializeProcessSteps(processType);

      // Ensure all fields have valid values (not undefined)
      const caseData = {
        clientId: newCase.clientId,
        clientName: newCase.clientName || "",
        title: newCase.specificService,
        description: newCase.description || "",
        caseType: newCase.caseType,
        serviceType: newCase.serviceType,
        specificService: newCase.specificService || "",
        status: "active",
        priority: newCase.priority,
        assignedDate: newCase.assignedDate || "",
        openedDate:
          newCase.openedDate || new Date().toISOString().split("T")[0],
        notes: "",
        processType: processType,
        processSteps: processSteps,
        progressPercentage: 0,
        currentStep: 0,
        assignedTo: "", // Add default value
        closedDate: "", // Add default value
        documents: [], // Add default value
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, "cases"), caseData);

      const clientRef = doc(db, "clients", newCase.clientId);
      const clientSnapshot = await getDocs(
        query(
          collection(db, "clients"),
          where("__name__", "==", newCase.clientId)
        )
      );

      if (!clientSnapshot.empty) {
        const clientDoc = clientSnapshot.docs[0];
        const clientData = clientDoc.data() as Client;
        await updateDoc(clientRef, {
          totalCases: (clientData.totalCases || 0) + 1,
          activeCases:
            (clientData.activeCases || 0) +
            (newCase.status === "active" ? 1 : 0),
          lastContact: new Date().toLocaleDateString(),
          updatedAt: Timestamp.now(),
        });
      }

      await logCaseAction(
        "Created",
        docRef.id,
        newCase.title,
        `Created new case for client "${newCase.clientName}"
         Case Details:
         - Type: ${newCase.caseType}
         - Service: ${newCase.serviceType}
         - Process: ${CASE_PROCESSES[processType]?.name}
         - Status: ${newCase.status}
         - Priority: ${newCase.priority}
         - Opened Date: ${newCase.openedDate}
         - Description: ${newCase.description || "No description"}
         Process initialized with ${processSteps.length} steps`,
        "Info"
      );

      toast.success("Case added successfully!");
      setIsAddCaseModalOpen(false);
      setSelectedClient(null);
      setNewCase({
        clientId: "",
        clientName: "",
        title: "",
        description: "",
        caseType: "",
        serviceType: "",
        specificService: "",
        status: "active",
        priority: "medium",
        assignedDate: new Date().toISOString().split("T")[0],
        openedDate: new Date().toISOString().split("T")[0],
        notes: "",
        processType: "",
      });
      loadData();
    } catch (error: any) {
      console.error("Error adding case:", error);
      await logAction(
        "Case Creation Error",
        "Case Management",
        `Failed to add case "${newCase.title}": ${error.message}`,
        "Critical"
      );
      toast.error("Failed to add case. Please try again.");
    }
  };

  const handleEditCase = (caseItem: Case) => {
    setSelectedCase(caseItem);
    setEditCase({
      id: caseItem.id || "",
      title: caseItem.title,
      description: caseItem.description,
      caseType: caseItem.caseType,
      serviceType: caseItem.serviceType,
      specificService: caseItem.specificService || "",
      status: caseItem.status,
      priority: caseItem.priority,
      notes: caseItem.notes || "",
      processSteps: caseItem.processSteps || [],
    });
    setIsEditCaseModalOpen(true);

    logAction(
      "Open Edit Case Modal",
      `Case: ${caseItem.id}`,
      `Started editing case: "${caseItem.title}"`,
      "Info"
    );
  };

  const handleUpdateProcessStep = async (
    caseId: string,
    stepId: string,
    newStatus: CaseProcessStep["status"]
  ) => {
    try {
      const caseRef = doc(db, "cases", caseId);
      const caseDoc = await getDocs(
        query(collection(db, "cases"), where("__name__", "==", caseId))
      );

      if (!caseDoc.empty) {
        const caseData = caseDoc.docs[0].data() as Case;
        const stepToUpdate = caseData.processSteps?.find(
          (step) => step.id === stepId
        );

        if (!stepToUpdate) {
          await logAction(
            "Process Step Update Failed",
            `Case ID: ${caseId}`,
            `Step "${stepId}" not found in case "${caseData.title}"`,
            "Warning"
          );
          return;
        }

        const updatedSteps =
          caseData.processSteps?.map((step) => {
            if (step.id === stepId) {
              return {
                ...step,
                status: newStatus,
                completedDate:
                  newStatus === "completed"
                    ? new Date().toISOString().split("T")[0]
                    : step.completedDate || "",
              };
            }
            return step;
          }) || [];

        // Calculate new progress
        const completedSteps = updatedSteps.filter(
          (step) => step.status === "completed"
        ).length;
        const totalSteps = updatedSteps.length;
        const progressPercentage = Math.round(
          (completedSteps / totalSteps) * 100
        );

        // Find current step
        const currentStepIndex = updatedSteps.findIndex(
          (step) => step.status !== "completed"
        );
        const currentStep =
          currentStepIndex >= 0 ? currentStepIndex : updatedSteps.length - 1;

        await updateDoc(caseRef, {
          processSteps: updatedSteps,
          progressPercentage,
          currentStep,
          updatedAt: Timestamp.now(),
        });

        // Log process step update
        await logCaseAction(
          "Process Step Updated",
          caseId,
          caseData.title,
          `Updated process step "${stepToUpdate.name}" (${stepId})
           From: ${stepToUpdate.status} → To: ${newStatus}
           Progress: ${progressPercentage}% (${completedSteps}/${totalSteps} steps completed)
           Current step: ${currentStep + 1} - ${
            updatedSteps[currentStep]?.name || "Unknown"
          }
           Updated at: ${new Date().toLocaleString()}`,
          "Info"
        );

        // Update case status to closed if all steps are completed
        if (completedSteps === totalSteps && caseData.status !== "closed") {
          await updateDoc(caseRef, {
            status: "closed",
            closedDate: new Date().toISOString().split("T")[0],
            updatedAt: Timestamp.now(),
          });

          // Update client's active cases count
          const clientRef = doc(db, "clients", caseData.clientId);
          const clientDoc = await getDocs(
            query(
              collection(db, "clients"),
              where("__name__", "==", caseData.clientId)
            )
          );

          if (!clientDoc.empty) {
            const clientData = clientDoc.docs[0].data() as Client;
            await updateDoc(clientRef, {
              activeCases: Math.max(0, (clientData.activeCases || 0) - 1),
              updatedAt: Timestamp.now(),
            });
          }

          // Log case closure
          await logCaseAction(
            "Case Closed",
            caseId,
            caseData.title,
            `Case closed automatically after completing all process steps
             Closed at: ${new Date().toLocaleString()}
             Final progress: 100%
             Total steps completed: ${completedSteps}/${totalSteps}`,
            "Info"
          );
        }

        toast.success("Process step updated!");
        loadCases();
      }
    } catch (error: any) {
      await logAction(
        "Process Update Error",
        `Case ID: ${caseId}`,
        `Failed to update process step "${stepId}": ${error.message}`,
        "Critical"
      );
      toast.error("Failed to update process step. Please try again.");
    }
  };

  const handleUpdateCase = async () => {
    if (!editCase.title || !editCase.caseType || !editCase.serviceType) {
      toast.error("Please fill in all required fields");
      await logAction(
        "Case Update Failed",
        `Case ID: ${editCase.id}`,
        "Missing required fields for case update",
        "Warning"
      );
      return;
    }

    try {
      const caseRef = doc(db, "cases", editCase.id);

      // Get current case data for comparison
      const caseDoc = await getDocs(
        query(collection(db, "cases"), where("__name__", "==", editCase.id))
      );

      let changes = [];

      if (caseDoc.empty) {
        await logAction(
          "Case Update Error",
          `Case ID: ${editCase.id}`,
          "Case not found in database",
          "Critical"
        );
        toast.error("Case not found!");
        return;
      }

      const currentCaseData = caseDoc.docs[0].data() as Case;

      // Track changes
      if (currentCaseData.title !== editCase.title) {
        changes.push(`Title: "${currentCaseData.title}" → "${editCase.title}"`);
      }
      if (currentCaseData.description !== editCase.description) {
        changes.push("Description updated");
      }
      if (currentCaseData.caseType !== editCase.caseType) {
        changes.push(
          `Case Type: ${currentCaseData.caseType} → ${editCase.caseType}`
        );
      }
      if (currentCaseData.serviceType !== editCase.serviceType) {
        changes.push(
          `Service Type: ${currentCaseData.serviceType} → ${editCase.serviceType}`
        );
      }
      if (currentCaseData.status !== editCase.status) {
        changes.push(`Status: ${currentCaseData.status} → ${editCase.status}`);
      }
      if (currentCaseData.priority !== editCase.priority) {
        changes.push(
          `Priority: ${currentCaseData.priority} → ${editCase.priority}`
        );
      }
      if (currentCaseData.notes !== editCase.notes) {
        changes.push("Notes updated");
      }

      await updateDoc(caseRef, {
        title: editCase.title,
        description: editCase.description,
        caseType: editCase.caseType,
        serviceType: editCase.serviceType,
        status: editCase.status,
        priority: editCase.priority,
        notes: editCase.notes,
        // Preserve processType and processSteps from current case data
        processType: currentCaseData.processType,
        processSteps: currentCaseData.processSteps,
        updatedAt: Timestamp.now(),
      });

      if (selectedCase && selectedCase.status !== editCase.status) {
        const clientRef = doc(db, "clients", selectedCase.clientId);
        const clientSnapshot = await getDocs(
          query(
            collection(db, "clients"),
            where("__name__", "==", selectedCase.clientId)
          )
        );

        if (!clientSnapshot.empty) {
          const clientDoc = clientSnapshot.docs[0];
          const clientData = clientDoc.data() as Client;
          let activeCasesChange = 0;

          if (
            selectedCase.status === "active" &&
            editCase.status !== "active"
          ) {
            activeCasesChange = -1;
          } else if (
            selectedCase.status !== "active" &&
            editCase.status === "active"
          ) {
            activeCasesChange = 1;
          }

          if (activeCasesChange !== 0) {
            await updateDoc(clientRef, {
              activeCases: Math.max(
                0,
                (clientData.activeCases || 0) + activeCasesChange
              ),
              lastContact: new Date().toLocaleDateString(),
              updatedAt: Timestamp.now(),
            });
          }
        }
      }

      await logCaseAction(
        "Updated",
        editCase.id,
        editCase.title,
        `Updated case details
         Changes made: ${
           changes.length > 0 ? changes.join(", ") : "No changes detected"
         }
         Updated at: ${new Date().toLocaleString()}
         Case details after update:
         - Status: ${editCase.status}
         - Priority: ${editCase.priority}
         - Type: ${editCase.caseType}
         - Service: ${editCase.serviceType}`,
        "Info"
      );

      toast.success("Case updated successfully!");
      setIsEditCaseModalOpen(false);
      setSelectedCase(null);
      loadData();
    } catch (error: any) {
      await logAction(
        "Case Update Error",
        `Case ID: ${editCase.id}`,
        `Failed to update case "${editCase.title}": ${error.message}`,
        "Critical"
      );
      toast.error("Failed to update case. Please try again.");
    }
  };

  const handleConfirmDeleteCase = () => {
    if (!caseToDelete) return;

    const handleDelete = async () => {
      try {
        const caseRef = doc(db, "cases", caseToDelete.caseId);

        // Get case details before deletion
        const caseDoc = await getDocs(
          query(
            collection(db, "cases"),
            where("__name__", "==", caseToDelete.caseId)
          )
        );

        let caseDetails = {
          type: "Unknown",
          service: "Unknown",
          status: "Unknown",
          priority: "Unknown",
          progress: 0,
          openedDate: "Unknown",
          clientName: "Unknown",
        };

        if (!caseDoc.empty) {
          const caseData = caseDoc.docs[0].data() as Case;
          caseDetails = {
            type: caseData.caseType,
            service: caseData.serviceType,
            status: caseData.status,
            priority: caseData.priority,
            progress: caseData.progressPercentage || 0,
            openedDate: caseData.openedDate,
            clientName: caseData.clientName,
          };
        }

        await deleteDoc(caseRef);

        const clientRef = doc(db, "clients", caseToDelete.clientId);
        const clientSnapshot = await getDocs(
          query(
            collection(db, "clients"),
            where("__name__", "==", caseToDelete.clientId)
          )
        );

        if (!clientSnapshot.empty) {
          const clientDoc = clientSnapshot.docs[0];
          const clientData = clientDoc.data() as Client;
          const caseToDeleteItem = cases.find(
            (c) => c.id === caseToDelete.caseId
          );

          await updateDoc(clientRef, {
            totalCases: Math.max(0, (clientData.totalCases || 0) - 1),
            activeCases: Math.max(
              0,
              (clientData.activeCases || 0) -
                (caseToDeleteItem?.status === "active" ? 1 : 0)
            ),
            updatedAt: Timestamp.now(),
          });
        }

        await logCaseAction(
          "Deleted",
          caseToDelete.caseId,
          caseToDelete.caseTitle,
          `Case deleted from client's record
           Deleted at: ${new Date().toLocaleString()}
           Case details:
           - Type: ${caseDetails.type}
           - Service: ${caseDetails.service}
           - Status: ${caseDetails.status}
           - Priority: ${caseDetails.priority}
           - Progress: ${caseDetails.progress}%
           - Opened: ${caseDetails.openedDate}
           - Client: ${caseDetails.clientName}`,
          "Warning"
        );

        toast.success("Case deleted successfully!");
        setIsDeleteCaseModalOpen(false);
        setCaseToDelete(null);
        loadData();
      } catch (error: any) {
        await logAction(
          "Case Deletion Error",
          `Case ID: ${caseToDelete.caseId}`,
          `Failed to delete case "${caseToDelete.caseTitle}": ${error.message}`,
          "Critical"
        );
        toast.error("Failed to delete case. Please try again.");
      }
    };

    handleDelete();
  };

  const handleConfirmDeleteClient = () => {
    if (!clientToDelete) return;

    const handleDelete = async () => {
      try {
        const clientCasesList = cases.filter(
          (caseItem) => caseItem.clientId === clientToDelete.id
        );

        // Log before deletion
        await logAction(
          "Client Deletion Started",
          `Client ID: ${clientToDelete.id}`,
          `Starting deletion of client "${clientToDelete.name}" (${clientToDelete.email})
           Associated cases to delete: ${clientCasesList.length}
           Client status: ${clientToDelete.status} | Priority: ${clientToDelete.priority}`,
          "Warning"
        );

        for (const caseItem of clientCasesList) {
          if (caseItem.id) {
            const caseRef = doc(db, "cases", caseItem.id);
            await deleteDoc(caseRef);

            await logCaseAction(
              "Deleted (Client Deletion)",
              caseItem.id,
              caseItem.title,
              `Deleted case as part of client "${clientToDelete.name}" deletion
               Case type: ${caseItem.caseType} | Status: ${caseItem.status}`,
              "Warning"
            );
          }
        }

        const clientRef = doc(db, "clients", clientToDelete.id);
        await deleteDoc(clientRef);

        await logAction(
          "Client Deleted",
          `Client ID: ${clientToDelete.id}`,
          `Deleted client "${clientToDelete.name}" (${clientToDelete.email})
           Deleted at: ${new Date().toLocaleString()}
           Deleted cases: ${clientCasesList.length}
           Client details: 
           - Phone: ${clientToDelete.phone}
           - Address: ${clientToDelete.address}
           - Status: ${clientToDelete.status}
           - Priority: ${clientToDelete.priority}
           - Total Cases: ${clientToDelete.totalCases}
           - Active Cases: ${clientToDelete.activeCases}`,
          "Critical"
        );

        toast.success("Client and associated cases deleted successfully!");
        setIsDeleteClientModalOpen(false);
        setClientToDelete(null);
        loadData();
      } catch (error: any) {
        await logAction(
          "Client Deletion Error",
          `Client ID: ${clientToDelete.id}`,
          `Failed to delete client "${clientToDelete.name}": ${error.message}`,
          "Critical"
        );
        toast.error("Failed to delete client. Please try again.");
      }
    };

    handleDelete();
  };

  const handleArchiveClient = async (clientId: string) => {
    if (!confirm("Are you sure you want to archive this client?")) {
      return;
    }

    try {
      const client = clients.find((c) => c.id === clientId);
      const clientRef = doc(db, "clients", clientId);
      await updateDoc(clientRef, {
        archived: true,
        updatedAt: Timestamp.now(),
      });

      await logAction(
        "Client Archived",
        `Client ID: ${clientId}`,
        `Archived client "${client?.name}" (${client?.email})
         Archived at: ${new Date().toLocaleString()}
         Total cases: ${client?.totalCases || 0} | Active cases: ${
          client?.activeCases || 0
        }`,
        "Info"
      );

      toast.success("Client archived successfully!");
      loadClients();
    } catch (error: any) {
      await logAction(
        "Client Archive Error",
        `Client ID: ${clientId}`,
        `Failed to archive client: ${error.message}`,
        "Critical"
      );
      toast.error("Failed to archive client. Please try again.");
    }
  };

  const handleUnarchiveClient = async (clientId: string) => {
    if (!confirm("Are you sure you want to unarchive this client?")) {
      return;
    }

    try {
      const client = clients.find((c) => c.id === clientId);
      const clientRef = doc(db, "clients", clientId);
      await updateDoc(clientRef, {
        archived: false,
        updatedAt: Timestamp.now(),
      });

      await logAction(
        "Client Unarchived",
        `Client ID: ${clientId}`,
        `Unarchived client "${client?.name}" (${client?.email})
         Unarchived at: ${new Date().toLocaleString()}`,
        "Info"
      );

      toast.success("Client unarchived successfully!");
      loadClients();
    } catch (error: any) {
      await logAction(
        "Client Unarchive Error",
        `Client ID: ${clientId}`,
        `Failed to unarchive client: ${error.message}`,
        "Critical"
      );
      toast.error("Failed to unarchive client. Please try again.");
    }
  };

  const handleDeleteClient = (client: Client) => {
    setClientToDelete(client);
    setIsDeleteClientModalOpen(true);

    logAction(
      "Initiate Client Deletion",
      `Client: ${client.id}`,
      `Started deletion process for client "${client.name}"`,
      "Warning"
    );
  };

  const handleDeleteCase = (
    caseId: string,
    clientId: string,
    caseTitle: string
  ) => {
    setCaseToDelete({ caseId, clientId, caseTitle });
    setIsDeleteCaseModalOpen(true);

    logAction(
      "Initiate Case Deletion",
      `Case: ${caseId}`,
      `Started deletion process for case: "${caseTitle}"`,
      "Warning"
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
      case "Active":
        return "bg-gradient-to-r from-green-100 to-green-200 text-green-800 dark:from-green-900 dark:to-green-800 dark:text-green-200 shadow-sm";
      case "closed":
        return "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 dark:from-gray-900 dark:to-gray-800 dark:text-gray-200 shadow-sm";
      case "pending":
        return "bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 dark:from-yellow-900 dark:to-yellow-800 dark:text-yellow-200 shadow-sm";
      case "on_hold":
        return "bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 dark:from-orange-900 dark:to-orange-800 dark:text-orange-200 shadow-sm";
      default:
        return "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 dark:from-gray-900 dark:to-gray-800 dark:text-gray-200 shadow-sm";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
      case "High":
        return "bg-gradient-to-r from-red-100 to-red-200 text-red-800 dark:from-red-900 dark:to-red-800 dark:text-red-200 shadow-sm animate-pulse";
      case "medium":
      case "Medium":
        return "bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 dark:from-yellow-900 dark:to-yellow-800 dark:text-yellow-200 shadow-sm";
      case "low":
      case "Low":
        return "bg-gradient-to-r from-green-100 to-green-200 text-green-800 dark:from-green-900 dark:to-green-800 dark:text-green-200 shadow-sm";
      default:
        return "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 dark:from-gray-900 dark:to-gray-800 dark:text-gray-200 shadow-sm";
    }
  };

  const getCaseStatusIcon = (status: Case["status"]) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "closed":
        return <XCircle className="h-4 w-4 text-gray-600" />;
      case "pending":
        return <FileText className="h-4 w-4 text-yellow-600" />;
      case "on_hold":
        return <FileText className="h-4 w-4 text-orange-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getProcessStepStatusIcon = (status: CaseProcessStep["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case "skipped":
        return <ChevronRight className="h-4 w-4 text-gray-400" />;
      case "pending":
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getProcessStepStatusColor = (status: CaseProcessStep["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
      case "in_progress":
        return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
      case "skipped":
        return "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800";
      case "pending":
      default:
        return "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800";
    }
  };

  const getUserRoleBadge = (role?: string) => {
    switch (role) {
      case "admin":
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            Admin
          </Badge>
        );
      case "attorney":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            Attorney
          </Badge>
        );
      case "client":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Client
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
            User
          </Badge>
        );
    }
  };

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      filters.status.length === 0 || filters.status.includes(client.status);

    const matchesPriority =
      !filters.priority || client.priority === filters.priority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const filteredCases = cases.filter((caseItem) => {
    const matchesStatus =
      filters.status.length === 0 || filters.status.includes(caseItem.status);

    const matchesCaseType =
      filters.caseType.length === 0 ||
      filters.caseType.includes(caseItem.caseType);

    const matchesPriority =
      !filters.priority || caseItem.priority === filters.priority;

    let matchesDateRange = true;
    if (filters.dateRange.from && filters.dateRange.to) {
      const caseDate = new Date(caseItem.openedDate);
      const fromDate = new Date(filters.dateRange.from);
      const toDate = new Date(filters.dateRange.to);
      matchesDateRange = caseDate >= fromDate && caseDate <= toDate;
    }

    let matchesAttorney = true;
    if (filters.attorney && caseItem.assignedTo) {
      matchesAttorney = caseItem.assignedTo === filters.attorney;
    }

    return (
      matchesStatus &&
      matchesCaseType &&
      matchesPriority &&
      matchesDateRange &&
      matchesAttorney
    );
  });

  const sortedCases = [...filteredCases].sort((a, b) => {
    if (filters.sortBy === "date") {
      const aDate = new Date(a.openedDate).getTime();
      const bDate = new Date(b.openedDate).getTime();
      return filters.sortOrder === "desc" ? bDate - aDate : aDate - bDate;
    } else if (filters.sortBy === "title") {
      return filters.sortOrder === "desc"
        ? b.title.localeCompare(a.title)
        : a.title.localeCompare(b.title);
    } else if (filters.sortBy === "priority") {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 0;
      const bPriority = priorityOrder[b.priority] || 0;
      return filters.sortOrder === "desc"
        ? bPriority - aPriority
        : aPriority - bPriority;
    }
    return 0;
  });

  const clientCases = (clientId: string) => {
    return cases.filter((caseItem) => caseItem.clientId === clientId);
  };

  const usersNotClients = users.filter(
    (user) =>
      !clients.some(
        (client) =>
          client.email === user.email ||
          (client.userId && client.userId === user.id)
      ) &&
      user.role !== "admin" &&
      user.role !== "attorney"
  );

  // Add logging for tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    logAction(
      "Tab Changed",
      "Clients & Cases Dashboard",
      `Switched to ${value === "clients" ? "Clients" : "Cases"} tab`,
      "Info"
    );
  };

  // Add logging for filter changes
  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    logAction(
      "Filters Updated",
      `${activeTab === "clients" ? "Clients" : "Cases"} Dashboard`,
      `Updated filters: ${JSON.stringify(newFilters)}`,
      "Info"
    );
  };

  const ProcessStepControl = ({
    caseItem,
    step,
  }: {
    caseItem: Case;
    step: CaseProcessStep;
  }) => {
    const isActive = step.status === "in_progress";
    const isCompleted = step.status === "completed";
    const isSkipped = step.status === "skipped";

    return (
      <div
        className={`p-3 rounded-lg border ${getProcessStepStatusColor(
          step.status
        )}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getProcessStepStatusIcon(step.status)}
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {step.name}
              </p>
              {step.completedDate && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Completed: {step.completedDate}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isCompleted && !isSkipped && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  handleUpdateProcessStep(caseItem.id!, step.id, "completed")
                }
                className="h-8"
              >
                Mark Complete
              </Button>
            )}
            {isCompleted && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  handleUpdateProcessStep(caseItem.id!, step.id, "pending")
                }
                className="h-8"
              >
                Reopen
              </Button>
            )}
            {!isSkipped && !isCompleted && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  handleUpdateProcessStep(caseItem.id!, step.id, "skipped")
                }
                className="h-8"
              >
                Skip
              </Button>
            )}
            {isSkipped && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  handleUpdateProcessStep(caseItem.id!, step.id, "pending")
                }
                className="h-8"
              >
                Unskip
              </Button>
            )}
            {!isActive && !isCompleted && !isSkipped && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  handleUpdateProcessStep(caseItem.id!, step.id, "in_progress")
                }
                className="h-8"
              >
                Start
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

const CaseProcessView = ({ caseItem }: { caseItem: Case }) => {
  const processSteps = caseItem.processSteps || [];
  const isExpanded = expandedCaseId === caseItem.id;
  const processType = caseItem.processType || "simple";
  const processName =
    CASE_PROCESSES[processType as keyof typeof CASE_PROCESSES]?.name ||
    "Case Process";

  return (
    <div className="mt-4">
      <div
        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        onClick={() => setExpandedCaseId(isExpanded ? null : caseItem.id!)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white dark:bg-gray-700 rounded-lg">
            <TrendingUp className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">
              {processName}
            </h4>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Progress:
                </span>
                <span className="text-sm font-bold text-navy-700 dark:text-navy-300">
                  {caseItem.progressPercentage || 0}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Current Step:
                </span>
                <span className="text-sm font-medium">
                  {(caseItem.currentStep !== undefined &&
                    processSteps[caseItem.currentStep]?.name) ||
                    "Not started"}
                </span>
              </div>
            </div>
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-gray-500 transition-transform ${
            isExpanded ? "transform rotate-180" : ""
          }`}
        />
      </div>

      {isExpanded && (
        <div className="mt-3 space-y-2 pl-10">
          <Progress
            value={caseItem.progressPercentage || 0}
            className="h-2"
          />
          <div className="mt-4 space-y-2">
            {processSteps.map((step, index) => (
              <ProcessStepControl
                key={step.id}
                caseItem={caseItem}
                step={step}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


  return (
    <AdminDashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold font-playfair bg-gradient-to-r from-navy-900 to-navy-700 dark:from-navy-100 dark:to-navy-300 bg-clip-text text-transparent">
              {showArchived ? "Archived Clients" : "Clients Directory"}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Manage your client database
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowArchived(!showArchived);
                logAction(
                  showArchived
                    ? "Show Active Clients"
                    : "Show Archived Clients",
                  "Clients Dashboard",
                  `Switched to ${
                    showArchived ? "active" : "archived"
                  } clients view`,
                  "Info"
                );
              }}
              className="border-gray-300"
            >
              {showArchived ? "Show Active" : "Show Archived"}
            </Button>

            <Button
  variant="outline"
  onClick={() => {
    if (activeTab === "clients") {
      printClientReports();
    } else {
      printCaseReports();
    }
  }}
  className="bg-white hover:bg-gray-50 border-navy-200"
>
  <Printer className="h-4 w-4 mr-2" />
  Download Reports (PDF)
</Button>

            <Button
              className="bg-gradient-to-r from-navy-700 to-navy-900 hover:from-navy-600 hover:to-navy-800 shadow-lg hover:shadow-xl hover:shadow-navy-500/25 transition-all duration-300 hover:scale-105 transform"
              onClick={() => {
                setIsAddClientModalOpen(true);
                setAddClientMode("existing");
                loadUsers().then(() => {
                  handleSearchExistingUser("");
                });

                logAction(
                  "Open Add Client Modal",
                  "Client Management",
                  "Opened modal to add new client",
                  "Info"
                );
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid w-full md:w-auto grid-cols-2">
            <TabsTrigger value="clients">
              <Users className="h-4 w-4 mr-2" />
              Clients ({clients.length})
            </TabsTrigger>
            <TabsTrigger value="cases">
              <Briefcase className="h-4 w-4 mr-2" />
              All Services ({cases.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-gray-200/50 dark:border-gray-700/50 focus:bg-white dark:focus:bg-gray-800 transition-all duration-300"
                />
              </div>
              <AdvancedFilters
                onFiltersChange={handleFilterChange}
                activeFilters={filters}
              />
            </div>

            <div className="grid gap-6">
              {filteredClients.map((client) => {
                const clientCaseList = clientCases(client.id);
                const user = client.userId
                  ? users.find((u) => u.id === client.userId)
                  : null;

                return (
                  <Card
                    key={client.id}
                    className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-gray-200/50 dark:border-gray-700/50 hover:shadow-2xl hover:shadow-navy-500/10 transition-all duration-500 hover:scale-[1.02] group"
                  >
                    <CardContent className="p-8">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-start gap-4">
                          <div className="relative">
                            <div className="w-14 h-14 bg-gradient-to-br from-navy-700 to-navy-900 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:shadow-navy-500/25 transition-all duration-300 group-hover:scale-110">
                              <Users className="h-7 w-7 text-white" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <h3 className="text-xl font-bold text-navy-900 dark:text-white group-hover:text-navy-700 dark:group-hover:text-navy-200 transition-colors duration-300">
                                {client.name}
                              </h3>
                              {user && getUserRoleBadge(user.role)}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                              Client ID: {client.id}
                            </p>
                            <div className="flex items-center gap-3 mt-3">
                              <Badge className={getStatusColor(client.status)}>
                                {client.status}
                              </Badge>
                              <Badge
                                className={getPriorityColor(client.priority)}
                              >
                                {client.priority}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-50 dark:hover:from-gray-700 dark:hover:to-gray-600 transition-all duration-300 hover:scale-110 rounded-xl"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>


                            <DropdownMenuContent
                              align="end"
                              className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 shadow-2xl"
                            >
                              <DropdownMenuItem
                                onClick={() => {
                                  router.push(
                                    `/dashboard/admin/clients/${client.id}`
                                  );
                                  logAction(
                                    "View Client Details",
                                    `Client: ${client.id}`,
                                    `Viewed details for client "${client.name}"`,
                                    "Info"
                                  );
                                }}
                                className="hover:bg-gradient-to-r hover:from-navy-50 hover:to-navy-25 dark:hover:from-navy-900 dark:hover:to-navy-800 transition-all duration-200 rounded-lg m-1"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>


                             <DropdownMenuItem
  onClick={() => printCaseDetails(client)}
  className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-25 dark:hover:from-blue-900 dark:hover:to-blue-800 transition-all duration-200 rounded-lg m-1"
>
  <Printer className="h-4 w-4 mr-2" />
  Print Case Details
</DropdownMenuItem>


                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `/dashboard/admin/clients/${client.id}/edit`
                                  )
                                }
                                className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-25 dark:hover:from-blue-900 dark:hover:to-blue-800 transition-all duration-200 rounded-lg m-1"
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Client
                              </DropdownMenuItem>
                              {client.archived ? (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleUnarchiveClient(client.id)
                                  }
                                  className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-25 dark:hover:from-blue-900 dark:hover:to-blue-800 transition-all duration-200 rounded-lg m-1"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Unarchive Client
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => handleArchiveClient(client.id)}
                                  className="hover:bg-gradient-to-r hover:from-red-50 hover:to-red-25 dark:hover:from-red-900 dark:hover:to-red-800 transition-all duration-200 rounded-lg m-1"
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  Archive Client
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleDeleteClient(client)}
                                className="hover:bg-gradient-to-r hover:from-red-50 hover:to-red-25 dark:hover:from-red-900 dark:hover:to-red-800 transition-all duration-200 rounded-lg m-1 text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Client
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="space-y-4 mb-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                            <Mail className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                          </div>
                          <span className="font-medium">{client.email}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                            <Phone className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                          </div>
                          <span className="font-medium">{client.phone}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                            <MapPin className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                          </div>
                          <span className="font-medium">{client.address}</span>
                        </div>
                      </div>

                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Services ({clientCaseList.length})
                          </h4>
                          {clientCaseList.length > 0 && (
                            <Badge
                              variant="outline"
                              className="border-navy-300 text-navy-700"
                            >
                              Active:{" "}
                              {
                                clientCaseList.filter(
                                  (c) => c.status === "active"
                                ).length
                              }
                            </Badge>
                          )}
                        </div>

                        {clientCaseList.length > 0 ? (
                          <div className="space-y-3">
                            {clientCaseList.slice(0, 3).map((caseItem) => (
                              <div
                                key={caseItem.id}
                                className="border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                              >
                                <div className="p-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      {getCaseStatusIcon(caseItem.status)}
                                      <div>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                          {caseItem.title}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                          {caseItem.serviceType} •{" "}
                                          {caseItem.caseType}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge
                                        className={getStatusColor(
                                          caseItem.status
                                        )}
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

                                     <div className="w-20">
  <Progress
    value={caseItem.progressPercentage || 0}
    className="h-2"
  />
</div>
<Button
  variant="ghost"
  size="sm"
  onClick={() => handleEditCase(caseItem)}
  className="h-8 w-8 p-0"
>
  <Edit className="h-4 w-4" />
</Button>


                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          handleDeleteCase(
                                            caseItem.id!,
                                            caseItem.clientId,
                                            caseItem.title
                                          )
                                        }
                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>

                                  {caseItem.processSteps &&
                                    caseItem.processSteps.length > 0 && (
                                      <CaseProcessView caseItem={caseItem} />
                                    )}
                                </div>
                              </div>
                            ))}

                            {clientCaseList.length > 3 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  router.push(
                                    `/dashboard/admin/clients/${client.id}#cases`
                                  )
                                }
                                className="w-full text-navy-700 hover:text-navy-800 hover:bg-navy-50"
                              >
                                View all {clientCaseList.length} cases
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-gray-500 dark:text-gray-400">
                              No cases yet. Add your first case.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6">
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">
                            Joined:
                          </span>
                          <p className="text-gray-900 dark:text-white font-medium">
                            {client.joinDate}
                          </p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">
                            Total Services:
                          </span>
                          <p className="text-gray-900 dark:text-white font-medium">
                            {client.totalCases}
                          </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">
                            Active Services:
                          </span>
                          <p className="text-gray-900 dark:text-white font-medium">
                            {client.activeCases}
                          </p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">
                            Last Contact:
                          </span>
                          <p className="text-gray-900 dark:text-white font-medium">
                            {client.lastContact}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            router.push(
                              `/dashboard/admin/clients/${client.id}`
                            );
                            logAction(
                              "View Client Details",
                              `Client: ${client.id}`,
                              `Viewed details for client "${client.name}"`,
                              "Info"
                            );
                          }}
                          className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedClient(client);
                            handleOpenAddCase();
                          }}
                          className="border-navy-300 text-navy-700 hover:bg-navy-50 dark:border-navy-600 dark:text-navy-300 dark:hover:bg-navy-800"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Service
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="cases" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  All Services ({sortedCases.length})
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Manage all client services
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={printCaseReports}
                  variant="outline"
                  className="bg-white hover:bg-gray-50 border-navy-200"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Printable Reports
                </Button>
                <Button
                  onClick={handleOpenAddCase}
                  className="bg-gradient-to-r from-navy-700 to-navy-900 hover:from-navy-600 hover:to-navy-800"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Service
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-gray-200/50 dark:border-gray-700/50 focus:bg-white dark:focus:bg-gray-800 transition-all duration-300"
                />
              </div>
              <AdvancedFilters
                onFiltersChange={handleFilterChange}
                activeFilters={filters}
              />
            </div>

            <div className="space-y-4">
              {sortedCases
                .filter(
                  (caseItem) =>
                    caseItem.title
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()) ||
                    caseItem.description
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()) ||
                    caseItem.clientName
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase())
                )
                .map((caseItem) => {
                  const client = clients.find(
                    (c) => c.id === caseItem.clientId
                  );
                  return (
                    <Card
                      key={caseItem.id}
                      className="hover:shadow-lg transition-shadow"
                    >
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                {getCaseStatusIcon(caseItem.status)}
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                                  {caseItem.title}
                                </h3>
                              </div>
                              <p className="text-gray-600 dark:text-gray-400">
                                {caseItem.description}
                              </p>
                              <div className="flex items-center gap-2 text-sm">
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
                                <span className="text-gray-500">•</span>
                                <span className="text-gray-600 dark:text-gray-400">
                                  {caseItem.serviceType} • {caseItem.caseType}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                <Users className="h-3 w-3" />
                                Client: {client?.name || caseItem.clientName}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditCase(caseItem)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleDeleteCase(
                                    caseItem.id!,
                                    caseItem.clientId,
                                    caseItem.title
                                  )
                                }
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {caseItem.processSteps &&
                            caseItem.processSteps.length > 0 && (
                              <>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-gray-500" />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                      Progress:{" "}
                                      {caseItem.progressPercentage || 0}%
                                    </span>
                                  </div>
                                  <span className="text-sm text-gray-500">
                                    Current:{" "}
                                    {(caseItem.currentStep !== undefined &&
                                      caseItem.processSteps[
                                        caseItem.currentStep
                                      ]?.name) ||
                                      "Not started"}
                                  </span>
                                </div>
                                <Progress
                                  value={caseItem.progressPercentage || 0}
                                  className="h-2"
                                />

                                <CaseProcessView caseItem={caseItem} />
                              </>
                            )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </TabsContent>
        </Tabs>

        {isLoading && (
          <div className="text-center py-16">
            <div className="w-12 h-12 border-4 border-navy-700 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading data...</p>
          </div>
        )}

        {!isLoading &&
          activeTab === "clients" &&
          filteredClients.length === 0 && (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Users className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                {showArchived ? "No archived clients" : "No clients found"}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-6">
                {searchQuery
                  ? "Try adjusting your search terms"
                  : showArchived
                  ? "Archived clients will appear here"
                  : "Start by adding your first client"}
              </p>
              <Button
                onClick={() => {
                  setIsAddClientModalOpen(true);
                  setAddClientMode("existing");
                }}
                className="bg-navy-700 hover:bg-navy-800"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Client from Users
              </Button>
            </div>
          )}

        {!isLoading && activeTab === "cases" && sortedCases.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Briefcase className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              No cases found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-6">
              Start by adding a case for your clients
            </p>
            <Button
              onClick={handleOpenAddCase}
              className="bg-navy-700 hover:bg-navy-800"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Service
            </Button>
          </div>
        )}
      </div>

      <Dialog
        open={isDeleteClientModalOpen}
        onOpenChange={setIsDeleteClientModalOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Delete Client
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              client and all associated cases.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-bold text-red-800 dark:text-red-300">
                    Warning
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                    You are about to delete{" "}
                    <span className="font-bold">{clientToDelete?.name}</span>{" "}
                    and all associated services (
                    {clientToDelete ? clientCases(clientToDelete.id).length : 0}{" "}
                    services).
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  Client Name:
                </span>
                <span className="font-medium">{clientToDelete?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Email:</span>
                <span className="font-medium">{clientToDelete?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  Associated Cases:
                </span>
                <span className="font-medium">
                  {clientToDelete ? clientCases(clientToDelete.id).length : 0}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteClientModalOpen(false);
                setClientToDelete(null);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteClient}
              className="flex-1"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDeleteCaseModalOpen}
        onOpenChange={setIsDeleteCaseModalOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Delete Case
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              case.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-bold text-red-800 dark:text-red-300">
                    Warning
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                    You are about to delete the case titled{" "}
                    <span className="font-bold">
                      "{caseToDelete?.caseTitle}"
                    </span>
                    .
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteCaseModalOpen(false);
                setCaseToDelete(null);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteCase}
              className="flex-1"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Case
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isAddClientModalOpen}
        onOpenChange={(open) => {
          setIsAddClientModalOpen(open);
          if (!open) {
            setNewClient({
              name: "",
              phone: "+63",
              address: "",
              email: "",
              userId: "",
              source: "",
              otherInfo: "",
              status: "Active",
              priority: "Medium",
            });
            setSearchExistingUser("");
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-navy-900 dark:text-white">
              Add New Client
            </DialogTitle>
            <DialogDescription>
              Select from existing registered users or add a new client
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="flex items-center justify-center gap-6 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center gap-3">
                <Button
                  variant={addClientMode === "existing" ? "default" : "outline"}
                  onClick={() => setAddClientMode("existing")}
                  className={
                    addClientMode === "existing"
                      ? "bg-blue-600 hover:bg-blue-700"
                      : ""
                  }
                >
                  <UserCheck className="h-5 w-5 mr-2" />
                  From Existing User
                </Button>
                <Button
                  variant={addClientMode === "new" ? "default" : "outline"}
                  onClick={() => setAddClientMode("new")}
                  className={
                    addClientMode === "new"
                      ? "bg-green-600 hover:bg-green-700"
                      : ""
                  }
                >
                  <UserPlus className="h-5 w-5 mr-2" />
                  New Client
                </Button>
              </div>
            </div>

            {addClientMode === "existing" ? (
              <>
                <div>
                  <Label className="text-sm font-medium">
                    Search Registered Users{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search users by name, email, or phone..."
                      value={searchExistingUser}
                      onChange={(e) => handleSearchExistingUser(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchExistingUser("");
                        handleSearchExistingUser("");
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Showing {filteredExistingUsers.length} users who are not
                    already clients
                    {searchExistingUser && ` matching "${searchExistingUser}"`}
                  </p>
                </div>

                {filteredExistingUsers.length > 0 ? (
                  <div className="border rounded-lg max-h-60 overflow-y-auto">
                    {filteredExistingUsers.map((user) => (
                      <div
                        key={user.id}
                        className="p-3 border-b hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors last:border-b-0"
                        onClick={() => handleSelectUserForClient(user)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">
                              {user.fullName || "Unnamed User"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                              {user.phone && ` • ${user.phone}`}
                            </div>
                            {/* Add address display */}
                            {user.address && (
                              <div className="text-xs text-gray-500 mt-1">
                                <MapPin className="inline h-3 w-3 mr-1" />
                                {user.address}
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              {getUserRoleBadge(user.role)}
                              {user.accountStatus === "active" ? (
                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  Active
                                </Badge>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                                  Inactive
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectUserForClient(user);
                            }}
                          >
                            Select
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : searchExistingUser ? (
                  <div className="text-center py-8 border rounded-lg">
                    <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">
                      No users found matching "{searchExistingUser}".
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Try a different search term or add as a new client.
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8 border rounded-lg">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">
                      No registered users available for conversion.
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      All registered users are already clients or are
                      admins/attorneys.
                    </p>
                  </div>
                )}

                {newClient.userId && (
                  <>
                    <Separator />
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-green-800 dark:text-green-300">
                            Selected User
                          </h4>
                          <div className="mt-2 space-y-2">
                            <div>
                              <span className="font-medium">Name:</span>{" "}
                              {newClient.name}
                            </div>
                            <div>
                              <span className="font-medium">Email:</span>{" "}
                              {newClient.email}
                            </div>
                            <div>
                              <span className="font-medium">Phone:</span>{" "}
                              {newClient.phone}
                            </div>
                            {/* Add address display */}
                            <div>
                              <span className="font-medium">Address:</span>{" "}
                              {newClient.address}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setNewClient({
                              name: "",
                              phone: "+63",
                              address: "",
                              email: "",
                              userId: "",
                              source: "",
                              otherInfo: "",
                              status: "Active",
                              priority: "Medium",
                            });
                            setSearchExistingUser("");
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          Clear
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">
                        Additional Client Information
                      </Label>
                      <p className="text-xs text-gray-500 mb-3">
                        Review and edit client details before adding
                      </p>

                      <div className="space-y-4">
                        <div>
                          <Label
                            htmlFor="address"
                            className="text-sm font-medium"
                          >
                            Address <span className="text-red-500">*</span>
                          </Label>
                          <Textarea
                            id="address"
                            placeholder="Enter client address"
                            value={newClient.address}
                            onChange={(e) =>
                              setNewClient({
                                ...newClient,
                                address: e.target.value,
                              })
                            }
                            className="mt-1"
                            rows={2}
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label
                              htmlFor="status"
                              className="text-sm font-medium"
                            >
                              Status
                            </Label>
                            <Select
                              value={newClient.status}
                              onValueChange={(value) =>
                                setNewClient({ ...newClient, status: value })
                              }
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Active">Active</SelectItem>
                                <SelectItem value="Inactive">
                                  Inactive
                                </SelectItem>
                                <SelectItem value="Suspended">
                                  Suspended
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label
                              htmlFor="priority"
                              className="text-sm font-medium"
                            >
                              Priority
                            </Label>
                            <Select
                              value={newClient.priority}
                              onValueChange={(value) =>
                                setNewClient({ ...newClient, priority: value })
                              }
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="High">High</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="Low">Low</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter client name"
                    value={newClient.name}
                    onChange={(e) =>
                      setNewClient({ ...newClient, name: e.target.value })
                    }
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-sm font-medium">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+63 1234567890"
                    value={newClient.phone}
                    onChange={handlePhoneChange}
                    maxLength={13}
                    className="mt-1"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Format: +63 followed by 10 digits
                  </p>
                </div>

                <div>
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="client@example.com"
                    value={newClient.email}
                    onChange={(e) =>
                      setNewClient({ ...newClient, email: e.target.value })
                    }
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="address" className="text-sm font-medium">
                    Address <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="address"
                    placeholder="Enter complete address"
                    value={newClient.address}
                    onChange={(e) =>
                      setNewClient({ ...newClient, address: e.target.value })
                    }
                    className="mt-1"
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium">Source</Label>
                  <Select
                    value={newClient.source}
                    onValueChange={(value) =>
                      setNewClient({ ...newClient, source: value })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Unknown">Unknown</SelectItem>
                      <SelectItem value="Referral">Referral</SelectItem>
                      <SelectItem value="Walk-in">Walk-in</SelectItem>
                      <SelectItem value="Facebook">Facebook</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Other Information</Label>
                  <Textarea
                    placeholder="Additional notes or source details"
                    value={newClient.otherInfo}
                    onChange={(e) =>
                      setNewClient({ ...newClient, otherInfo: e.target.value })
                    }
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="status" className="text-sm font-medium">
                      Status
                    </Label>
                    <Select
                      value={newClient.status}
                      onValueChange={(value) =>
                        setNewClient({ ...newClient, status: value })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                        <SelectItem value="Suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="priority" className="text-sm font-medium">
                      Priority
                    </Label>
                    <Select
                      value={newClient.priority}
                      onValueChange={(value) =>
                        setNewClient({ ...newClient, priority: value })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => {
                  setIsAddClientModalOpen(false);
                  setNewClient({
                    name: "",
                    phone: "+63",
                    address: "",
                    email: "",
                    userId: "",
                    source: "Unknown",
                    otherInfo: "",
                    status: "Active",
                    priority: "Medium",
                  });
                  setSearchExistingUser("");
                  setAddClientMode("existing");
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddClient}
                className="flex-1 bg-navy-700 hover:bg-navy-800"
                disabled={addClientMode === "existing" && !newClient.userId}
              >
                {addClientMode === "existing"
                  ? "Add as Client"
                  : "Add New Client"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddCaseModalOpen} onOpenChange={setIsAddCaseModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-navy-900 dark:text-white">
              Add New Service
            </DialogTitle>
            <DialogDescription>
              Select a client and enter service details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div>
              <Label className="text-sm font-medium">
                Select Client <span className="text-red-500">*</span>
              </Label>
              <div className="space-y-2">
                <Input
                  placeholder="Search for existing client by name or email..."
                  value={searchExistingClient}
                  onChange={(e) => handleSearchExistingClient(e.target.value)}
                  className="mt-1"
                />

                {!newCase.clientId && filteredExistingClients.length > 0 && (
                  <div className="max-h-40 overflow-y-auto border rounded-lg p-2">
                    {filteredExistingClients.map((client) => (
                      <div
                        key={client.id}
                        className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
                        onClick={() => handleSelectClientForCase(client)}
                      >
                        <div className="font-medium text-sm">{client.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {client.email} • {client.phone}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {newCase.clientId && selectedClient && (
                  <div className="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="font-medium text-sm text-green-800 dark:text-green-300">
                      Selected: {selectedClient.name}
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400">
                      {selectedClient.email} • {selectedClient.phone}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {!newCase.clientId && (
              <div className="text-center py-1">
                <Button
                  variant="link"
                  onClick={() => {
                    setIsAddCaseModalOpen(false);
                    setIsAddClientModalOpen(true);
                  }}
                  className="text-sm"
                >
                  Or add a new client first
                </Button>
              </div>
            )}

            {newCase.clientId && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="caseType" className="text-sm font-medium">
                      Case Type <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={newCase.caseType}
                      onValueChange={(value) =>
                        setNewCase({ ...newCase, caseType: value })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select case type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="legal-consultation">Legal Consultation & Documentation</SelectItem>
                        <SelectItem value="civil">Civil Cases</SelectItem>
                        <SelectItem value="criminal">Criminal Cases</SelectItem>
                        <SelectItem value="special">Special Proceedings</SelectItem>
                        <SelectItem value="administrative">Administrative & Quasi-Judicial</SelectItem>
                        <SelectItem value="pleadings">Pleadings & Motions Preparation</SelectItem>
                        <SelectItem value="appearance">Court Appearance & Representation</SelectItem>
                        <SelectItem value="retainer">Retainers</SelectItem>
                        <SelectItem value="other">Other Legal Cases</SelectItem>
                        <SelectItem value="accounting">Accounting Services</SelectItem>
                        <SelectItem value="corporate">Corporate & Licensing</SelectItem>
                        <SelectItem value="audit">Audit Services</SelectItem>
                        <SelectItem value="accounting-tax">Accounting & Tax Consultancy</SelectItem>
                        <SelectItem value="tax">Tax Services</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label
                      htmlFor="serviceType"
                      className="text-sm font-medium"
                    >
                      Service Type <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={newCase.serviceType}
                      onValueChange={(value) =>
                        setNewCase({ ...newCase, serviceType: value })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select service type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="one-time">One-Time Service</SelectItem>
                        <SelectItem value="case-based">Case-Based</SelectItem>
                        <SelectItem value="project-based">Project-Based</SelectItem>
                        <SelectItem value="retainer">Retainer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="specificService" className="text-sm font-medium">
                    Specific Service <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="specificService"
                    placeholder="Enter specific service details"
                    value={newCase.specificService || ""}
                    onChange={(e) =>
                      setNewCase({ ...newCase, specificService: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-sm font-medium">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Enter service description"
                    value={newCase.description || ""}
                    onChange={(e) =>
                      setNewCase({ ...newCase, description: e.target.value })
                    }
                    className="mt-1"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label htmlFor="priority" className="text-sm font-medium">
                      Priority
                    </Label>
                    <Select
                      value={newCase.priority}
                      onValueChange={(value: Case["priority"]) =>
                        setNewCase({ ...newCase, priority: value })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {newCase.serviceType && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <h4 className="font-bold text-sm text-blue-800 dark:text-blue-300">
                        Case Process Preview
                      </h4>
                    </div>
                    <p className="text-xs text-blue-700 dark:text-blue-400 mb-2">
                      Based on your selection, this case will follow the{" "}
                      <span className="font-medium">
                        {
                          CASE_PROCESSES[
                            getProcessForServiceType(
                              newCase.serviceType,
                              newCase.caseType
                            )
                          ]?.name
                        }
                      </span>{" "}
                      workflow.
                    </p>
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">
                        Process Steps:
                      </p>
                      <div className="space-y-0.5">
                        {CASE_PROCESSES[
                          getProcessForServiceType(
                            newCase.serviceType,
                            newCase.caseType
                          )
                        ]?.steps.map((step, index) => (
                          <div
                            key={step.id}
                            className="text-xs text-blue-700 dark:text-blue-400 flex items-start gap-2"
                          >
                            <span className="font-semibold min-w-4">
                              {index + 1}.
                            </span>
                            <span>{step.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      The process will be automatically initialized when the
                      case is created.
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => {
                      setIsAddCaseModalOpen(false);
                      setSelectedClient(null);
                      setNewCase({
                        clientId: "",
                        clientName: "",
                        title: "",
                        description: "",
                        caseType: "",
                        serviceType: "",
                        specificService: "",
                        status: "active",
                        priority: "medium",
                        assignedDate: new Date().toISOString().split("T")[0],
                        openedDate: new Date().toISOString().split("T")[0],
                        notes: "",
                        processType: "",
                      });
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddCase}
                    className="flex-1 bg-navy-700 hover:bg-navy-800"
                  >
                    Add Case
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditCaseModalOpen} onOpenChange={setIsEditCaseModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-navy-900 dark:text-white">
              Edit Service
            </DialogTitle>
            <DialogDescription>Update service details</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="editTitle" className="text-sm font-medium">
                Case Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="editTitle"
                value={editCase.title || ""}
                onChange={(e) =>
                  setEditCase({ ...editCase, title: e.target.value })
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="editDescription" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="editDescription"
                value={editCase.description || ""}
                onChange={(e) =>
                  setEditCase({ ...editCase, description: e.target.value })
                }
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editCaseType" className="text-sm font-medium">
                  Case Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={editCase.caseType}
                  onValueChange={(value) =>
                    setEditCase({ ...editCase, caseType: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select case type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="legal-consultation">Legal Consultation & Documentation</SelectItem>
                    <SelectItem value="civil">Civil Cases</SelectItem>
                    <SelectItem value="criminal">Criminal Cases</SelectItem>
                    <SelectItem value="special">Special Proceedings</SelectItem>
                    <SelectItem value="administrative">Administrative & Quasi-Judicial</SelectItem>
                    <SelectItem value="pleadings">Pleadings & Motions Preparation</SelectItem>
                    <SelectItem value="appearance">Court Appearance & Representation</SelectItem>
                    <SelectItem value="retainer">Retainers</SelectItem>
                    <SelectItem value="other">Other Legal Cases</SelectItem>
                    <SelectItem value="accounting">Accounting Services</SelectItem>
                    <SelectItem value="corporate">Corporate & Licensing</SelectItem>
                    <SelectItem value="audit">Audit Services</SelectItem>
                    <SelectItem value="accounting-tax">Accounting & Tax Consultancy</SelectItem>
                    <SelectItem value="tax">Tax Services</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label
                  htmlFor="editServiceType"
                  className="text-sm font-medium"
                >
                  Service Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={editCase.serviceType}
                  onValueChange={(value) =>
                    setEditCase({ ...editCase, serviceType: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one-time">One-Time Service</SelectItem>
                    <SelectItem value="case-based">Case-Based</SelectItem>
                    <SelectItem value="project-based">Project-Based</SelectItem>
                    <SelectItem value="retainer">Retainer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="editSpecificService" className="text-sm font-medium">
                Specific Service
              </Label>
              <Input
                id="editSpecificService"
                placeholder="Enter specific service details"
                value={editCase.specificService || ""}
                onChange={(e) =>
                  setEditCase({ ...editCase, specificService: e.target.value })
                }
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editStatus" className="text-sm font-medium">
                  Status
                </Label>
                <Select
                  value={editCase.status}
                  onValueChange={(value: Case["status"]) =>
                    setEditCase({ ...editCase, status: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="editPriority" className="text-sm font-medium">
                  Priority
                </Label>
                <Select
                  value={editCase.priority}
                  onValueChange={(value: Case["priority"]) =>
                    setEditCase({ ...editCase, priority: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="editNotes" className="text-sm font-medium">
                Additional Notes
              </Label>
              <Textarea
                id="editNotes"
                value={editCase.notes || ""}
                onChange={(e) =>
                  setEditCase({ ...editCase, notes: e.target.value })
                }
                className="mt-1"
                rows={2}
              />
            </div>

            {editCase.processSteps && editCase.processSteps.length > 0 && (
              <div className="border rounded-lg p-4">
                <h4 className="font-bold text-gray-900 dark:text-white mb-3">
                  Process Steps (
                  {
                    editCase.processSteps.filter(
                      (s) => s.status === "completed"
                    ).length
                  }
                  /{editCase.processSteps.length} completed)
                </h4>
                <div className="space-y-2">
                  {editCase.processSteps.map((step) => (
                    <div key={step.id} className="flex items-center gap-3">
                      {getProcessStepStatusIcon(step.status)}
                      <span className="text-sm">{step.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => {
                  setIsEditCaseModalOpen(false);
                  setSelectedCase(null);
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateCase}
                className="flex-1 bg-navy-700 hover:bg-navy-800"
              >
                Update Case
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminDashboardLayout>
  );
}