"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BarChart3,
  Search,
  Printer,
  User,
  Calendar,
  Activity,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { AdminDashboardLayout } from "@/components/admin-dashboard-layout";
import {
  collection,
  query,
  orderBy,
  getDocs,
  Timestamp,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { PDFGenerator } from "@/lib/pdf-generator";
import UserService from "@/lib/user-service";

interface AuditLog {
  id: string;
  timestamp: string | Date;
  user: string;
  userRole: string;
  action: string;
  resource: string;
  details: string;
  severity: "Critical" | "Warning" | "Medium" | "Info" | "Low";
  ipAddress: string;
  userAgent: string;
  createdAt?: Timestamp;
}

export default function AdminAuditLogsPage() {
  const router = useRouter();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDoc, setLastDoc] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [adminUserData, setAdminUserData] = useState<any>(null);

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser?.uid) {
        try {
          const data = await UserService.getUserById(firebaseUser.uid);
          setAdminUserData(data);
        } catch (error) {
          console.error("Error fetching admin user data:", error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchAuditLogs = async (loadMore = false) => {
    try {
      if (!db) {
        throw new Error("Firestore database is not initialized");
      }

      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      let q = query(
        collection(db, "auditLogs"),
        orderBy("createdAt", "desc"),
        limit(20)
      );

      if (loadMore && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const querySnapshot = await getDocs(q);
      const logs: AuditLog[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const timestamp = data.createdAt?.toDate();

        logs.push({
          id: doc.id,
          timestamp: timestamp || data.timestamp || new Date(),
          user: data.user || data.email || "Unknown User",
          userRole: data.userRole || data.role || "Unknown Role",
          action: data.action || "Unknown Action",
          resource: data.resource || "System",
          details: data.details || data.message || "No details available",
          severity: data.severity || "Info",
          ipAddress: data.ipAddress || data.ip || "0.0.0.0",
          userAgent: data.userAgent || data.browser || "Unknown Browser",
          createdAt: data.createdAt,
        });
      });

      if (loadMore) {
        setAuditLogs((prev) => [...prev, ...logs]);
      } else {
        setAuditLogs(logs);
      }

      if (querySnapshot.docs.length > 0) {
        setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
        setHasMore(querySnapshot.docs.length === 20);
      } else {
        setHasMore(false);
      }
    } catch (error: any) {
      console.error("Error fetching audit logs:", error);
      setError(error.message || "Failed to load audit logs. Please try again.");

      if (!loadMore) {
        setAuditLogs([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Critical":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border border-red-200 dark:border-red-800";
      case "Warning":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800";
      case "Medium":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border border-orange-200 dark:border-orange-800";
      case "Info":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800";
      case "Low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border border-green-200 dark:border-green-800";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 border border-gray-200 dark:border-gray-800";
    }
  };

  const getUniqueActions = () => {
    const actions = auditLogs.map((log) => log.action).filter(Boolean);
    return [...new Set(actions)].sort();
  };

  const filteredLogs = auditLogs.filter((log) => {
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        log.user.toLowerCase().includes(searchLower) ||
        log.action.toLowerCase().includes(searchLower) ||
        log.resource.toLowerCase().includes(searchLower) ||
        log.details.toLowerCase().includes(searchLower) ||
        log.userRole.toLowerCase().includes(searchLower) ||
        log.severity.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;
    }

    if (severityFilter !== "all" && log.severity !== severityFilter) {
      return false;
    }

    if (
      actionFilter !== "all" &&
      !log.action.toLowerCase().includes(actionFilter.toLowerCase())
    ) {
      return false;
    }

    return true;
  });

  const severityStats = {
    total: filteredLogs.length,
    critical: filteredLogs.filter((log) => log.severity === "Critical").length,
    warning: filteredLogs.filter((log) => log.severity === "Warning").length,
    medium: filteredLogs.filter((log) => log.severity === "Medium").length,
    info: filteredLogs.filter((log) => log.severity === "Info").length,
    low: filteredLogs.filter((log) => log.severity === "Low").length,
  };

  const printAuditLogs = () => {
    if (filteredLogs.length === 0) {
      setError("No audit logs to download");
      return;
    }

    try {
      const pdfGen = new PDFGenerator();
      
      const logsData = filteredLogs.map(log => ({
        timestamp: log.timestamp,
        user: log.user,
        userRole: log.userRole,
        action: log.action,
        resource: log.resource,
        severity: log.severity,
        details: log.details,
      }));
      
      pdfGen.generateAuditLogsReport(
        logsData,
        adminUserData?.fullName || 'Administrator',
        adminUserData?.email || 'N/A'
      );
      
      const filename = `Audit_Logs_${new Date().toISOString().split('T')[0]}.pdf`;
      pdfGen.download(filename);
      
      setError(null);
    } catch (error) {
      console.error("Error generating PDF:", error);
      setError("Failed to generate PDF report");
    }
  };

  const formatTimestamp = (timestamp: string | Date, forExport = false) => {
    if (!timestamp) return "N/A";

    const date =
      typeof timestamp === "string" ? new Date(timestamp) : timestamp;

    if (forExport) {
      return date.toISOString();
    }

    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const resetAll = () => {
    setSearchQuery("");
    setSeverityFilter("all");
    setActionFilter("all");
  };

  const uniqueActions = getUniqueActions();

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-serif text-gray-900 dark:text-white">
              Audit Logs
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Monitor system activities and security events
            </p>
            {error && (
              <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetAll} disabled={loading}>
              Reset All
            </Button>
            <Button
              className="bg-white hover:bg-gray-50 border-navy-200"
              onClick={printAuditLogs}
              disabled={filteredLogs.length === 0 || loading}
              variant="outline"
            >
              <Printer className="h-4 w-4 mr-2" />
              Download Reports (PDF)
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search logs by user, action, resource, or details..."
              value={searchQuery}
              onChange={handleSearch}
              className="pl-10"
              disabled={loading}
            />
          </div>
          <div className="flex gap-2">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              disabled={loading}
            >
              <option value="all">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="Warning">Warning</option>
              <option value="Medium">Medium</option>
              <option value="Info">Info</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        {/* Active Filters Info */}
        {(searchQuery ||
          severityFilter !== "all" ||
          actionFilter !== "all") && (
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredLogs.length} logs matching filters
              {searchQuery && ` • Search: "${searchQuery}"`}
              {severityFilter !== "all" && ` • Severity: ${severityFilter}`}
              {actionFilter !== "all" && ` • Action: ${actionFilter}`}
            </p>
          </div>
        )}

        {/* Audit Logs Table */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                System Activity Logs
                {loading && (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                )}
              </div>
              <span className="text-sm font-normal text-gray-600 dark:text-gray-400">
                Showing {filteredLogs.length} of {auditLogs.length} logs
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading && auditLogs.length === 0 ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Loading audit logs...
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Fetching data from Firestore
                </p>
              </div>
            ) : error && auditLogs.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Error loading audit logs
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {error}
                </p>
                <Button onClick={() => fetchAuditLogs()}>
                  Retry Loading
                </Button>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No audit logs found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {searchQuery ||
                  severityFilter !== "all" ||
                  actionFilter !== "all"
                    ? "No logs match your filter criteria"
                    : "No audit logs available in the database"}
                </p>
                {(searchQuery ||
                  severityFilter !== "all" ||
                  actionFilter !== "all") && (
                  <Button variant="outline" onClick={resetAll}>
                    Reset All Filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-start gap-4 flex-1">
                        <div className="p-2 bg-gray-100 dark:bg-gray-600 rounded-lg">
                          <Activity className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                              {log.action}
                            </h4>
                            <Badge
                              className={getSeverityColor(log.severity)}
                            >
                              {log.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                            {log.details}
                          </p>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span className="truncate">
                                {log.user} ({log.userRole})
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatTimestamp(log.timestamp)}</span>
                            </div>
                            <span className="truncate">
                              Resource: {log.resource}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {hasMore && !loading && (
                  <div className="text-center mt-6">
                    <Button
                      variant="outline"
                      onClick={() => fetchAuditLogs(true)}
                      disabled={loadingMore}
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        "Load More"
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  );
}