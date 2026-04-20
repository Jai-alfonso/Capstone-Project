"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, Clock, Circle } from "lucide-react"

interface ProgressStage {
  id: string
  name: string
  description: string
  status: "pending" | "in-progress" | "completed"
  completedAt?: string
  order: number
}

interface CaseProgressProps {
  appointmentId: string
  className?: string
}

export function CaseProgress({ appointmentId, className }: CaseProgressProps) {
  const [progressStages, setProgressStages] = useState<ProgressStage[]>([])
  const [serviceType, setServiceType] = useState<string>("")
  const [legalService, setLegalService] = useState<string>("")

  useEffect(() => {
    loadProgress()
  }, [appointmentId])

  const loadProgress = () => {
    const saved = localStorage.getItem("appointments")
    if (saved) {
      const appointments = JSON.parse(saved)
      const appointment = appointments.find((apt: any) => apt.id === appointmentId)
      if (appointment) {
        setProgressStages(appointment.progressStages || [])
        setServiceType(appointment.serviceType || "")
        setLegalService(appointment.legalService || "")
      }
    }
  }

  const calculateProgress = () => {
    if (progressStages.length === 0) return 0
    const completed = progressStages.filter(s => s.status === "completed").length
    return (completed / progressStages.length) * 100
  }

  const getStageIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "in-progress":
        return <Clock className="h-5 w-5 text-blue-500" />
      default:
        return <Circle className="h-5 w-5 text-gray-300" />
    }
  }

  const getStageColor = (status: string) => {
    switch (status) {
      case "completed":
        return "border-green-500 bg-green-50 dark:bg-green-900/20"
      case "in-progress":
        return "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
      default:
        return "border-gray-200 dark:border-gray-700"
    }
  }

  if (serviceType !== "complex" || progressStages.length === 0) {
    return null
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Case Progress</CardTitle>
        <CardDescription>
          {legalService || "Complex Legal Case"} - Track your case progress here
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Overall Progress</span>
            <span className="text-sm font-bold text-navy-700 dark:text-navy-300">
              {Math.round(calculateProgress())}%
            </span>
          </div>
          <Progress value={calculateProgress()} className="h-2" />
        </div>

        {/* Timeline */}
        <div className="space-y-4">
          {progressStages.map((stage, index) => (
            <div key={stage.id} className="relative">
              {/* Connector Line */}
              {index < progressStages.length - 1 && (
                <div className={`absolute left-[10px] top-[32px] w-[2px] h-[calc(100%+16px)] ${
                  stage.status === "completed" ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                }`} />
              )}

              <div className={`border-2 rounded-lg p-4 ${getStageColor(stage.status)}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {getStageIcon(stage.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm">{stage.name}</h4>
                      <Badge 
                        variant={
                          stage.status === "completed" ? "default" : 
                          stage.status === "in-progress" ? "secondary" : "outline"
                        }
                        className="text-xs"
                      >
                        {stage.status === "in-progress" ? "In Progress" : 
                         stage.status === "completed" ? "Completed" : "Pending"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {stage.description}
                    </p>
                    {stage.completedAt && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                        ✓ Completed on {new Date(stage.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
