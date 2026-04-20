"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ThemeProvider } from "@/components/theme-provider";
import { KeyboardNavigation } from "@/components/keyboard-navigation";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

import {
  Crimson_Text,
  Source_Sans_3 as Source_Sans_Pro,
} from "next/font/google";
import {
  WifiOff,
  RefreshCw,
  AlertTriangle,
  Home,
  Phone,
  Mail,
} from "lucide-react";

const crimsonText = Crimson_Text({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-crimson",
});

const sourceSansPro = Source_Sans_Pro({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-source-sans",
});

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isOnline, setIsOnline] = useState(true);

  // Scroll to top whenever the route changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Check network status
  useEffect(() => {
    // Check initial status
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);

    // Set up event listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <html
        lang="en"
        suppressHydrationWarning
        className={`${crimsonText.variable} ${sourceSansPro.variable}`}
      >
        <head>
          <title>Delgado Law Office - No Internet Connection</title>
          <meta
            name="description"
            content="You appear to be offline. Please check your internet connection."
          />
        </head>
        <body className="font-sans">
          <div className="offline-container">
            <div className="offline-content">
              <div className="offline-icon-wrapper">
                <WifiOff className="offline-icon" />
              </div>
              <h1 className="offline-title">No Internet Connection</h1>
              <p className="offline-message">
                We are unable to connect to our services. Please check your
                network settings and try again.
              </p>

              <div className="offline-tips">
                <h3>Troubleshooting Tips:</h3>
                <ul>
                  <li>✓ Check your Wi-Fi or mobile data connection</li>
                  <li>✓ Restart your router or modem</li>
                  <li>✓ Disable VPN or proxy if enabled</li>
                  <li>✓ Check your device's network settings</li>
                  <li>✓ Try connecting to a different network</li>
                </ul>
              </div>

              <div className="offline-actions">
                <button
                  onClick={() => window.location.reload()}
                  className="offline-button primary"
                >
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Try Again
                </button>
                <button
                  onClick={() => setIsOnline(true)} // Force check
                  className="offline-button secondary"
                >
                  Check Connection
                </button>
              </div>

              <div className="offline-contact">
                <div className="contact-card">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <div>
                    <h4>Need Immediate Assistance?</h4>
                    <p>If you need to reach us urgently while offline:</p>
                    <div className="contact-details">
                      <div className="contact-item">
                        <Phone className="h-4 w-4" />
                        <span>+63 917 123 4567</span>
                      </div>
                      <div className="contact-item">
                        <Mail className="h-4 w-4" />
                        <span>info@delgadolawoffice.com</span>
                      </div>
                      <div className="contact-item">
                        <Home className="h-4 w-4" />
                        <span>123 Legal Street, Makati City</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <p className="offline-status">
                Connection Status:{" "}
                <span className="status-offline">Offline</span>
              </p>
            </div>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${crimsonText.variable} ${sourceSansPro.variable}`}
    >
      <head>
        <title>Delgado Law Office - Legal Solutions You Can Trust</title>
        <meta
          name="description"
          content="Professional legal and accounting services tailored for your needs. Expert representation in civil, criminal, and corporate law matters."
        />
      </head>
      <body className="font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <KeyboardNavigation />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
