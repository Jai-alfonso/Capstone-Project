"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { AdminDashboardLayout } from "@/components/admin-dashboard-layout"
import { 
  User, Calendar, Clock, MapPin, Video, Phone, 
  CheckCircle, XCircle, RefreshCw, Edit2, Save,
  ArrowLeft, AlertCircle, FileText, TrendingUp
} from "lucide-react"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { 
  sendAppointmentConfirmation, 
  sendAppointmentUpdate, 
  sendAppointmentReschedule,
  sendAppointmentCancellation,
  sendProgressUpdate 
} from "@/lib/email-notifications"

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
  status: "pending" | "confirmed" | "ongoing" | "completed" | "cancelled" | "no-show"
  location: string
  description: string
  subject: string
  message: string
  serviceType: "complex" | "simple" | "pending-review"
  legalService?: string
  adminNotes?: string
  progressStages?: ProgressStage[]
  createdAt: string
  updatedAt: string
}

const defaultComplexStages: ProgressStage[] = [
  { id: "1", name: "Consultation", description: "Initial consultation with client", status: "pending", order: 1 },
  { id: "2", name: "Case Preparation Stage", description: "Preparing necessary legal documents and case materials", status: "pending", order: 2 },
  { id: "3", name: "Post-Filing Stage", description: "Case filed with appropriate court or agency", status: "pending", order: 3 },
  { id: "4", name: "Litigation/Hearing Stage", description: "Ongoing hearings and case proceedings", status: "pending", order: 4 },
  { id: "5", name: "Decision Stage", description: "Awaiting or receiving court decision", status: "pending", order: 5 },
  { id: "6", name: "Case Closure", description: "Case has been resolved and closed", status: "pending", order: 6 },
]

