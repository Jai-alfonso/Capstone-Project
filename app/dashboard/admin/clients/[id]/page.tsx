"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/firebase/config";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AdminDashboardLayout } from "@/components/admin-dashboard-layout";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Save,
  Shield,
  Lock,
  Globe,
  Building,
  Home,
  Navigation,
  Edit,
  Briefcase,
  TrendingUp,
  ChevronDown,
  Plus,
  Eye,
  Trash2,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  uid: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phone?: string;
  role?: string;
  accountStatus?: string;
  emailVerified?: boolean;
  address?: string;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  createdAt?: any;
  updatedAt?: any;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  source?: string;
  otherInfo?: string;
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

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCases, setIsLoadingCases] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);
  const [isDeleteCaseModalOpen, setIsDeleteCaseModalOpen] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<{
    caseId: string;
    clientId: string;
    caseTitle: string;
  } | null>(null);

  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    source: "",
    otherInfo: "",
    status: "active",
    priority: "normal",
  });

  useEffect(() => {
    loadClientDetails();
  }, [params.id]);

  useEffect(() => {
    if (client) {
      loadCases();
    }
  }, [client]);

  const loadClientDetails = async () => {
    try {
      setIsLoading(true);

      if (db) {
        
        const clientRef = doc(db, "clients", params.id as string);
        const clientSnap = await getDoc(clientRef);

        if (clientSnap.exists()) {
          const clientData = {
            id: clientSnap.id,
            ...clientSnap.data(),
          } as Client;

          setClient(clientData);

          
          if (clientData.userId) {
            await loadUserProfile(clientData.userId);
          } else {
            
            await findUserProfileByEmail(clientData.email);
          }

          
          const address = clientData.address || "";
          const addressParts = parseAddress(address);

          setEditForm({
            name: clientData.name,
            email: clientData.email,
            phone: clientData.phone,
            address: clientData.address,
            source: (clientData as any).source || "",
            otherInfo: (clientData as any).otherInfo || "",
            street: addressParts.street,
            city: addressParts.city,
            state: addressParts.state,
            zipCode: addressParts.zipCode,
            country: addressParts.country,
            status: clientData.status || "active",
            priority: clientData.priority || "normal",
          });
        }
      }
    } catch (error) {
      console.error("Error loading client:", error);
      toast.error("Failed to load client information");
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      if (!db) return;

      
      const userProfileRef = doc(db, "userProfiles", userId);
      const userProfileSnap = await getDoc(userProfileRef);

      if (userProfileSnap.exists()) {
        const profileData = {
          id: userProfileSnap.id,
          ...userProfileSnap.data(),
        } as UserProfile;

        setUserProfile(profileData);

        
        if (profileData.address) {
          const addressParts = parseAddress(profileData.address);
          setEditForm((prev) => ({
            ...prev,
            address: profileData.address || prev.address,
            street: addressParts.street || prev.street,
            city: addressParts.city || prev.city,
            state: addressParts.state || prev.state,
            zipCode: addressParts.zipCode || prev.zipCode,
            country: addressParts.country || prev.country,
            phone: profileData.phone || prev.phone,
            source: (profileData as any).source || prev.source,
            otherInfo: (profileData as any).otherInfo || prev.otherInfo,
          }));
        }
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    }
  };

  const findUserProfileByEmail = async (email: string) => {
    try {
      if (!db || !email) return;

      const userProfilesRef = collection(db, "userProfiles");
      const q = query(userProfilesRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const profileData = {
          id: doc.id,
          ...doc.data(),
        } as UserProfile;

        setUserProfile(profileData);

        
        if (profileData.address) {
          const addressParts = parseAddress(profileData.address);
          setEditForm((prev) => ({
            ...prev,
            address: profileData.address || prev.address,
            street: addressParts.street || prev.street,
            city: addressParts.city || prev.city,
            state: addressParts.state || prev.state,
            zipCode: addressParts.zipCode || prev.zipCode,
            country: addressParts.country || prev.country,
            phone: profileData.phone || prev.phone,
            source: (profileData as any).source || prev.source,
            otherInfo: (profileData as any).otherInfo || prev.otherInfo,
          }));
        }
      }
    } catch (error) {
      console.error("Error finding user profile by email:", error);
    }
  };

  const parseAddress = (address: string) => {
    if (!address)
      return { street: "", city: "", state: "", zipCode: "", country: "" };

    
    const parts = address.split(",");
    const result = {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "Philippines", 
    };

    if (parts.length >= 1) result.street = parts[0].trim();
    if (parts.length >= 2) result.city = parts[1].trim();
    if (parts.length >= 3) result.state = parts[2].trim();
    if (parts.length >= 4) result.zipCode = parts[3].trim();
    if (parts.length >= 5) result.country = parts[4].trim();

    return result;
  };

  const formatAddress = () => {
    const parts = [];
    if (editForm.street) parts.push(editForm.street);
    if (editForm.city) parts.push(editForm.city);
    if (editForm.state) parts.push(editForm.state);
    if (editForm.zipCode) parts.push(editForm.zipCode);
    if (editForm.country) parts.push(editForm.country);

    return parts.join(", ");
  };

  const loadCases = async () => {
    try {
      setIsLoadingCases(true);

      if (!db || !client) return;

      const casesRef = collection(db, "cases");
      const q = query(casesRef, where("clientId", "==", client.id));
      const querySnapshot = await getDocs(q);
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

      // Also try searching by clientName as backup
      if (client.name) {
        const nameQuery = query(casesRef, where("clientName", "==", client.name));
        const nameSnapshot = await getDocs(nameQuery);

        nameSnapshot.forEach((doc) => {
          if (!casesData.find((c) => c.id === doc.id)) {
            const data = doc.data() as Omit<Case, "id">;

          let progressPercentage = 0;
          let currentStep = 0;

          if (data.processSteps && data.processSteps.length > 0) {
            const completedSteps = data.processSteps.filter(
              (step) => step.status === "completed"
            ).length;
            const totalSteps = data.processSteps.length;
            progressPercentage = Math.round(
              (completedSteps / totalSteps) * 100
            );

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
        }
        });
      }

      setCases(casesData);
    } catch (error) {
      console.error("Error loading cases:", error);
      toast.error("Failed to load client cases");
    } finally {
      setIsLoadingCases(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.startsWith("+63")) {
      const numbers = value.slice(3).replace(/\D/g, "");
      if (numbers.length <= 10) {
        setEditForm({ ...editForm, phone: "+63" + numbers });
      }
    } else if (value === "" || value === "+") {
      setEditForm({ ...editForm, phone: "+63" });
    }
  };

  const handleSave = async () => {
    if (
      !editForm.name ||
      !editForm.email ||
      editForm.phone === "+63" ||
      !editForm.street ||
      !editForm.city
    ) {
      toast.error(
        "Please fill in all required fields (Name, Email, Phone, Street, City)"
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editForm.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (editForm.phone.length !== 13) {
      toast.error(
        "Please enter a valid phone number (+63 followed by 10 digits)"
      );
      return;
    }

    try {
      setIsSaving(true);

      if (db && client) {
        
        const fullAddress = formatAddress();

        
        const clientRef = doc(db, "clients", client.id);
        await updateDoc(clientRef, {
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          address: fullAddress,
          source: editForm.source || null,
          otherInfo: editForm.otherInfo || null,
          status: editForm.status,
          priority: editForm.priority,
          updatedAt: Timestamp.now(),
        });

        
        if (userProfile) {
          const userProfileRef = doc(db, "userProfiles", userProfile.id);
          await updateDoc(userProfileRef, {
            fullName: editForm.name,
            email: editForm.email,
            phone: editForm.phone,
            address: fullAddress,
            updatedAt: Timestamp.now(),
          });
        }

        
        const casesRef = collection(db, "cases");
        const q = query(casesRef, where("clientId", "==", client.id));
        const querySnapshot = await getDocs(q);

        const updatePromises = querySnapshot.docs.map(async (caseDoc) => {
          const caseRef = doc(db, "cases", caseDoc.id);
          await updateDoc(caseRef, {
            clientName: editForm.name,
            updatedAt: Timestamp.now(),
          });
        });

        await Promise.all(updatePromises);

        toast.success("Client information updated successfully!");
        setIsEditing(false);
        loadClientDetails();
      }
    } catch (error: any) {
      console.error("Error updating client:", error);
      toast.error("Failed to update client information. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCase = (
    caseId: string,
    clientId: string,
    caseTitle: string
  ) => {
    setCaseToDelete({ caseId, clientId, caseTitle });
    setIsDeleteCaseModalOpen(true);
  };

  const handleConfirmDeleteCase = async () => {
    if (!caseToDelete || !db) return;

    try {
      const caseRef = doc(db, "cases", caseToDelete.caseId);
      await deleteDoc(caseRef);

      
      const clientRef = doc(db, "clients", caseToDelete.clientId);
      const clientSnap = await getDoc(clientRef);

      if (clientSnap.exists()) {
        const clientData = clientSnap.data() as Client;
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

      toast.success("Case deleted successfully!");
      setIsDeleteCaseModalOpen(false);
      setCaseToDelete(null);
      loadCases();
      loadClientDetails();
    } catch (error: any) {
      toast.error("Failed to delete case. Please try again.");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "inactive":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "closed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getPriorityColor = (priority: string) => {
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

  const getCaseStatusIcon = (status: Case["status"]) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "closed":
        return <XCircle className="h-4 w-4 text-gray-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "on_hold":
        return <Clock className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getProcessStepStatusIcon = (status: CaseProcessStep["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case "skipped":
        return <ChevronDown className="h-4 w-4 text-gray-400" />;
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

  const CaseProcessView = ({ caseItem }: { caseItem: Case }) => {
    const processSteps = caseItem.processSteps || [];
    const isExpanded = expandedCaseId === caseItem.id;
    const processType = caseItem.processType || "simple";
    const processName =
      CASE_PROCESSES[processType as keyof typeof CASE_PROCESSES]?.name ||
      "Case Process";

    return (
      <div className="mt-4" id={`case-${caseItem.id}`}>
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
              {processSteps.map((step) => (
                <div
                  key={step.id}
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
                    <div className="text-xs text-gray-500">
                      Step {step.order} of {processSteps.length}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <AdminDashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-navy-700 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              Loading client details...
            </p>
          </div>
        </div>
      </AdminDashboardLayout>
    );
  }

  // Show loading state while data is being fetched
  if (isLoading) {
    return (
      <AdminDashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-navy-700 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading client information...</p>
          </div>
        </div>
      </AdminDashboardLayout>
    );
  }

  if (!client) {
    return (
      <AdminDashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Client not found
            </p>
            <Button onClick={() => router.push("/dashboard/admin/clients")}>
              Back to Clients
            </Button>
          </div>
        </div>
      </AdminDashboardLayout>
    );
  }

  const isActive =
    client.activeCases > 0 || client.status?.toLowerCase() === "active";

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/admin/clients")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold font-playfair text-navy-900 dark:text-white">
              Client Details
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Comprehensive information about the client and their legal matters
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
              {isEditing ? (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Edit
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Client
                </>
              )}
            </Button>
            {isEditing && (
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-navy-700 hover:bg-navy-800"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Client Information - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client Overview Card */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-navy-700 to-navy-900 flex items-center justify-center text-white text-2xl font-bold">
                      {client?.name ? client.name.charAt(0).toUpperCase() : "?"}
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-serif text-navy-900 dark:text-white">
                        {isEditing ? (
                          <Input
                            value={editForm.name}
                            onChange={(e) =>
                              setEditForm({ ...editForm, name: e.target.value })
                            }
                            placeholder="Client Name"
                            className="text-2xl font-bold"
                          />
                        ) : (
                          client.name
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Client ID: {client.id}
                        {userProfile && (
                          <span className="ml-2 text-blue-600 dark:text-blue-400">
                            • Linked User Account
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {isEditing ? (
                      <div className="flex flex-col gap-2">
                        <Select
                          value={editForm.status}
                          onValueChange={(value) =>
                            setEditForm({ ...editForm, status: value })
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select
                          value={editForm.priority}
                          onValueChange={(value) =>
                            setEditForm({ ...editForm, priority: value })
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <>
                        <Badge
                          className={getStatusColor(
                            client.status || (isActive ? "active" : "inactive")
                          )}
                        >
                          {isActive ? "Active" : client.status || "Inactive"}
                        </Badge>
                        <Badge className={getPriorityColor(client.priority)}>
                          {client.priority} Priority
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-semibold text-navy-900 dark:text-white mb-4 flex items-center gap-2">
                    <User className="h-5 w-5 text-navy-700 dark:text-navy-300" />
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Email */}
                    <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <Mail className="h-5 w-5 text-navy-700 dark:text-navy-300 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                          Email Address
                        </p>
                        {isEditing ? (
                          <Input
                            value={editForm.email}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                email: e.target.value,
                              })
                            }
                            type="email"
                            placeholder="email@example.com"
                          />
                        ) : (
                          <p className="font-medium text-gray-900 dark:text-white break-all">
                            {client.email}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <Phone className="h-5 w-5 text-navy-700 dark:text-navy-300 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                          Phone Number
                        </p>
                        {isEditing ? (
                          <>
                            <Input
                              value={editForm.phone}
                              onChange={handlePhoneChange}
                              placeholder="+63 9XX XXX XXXX"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Format: +63 followed by 10 digits
                            </p>
                          </>
                        ) : (
                          <p className="font-medium text-gray-900 dark:text-white">
                            {client.phone}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Address */}
                    {isEditing ? (
                      <>
                        <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                          <Home className="h-5 w-5 text-navy-700 dark:text-navy-300 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                              Street Address *
                            </p>
                            <Input
                              value={editForm.street}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  street: e.target.value,
                                })
                              }
                              placeholder="Street address"
                              required
                            />
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                          <Building className="h-5 w-5 text-navy-700 dark:text-navy-300 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                              City *
                            </p>
                            <Input
                              value={editForm.city}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  city: e.target.value,
                                })
                              }
                              placeholder="City"
                              required
                            />
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                          <Navigation className="h-5 w-5 text-navy-700 dark:text-navy-300 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                              State/Province
                            </p>
                            <Input
                              value={editForm.state}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  state: e.target.value,
                                })
                              }
                              placeholder="State/Province"
                            />
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                          <MapPin className="h-5 w-5 text-navy-700 dark:text-navy-300 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                              Zip/Postal Code
                            </p>
                            <Input
                              value={editForm.zipCode}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  zipCode: e.target.value,
                                })
                              }
                              placeholder="Zip/Postal Code"
                            />
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 md:col-span-2">
                          <Globe className="h-5 w-5 text-navy-700 dark:text-navy-300 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                              Country
                            </p>
                            <Input
                              value={editForm.country}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  country: e.target.value,
                                })
                              }
                              placeholder="Country"
                            />
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 md:col-span-2">
                          <TrendingUp className="h-5 w-5 text-navy-700 dark:text-navy-300 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Source</p>
                            <Select
                              value={editForm.source}
                              onValueChange={(value) =>
                                setEditForm({ ...editForm, source: value })
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unknown">Unknown</SelectItem>
                                <SelectItem value="Referral">Referral</SelectItem>
                                <SelectItem value="Walk-in">Walk-in</SelectItem>
                                <SelectItem value="Facebook">Facebook</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 md:col-span-2">
                          <FileText className="h-5 w-5 text-navy-700 dark:text-navy-300 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Other Information</p>
                            <Textarea
                              value={editForm.otherInfo}
                              onChange={(e) =>
                                setEditForm({ ...editForm, otherInfo: e.target.value })
                              }
                              placeholder="Additional notes or source details"
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 md:col-span-2">
                        <MapPin className="h-5 w-5 text-navy-700 dark:text-navy-300 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                            Address
                          </p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {client.address}
                          </p>
                        </div>
                      </div>
                    )}
                    {/* Source & Other Info (view mode) */}
                    {!isEditing && (
                      <>
                        <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                          <TrendingUp className="h-5 w-5 text-navy-700 dark:text-navy-300 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Source</p>
                            <p className="font-medium text-gray-900 dark:text-white">{(client as any).source || "-"}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 md:col-span-2">
                          <FileText className="h-5 w-5 text-navy-700 dark:text-navy-300 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Other Information</p>
                            <p className="font-medium text-gray-900 dark:text-white">{(client as any).otherInfo || "-"}</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <Separator />

                {/* User Account Information */}
                {userProfile && (
                  <>
                    <div>
                      <h3 className="text-lg font-semibold text-navy-900 dark:text-white mb-4 flex items-center gap-2">
                        <Shield className="h-5 w-5 text-navy-700 dark:text-navy-300" />
                        User Account Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <User className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">
                              User ID
                            </p>
                            <p className="font-medium text-blue-900 dark:text-blue-100">
                              {userProfile.uid}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">
                              Account Status
                            </p>
                            <Badge
                              className={getStatusColor(
                                userProfile.accountStatus || "active"
                              )}
                            >
                              {userProfile.accountStatus || "Active"}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">
                              User Role
                            </p>
                            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                              {userProfile.role || "client"}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">
                              Email Verified
                            </p>
                            <Badge
                              className={
                                userProfile.emailVerified
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }
                            >
                              {userProfile.emailVerified
                                ? "Verified"
                                : "Not Verified"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Client Activity Summary */}
                <div>
                  <h3 className="text-lg font-semibold text-navy-900 dark:text-white mb-4 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-navy-700 dark:text-navy-300" />
                    Client Activity Summary
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">
                        Join Date
                      </p>
                      <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                        {client.joinDate}
                      </p>
                    </div>

                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-2 border-purple-200 dark:border-purple-800">
                      <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">
                        Total Cases
                      </p>
                      <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                        {client.totalCases}
                      </p>
                    </div>

                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-200 dark:border-green-800">
                      <p className="text-sm text-green-600 dark:text-green-400 mb-1">
                        Active Cases
                      </p>
                      <p className="text-lg font-bold text-green-900 dark:text-green-100">
                        {client.activeCases}
                      </p>
                    </div>

                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border-2 border-orange-200 dark:border-orange-800">
                      <p className="text-sm text-orange-600 dark:text-orange-400 mb-1">
                        Last Contact
                      </p>
                      <p className="text-lg font-bold text-orange-900 dark:text-orange-100">
                        {client.lastContact}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cases & Legal Services */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-navy-700 dark:text-navy-300" />
                  Cases & Legal Services ({cases.length})
                </CardTitle>
                <CardDescription>
                  All legal services and cases associated with this client
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingCases ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-navy-700 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Loading cases...
                      </p>
                    </div>
                  </div>
                ) : cases.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>No cases or legal services found for this client</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() =>
                        router.push(
                          `/dashboard/admin/clients/${client.id}/edit`
                        )
                      }
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Case
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cases.map((caseItem) => (
                      <div
                        key={caseItem.id}
                        className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-navy-300 dark:hover:border-navy-600 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {getCaseStatusIcon(caseItem.status)}
                              <h4 className="font-semibold text-gray-900 dark:text-white">
                                {caseItem.title}
                              </h4>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {caseItem.caseType} • {caseItem.serviceType}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {caseItem.description}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 items-end">
                            <div className="flex gap-2">
                              <Badge
                                className={getStatusColor(caseItem.status)}
                              >
                                {caseItem.status}
                              </Badge>
                              <Badge
                                className={getPriorityColor(caseItem.priority)}
                              >
                                {caseItem.priority}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="mb-3">
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

                        {caseItem.processSteps &&
                          caseItem.processSteps.length > 0 && (
                            <CaseProcessView caseItem={caseItem} />
                          )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Right Column */}
          <div className="space-y-6">
            {/* Client Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle>Client Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Total Cases
                    </p>
                    <p className="text-2xl font-bold text-navy-700 dark:text-navy-300">
                      {client.totalCases}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Active Cases
                    </p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {client.activeCases}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Joined
                    </p>
                    <p className="text-sm font-medium">{client.joinDate}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Last Contact
                    </p>
                    <p className="text-sm font-medium">{client.lastContact}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client Status Card */}
            <Card
              className={
                isActive
                  ? "border-2 border-green-200 dark:border-green-800"
                  : "border-2 border-gray-200 dark:border-gray-700"
              }
            >
              <CardContent className="pt-6">
                <div
                  className={`flex items-center gap-3 p-4 rounded-lg ${
                    isActive
                      ? "bg-green-50 dark:bg-green-900/20"
                      : "bg-gray-50 dark:bg-gray-800"
                  }`}
                >
                  {isActive ? (
                    <>
                      <Activity className="h-6 w-6 text-green-600" />
                      <div>
                        <p className="font-semibold text-green-900 dark:text-green-100">
                          Client Status: Active
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          This client has {client.activeCases} active{" "}
                          {client.activeCases === 1 ? "case" : "cases"}{" "}
                          currently being handled by the firm.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-6 w-6 text-gray-600" />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          Client Status: Inactive
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          This client has no active cases at the moment. All
                          previous cases have been completed or closed.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() =>
                    router.push(`/dashboard/admin/clients/${client.id}/edit`)
                  }
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Client
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push(`/dashboard/admin/clients`)}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Clients
                </Button>
              </CardContent>
            </Card>

            {userProfile && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-navy-700 dark:text-navy-300" />
                    Linked User Account
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      User ID
                    </p>
                    <p
                      className="text-sm font-medium truncate"
                      title={userProfile.uid}
                    >
                      {userProfile.uid}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Account Created
                    </p>
                    <p className="text-sm font-medium">
                      {userProfile.createdAt
                        ? new Date(
                            userProfile.createdAt.toMillis()
                          ).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Last Updated
                    </p>
                    <p className="text-sm font-medium">
                      {userProfile.updatedAt
                        ? new Date(
                            userProfile.updatedAt.toMillis()
                          ).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Delete Case Dialog */}
        <Dialog
          open={isDeleteCaseModalOpen}
          onOpenChange={setIsDeleteCaseModalOpen}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-600" />
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
                  <Trash2 className="h-5 w-5 text-red-600 mt-0.5" />
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
      </div>
    </AdminDashboardLayout>
  );
}
