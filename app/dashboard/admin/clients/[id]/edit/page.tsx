"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/firebase/config";
import {
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AdminDashboardLayout } from "@/components/admin-dashboard-layout";
import {
  ArrowLeft,
  Save,
  User,
  Briefcase,
  Eye,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  ChevronDown,
  CheckCircle,
  Clock,
  ChevronRight,
  XCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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

export default function EditClientPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingCases, setIsLoadingCases] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isDeleteCaseModalOpen, setIsDeleteCaseModalOpen] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<{
    caseId: string;
    clientId: string;
    caseTitle: string;
  } | null>(null);
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    status: "active",
    priority: "normal",
  });

  useEffect(() => {
    loadClient();
  }, [params.id]);

  useEffect(() => {
    if (client) {
      loadCases();
    }
  }, [client]);

  const loadClient = async () => {
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
          setFormData({
            name: clientData.name,
            email: clientData.email,
            phone: clientData.phone,
            address: clientData.address,
            status: clientData.status || "active",
            priority: clientData.priority || "normal",
          });
        }
      }
    } catch (error) {
      console.error("Error loading client:", error);
      setError("Failed to load client information");
    } finally {
      setIsLoading(false);
    }
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

      // Also try to find cases by client name
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
        setFormData({ ...formData, phone: "+63" + numbers });
      }
    } else if (value === "" || value === "+") {
      setFormData({ ...formData, phone: "+63" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (
      !formData.name ||
      !formData.email ||
      formData.phone === "+63" ||
      !formData.address
    ) {
      setError("Please fill in all required fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (formData.phone.length !== 13) {
      setError("Please enter a valid phone number (+63 followed by 10 digits)");
      return;
    }

    try {
      setIsSaving(true);

      if (db) {
        const clientRef = doc(db, "clients", params.id as string);
        await updateDoc(clientRef, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          status: formData.status,
          priority: formData.priority,
          updatedAt: Timestamp.now(),
        });

        setSuccess(true);

        setTimeout(() => {
          router.push(`/dashboard/admin/clients/${params.id}`);
        }, 1500);
      }
    } catch (error: any) {
      console.error("Error updating client:", error);
      setError("Failed to update client information. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
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

      // Update client's case counts
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
    } catch (error: any) {
      toast.error("Failed to delete case. Please try again.");
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
              Loading client information...
            </p>
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

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/dashboard/admin/clients/${params.id}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-playfair text-navy-900 dark:text-white">
              Edit Client Information
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Update personal information for {client.name}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Edit Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Alerts */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
                <AlertDescription className="text-green-800 dark:text-green-200">
                  Client information updated successfully! Redirecting...
                </AlertDescription>
              </Alert>
            )}

            {/* Edit Form Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-navy-700 dark:text-navy-300" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Update the client's contact details and account settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name */}
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Enter full name"
                      required
                      className="mt-2"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="email@example.com"
                      required
                      className="mt-2"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      placeholder="+63 9XX XXX XXXX"
                      required
                      className="mt-2"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Format: +63 followed by 10 digits
                    </p>
                  </div>

                  {/* Address */}
                  <div>
                    <Label htmlFor="address">Address *</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      placeholder="Enter complete address"
                      required
                      rows={3}
                      className="mt-2"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <Label htmlFor="status">Client Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Priority */}
                  <div>
                    <Label htmlFor="priority">Priority Level</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) =>
                        setFormData({ ...formData, priority: value })
                      }
                    >
                      <SelectTrigger className="mt-2">
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

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        router.push(`/dashboard/admin/clients/${params.id}`)
                      }
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
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
                  </div>
                </form>
              </CardContent>
            </Card>
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
