import { AdminDashboardLayout } from "@/components/admin-dashboard-layout"
import { SkeletonLoader } from "@/components/skeleton-loader"

export default function AdminSettingsLoading() {
  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <SkeletonLoader className="h-8 w-48 mb-2" />
            <SkeletonLoader className="h-4 w-64" />
          </div>
          <SkeletonLoader className="h-10 w-32" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="border rounded-lg p-6">
              <SkeletonLoader className="h-6 w-32 mb-4" />
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <SkeletonLoader key={i} className="h-8 w-full" />
                ))}
              </div>
            </div>
          </div>
          <div className="lg:col-span-2 space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border rounded-lg p-6">
                <SkeletonLoader className="h-6 w-48 mb-4" />
                <div className="space-y-4">
                  <SkeletonLoader className="h-10 w-full" />
                  <SkeletonLoader className="h-10 w-full" />
                  <SkeletonLoader className="h-20 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminDashboardLayout>
  )
}
