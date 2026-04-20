import { useCallback } from "react";
import AuditLogger from "@/lib/auditLogger";
import { useAuth } from "@/lib/auth-context";

export function useAuditLogger() {
  const getCurrentUser = () => {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          return JSON.parse(userStr);
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  };

  const getCurrentUserRole = () => {
    const user = getCurrentUser();
    return user?.role || "Admin";
  };

  const getCurrentUserName = () => {
    const user = getCurrentUser();
    return user?.name || user?.email || "Admin User";
  };

  const logAction = useCallback(
    async (
      action: string,
      resource: string,
      details: string,
      severity: "Critical" | "Warning" | "Medium" | "Info" | "Low" = "Info",
      metadata?: Record<string, any>
    ) => {
      try {
        await AuditLogger.log({
          user: getCurrentUserName(),
          userRole: getCurrentUserRole(),
          action,
          resource,
          details,
          severity,
          ipAddress: undefined,
          userAgent: undefined,
          metadata: metadata || {},
        });
      } catch (error) {
        console.error("Failed to log action:", error);
      }
    },
    []
  );

  const logLogin = useCallback(async (success: boolean, details: string) => {
    await AuditLogger.logLogin(
      getCurrentUserName(),
      getCurrentUserRole(),
      success,
      details
    );
  }, []);

  const logLogout = useCallback(async () => {
    await AuditLogger.logLogout(getCurrentUserName(), getCurrentUserRole());
  }, []);

  const logDocumentAction = useCallback(
    async (
      action: "Created" | "Updated" | "Deleted" | "Viewed",
      documentType: string,
      documentId: string,
      details: string,
      severity: "Critical" | "Warning" | "Medium" | "Info" | "Low" = "Info"
    ) => {
      await AuditLogger.logDocumentAction(
        getCurrentUserName(),
        getCurrentUserRole(),
        action,
        documentType,
        documentId,
        details,
        severity
      );
    },
    []
  );

  const logUserAction = useCallback(
    async (
      action: "Created" | "Updated" | "Deleted" | "Viewed",
      targetUser: string,
      details: string,
      severity: "Critical" | "Warning" | "Medium" | "Info" | "Low" = "Info"
    ) => {
      await AuditLogger.logUserAction(
        getCurrentUserName(),
        action,
        targetUser,
        details,
        severity
      );
    },
    []
  );

  const logCaseAction = useCallback(
    async (
      action: "Created" | "Updated" | "Deleted" | "Status Changed",
      caseId: string,
      caseTitle: string,
      details: string,
      severity: "Critical" | "Warning" | "Medium" | "Info" | "Low" = "Info"
    ) => {
      await AuditLogger.logCaseAction(
        getCurrentUserName(),
        getCurrentUserRole(),
        action,
        caseId,
        caseTitle,
        details,
        severity
      );
    },
    []
  );

  const logAppointmentAction = useCallback(
    async (
      action:
        | "Created"
        | "Updated"
        | "Deleted"
        | "Status Changed"
        | "Rescheduled"
        | "Cancelled"
        | "Confirmed"
        | "Completed",
      appointmentId: string,
      appointmentTitle: string,
      details: string,
      severity: "Critical" | "Warning" | "Medium" | "Info" | "Low" = "Info"
    ) => {
      await AuditLogger.logAppointmentAction(
        getCurrentUserName(),
        getCurrentUserRole(),
        action,
        appointmentId,
        appointmentTitle,
        details,
        severity
      );
    },
    []
  );

  return {
    logAction,
    logLogin,
    logLogout,
    logDocumentAction,
    logUserAction,
    logCaseAction,
    logAppointmentAction,
    logger: AuditLogger,
  };
}

export default useAuditLogger;
