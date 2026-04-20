"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function KeyboardNavigation() {
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keyboard shortcuts when not in input fields
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return
      }

      // Ctrl/Cmd + K for search
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault()
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        }
      }

      // Alt + number keys for navigation
      if (event.altKey) {
        switch (event.key) {
          case "1":
            event.preventDefault()
            router.push("/")
            break
          case "2":
            event.preventDefault()
            router.push("/services")
            break
          case "3":
            event.preventDefault()
            router.push("/about")
            break
          case "4":
            event.preventDefault()
            router.push("/contact")
            break
          case "5":
            event.preventDefault()
            router.push("/auth/login")
            break
        }
      }

      // Escape key to close modals/dropdowns
      if (event.key === "Escape") {
        const openDropdowns = document.querySelectorAll('[data-state="open"]')
        openDropdowns.forEach((dropdown) => {
          const closeButton = dropdown.querySelector('[aria-label="Close"]') as HTMLButtonElement
          if (closeButton) {
            closeButton.click()
          }
        })
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [router])

  return null
}
