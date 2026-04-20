"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AccountRequiredModal } from "@/components/account-required-modal"

interface ServiceModalProps {
  title: string
  description: string
  services: string[]
  note: string
}

export function ServiceModal({ title, description, services, note }: ServiceModalProps) {
  const [open, setOpen] = useState(false)
  const [showAccountRequired, setShowAccountRequired] = useState(false)

  const handleBookService = () => {
    setOpen(false)
    setShowAccountRequired(true)
  }

  const handleCloseAccountRequired = () => {
    setShowAccountRequired(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            className="bg-slate-700 hover:bg-slate-800 text-white transition-all duration-300 hover:scale-105 hover:shadow-md transform mt-4"
            size="lg"
          >
            Learn More
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px] p-0 bg-white rounded-lg">
          <div className="p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-serif font-bold text-center text-gray-900">{title}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <p className="text-gray-700 leading-relaxed">{description}</p>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">During your service, we will:</h4>
                <ul className="space-y-2">
                  {services.map((service, index) => (
                    <li key={index} className="flex items-start">
                      <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      <span className="text-gray-700">{service}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-gray-600 italic text-sm leading-relaxed">{note}</p>

              <Button
                className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-md font-medium transition-colors"
                onClick={handleBookService}
              >
                Book This Service
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AccountRequiredModal open={showAccountRequired} onOpenChange={handleCloseAccountRequired} />
    </>
  )
}
