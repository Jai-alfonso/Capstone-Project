"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { AdminDashboardLayout } from "@/components/admin-dashboard-layout"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Plus, Calendar as CalendarIcon, Clock, XCircle, Edit2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface AvailabilityEntry {
  id: string
  date: string
  isAvailable: boolean
  reason?: string
  timeRange?: string
  isFullDay: boolean
  blockedSlots?: string[]
  createdAt: string
}

const timeSlots = [
  "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"
]

export default function AttorneyAvailabilityPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [availabilityEntries, setAvailabilityEntries] = useState<AvailabilityEntry[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingEntry, setEditingEntry] = useState<AvailabilityEntry | null>(null)
  const [formData, setFormData] = useState({
    date: "",
    isAvailable: true,
    reason: "",
    timeRange: "",
    isFullDay: true,
    blockedSlots: [] as string[]
  })

  useEffect(() => {
    loadAvailability()
  }, [])

  const loadAvailability = () => {
    const saved = localStorage.getItem("attorneyAvailability")
    if (saved) {
      setAvailabilityEntries(JSON.parse(saved))
    }
  }

  const saveAvailability = (entries: AvailabilityEntry[]) => {
    localStorage.setItem("attorneyAvailability", JSON.stringify(entries))
    setAvailabilityEntries(entries)
  }

  const handleAddAvailability = () => {
    if (!formData.date) {
      toast({
        title: "Error",
        description: "Please select a date",
        variant: "destructive"
      })
      return
    }

    if (!formData.isAvailable && !formData.reason) {
      toast({
        title: "Error",
        description: "Please provide a reason for unavailability",
        variant: "destructive"
      })
      return
    }

    const newEntry: AvailabilityEntry = {
      id: Date.now().toString(),
      date: formData.date,
      isAvailable: formData.isAvailable,
      reason: formData.reason,
      timeRange: formData.timeRange,
      isFullDay: formData.isFullDay,
      blockedSlots: formData.blockedSlots,
      createdAt: new Date().toISOString()
    }

    saveAvailability([...availabilityEntries, newEntry])
    resetForm()
    setIsAddDialogOpen(false)
    
    toast({
      title: "Success",
      description: "Availability updated successfully"
    })
  }

  const handleUpdateAvailability = () => {
    if (!editingEntry) return

    const updated = availabilityEntries.map(entry => 
      entry.id === editingEntry.id 
        ? { 
            ...entry, 
            isAvailable: formData.isAvailable,
            reason: formData.reason,
            timeRange: formData.timeRange,
            isFullDay: formData.isFullDay,
            blockedSlots: formData.blockedSlots
          }
        : entry
    )

    saveAvailability(updated)
    setIsEditMode(false)
    setEditingEntry(null)
    resetForm()
    
    toast({
      title: "Success",
      description: "Availability updated successfully"
    })
  }

  const handleDeleteAvailability = (id: string) => {
    const updated = availabilityEntries.filter(entry => entry.id !== id)
    saveAvailability(updated)
    
    toast({
      title: "Success",
      description: "Availability entry deleted"
    })
  }

  const handleEditEntry = (entry: AvailabilityEntry) => {
    setEditingEntry(entry)
    setFormData({
      date: entry.date,
      isAvailable: entry.isAvailable,
      reason: entry.reason || "",
      timeRange: entry.timeRange || "",
      isFullDay: entry.isFullDay,
      blockedSlots: entry.blockedSlots || []
    })
    setIsEditMode(true)
  }

  const resetForm = () => {
    setFormData({
      date: "",
      isAvailable: true,
      reason: "",
      timeRange: "",
      isFullDay: true,
      blockedSlots: []
    })
  }

  const toggleBlockedSlot = (slot: string) => {
    setFormData(prev => ({
      ...prev,
      blockedSlots: prev.blockedSlots.includes(slot)
        ? prev.blockedSlots.filter(s => s !== slot)
        : [...prev.blockedSlots, slot]
    }))
  }

  const getEntriesForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return availabilityEntries.filter(entry => entry.date === dateStr)
  }

  const isDateUnavailable = (date: Date) => {
    const entries = getEntriesForDate(date)
    return entries.some(entry => !entry.isAvailable && entry.isFullDay)
  }

  const selectedDateEntries = selectedDate ? getEntriesForDate(selectedDate) : []

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-playfair text-navy-900 dark:text-white">
              Attorney Availability
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage attorney schedule and availability
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Availability Entry
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calendar */}
          <Card>
            <CardHeader>
              <CardTitle>Calendar View</CardTitle>
              <CardDescription>Click on a date to view or manage availability</CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                modifiers={{
                  unavailable: (date) => isDateUnavailable(date)
                }}
                modifiersStyles={{
                  unavailable: {
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    fontWeight: 'bold'
                  }
                }}
              />
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  <span className="inline-block w-4 h-4 bg-red-200 rounded mr-2"></span>
                  Red dates indicate unavailability
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Selected Date Info */}
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedDate ? selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) : "Select a date"}
              </CardTitle>
              <CardDescription>Availability details for selected date</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedDateEntries.length > 0 ? (
                <div className="space-y-3">
                  {selectedDateEntries.map((entry) => (
                    <div key={entry.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={entry.isAvailable ? "default" : "destructive"}>
                            {entry.isAvailable ? "Available" : "Unavailable"}
                          </Badge>
                          {entry.isFullDay && (
                            <Badge variant="outline">Full Day</Badge>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditEntry(entry)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteAvailability(entry.id)}
                          >
                            <XCircle className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>

                      {entry.reason && (
                        <div className="mb-2">
                          <Label className="text-xs text-gray-500">Reason</Label>
                          <p className="text-sm font-medium">{entry.reason}</p>
                        </div>
                      )}

                      {entry.timeRange && (
                        <div className="mb-2">
                          <Label className="text-xs text-gray-500">Time Range</Label>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4" />
                            <span>{entry.timeRange}</span>
                          </div>
                        </div>
                      )}

                      {entry.blockedSlots && entry.blockedSlots.length > 0 && (
                        <div>
                          <Label className="text-xs text-gray-500">Blocked Time Slots</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {entry.blockedSlots.map((slot) => (
                              <Badge key={slot} variant="secondary" className="text-xs">
                                {slot}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-gray-500 mt-3">
                        Created: {new Date(entry.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No availability entries for this date</p>
                  <p className="text-sm mt-1">Attorney is available by default</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* All Entries List */}
        <Card>
          <CardHeader>
            <CardTitle>All Availability Entries</CardTitle>
            <CardDescription>Complete list of availability modifications</CardDescription>
          </CardHeader>
          <CardContent>
            {availabilityEntries.length > 0 ? (
              <div className="space-y-2">
                {availabilityEntries
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                      <div className="flex items-center gap-3">
                        <CalendarIcon className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="font-medium">
                            {new Date(entry.date).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </p>
                          {entry.reason && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">{entry.reason}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={entry.isAvailable ? "default" : "destructive"}>
                          {entry.isAvailable ? "Available" : "Unavailable"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditEntry(entry)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAvailability(entry.id)}
                        >
                          <XCircle className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No availability entries yet</p>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={isAddDialogOpen || isEditMode} onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false)
            setIsEditMode(false)
            setEditingEntry(null)
            resetForm()
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{isEditMode ? "Edit" : "Add"} Availability Entry</DialogTitle>
              <DialogDescription>
                {isEditMode ? "Update the" : "Set the"} attorney's availability for a specific date
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  disabled={isEditMode}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.isAvailable}
                  onCheckedChange={(checked) => setFormData({ ...formData, isAvailable: checked })}
                />
                <Label>{formData.isAvailable ? "Available" : "Unavailable"}</Label>
              </div>

              {!formData.isAvailable && (
                <>
                  <div className="space-y-2">
                    <Label>Reason for Unavailability *</Label>
                    <Input
                      placeholder="e.g., Court Hearing, Conference, Personal Leave"
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.isFullDay}
                      onCheckedChange={(checked) => setFormData({ ...formData, isFullDay: checked })}
                    />
                    <Label>Full Day Unavailability</Label>
                  </div>

                  {!formData.isFullDay && (
                    <>
                      <div className="space-y-2">
                        <Label>Time Range</Label>
                        <Input
                          placeholder="e.g., 9:00 AM to 12:00 PM"
                          value={formData.timeRange}
                          onChange={(e) => setFormData({ ...formData, timeRange: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Blocked Time Slots</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {timeSlots.map((slot) => (
                            <Button
                              key={slot}
                              type="button"
                              variant={formData.blockedSlots.includes(slot) ? "default" : "outline"}
                              size="sm"
                              onClick={() => toggleBlockedSlot(slot)}
                            >
                              {slot}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsAddDialogOpen(false)
                  setIsEditMode(false)
                  setEditingEntry(null)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button onClick={isEditMode ? handleUpdateAvailability : handleAddAvailability}>
                {isEditMode ? "Update" : "Add"} Entry
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminDashboardLayout>
  )
}
