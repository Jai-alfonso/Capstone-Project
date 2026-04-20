"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import Image from "next/image"

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const handleNavigation = (href: string) => {
    // Close mobile menu
    setIsOpen(false)

    // Navigate to the page
    router.push(href)

    // Scroll to top after a brief delay to ensure navigation completes
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      })
    }, 100)
  }

  // Also scroll to top when component mounts (page loads)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <nav className="bg-slate-700 shadow-lg sticky top-0 z-50 transition-all duration-300">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <button onClick={() => handleNavigation("/")} className="flex items-center space-x-2 group cursor-pointer">
            <div className="transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg">
              <Image
                src="/logo.jpg"
                alt="Delgado Law Office Logo"
                width={48}
                height={48}
                className="rounded-lg transition-transform duration-300 group-hover:rotate-12"
              />
            </div>
            <div className="transition-all duration-300 group-hover:translate-x-1">
              <div className="font-bold text-xl text-white font-serif transition-colors duration-300 group-hover:text-gray-200">
                Delgado Law Office
              </div>
              <div className="text-xs text-gray-300 transition-colors duration-300 group-hover:text-gray-200">
                Legal & Accounting Services
              </div>
            </div>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => handleNavigation("/")}
              className="relative text-gray-300 hover:text-white font-medium transition-all duration-300 hover:scale-105 group"
            >
              Home
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </button>
            <button
              onClick={() => handleNavigation("/services")}
              className="relative text-gray-300 hover:text-white font-medium transition-all duration-300 hover:scale-105 group"
            >
              Services
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </button>
            <button
              onClick={() => handleNavigation("/about")}
              className="relative text-gray-300 hover:text-white font-medium transition-all duration-300 hover:scale-105 group"
            >
              About
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </button>
            <button
              onClick={() => handleNavigation("/contact")}
              className="relative text-gray-300 hover:text-white font-medium transition-all duration-300 hover:scale-105 group"
            >
              Contact
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </button>
            <button
              onClick={() => handleNavigation("/auth/login")}
              className="relative text-gray-300 hover:text-white font-medium transition-all duration-300 hover:scale-105 group"
            >
              Login
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </button>
            <Button
              onClick={() => handleNavigation("/auth/register")}
              className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-500 dark:hover:bg-red-600 dark:text-white rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg transform"
            >
              Register
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden transition-all duration-300 hover:scale-110 hover:bg-slate-600 p-2 rounded-lg text-white"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? (
              <X className="h-6 w-6 transition-transform duration-300 rotate-90" />
            ) : (
              <Menu className="h-6 w-6 transition-transform duration-300" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        <div
          className={`md:hidden border-t border-slate-600 transition-all duration-300 overflow-hidden ${
            isOpen ? "max-h-96 py-4 opacity-100" : "max-h-0 py-0 opacity-0"
          }`}
        >
          <div className="flex flex-col space-y-4">
            <button
              onClick={() => handleNavigation("/")}
              className="text-gray-300 hover:text-white font-medium transition-all duration-300 hover:translate-x-2 hover:bg-slate-600 p-2 rounded text-left"
            >
              Home
            </button>
            <button
              onClick={() => handleNavigation("/services")}
              className="text-gray-300 hover:text-white font-medium transition-all duration-300 hover:translate-x-2 hover:bg-slate-600 p-2 rounded text-left"
            >
              Services
            </button>
            <button
              onClick={() => handleNavigation("/about")}
              className="text-gray-300 hover:text-white font-medium transition-all duration-300 hover:translate-x-2 hover:bg-slate-600 p-2 rounded text-left"
            >
              About
            </button>
            <button
              onClick={() => handleNavigation("/contact")}
              className="text-gray-300 hover:text-white font-medium transition-all duration-300 hover:translate-x-2 hover:bg-slate-600 p-2 rounded text-left"
            >
              Contact
            </button>
            <button
              onClick={() => handleNavigation("/auth/login")}
              className="text-gray-300 hover:text-white font-medium transition-all duration-300 hover:translate-x-2 hover:bg-slate-600 p-2 rounded text-left"
            >
              Login
            </button>
            <Button
              onClick={() => handleNavigation("/auth/register")}
              className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-500 dark:hover:bg-red-600 dark:text-white rounded-full w-fit transition-all duration-300 hover:scale-105 hover:shadow-lg transform"
            >
              Register
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
