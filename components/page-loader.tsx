"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

interface PageLoaderProps {
  isLoading: boolean
}

export function PageLoader({ isLoading }: PageLoaderProps) {
  const [show, setShow] = useState(isLoading)

  useEffect(() => {
    if (isLoading) {
      setShow(true)
    } else {
      const timer = setTimeout(() => setShow(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isLoading])

  if (!show) return null

  return (
    <div
      className={`fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity duration-300 ${
        isLoading ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="text-center">
        <div className="relative mb-6">
          <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center animate-pulse shadow-lg overflow-hidden">
            <Image
              src="/logo.jpg"
              alt="Delgado Law Office Logo"
              width={64}
              height={64}
              className="animate-bounce rounded-lg"
            />
          </div>
          <div className="absolute inset-0 bg-navy-700 rounded-xl animate-ping opacity-20"></div>
          <div className="absolute -inset-2 bg-gradient-to-r from-navy-700 via-red-accent to-navy-700 rounded-xl opacity-20 animate-spin"></div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-bold font-playfair text-navy-900 animate-pulse">Delgado Law Office</h3>
          <p className="text-sm text-gray-600 animate-pulse">Loading your legal portal...</p>
        </div>

        <div className="mt-6 flex justify-center">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-navy-700 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
            <div className="w-2 h-2 bg-navy-700 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
            <div
              className="w-2 h-2 bg-red-accent rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  )
}
