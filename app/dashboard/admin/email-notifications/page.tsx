"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AdminDashboardLayout } from "@/components/admin-dashboard-layout"
import { Mail, Trash2, RefreshCw } from "lucide-react"
import { getEmailNotificationHistory, clearEmailNotificationHistory } from "@/lib/email-notifications"

export default function EmailNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = () => {
    const history = getEmailNotificationHistory()
    setNotifications(history.reverse()) // Most recent first
  }

  const handleClearHistory = () => {
    if (confirm("Are you sure you want to clear all email notification history?")) {
      clearEmailNotificationHistory()
      setNotifications([])
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "appointment-confirmation":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "appointment-update":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "appointment-reschedule":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "progress-update":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      case "appointment-cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const formatType = (type: string) => {
    return type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-playfair text-navy-900 dark:text-white">
              Email Notifications
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              View all sent email notifications to clients
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadNotifications}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="destructive" onClick={handleClearHistory}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear History
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{notifications.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Confirmations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {notifications.filter(n => n.type === "appointment-confirmation").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Reschedules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {notifications.filter(n => n.type === "appointment-reschedule").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Progress Updates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {notifications.filter(n => n.type === "progress-update").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notification List */}
        <Card>
          <CardHeader>
            <CardTitle>Notification History</CardTitle>
            <CardDescription>
              All email notifications sent to clients (mock implementation)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {notifications.length > 0 ? (
              <div className="space-y-3">
                {notifications.map((notification, index) => (
                  <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-semibold">{notification.subject}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            To: {notification.to}
                          </p>
                        </div>
                      </div>
                      <Badge className={getTypeColor(notification.type)}>
                        {formatType(notification.type)}
                      </Badge>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 mb-3">
                      <p className="text-sm whitespace-pre-wrap">{notification.body}</p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Sent: {new Date(notification.sentAt).toLocaleString()}</span>
                      <Badge variant="outline" className="text-xs">
                        {notification.status === "sent" ? "✓ Sent" : "Pending"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Mail className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">No email notifications sent yet</p>
                <p className="text-sm text-gray-400 mt-2">
                  Notifications will appear here when you confirm, reschedule, or update appointments
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Note about mock implementation */}
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Mock Email Implementation
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  This is a demonstration of the email notification system. In production, these emails would be sent via 
                  services like SendGrid, AWS SES, or Mailgun. See <code className="bg-blue-100 dark:bg-blue-800 px-1 py-0.5 rounded">lib/email-notifications.ts</code> for integration details.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  )
}
