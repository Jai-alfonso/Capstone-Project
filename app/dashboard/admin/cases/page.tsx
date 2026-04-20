"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  FileText,
  Search,
  Plus,
  Eye,
  Edit,
  Calendar,
  Clock,
  User,
  MoreHorizontal,
  Printer,
  CheckCircle,
  Circle,
} from "lucide-react"
import { AdminDashboardLayout } from "@/components/admin-dashboard-layout"
import { AdvancedFilters } from "@/components/advanced-filters"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const mockCases = [
  {
    id: "DLG-2023-1018",
    title: "Personal Injury Claim",
    description: "Motor vehicle accident compensation case",
    status: "Under Review",
    progress: 45,
    filedDate: "2023-10-15",
    nextHearing: "2024-01-20",
    client: "John Smith",
    attorney: "Atty. Maria Santos",
    priority: "High",
    estimatedValue: "₱500,000",
    progressSteps: [
      { name: "Case Received", completed: true, date: "2023-10-15" },
      { name: "Under Review", completed: true, date: "2023-10-18", current: true },
      { name: "Court Hearing", completed: false, date: null },
      { name: "Case Resolved", completed: false, date: null },
    ],
    currentStatusDescription:
      "Case is currently under review. Our attorneys are reviewing case documents and preparing the necessary legal actions.",
  },
  {
    id: "DLG-2023-1025",
    title: "Contract Dispute",
    description: "Business contract breach resolution case",
    status: "Court Hearing",
    progress: 75,
    filedDate: "2023-10-25",
    nextHearing: "2024-01-15",
    client: "ABC Corporation",
    attorney: "Atty. Juan Delgado",
    priority: "Medium",
    estimatedValue: "₱1,200,000",
    progressSteps: [
      { name: "Case Received", completed: true, date: "2023-10-25" },
      { name: "Under Review", completed: true, date: "2023-10-28" },
      { name: "Court Hearing", completed: false, date: "2024-01-15", current: true },
      { name: "Case Resolved", completed: false, date: null },
    ],
    currentStatusDescription:
      "Case is scheduled for court hearing. We are preparing all necessary documents and evidence for the upcoming hearing.",
  },
]

