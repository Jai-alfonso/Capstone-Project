"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bell, Eye } from "lucide-react"
import { useRouter } from "next/navigation"

interface Notification {
  id: string
  type: "profile" | "appointment" | "rescheduling" | "document" | "payment"
  title: string
  description: string
  timestamp: string
  bgColor: string
  borderColor: string
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "profile",
    title: "Profile Update",
    description: "Juan Dela Cruz updated their contact information",
    timestamp: "Today, 10:23 AM",
    bgColor: "bg-yellow-50 dark:bg-yellow-900/10",
    borderColor: "border-l-4 border-yellow-400",
  },
  {
    id: "2",
    type: "appointment",
    title: "Appointment Request",
    description: "New consultation request from Maria Santos",
    timestamp: "Yesterday, 2:45 PM",
    bgColor: "bg-blue-50 dark:bg-blue-900/10",
    borderColor: "border-l-4 border-blue-400",
  },
  {
    id: "3",
    type: "rescheduling",
    title: "Rescheduling Request",
    description: "Pedro Torres requested to reschedule appointment",
    timestamp: "Today, 1:32 AM",
    bgColor: "bg-red-50 dark:bg-red-900/10",
    borderColor: "border-l-4 border-red-400",
  },
]

export function NotificationsCard() {
  const router = useRouter()
  
  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm col-span-1 md:col-span-2 lg:col-span-3">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-gray-600 dark:bg-gray-500 rounded-lg shadow-sm">
                <Bell className="h-5 w-5 text-white" />
              </div>
              Notifications
            </CardTitle>
            <CardDescription className="text-base">System alerts and updates</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/admin/notifications")}
            className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <Eye className="h-4 w-4 mr-1" />
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mockNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg ${notification.bgColor} ${notification.borderColor} transition-all hover:shadow-md`}
            >
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">{notification.title}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{notification.description}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">{notification.timestamp}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
