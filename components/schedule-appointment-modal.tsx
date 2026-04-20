"use client";

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Clock,
  Video,
  MapPin,
  AlertCircle,
  Info,
  Loader2,
  X,
  CalendarDays,
  Monitor,
  Building,
  Briefcase,
  TrendingUp,
  CheckCircle,
  Clock as ClockIcon,
  ChevronRight,
  FileText,
  ChevronDown,
  Sparkles,
  ListTodo,
  Layers,
} from "lucide-react";
import { format, isBefore } from "date-fns";
import AppointmentService, { TimeSlotDay } from "@/lib/appointment-service";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ScheduleAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (
    date: Date,
    time: string,
    consultationType: string,
    selectedCaseId?: string,
    appointmentPurpose?: string,
    caseStepInfo?: {
      currentStep?: number;
      currentStepName?: string;
      processSteps?: any[];
      progressPercentage?: number;
    }
  ) => void;
  appointmentService: typeof AppointmentService;
  onAppointmentScheduled?: () => void;
  currentUser?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  cases?: Array<{
    id: string;
    title: string;
    status: string;
    caseType: string;
    serviceType: string;
    progressPercentage?: number;
    currentStep?: number;
    processSteps?: Array<{
      id: string;
      name: string;
      status: string;
      order: number;
      completedDate?: string;
    }>;
    priority?: string;
    description?: string;
    openedDate?: string;
  }>;
}

