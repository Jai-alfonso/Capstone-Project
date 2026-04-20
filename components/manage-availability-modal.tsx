"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  XCircle,
  Plus,
  CalendarDays,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, addDays, isPast, startOfDay } from "date-fns";

interface AvailabilityEntry {
  id: string;
  date: string;
  reason: string;
  timeRange: string;
  isFullDay: boolean;
  createdAt: string;
}

interface Holiday {
  date: string;
  name: string;
  type: "regular" | "special" | "observance";
}

interface ManageAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  attorneyId?: string;
}

const timeOptions = [
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

export function ManageAvailabilityModal({
  isOpen,
  onClose,
  onUpdate,
  attorneyId = "atty.alia_jan_delgado",
}: ManageAvailabilityModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [availabilityEntries, setAvailabilityEntries] = useState<
    AvailabilityEntry[]
  >([]);
  const [isAddMode, setIsAddMode] = useState(false);
  const [formData, setFormData] = useState({
    reason: "",
    timeRange: "",
    isFullDay: false,
  });
  const [phHolidays, setPhHolidays] = useState<Holiday[]>([]);
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAvailability();
      loadPhilippineHolidays();
      resetForm();
    }
  }, [isOpen]);

  const loadAvailability = async () => {
    setIsLoading(true);
    try {
      const q = query(
        collection(db, "timeSlots"),
        where("attorneyId", "==", attorneyId)
      );

      const querySnapshot = await getDocs(q);
      const entries: AvailabilityEntry[] = [];
      const seenDates = new Set<string>();

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();

        if (data.isUnavailable || data.unavailableTimeSlots?.length > 0) {
          const dateStr = data.date;

          if (!seenDates.has(dateStr)) {
            seenDates.add(dateStr);

            const isFullDay = data.isUnavailable;
            const timeRange = isFullDay
              ? data.unavailableTimeRange || "All Day"
              : data.unavailableTimeRange ||
                getTimeRangeFromSlots(data.unavailableTimeSlots || []);

            entries.push({
              id: docSnap.id,
              date: dateStr,
              reason: data.unavailableReason || "Unavailable",
              timeRange: timeRange,
              isFullDay: isFullDay,
              createdAt:
                data.createdAt?.toDate().toISOString() ||
                new Date().toISOString(),
            });
          }
        }
      });

      setAvailabilityEntries(entries);
    } catch (error) {
      console.error("Error loading availability:", error);
      toast({
        title: "Error",
        description: "Failed to load availability data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTimeRangeFromSlots = (slots: string[]): string => {
    if (!slots || slots.length === 0) return "All Day";

    const times = slots.map((slot) => {
      const [time, period] = slot.split(" ");
      const [hours, minutes] = time.split(":").map(Number);
      let hour24 = hours;
      if (period === "PM" && hour24 !== 12) hour24 += 12;
      if (period === "AM" && hour24 === 12) hour24 = 0;
      return hour24 * 60 + minutes;
    });

    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    const formatTime = (minutes: number) => {
      const hour24 = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const period = hour24 >= 12 ? "PM" : "AM";
      const hour12 = hour24 % 12 || 12;
      return `${hour12}:${mins.toString().padStart(2, "0")} ${period}`;
    };

    return `${formatTime(minTime)} to ${formatTime(maxTime)}`;
  };

  const loadPhilippineHolidays = async () => {
    setIsLoadingHolidays(true);
    try {
      const year = new Date().getFullYear();
      const response = await fetch(
        `https://date.nager.at/api/v3/publicholidays/${year}/PH`
      );

      if (response.ok) {
        const holidays = await response.json();
        const formattedHolidays: Holiday[] = holidays.map((h: any) => ({
          date: h.date,
          name: h.name,
          type: h.type === "Public" ? "regular" : "observance",
        }));

        const additionalHolidays = getAdditionalPhilippineHolidays(year);

        const allHolidays = [...formattedHolidays, ...additionalHolidays];
        const uniqueHolidays = Array.from(
          new Map(
            allHolidays.map((holiday) => [
              `${holiday.date}-${holiday.name}`,
              holiday,
            ])
          ).values()
        );

        setPhHolidays(uniqueHolidays);
      } else {
        setPhHolidays(getDefaultPhilippineHolidays());
      }
    } catch (error) {
      console.error("Error loading holidays:", error);
      setPhHolidays(getDefaultPhilippineHolidays());
    } finally {
      setIsLoadingHolidays(false);
    }
  };

  const getAdditionalPhilippineHolidays = (year: number): Holiday[] => {
    const holidays: Holiday[] = [];

    const specialDates = [
      { month: 0, day: 1, name: "New Year's Day" },
      { month: 3, day: 9, name: "Araw ng Kagitingan" },
      { month: 4, day: 1, name: "Labor Day" },
      { month: 5, day: 12, name: "Independence Day" },
      { month: 7, day: 21, name: "Ninoy Aquino Day" },
      { month: 7, day: 26, name: "National Heroes Day" },
      { month: 10, day: 1, name: "All Saints' Day" },
      { month: 10, day: 30, name: "Bonifacio Day" },
      { month: 11, day: 25, name: "Christmas Day" },
      { month: 11, day: 30, name: "Rizal Day" },
    ];

    specialDates.forEach((date) => {
      holidays.push({
        date: `${year}-${String(date.month + 1).padStart(2, "0")}-${String(
          date.day
        ).padStart(2, "0")}`,
        name: date.name,
        type: "regular",
      });
    });

    return holidays;
  };

  const getDefaultPhilippineHolidays = (): Holiday[] => {
    const year = new Date().getFullYear();
    return getAdditionalPhilippineHolidays(year);
  };

  const convertTo24Hour = (time12h: string): string => {
    const [time, modifier] = time12h.split(" ");
    let [hours, minutes] = time.split(":").map(Number);

    if (modifier === "PM" && hours < 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;

    return `${hours.toString().padStart(2, "0")}:${
      minutes?.toString().padStart(2, "0") || "00"
    }`;
  };

  const generateTimeSlotsBetween = (
    startTime: string,
    endTime: string
  ): string[] => {
    const slots: string[] = [];

    const start24 = convertTo24Hour(startTime);
    const end24 = convertTo24Hour(endTime);

    const [startHour, startMinute] = start24.split(":").map(Number);
    const [endHour, endMinute] = end24.split(":").map(Number);

    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;

    const businessSlots = [
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

    businessSlots.forEach((slot) => {
      const slot24 = convertTo24Hour(slot);
      const [slotHour, slotMinute] = slot24.split(":").map(Number);
      const slotTotalMinutes = slotHour * 60 + slotMinute;

      if (
        slotTotalMinutes >= startTotalMinutes &&
        slotTotalMinutes < endTotalMinutes
      ) {
        slots.push(slot);
      }
    });

    return slots;
  };

  const saveUnavailability = async () => {
    if (!selectedDate) {
      toast({
        title: "Error",
        description: "Please select a date",
        variant: "destructive",
      });
      return;
    }

    if (!formData.reason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason",
        variant: "destructive",
      });
      return;
    }

    if (!formData.isFullDay && !formData.timeRange.trim()) {
      toast({
        title: "Error",
        description:
          "Please select a time range for partial day unavailability",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const docId = `${attorneyId}_${dateStr}`;

      let unavailableTimeSlots: string[] = [];

      if (!formData.isFullDay) {
        const [startTime, endTime] = formData.timeRange.split(" to ");
        if (startTime && endTime) {
          unavailableTimeSlots = generateTimeSlotsBetween(
            startTime.trim(),
            endTime.trim()
          );
        }
      }

      const appointmentsQuery = query(
        collection(db, "appointments"),
        where("attorneyId", "==", attorneyId),
        where("date", "==", dateStr),
        where("status", "in", ["scheduled", "confirmed", "pending"])
      );

      const appointmentsSnap = await getDocs(appointmentsQuery);

      if (
        !appointmentsSnap.empty &&
        !formData.isFullDay &&
        unavailableTimeSlots.length > 0
      ) {
        const appointments = appointmentsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const conflictingAppointments = appointments.filter((apt: any) => {
          return unavailableTimeSlots.includes(apt.time);
        });

        if (conflictingAppointments.length > 0) {
          const hasConfirmed = conflictingAppointments.some(
            (apt: any) =>
              apt.status === "confirmed" || apt.status === "scheduled"
          );

          if (hasConfirmed) {
            toast({
              title: "Warning",
              description:
                "There are confirmed appointments during the selected time range. Please reschedule them first.",
              variant: "destructive",
            });
            return;
          }

          if (conflictingAppointments.length > 0) {
            if (
              !confirm(
                `There are ${conflictingAppointments.length} appointment(s) during the selected time range. Cancel them and mark as unavailable?`
              )
            ) {
              setIsSaving(false);
              return;
            }

            for (const apt of conflictingAppointments) {
              await updateDoc(doc(db, "appointments", apt.id), {
                status: "cancelled",
                cancellationReason: "Attorney unavailable during this time",
                updatedAt: serverTimestamp(),
              });
            }
          }
        }
      }

      const existingSlot = await getDoc(doc(db, "timeSlots", docId));

      if (existingSlot.exists()) {
        const existingData = existingSlot.data();
        const existingSlots = existingData.availableSlots || [];

        const updatedSlots = existingSlots.map((slot: any) => {
          const slotTime24 = slot.startTime;
          const [slotHour, slotMinute] = slotTime24.split(":").map(Number);

          const period = slotHour >= 12 ? "PM" : "AM";
          const hour12 = slotHour % 12 || 12;
          const slotTime12 = `${hour12}:${slotMinute
            .toString()
            .padStart(2, "0")} ${period}`;

          const shouldBeUnavailable =
            formData.isFullDay || unavailableTimeSlots.includes(slotTime12);

          return {
            ...slot,
            isBooked: shouldBeUnavailable ? true : slot.isBooked,
            unavailable: shouldBeUnavailable ? true : false,
          };
        });

        await updateDoc(doc(db, "timeSlots", docId), {
          isUnavailable: formData.isFullDay,
          unavailableReason: formData.reason,
          unavailableTimeRange: formData.isFullDay
            ? "All Day"
            : formData.timeRange,
          unavailableTimeSlots: formData.isFullDay ? [] : unavailableTimeSlots,
          availableSlots: updatedSlots,
          updatedAt: serverTimestamp(),
        });
      } else {
        const standardSlots = [];
        for (let hour = 9; hour < 17; hour++) {
          const startTime24 = `${hour.toString().padStart(2, "0")}:00`;
          const endTime24 = `${(hour + 1).toString().padStart(2, "0")}:00`;

          const period = hour >= 12 ? "PM" : "AM";
          const hour12 = hour % 12 || 12;
          const slotTime12 = `${hour12}:00 ${period}`;

          const shouldBeUnavailable =
            formData.isFullDay || unavailableTimeSlots.includes(slotTime12);

          standardSlots.push({
            startTime: startTime24,
            endTime: endTime24,
            isBooked: shouldBeUnavailable,
            unavailable: shouldBeUnavailable,
            slotId: `${startTime24}-${endTime24}`,
            bookedBy: null,
            appointmentId: null,
          });
        }

        await setDoc(doc(db, "timeSlots", docId), {
          attorneyId,
          attorneyName: "Atty. Alia Jan Delgado",
          date: dateStr,
          isUnavailable: formData.isFullDay,
          unavailableReason: formData.reason,
          unavailableTimeRange: formData.isFullDay
            ? "All Day"
            : formData.timeRange,
          unavailableTimeSlots: formData.isFullDay ? [] : unavailableTimeSlots,
          availableSlots: standardSlots,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      const newEntry: AvailabilityEntry = {
        id: docId,
        date: dateStr,
        reason: formData.reason,
        timeRange: formData.isFullDay ? "All Day" : formData.timeRange,
        isFullDay: formData.isFullDay,
        createdAt: new Date().toISOString(),
      };

      const updatedEntries = availabilityEntries.filter(
        (entry) => entry.date !== dateStr
      );
      setAvailabilityEntries([...updatedEntries, newEntry]);

      setIsAddMode(false);
      resetForm();

      toast({
        title: "Success",
        description: "Unavailability saved successfully",
      });

      onUpdate();
    } catch (error) {
      console.error("Error saving unavailability:", error);
      toast({
        title: "Error",
        description: "Failed to save unavailability. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteUnavailability = async (id: string) => {
    try {
      const dateStr = id.split("_")[1];
      const date = new Date(dateStr);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const isHoliday = phHolidays.some((holiday) => holiday.date === dateStr);

      if (isWeekend || isHoliday) {
        const standardSlots = [];
        for (let hour = 9; hour < 17; hour++) {
          const startTime24 = `${hour.toString().padStart(2, "0")}:00`;
          const endTime24 = `${(hour + 1).toString().padStart(2, "0")}:00`;

          standardSlots.push({
            startTime: startTime24,
            endTime: endTime24,
            isBooked: true,
            unavailable: true,
            slotId: `${startTime24}-${endTime24}`,
            bookedBy: null,
            appointmentId: null,
          });
        }

        await setDoc(doc(db, "timeSlots", id), {
          attorneyId,
          attorneyName: "Atty. Alia Jan Delgado",
          date: dateStr,
          isUnavailable: true,
          unavailableReason: isWeekend ? "Weekend" : "Philippine Holiday",
          unavailableTimeRange: "All Day",
          unavailableTimeSlots: [],
          availableSlots: standardSlots,
          holidays: isHoliday
            ? [
                {
                  name:
                    phHolidays.find((h) => h.date === dateStr)?.name ||
                    "Holiday",
                  type: "regular",
                },
              ]
            : [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        toast({
          title: "Info",
          description: "Date restored to weekend/holiday unavailability",
        });
      } else {
        const existingSlot = await getDoc(doc(db, "timeSlots", id));

        if (existingSlot.exists()) {
          const existingData = existingSlot.data();
          const existingSlots = existingData.availableSlots || [];

          const resetSlots = existingSlots.map((slot: any) => ({
            ...slot,
            isBooked: false,
            unavailable: false,
          }));

          await updateDoc(doc(db, "timeSlots", id), {
            isUnavailable: false,
            unavailableReason: "",
            unavailableTimeRange: "",
            unavailableTimeSlots: [],
            availableSlots: resetSlots,
            updatedAt: serverTimestamp(),
          });
        } else {
          const standardSlots = [];
          for (let hour = 9; hour < 17; hour++) {
            const startTime24 = `${hour.toString().padStart(2, "0")}:00`;
            const endTime24 = `${(hour + 1).toString().padStart(2, "0")}:00`;

            standardSlots.push({
              startTime: startTime24,
              endTime: endTime24,
              isBooked: false,
              unavailable: false,
              slotId: `${startTime24}-${endTime24}`,
              bookedBy: null,
              appointmentId: null,
            });
          }

          await setDoc(doc(db, "timeSlots", id), {
            attorneyId,
            attorneyName: "Atty. Alia Jan Delgado",
            date: dateStr,
            isUnavailable: false,
            unavailableReason: "",
            unavailableTimeRange: "",
            unavailableTimeSlots: [],
            availableSlots: standardSlots,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        toast({
          title: "Success",
          description: "Unavailability removed",
        });
      }

      const updated = availabilityEntries.filter((entry) => entry.id !== id);
      setAvailabilityEntries(updated);

      onUpdate();
    } catch (error) {
      console.error("Error deleting unavailability:", error);
      toast({
        title: "Error",
        description: "Failed to remove unavailability",
        variant: "destructive",
      });
    }
  };

  const getEntriesForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return availabilityEntries.filter((entry) => entry.date === dateStr);
  };

  const isDateUnavailable = (date: Date) => {
    if (!date) return false;
    const dateStr = format(date, "yyyy-MM-dd");
    const hasCustomUnavailability = availabilityEntries.some(
      (entry) => entry.date === dateStr
    );
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const isHoliday = phHolidays.some((holiday) => holiday.date === dateStr);

    return hasCustomUnavailability || isWeekend || isHoliday;
  };

  const isDateFullyUnavailable = (date: Date) => {
    if (!date) return false;
    const dateStr = format(date, "yyyy-MM-dd");
    const entry = availabilityEntries.find((entry) => entry.date === dateStr);
    return entry?.isFullDay || false;
  };

  const isDateHoliday = (date: Date) => {
    if (!date) return false;
    const dateStr = format(date, "yyyy-MM-dd");
    return phHolidays.some((holiday) => holiday.date === dateStr);
  };

  const isDateWeekend = (date: Date) => {
    if (!date) return false;
    return date.getDay() === 0 || date.getDay() === 6;
  };

  const getHolidayForDate = (date: Date) => {
    if (!date) return null;
    const dateStr = format(date, "yyyy-MM-dd");
    return phHolidays.find((holiday) => holiday.date === dateStr);
  };

  const handleBlockToday = () => {
    const today = new Date();
    if (isDateUnavailable(today)) {
      toast({
        title: "Already Unavailable",
        description:
          "Today is already marked as unavailable (weekend, holiday, or custom)",
        variant: "destructive",
      });
      return;
    }
    setSelectedDate(today);
    setIsAddMode(true);
    setFormData({
      reason: "Unavailable for appointments today",
      timeRange: "",
      isFullDay: true,
    });
  };

  const handleBlockTomorrow = () => {
    const tomorrow = addDays(new Date(), 1);
    if (isDateUnavailable(tomorrow)) {
      toast({
        title: "Already Unavailable",
        description:
          "Tomorrow is already marked as unavailable (weekend, holiday, or custom)",
        variant: "destructive",
      });
      return;
    }
    setSelectedDate(tomorrow);
    setIsAddMode(true);
    setFormData({
      reason: "Unavailable for appointments tomorrow",
      timeRange: "",
      isFullDay: true,
    });
  };

  const handleReset = () => {
    setSelectedDate(new Date());
    setIsAddMode(false);
    resetForm();
    toast({
      title: "Reset",
      description: "Form has been reset to default values",
    });
  };

  const resetForm = () => {
    setFormData({
      reason: "",
      timeRange: "",
      isFullDay: false,
    });
  };

  const selectedDateEntries = selectedDate
    ? getEntriesForDate(selectedDate)
    : [];
  const selectedDateHoliday = selectedDate
    ? getHolidayForDate(selectedDate)
    : null;
  const isSelectedDateWeekend = selectedDate
    ? isDateWeekend(selectedDate)
    : false;
  const isSelectedDateFullyUnavailable = selectedDate
    ? isDateFullyUnavailable(selectedDate)
    : false;

  const dateModifiers = {
    unavailable: (date: Date) => isDateUnavailable(date),
    holiday: (date: Date) => isDateHoliday(date),
    weekend: (date: Date) => isDateWeekend(date),
    partialUnavailable: (date: Date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const entry = availabilityEntries.find((entry) => entry.date === dateStr);
      return entry && !entry.isFullDay;
    },
    fullUnavailable: (date: Date) => isDateFullyUnavailable(date),
  };

  const dateModifierStyles = {
    unavailable: {
      backgroundColor: "#fee2e2",
      color: "#dc2626",
      fontWeight: "bold",
    },
    holiday: {
      backgroundColor: "#fef3c7",
      color: "#92400e",
      fontWeight: "bold",
    },
    weekend: {
      backgroundColor: "#f3f4f6",
      color: "#6b7280",
    },
    partialUnavailable: {
      backgroundColor: "#ffedd5",
      color: "#ea580c",
      fontWeight: "bold",
      position: "relative",
    },
    fullUnavailable: {
      backgroundColor: "#fee2e2",
      color: "#dc2626",
      fontWeight: "bold",
    },
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Manage Attorney Availability
          </DialogTitle>
          <DialogDescription>
            Set dates when Atty. Delgado is unavailable. Weekends and Philippine
            holidays are automatically blocked.
            <br />
            <span className="text-sm text-amber-600">
              Note: Partial day unavailability only blocks specific time slots.
            </span>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-3 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading availability data...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar Section */}
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold mb-2">
                    Select Date
                  </Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border"
                    modifiers={dateModifiers}
                    modifiersStyles={dateModifierStyles}
                    disabled={(date) => {
                      const today = startOfDay(new Date());
                      return isPast(date) && date < today;
                    }}
                  />
                  <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-red-200 rounded mr-2"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Fully unavailable dates
                      </span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-orange-200 rounded mr-2"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Partially unavailable (time slots)
                      </span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-amber-200 rounded mr-2"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Philippine holidays
                      </span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-gray-200 rounded mr-2"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Weekends
                      </span>
                    </div>
                  </div>
                </div>

                {/* Holiday Information */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      Philippine Holidays {isLoadingHolidays && "(Loading...)"}
                    </Label>
                    <div className="max-h-[300px] overflow-y-auto mt-2 border rounded-lg p-3">
                      {isLoadingHolidays ? (
                        <div className="flex justify-center py-4">
                          <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                        </div>
                      ) : phHolidays.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          No holiday data loaded
                        </p>
                      ) : (
                        Array.from(
                          new Map(
                            phHolidays.map((holiday) => [
                              `${holiday.date}-${holiday.name}`,
                              holiday,
                            ])
                          ).values()
                        )
                          .sort(
                            (a, b) =>
                              new Date(a.date).getTime() -
                              new Date(b.date).getTime()
                          )
                          .slice(0, 10)
                          .map((holiday) => (
                            <div
                              key={`holiday-${
                                holiday.date
                              }-${holiday.name.replace(/\s+/g, "-")}`}
                              className="py-2 border-b last:border-0"
                            >
                              <p className="text-sm font-medium">
                                {holiday.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {format(
                                  new Date(holiday.date),
                                  "EEE, MMM d, yyyy"
                                )}
                              </p>
                            </div>
                          ))
                      )}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Quick Actions
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBlockToday}
                        disabled={isDateUnavailable(new Date())}
                        className="flex-1"
                      >
                        Block Today
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBlockTomorrow}
                        disabled={isDateUnavailable(addDays(new Date(), 1))}
                        className="flex-1"
                      >
                        Block Tomorrow
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadAvailability}
                        className="flex items-center gap-1"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Refresh
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Date Details Section */}
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold">
                  {selectedDate
                    ? format(selectedDate, "EEEE, MMMM d, yyyy")
                    : "Select a date"}
                </Label>

                {isSelectedDateWeekend && (
                  <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        Weekend
                      </span>
                    </div>
                    <p className="text-sm mt-1 text-gray-700 dark:text-gray-300">
                      Attorney is unavailable on weekends
                    </p>
                  </div>
                )}

                {selectedDateHoliday && !isSelectedDateWeekend && (
                  <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        Philippine Holiday
                      </span>
                    </div>
                    <p className="text-sm mt-1 text-amber-700 dark:text-amber-300">
                      {selectedDateHoliday.name}
                    </p>
                  </div>
                )}

                {/* Show existing entries */}
                {selectedDateEntries.length > 0 ? (
                  <div className="space-y-2 mt-4">
                    {selectedDateEntries.map((entry) => (
                      <div
                        key={`entry-${entry.id}-${
                          entry.date
                        }-${entry.reason.replace(/\s+/g, "-")}`}
                        className={`border rounded-lg p-3 ${
                          entry.isFullDay
                            ? "bg-red-50 dark:bg-red-900/20"
                            : "bg-orange-50 dark:bg-orange-900/20"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <Badge
                            variant={
                              entry.isFullDay ? "destructive" : "secondary"
                            }
                          >
                            {entry.isFullDay
                              ? "Full Day Unavailable"
                              : "Partial Day Unavailable"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => deleteUnavailability(entry.id)}
                          >
                            <XCircle className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                        <div className="space-y-1">
                          <div>
                            <Label className="text-xs text-gray-500">
                              Reason
                            </Label>
                            <p className="text-sm font-medium">
                              {entry.reason}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">
                              {entry.isFullDay
                                ? "Duration"
                                : "Unavailable Time"}
                            </Label>
                            <p className="text-sm">{entry.timeRange}</p>
                          </div>
                          {!entry.isFullDay && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-600">
                                Only specific time slots are blocked. Other
                                times remain available.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : isAddMode ? (
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Reason for Unavailability *</Label>
                      <Textarea
                        placeholder="e.g., Court Hearing, Conference, Personal Leave"
                        value={formData.reason}
                        onChange={(e) =>
                          setFormData({ ...formData, reason: e.target.value })
                        }
                        rows={3}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={formData.isFullDay}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, isFullDay: checked })
                        }
                      />
                      <Label>Full day unavailability</Label>
                    </div>

                    {!formData.isFullDay && (
                      <div className="space-y-2">
                        <Label>Time Range *</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Select
                            value={formData.timeRange.split(" to ")[0] || ""}
                            onValueChange={(value) => {
                              const current = formData.timeRange;
                              setFormData({
                                ...formData,
                                timeRange: current
                                  ? `${value} to ${
                                      current.split(" to ")[1] || ""
                                    }`.trim()
                                  : value,
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Start time" />
                            </SelectTrigger>
                            <SelectContent>
                              {timeOptions.map((time) => (
                                <SelectItem key={`start-${time}`} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={formData.timeRange.split(" to ")[1] || ""}
                            onValueChange={(value) => {
                              const current = formData.timeRange;
                              setFormData({
                                ...formData,
                                timeRange: current
                                  ? `${
                                      current.split(" to ")[0] || ""
                                    } to ${value}`.trim()
                                  : value,
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="End time" />
                            </SelectTrigger>
                            <SelectContent>
                              {timeOptions.map((time) => (
                                <SelectItem key={`end-${time}`} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <p className="text-xs text-gray-500">
                          Select start and end time for unavailability. Only
                          these specific time slots will be blocked.
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={saveUnavailability}
                        size="sm"
                        disabled={isSaving}
                        className="flex-1"
                      >
                        {isSaving ? (
                          <>
                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                            Saving...
                          </>
                        ) : (
                          "Save Unavailability"
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReset}
                        disabled={isSaving}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : selectedDate && !isDateUnavailable(selectedDate) ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">
                      Attorney is available on this date
                    </p>
                    <Button
                      onClick={() => setIsAddMode(true)}
                      size="sm"
                      variant="default"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Unavailability
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* All Entries List */}
        {availabilityEntries.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <Label className="text-sm font-semibold mb-3 block">
              Custom Unavailable Dates ({availabilityEntries.length})
            </Label>
            <div className="max-h-[200px] overflow-y-auto space-y-2">
              {availabilityEntries
                .sort(
                  (a, b) =>
                    new Date(a.date).getTime() - new Date(b.date).getTime()
                )
                .map((entry, index) => (
                  <div
                    key={`all-entries-${entry.id}-${index}`}
                    className="flex items-center justify-between p-2 border rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">
                          {format(new Date(entry.date), "EEE, MMM d, yyyy")}
                        </p>
                        {entry.isFullDay ? (
                          <Badge variant="destructive" className="text-xs">
                            Full Day
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Partial
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {entry.reason} • {entry.timeRange}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteUnavailability(entry.id)}
                    >
                      <XCircle className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            <p>
              • <span className="font-medium">Full Day:</span> Entire date
              unavailable
              <br />• <span className="font-medium">Partial Day:</span> Only
              specific time slots blocked
              <br />• Weekends and holidays are automatically unavailable
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