export default function AdminCasesPage() {
  const router = useRouter()
  const [cases, setCases] = useState(mockCases)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCase, setSelectedCase] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    dateRange: { from: "", to: "" },
    status: [],
    caseType: [],
    attorney: "",
    priority: "",
    sortBy: "date",
    sortOrder: "desc" as "asc" | "desc",
  })

  const searchParams = useSearchParams()

  useEffect(() => {
    const caseId = searchParams.get("caseId")
    if (caseId) {
      setSelectedCase(caseId)
    }
  }, [searchParams])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Case Filed":
        return "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 dark:from-blue-900 dark:to-blue-800 dark:text-blue-200 shadow-sm"
      case "Under Review":
        return "bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 dark:from-yellow-900 dark:to-yellow-800 dark:text-yellow-200 shadow-sm"
      case "Court Hearing":
        return "bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 dark:from-orange-900 dark:to-orange-800 dark:text-orange-200 shadow-sm animate-pulse"
      case "Motion Hearings":
        return "bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 dark:from-purple-900 dark:to-purple-800 dark:text-purple-200 shadow-sm"
      case "Closed":
        return "bg-gradient-to-r from-green-100 to-green-200 text-green-800 dark:from-green-900 dark:to-green-800 dark:text-green-200 shadow-sm"
      default:
        return "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 dark:from-gray-900 dark:to-gray-800 dark:text-gray-200 shadow-sm"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-gradient-to-r from-red-100 to-red-200 text-red-800 dark:from-red-900 dark:to-red-800 dark:text-red-200 shadow-sm animate-pulse"
      case "Medium":
        return "bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 dark:from-yellow-900 dark:to-yellow-800 dark:text-yellow-200 shadow-sm"
      case "Low":
        return "bg-gradient-to-r from-green-100 to-green-200 text-green-800 dark:from-green-900 dark:to-green-800 dark:text-green-200 shadow-sm"
      default:
        return "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 dark:from-gray-900 dark:to-gray-800 dark:text-gray-200 shadow-sm"
    }
  }

  const filteredCases = cases.filter(
    (case_) =>
      case_.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      case_.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      case_.id.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const renderCaseProgress = (case_: any) => (
    <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-gray-200/50 dark:border-gray-700/50 shadow-xl">
      <CardHeader className="border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-serif text-gray-900 dark:text-gray-100">Track Case Progress</CardTitle>
            <CardDescription className="text-base mt-2">Track the status of this legal matter</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="bg-white hover:bg-gray-50 border-gray-300 text-gray-700 hover:text-gray-800"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-8">
        <div className="space-y-8">
          {/* Case Reference */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Case Reference Number</h3>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{case_.id}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{case_.description}</p>
          </div>

          {/* Case Status */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Case Status</h3>
            <div className="relative">
              {/* Progress Line */}
              <div className="absolute top-6 left-6 right-6 h-0.5 bg-gray-200 dark:bg-gray-700"></div>
              <div
                className="absolute top-6 left-6 h-0.5 bg-green-500 transition-all duration-500"
                style={{
                  width: `${(case_.progressSteps.filter((step) => step.completed).length / case_.progressSteps.length) * 100}%`,
                }}
              ></div>

              {/* Progress Steps */}
              <div className="flex justify-between relative">
                {case_.progressSteps.map((step, index) => {
                  const getStepIcon = (stepName: string, completed: boolean, current: boolean) => {
                    if (completed) {
                      switch (stepName) {
                        case "Case Received":
                          return <FileText className="h-6 w-6 text-white" />
                        case "Under Review":
                          return <Eye className="h-6 w-6 text-white" />
                        case "Court Hearing":
                          return <Calendar className="h-6 w-6 text-white" />
                        case "Case Resolved":
                          return <CheckCircle className="h-6 w-6 text-white" />
                        default:
                          return <CheckCircle className="h-6 w-6 text-white" />
                      }
                    } else {
                      switch (stepName) {
                        case "Case Received":
                          return <FileText className={`h-6 w-6 ${current ? "text-yellow-500" : "text-gray-400"}`} />
                        case "Under Review":
                          return <Eye className={`h-6 w-6 ${current ? "text-yellow-500" : "text-gray-400"}`} />
                        case "Court Hearing":
                          return <Calendar className={`h-6 w-6 ${current ? "text-yellow-500" : "text-gray-400"}`} />
                        case "Case Resolved":
                          return <CheckCircle className={`h-6 w-6 ${current ? "text-yellow-500" : "text-gray-400"}`} />
                        default:
                          return <Circle className={`h-6 w-6 ${current ? "text-yellow-500" : "text-gray-400"}`} />
                      }
                    }
                  }

                  return (
                    <div key={index} className="flex flex-col items-center">
                      <div
                        className={`w-12 h-12 rounded-full border-4 flex items-center justify-center ${
                          step.completed
                            ? "bg-green-500 border-green-500"
                            : step.current
                              ? "bg-white dark:bg-gray-800 border-yellow-500"
                              : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                        }`}
                      >
                        {getStepIcon(step.name, step.completed, step.current)}
                      </div>
                      <div className="mt-3 text-center">
                        <p
                          className={`text-sm font-medium ${
                            step.completed
                              ? "text-green-700 dark:text-green-300"
                              : step.current
                                ? "text-yellow-700 dark:text-yellow-300"
                                : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {step.name}
                        </p>
                        {step.date && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{step.date}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Current Status Details */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6 border border-yellow-200 dark:border-yellow-700">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-yellow-500 rounded-lg">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                  Current Status: {case_.progressSteps.find((step) => step.current)?.name || case_.status}
                </h4>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                  Last Updated: {case_.progressSteps.find((step) => step.current)?.date || case_.filedDate}
                </p>
                <p className="text-yellow-700 dark:text-yellow-300">{case_.currentStatusDescription}</p>
              </div>
            </div>
          </div>

          {/* Case Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Case Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700 dark:text-gray-300">Client:</span>
                  <span className="text-gray-900 dark:text-gray-100">{case_.client}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700 dark:text-gray-300">Filed Date:</span>
                  <span className="text-gray-900 dark:text-gray-100">{case_.filedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700 dark:text-gray-300">Attorney:</span>
                  <span className="text-gray-900 dark:text-gray-100">{case_.attorney}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700 dark:text-gray-300">Priority:</span>
                  <Badge className={getPriorityColor(case_.priority)} size="sm">
                    {case_.priority}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-300 dark:border-gray-600">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Next Steps</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700 dark:text-gray-300">Next Hearing:</span>
                  <span className="text-gray-900 dark:text-gray-100">{case_.nextHearing || "TBD"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700 dark:text-gray-300">Progress:</span>
                  <span className="text-gray-900 dark:text-gray-100">{case_.progress}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700 dark:text-gray-300">Est. Value:</span>
                  <span className="text-gray-900 dark:text-gray-100">{case_.estimatedValue}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const handleBackToCases = () => {
    setSelectedCase(null)
    router.push("/dashboard/admin/cases")
  }

  return (
    <AdminDashboardLayout>
      <div className="space-y-8">
        {/* Header - Enhanced */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold font-serif bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
              Cases
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">Manage all legal cases and track their progress</p>
          </div>
          <Button
            className="bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-600 hover:to-gray-800 shadow-lg hover:shadow-xl transition-all duration-300"
            onClick={() => router.push("/dashboard/admin/cases/new")}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Case
          </Button>
        </div>

        {selectedCase && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={handleBackToCases}
                className="bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200"
              >
                ← Back to Cases
              </Button>
            </div>
            {renderCaseProgress(cases.find((c) => c.id === selectedCase))}
          </div>
        )}

        {!selectedCase && (
          <>
            {/* Search and Filters - Enhanced */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search cases..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-gray-200/50 dark:border-gray-700/50 focus:bg-white dark:focus:bg-gray-800 transition-all duration-300"
                />
              </div>
              <AdvancedFilters onFiltersChange={setFilters} activeFilters={filters} />
            </div>

            {/* Stats Cards - Enhanced */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl">
                      <FileText className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Cases</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">{cases.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gray-200 dark:bg-gray-600 rounded-xl">
                      <Clock className="h-5 w-5 text-gray-700 dark:text-gray-200" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Cases</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {cases.filter((c) => c.status !== "Closed").length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl">
                      <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Court Hearings</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {cases.filter((c) => c.status === "Court Hearing").length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gray-200 dark:bg-gray-600 rounded-xl">
                      <FileText className="h-5 w-5 text-gray-700 dark:text-gray-200" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">New This Month</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">0</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cases Grid - Enhanced */}
            <div className="grid gap-6">
              {filteredCases.map((case_) => (
                <Card
                  key={case_.id}
                  className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-all duration-300 group"
                >
                  <CardContent className="p-8">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 transition-colors duration-300">
                            {case_.title}
                          </h3>
                          <Badge className={getPriorityColor(case_.priority)}>{case_.priority}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{case_.description}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">Case ID: {case_.id}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(case_.status)}>{case_.status}</Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 rounded-xl"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 shadow-2xl"
                          >
                            <DropdownMenuItem
                              onClick={() => setSelectedCase(case_.id)}
                              className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 rounded-lg m-1"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Progress
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => router.push(`/dashboard/admin/cases/${case_.id}/edit`)}
                              className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 rounded-lg m-1"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Case
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => router.push(`/dashboard/admin/cases/${case_.id}/documents`)}
                              className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 rounded-lg m-1"
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Documents
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => router.push(`/dashboard/admin/appointments/new?caseId=${case_.id}`)}
                              className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 rounded-lg m-1"
                            >
                              <Calendar className="h-4 w-4 mr-2" />
                              Schedule Hearing
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between text-sm font-medium">
                        <span>Progress</span>
                        <span>{case_.progress}%</span>
                      </div>
                      <Progress value={case_.progress} className="h-3 bg-gray-200 dark:bg-gray-700" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 text-sm">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                          <User className="h-4 w-4" />
                          <span className="font-semibold">Client:</span>
                        </div>
                        <p className="text-gray-900 dark:text-white font-medium">{case_.client}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                          <Calendar className="h-4 w-4" />
                          <span className="font-semibold">Filed:</span>
                        </div>
                        <p className="text-gray-900 dark:text-white font-medium">{case_.filedDate}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                          <Clock className="h-4 w-4" />
                          <span className="font-semibold">Next:</span>
                        </div>
                        <p className="text-gray-900 dark:text-white font-medium">{case_.nextHearing || "TBD"}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">Value:</span>
                        <p className="text-gray-900 dark:text-white font-medium">{case_.estimatedValue}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCase(case_.id)}
                        className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Progress
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/admin/cases/${case_.id}/documents`)}
                        className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Documents
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/admin/appointments/new?caseId=${case_.id}`)}
                        className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Empty State - Enhanced */}
            {filteredCases.length === 0 && (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <FileText className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No cases found</h3>
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  {searchQuery ? "Try adjusting your search terms" : "Start by creating your first case"}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </AdminDashboardLayout>
  )
}
