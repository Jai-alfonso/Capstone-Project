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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CalendarIcon,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
  Video,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  Loader2,
  LinkIcon,
  ExternalLink,
  Copy,
  Check,
  CalendarX,
} from "lucide-react";
import AppointmentService, { Appointment } from "@/lib/appointment-service";
import UserService, { User as UserType } from "@/lib/user-service";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuditLogger } from "@/hooks/useAuditLogger"; // Add audit logger

interface AppointmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  isAdmin?: boolean;
  onStatusChange?: (
    appointmentId: string,
    newStatus: string,
    videoLink?: string
  ) => void;
  onCancel?: (appointmentId: string) => void;
  onReschedule?: (appointmentId: string) => void;
  onRefresh?: () => void;
}

export function AppointmentDetailsModal({
  isOpen,
  onClose,
  appointmentId,
  isAdmin = false,
  onStatusChange,
  onCancel,
  onReschedule,
  onRefresh,
}: AppointmentDetailsModalProps) {
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [userDetails, setUserDetails] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [error, setError] = useState("");
  const [videoLink, setVideoLink] = useState("");
  const [isVideoLinkValid, setIsVideoLinkValid] = useState(true);
  const [showVideoLinkInput, setShowVideoLinkInput] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isUpdatingVideoLink, setIsUpdatingVideoLink] = useState(false);
  const [copied, setCopied] = useState(false);
  const [videoLinkValidation, setVideoLinkValidation] = useState<{
    isValid: boolean;
    message?: string;
  }>({ isValid: false });
  const { toast } = useToast();
  const { logAction, logAppointmentAction } = useAuditLogger();

  useEffect(() => {
    if (isOpen && appointmentId) {
      loadAppointmentDetails();
    }
  }, [isOpen, appointmentId]);

  const loadAppointmentDetails = async () => {
    setIsLoading(true);
    setError("");
    setVideoLink("");
    setShowVideoLinkInput(false);
    setVideoLinkValidation({ isValid: false });
    try {
      const appointmentData = await AppointmentService.getAppointmentById(
        appointmentId
      );
      if (appointmentData) {
        setAppointment(appointmentData);

        // Pre-fill video link if exists
        if (appointmentData.videoLink) {
          setVideoLink(appointmentData.videoLink);
          setIsVideoLinkValid(true);
        }

        // Fetch user details if clientId exists
        if (appointmentData.clientId) {
          fetchUserDetails(appointmentData.clientId);
        }
      } else {
        setError("Appointment not found");
      }
    } catch (err) {
      setError("Failed to load appointment details");
      console.error("Error loading appointment:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserDetails = async (userId: string) => {
    setIsLoadingUser(true);
    try {
      const userData = await UserService.getUserById(userId);
      setUserDetails(userData);
    } catch (err) {
      console.error("Error fetching user details:", err);
    } finally {
      setIsLoadingUser(false);
    }
  };

  const validateVideoLink = (link: string) => {
    if (!link) return false;

    try {
      const url = new URL(link);
      const validProtocols = ["http:", "https:"];
      const validDomains = [
        "zoom.us",
        "meet.google.com",
        "teams.microsoft.com",
        "whereby.com",
        "gotomeet.me",
        "gotomeeting.com",
        "webex.com",
      ];

      if (!validProtocols.includes(url.protocol)) {
        return false;
      }

      // Check if domain is valid
      const domain = url.hostname;
      const isValidDomain = validDomains.some((validDomain) =>
        domain.includes(validDomain)
      );

      return (
        isValidDomain ||
        domain.includes("meet") ||
        domain.includes("video") ||
        domain.includes("call")
      );
    } catch {
      return false;
    }
  };

  const handleVideoLinkChange = (value: string) => {
    setVideoLink(value);
    const isValid = validateVideoLink(value);
    setIsVideoLinkValid(isValid);

    if (isValid) {
      setVideoLinkValidation({ isValid: true, message: "Valid video link" });
    } else {
      setVideoLinkValidation({
        isValid: false,
        message:
          "Please enter a valid video conference link (Zoom, Google Meet, etc.)",
      });
    }
  };

  const isVirtualConsultation = () => {
    if (!appointment) return false;

    const isVirtual =
      appointment.consultationType === "online" ||
      (appointment.location &&
        (appointment.location.toLowerCase().includes("virtual") ||
          appointment.location.toLowerCase().includes("video") ||
          appointment.location.toLowerCase().includes("online")));

    return isVirtual;
  };

  const hasVideoLink = () => {
    if (!appointment) return false;
    return !!appointment.videoLink && appointment.videoLink.trim() !== "";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "rescheduled":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="h-4 w-4" />;
      case "pending":
        return <AlertCircle className="h-4 w-4" />;
      case "cancelled":
        return <XCircle className="h-4 w-4" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getLocationIcon = (location: string) => {
    if (!location) return <MapPin className="h-4 w-4" />;

    const locationLower = location.toLowerCase();
    if (
      locationLower.includes("video") ||
      locationLower.includes("virtual") ||
      locationLower.includes("online")
    ) {
      return <Video className="h-4 w-4" />;
    } else if (locationLower.includes("phone")) {
      return <Phone className="h-4 w-4" />;
    } else {
      return <MapPin className="h-4 w-4" />;
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!appointment) return;

    if (newStatus === "confirmed" && isVirtualConsultation() && isAdmin) {
      if (!hasVideoLink()) {
        setShowVideoLinkInput(true);
        return;
      }
    }

    if (onStatusChange) {
      onStatusChange(appointment.id, newStatus, appointment.videoLink);
    }
  };

  const handleConfirmWithVideoLink = async () => {
    if (!appointment || !videoLink) return;

    if (!validateVideoLink(videoLink)) {
      setIsVideoLinkValid(false);
      toast({
        title: "Invalid Video Link",
        description:
          "Please enter a valid video conference link (Zoom, Google Meet, etc.)",
        variant: "destructive",
      });
      return;
    }

    setIsConfirming(true);
    try {
      const updated = await AppointmentService.updateAppointmentStatus(
        appointment.id,
        "confirmed",
        videoLink
      );

      if (updated) {
        await logAppointmentAction(
          "Confirmed",
          appointment.id,
          appointment.title || appointment.type || "Appointment",
          `Confirmed appointment with video link for ${
            appointment.client
          }. Video platform: ${new URL(videoLink).hostname}`,
          "Info"
        );

        toast({
          title: "Appointment Confirmed",
          description: "Appointment has been confirmed with video link",
        });

        await loadAppointmentDetails();
        setShowVideoLinkInput(false);

        if (onRefresh) {
          onRefresh();
        }
      }
    } catch (error: any) {
      console.error("Error confirming appointment with video link:", error);

      await logAction(
        "Appointment Confirmation Error",
        `Appointment: ${appointment.id}`,
        `Failed to confirm appointment with video link: ${error.message}`,
        "Critical"
      );

      toast({
        title: "Error",
        description: error.message || "Failed to confirm appointment",
        variant: "destructive",
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleUpdateVideoLink = async () => {
    if (!appointment || !videoLink) return;

    if (!validateVideoLink(videoLink)) {
      setIsVideoLinkValid(false);
      toast({
        title: "Invalid Video Link",
        description:
          "Please enter a valid video conference link (Zoom, Google Meet, etc.)",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingVideoLink(true);
    try {
      const updated = await AppointmentService.updateVideoLink(
        appointment.id,
        videoLink
      );

      if (updated) {
        await logAction(
          "Video Link Updated",
          `Appointment: ${appointment.id}`,
          `Updated video link for ${
            appointment.client
          } appointment. New link: ${videoLink.substring(0, 50)}...`,
          "Info"
        );

        toast({
          title: "Video Link Updated",
          description: "Video consultation link has been updated",
        });

        await loadAppointmentDetails();
        setShowVideoLinkInput(false);

        if (onRefresh) {
          onRefresh();
        }
      }
    } catch (error: any) {
      console.error("Error updating video link:", error);

      await logAction(
        "Video Link Update Error",
        `Appointment: ${appointment.id}`,
        `Failed to update video link: ${error.message}`,
        "Critical"
      );

      toast({
        title: "Error",
        description: error.message || "Failed to update video link",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingVideoLink(false);
    }
  };

  const handleCopyVideoLink = () => {
    if (appointment?.videoLink) {
      navigator.clipboard.writeText(appointment.videoLink);
      setCopied(true);

      logAction(
        "Video Link Copied",
        `Appointment: ${appointment.id}`,
        `Copied video link to clipboard for ${appointment.client} appointment`,
        "Info"
      );

      toast({
        title: "Copied",
        description: "Video link copied to clipboard",
      });

      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTestVideoLink = async () => {
    if (!appointment?.videoLink) return;

    try {
      await logAction(
        "Video Link Tested",
        `Appointment: ${appointment.id}`,
        `Tested video link for ${appointment.client} appointment`,
        "Info"
      );

      window.open(appointment.videoLink, "_blank", "noopener,noreferrer");

      toast({
        title: "Opening Video Link",
        description: "Video conference is opening in a new tab",
      });
    } catch (error) {
      console.error("Error opening video link:", error);

      await logAction(
        "Video Link Test Error",
        `Appointment: ${appointment.id}`,
        `Failed to open video link: ${error}`,
        "Critical"
      );

      toast({
        title: "Error",
        description: "Failed to open video link",
        variant: "destructive",
      });
    }
  };

  const handleCancelClick = () => {
    if (onCancel && appointment) {
      onCancel(appointment.id);
    }
  };

  const handleRescheduleClick = () => {
    if (onReschedule && appointment) {
      onReschedule(appointment.id);
    }
  };

  const handleMarkAsCompleted = async () => {
    if (!appointment) return;

    try {
      const updated = await AppointmentService.completeAppointment(
        appointment.id
      );

      if (updated) {
        await logAppointmentAction(
          "Completed",
          appointment.id,
          appointment.title || appointment.type || "Appointment",
          `Marked appointment as completed for ${appointment.client}`,
          "Info"
        );

        toast({
          title: "Success",
          description: "Appointment marked as completed.",
        });

        await loadAppointmentDetails();

        if (onRefresh) {
          onRefresh();
        }
      }
    } catch (error: any) {
      console.error("Error completing appointment:", error);

      await logAction(
        "Appointment Completion Error",
        `Appointment: ${appointment.id}`,
        `Failed to mark as completed: ${error.message}`,
        "Critical"
      );

      toast({
        title: "Error",
        description: error.message || "Failed to mark appointment as completed",
        variant: "destructive",
      });
    }
  };

  const handleOpenVideoCall = () => {
    if (!appointment?.videoLink) {
      toast({
        title: "No Video Link",
        description: "Please add a video link to this appointment first",
        variant: "destructive",
      });

      logAction(
        "Video Call Attempt Failed",
        `Appointment: ${appointment?.id}`,
        `Attempted to start video call without video link for ${appointment?.client}`,
        "Warning"
      );
      return;
    }

    logAction(
      "Video Call Started",
      `Appointment: ${appointment.id}`,
      `Started video call with ${appointment.client}`,
      "Info"
    );

    window.open(appointment.videoLink, "_blank", "noopener,noreferrer");

    toast({
      title: "Starting Video Call",
      description: "Video call is opening in a new tab",
    });
  };

  const handleOpenVideoLinkInput = () => {
    setShowVideoLinkInput(true);

    logAction(
      "Open Video Link Input",
      `Appointment: ${appointment?.id}`,
      `Opened video link input modal for ${appointment?.client} appointment`,
      "Info"
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleViewAppointment = () => {
    if (appointment) {
      logAction(
        "View Appointment Details",
        `Appointment: ${appointment.id}`,
        `Viewed details for ${appointment.client} appointment on ${appointment.date} at ${appointment.time}`,
        "Info"
      );
    }
  };

  useEffect(() => {
    if (isOpen && appointment) {
      handleViewAppointment();
    }
  }, [isOpen, appointment]);

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-navy-700" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>{error}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!appointment) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Appointment Details
          </DialogTitle>
          <DialogDescription>ID: {appointment.id}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <Badge
                className={`${getStatusColor(appointment.status)} px-3 py-1`}
              >
                <div className="flex items-center gap-2">
                  {getStatusIcon(appointment.status)}
                  <span className="font-medium">
                    {appointment.status.charAt(0).toUpperCase() +
                      appointment.status.slice(1)}
                  </span>
                </div>
              </Badge>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Created: {formatDate(appointment.createdAt)}
              </div>
            </div>

            {isAdmin && (
              <div className="flex flex-wrap gap-2">
                {appointment.status === "pending" && (
                  <>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleStatusChange("confirmed")}
                      disabled={showVideoLinkInput || isConfirming}
                    >
                      {isConfirming ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Confirm"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelClick}
                      disabled={showVideoLinkInput || isConfirming}
                    >
                      Cancel
                    </Button>
                  </>
                )}
                {appointment.status === "confirmed" && (
                  <>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={handleMarkAsCompleted}
                      disabled={showVideoLinkInput || isConfirming}
                    >
                      Mark as Completed
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRescheduleClick}
                      disabled={showVideoLinkInput || isConfirming}
                    >
                      Reschedule
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleCancelClick}
                      disabled={showVideoLinkInput || isConfirming}
                    >
                      Cancel
                    </Button>
                  </>
                )}
                {(appointment.status === "cancelled" ||
                  appointment.status === "completed") && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRescheduleClick}
                    disabled={showVideoLinkInput || isConfirming}
                  >
                    Reschedule
                  </Button>
                )}
              </div>
            )}

            {!isAdmin &&
              appointment.status !== "cancelled" &&
              appointment.status !== "completed" && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRescheduleClick}
                    disabled={showVideoLinkInput || isConfirming}
                  >
                    Request Reschedule
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleCancelClick}
                    disabled={showVideoLinkInput || isConfirming}
                  >
                    Cancel Appointment
                  </Button>
                </div>
              )}
          </div>

          {/* Video Link Input for Admin */}
          {isAdmin && isVirtualConsultation() && (
            <div className="space-y-4">
              {showVideoLinkInput ? (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <Video className="h-5 w-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-800 dark:text-blue-300">
                      {appointment.status === "pending"
                        ? "Video Consultation Link Required"
                        : "Update Video Consultation Link"}
                    </h4>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    Please provide the video consultation link (Zoom, Google
                    Meet, etc.)
                    {appointment.status === "pending" &&
                      " before confirming this appointment."}
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="video-link">Video Consultation URL</Label>
                    <div className="flex gap-2">
                      <Input
                        id="video-link"
                        type="url"
                        placeholder="https://zoom.us/j/123456789 or https://meet.google.com/abc-defg-hij"
                        value={videoLink}
                        onChange={(e) => handleVideoLinkChange(e.target.value)}
                        className={!isVideoLinkValid ? "border-red-500" : ""}
                        disabled={isConfirming || isUpdatingVideoLink}
                      />
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={
                          appointment.status === "pending"
                            ? handleConfirmWithVideoLink
                            : handleUpdateVideoLink
                        }
                        disabled={
                          !videoLink ||
                          !isVideoLinkValid ||
                          isConfirming ||
                          isUpdatingVideoLink
                        }
                      >
                        {isConfirming || isUpdatingVideoLink ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            {appointment.status === "pending"
                              ? "Confirming..."
                              : "Updating..."}
                          </>
                        ) : appointment.status === "pending" ? (
                          "Confirm with Link"
                        ) : (
                          "Update Link"
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowVideoLinkInput(false);
                          setVideoLink(appointment.videoLink || "");
                        }}
                        disabled={isConfirming || isUpdatingVideoLink}
                      >
                        Cancel
                      </Button>
                    </div>
                    {!isVideoLinkValid && videoLink && (
                      <p className="text-sm text-red-500">
                        {videoLinkValidation.message ||
                          "Please enter a valid video conference link"}
                      </p>
                    )}
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Supported platforms: Zoom, Google Meet, Microsoft Teams,
                      etc.
                    </div>
                  </div>
                </div>
              ) : hasVideoLink() ? (
                <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <LinkIcon className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Video Consultation Link
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-md">
                          {appointment.videoLink}
                        </p>
                        {appointment.videoLinkAddedAt && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Added:{" "}
                            {new Date(
                              appointment.videoLinkAddedAt
                            ).toLocaleString()}
                            {appointment.videoLinkAddedBy &&
                              ` by ${appointment.videoLinkAddedBy}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={handleTestVideoLink}
                      >
                        <ExternalLink className="h-4 w-4" />
                        Test
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={handleCopyVideoLink}
                      >
                        {copied ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleOpenVideoLinkInput}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                          No Video Link Added
                        </p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-400">
                          This virtual consultation requires a video link.
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleOpenVideoLinkInput}
                    >
                      Add Video Link
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Appointment Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border">
                <CalendarIcon className="h-5 w-5 text-navy-600" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Date</p>
                  <p className="text-lg">{formatDate(appointment.date)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border">
                <Clock className="h-5 w-5 text-navy-600" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Time</p>
                  <p className="text-lg font-medium">{appointment.time}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border">
                {getLocationIcon(appointment.location)}
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Location/Type
                  </p>
                  <p className="text-lg">{appointment.location}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {appointment.consultationType === "online"
                      ? "Online Consultation"
                      : "In-Person Consultation"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border">
                <User className="h-5 w-5 text-navy-600" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Attorney</p>
                  <p className="text-lg">{appointment.attorney}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              Client Information
            </h3>

            {isLoadingUser ? (
              <div className="flex justify-center items-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-navy-700 mr-2" />
                <span>Loading user details...</span>
              </div>
            ) : userDetails ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border">
                  <User className="h-5 w-5 text-navy-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Client Name
                    </p>
                    <p className="text-lg font-medium">
                      {userDetails.fullName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border">
                  <Mail className="h-5 w-5 text-navy-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <p className="text-lg">{userDetails.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border">
                  <Phone className="h-5 w-5 text-navy-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Phone</p>
                    <p className="text-lg">
                      {userDetails.phone || "Not provided"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border">
                  <User className="h-5 w-5 text-navy-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Client Name
                    </p>
                    <p className="text-lg">{appointment.client}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border">
                  <Mail className="h-5 w-5 text-navy-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <p className="text-lg">
                      {appointment.clientEmail || "Not provided"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border">
                  <Phone className="h-5 w-5 text-navy-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Phone</p>
                    <p className="text-lg">
                      {appointment.clientPhone || "Not provided"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Description</h3>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-gray-700 dark:text-gray-300">
                {appointment.description || "No description provided"}
              </p>
            </div>
          </div>
          {(appointment.rescheduleReason || appointment.cancellationReason) && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  {appointment.rescheduleReason
                    ? "Reschedule Details"
                    : "Cancellation Details"}
                </h3>
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="font-medium text-amber-800 dark:text-amber-300 mb-1">
                    Reason:
                  </p>
                  <p className="text-amber-700 dark:text-amber-400">
                    {appointment.rescheduleReason ||
                      appointment.cancellationReason}
                  </p>
                  <div className="mt-2 text-sm text-amber-600 dark:text-amber-500">
                    {appointment.rescheduledBy &&
                      `Rescheduled by: ${appointment.rescheduledBy}`}
                    {appointment.cancelledBy &&
                      `Cancelled by: ${appointment.cancelledBy}`}
                  </div>
                </div>
              </div>
            </>
          )}

          {appointment.status === "confirmed" && isVirtualConsultation() && (
            <>
              <Separator />
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-green-800 dark:text-green-300 mb-1">
                      Ready for Video Consultation
                    </h4>
                    <p className="text-sm text-green-700 dark:text-green-400">
                      Join the video call 5 minutes before your scheduled time
                    </p>
                    {hasVideoLink() ? (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="font-medium">Meeting Link: </span>
                        <a
                          href={appointment.videoLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline dark:text-blue-400 truncate max-w-xs"
                        >
                          {appointment.videoLink}
                        </a>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={handleCopyVideoLink}
                          title="Copy link"
                        >
                          {copied ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
                        <span className="font-medium">Note: </span>
                        Video link not yet provided. Please contact your
                        attorney.
                      </div>
                    )}
                  </div>
                  <Button
                    className="bg-green-600 hover:bg-green-700 gap-2"
                    onClick={
                      hasVideoLink()
                        ? handleOpenVideoCall
                        : handleOpenVideoLinkInput
                    }
                    disabled={!hasVideoLink() && !isAdmin}
                  >
                    <Video className="h-4 w-4" />
                    {isAdmin ? "Start Call" : "Join Call"}
                  </Button>
                </div>
              </div>
            </>
          )}

          <DialogFooter>
            <Button
              onClick={onClose}
              className="w-full sm:w-auto"
              disabled={isConfirming || isUpdatingVideoLink}
            >
              Close
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
