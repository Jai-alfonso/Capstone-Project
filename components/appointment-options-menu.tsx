"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreVertical, Trash2, Calendar } from "lucide-react"

interface AppointmentOptionsMenuProps {
  appointmentId: string
  onReschedule: (id: string) => void
  onCancel: (id: string) => void
}

export function AppointmentOptionsMenu({ appointmentId, onReschedule, onCancel }: AppointmentOptionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => onReschedule(appointmentId)}
          className="cursor-pointer flex items-center gap-2"
        >
          <Calendar className="h-4 w-4" />
          <span>Reschedule</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onCancel(appointmentId)}
          className="cursor-pointer flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Trash2 className="h-4 w-4" />
          <span>Cancel</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
