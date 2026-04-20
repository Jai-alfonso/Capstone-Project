"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  Calendar as CalendarIcon,
  Clock,
  Info,
} from "lucide-react";
import { format, isBefore } from "date-fns";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import AppointmentService from "@/lib/appointment-service";
import { useAuditLogger } from "@/hooks/useAuditLogger";

interface RescheduleAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  currentDate: Date;
  currentTime: string;
  onReschedule: (
    appointmentId: string,
    newDate: Date,
    newTime: string,
    reason: string
  ) => void;
  isClient?: boolean;
  attorneyId?: string;
}

export function RescheduleAppointmentModal({
  isOpen,
  onClose,
  appointmentId,
  currentDate,
  currentTime,
  onReschedule,
  isClient = false,
  attorneyId = "atty.alia_jan_delgado",
}: RescheduleAppointmentModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    currentDate
  );
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [appointmentDetails, setAppointmentDetails] = useState<any>(null);
  const [dateDetails, setDateDetails] = useState<{
    isUnavailable: boolean;
    isFullyUnavailable: boolean;
    reason?: string;
    isHoliday: boolean;
    holidayName?: string;
    unavailableTimeRange?: string;
    unavailableTimeSlots?: string[];
  } | null>(null);
  const [unavailableDates, setUnavailableDates] = useState<Set<string>>(
    new Set()
  );
  const { logAction } = useAuditLogger();

  useEffect(() => {
    if (isOpen && appointmentId) {
      loadAppointmentDetails();
      loadUnavailableDates();
    }
  }, [isOpen, appointmentId]);

  useEffect(() => {
    const loadAvailableTimeSlots = async () => {
      if (!selectedDate) return;

      setIsLoadingSlots(true);
      try {
        const slots = await getAvailableTimeSlots(selectedDate);
        setAvailableTimeSlots(slots);

        if (selectedTime && !slots.includes(selectedTime)) {
          setSelectedTime("");
        }

        await loadDateDetails(selectedDate);
      } catch (error) {
        console.error("Error loading available time slots:", error);
        setAvailableTimeSlots([]);
        setDateDetails(null);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    if (isOpen && selectedDate) {
      loadAvailableTimeSlots();
    }
  }, [isOpen, selectedDate, selectedTime]);

  useEffect(() => {
    if (isOpen) {
      setSelectedDate(currentDate);
      setSelectedTime(currentTime);
      setReason("");
      setError("");
      setDateDetails(null);
    }
  }, [isOpen, currentDate, currentTime]);

  const convertTo24Hour = (time12h: string): string => {
    const [time, modifier] = time12h.split(" ");
    let [hours, minutes] = time.split(":").map(Number);

    if (modifier === "PM" && hours < 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;

    return `${hours.toString().padStart(2, "0")}:${
      minutes?.toString().padStart(2, "0") || "00"
    }`;
  };

  const loadUnavailableDates = async () => {
    try {
      const unavailableSet = new Set<string>();

      const timeSlotsRef = collection(db, "timeSlots");
      const q = query(timeSlotsRef, where("attorneyId", "==", attorneyId));

      const querySnapshot = await getDocs(q);

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.date) {
          if (data.isUnavailable === true) {
            unavailableSet.add(data.date);
          }
        }
      });

      const today = new Date();
      const endDate = new Date(today.getFullYear(), today.getMonth() + 6, 0);

      for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          unavailableSet.add(format(d, "yyyy-MM-dd"));
        }
      }

      setUnavailableDates(unavailableSet);
    } catch (error) {
      console.error("Error loading unavailable dates:", error);
    }
  };

  const loadDateDetails = async (date: Date) => {
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const docId = `${attorneyId}_${dateStr}`;
      const docSnap = await getDoc(doc(db, "timeSlots", docId));

      let details = {
        isUnavailable: false,
        isFullyUnavailable: false,
        reason: undefined as string | undefined,
        isHoliday: false,
        holidayName: undefined as string | undefined,
        unavailableTimeRange: undefined as string | undefined,
        unavailableTimeSlots: [] as string[],
      };

      if (docSnap.exists()) {
        const data = docSnap.data();
        details.isUnavailable = data.isUnavailable || false;
        details.isFullyUnavailable = data.isUnavailable;
        details.reason = data.unavailableReason;
        details.isHoliday = !!data.holidays?.length;
        details.holidayName = data.holidays?.[0]?.name;
        details.unavailableTimeRange = data.unavailableTimeRange;
        details.unavailableTimeSlots = data.unavailableTimeSlots || [];

        if (
          data.unavailableTimeSlots &&
          data.unavailableTimeSlots.length > 0 &&
          !data.isUnavailable
        ) {
          details.isUnavailable = true;
          details.isFullyUnavailable = false;
          details.reason = data.unavailableReason || "Limited availability";
        }
      }

      setDateDetails(details);
    } catch (error) {
      console.error("Error loading date details:", error);
      setDateDetails(null);
    }
  };

  const loadAppointmentDetails = async () => {
    try {
      const details = await AppointmentService.getAppointmentById(
        appointmentId
      );
      if (details) {
        setAppointmentDetails(details);

        await logAction(
          "Open Reschedule Modal",
          `Appointment: ${appointmentId}`,
          `Opened reschedule modal for appointment with ${
            details.client
          } on ${format(new Date(details.date), "MMMM d, yyyy")} at ${
            details.time
          }`,
          "Info"
        );
      }
    } catch (error) {
      console.error("Error loading appointment details:", error);
    }
  };

  const getAvailableTimeSlots = async (date: Date): Promise<string[]> => {
    const dateStr = date.toISOString().split("T")[0];
    const availableSlots: string[] = [];

    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return availableSlots;
    }

    if (unavailableDates.has(dateStr)) {
      return availableSlots;
    }

    const docId = `${attorneyId}_${dateStr}`;
    const docSnap = await getDoc(doc(db, "timeSlots", docId));

    if (docSnap.exists()) {
      const availability = docSnap.data();

      if (availability.isUnavailable) {
        return availableSlots;
      }

      const unavailableSlots = availability.unavailableTimeSlots || [];

      const q = query(
        collection(db, "appointments"),
        where("date", "==", dateStr),
        where("attorneyId", "==", attorneyId),
        where("status", "in", ["pending", "confirmed", "scheduled"])
      );

      const querySnapshot = await getDocs(q);
      const bookedSlots: Record<string, boolean> = {};

      querySnapshot.forEach((doc) => {
        const appointment = doc.data();
        if (doc.id !== appointmentId) {
          const appointmentTime = appointment.time || appointment.startTime;
          if (appointmentTime) {
            bookedSlots[appointmentTime] = true;
          }
        }
      });

      const DEFAULT_TIME_SLOTS = [
        "9:00 AM",
        "10:00 AM",
        "11:00 AM",
        "12:00 PM",
        "1:00 PM",
        "2:00 PM",
        "3:00 PM",
        "4:00 PM",
        "5:00 PM",
      ];

      DEFAULT_TIME_SLOTS.forEach((slot) => {
        if (!bookedSlots[slot] && !unavailableSlots.includes(slot)) {
          availableSlots.push(slot);
        }
      });
    } else {
      const q = query(
        collection(db, "appointments"),
        where("date", "==", dateStr),
        where("attorneyId", "==", attorneyId),
        where("status", "in", ["pending", "confirmed", "scheduled"])
      );

      const querySnapshot = await getDocs(q);
      const bookedSlots: Record<string, boolean> = {};

      querySnapshot.forEach((doc) => {
        const appointment = doc.data();
        if (doc.id !== appointmentId) {
          const appointmentTime = appointment.time || appointment.startTime;
          if (appointmentTime) {
            bookedSlots[appointmentTime] = true;
          }
        }
      });

      const DEFAULT_TIME_SLOTS = [
        "9:00 AM",
        "10:00 AM",
        "11:00 AM",
        "12:00 PM",
        "1:00 PM",
        "2:00 PM",
        "3:00 PM",
        "4:00 PM",
        "5:00 PM",
      ];

      DEFAULT_TIME_SLOTS.forEach((slot) => {
        if (!bookedSlots[slot]) {
          availableSlots.push(slot);
        }
      });
    }

    return availableSlots;
  };

  const handleSubmit = async () => {
    setError("");

    if (!selectedDate) {
      setError("Please select a new date");
      return;
    }

    if (!selectedTime) {
      setError("Please select a new time");
      return;
    }

    if (!reason.trim()) {
      setError("Please provide a reason for rescheduling");
      return;
    }

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const docId = `${attorneyId}_${dateStr}`;
    const docSnap = await getDoc(doc(db, "timeSlots", docId));

    if (docSnap.exists()) {
      const data = docSnap.data();

      if (data.isUnavailable) {
        setError(
          data.unavailableReason ||
            "Attorney is unavailable on this date. Please select another date."
        );

        await logAction(
          "Reschedule Attempt Failed - Date Unavailable",
          `Appointment: ${appointmentId}`,
          `Attempted to reschedule to unavailable date: ${dateStr}. Reason: ${data.unavailableReason}`,
          "Warning"
        );
        return;
      }

      const unavailableSlots = data.unavailableTimeSlots || [];
      if (unavailableSlots.includes(selectedTime)) {
        setError(
          `The selected time (${selectedTime}) is marked as unavailable by the attorney. Please select a different time.`
        );

        await logAction(
          "Reschedule Attempt Failed - Time Unavailable",
          `Appointment: ${appointmentId}`,
          `Attempted to reschedule to unavailable time: ${selectedTime} on ${dateStr}`,
          "Warning"
        );
        return;
      }
    }

    const slots = await getAvailableTimeSlots(selectedDate);
    if (!slots.includes(selectedTime)) {
      setError("This time slot is no longer available");

      await logAction(
        "Reschedule Attempt Failed",
        `Appointment: ${appointmentId}`,
        `Attempted to reschedule to unavailable slot: ${format(
          selectedDate,
          "MMMM d, yyyy"
        )} at ${selectedTime}`,
        "Warning"
      );
      return;
    }

    try {
      await logAction(
        "Submit Reschedule Request",
        `Appointment: ${appointmentId}`,
        `Requested reschedule from ${format(
          currentDate,
          "MMMM d, yyyy"
        )} at ${currentTime} to ${format(
          selectedDate,
          "MMMM d, yyyy"
        )} at ${selectedTime}. Reason: ${reason}`,
        "Info",
        {
          appointmentId,
          currentDate: currentDate.toISOString(),
          currentTime,
          newDate: selectedDate.toISOString(),
          newTime: selectedTime,
          reason,
          initiatedBy: isClient ? "Client" : "Admin",
        }
      );

      onReschedule(appointmentId, selectedDate, selectedTime, reason);
      handleClose();
    } catch (error) {
      console.error("Error submitting reschedule:", error);
      setError("Failed to submit reschedule request");

      await logAction(
        "Reschedule Submission Error",
        `Appointment: ${appointmentId}`,
        `Failed to submit reschedule request: ${error}`,
        "Critical"
      );
    }
  };

  const handleClose = () => {
    if (isOpen && appointmentDetails) {
      logAction(
        "Close Reschedule Modal",
        `Appointment: ${appointmentId}`,
        `Closed reschedule modal without submitting`,
        "Info"
      );
    }

    setSelectedDate(currentDate);
    setSelectedTime("");
    setReason("");
    setError("");
    setAvailableTimeSlots([]);
    setAppointmentDetails(null);
    setDateDetails(null);
    onClose();
  };

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    if (dateOnly < today) {
      return true;
    }

    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return true;
    }

    const dateStr = date.toISOString().split("T")[0];
    if (unavailableDates.has(dateStr)) {
      return true;
    }

    return false;
  };

  const generateFallbackTimeSlots = (): string[] => {
    const slots: string[] = [];
    const startHour = 9;
    const endHour = 17;

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        const period = hour >= 12 ? "PM" : "AM";
        const timeString = `${hour12}:${minute
          .toString()
          .padStart(2, "0")} ${period}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  const renderDateInfo = () => {
    if (!selectedDate || !dateDetails) return null;

    if (dateDetails.isFullyUnavailable || dateDetails.isHoliday) {
      return (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                {dateDetails.isHoliday
                  ? "Philippine Holiday"
                  : "Date Unavailable"}
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                {dateDetails.holidayName ||
                  dateDetails.reason ||
                  "Attorney is unavailable on this date"}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                No time slots are available for rescheduling.
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (dateDetails.isUnavailable && !dateDetails.isFullyUnavailable) {
      return (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 mb-3">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                Limited Availability
              </p>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                {dateDetails.reason ||
                  "Attorney has limited availability on this date"}
              </p>
              {dateDetails.unavailableTimeRange && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  Unavailable: {dateDetails.unavailableTimeRange}
                </p>
              )}
              {dateDetails.unavailableTimeSlots &&
                dateDetails.unavailableTimeSlots.length > 0 && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    Unavailable times:{" "}
                    {dateDetails.unavailableTimeSlots.join(", ")}
                  </p>
                )}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const timeSlots =
    availableTimeSlots.length > 0
      ? availableTimeSlots
      : selectedDate && !isDateDisabled(selectedDate)
      ? generateFallbackTimeSlots()
      : [];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-6 w-6" />
            Reschedule Appointment
            {appointmentDetails && (
              <span className="text-sm font-normal text-gray-500">
                • {appointmentDetails.client}
              </span>
            )}
          </DialogTitle>
          <div className="space-y-1 mt-2">
            <p className="text-sm text-gray-600">
              Select a new date and time for your appointment.
            </p>
            <p className="font-medium text-gray-700 dark:text-gray-300">
              Current appointment: {format(currentDate, "MMMM d, yyyy")} at{" "}
              {currentTime}
            </p>
            {appointmentDetails && (
              <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <p className="text-sm">
                  <strong>Type:</strong>{" "}
                  {appointmentDetails.type || "Consultation"}
                </p>
                {appointmentDetails.consultationType && (
                  <p className="text-sm">
                    <strong>Mode:</strong>{" "}
                    {appointmentDetails.consultationType === "online"
                      ? "Virtual"
                      : "In-person"}
                  </p>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                  Error
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {error}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Select New Date
            </Label>

            {renderDateInfo()}

            <div className="border rounded-lg p-4 bg-white dark:bg-gray-800">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={isDateDisabled}
                modifiers={{
                  unavailable: (date) => {
                    const dateStr = date.toISOString().split("T")[0];
                    return unavailableDates.has(dateStr);
                  },
                  weekend: (date) => date.getDay() === 0 || date.getDay() === 6,
                }}
                modifiersStyles={{
                  unavailable: {
                    backgroundColor: "#fee2e2",
                    color: "#dc2626",
                    fontWeight: "bold",
                    textDecoration: "line-through",
                  },
                  weekend: {
                    backgroundColor: "#f3f4f6",
                    color: "#9ca3af",
                  },
                }}
                className="rounded-md"
              />
            </div>
            <div className="text-sm text-gray-500 space-y-1">
              <p className="flex items-center gap-2">
                <span className="h-2 w-2 bg-red-500 rounded-full"></span>
                <span>Dates marked in red are unavailable</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="h-2 w-2 bg-gray-400 rounded-full"></span>
                <span>Weekends are automatically unavailable</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="h-2 w-2 bg-orange-500 rounded-full"></span>
                <span>Orange indicates partial day unavailability</span>
              </p>
              <p>• Dates in the past are disabled</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Select New Time
              </Label>
              {isLoadingSlots && (
                <span className="text-sm text-gray-500">
                  Loading available slots...
                </span>
              )}
            </div>

            {/* Show date availability warning */}
            {selectedDate && dateDetails?.isUnavailable && (
              <div className="mb-3">
                {dateDetails.isFullyUnavailable ? (
                  <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700 dark:text-red-300">
                      <strong>Note:</strong> This date is fully unavailable. No
                      time slots can be selected.
                    </p>
                  </div>
                ) : (
                  <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 rounded-lg p-3">
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      <strong>Note:</strong> Some time slots are unavailable due
                      to:{" "}
                      {dateDetails.reason || "attorney's limited availability"}
                    </p>
                  </div>
                )}
              </div>
            )}

            <Select
              value={selectedTime}
              onValueChange={setSelectedTime}
              disabled={
                !selectedDate ||
                isLoadingSlots ||
                isDateDisabled(selectedDate) ||
                dateDetails?.isFullyUnavailable
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    !selectedDate
                      ? "Select a date first"
                      : isLoadingSlots
                      ? "Loading available times..."
                      : dateDetails?.isFullyUnavailable
                      ? "Date is fully unavailable"
                      : "Choose time slot"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    {isDateDisabled(selectedDate!)
                      ? "Date is not available"
                      : dateDetails?.isFullyUnavailable
                      ? "Date is fully unavailable"
                      : "No time slots available for this date"}
                  </div>
                ) : (
                  timeSlots.map((time) => {
                    const isUnavailableSlot =
                      dateDetails?.unavailableTimeSlots?.includes(time);

                    return (
                      <SelectItem
                        key={time}
                        value={time}
                        disabled={isUnavailableSlot}
                        className={
                          isUnavailableSlot ? "text-gray-400 line-through" : ""
                        }
                      >
                        {time}
                        {isUnavailableSlot && " (Unavailable)"}
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>

            {selectedDate &&
              timeSlots.length === 0 &&
              !isLoadingSlots &&
              !isDateDisabled(selectedDate) &&
              !dateDetails?.isFullyUnavailable && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>No available time slots</strong> for{" "}
                    {format(selectedDate, "MMMM d, yyyy")}. Please select a
                    different date or contact the office for assistance.
                  </p>
                </div>
              )}
          </div>

          <div className="space-y-3">
            <Label htmlFor="reason" className="text-base font-semibold">
              Reason for Rescheduling
            </Label>
            <Textarea
              id="reason"
              placeholder="Please provide a reason for rescheduling this appointment..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="resize-none"
            />
            {isClient ? (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Important Note:</strong> Rescheduling of scheduled
                  appointments should only be for emergency reasons. The law
                  office reserves the right to accept or decline your
                  rescheduling request.
                </p>
              </div>
            ) : (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <strong>Admin Note:</strong> This reschedule will be logged in
                  the system and the client will be notified automatically.
                </p>
              </div>
            )}
          </div>

          {selectedDate && selectedTime && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Reschedule Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-gray-500">Current Appointment</p>
                  <p className="font-medium">
                    {format(currentDate, "MMMM d, yyyy")} at {currentTime}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">New Appointment</p>
                  <p className="font-medium text-green-600">
                    {format(selectedDate, "MMMM d, yyyy")} at {selectedTime}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={
                !selectedDate ||
                !selectedTime ||
                !reason.trim() ||
                isLoadingSlots ||
                dateDetails?.isFullyUnavailable
              }
            >
              Submit Reschedule Request
            </Button>
            <Button onClick={handleClose} variant="outline" className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
