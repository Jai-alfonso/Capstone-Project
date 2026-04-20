"use client"

import { Scale } from "lucide-react"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  text?: string
}

export function LoadingSpinner({ size = "md", text = "Loading..." }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  }

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative">
        <div className={`${sizeClasses[size]} bg-navy-700 rounded-lg flex items-center justify-center animate-pulse`}>
          <Scale
            className={`${size === "sm" ? "h-4 w-4" : size === "md" ? "h-6 w-6" : "h-8 w-8"} text-white animate-bounce`}
          />
        </div>
        <div className="absolute inset-0 bg-navy-700 rounded-lg animate-ping opacity-20"></div>
      </div>
      <p className={`${textSizes[size]} text-navy-700 font-medium animate-pulse`}>{text}</p>
    </div>
  )
}
