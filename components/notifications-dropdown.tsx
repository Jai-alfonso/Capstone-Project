"use client"

import { useState } from "react"
import { Bell, X, MessageSquare, Users, Calendar, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Notification {
  id: string
  type: "message" | "appointment" | "client" | "system" | "alert"
  title: string
  message: string
  timestamp: string
  read: boolean
  color: string
}

export function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "message",
      title: "Message Reply",
      message: "Attorney Delgado replied to your message",
      timestamp: "5 minutes ago",
      read: false,
      color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    },
    {
      id: "2",
      type: "appointment",
      title: "Appointment Rescheduled",
      message: "Your appointment on Dec 1, 2024 has been rescheduled by admin",
      timestamp: "30 minutes ago",
      read: false,
      color: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
    },
    {
      id: "3",
      type: "appointment",
      title: "Appointment Canceled",
      message: "Your appointment on Nov 28, 2024 has been canceled by admin",
      timestamp: "1 hour ago",
      read: false,
      color: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    },
    {
      id: "4",
      type: "appointment",
      title: "Appointment Completed",
      message: "Your appointment on Nov 25, 2024 has been marked as completed",
      timestamp: "2 hours ago",
      read: true,
      color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    },
    {
      id: "5",
      type: "appointment",
      title: "Case Type Changed",
      message: "Your appointment has been changed to Complex Case consultation",
      timestamp: "3 hours ago",
      read: true,
      color: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
    },
  ])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = (id: string) => {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })))
  }

  const removeNotification = (id: string) => {
    setNotifications(notifications.filter((n) => n.id !== id))
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "message":
        return <MessageSquare className="h-4 w-4" />
      case "appointment":
        return <Calendar className="h-4 w-4" />
      case "client":
        return <Users className="h-4 w-4" />
      case "alert":
        return <CheckCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-white hover:bg-red-500/20 p-2 rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-lg relative"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
              {unreadCount > 0 && <p className="text-xs text-gray-600 dark:text-gray-400">{unreadCount} unread</p>}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Notifications List */}
          <ScrollArea className="h-96">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <Bell className="h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">No notifications</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${
                      !notification.read ? "bg-blue-50 dark:bg-blue-900/10" : ""
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex gap-3">
                      <div className={`flex-shrink-0 p-2 rounded-lg ${notification.color}`}>
                        {getTypeIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">{notification.title}</h4>
                          {!notification.read && (
                            <div className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full mt-1"></div>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">{notification.timestamp}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeNotification(notification.id)
                        }}
                        className="h-5 w-5 p-0 hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs bg-transparent"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
              >
                Mark all as read
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs bg-transparent"
                onClick={() => setIsOpen(false)}
              >
                Close
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Backdrop */}
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
    </div>
  )
}
