"use client";

import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { AlertCircle, Calendar as CalendarIcon } from "lucide-react";
import { isPhilippineHoliday, getHolidayName } from "@/lib/philippine-holidays";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { useToast } from "@/hooks/use-toast";

interface AppointmentSlot {
  id: string;
  time: string;
  title: string;
  status: "available" | "booked";
  type?: "morning" | "afternoon";
}

interface AvailabilityEntry {
  id: string;
  date: string;
  reason: string;
  timeRange: string;
  createdAt: string;
  createdBy?: string;
}

interface CalendarProps {
  appointments?: any[];
  onDateSelect?: (date: Date, time?: string) => void;
  onSlotSelect?: (date: Date, time: string) => void;
  selectedTime?: string;
  isAdmin?: boolean;
}

export function AppointmentCalendar({
  appointments = [],
  onDateSelect,
  onSlotSelect,
  selectedTime,
  isAdmin = false,
}: CalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [availabilityEntries, setAvailabilityEntries] = useState<
    AvailabilityEntry[]
  >([]);
  const [loading, setLoading] = useState(false);
  const { logAction } = useAuditLogger();
  const { toast } = useToast();

  useEffect(() => {
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    try {
      setLoading(true);
      const saved = localStorage.getItem("attorneyAvailability");
      if (saved) {
        const entries = JSON.parse(saved);
        setAvailabilityEntries(entries);

        await logAction(
          "Load Availability",
          "Appointment Calendar",
          `Loaded ${entries.length} availability entries`,
          "Info",
          { entriesCount: entries.length, isAdmin }
        );
      }
    } catch (error) {
      console.error("Error loading availability:", error);

      await logAction(
        "Availability Load Error",
        "Appointment Calendar",
        `Failed to load availability: ${error}`,
        "Warning"
      );
    } finally {
      setLoading(false);
    }
  };

  const getUnavailabilityForDate = (
    date: Date
  ): AvailabilityEntry | undefined => {
    const dateStr = date.toISOString().split("T")[0];
    return availabilityEntries.find((entry) => entry.date === dateStr);
  };

  const isDateUnavailable = (date: Date): boolean => {
    if (isPhilippineHoliday(date)) {
      return true;
    }

    return !!getUnavailabilityForDate(date);
  };

  const getUnavailabilityReason = (
    date: Date
  ): {
    reason: string;
    timeRange: string;
    isHoliday: boolean;
    entry?: AvailabilityEntry;
  } | null => {
    const holidayName = getHolidayName(date);
    if (holidayName) {
      return {
        reason: holidayName,
        timeRange: "All Day",
        isHoliday: true,
      };
    }

    const unavailability = getUnavailabilityForDate(date);
    if (unavailability) {
      return {
        reason: unavailability.reason,
        timeRange: unavailability.timeRange,
        isHoliday: false,
        entry: unavailability,
      };
    }

    return null;
  };

  const handleDateSelect = async (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      onDateSelect?.(date);

      await logAction(
        "Select Date",
        "Appointment Calendar",
        `Selected date: ${format(date, "MMMM d, yyyy")}`,
        "Info",
        { date: date.toISOString(), isAdmin }
      );
    }
  };

  const handleTimeSlotClick = async (time: string) => {
    if (onSlotSelect) {
      onSlotSelect(selectedDate, time);

      await logAction(
        "Select Time Slot",
        "Appointment Calendar",
        `Selected time slot: ${time} on ${format(
          selectedDate,
          "MMMM d, yyyy"
        )}`,
        "Info",
        { date: selectedDate.toISOString(), time, isAdmin }
      );
    }
  };

  const appointmentSlots: AppointmentSlot[] = [
    {
      id: "1",
      time: "9:00 AM",
      title: "Morning Available",
      status: "available",
      type: "morning",
    },
    {
      id: "2",
      time: "10:00 AM",
      title: "Morning Available",
      status: "available",
      type: "morning",
    },
    {
      id: "3",
      time: "11:00 AM",
      title: "Morning Available",
      status: "available",
      type: "morning",
    },
    {
      id: "4",
      time: "1:00 PM",
      title: "Afternoon Available",
      status: "available",
      type: "afternoon",
    },
    {
      id: "5",
      time: "2:00 PM",
      title: "Afternoon Available",
      status: "available",
      type: "afternoon",
    },
    {
      id: "6",
      time: "3:00 PM",
      title: "Afternoon Available",
      status: "available",
      type: "afternoon",
    },
    {
      id: "7",
      time: "4:00 PM",
      title: "Afternoon Available",
      status: "available",
      type: "afternoon",
    },
  ];

  const morningSlots = appointmentSlots.filter(
    (slot) => slot.type === "morning"
  );
  const afternoonSlots = appointmentSlots.filter(
    (slot) => slot.type === "afternoon"
  );

  const selectedDateUnavailabilityInfo = getUnavailabilityReason(selectedDate);

  const isSlotBooked = (time: string): boolean => {
    if (!appointments || appointments.length === 0) return false;

    const dateStr = selectedDate.toISOString().split("T")[0];
    return appointments.some(
      (appointment) =>
        appointment.date === dateStr &&
        appointment.time === time &&
        appointment.status !== "cancelled"
    );
  };

  const getBookedAppointment = (time: string) => {
    if (!appointments || appointments.length === 0) return null;

    const dateStr = selectedDate.toISOString().split("T")[0];
    return appointments.find(
      (appointment) =>
        appointment.date === dateStr &&
        appointment.time === time &&
        appointment.status !== "cancelled"
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar Section */}
      <Card className="lg:col-span-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm h-fit">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Calendar</CardTitle>
              <CardDescription className="text-sm">
                {format(currentMonth, "MMMM yyyy")}
              </CardDescription>
            </div>
            {isAdmin && (
              <Badge variant="outline" className="text-xs">
                Admin View
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              className="rounded-md border-0"
              modifiers={{
                unavailable: (date) => isDateUnavailable(date),
                today: (date) => {
                  const today = new Date();
                  return (
                    date.getDate() === today.getDate() &&
                    date.getMonth() === today.getMonth() &&
                    date.getFullYear() === today.getFullYear()
                  );
                },
              }}
              modifiersClassNames={{
                unavailable:
                  "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 line-through relative",
                today:
                  "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800",
              }}
              components={{
                DayContent: ({ date }) => {
                  const isUnavailable = isDateUnavailable(date);
                  const isHoliday = isPhilippineHoliday(date);
                  const isToday =
                    date.getDate() === new Date().getDate() &&
                    date.getMonth() === new Date().getMonth() &&
                    date.getFullYear() === new Date().getFullYear();

                  return (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <span className={isToday ? "font-bold" : ""}>
                        {format(date, "d")}
                      </span>
                      {isUnavailable && !isToday && (
                        <div
                          className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full ${
                            isHoliday ? "bg-orange-500" : "bg-red-500"
                          }`}
                        ></div>
                      )}
                    </div>
                  );
                },
              }}
            />
          </div>
          <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-gray-600 dark:text-gray-400">
                Attorney unavailable
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span className="text-gray-600 dark:text-gray-400">
                Philippine Holiday
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-gray-600 dark:text-gray-400">Today</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Section */}
      <Card className="lg:col-span-2 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                {format(selectedDate, "MMMM d, yyyy")}
              </CardTitle>
              <CardDescription>
                {selectedDateUnavailabilityInfo
                  ? selectedDateUnavailabilityInfo.isHoliday
                    ? "Philippine Holiday"
                    : "Attorney Unavailable"
                  : "Available time slots"}
              </CardDescription>
            </div>
            {loading && (
              <Badge variant="outline" className="animate-pulse">
                Loading...
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {selectedDateUnavailabilityInfo ? (
            <div
              className={`p-6 border-2 rounded-lg ${
                selectedDateUnavailabilityInfo.isHoliday
                  ? "border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20"
                  : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
              }`}
            >
              <div className="flex items-start gap-3">
                <AlertCircle
                  className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                    selectedDateUnavailabilityInfo.isHoliday
                      ? "text-orange-600 dark:text-orange-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                />
                <div className="flex-1">
                  <h3
                    className={`font-semibold mb-2 ${
                      selectedDateUnavailabilityInfo.isHoliday
                        ? "text-orange-900 dark:text-orange-100"
                        : "text-red-900 dark:text-red-100"
                    }`}
                  >
                    {selectedDateUnavailabilityInfo.isHoliday
                      ? "Philippine Holiday - Office Closed"
                      : "Attorney Unavailable"}
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <Badge
                        className={`mb-2 ${
                          selectedDateUnavailabilityInfo.isHoliday
                            ? "bg-orange-500 hover:bg-orange-600"
                            : "bg-red-500 hover:bg-red-600"
                        }`}
                      >
                        {selectedDateUnavailabilityInfo.reason}
                      </Badge>
                      <p
                        className={`text-sm ${
                          selectedDateUnavailabilityInfo.isHoliday
                            ? "text-orange-700 dark:text-orange-300"
                            : "text-red-700 dark:text-red-300"
                        }`}
                      >
                        <strong>Time:</strong>{" "}
                        {selectedDateUnavailabilityInfo.timeRange}
                      </p>
                      {selectedDateUnavailabilityInfo.entry?.createdBy && (
                        <p
                          className={`text-xs mt-1 ${
                            selectedDateUnavailabilityInfo.isHoliday
                              ? "text-orange-600 dark:text-orange-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          <strong>Marked by:</strong>{" "}
                          {selectedDateUnavailabilityInfo.entry.createdBy}
                        </p>
                      )}
                    </div>
                    <p
                      className={`text-xs mt-3 ${
                        selectedDateUnavailabilityInfo.isHoliday
                          ? "text-orange-600 dark:text-orange-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {selectedDateUnavailabilityInfo.isHoliday
                        ? "The law office is closed on Philippine holidays. Please select another date for your appointment."
                        : "Please select another date for your appointment."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Morning Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Morning (9:00 AM - 12:00 PM)
                  </h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-2 gap-3">
                  {morningSlots.map((slot) => {
                    const isBooked = isSlotBooked(slot.time);
                    const appointment = isBooked
                      ? getBookedAppointment(slot.time)
                      : null;

                    return (
                      <Button
                        key={slot.id}
                        variant={
                          isBooked
                            ? "outline"
                            : selectedTime === slot.time
                            ? "default"
                            : "outline"
                        }
                        className={`w-full relative transition-all duration-200 ${
                          isBooked
                            ? "border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40"
                            : selectedTime === slot.time
                            ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                            : "border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 bg-gray-50 dark:bg-gray-700"
                        }`}
                        disabled={isBooked}
                        onClick={() => handleTimeSlotClick(slot.time)}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-medium text-sm">
                            {slot.time}
                          </span>
                          <span
                            className={`text-xs ${
                              isBooked
                                ? "text-red-600 dark:text-red-400"
                                : selectedTime === slot.time
                                ? "text-blue-100"
                                : "text-gray-600 dark:text-gray-400"
                            }`}
                          >
                            {isBooked
                              ? `Booked - ${appointment?.client || "Client"}`
                              : "Available"}
                          </span>
                          {isBooked && appointment?.type && (
                            <Badge
                              variant="outline"
                              className="text-xs mt-1 bg-white dark:bg-gray-800"
                            >
                              {appointment.type}
                            </Badge>
                          )}
                        </div>
                        {isBooked && (
                          <div className="absolute -top-1 -right-1">
                            <CalendarIcon className="h-4 w-4 text-red-500" />
                          </div>
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Afternoon Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Afternoon (1:00 PM - 5:00 PM)
                  </h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-2 gap-3">
                  {afternoonSlots.map((slot) => {
                    const isBooked = isSlotBooked(slot.time);
                    const appointment = isBooked
                      ? getBookedAppointment(slot.time)
                      : null;

                    return (
                      <Button
                        key={slot.id}
                        variant={
                          isBooked
                            ? "outline"
                            : selectedTime === slot.time
                            ? "default"
                            : "outline"
                        }
                        className={`w-full relative transition-all duration-200 ${
                          isBooked
                            ? "border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40"
                            : selectedTime === slot.time
                            ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                            : "border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 bg-gray-50 dark:bg-gray-700"
                        }`}
                        disabled={isBooked}
                        onClick={() => handleTimeSlotClick(slot.time)}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-medium text-sm">
                            {slot.time}
                          </span>
                          <span
                            className={`text-xs ${
                              isBooked
                                ? "text-red-600 dark:text-red-400"
                                : selectedTime === slot.time
                                ? "text-blue-100"
                                : "text-gray-600 dark:text-gray-400"
                            }`}
                          >
                            {isBooked
                              ? `Booked - ${appointment?.client || "Client"}`
                              : "Available"}
                          </span>
                          {isBooked && appointment?.type && (
                            <Badge
                              variant="outline"
                              className="text-xs mt-1 bg-white dark:bg-gray-800"
                            >
                              {appointment.type}
                            </Badge>
                          )}
                        </div>
                        {isBooked && (
                          <div className="absolute -top-1 -right-1">
                            <CalendarIcon className="h-4 w-4 text-red-500" />
                          </div>
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Legend Section */}
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Selected slot
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Booked slot
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-400 rounded-full border border-gray-300"></div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Morning slot
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-indigo-600 rounded-full border border-gray-300"></div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Afternoon slot
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
