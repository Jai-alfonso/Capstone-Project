"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ClientDashboardLayout } from "@/components/client-dashboard-layout"
import { 
  User, Calendar, Clock, MapPin, Video, Phone, 
  CheckCircle, ArrowLeft, FileText, TrendingUp, Circle
} from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface ProgressStage {
  id: string
  name: string
  description: string
  status: "pending" | "in-progress" | "completed"
  completedAt?: string
  order: number
}

interface AppointmentDetails {
  id: string
  title: string
  type: string
  date: string
  time: string
  client: string
  clientEmail?: string
  clientPhone?: string
  attorney: string
  status: string
  location: string
  description: string
  subject: string
  message: string
  serviceType: "complex" | "simple" | "pending-review"
  legalService?: string
  progressStages?: ProgressStage[]
  createdAt: string
  updatedAt: string
}

export default function ClientAppointmentDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null)

  useEffect(() => {
    const loadAppointment = () => {
      const saved = localStorage.getItem("appointments")
      if (saved) {
        const appointments = JSON.parse(saved)
        const found = appointments.find((apt: any) => apt.id === params.id)
        if (found) {
          setAppointment(found)
        }
      }
    }
    loadAppointment()
  }, [params.id])

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "ongoing": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "completed": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
      case "cancelled": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const getLocationIcon = (location: string) => {
    if (location.includes("Video") || location.includes("Virtual")) return <Video className="h-4 w-4" />
    if (location.includes("Phone")) return <Phone className="h-4 w-4" />
    return <MapPin className="h-4 w-4" />
  }

  const calculateProgress = () => {
    if (!appointment?.progressStages || appointment.progressStages.length === 0) return 0
    const completed = appointment.progressStages.filter(s => s.status === "completed").length
    return (completed / appointment.progressStages.length) * 100
  }

  const getStageIcon = (status: ProgressStage["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-6 w-6 text-green-600" />
      case "in-progress":
        return (
          <div className="h-6 w-6 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
        )
      case "pending":
        return <Circle className="h-6 w-6 text-gray-400" />
    }
  }

  if (!appointment) {
    return (
      <ClientDashboardLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-500">Loading appointment details...</p>
        </div>
      </ClientDashboardLayout>
    )
  }

  const isComplexCase = appointment.serviceType === "complex"
  const progress = calculateProgress()

  return (
    <ClientDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => router.push("/dashboard/client/appointments")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-playfair text-navy-900 dark:text-white">
              Appointment Details
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              View your appointment information and case progress
            </p>
          </div>
        </div>

        {/* Appointment Information Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl font-serif text-navy-900 dark:text-white">
                  {appointment.title}
                </CardTitle>
                <CardDescription className="mt-2">
                  Case ID: {appointment.id}
                </CardDescription>
              </div>
              <Badge className={getStatusColor(appointment.status)}>
                {appointment.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-navy-700 dark:text-navy-300" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Attorney</p>
                  <p className="font-medium text-gray-900 dark:text-white">{appointment.attorney}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-navy-700 dark:text-navy-300" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
                  <p className="font-medium text-gray-900 dark:text-white">{appointment.date}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-navy-700 dark:text-navy-300" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Time</p>
                  <p className="font-medium text-gray-900 dark:text-white">{appointment.time}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {getLocationIcon(appointment.location)}
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Location</p>
                  <p className="font-medium text-gray-900 dark:text-white">{appointment.location}</p>
                </div>
              </div>
            </div>

            {/* Service Type Badge */}
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-navy-700 dark:text-navy-300" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Service Type:</span>
              <Badge variant={isComplexCase ? "default" : "secondary"}>
                {isComplexCase ? "Complex Case" : "Simple Case"}
              </Badge>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
              <p className="text-gray-600 dark:text-gray-400">{appointment.description}</p>
            </div>

            {appointment.legalService && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Legal Service</h3>
                <p className="text-gray-600 dark:text-gray-400">{appointment.legalService}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progress Tracking - Only for Complex Cases */}
        {isComplexCase && appointment.progressStages && appointment.progressStages.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-navy-700 dark:text-navy-300" />
                    Case Progress
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Track the progress of your legal case
                  </CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-navy-900 dark:text-white">
                    {Math.round(progress)}%
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Complete</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Overall Progress Bar */}
              <div className="space-y-2">
                <Progress value={progress} className="h-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  {appointment.progressStages.filter(s => s.status === "completed").length} of{" "}
                  {appointment.progressStages.length} stages completed
                </p>
              </div>

              {/* Progress Stages */}
              <div className="space-y-4">
                {appointment.progressStages
                  .sort((a, b) => a.order - b.order)
                  .map((stage, index) => (
                    <div 
                      key={stage.id}
                      className={`relative pl-8 pb-6 ${
                        index === appointment.progressStages!.length - 1 ? "" : "border-l-2 border-gray-200 dark:border-gray-700 ml-3"
                      }`}
                    >
                      {/* Stage Icon */}
                      <div className="absolute left-0 top-0 -ml-3">
                        {getStageIcon(stage.status)}
                      </div>

                      {/* Stage Content */}
                      <div className={`rounded-lg p-4 ${
                        stage.status === "completed" 
                          ? "bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800" 
                          : stage.status === "in-progress"
                          ? "bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800"
                          : "bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700"
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className={`font-semibold ${
                                stage.status === "completed" 
                                  ? "text-green-900 dark:text-green-100" 
                                  : stage.status === "in-progress"
                                  ? "text-blue-900 dark:text-blue-100"
                                  : "text-gray-700 dark:text-gray-300"
                              }`}>
                                {stage.name}
                              </h4>
                              <Badge 
                                variant={
                                  stage.status === "completed" ? "default" :
                                  stage.status === "in-progress" ? "default" :
                                  "secondary"
                                }
                                className={
                                  stage.status === "completed" ? "bg-green-600" :
                                  stage.status === "in-progress" ? "bg-blue-600" :
                                  ""
                                }
                              >
                                {stage.status === "completed" ? "Completed" :
                                 stage.status === "in-progress" ? "In Progress" :
                                 "Pending"}
                              </Badge>
                            </div>
                            <p className={`text-sm ${
                              stage.status === "completed" 
                                ? "text-green-700 dark:text-green-300" 
                                : stage.status === "in-progress"
                                ? "text-blue-700 dark:text-blue-300"
                                : "text-gray-600 dark:text-gray-400"
                            }`}>
                              {stage.description}
                            </p>
                            {stage.completedAt && (
                              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                                Completed: {new Date(stage.completedAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Case Status Message */}
              <div className={`p-4 rounded-lg ${
                progress === 100 
                  ? "bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800"
                  : "bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800"
              }`}>
                <p className={`text-sm font-medium ${
                  progress === 100 
                    ? "text-green-900 dark:text-green-100"
                    : "text-blue-900 dark:text-blue-100"
                }`}>
                  {progress === 100 
                    ? "✓ Your case has been completed and closed. All stages have been successfully finished."
                    : "Your case is currently in progress. We will notify you when there are updates."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Simple Case Message */}
        {!isComplexCase && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <FileText className="h-5 w-5" />
                <p>This is a simple case appointment. Progress tracking is not available for simple cases.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            variant="outline"
            onClick={() => router.push("/dashboard/client/appointments")}
          >
            Back to Appointments
          </Button>
        </div>
      </div>
    </ClientDashboardLayout>
  )
}
