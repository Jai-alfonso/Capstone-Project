"use client"
import { Button } from "@/components/ui/button"
import { Scale, Users, FileText, Calendar, Shield, Building, Calculator, Gavel, ClipboardList, AlertCircle, X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { isPhilippineHoliday, getHolidayName } from "@/lib/philippine-holidays"

const services = [
  {
    title: "Consultations & Documentation",
    description:
      "Legal consultations, document preparation, notarization, and transactional works tailored to your needs.",
    icon: Gavel,
  },
  {
    title: "Civil Cases",
    description:
      "Comprehensive representation for property disputes, monetary claims, foreclosures, and appellate cases.",
    icon: Scale,
  },
  {
    title: "Criminal Cases",
    description:
      "Expert defense for cases within MTCC, RTC, Sandiganbayan, Court of Tax Appeals, and drug-related matters.",
    icon: Shield,
  },
  {
    title: "Administrative & Quasi-Judicial Cases",
    description:
      "Representation for labor cases, HR disputes, and government agency issues including BIR, BOC, PEZA, and SEC.",
    icon: Building,
  },
  {
    title: "Special Proceedings & Other Legal Cases",
    description:
      "Assistance with estate settlements, guardianship, election disputes, land registration, and immigration cases.",
    icon: ClipboardList,
  },
  {
    title: "Accounting Services",
    description:
      "Professional tax return preparation, bookkeeping, payroll services, and financial statement preparation.",
    icon: Calculator,
  },
]

const caseStatuses = [
  { status: "Case Filed", count: 0, color: "bg-blue-500", description: "Initial case filing completed" },
  { status: "Under Review", count: 0, color: "bg-yellow-500", description: "Case under legal review" },
  { status: "Court Hearing", count: 0, color: "bg-orange-500", description: "Scheduled for court hearing" },
  { status: "Motion Hearings", count: 0, color: "bg-purple-500", description: "Motion hearings in progress" },
  { status: "Closed", count: 0, color: "bg-green-500", description: "Successfully resolved cases" },
]

export default function HomePage() {
  const router = useRouter()
  const [showAccountPrompt, setShowAccountPrompt] = useState(false)
  const [isHoliday, setIsHoliday] = useState(false)
  const [holidayName, setHolidayName] = useState("")
  const [showBanner, setShowBanner] = useState(true)

  useEffect(() => {
    const today = new Date()
    if (isPhilippineHoliday(today)) {
      setIsHoliday(true)
      setHolidayName(getHolidayName(today) || "")
    }
  }, [])

  const handleScheduleConsultation = () => {
    setShowAccountPrompt(true)
  }

  const handleCreateAccount = () => {
    setShowAccountPrompt(false)
    router.push("/auth/register")
  }

  const handleSignIn = () => {
    setShowAccountPrompt(false)
    router.push("/auth/login")
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {isHoliday && showBanner && (
        <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white py-4 px-4 relative">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <AlertCircle className="h-6 w-6 flex-shrink-0 animate-pulse" />
              <div>
                <p className="font-bold text-lg">{holidayName} - Office Closed</p>
                <p className="text-sm text-orange-100">
                  The Delgado Law Office is closed today in observance of a Philippine holiday. We will resume normal operations on the next business day. Thank you for your understanding.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowBanner(false)}
              className="ml-4 p-1 hover:bg-white/20 rounded-full transition-colors flex-shrink-0"
              aria-label="Close banner"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <section className="relative text-white py-20 lg:py-32 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/landing.jpg-uFVD9dSnHgXg3QZ4s1JfWiWrpIHKKs.jpeg')`,
          }}
        ></div>
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl lg:text-6xl font-bold font-serif mb-6 animate-fade-in-up">
              Legal Solutions You Can Trust
            </h1>
            <p className="text-xl lg:text-2xl text-gray-200 mb-8 font-light animate-fade-in-up animation-delay-200">
              Professional legal and accounting services tailored for your needs
            </p>
            <div className="flex justify-center animate-fade-in-up animation-delay-400">
              <Button
                onClick={handleScheduleConsultation}
                className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-500 dark:hover:bg-red-600 dark:text-white rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg transform px-8 py-3 text-lg"
              >
                Schedule Consultation
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold font-serif text-gray-900 mb-4">Our Legal Services</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Comprehensive legal and financial solutions tailored to your needs
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {services.map((service, index) => (
                <div
                  key={index}
                  className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 p-6 group hover:-translate-y-1 flex flex-col"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-shrink-0">
                      <service.icon className="h-8 w-8 text-red-500 group-hover:scale-110 transition-all duration-300" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold font-serif text-gray-900 mb-2 group-hover:text-gray-800 transition-colors duration-300">
                        {service.title}
                      </h3>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4 group-hover:text-gray-700 transition-colors duration-300 flex-grow">
                    {service.description}
                  </p>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full bg-transparent border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 mt-auto"
                  >
                    <Link href="/services">Learn More</Link>
                  </Button>
                </div>
              ))}
            </div>

            <div className="text-center">
              <Button
                asChild
                size="lg"
                className="bg-slate-700 hover:bg-slate-800 text-white transition-all duration-300 hover:scale-105 hover:shadow-md transform"
              >
                <Link href="/services">View All Services</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold font-serif text-navy-900 mb-6">Manage Your Appointments Easily</h2>
            <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
              Our secure client portal allows you to schedule consultations, receive updates from the law office, and communicate directly with our staff.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-8xl mx-auto">
              <div className="bg-slate-700 rounded-lg text-white hover:bg-slate-800 transition-all duration-300 hover:-translate-y-1 py-6 px-8">
                <div className="flex justify-center mb-3">
                  <Calendar className="h-10 w-10 text-red-500" />
                </div>
                <h3 className="text-lg font-bold mb-3">Schedule Appointments</h3>
                <p className="text-gray-200 text-sm">
                  Book consultations with our attorney based on real-time availability. Choose your preferred date, time, and meeting method (online or in-person).
                </p>
              </div>

              <div className="bg-slate-700 rounded-lg py-6 text-white hover:bg-slate-800 transition-all duration-300 hover:-translate-y-1 px-8">
                <div className="flex justify-center mb-3">
                  <FileText className="h-10 w-10 text-red-500" />
                </div>
                <h3 className="text-lg font-bold mb-3">Send & Receive Messages</h3>
                <p className="text-gray-200 text-sm">
                  Communicate with the Delgado Law Office directly through the built-in messaging system. Ask questions, receive confirmations, and stay informed.
                </p>
              </div>

              <div className="bg-slate-700 rounded-lg py-6 text-white hover:bg-slate-800 transition-all duration-300 hover:-translate-y-1 px-8">
                <div className="flex justify-center mb-3">
                  <Users className="h-10 w-10 text-red-500" />
                </div>
                <h3 className="text-lg font-bold mb-3">Receive Notifications</h3>
                <p className="text-gray-200 text-sm">
                  Get timely updates via email or SMS regarding your scheduled appointments and important announcements.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Dialog open={showAccountPrompt} onOpenChange={setShowAccountPrompt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold">Account Required</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-gray-600 mb-6">
              You need to have an account to access the schedule consultation feature. Please create an account or sign
              in to continue.
            </p>
            <div className="flex flex-col gap-3">
              <Button
                onClick={handleCreateAccount}
                className="bg-red-600 hover:bg-red-700 text-white rounded-full w-full"
              >
                Create Account
              </Button>
              <Button onClick={handleSignIn} variant="outline" className="rounded-full w-full bg-transparent">
                Sign In
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
