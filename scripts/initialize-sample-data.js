/**
 * Sample Data Initializer
 * Run this in the browser console to populate sample appointments with enhanced fields
 */

function initializeSampleData() {
  console.log("🚀 Initializing sample data for admin enhancements...")

  // Sample appointments with all new fields
  const sampleAppointments = [
    {
      id: "APT-001",
      title: "Criminal Case Consultation",
      type: "In-Person Consultation",
      date: "Dec 1, 2025",
      time: "10:00 AM",
      client: "John Doe",
      clientEmail: "john.doe@example.com",
      clientPhone: "+1 (555) 123-4567",
      attorney: "Atty. Alia Jan Delgado",
      status: "confirmed",
      location: "Office Visit",
      description: "Initial consultation for criminal case",
      subject: "I want to file a criminal case",
      message: "I need legal assistance with a criminal matter. Please advise on the next steps.",
      serviceType: "complex",
      legalService: "Criminal Case Filing",
      adminNotes: "Client seems serious. Preliminary review shows strong case.",
      progressStages: [
        {
          id: "1",
          name: "Consultation Completed",
          description: "Initial consultation with client",
          status: "completed",
          completedAt: new Date("2025-11-20").toISOString(),
          order: 1
        },
        {
          id: "2",
          name: "Document Preparation",
          description: "Preparing necessary legal documents",
          status: "in-progress",
          order: 2
        },
        {
          id: "3",
          name: "Filing in Court",
          description: "Filing case with appropriate court",
          status: "pending",
          order: 3
        },
        {
          id: "4",
          name: "Case Monitoring / Hearings",
          description: "Ongoing hearings and case management",
          status: "pending",
          order: 4
        },
        {
          id: "5",
          name: "Closed / Completed",
          description: "Case has been resolved",
          status: "pending",
          order: 5
        }
      ],
      createdAt: new Date("2025-11-15").toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "APT-002",
      title: "Notarization Service",
      type: "In-Person Consultation",
      date: "Nov 28, 2025",
      time: "2:00 PM",
      client: "Jane Smith",
      clientEmail: "jane.smith@example.com",
      clientPhone: "+1 (555) 987-6543",
      attorney: "Atty. Alia Jan Delgado",
      status: "pending",
      location: "Office Visit",
      description: "Document notarization service",
      subject: "Need notarization for affidavit",
      message: "I have an affidavit that needs to be notarized. When can I come in?",
      serviceType: "simple",
      legalService: "Notarization of Affidavit",
      adminNotes: "",
      progressStages: [],
      createdAt: new Date("2025-11-25").toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "APT-003",
      title: "Contract Review",
      type: "Online Consultation",
      date: "Dec 5, 2025",
      time: "11:00 AM",
      client: "Robert Johnson",
      clientEmail: "robert.johnson@example.com",
      clientPhone: "+1 (555) 456-7890",
      attorney: "Atty. Alia Jan Delgado",
      status: "confirmed",
      location: "Virtual Consultation",
      description: "Review of business contract",
      subject: "Business contract review needed",
      message: "I need a lawyer to review a business contract before I sign it.",
      serviceType: "simple",
      legalService: "Contract Review",
      adminNotes: "Contract sent via email. Reviewing for red flags.",
      progressStages: [],
      createdAt: new Date("2025-11-22").toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "APT-004",
      title: "Civil Litigation Case",
      type: "In-Person Consultation",
      date: "Dec 10, 2025",
      time: "3:00 PM",
      client: "Maria Garcia",
      clientEmail: "maria.garcia@example.com",
      clientPhone: "+1 (555) 321-0987",
      attorney: "Atty. Alia Jan Delgado",
      status: "ongoing",
      location: "Office Visit",
      description: "Civil case consultation and filing",
      subject: "Civil case against former employer",
      message: "I want to file a civil case for wrongful termination.",
      serviceType: "complex",
      legalService: "Civil Litigation",
      adminNotes: "Strong evidence provided. Case looks viable.",
      progressStages: [
        {
          id: "1",
          name: "Consultation Completed",
          description: "Initial consultation with client",
          status: "completed",
          completedAt: new Date("2025-11-18").toISOString(),
          order: 1
        },
        {
          id: "2",
          name: "Document Collection",
          description: "Gathering evidence and documentation",
          status: "completed",
          completedAt: new Date("2025-11-23").toISOString(),
          order: 2
        },
        {
          id: "3",
          name: "Filing Complaint",
          description: "Preparing and filing complaint",
          status: "in-progress",
          order: 3
        },
        {
          id: "4",
          name: "Discovery Phase",
          description: "Evidence exchange and depositions",
          status: "pending",
          order: 4
        },
        {
          id: "5",
          name: "Trial / Settlement",
          description: "Court proceedings or settlement negotiation",
          status: "pending",
          order: 5
        }
      ],
      createdAt: new Date("2025-11-10").toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]

  // Save to localStorage
  localStorage.setItem("appointments", JSON.stringify(sampleAppointments))
  console.log("✅ Sample appointments created:", sampleAppointments.length)

  // Sample attorney availability
  const sampleAvailability = [
    {
      id: "AV-001",
      date: "2025-12-15",
      isAvailable: false,
      reason: "Court Hearing",
      timeRange: "9:00 AM to 5:00 PM",
      isFullDay: true,
      blockedSlots: [],
      createdAt: new Date().toISOString()
    },
    {
      id: "AV-002",
      date: "2025-12-20",
      isAvailable: false,
      reason: "Legal Conference",
      timeRange: "1:00 PM to 5:00 PM",
      isFullDay: false,
      blockedSlots: ["1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"],
      createdAt: new Date().toISOString()
    },
    {
      id: "AV-003",
      date: "2025-12-25",
      isAvailable: false,
      reason: "Christmas Holiday",
      timeRange: "All Day",
      isFullDay: true,
      blockedSlots: [],
      createdAt: new Date().toISOString()
    }
  ]

  localStorage.setItem("attorneyAvailability", JSON.stringify(sampleAvailability))
  console.log("✅ Attorney availability entries created:", sampleAvailability.length)

  // Sample audit log entries
  const sampleAuditLogs = [
    {
      id: "LOG-001",
      userId: "admin@example.com",
      action: "Appointment Status Changed",
      resource: "appointments",
      resourceId: "APT-001",
      details: "Changed status from pending to confirmed",
      createdAt: new Date("2025-11-20T10:30:00").toISOString()
    },
    {
      id: "LOG-002",
      userId: "admin@example.com",
      action: "Progress Stage Updated",
      resource: "appointments",
      resourceId: "APT-001",
      details: "Marked 'Consultation Completed' as completed",
      createdAt: new Date("2025-11-20T10:35:00").toISOString()
    },
    {
      id: "LOG-003",
      userId: "admin@example.com",
      action: "Appointment Created",
      resource: "appointments",
      resourceId: "APT-003",
      details: "New appointment scheduled for Contract Review",
      createdAt: new Date("2025-11-22T14:20:00").toISOString()
    }
  ]

  localStorage.setItem("auditLogs", JSON.stringify(sampleAuditLogs))
  console.log("✅ Audit log entries created:", sampleAuditLogs.length)

  console.log("\n🎉 Sample data initialization complete!")
  console.log("📍 Navigate to:")
  console.log("   - /dashboard/admin/appointments to see appointments")
  console.log("   - /dashboard/admin/appointments/APT-001 to see complex case with progress")
  console.log("   - /dashboard/admin/reports to see analytics")
  console.log("   - /dashboard/admin/availability to see calendar")
  console.log("\n✨ You can now test all the new admin features!")
}

// Run the initializer
if (typeof window !== 'undefined') {
  initializeSampleData()
} else {
  console.log("This script should be run in a browser environment")
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initializeSampleData }
}
