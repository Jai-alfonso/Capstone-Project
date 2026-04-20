"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Calendar, CheckCircle, Clock, MoreVertical, Trash2, Search } from "lucide-react"

interface Appointment {
  id: string
  title?: string
  type?: string
  date: string
  time: string
  client?: string
  attorney?: string
  status: "Completed" | "Upcoming" | "Pending" | "Confirmed"
}

interface AppointmentSummaryWidgetProps {
  appointments?: Appointment[]
  onReschedule?: (id: string) => void
  onCancel?: (id: string) => void
  isAdmin?: boolean
}

const SAMPLE_APPOINTMENTS: Appointment[] = [
  {
    id: "APT-001",
    title: "Initial Consultation",
    type: "Consultation",
    date: "Nov 15, 2025",
    time: "10:00 AM",
    client: "John Smith",
    attorney: "Sarah Johnson",
    status: "Upcoming",
  },
  {
    id: "APT-002",
    title: "Case Review Meeting",
    type: "Review",
    date: "Nov 10, 2025",
    time: "2:30 PM",
    client: "Emily Davis",
    attorney: "Michael Chen",
    status: "Completed",
  },
  {
    id: "APT-003",
    title: "Document Discussion",
    type: "Discussion",
    date: "Nov 18, 2025",
    time: "3:00 PM",
    client: "Robert Wilson",
    attorney: "Sarah Johnson",
    status: "Confirmed",
  },
  {
    id: "APT-004",
    title: "Settlement Negotiation",
    type: "Negotiation",
    date: "Nov 8, 2025",
    time: "11:00 AM",
    client: "Jessica Brown",
    attorney: "Michael Chen",
    status: "Completed",
  },
  {
    id: "APT-005",
    title: "Trial Preparation",
    type: "Preparation",
    date: "Nov 22, 2025",
    time: "9:00 AM",
    client: "David Martinez",
    attorney: "Sarah Johnson",
    status: "Pending",
  },
]

export function AppointmentSummaryWidget({
  appointments = SAMPLE_APPOINTMENTS,
  onReschedule,
  onCancel,
  isAdmin = false,
}: AppointmentSummaryWidgetProps) {
  const router = useRouter()

  const [localAppointments, setLocalAppointments] = useState<Appointment[]>(appointments)
  const [searchQuery, setSearchQuery] = useState("")

  const completedAppointments = localAppointments.filter((apt) => apt.status === "Completed")

  // Compute upcoming appointments within the next 7 days (including today)
  const now = new Date()
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const parseAppointmentDate = (apt: Appointment) => {
    try {
      return new Date(`${apt.date} ${apt.time}`)
    } catch {
      return new Date(0)
    }
  }

  const upcomingAppointments = localAppointments
    .map((apt) => ({ ...apt, __date: parseAppointmentDate(apt) }))
    .filter((apt) => {
      const d = apt.__date
      return d instanceof Date && !isNaN(d.getTime()) && d >= now && d <= weekAhead
    })
    .sort((a, b) => a.__date.getTime() - b.__date.getTime())

  const filterAppointments = (apts: Appointment[]): Appointment[] => {
    if (!searchQuery.trim()) return apts
    return apts.filter(
      (apt) =>
        apt.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (apt.title?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (apt.type?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (apt.date.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (apt.client?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (apt.attorney?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false),
    )
  }

  const filteredCompleted = filterAppointments(completedAppointments)
  const filteredUpcoming = filterAppointments(upcomingAppointments)

  const handleReschedule = (id: string) => {
    onReschedule?.(id)
  }

  const handleCancel = (id: string) => {
    setLocalAppointments(localAppointments.filter((apt) => apt.id !== id))
    onCancel?.(id)
  }

  const AppointmentEntry = ({ appointment }: { appointment: Appointment }) => (
    <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-750 hover:shadow-md transition-all duration-200">
      <div className="flex items-center gap-4 flex-1">
        <div
          className={`p-3 rounded-lg ${
            appointment.status === "Completed" ? "bg-green-100 dark:bg-green-900/20" : "bg-blue-100 dark:bg-blue-900/20"
          }`}
        >
          {appointment.status === "Completed" ? (
            <CheckCircle
              className={`h-5 w-5 ${
                appointment.status === "Completed"
                  ? "text-green-600 dark:text-green-400"
                  : "text-blue-600 dark:text-blue-400"
              }`}
            />
          ) : (
            <Calendar
              className={`h-5 w-5 ${
                appointment.status === "Completed"
                  ? "text-green-600 dark:text-green-400"
                  : "text-blue-600 dark:text-blue-400"
              }`}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 dark:text-white truncate">
            {appointment.title || appointment.type}
          </h4>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
            <Clock className="h-3 w-3 flex-shrink-0" />
            <span>
              {appointment.date} at {appointment.time}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500 mt-1">
            {isAdmin && appointment.client && <span>Client: {appointment.client}</span>}
            {!isAdmin && appointment.attorney && <span>Attorney: {appointment.attorney}</span>}
            <span>ID: {appointment.id}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge
          className={`${
            appointment.status === "Completed"
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : appointment.status === "Confirmed"
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : appointment.status === "Pending"
                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
          }`}
        >
          {appointment.status}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {appointment.status !== "Completed" && (
              <>
                <DropdownMenuItem
                  onClick={() => handleReschedule(appointment.id)}
                  className="cursor-pointer flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  <span>Reschedule</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              onClick={() => handleCancel(appointment.id)}
              className="cursor-pointer flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4" />
              <span>Remove</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )

  const hasResults = filteredUpcoming.length > 0 || filteredCompleted.length > 0

  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
      <CardHeader className="flex items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-gray-600 dark:bg-gray-500 rounded-lg shadow-sm">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            Upcoming Appointments
          </CardTitle>
          <CardDescription className="text-base">Recent upcoming appointments (next 7 days)</CardDescription>
        </div>
        <div className="ml-4 flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/admin/appointments')}>
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by ID, name, date, attorney..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {upcomingAppointments.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Upcoming Appointments</h3>
                <Badge variant="outline" className="text-xs ml-auto">
                  {filteredUpcoming.length}/{upcomingAppointments.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {filteredUpcoming.length > 0 ? (
                  filteredUpcoming.map((appointment) => (
                    <AppointmentEntry key={appointment.id} appointment={appointment} />
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
                    No upcoming appointments match your search
                  </p>
                )}
              </div>
            </div>
          )}

          {completedAppointments.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Finished Appointments</h3>
                <Badge variant="outline" className="text-xs ml-auto">
                  {filteredCompleted.length}/{completedAppointments.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {filteredCompleted.length > 0 ? (
                  filteredCompleted.map((appointment) => (
                    <AppointmentEntry key={appointment.id} appointment={appointment} />
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
                    No finished appointments match your search
                  </p>
                )}
              </div>
            </div>
          )}

          {!hasResults && (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <h3 className="text-gray-600 dark:text-gray-400 font-medium">No appointments yet</h3>
              <p className="text-sm text-gray-500 dark:text-gray-500">Appointments will appear here once scheduled</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
