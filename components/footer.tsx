import Link from "next/link"
import { Phone, Mail } from "lucide-react"
import Image from "next/image"

export function Footer() {
  return (
    <footer className="bg-slate-700 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <div className="transition-all duration-300 hover:scale-105">
                <Image src="/logo.jpg" alt="Delgado Law Office Logo" width={40} height={40} className="rounded-lg" />
              </div>
              <div>
                <div className="font-bold text-xl font-playfair">Delgado Law Office</div>
                <div className="text-sm text-gray-300">Legal & Accounting Services</div>
              </div>
            </Link>
            <p className="text-gray-300 mb-4 max-w-md">
              Professional legal and accounting services tailored for your needs. We provide comprehensive legal
              solutions with dedication and expertise.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-red-accent" />
                <span>(+63) 947 109 5792</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-red-accent" />
                <span>admindelgadolaw@delgadooffices.com</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Quick Links</h3>
            <div className="space-y-2">
              <Link href="/" className="block text-gray-300 hover:text-white transition-colors">
                Home
              </Link>
              <Link href="/services" className="block text-gray-300 hover:text-white transition-colors">
                Services
              </Link>
              <Link href="/about" className="block text-gray-300 hover:text-white transition-colors">
                About Us
              </Link>
              <Link href="/contact" className="block text-gray-300 hover:text-white transition-colors">
                Contact
              </Link>
              <Link href="/auth/login" className="block text-gray-300 hover:text-white transition-colors">
                Client Portal
              </Link>
            </div>
          </div>

          {/* Legal Services */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Legal Services</h3>
            <div className="space-y-2">
              <div className="block text-gray-300">Consultations</div>
              <div className="block text-gray-300">Civil Cases</div>
              <div className="block text-gray-300">Criminal Cases</div>
              <div className="block text-gray-300">Special Proceedings</div>
              <div className="block text-gray-300">Tax & Accounting</div>
            </div>
          </div>

          {/* Office Hours */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Office Hours</h3>
            <div className="space-y-1 text-sm text-gray-300">
              <div className="flex justify-between">
                <span>Sunday</span>
                <span>Closed</span>
              </div>
              <div className="flex justify-between">
                <span>Monday</span>
                <span>9:00 AM - 5:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Tuesday</span>
                <span>9:00 AM - 5:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Wednesday</span>
                <span>9:00 AM - 5:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Thursday</span>
                <span>9:00 AM - 5:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Friday</span>
                <span>9:00 AM - 5:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Saturday</span>
                <span>Closed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-600 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Delgado Law Office. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
