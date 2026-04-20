"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar, AlertCircle, CheckCircle } from "lucide-react"

interface ConsultationModalProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideButton?: boolean
}

const caseTypes = [
  "Legal Consultation",
  "Civil Case",
  "Criminal Case",
  "Administrative Case",
  "Special Proceedings",
  "Tax & Accounting",
  "Corporate Services",
  "Family Law",
  "Property Dispute",
  "Contract Dispute",
  "Other",
]

const timeSlots = [
  "8:00 AM",
  "8:30 AM",
  "9:00 AM",
  "9:30 AM",
  "10:00 AM",
  "10:30 AM",
  "1:00 PM",
  "1:30 PM",
  "2:00 PM",
  "2:30 PM",
  "3:00 PM",
  "3:30 PM",
  "4:00 PM",
  "4:30 PM",
  "5:00 PM",
  "5:30 PM",
]

export function ConsultationModal({ open, onOpenChange, hideButton = false }: ConsultationModalProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    preferredDate: "",
    preferredTime: "",
    caseType: "",
    briefDescription: "",
  })

  const validateFullName = (name: string) => {
    const nameRegex = /^[a-zA-Z\s.'-]+$/
    if (!name.trim()) return "Full name is required"
    if (name.trim().length < 2) return "Full name must be at least 2 characters"
    if (!nameRegex.test(name)) return "Full name can only contain letters, spaces, periods, hyphens, and apostrophes"
    return ""
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email.trim()) return "Email address is required"
    if (!emailRegex.test(email)) return "Please enter a valid email address (e.g., example@gmail.com)"
    return ""
  }

  const validatePhoneNumber = (phone: string) => {
    const phoneRegex = /^[0-9]+$/
    if (!phone.trim()) return "Phone number is required"
    if (!phoneRegex.test(phone)) return "Phone number can only contain numbers"
    if (phone.length !== 11) return "Phone number must be exactly 11 digits"
    return ""
  }

  const validateDate = (date: string) => {
    if (!date) return "Preferred date is required"
    const selectedDate = new Date(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (selectedDate < today) return "Date cannot be in the past"

    // Check if it's a Sunday (0 = Sunday)
    if (selectedDate.getDay() === 0) return "We are closed on Sundays. Please select another date"

    return ""
  }

  const validateTime = (time: string, date: string) => {
    if (!date) return "Please select a date first"
    if (!time) return "Preferred time is required"
    return ""
  }

  const validateCaseType = (caseType: string) => {
    if (!caseType) return "Case type is required"
    return ""
  }

  const validateDescription = (description: string) => {
    if (!description.trim()) return "Brief description is required"
    if (description.trim().length < 10) return "Description must be at least 10 characters"
    if (description.trim().length > 500) return "Description must not exceed 500 characters"
    return ""
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }

    // Special handling for phone number - only allow numbers
    if (field === "phoneNumber") {
      const numbersOnly = value.replace(/[^0-9]/g, "")
      if (numbersOnly.length <= 11) {
        setFormData((prev) => ({ ...prev, [field]: numbersOnly }))
      }
      return
    }

    // Special handling for full name - only allow letters and valid characters
    if (field === "fullName") {
      const validChars = value.replace(/[^a-zA-Z\s.'-]/g, "")
      setFormData((prev) => ({ ...prev, [field]: validChars }))
      return
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    newErrors.fullName = validateFullName(formData.fullName)
    newErrors.email = validateEmail(formData.email)
    newErrors.phoneNumber = validatePhoneNumber(formData.phoneNumber)
    newErrors.preferredDate = validateDate(formData.preferredDate)
    newErrors.preferredTime = validateTime(formData.preferredTime, formData.preferredDate)
    newErrors.caseType = validateCaseType(formData.caseType)
    newErrors.briefDescription = validateDescription(formData.briefDescription)

    // Remove empty errors
    Object.keys(newErrors).forEach((key) => {
      if (!newErrors[key]) delete newErrors[key]
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000))

      console.log("Consultation request:", formData)
      setIsSuccess(true)

      // Reset form after success
      setTimeout(() => {
        setIsOpen(false)
        setIsSuccess(false)
        setFormData({
          fullName: "",
          email: "",
          phoneNumber: "",
          preferredDate: "",
          preferredTime: "",
          caseType: "",
          briefDescription: "",
        })
        setErrors({})
      }, 2000)
    } catch (error) {
      setErrors({ submit: "Failed to submit request. Please try again." })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split("T")[0]
  }

  const isOpen = open !== undefined ? open : internalOpen
  const setIsOpen = onOpenChange || setInternalOpen

  if (isSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        {!hideButton && (
          <DialogTrigger asChild>
            <Button
              size="lg"
              className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-500 dark:hover:bg-red-600 dark:text-white transition-all duration-300 hover:scale-105 hover:shadow-lg transform rounded-full"
            >
              <Calendar className="mr-2 h-5 w-5" />
              Schedule Consultation
            </Button>
          </DialogTrigger>
        )}
        <DialogContent className="sm:max-w-[500px]">
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-navy-900 mb-2">Request Submitted Successfully!</h2>
            <p className="text-gray-600">
              Thank you for your consultation request. We will contact you within 24 hours to confirm your appointment.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!hideButton && (
        <DialogTrigger asChild>
          <Button
            size="lg"
            className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-500 dark:hover:bg-red-600 dark:text-white transition-all duration-300 hover:scale-105 hover:shadow-lg transform rounded-full"
          >
            <Calendar className="mr-2 h-5 w-5" />
            Schedule Consultation
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-playfair text-navy-900">Schedule a Consultation</DialogTitle>
          <DialogDescription>
            Fill out all the required fields below and we'll get back to you within 24 hours to confirm your
            appointment.
          </DialogDescription>
        </DialogHeader>

        {errors.submit && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errors.submit}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => handleInputChange("fullName", e.target.value)}
              placeholder="Enter your full name"
              className={errors.fullName ? "border-red-500" : ""}
            />
            {errors.fullName && <p className="text-sm text-red-500 mt-1">{errors.fullName}</p>}
          </div>

          {/* Email Address */}
          <div>
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="example@gmail.com"
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
          </div>

          {/* Phone Number */}
          <div>
            <Label htmlFor="phoneNumber">Phone Number *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">+63</span>
              <Input
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                placeholder="91234567890 (11 digits)"
                maxLength={11}
                className={`pl-12 ${errors.phoneNumber ? "border-red-500" : ""}`}
              />
            </div>
            {errors.phoneNumber && <p className="text-sm text-red-500 mt-1">{errors.phoneNumber}</p>}
            <p className="text-xs text-gray-500 mt-1">Enter 11-digit phone number (numbers only, starting with 9)</p>
          </div>

          {/* Preferred Date */}
          <div>
            <Label htmlFor="preferredDate">Preferred Date *</Label>
            <Input
              id="preferredDate"
              type="date"
              value={formData.preferredDate}
              onChange={(e) => handleInputChange("preferredDate", e.target.value)}
              min={getTodayDate()}
              className={errors.preferredDate ? "border-red-500" : ""}
            />
            {errors.preferredDate && <p className="text-sm text-red-500 mt-1">{errors.preferredDate}</p>}
            <p className="text-xs text-gray-500 mt-1">We are closed on Sundays</p>
          </div>

          {/* Preferred Time */}
          <div>
            <Label htmlFor="preferredTime">Preferred Time *</Label>
            <Select
              value={formData.preferredTime}
              onValueChange={(value) => handleInputChange("preferredTime", value)}
              disabled={!formData.preferredDate}
            >
              <SelectTrigger className={errors.preferredTime ? "border-red-500" : ""}>
                <SelectValue
                  placeholder={!formData.preferredDate ? "Please select a date first" : "Select preferred time"}
                />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2 text-sm font-medium text-gray-700 border-b">Morning</div>
                {timeSlots.slice(0, 6).map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
                <div className="p-2 text-sm font-medium text-gray-700 border-b">Afternoon</div>
                {timeSlots.slice(6).map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.preferredTime && <p className="text-sm text-red-500 mt-1">{errors.preferredTime}</p>}
            {!formData.preferredDate && (
              <p className="text-xs text-orange-500 mt-1">Please select a date first to choose a time</p>
            )}
          </div>

          {/* Case Type */}
          <div>
            <Label htmlFor="caseType">Case Type *</Label>
            <Select value={formData.caseType} onValueChange={(value) => handleInputChange("caseType", value)}>
              <SelectTrigger className={errors.caseType ? "border-red-500" : ""}>
                <SelectValue placeholder="Select the type of legal matter" />
              </SelectTrigger>
              <SelectContent>
                {caseTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.caseType && <p className="text-sm text-red-500 mt-1">{errors.caseType}</p>}
          </div>

          {/* Brief Description */}
          <div>
            <Label htmlFor="briefDescription">Brief Description *</Label>
            <Textarea
              id="briefDescription"
              placeholder="Please provide a brief description of your legal matter (10-500 characters)..."
              value={formData.briefDescription}
              onChange={(e) => handleInputChange("briefDescription", e.target.value)}
              rows={4}
              maxLength={500}
              className={errors.briefDescription ? "border-red-500" : ""}
            />
            <div className="flex justify-between items-center mt-1">
              {errors.briefDescription && <p className="text-sm text-red-500">{errors.briefDescription}</p>}
              <p className="text-xs text-gray-500 ml-auto">{formData.briefDescription.length}/500 characters</p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              className="flex-1 bg-navy-700 hover:bg-navy-800 transition-all duration-300"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
