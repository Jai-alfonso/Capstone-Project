"use client"
import { useEffect } from "react"
import type React from "react"

import { useRouter } from "next/navigation"
import { useAuthContext } from "./auth-provider"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: "admin" | "client"
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, userProfile, loading } = useAuthContext()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/auth/login")
        return
      }

      if (requiredRole && userProfile?.role !== requiredRole) {
        // Redirect to appropriate dashboard based on user role
        if (userProfile?.role === "admin") {
          router.push("/dashboard/admin")
        } else if (userProfile?.role === "client") {
          router.push("/dashboard/client")
        } else {
          router.push("/auth/login")
        }
        return
      }
    }
  }, [user, userProfile, loading, requiredRole, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-navy-900"></div>
      </div>
    )
  }

  if (!user || (requiredRole && userProfile?.role !== requiredRole)) {
    return null
  }

  return <>{children}</>
}
