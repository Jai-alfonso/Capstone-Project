"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle, XCircle, User, CalendarIcon, Clock } from "lucide-react";
import { useAuditLogger } from "@/hooks/useAuditLogger";

interface CancelAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  appointmentDetails: {
    title: string;
    date: Date | string;
    time: string;
    client: string;
    clientId?: string;
    type?: string;
    location?: string;
  };
  onCancel: (appointmentId: string, reason: string) => Promise<void> | void;
  isClient?: boolean;
  userName?: string;
  userRole?: string;
}

export function CancelAppointmentModal({
  isOpen,
  onClose,
  appointmentId,
  appointmentDetails,
  onCancel,
  isClient = false,
  userName = "Admin User",
  userRole = "Administrator",
}: CancelAppointmentModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { logAction, logAppointmentAction } = useAuditLogger();

  const handleSubmit = async () => {
    setError("");
    setIsSubmitting(true);

    try {
      if (!reason.trim()) {
        setError("Please provide a reason for cancellation");

        await logAction(
          "Appointment Cancellation Attempt Failed",
          `Appointment: ${appointmentId}`,
          `Cancellation attempt failed: No reason provided for appointment with ${appointmentDetails.client}`,
          "Warning",
          {
            appointmentId,
            client: appointmentDetails.client,
            date: appointmentDetails.date,
            time: appointmentDetails.time,
          }
        );

        setIsSubmitting(false);
        return;
      }

      await logAppointmentAction(
        "Cancelled",
        appointmentId,
        appointmentDetails.title,
        `Cancelled appointment for ${appointmentDetails.client}. Reason: ${reason}`,
        "Warning"
      );

      await logAction(
        "Appointment Cancellation",
        `Appointment: ${appointmentId}`,
        `${isClient ? "Client" : "Admin"} cancelled appointment for ${
          appointmentDetails.client
        }. Reason: ${reason}`,
        isClient ? "Info" : "Warning",
        {
          appointmentId,
          client: appointmentDetails.client,
          clientId: appointmentDetails.clientId,
          date: appointmentDetails.date,
          time: appointmentDetails.time,
          reason,
          cancelledBy: isClient ? "Client" : "Administrator",
          userName,
          userRole,
          appointmentType: appointmentDetails.type,
          location: appointmentDetails.location,
        }
      );

      await onCancel(appointmentId, reason);

      await logAction(
        "Appointment Cancellation Completed",
        `Appointment: ${appointmentId}`,
        `Successfully cancelled appointment for ${appointmentDetails.client}. Client has been notified.`,
        "Info",
        {
          appointmentId,
          client: appointmentDetails.client,
          notificationSent: true,
        }
      );

      handleClose();
    } catch (error: any) {
      console.error("Error during cancellation:", error);

      await logAction(
        "Appointment Cancellation Error",
        `Appointment: ${appointmentId}`,
        `Failed to cancel appointment: ${error.message || "Unknown error"}`,
        "Critical",
        {
          appointmentId,
          client: appointmentDetails.client,
          error: error.message,
          reason,
        }
      );

      setError(
        error.message || "Failed to cancel appointment. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason("");
    setError("");
    onClose();
  };

  const formatDate = (date: Date | string): string => {
    if (date instanceof Date) {
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    try {
      const dateObj = new Date(date);
      return dateObj.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (err) {
      return String(date);
    }
  };

  const formatTime = (time: string): string => {
    if (!time) return "Not specified";

    const timeMatch = time.match(/^(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      let [_, hour, minute] = timeMatch;
      const hourNum = parseInt(hour);
      const period = hourNum >= 12 ? "PM" : "AM";
      const hour12 = hourNum % 12 || 12;
      return `${hour12}:${minute} ${period}`;
    }

    return time;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-red-600">
            <XCircle className="h-6 w-6" />
            Cancel Appointment
          </DialogTitle>
          <DialogDescription>
            You are about to cancel the following appointment. This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Appointment Details */}
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-3">
              {appointmentDetails.title || "Appointment"}
            </h3>

            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-gray-500" />
                <span>
                  <strong>Date:</strong> {formatDate(appointmentDetails.date)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span>
                  <strong>Time:</strong> {formatTime(appointmentDetails.time)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span>
                  <strong>Client:</strong> {appointmentDetails.client}
                </span>
              </div>

              {appointmentDetails.type && (
                <div>
                  <strong>Type:</strong> {appointmentDetails.type}
                </div>
              )}

              {appointmentDetails.location && (
                <div>
                  <strong>Location:</strong> {appointmentDetails.location}
                </div>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Appointment ID:{" "}
                <span className="font-mono">{appointmentId}</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Cancelled by:{" "}
                <span className="font-medium">
                  {userName} ({userRole})
                </span>
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                  Cancellation Failed
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {error}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Label htmlFor="cancel-reason" className="text-base font-semibold">
              Reason for Cancellation <span className="text-red-500">*</span>
              <span className="text-sm font-normal text-gray-500 block mt-1">
                Provide a clear reason for cancellation. This will be logged and
                may be shared with the client.
              </span>
            </Label>
            <Textarea
              id="cancel-reason"
              placeholder={
                isClient
                  ? "Example: Schedule conflict, no longer needed, etc..."
                  : "Example: Client request, office emergency, scheduling conflict, etc..."
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="resize-none"
              required
              disabled={isSubmitting}
            />
            <div className="text-xs text-gray-500 flex justify-between">
              <span>Minimum 10 characters recommended</span>
              <span>{reason.length}/500</span>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-semibold mb-1">Important Notice:</p>
                <ul className="space-y-1 list-disc pl-4">
                  <li>
                    {isClient
                      ? "Both you and the law office will be notified of this cancellation."
                      : "The client will be notified via email and in-app notification."}
                  </li>
                  <li>This action will be logged in the system audit trail.</li>
                  <li>
                    Appointment time slot will be made available for others.
                  </li>
                  <li>
                    Any associated reminders will be automatically cancelled.
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-red-600 hover:bg-red-700"
              disabled={!reason.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Confirm Cancellation
                </>
              )}
            </Button>
            <Button
              onClick={handleClose}
              variant="outline"
              className="flex-1"
              disabled={isSubmitting}
            >
              Keep Appointment
            </Button>
          </div>

          <div className="text-center text-xs text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-700">
            <p>
              All cancellations are recorded in the system audit log for
              compliance purposes.
            </p>
            {isClient && (
              <p className="mt-1">
                For refund inquiries, please contact the law office directly.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