export function ScheduleAppointmentModal({
  isOpen,
  onClose,
  onSelectDate,
  appointmentService,
  onAppointmentScheduled,
  currentUser,
  cases,
}: ScheduleAppointmentModalProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [consultationType, setConsultationType] = useState<
    "online" | "in-person"
  >("online");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
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
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<
    "case" | "type" | "date" | "time"
  >("case");
  const [appointmentType, setAppointmentType] = useState<string>("");
  const [whatNeedHelp, setWhatNeedHelp] = useState<string>("");
  const [preferredServiceCategory, setPreferredServiceCategory] = useState<string>("");
  const [customServiceText, setCustomServiceText] = useState<string>("");
  const [serviceProgressDescription, setServiceProgressDescription] = useState<string>("");
  const [appointmentPurpose, setAppointmentPurpose] = useState<string>("");
  const [customPurpose, setCustomPurpose] = useState<string>("");
  const [showCustomPurposeInput, setShowCustomPurposeInput] = useState(false);
  const [isGeneralConsultation, setIsGeneralConsultation] = useState(false);
  const [selectedCaseStep, setSelectedCaseStep] = useState<number | null>(null);
  const { toast } = useToast();

  const hasUserInteractedWithPurpose = useRef(false);
  const hasLoggedModalOpen = useRef(false);
  const customPurposeTextareaRef = useRef<HTMLTextAreaElement>(null);

  const activeCases =
    cases?.filter?.(
      (caseItem) =>
        caseItem?.status === "active" ||
        caseItem?.status === "pending" ||
        caseItem?.status === "on_hold"
    ) || [];

  // Debug logging
  useEffect(() => {
    console.log("ScheduleAppointmentModal - cases prop:", cases);
    console.log("ScheduleAppointmentModal - activeCases:", activeCases);
    console.log("ScheduleAppointmentModal - appointmentType:", appointmentType);
  }, [cases, activeCases, appointmentType]);

  const selectedCase = activeCases.find((c) => c?.id === selectedCaseId);

  const getCurrentProcessStep = (caseItem: typeof selectedCase) => {
    if (!caseItem?.processSteps || caseItem.processSteps.length === 0)
      return null;

    const currentStepIndex = caseItem.currentStep || 0;
    if (currentStepIndex < caseItem.processSteps.length) {
      return caseItem.processSteps[currentStepIndex];
    }
    return caseItem.processSteps[caseItem.processSteps.length - 1];
  };

  const currentStep = selectedCase ? getCurrentProcessStep(selectedCase) : null;

  const getProcessStepStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "in_progress":
        return <ClockIcon className="h-4 w-4 text-blue-500 animate-pulse" />;
      case "skipped":
        return <ChevronRight className="h-4 w-4 text-gray-400" />;
      case "pending":
      default:
        return <ClockIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getCaseStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "closed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "on_hold":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  useEffect(() => {
    const loadUnavailableDates = async () => {
      try {
        if (!isOpen || hasLoggedModalOpen.current) return;

        const year = new Date().getFullYear();
        const unavailableSet = new Set<string>();

        try {
          const response = await fetch(
            `https://date.nager.at/api/v3/publicholidays/${year}/PH`
          );
          if (response.ok) {
            const holidayData = await response.json();
            holidayData.forEach((holiday: any) => {
              unavailableSet.add(holiday.date);
            });
          }
        } catch (holidayError) {
          console.warn("Failed to load holidays:", holidayError);
        }

        const timeSlotsRef = collection(db, "timeSlots");
        const q = query(
          timeSlotsRef,
          where("attorneyId", "==", "atty.alia_jan_delgado"),
          where("isUnavailable", "==", true)
        );

        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.date) {
            unavailableSet.add(data.date);
          }
        });

        setUnavailableDates(unavailableSet);
        hasLoggedModalOpen.current = true;
      } catch (error) {
        console.error("Error loading unavailable dates:", error);
      }
    };

    if (isOpen) {
      loadUnavailableDates();
      setSelectedCaseId("");
      setExpandedCaseId(null);
      setSelectedTime(null);
      setConsultationType("online");
      setActiveStep("case");
      setAppointmentPurpose("");
      setCustomPurpose("");
      setIsGeneralConsultation(false);
      setSelectedCaseStep(null);
      setShowCustomPurposeInput(false);
      setDate(new Date());
      setDateDetails(null);
      setAvailableTimeSlots([]);
      hasUserInteractedWithPurpose.current = false;
    } else {
      hasLoggedModalOpen.current = false;
    }
  }, [isOpen]);

  const fetchDateDetails = async (selectedDate: Date) => {
    if (!selectedDate) return;

    setIsLoadingSlots(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const docId = `atty.alia_jan_delgado_${dateStr}`;
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
        const data = docSnap.data() as TimeSlotDay;
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

      const slots = await appointmentService.getAvailableTimeSlots(
        selectedDate
      );
      setAvailableTimeSlots(slots);

      if (selectedTime && !slots.includes(selectedTime)) {
        setSelectedTime(null);
      }
    } catch (error) {
      console.error("Error fetching date details:", error);
      setDateDetails(null);
      setAvailableTimeSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (date) {
      fetchDateDetails(date);
    }
  }, [date, appointmentService, selectedTime]);

  const isDateDisabled = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isBefore(date, today)) return true;

    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return true;

    const dateStr = format(date, "yyyy-MM-dd");
    return unavailableDates.has(dateStr);
  };

  const handleSubmit = async () => {
    if (!date || !selectedTime) {
      toast({
        title: "Selection Required",
        description: "Please select both a date and time.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const availabilityCheck = await appointmentService.isTimeSlotAvailable(
        date,
        selectedTime
      );

      if (!availabilityCheck.available) {
        toast({
          title: "Time Slot Unavailable",
          description:
            availabilityCheck.reason ||
            "This time slot is no longer available.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const doubleBookingCheck = await appointmentService.checkDoubleBooking(
        date,
        selectedTime
      );
      if (doubleBookingCheck.isDoubleBooked) {
        toast({
          title: "Already Booked",
          description:
            "This time slot has already been booked by another client.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      let purpose = "";
      if (appointmentType === "Initial Consultation (New Service)") {
        const categoryLabel = CASE_TYPE_OPTIONS.find(
          (c) => c.value === preferredServiceCategory
        )?.label;
        
        // Check if "Other" category is selected
        if (preferredServiceCategory === "other-service") {
          purpose = `Initial Consultation: ${whatNeedHelp || "General consultation"} - Custom Services: ${customServiceText || "See description"}`;
        } else {
          purpose = `Initial Consultation: ${whatNeedHelp || "General consultation"}${
            categoryLabel ? ` (${categoryLabel})` : ""
          }`;
        }
      } else if (
        appointmentType === "Follow-up Appointment (Existing Service)" &&
        selectedCase
      ) {
        purpose = `Follow-up: ${selectedCase.title}${
          serviceProgressDescription ? ` - ${serviceProgressDescription}` : ""
        }`;
      } else if (selectedCase) {
        purpose = `Discuss service: ${selectedCase.title}`;
      } else if (customPurpose && customPurpose.trim()) {
        purpose = customPurpose.trim();
      } else if (appointmentPurpose) {
        purpose = appointmentPurpose;
      } else {
        purpose = "General consultation";
      }

      const caseStepInfo = selectedCase
        ? {
            currentStep:
              selectedCaseStep !== null
                ? selectedCaseStep
                : selectedCase.currentStep || 0,
            currentStepName:
              selectedCaseStep !== null
                ? selectedCase.processSteps?.[selectedCaseStep]?.name ||
                  `Step ${selectedCaseStep + 1}`
                : selectedCase.processSteps?.[selectedCase.currentStep || 0]
                    ?.name || "",
            processSteps: selectedCase.processSteps || [],
            progressPercentage: selectedCase.progressPercentage || 0,
          }
        : undefined;

      onSelectDate(
        date,
        selectedTime,
        consultationType,
        selectedCaseId,
        purpose,
        caseStepInfo
      );

      setSelectedTime(null);
      setSelectedCaseId("");
      setAppointmentType("");
      setWhatNeedHelp("");
      setPreferredServiceCategory("");
      setServiceProgressDescription("");
      setAppointmentPurpose("");
      setCustomPurpose("");
      setIsGeneralConsultation(false);
      setSelectedCaseStep(null);
      setShowCustomPurposeInput(false);
      hasUserInteractedWithPurpose.current = false;

      if (onAppointmentScheduled) {
        onAppointmentScheduled();
      }

      toast({
        title: "Success!",
        description: selectedCase
          ? `Appointment scheduled for case: ${selectedCase.title} - Step ${
              (selectedCaseStep !== null
                ? selectedCaseStep
                : selectedCase.currentStep || 0) + 1
            }`
          : `Appointment scheduled for: ${purpose}`,
      });

      onClose();
    } catch (error: any) {
      console.error("Error scheduling appointment:", error);

      toast({
        title: "Error",
        description:
          error.message || "Failed to schedule appointment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderDateInfo = () => {
    if (!date || !dateDetails) return null;

    if (dateDetails.isFullyUnavailable || dateDetails.isHoliday) {
      return (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
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
                No time slots are available for booking.
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (dateDetails.isUnavailable && !dateDetails.isFullyUnavailable) {
      return (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                Limited Availability
              </p>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                {dateDetails.reason ||
                  "Attorney has limited availability today"}
              </p>
              {dateDetails.unavailableTimeRange && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  Unavailable: {dateDetails.unavailableTimeRange}
                </p>
              )}
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                Some time slots may still be available for booking.
              </p>
            </div>
          </div>
        </div>
      );
    }
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return (
        <div className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Weekend
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Attorney is unavailable on weekends
              </p>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderTimeSlots = () => {
    if (isLoadingSlots) {
      return (
        <div className="text-center py-8">
          <div className="animate-spin h-6 w-6 border-2 border-navy-700 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">
            Loading available time slots...
          </p>
        </div>
      );
    }

    if (dateDetails?.isFullyUnavailable || dateDetails?.isHoliday) {
      return (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <Clock className="h-12 w-12 mx-auto text-gray-400 mb-2" />
          <p className="text-gray-500">No available time slots for this date</p>
          <p className="text-sm text-gray-400 mt-1">
            {dateDetails?.holidayName ||
              dateDetails?.reason ||
              "Date is fully unavailable"}
          </p>
        </div>
      );
    }

    if (availableTimeSlots.length === 0) {
      return (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <Clock className="h-12 w-12 mx-auto text-gray-400 mb-2" />
          <p className="text-gray-500">No available time slots for this date</p>
          <p className="text-sm text-gray-400 mt-1">
            {dateDetails?.isUnavailable
              ? "All time slots are booked or unavailable"
              : "Please select another date or contact support."}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[200px] overflow-y-auto pr-1">
          {availableTimeSlots.map((time) => {
            const isUnavailableSlot =
              dateDetails?.unavailableTimeSlots?.includes(time);

            return (
              <Button
                key={time}
                type="button"
                variant={selectedTime === time ? "default" : "outline"}
                className={cn(
                  "relative h-12 transition-all duration-200",
                  selectedTime === time
                    ? "bg-navy-700 hover:bg-navy-800 text-white shadow-md"
                    : isUnavailableSlot
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
                    : "hover:bg-gray-50 hover:border-navy-300 hover:shadow-sm"
                )}
                onClick={() => {
                  if (!isUnavailableSlot) {
                    setSelectedTime(time);
                    setActiveStep("time");
                  }
                }}
                disabled={isUnavailableSlot}
              >
                <span className="text-sm font-medium">{time}</span>
                {isUnavailableSlot && (
                  <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                )}
              </Button>
            );
          })}
        </div>

        {dateDetails?.unavailableTimeSlots &&
          dateDetails.unavailableTimeSlots.length > 0 && (
            <div className="text-xs text-gray-500 flex items-center gap-1 mt-2">
              <span className="h-2 w-2 bg-red-500 rounded-full"></span>
              <span className="font-medium">Unavailable times:</span>{" "}
              <span className="text-gray-600">
                {dateDetails.unavailableTimeSlots.join(", ")}
              </span>
            </div>
          )}
      </div>
    );
  };

  const CaseStepSelection = () => {
    if (
      !selectedCase ||
      !selectedCase.processSteps ||
      selectedCase.processSteps.length === 0
    ) {
      return null;
    }

    return (
      <div className="mt-4">
        <Label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-3">
          <ListTodo className="h-4 w-4" />
          Select Specific Step to Discuss
          <span className="text-xs font-normal text-gray-500">(Optional)</span>
        </Label>

        <div className="space-y-2">
          {selectedCase.processSteps.map((step, index) => {
            const isCurrentStep = index === selectedCase.currentStep;
            const isSelected = selectedCaseStep === index;

            return (
              <div
                key={step.id}
                className={cn(
                  "p-3 rounded-lg border cursor-pointer transition-all duration-200",
                  isSelected
                    ? "border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 shadow-sm"
                    : "border-gray-200 hover:border-blue-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800",
                  isCurrentStep && "border-green-500"
                )}
                onClick={() => setSelectedCaseStep(isSelected ? null : index)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "p-2 rounded-lg",
                      isSelected
                        ? "bg-blue-100 dark:bg-blue-800"
                        : isCurrentStep
                        ? "bg-green-100 dark:bg-green-800"
                        : "bg-gray-100 dark:bg-gray-700"
                    )}
                  >
                    {getProcessStepStatusIcon(step.status)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {step.name}
                      </div>
                      {isSelected && (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                          Selected
                        </Badge>
                      )}
                      {isCurrentStep && !isSelected && (
                        <Badge className="bg-green-100 text-green-700 border-green-300">
                          Current Step
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Status: {step.status.replace("_", " ")}
                      {step.completedDate &&
                        ` • Completed: ${step.completedDate}`}
                    </div>
                    {step.notes && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {step.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {selectedCaseStep !== null && (
          <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800 dark:text-blue-300">
                This appointment will focus on:
              </span>
            </div>
            <p className="mt-1 font-bold text-blue-900 dark:text-blue-200">
              Step {selectedCaseStep + 1}:{" "}
              {selectedCase.processSteps?.[selectedCaseStep]?.name}
            </p>
          </div>
        )}
      </div>
    );
  };

  const CaseDetailsView = ({ caseItem }: { caseItem: typeof selectedCase }) => {
    if (!caseItem) return null;

    const currentStep = getCurrentProcessStep(caseItem);

    return (
      <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
              <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <h4 className="font-bold text-blue-800 dark:text-blue-300">
                Selected Service
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                {caseItem.title}
              </p>
            </div>
          </div>
          <Badge
            className={cn("font-medium", getCaseStatusColor(caseItem.status))}
          >
            {caseItem.status.toUpperCase()}
          </Badge>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Service Progress
              </span>
              <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                {caseItem.progressPercentage || 0}%
              </span>
            </div>
            <div className="relative">
              <Progress
                value={caseItem.progressPercentage || 0}
                className="h-2"
              />
              <div
                className="absolute top-0 left-0 h-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${caseItem.progressPercentage || 0}%` }}
              />
            </div>
          </div>

          {currentStep && (
            <div className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-blue-100 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-gray-900 dark:text-white">
                  Current Process Step
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {getProcessStepStatusIcon(currentStep.status)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {currentStep.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {currentStep.completedDate &&
                      `Completed: ${currentStep.completedDate}`}
                    {!currentStep.completedDate &&
                      currentStep.status === "pending" &&
                      "Pending"}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {currentStep.status.replace("_", " ")}
                </Badge>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-2 bg-white/50 dark:bg-gray-800/50 rounded border">
              <div className="text-xs text-gray-500">Service Category</div>
              <div className="font-medium">{caseItem.caseType}</div>
            </div>
            <div className="p-2 bg-white/50 dark:bg-gray-800/50 rounded border">
              <div className="text-xs text-gray-500">Service</div>
              <div className="font-medium">{caseItem.serviceType}</div>
            </div>
            {caseItem.priority && (
              <div className="p-2 bg-white/50 dark:bg-gray-800/50 rounded border">
                <div className="text-xs text-gray-500">Priority</div>
                <Badge className={getPriorityColor(caseItem.priority)}>
                  {caseItem.priority}
                </Badge>
              </div>
            )}
            {caseItem.openedDate && (
              <div className="p-2 bg-white/50 dark:bg-gray-800/50 rounded border">
                <div className="text-xs text-gray-500">Opened</div>
                <div className="font-medium">
                  {new Date(caseItem.openedDate).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Service Step Selection */}
        <CaseStepSelection />
      </div>
    );
  };

  const CasesSelectionView = () => {
    if (activeCases.length === 0) {
      return null;
    }

    return (
      <div className="space-y-3">
        <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          Select Service for Discussion
          <span className="text-xs font-normal text-gray-500">
            (Optional - select if this appointment is about a specific service)
          </span>
        </Label>

        <ScrollArea className="h-[250px] rounded-lg border bg-white/50 dark:bg-gray-800/50">
          <div className="space-y-2 p-2">
            {activeCases.map((caseItem) => {
              const isSelected = selectedCaseId === caseItem.id;
              const currentStep = getCurrentProcessStep(caseItem);

              return (
                <div
                  key={caseItem.id}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md",
                    isSelected
                      ? "border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 shadow-sm"
                      : "border-gray-200 hover:border-blue-300 bg-white dark:bg-gray-800"
                  )}
                  onClick={() => {
                    setSelectedCaseId(caseItem.id);
                    setExpandedCaseId(caseItem.id);
                    setIsGeneralConsultation(false);
                    setSelectedCaseStep(null);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div
                        className={cn(
                          "p-2 rounded-lg",
                          isSelected
                            ? "bg-blue-100 dark:bg-blue-800"
                            : "bg-gray-100 dark:bg-gray-700"
                        )}
                      >
                        <Briefcase
                          className={cn(
                            "h-4 w-4",
                            isSelected
                              ? "text-blue-600 dark:text-blue-300"
                              : "text-gray-500 dark:text-gray-400"
                          )}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {caseItem.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {caseItem.caseType}
                          </Badge>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-500">
                            {caseItem.serviceType}
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>Progress</span>
                            <span className="font-bold">
                              {caseItem.progressPercentage || 0}%
                            </span>
                          </div>
                          <div className="relative h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                              style={{
                                width: `${caseItem.progressPercentage || 0}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Current step */}
                        {currentStep && (
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-600 dark:text-gray-400">
                            {getProcessStepStatusIcon(currentStep.status)}
                            <span className="truncate">{currentStep.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge
                        className={cn(
                          "text-xs",
                          getCaseStatusColor(caseItem.status)
                        )}
                      >
                        {caseItem.status}
                      </Badge>
                      {caseItem.priority && (
                        <Badge
                          className={cn(
                            "text-xs",
                            getPriorityColor(caseItem.priority)
                          )}
                        >
                          {caseItem.priority}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    );
  };

  const ConsultationTypeView = () => {
    return (
      <div className="space-y-3">
        <Label className="text-sm font-medium text-gray-700">
          Consultation Type
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setConsultationType("online");
              setActiveStep("date");
            }}
            className={cn(
              "p-4 rounded-xl border-2 transition-all duration-300 hover:scale-[1.02]",
              consultationType === "online"
                ? "border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 shadow-lg"
                : "border-gray-200 hover:border-blue-400 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            )}
          >
            <div className="flex flex-col items-center gap-3">
              <div
                className={cn(
                  "p-3 rounded-full transition-all duration-300",
                  consultationType === "online"
                    ? "bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 dark:from-blue-800 dark:to-indigo-800 dark:text-blue-300"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                )}
              >
                <Video className="h-6 w-6" />
              </div>
              <div className="text-center">
                <div className="font-bold text-gray-900 dark:text-white">
                  Online
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Video Consultation
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setConsultationType("in-person");
              setActiveStep("date");
            }}
            className={cn(
              "p-4 rounded-xl border-2 transition-all duration-300 hover:scale-[1.02]",
              consultationType === "in-person"
                ? "border-green-600 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 shadow-lg"
                : "border-gray-200 hover:border-green-400 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            )}
          >
            <div className="flex flex-col items-center gap-3">
              <div
                className={cn(
                  "p-3 rounded-full transition-all duration-300",
                  consultationType === "in-person"
                    ? "bg-gradient-to-br from-green-100 to-emerald-100 text-green-600 dark:from-green-800 dark:to-emerald-800 dark:text-green-300"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                )}
              >
                <Building className="h-6 w-6" />
              </div>
              <div className="text-center">
                <div className="font-bold text-gray-900 dark:text-white">
                  In-Person
                </div>
                <div className="text-xs text-gray-500 mt-1">Office Visit</div>
              </div>
            </div>
          </button>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Info className="h-4 w-4 text-blue-500" />
            <span className="font-medium">Note:</span>
          </div>
          <p className="text-xs">
            {consultationType === "online"
              ? "Video link will be provided upon confirmation. Please ensure you have a stable internet connection."
              : "Office address: [Law Office Address]. Please arrive 10 minutes before your scheduled time."}
          </p>
        </div>
      </div>
    );
  };

  const getSubmitDisabledState = () => {
    // Button is disabled only if time is not selected, or if we're still loading
    if (!date || !selectedTime || isLoading) return true;
    if (dateDetails?.unavailableTimeSlots?.includes(selectedTime)) return true;
    if (dateDetails?.isFullyUnavailable || dateDetails?.isHoliday) return true;

    return false;
  };

  const handleClose = () => {
    setDate(new Date());
    setSelectedTime(null);
    setConsultationType("online");
    setDateDetails(null);
    setAvailableTimeSlots([]);
    setSelectedCaseId("");
    setExpandedCaseId(null);
    setActiveStep("case");
    setAppointmentPurpose("");
    setCustomPurpose("");
    setIsGeneralConsultation(false);
    setSelectedCaseStep(null);
    setShowCustomPurposeInput(false);
    setAppointmentType("");
    setWhatNeedHelp("");
    setPreferredServiceCategory("");
    setCustomServiceText("");
    setServiceProgressDescription("");
    hasUserInteractedWithPurpose.current = false;

    onClose();
  };

  const renderStepIndicator = () => {
    const steps = [
      { id: "case", label: "Service", icon: Briefcase },
      { id: "type", label: "Type", icon: Video },
      { id: "date", label: "Date", icon: CalendarDays },
      { id: "time", label: "Time", icon: Clock },
    ];

    return (
      <div className="flex items-center justify-between mb-6">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = activeStep === step.id;
          const isCompleted =
            steps.findIndex((s) => s.id === activeStep) >
            steps.findIndex((s) => s.id === step.id);

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300",
                    isActive
                      ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg"
                      : isCompleted
                      ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span
                  className={cn(
                    "text-xs mt-1 font-medium",
                    isActive
                      ? "text-blue-600 dark:text-blue-400"
                      : isCompleted
                      ? "text-green-600 dark:text-green-400"
                      : "text-gray-400 dark:text-gray-500"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2 transition-all duration-300",
                    isCompleted
                      ? "bg-gradient-to-r from-green-500 to-blue-500"
                      : "bg-gray-200 dark:bg-gray-700"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const appointmentTypeOptions = [
    "Initial Consultation (New Service)",
    "Follow-up Appointment (Existing Service)",
  ];

  const CASE_TYPE_OPTIONS = [
    { value: "legal-consultation", label: "Legal Consultation & Documentation" },
    { value: "civil", label: "Civil Cases" },
    { value: "criminal", label: "Criminal Cases" },
    { value: "special", label: "Special Proceedings" },
    { value: "administrative", label: "Administrative & Quasi-Judicial" },
    { value: "pleadings", label: "Pleadings & Motions Preparation" },
    { value: "appearance", label: "Court Appearance & Representation" },
    { value: "retainer", label: "Retainers" },
    { value: "accounting", label: "Accounting Services" },
    { value: "corporate", label: "Corporate & Licensing" },
    { value: "audit", label: "Audit Services" },
    { value: "accounting-tax", label: "Accounting & Tax Consultancy" },
    { value: "tax", label: "Tax Services" },
    { value: "other-service", label: "Unknown (I don't know yet what specific legal or accounting service I need)" },
  ];

  const handleAppointmentTypeSelect = (type: string) => {
    setAppointmentType(type);
    setWhatNeedHelp("");
    setPreferredServiceCategory("");
    setServiceProgressDescription("");
    setSelectedCaseId("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 border-b p-6 bg-gradient-to-r from-navy-50 to-blue-50 dark:from-navy-900 dark:to-blue-900/30">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-navy-900 dark:text-white flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg">
                  <CalendarDays className="h-6 w-6 text-white" />
                </div>
                Schedule Appointment
              </DialogTitle>
                <DialogDescription className="mt-2 text-gray-600 dark:text-gray-400">
                {currentUser?.name}
              </DialogDescription>
            </div>
          </div>

          {renderStepIndicator()}
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[90vh] overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Case Selection Step */}
            {activeStep === "case" && (
              <div className="space-y-4">
                <div className="pt-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Appointment Type
                    </Label>

                    <div className="space-y-2">
                      {appointmentTypeOptions.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleAppointmentTypeSelect(type)}
                          className={cn(
                            "w-full p-3 text-left rounded-lg border transition-all duration-200",
                            appointmentType === type
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                              : "border-gray-200 hover:border-blue-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "h-3 w-3 rounded-full border",
                                appointmentType === type
                                  ? "bg-blue-500 border-blue-500"
                                  : "border-gray-400"
                              )}
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {type}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Conditional fields based on appointment type */}
                    {appointmentType === "Initial Consultation (New Service)" && (
                      <div className="space-y-3 pt-3">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          What do you need help with?
                        </Label>
                        <textarea
                          value={whatNeedHelp}
                          onChange={(e) => setWhatNeedHelp(e.target.value)}
                          className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={3}
                          placeholder="Please describe your legal or professional matter, concerns, or what you need assistance with..."
                        />
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          The more detail you provide, the better we can prepare for your consultation.
                        </p>

                        <Label className="text-sm font-medium flex items-center gap-2 pt-2">
                          <Briefcase className="h-4 w-4" />
                          Preferred Service Category
                        </Label>
                        <select
                          value={preferredServiceCategory}
                          onChange={(e) => setPreferredServiceCategory(e.target.value)}
                          className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
                        >
                          <option value="">Select a service category</option>
                          {CASE_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          This helps us ensure you are connected with the right specialist.
                        </p>
                      </div>
                    )}

                    {appointmentType === "Follow-up Appointment (Existing Service)" && (
                      <>
                        {activeCases.length > 0 ? (
                          <div className="space-y-3 pt-3">
                            <CasesSelectionView />
                          </div>
                        ) : (
                          <div className="text-sm text-gray-600 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800 mt-3">
                            <AlertCircle className="h-4 w-4 inline mr-2" />
                            You currently have no active services. Please contact the office to open a new service.
                          </div>
                        )}
                      </>
                    )}

                    {/* Service Progress Display - shown after service selection */}
                    {selectedCaseId && <CaseDetailsView caseItem={selectedCase!} />}

                    {/* Custom purpose input - ALWAYS RENDERED but hidden with CSS */}
                    <div
                      className={showCustomPurposeInput ? "block" : "hidden"}
                    >
                      <div className="pt-2">
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Please specify your purpose:
                        </Label>
                        <textarea
                          ref={customPurposeTextareaRef}
                          value={customPurpose}
                          onChange={(e) => {
                            setCustomPurpose(e.target.value);
                            hasUserInteractedWithPurpose.current = true;
                          }}
                          placeholder="Describe the purpose of this appointment..."
                          className="w-full p-3 text-sm border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800"
                          rows={3}
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          This helps us prepare for your consultation
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <div className="flex gap-2">
                    {isGeneralConsultation && (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setIsGeneralConsultation(false);

                          if (!hasUserInteractedWithPurpose.current) {
                            setAppointmentPurpose("");
                            setCustomPurpose("");
                            setShowCustomPurposeInput(false);
                          }
                        }}
                      >
                        <ChevronRight className="h-4 w-4 mr-2 rotate-180" />
                        Back to Service Selection
                      </Button>
                    )}
                    <Button
                      onClick={() => {
                        // For Follow-up Appointment
                        if (appointmentType === "Follow-up Appointment (Existing Service)") {
                          if (!selectedCaseId) {
                            toast({
                              title: "Selection Required",
                              description: "Please select an active service.",
                              variant: "destructive",
                            });
                            return;
                          }
                          setActiveStep("type");
                        }
                        // For Initial Consultation
                        else if (appointmentType === "Initial Consultation (New Service)") {
                          if (!whatNeedHelp.trim()) {
                            toast({
                              title: "Description Required",
                              description: "Please describe what you need help with.",
                              variant: "destructive",
                            });
                            return;
                          }
                          if (!preferredServiceCategory) {
                            toast({
                              title: "Category Required",
                              description: "Please select a preferred service category.",
                              variant: "destructive",
                            });
                            return;
                          }
                          setActiveStep("type");
                        }
                        // If no appointment type is selected
                        else {
                          toast({
                            title: "Selection Required",
                            description:
                              "Please select an appointment type (Initial Consultation or Follow-up Appointment).",
                            variant: "destructive",
                          });
                        }
                      }}
                      disabled={
                        appointmentType === "Follow-up Appointment (Existing Service)"
                          ? !selectedCaseId
                          : appointmentType === "Initial Consultation (New Service)"
                            ? !whatNeedHelp.trim() || !preferredServiceCategory
                            : true
                      }
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue to Next Step
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Consultation Type Step */}
            {activeStep === "type" && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <Video className="h-5 w-5 text-green-600 dark:text-green-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                      Select Consultation Type
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Choose between online video consultation or in-person
                      office visit
                    </p>
                  </div>
                </div>

                <ConsultationTypeView />

                {selectedCase && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-800 dark:text-blue-300">
                        This appointment is about:
                      </span>
                      <span className="font-bold">{selectedCase.title}</span>
                    </div>
                    {selectedCaseStep !== null && (
                      <div className="mt-2 flex items-center gap-2">
                        <ListTodo className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-700 dark:text-blue-300">
                          Selected Step:
                        </span>
                        <span className="font-bold">
                          Step {selectedCaseStep + 1}:{" "}
                          {selectedCase.processSteps?.[selectedCaseStep]?.name}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {!selectedCaseId && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-800 dark:text-blue-300">
                        Appointment Purpose:
                      </span>
                      <span className="font-bold">
                        {appointmentPurpose === "Other (please specify)"
                          ? customPurpose
                          : appointmentPurpose}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setActiveStep("case")}
                  >
                    <ChevronRight className="h-4 w-4 mr-2 rotate-180" />
                    Back
                  </Button>
                  <Button
                    onClick={() => setActiveStep("date")}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    Continue to Date Selection
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Date Selection Step */}
            {activeStep === "date" && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <CalendarDays className="h-5 w-5 text-purple-600 dark:text-purple-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                      Select Appointment Date
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Choose a date for your {consultationType} consultation
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700">
                    Select Date
                  </Label>
                  {renderDateInfo()}
                  <div className="rounded-xl border p-4 bg-white/50 dark:bg-gray-800/50">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(newDate) => {
                        if (newDate) {
                          setDate(newDate);
                          setActiveStep("time");
                        }
                      }}
                      className="w-full"
                      disabled={isDateDisabled}
                      modifiers={{
                        unavailable: (date) => {
                          const dateStr = format(date, "yyyy-MM-dd");
                          return unavailableDates.has(dateStr);
                        },
                        weekend: (date) => {
                          const dayOfWeek = date.getDay();
                          return dayOfWeek === 0 || dayOfWeek === 6;
                        },
                      }}
                      modifiersStyles={{
                        unavailable: {
                          backgroundColor: "#fee2e2",
                          color: "#dc2626",
                          textDecoration: "line-through",
                          borderRadius: "6px",
                        },
                        weekend: {
                          backgroundColor: "#f3f4f6",
                          color: "#6b7280",
                          borderRadius: "6px",
                        },
                      }}
                    />
                    <div className="text-xs text-gray-500 space-y-1 mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                        <span>Weekends are automatically unavailable</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
                        <span>
                          Philippine holidays are marked as unavailable
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
                        <span>
                          Partial day unavailability shows limited time slots
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setActiveStep("type")}
                  >
                    <ChevronRight className="h-4 w-4 mr-2 rotate-180" />
                    Back
                  </Button>
                  <Button
                    onClick={() => setActiveStep("time")}
                    disabled={!date}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    Continue to Time Selection
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Time Selection Step */}
            {activeStep === "time" && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                    <Clock className="h-5 w-5 text-orange-600 dark:text-orange-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                      Select Appointment Time
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Choose a time slot for your appointment on{" "}
                      {date
                        ? format(date, "EEEE, MMMM d, yyyy")
                        : "selected date"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Select Time
                    {dateDetails?.isUnavailable &&
                      !dateDetails?.isFullyUnavailable && (
                        <span className="text-xs font-normal text-orange-600">
                          (Limited availability)
                        </span>
                      )}
                  </Label>
                  {renderTimeSlots()}
                </div>

                {/* Appointment Summary */}
                {date && selectedTime && !getSubmitDisabledState() && (
                  <div className="bg-gradient-to-r from-navy-50 to-blue-50 dark:from-navy-900/30 dark:to-blue-900/30 p-4 rounded-xl border border-navy-200 dark:border-navy-800 shadow-sm">
                    <h4 className="font-bold text-navy-900 dark:text-white mb-3 flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      Appointment Summary
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                      <div className="space-y-1">
                        <div className="text-xs text-gray-500">Date</div>
                        <div className="font-bold text-gray-900 dark:text-white">
                          {format(date, "EEEE, MMMM d, yyyy")}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-gray-500">Time</div>
                        <div className="font-bold text-gray-900 dark:text-white">
                          {selectedTime}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-gray-500">Type</div>
                        <div className="font-bold text-gray-900 dark:text-white">
                          {consultationType === "online"
                            ? "Online Consultation"
                            : "In-Person Consultation"}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-gray-500">Purpose</div>
                        <div className="font-bold text-gray-900 dark:text-white">
                          {selectedCase
                            ? selectedCase.title
                            : appointmentPurpose === "Other (please specify)"
                            ? customPurpose
                            : appointmentPurpose}
                        </div>
                      </div>
                    </div>

                    {/* Show case step in summary if case is selected */}
                    {selectedCase && (
                      <div className="mt-3 pt-3 border-t border-navy-200 dark:border-navy-700">
                        <div className="flex items-center gap-2 mb-2">
                          <ListTodo className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {selectedCaseStep !== null
                              ? "Selected Step"
                              : "Current Step"}
                            :
                          </span>
                          <span className="font-bold text-blue-700 dark:text-blue-300">
                            {selectedCaseStep !== null
                              ? `Step ${selectedCaseStep + 1}: ${
                                  selectedCase.processSteps?.[selectedCaseStep]
                                    ?.name
                                }`
                              : selectedCase.processSteps?.[
                                  selectedCase.currentStep || 0
                                ]?.name}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 mb-1">
                          <span>Case Progress:</span>
                          <span className="font-bold">
                            {selectedCase.progressPercentage || 0}%
                          </span>
                        </div>
                        <Progress
                          value={selectedCase.progressPercentage || 0}
                          className="h-2"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setActiveStep("date")}
                  >
                    <ChevronRight className="h-4 w-4 mr-2 rotate-180" />
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={getSubmitDisabledState()}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 min-w-[140px]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Scheduling...
                      </>
                    ) : (
                      "Schedule Appointment"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
