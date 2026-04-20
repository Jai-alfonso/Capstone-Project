// Email notification utilities for the law firm application

export interface EmailNotification {
  to: string
  subject: string
  body: string
  type: "appointment-confirmation" | "appointment-update" | "appointment-reschedule" | "progress-update" | "appointment-cancelled"
}

/**
 * Send an email notification (mock implementation)
 * In production, this would integrate with services like:
 * - SendGrid
 * - AWS SES
 * - Mailgun
 * - Nodemailer with SMTP
 */
export async function sendEmailNotification(notification: EmailNotification): Promise<boolean> {
  console.log("📧 Email Notification:")
  console.log(`To: ${notification.to}`)
  console.log(`Subject: ${notification.subject}`)
  console.log(`Body: ${notification.body}`)
  console.log(`Type: ${notification.type}`)
  
  // Store notification in localStorage for tracking
  const notifications = JSON.parse(localStorage.getItem("emailNotifications") || "[]")
  notifications.push({
    ...notification,
    sentAt: new Date().toISOString(),
    status: "sent"
  })
  localStorage.setItem("emailNotifications", JSON.stringify(notifications))
  
  // In production, you would call your email service API here
  // Example with fetch:
  // const response = await fetch('/api/send-email', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(notification)
  // })
  // return response.ok
  
  return true
}

/**
 * Send appointment confirmation email
 */
export async function sendAppointmentConfirmation(
  clientEmail: string,
  clientName: string,
  appointmentDetails: {
    date: string
    time: string
    attorney: string
    location: string
  }
) {
  const notification: EmailNotification = {
    to: clientEmail,
    subject: "Appointment Confirmed - Legal Consultation",
    body: `
Dear ${clientName},

Your appointment has been confirmed!

Appointment Details:
- Date: ${appointmentDetails.date}
- Time: ${appointmentDetails.time}
- Attorney: ${appointmentDetails.attorney}
- Location: ${appointmentDetails.location}

Please arrive 10 minutes early. If you need to reschedule, please contact us at least 24 hours in advance.

Best regards,
Legal Services Team
    `.trim(),
    type: "appointment-confirmation"
  }
  
  return await sendEmailNotification(notification)
}

/**
 * Send appointment update email
 */
export async function sendAppointmentUpdate(
  clientEmail: string,
  clientName: string,
  updateMessage: string,
  appointmentDetails: {
    date: string
    time: string
  }
) {
  const notification: EmailNotification = {
    to: clientEmail,
    subject: "Appointment Update",
    body: `
Dear ${clientName},

There has been an update to your appointment:

${updateMessage}

Updated Appointment Details:
- Date: ${appointmentDetails.date}
- Time: ${appointmentDetails.time}

If you have any questions, please don't hesitate to contact us.

Best regards,
Legal Services Team
    `.trim(),
    type: "appointment-update"
  }
  
  return await sendEmailNotification(notification)
}

/**
 * Send appointment reschedule email
 */
export async function sendAppointmentReschedule(
  clientEmail: string,
  clientName: string,
  reason: string,
  newDetails: {
    date: string
    time: string
  },
  oldDetails: {
    date: string
    time: string
  }
) {
  const notification: EmailNotification = {
    to: clientEmail,
    subject: "Appointment Rescheduled",
    body: `
Dear ${clientName},

Your appointment has been rescheduled.

Reason: ${reason}

Previous Appointment:
- Date: ${oldDetails.date}
- Time: ${oldDetails.time}

New Appointment:
- Date: ${newDetails.date}
- Time: ${newDetails.time}

We apologize for any inconvenience. If this time doesn't work for you, please contact us.

Best regards,
Legal Services Team
    `.trim(),
    type: "appointment-reschedule"
  }
  
  return await sendEmailNotification(notification)
}

/**
 * Send case progress update email
 */
export async function sendProgressUpdate(
  clientEmail: string,
  clientName: string,
  stageName: string,
  stageDescription: string,
  caseTitle: string
) {
  const notification: EmailNotification = {
    to: clientEmail,
    subject: `Case Update: ${stageName}`,
    body: `
Dear ${clientName},

We have an update on your case: ${caseTitle}

Progress Update:
${stageName}
${stageDescription}

You can view the full case progress by logging into your client portal.

Best regards,
Legal Services Team
    `.trim(),
    type: "progress-update"
  }
  
  return await sendEmailNotification(notification)
}

/**
 * Send appointment cancellation email
 */
export async function sendAppointmentCancellation(
  clientEmail: string,
  clientName: string,
  reason: string,
  appointmentDetails: {
    date: string
    time: string
  }
) {
  const notification: EmailNotification = {
    to: clientEmail,
    subject: "Appointment Cancelled",
    body: `
Dear ${clientName},

Your appointment scheduled for ${appointmentDetails.date} at ${appointmentDetails.time} has been cancelled.

Reason: ${reason}

If you would like to schedule a new appointment, please contact us or use our online booking system.

Best regards,
Legal Services Team
    `.trim(),
    type: "appointment-cancelled"
  }
  
  return await sendEmailNotification(notification)
}

/**
 * Get all sent email notifications (for admin viewing)
 */
export function getEmailNotificationHistory(): any[] {
  return JSON.parse(localStorage.getItem("emailNotifications") || "[]")
}

/**
 * Clear email notification history
 */
export function clearEmailNotificationHistory() {
  localStorage.removeItem("emailNotifications")
}