export default function AppointmentDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null)
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [adminNotes, setAdminNotes] = useState("")
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false)
  const [isAddStageOpen, setIsAddStageOpen] = useState(false)
  const [newStage, setNewStage] = useState({ name: "", description: "" })
  const [rescheduleData, setRescheduleData] = useState({ date: "", time: "", reason: "" })

  useEffect(() => {
    const loadAppointment = () => {
      const saved = localStorage.getItem("appointments")
      if (saved) {
        const appointments = JSON.parse(saved)
        const found = appointments.find((apt: any) => apt.id === params.id)
        if (found) {
          // Initialize appointment with enhanced fields if not present
          const enhanced = {
            ...found,
            subject: found.subject || "Legal Consultation",
            message: found.message || "Client requesting legal assistance",
            serviceType: found.serviceType || "pending-review",
            legalService: found.legalService || "",
            adminNotes: found.adminNotes || "",
            progressStages: found.progressStages || [],
            clientEmail: found.clientEmail || "client@example.com",
            clientPhone: found.clientPhone || "+1 (555) 123-4567",
            createdAt: found.createdAt || new Date().toISOString(),
            updatedAt: found.updatedAt || new Date().toISOString(),
            status: found.status || "pending"
          }
          setAppointment(enhanced)
          setAdminNotes(enhanced.adminNotes)
        }
      }
    }
    loadAppointment()
  }, [params.id])

  const updateAppointment = (updates: Partial<AppointmentDetails>) => {
    if (!appointment) return

    const updated = { ...appointment, ...updates, updatedAt: new Date().toISOString() }
    setAppointment(updated)

    const saved = localStorage.getItem("appointments")
    if (saved) {
      const appointments = JSON.parse(saved)
      const index = appointments.findIndex((apt: any) => apt.id === params.id)
      if (index !== -1) {
        appointments[index] = updated
        localStorage.setItem("appointments", JSON.stringify(appointments))
      }
    }

    toast({
      title: "Success",
      description: "Appointment updated successfully",
    })
  }

  const handleStatusChange = async (newStatus: AppointmentDetails["status"]) => {
    updateAppointment({ status: newStatus })
    
    // Send email notifications based on status
    if (appointment) {
      if (newStatus === "confirmed") {
        await sendAppointmentConfirmation(
          appointment.clientEmail || "",
          appointment.client,
          {
            date: appointment.date,
            time: appointment.time,
            attorney: appointment.attorney,
            location: appointment.location
          }
        )
      } else if (newStatus === "cancelled") {
        await sendAppointmentCancellation(
          appointment.clientEmail || "",
          appointment.client,
          "Cancelled by administrator",
          {
            date: appointment.date,
            time: appointment.time
          }
        )
      }
    }
  }

  const handleServiceTypeChange = (newType: "complex" | "simple" | "pending-review") => {
    const updates: Partial<AppointmentDetails> = { serviceType: newType }
    
    if (newType === "complex" && (!appointment?.progressStages || appointment.progressStages.length === 0)) {
      updates.progressStages = defaultComplexStages
    }
    
    updateAppointment(updates)
  }

  const handleSaveNotes = () => {
    updateAppointment({ adminNotes })
    setIsEditingNotes(false)
  }

  const handleReschedule = async () => {
    if (!rescheduleData.date || !rescheduleData.time || !rescheduleData.reason) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      })
      return
    }

    if (appointment) {
      // Send reschedule email
      await sendAppointmentReschedule(
        appointment.clientEmail || "",
        appointment.client,
        rescheduleData.reason,
        {
          date: rescheduleData.date,
          time: rescheduleData.time
        },
        {
          date: appointment.date,
          time: appointment.time
        }
      )
    }

    updateAppointment({ 
      date: rescheduleData.date, 
      time: rescheduleData.time 
    })
    setIsRescheduleOpen(false)
    setRescheduleData({ date: "", time: "", reason: "" })
  }

  const handleUpdateStage = async (stageId: string, status: ProgressStage["status"]) => {
    if (!appointment?.progressStages) return

    const updated = appointment.progressStages.map(stage => 
      stage.id === stageId 
        ? { ...stage, status, completedAt: status === "completed" ? new Date().toISOString() : undefined }
        : stage
    )

    updateAppointment({ progressStages: updated })
    
    // Send progress update email when a stage is completed
    if (status === "completed" && appointment) {
      const completedStage = appointment.progressStages.find(s => s.id === stageId)
      if (completedStage) {
        await sendProgressUpdate(
          appointment.clientEmail || "",
          appointment.client,
          completedStage.name,
          completedStage.description,
          appointment.legalService || appointment.title
        )
      }
    }
  }

  const handleAddStage = () => {
    if (!newStage.name) {
      toast({
        title: "Error",
        description: "Stage name is required",
        variant: "destructive"
      })
      return
    }

    const stages = appointment?.progressStages || []
    const newStageObj: ProgressStage = {
      id: Date.now().toString(),
      name: newStage.name,
      description: newStage.description,
      status: "pending",
      order: stages.length + 1
    }

    updateAppointment({ progressStages: [...stages, newStageObj] })
    setIsAddStageOpen(false)
    setNewStage({ name: "", description: "" })
  }

  const handleRemoveStage = (stageId: string) => {
    if (!appointment?.progressStages) return
    const updated = appointment.progressStages.filter(s => s.id !== stageId)
    updateAppointment({ progressStages: updated })
  }

  const getStatusColor = (status: AppointmentDetails["status"]) => {
    switch (status) {
      case "confirmed": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "ongoing": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "completed": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
      case "cancelled": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "no-show": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
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

  if (!appointment) {
    return (
      <AdminDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading...</p>
        </div>
      </AdminDashboardLayout>
    )
  }

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold font-playfair text-navy-900 dark:text-white">
                Appointment Details
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Appointment ID: {appointment.id}
              </p>
            </div>
          </div>
          <Badge className={getStatusColor(appointment.status)}>
            {appointment.status.toUpperCase()}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client & Appointment Information */}
            <Card>
              <CardHeader>
                <CardTitle>Client & Appointment Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Client Name</Label>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-navy-700" />
                      <span className="font-medium">{appointment.client}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Email</Label>
                    <p className="text-sm">{appointment.clientEmail}</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Phone</Label>
                    <p className="text-sm">{appointment.clientPhone}</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Attorney</Label>
                    <p className="text-sm font-medium">{appointment.attorney}</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Date</Label>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-navy-700" />
                      <span className="text-sm">{appointment.date}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Time</Label>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-navy-700" />
                      <span className="text-sm">{appointment.time}</span>
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Location / Mode</Label>
                    <div className="flex items-center gap-2">
                      {getLocationIcon(appointment.location)}
                      <span className="text-sm">{appointment.location}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Subject</Label>
                  <p className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-md">{appointment.subject}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Client Message</Label>
                  <p className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-md">{appointment.message}</p>
                </div>
              </CardContent>
            </Card>

            {/* Service Type Management */}
            <Card>
              <CardHeader>
                <CardTitle>Legal Service Classification</CardTitle>
                <CardDescription>
                  Based on the client's request, classify this appointment as a complex legal case or simple service
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Service Type</Label>
                  <Select value={appointment.serviceType} onValueChange={handleServiceTypeChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending-review">Pending Review</SelectItem>
                      <SelectItem value="complex">Complex Legal Service Case</SelectItem>
                      <SelectItem value="simple">Simple Legal Service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Specific Legal Service</Label>
                  <Input
                    placeholder="e.g., Criminal Case Filing, Notarization, Contract Review"
                    value={appointment.legalService || ""}
                    onChange={(e) => updateAppointment({ legalService: e.target.value })}
                  />
                </div>

                {appointment.serviceType === "complex" && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                          Complex Case Progress Tracking Enabled
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                          Progress stages are now active. You can manage them in the section below.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {appointment.serviceType === "simple" && (
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                          Simple Service - No Progress Tracking Required
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                          Simply mark this appointment as completed or cancelled when done.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Progress Tracking for Complex Cases */}
            {appointment.serviceType === "complex" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Case Progress Tracking</CardTitle>
                      <CardDescription>
                        Manage stages and track progress for this complex legal case
                      </CardDescription>
                    </div>
                    <Button onClick={() => setIsAddStageOpen(true)} size="sm">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Add Stage
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-semibold">Overall Progress</Label>
                      <span className="text-sm font-bold text-navy-700 dark:text-navy-300">
                        {Math.round(calculateProgress())}%
                      </span>
                    </div>
                    <Progress value={calculateProgress()} className="h-2" />
                  </div>

                  <div className="space-y-4">
                    {appointment.progressStages?.map((stage, index) => (
                      <div key={stage.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-gray-500">STAGE {index + 1}</span>
                              <Badge variant={
                                stage.status === "completed" ? "default" : 
                                stage.status === "in-progress" ? "secondary" : "outline"
                              }>
                                {stage.status}
                              </Badge>
                            </div>
                            <h4 className="font-semibold">{stage.name}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {stage.description}
                            </p>
                            {stage.completedAt && (
                              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                                Completed: {new Date(stage.completedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveStage(stage.id)}
                          >
                            <XCircle className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={stage.status === "pending" ? "default" : "outline"}
                            onClick={() => handleUpdateStage(stage.id, "pending")}
                          >
                            Pending
                          </Button>
                          <Button
                            size="sm"
                            variant={stage.status === "in-progress" ? "default" : "outline"}
                            onClick={() => handleUpdateStage(stage.id, "in-progress")}
                          >
                            In Progress
                          </Button>
                          <Button
                            size="sm"
                            variant={stage.status === "completed" ? "default" : "outline"}
                            onClick={() => handleUpdateStage(stage.id, "completed")}
                          >
                            Completed
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Admin Notes */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Admin Notes (Internal)</CardTitle>
                  {!isEditingNotes && (
                    <Button variant="ghost" size="sm" onClick={() => setIsEditingNotes(true)}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
                <CardDescription>Internal notes not visible to the client</CardDescription>
              </CardHeader>
              <CardContent>
                {isEditingNotes ? (
                  <div className="space-y-3">
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={6}
                      placeholder="Add internal notes about this appointment..."
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleSaveNotes} size="sm">
                        <Save className="h-4 w-4 mr-2" />
                        Save Notes
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setAdminNotes(appointment.adminNotes || "")
                          setIsEditingNotes(false)
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm bg-gray-50 dark:bg-gray-800 p-4 rounded-md min-h-[100px]">
                    {appointment.adminNotes || "No notes added yet."}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Actions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Admin Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Change Status</Label>
                  <Select value={appointment.status} onValueChange={handleStatusChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="no-show">No-Show</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full" variant="default" onClick={() => handleStatusChange("confirmed")}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve / Confirm
                </Button>

                <Button className="w-full" variant="outline" onClick={() => setIsRescheduleOpen(true)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reschedule
                </Button>

                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => handleStatusChange("completed")}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Completed
                </Button>

                <Button 
                  className="w-full" 
                  variant="destructive"
                  onClick={() => handleStatusChange("cancelled")}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Appointment
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Appointment Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <Label className="text-xs text-gray-500">Created At</Label>
                  <p>{new Date(appointment.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Last Updated</Label>
                  <p>{new Date(appointment.updatedAt).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Reschedule Dialog */}
        <Dialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reschedule Appointment</DialogTitle>
              <DialogDescription>
                Update the appointment date and time
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>New Date</Label>
                <Input
                  type="date"
                  value={rescheduleData.date}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>New Time</Label>
                <Input
                  type="time"
                  value={rescheduleData.time}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Reason for Rescheduling</Label>
                <Textarea
                  value={rescheduleData.reason}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, reason: e.target.value })}
                  placeholder="Enter reason..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRescheduleOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleReschedule}>
                Confirm Reschedule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Stage Dialog */}
        <Dialog open={isAddStageOpen} onOpenChange={setIsAddStageOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Progress Stage</DialogTitle>
              <DialogDescription>
                Add a custom stage to track case progress
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Stage Name *</Label>
                <Input
                  value={newStage.name}
                  onChange={(e) => setNewStage({ ...newStage, name: e.target.value })}
                  placeholder="e.g., Evidence Collection"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newStage.description}
                  onChange={(e) => setNewStage({ ...newStage, description: e.target.value })}
                  placeholder="Describe this stage..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddStageOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddStage}>
                Add Stage
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminDashboardLayout>
  )
}
