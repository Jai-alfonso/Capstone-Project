import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

export type AuditLogSeverity =
  | "Critical"
  | "Warning"
  | "Medium"
  | "Info"
  | "Low";

export interface AuditLogData {
  user: string;
  userRole: string;
  action: string;
  resource: string;
  details: string;
  severity: AuditLogSeverity;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export class AuditLogger {
  static async log(data: AuditLogData): Promise<void> {
    try {
      if (!db) {
        console.error("Firestore not initialized. Cannot log audit trail.");
        return;
      }

      const cleanData = this.cleanData(data);

      const logEntry = {
        ...cleanData,
        createdAt: Timestamp.now(),
        timestamp: new Date().toISOString(),
        ipAddress: cleanData.ipAddress || this.getClientIP(),
        userAgent: cleanData.userAgent || this.getUserAgent(),
      };

      const finalLogEntry = Object.fromEntries(
        Object.entries(logEntry).filter(([_, value]) => value !== undefined)
      );

      await addDoc(collection(db, "auditLogs"), finalLogEntry);
      console.log(`[Audit Log] ${data.action}: ${data.details}`);
    } catch (error) {
      console.error("Failed to create audit log:", error);

      this.fallbackLog(data);
    }
  }

  private static cleanData(data: any): any {
    const cleaned: any = {};

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        if (typeof value === "object" && !(value instanceof Date)) {
          const cleanedValue = this.cleanData(value);
          if (Object.keys(cleanedValue).length > 0) {
            cleaned[key] = cleanedValue;
          }
        } else {
          cleaned[key] = value;
        }
      }
    }

    return cleaned;
  }

  static async logLogin(
    user: string,
    userRole: string,
    success: boolean,
    details: string,
    ipAddress?: string
  ) {
    await this.log({
      user,
      userRole,
      action: success ? "User Login" : "Failed Login Attempt",
      resource: "Authentication System",
      details,
      severity: success ? "Info" : "Warning",
      ipAddress,
    });
  }

  static async logLogout(user: string, userRole: string, ipAddress?: string) {
    await this.log({
      user,
      userRole,
      action: "User Logout",
      resource: "Authentication System",
      details: "User logged out successfully",
      severity: "Info",
      ipAddress,
    });
  }

  static async logDocumentAction(
    user: string,
    userRole: string,
    action: "Created" | "Updated" | "Deleted" | "Viewed",
    documentType: string,
    documentId: string,
    details: string,
    severity: AuditLogSeverity = "Info"
  ) {
    await this.log({
      user,
      userRole,
      action: `Document ${action}`,
      resource: `${documentType} (ID: ${documentId})`,
      details,
      severity,
    });
  }

  static async logUserAction(
    adminUser: string,
    action: "Created" | "Updated" | "Deleted" | "Viewed",
    targetUser: string,
    details: string,
    severity: AuditLogSeverity = "Info"
  ) {
    await this.log({
      user: adminUser,
      userRole: "Administrator",
      action: `User ${action}`,
      resource: `User Profile: ${targetUser}`,
      details,
      severity,
    });
  }

  /**
   * Helper method for case management events
   */
  static async logCaseAction(
    user: string,
    userRole: string,
    action: "Created" | "Updated" | "Deleted" | "Status Changed",
    caseId: string,
    caseTitle: string,
    details: string,
    severity: AuditLogSeverity = "Info"
  ) {
    await this.log({
      user,
      userRole,
      action: `Case ${action}`,
      resource: `Case ${caseId}: ${caseTitle}`,
      details,
      severity,
    });
  }

  /**
   * Helper method for appointment events
   */
  static async logAppointmentAction(
    user: string,
    userRole: string,
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
    severity: AuditLogSeverity = "Info"
  ) {
    await this.log({
      user,
      userRole,
      action: `Appointment ${action}`,
      resource: `Appointment: ${appointmentId}`,
      details,
      severity,
    });
  }

  static async logSettingsChange(
    user: string,
    userRole: string,
    settingName: string,
    oldValue: any,
    newValue: any,
    severity: AuditLogSeverity = "Info"
  ) {
    await this.log({
      user,
      userRole,
      action: "Settings Updated",
      resource: `System Settings: ${settingName}`,
      details: `Changed from "${oldValue}" to "${newValue}"`,
      severity,
    });
  }

  private static getClientIP(): string {
    if (typeof window === "undefined") return "Server";

    return localStorage.getItem("client_ip") || "Unknown IP";
  }

  private static getUserAgent(): string {
    if (typeof window === "undefined") return "Server";

    return navigator.userAgent || "Unknown Browser";
  }

  private static fallbackLog(data: AuditLogData): void {
    if (typeof window !== "undefined") {
      const logs = JSON.parse(
        localStorage.getItem("auditLogs_fallback") || "[]"
      );
      logs.push({
        ...data,
        timestamp: new Date().toISOString(),
      });

      if (logs.length > 100) logs.shift();
      localStorage.setItem("auditLogs_fallback", JSON.stringify(logs));
    }
  }

  static getFallbackLogs(): any[] {
    if (typeof window === "undefined") return [];

    return JSON.parse(localStorage.getItem("auditLogs_fallback") || "[]");
  }
}

export default AuditLogger;
