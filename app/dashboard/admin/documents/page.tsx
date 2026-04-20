"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FileText, Upload, Download, Eye, Search, Share, User, Calendar } from "lucide-react"
import { AdminDashboardLayout } from "@/components/admin-dashboard-layout"

const mockDocuments = []

export default function AdminDocumentsPage() {
  const router = useRouter()
  const [documents, setDocuments] = useState(mockDocuments)
  const [searchQuery, setSearchQuery] = useState("")

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "Under Review":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "Pending":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "Rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Legal Document":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "Medical Document":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "Insurance Document":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      case "Financial Document":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const filteredDocuments = documents.filter(
    (document) =>
      document.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      document.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      document.type.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-playfair text-navy-900 dark:text-white">Documents</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Manage all case documents and files</p>
          </div>
          <Button
            className="bg-navy-700 hover:bg-navy-800"
            onClick={() => router.push("/dashboard/admin/documents/upload")}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((document) => (
            <Card key={document.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium truncate">{document.name}</h3>
                    </div>
                  </div>
                  <Badge className={getStatusColor(document.status)}>{document.status}</Badge>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <Badge className={getTypeColor(document.type)} variant="outline">
                      {document.type}
                    </Badge>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{document.size}</span>
                  </div>

                  <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{document.clientName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      <span>Case: {document.caseId}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Uploaded: {document.uploadDate}</span>
                    </div>
                    <div>By: {document.uploadedBy}</div>
                  </div>
                </div>

                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-transparent"
                    onClick={() => router.push(`/dashboard/admin/documents/${document.id}`)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-transparent"
                    onClick={() => {
                      /* Handle download */
                    }}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      /* Handle share */
                    }}
                  >
                    <Share className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredDocuments.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No documents found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery ? "Try adjusting your search terms" : "No documents uploaded yet"}
            </p>
          </div>
        )}
      </div>
    </AdminDashboardLayout>
  )
}
