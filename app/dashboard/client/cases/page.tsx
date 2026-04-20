"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { FileText, Calendar, Clock, Eye, Download, Search, CheckCircle, Circle, Printer } from "lucide-react"
import { ClientDashboardLayout } from "@/components/client-dashboard-layout"
import { AdvancedFilters } from "@/components/advanced-filters"
import { useSearchParams, useRouter } from "next/navigation"

const mockCases: any[] = []

export default function CasesPage() {
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
  const router = useRouter()

  useEffect(() => {
    const caseId = searchParams.get("caseId")
    if (caseId) {
      setSelectedCase(caseId)
    }
  }, [searchParams])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Case Filed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600"
      case "Under Review":
        return "bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 border border-gray-400 dark:border-gray-500"
      case "Court Hearing":
        return "bg-black text-white dark:bg-gray-900 dark:text-gray-100 border border-gray-800 dark:border-gray-600"
      case "Motion Hearings":
        return "bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-gray-100 border border-gray-400 dark:border-gray-500"
      case "Closed":
        return "bg-gray-800 text-white dark:bg-gray-300 dark:text-gray-900 border border-gray-700 dark:border-gray-400"
      default:
        return "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-600"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-black text-white dark:bg-gray-900 dark:text-gray-100 border border-gray-800 dark:border-gray-600"
      case "Medium":
        return "bg-gray-600 text-white dark:bg-gray-400 dark:text-gray-900 border border-gray-500 dark:border-gray-300"
      case "Low":
        return "bg-gray-300 text-gray-900 dark:bg-gray-700 dark:text-gray-100 border border-gray-400 dark:border-gray-600"
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-600"
    }
  }

  const filteredCases = cases.filter(
    (case_) =>
      case_.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      case_.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      case_.id.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const renderCaseProgress = (case_: any) => (
    <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-gray-200/50 dark:border-gray-700/50 shadow-xl">
      <CardHeader className="border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-serif text-blue-900 dark:text-blue-100">Track Case Progress</CardTitle>
            <CardDescription className="text-base mt-2">Track the status of your legal matter</CardDescription>
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
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <ClientDashboardLayout>
      <div className="space-y-8">
        {/* Header - Enhanced */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold font-serif bg-gradient-to-r from-blue-900 to-blue-700 dark:from-blue-100 dark:to-blue-300 bg-clip-text text-transparent">
              My Cases
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">Track and manage your legal cases</p>
          </div>
          <Button className="bg-gradient-to-r from-blue-700 to-blue-900 hover:from-blue-600 hover:to-blue-800 shadow-lg hover:shadow-xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105 transform">
            <FileText className="h-4 w-4 mr-2" />
            New Case Request
          </Button>
        </div>

        {selectedCase && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setSelectedCase(null)}
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

            {/* Cases Grid - Enhanced */}
            <div className="grid gap-6">
              {filteredCases.map((case_) => (
                <Card
                  key={case_.id}
                  className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-all duration-300 group"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-xl font-serif text-blue-900 dark:text-blue-100 transition-colors duration-300">
                            {case_.title}
                          </CardTitle>
                          <Badge className={getPriorityColor(case_.priority)}>{case_.priority}</Badge>
                        </div>
                        <CardDescription className="text-base">{case_.description}</CardDescription>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Case ID: {case_.id}</p>
                      </div>
                      <Badge className={getStatusColor(case_.status)}>{case_.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm font-medium">
                        <span>Progress</span>
                        <span>{case_.progress}%</span>
                      </div>
                      <Progress value={case_.progress} className="h-3 bg-gray-200 dark:bg-gray-700" />
                    </div>

                    {/* Info Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                          <Calendar className="h-4 w-4" />
                          <span className="font-semibold">Filed:</span>
                        </div>
                        <p className="text-gray-900 dark:text-gray-100 font-medium">{case_.filedDate}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-300 dark:border-gray-600">
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                          <Clock className="h-4 w-4" />
                          <span className="font-semibold">Next:</span>
                        </div>
                        <p className="text-gray-900 dark:text-gray-100 font-medium">{case_.nextHearing || "TBD"}</p>
                      </div>
                      <div className="bg-gray-100 dark:bg-gray-600 rounded-lg p-3 border border-gray-300 dark:border-gray-500">
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                          <FileText className="h-4 w-4" />
                          <span className="font-semibold">Attorney:</span>
                        </div>
                        <p className="text-gray-900 dark:text-gray-100 font-medium">{case_.attorney}</p>
                      </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCase(case_.id)}
                        className="bg-white hover:bg-gray-50 border-gray-300 text-gray-700 hover:text-gray-800 transition-colors duration-200"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Progress
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-gray-50 hover:bg-gray-100 border-gray-300 text-gray-700 hover:text-gray-800 transition-colors duration-200"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Documents
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
                  {searchQuery
                    ? "Try adjusting your search terms"
                    : "You don't have any active cases yet. Contact us to get started with your legal matter."}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </ClientDashboardLayout>
  )
}
