import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ClientData {
  name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

interface AppointmentData {
  date: string;
  time: string;
  type: string;
  location: string;
  status: string;
  client: string;
}

interface CaseData {
  title: string;
  serviceType: string;
  status: string;
  openedDate: string;
  description?: string;
  clientName: string;
  caseType: string;
  processSteps?: ProcessStep[];
  processType?: string;
  progressPercentage?: number;
}

interface ProcessStep {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  completedDate?: string;
  order: number;
}

interface ClientNote {
  content: string;
  createdBy: string;
  createdAt: Date;
}

export class PDFGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private tableLeftMargin: number = 24; // Left margin for tables (shifted right)
  private currentY: number;
  private pageNumber: number;
  private totalPages: number;
  private titleToTableSpacing: number = 7; // Consistent spacing between title and table
  private tableSectionSpacing: number = 12; // Spacing between different table sections

  constructor() {
    this.doc = new jsPDF();
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.margin = 15; // Consistent margin for all sides
    this.currentY = this.margin;
    this.pageNumber = 1;
    this.totalPages = 1;
  }

  private addHeader(adminName?: string, adminEmail?: string) {
    const logoWidth = 30;
    const logoHeight = 30;
    const textStartX = this.margin + logoWidth + 10;
    const textWidth = this.pageWidth - textStartX - this.margin;

    // Add logo if available
    try {
      this.doc.addImage('/logo.jpg', 'JPEG', this.margin, this.currentY, logoWidth, logoHeight);
    } catch (error) {
      // Logo not available, continue without it
    }

    // Company name (beside logo)
    this.doc.setFontSize(20);
    this.doc.setTextColor(30, 58, 138);
    this.doc.text('Delgado Law Office', textStartX, this.currentY + 5, { maxWidth: textWidth });
    let textY = this.currentY + 12;

    // Address (beside logo)
    this.doc.setFontSize(9);
    this.doc.setTextColor(100, 100, 100);
    this.doc.text('4th Flr. Lizel Bldg., 269 National Rd. Muntinlupa City', textStartX, textY, { maxWidth: textWidth });
    textY += 5;
    
    // Phone (beside logo)
    this.doc.text('+63 908 898 9503', textStartX, textY, { maxWidth: textWidth });
    textY += 5;
    
    // Email (beside logo)
    this.doc.text('admindelgadolaw@delgadooffices.com', textStartX, textY, { maxWidth: textWidth });
    
    // Update currentY to the bottom of logo or text, whichever is lower
    this.currentY = Math.max(this.currentY + logoHeight + 5, textY + 3);

    // Divider line
    this.doc.setDrawColor(30, 58, 138);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 10;
  }

  private addReportTitle(title: string) {
    this.doc.setFontSize(16);
    this.doc.setTextColor(30, 58, 138);
    // Center the title
    this.doc.text(title, this.pageWidth / 2, this.currentY, { align: 'center' });
    this.currentY += 10;
  }

  // Add "Prepared By" section right after table ends
  private addPreparedBySection(adminName?: string, adminEmail?: string) {
    // Check if we have enough space (need about 25 units)
    if (this.currentY > this.pageHeight - 50) {
      this.doc.addPage();
      this.currentY = this.margin;
    }

    this.currentY += 10; // Space after table

    this.doc.setFontSize(9);
    this.doc.setTextColor(60, 60, 60);
    
    this.doc.text('Prepared By:', this.margin, this.currentY);
    this.currentY += 5;
    
    this.doc.text(`Name: ${adminName || 'Administrator'}`, this.margin, this.currentY);
    this.currentY += 5;
    
    this.doc.text(`Email: ${adminEmail || 'N/A'}`, this.margin, this.currentY);
    this.currentY += 5;

    // Add date and time
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    const timeStr = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    this.doc.text(`Printed on: ${dateStr}, ${timeStr}`, this.margin, this.currentY);
    this.currentY += 10;
  }

  // Add confidential notice at the very bottom
  private addConfidentialNotice() {
    const bottomY = this.pageHeight - 20;
    
    this.doc.setFontSize(7);
    this.doc.setTextColor(150, 0, 0);
    this.doc.text(
      'This document contains confidential client and case information. Unauthorized distribution is prohibited.',
      this.pageWidth / 2,
      bottomY,
      { align: 'center' }
    );

    // Add divider line after confidential notice
    this.doc.setDrawColor(30, 58, 138);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, bottomY + 3, this.pageWidth - this.margin, bottomY + 3);
  }

  private addPageNumber(pageNum: number) {
    const footerY = this.pageHeight - 10;
    this.doc.setFontSize(8);
    this.doc.setTextColor(100, 100, 100);
    this.doc.text(
      `Page ${pageNum} of ${this.totalPages}`,
      this.pageWidth / 2,
      footerY,
      { align: 'center' }
    );
  }

  private updatePageNumbers() {
    const anyDoc = this.doc as any;
    const totalPages = typeof anyDoc.getNumberOfPages === 'function'
      ? anyDoc.getNumberOfPages()
      : (anyDoc.internal && Array.isArray(anyDoc.internal.pages) ? anyDoc.internal.pages.length : 1);
    this.totalPages = totalPages;
  }

  private capitalizeStatus(status: string): string {
    // Capitalize first letter of each word
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  private capitalizeWords(text: string): string {
    // Capitalize first letter of each word, handles both spaces and underscores
    return text
      .split(/[\s_]+/)
      .map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )
      .join(' ');
  }

  private addProcessSteps(processSteps: ProcessStep[], processType: string) {
    // Get process name from type
    const processNames: Record<string, string> = {
      simple: 'Simple / One-Time Legal Services',
      civil: 'Civil Cases Process',
      criminal: 'Criminal Cases Process',
      special: 'Special Proceedings',
      administrative: 'Administrative / Quasi-Judicial Cases',
      pleadings: 'Preparation of Pleadings / Motions',
      appearance: 'Court Appearance / Representation',
      retainer: 'Retainer Cases',
      complex: 'Other Complex Cases',
      corporate: 'Corporate & Licensing Cases'
    };

    const processName = processNames[processType] || 'Case Process';

    // Add process title - ALIGNED WITH TABLE
    this.doc.setFontSize(11);
    this.doc.setTextColor(30, 58, 138);
    this.doc.text(`Process Steps (${processName}):`, this.tableLeftMargin, this.currentY);
    this.currentY += this.titleToTableSpacing;

    // Create process steps table - NO SYMBOLS, just text
    const stepRows = processSteps
      .sort((a, b) => a.order - b.order)
      .map((step, index) => {
        let statusText = 'Pending';
        if (step.status === 'completed') statusText = 'Done';
        else if (step.status === 'in_progress') statusText = 'Current';
        else if (step.status === 'skipped') statusText = 'Skipped';

        return [
          (index + 1).toString(),
          step.name,
          statusText,
          step.completedDate || '-'
        ];
      });

    autoTable(this.doc, {
      startY: this.currentY,
      margin: { left: this.tableLeftMargin, right: this.margin, top: this.margin, bottom: this.margin },
      head: [['#', 'Step', 'Status', 'Completed Date']],
      body: stepRows,
      theme: 'grid',
      showHead: 'firstPage',
      headStyles: { 
        fillColor: [30, 58, 138], 
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        lineColor: [30, 58, 138],
        lineWidth: 0.5
      },
      bodyStyles: {
        lineColor: [150, 150, 150],
        lineWidth: 0.3,
        halign: 'center',
        valign: 'middle'
      },
      styles: { 
        fontSize: 8, 
        cellPadding: 3,
        halign: 'center',
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 80, halign: 'center' },
        2: { cellWidth: 35, halign: 'center' },
        3: { cellWidth: 35, halign: 'center' }
      }
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY;
  }

  // ========== REPORT 1: CLIENT DIRECTORY REPORT ==========
  generateAllClientsReport(
    clients: ClientData[],
    adminName?: string,
    adminEmail?: string
  ): jsPDF {
    this.addHeader(adminName, adminEmail);
    this.addReportTitle('Client Directory Report');
    
    // ALIGNED TITLE
    this.doc.setFontSize(11);
    this.doc.setTextColor(30, 58, 138);
    this.doc.text(`Client List (${clients.length} clients)`, this.tableLeftMargin, this.currentY);
    this.currentY += this.titleToTableSpacing;

    // Sort clients alphabetically by name
    const sortedClients = [...clients].sort((a, b) => 
      a.name.localeCompare(b.name)
    );

    const clientRows = sortedClients.map(client => [
      client.name,
      client.email,
      client.phone,
      this.formatAddress(client)
    ]);

    autoTable(this.doc, {
      startY: this.currentY,
      margin: { left: this.tableLeftMargin, right: this.margin, top: this.margin, bottom: this.margin },
      head: [['Client Name', 'Email', 'Phone', 'Address']],
      body: clientRows,
      theme: 'grid',
      showHead: 'firstPage',
      headStyles: { 
        fillColor: [30, 58, 138], 
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        lineColor: [30, 58, 138],
        lineWidth: 0.5
      },
      bodyStyles: {
        lineColor: [150, 150, 150],
        lineWidth: 0.3,
        halign: 'center',
        valign: 'middle'
      },
      styles: { 
        fontSize: 8, 
        cellPadding: 4,
        halign: 'center',
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 40, halign: 'center' },
        1: { cellWidth: 50, halign: 'center' },
        2: { cellWidth: 30, halign: 'center' },
        3: { cellWidth: 40, halign: 'center' }
      }
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY;

    // Add Prepared By section right after table
    this.addPreparedBySection(adminName, adminEmail);

    // Update total pages count and add page numbers to all pages
    this.updatePageNumbers();
    for (let i = 1; i <= this.totalPages; i++) {
      this.doc.setPage(i);
      this.addPageNumber(i);
      if (i === this.totalPages) {
        this.addConfidentialNotice();
      }
    }

    return this.doc;
  }

  // ========== REPORT 2: APPOINTMENTS REPORT ==========
  generateAppointmentsReport(
    appointments: AppointmentData[],
    dateRange: string,
    adminName?: string,
    adminEmail?: string
  ): jsPDF {
    this.addHeader(adminName, adminEmail);
    this.addReportTitle('Appointments Report');
    
    // ALIGNED TITLE
    this.doc.setFontSize(11);
    this.doc.setTextColor(30, 58, 138);
    this.doc.text(`Appointment List (${appointments.length} appointments)`, this.tableLeftMargin, this.currentY);
    this.currentY += this.titleToTableSpacing;

    // Sort appointments by date (most recent first)
    const sortedAppointments = [...appointments].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });

    const appointmentRows = sortedAppointments.map(apt => [
      apt.client,
      this.formatDate(apt.date),
      apt.time,
      apt.location,
      this.capitalizeStatus(apt.status),
    ]);

    autoTable(this.doc, {
      startY: this.currentY,
      margin: { left: this.tableLeftMargin, right: this.margin, top: this.margin, bottom: this.margin },
      head: [['Client', 'Date', 'Time', 'Location', 'Status']],
      body: appointmentRows,
      theme: 'grid',
      showHead: 'firstPage',
      headStyles: { 
        fillColor: [30, 58, 138], 
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        lineColor: [30, 58, 138],
        lineWidth: 0.5
      },
      bodyStyles: {
        lineColor: [150, 150, 150],
        lineWidth: 0.3,
        halign: 'center',
        valign: 'middle'
      },
      styles: { 
        fontSize: 8, 
        cellPadding: 4,
        halign: 'center',
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 40, halign: 'center' },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 35, halign: 'center' },
        4: { cellWidth: 30, halign: 'center' }
      }
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY;
    this.addPreparedBySection(adminName, adminEmail);

    this.updatePageNumbers();
    
    for (let i = 1; i <= this.totalPages; i++) {
      this.doc.setPage(i);
      this.addPageNumber(i);
      if (i === this.totalPages) {
        this.addConfidentialNotice();
      }
    }

    return this.doc;
  }

  // ========== REPORT 3: SERVICES REPORT (for Admin Reports page) ==========
  generateCasesReport(
    cases: CaseData[],
    dateRange: string,
    adminName?: string,
    adminEmail?: string
  ): jsPDF {
    this.addHeader(adminName, adminEmail);
    this.addReportTitle('Services Report');
    
    // ALIGNED TITLE
    this.doc.setFontSize(11);
    this.doc.setTextColor(30, 58, 138);
    this.doc.text(`Services List (${cases.length} services)`, this.tableLeftMargin, this.currentY);
    this.currentY += this.titleToTableSpacing;

    const caseRows = cases.map(c => [
      c.title,
      c.clientName,
      c.caseType,
      c.serviceType,
      this.capitalizeStatus(c.status),
      this.formatDate(c.openedDate),
    ]);

    autoTable(this.doc, {
      startY: this.currentY,
      margin: { left: this.tableLeftMargin, right: this.margin, top: this.margin, bottom: this.margin },
      head: [['Title', 'Client', 'Type', 'Service', 'Status', 'Date Added']],
      body: caseRows,
      theme: 'grid',
      showHead: 'firstPage',
      headStyles: { 
        fillColor: [30, 58, 138], 
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        lineColor: [30, 58, 138],
        lineWidth: 0.5
      },
      bodyStyles: {
        lineColor: [150, 150, 150],
        lineWidth: 0.3,
        halign: 'center',
        valign: 'middle'
      },
      styles: { 
        fontSize: 7, 
        cellPadding: 4,
        halign: 'center',
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 35, halign: 'center' },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 25, halign: 'center' },
        5: { cellWidth: 25, halign: 'center' }
      }
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY;
    this.addPreparedBySection(adminName, adminEmail);

    this.updatePageNumbers();
    
    for (let i = 1; i <= this.totalPages; i++) {
      this.doc.setPage(i);
      this.addPageNumber(i);
      if (i === this.totalPages) {
        this.addConfidentialNotice();
      }
    }

    return this.doc;
  }

  // ========== REPORT 4: AUDIT LOGS REPORT ==========
  generateAuditLogsReport(
    logs: Array<{
      timestamp: string | Date;
      user: string;
      userRole: string;
      action: string;
      resource: string;
      details: string;
    }>,
    adminName?: string,
    adminEmail?: string
  ): jsPDF {
    this.addHeader(adminName, adminEmail);
    this.addReportTitle('Audit Logs Report');
    
    // ALIGNED TITLE
    this.doc.setFontSize(11);
    this.doc.setTextColor(30, 58, 138);
    this.doc.text(`Audit Logs (${logs.length} logs)`, this.tableLeftMargin, this.currentY);
    this.currentY += this.titleToTableSpacing;
    
    const logRows = logs.map(log => [
      this.formatTimestamp(log.timestamp),
      log.user,
      log.userRole,
      log.action,
      log.details.substring(0, 120) + (log.details.length > 120 ? '...' : ''),
    ]);
    
    autoTable(this.doc, {
      startY: this.currentY,
      margin: { left: this.tableLeftMargin, right: this.margin, top: this.margin, bottom: this.margin },
      head: [['Timestamp', 'User', 'Role', 'Action', 'Details']],
      body: logRows,
      theme: 'grid',
      showHead: 'firstPage',
      headStyles: { 
        fillColor: [30, 58, 138], 
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        lineColor: [30, 58, 138],
        lineWidth: 0.5
      },
      bodyStyles: {
        lineColor: [150, 150, 150],
        lineWidth: 0.3,
        halign: 'center',
        valign: 'middle'
      },
      styles: { 
        fontSize: 7, 
        cellPadding: 4,
        halign: 'center',
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 30, halign: 'center' },
        1: { cellWidth: 28, halign: 'center' },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 35, halign: 'center' },
        4: { cellWidth: 54, halign: 'center' }
      }
    });
    
    this.currentY = (this.doc as any).lastAutoTable.finalY;
    this.addPreparedBySection(adminName, adminEmail);
    
    this.updatePageNumbers();
    
    for (let i = 1; i <= this.totalPages; i++) {
      this.doc.setPage(i);
      this.addPageNumber(i);
      if (i === this.totalPages) {
        this.addConfidentialNotice();
      }
    }
    
    return this.doc;
  }

  // ========== REPORT 5: CLIENT DETAILS REPORT (with Process Steps - replaces old one) ==========
 generateCaseDetailsReport(
  client: {
    name: string;
    email: string;
    phone: string;
    address?: string;
    activeCases?: number;
  },
  appointments: AppointmentData[],
  cases: CaseData[],
  adminName?: string,
  adminEmail?: string
): jsPDF {
    this.addHeader(adminName, adminEmail);
    this.addReportTitle('Case Details Report');
    
    // TABLE 1: CLIENT INFORMATION (with horizontal headers) - ALIGNED TITLE
    this.doc.setFontSize(11);
    this.doc.setTextColor(30, 58, 138);
    this.doc.text('Client Information', this.tableLeftMargin, this.currentY);
    this.currentY += this.titleToTableSpacing;

    // Single row with client data (horizontal format) - SAME WIDTH AS SERVICES TABLE
    const clientData = [[
      client.name,
      client.email,
      client.phone,
      client.address || 'No address provided',
      (client.activeCases || 0).toString()
    ]];

    autoTable(this.doc, {
      startY: this.currentY,
      margin: { left: this.tableLeftMargin, right: this.margin, top: this.margin, bottom: this.margin },
      head: [['Full Name', 'Email', 'Phone', 'Address', 'Active Services']],
      body: clientData,
      theme: 'grid',
      headStyles: { 
        fillColor: [30, 58, 138], 
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        lineColor: [30, 58, 138],
        lineWidth: 0.5
      },
      bodyStyles: {
        lineColor: [150, 150, 150],
        lineWidth: 0.3,
        halign: 'center',
        valign: 'middle'
      },
      styles: { 
        fontSize: 8, 
        cellPadding: 4,
        halign: 'center',
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 33, halign: 'center' },
        1: { cellWidth: 33, halign: 'center' },
        2: { cellWidth: 33, halign: 'center' },
        3: { cellWidth: 33, halign: 'center' },
        4: { cellWidth: 33, halign: 'center' }
      },
      tableWidth: 165 // Fixed table width to match services table
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + this.tableSectionSpacing;

    // TABLE 2: SERVICES (with process steps for each service)
    if (cases.length > 0) {
      cases.forEach((caseItem, index) => {
        // Add "Service X of Y" text - ALIGNED
        this.doc.setFontSize(11);
        this.doc.setTextColor(30, 58, 138);
        this.doc.text(`Service ${index + 1} of ${cases.length}`, this.tableLeftMargin, this.currentY);
        this.currentY += this.titleToTableSpacing;

        // Service info table (horizontal format) - SAME WIDTH AS CLIENT INFO TABLE
        const serviceData = [[
          caseItem.title,
          this.capitalizeWords(caseItem.caseType),
          this.capitalizeWords(caseItem.serviceType),
          this.capitalizeStatus(caseItem.status),
          this.formatDate(caseItem.openedDate)
        ]];

        autoTable(this.doc, {
          startY: this.currentY,
          margin: { left: this.tableLeftMargin, right: this.margin, top: this.margin, bottom: this.margin },
          head: [['Service', 'Type', 'Service Type', 'Status', 'Date Added']],
          body: serviceData,
          theme: 'grid',
          headStyles: { 
            fillColor: [30, 58, 138], 
            textColor: 255,
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            lineColor: [30, 58, 138],
            lineWidth: 0.5
          },
          bodyStyles: {
            lineColor: [150, 150, 150],
            lineWidth: 0.3,
            halign: 'center',
            valign: 'middle'
          },
          styles: { 
            fontSize: 8, 
            cellPadding: 4,
            halign: 'center',
            valign: 'middle'
          },
          columnStyles: {
            0: { cellWidth: 33, halign: 'center' },
            1: { cellWidth: 33, halign: 'center' },
            2: { cellWidth: 33, halign: 'center' },
            3: { cellWidth: 33, halign: 'center' },
            4: { cellWidth: 33, halign: 'center' }
          },
          tableWidth: 165 // Same width as client info table
        });

        this.currentY = (this.doc as any).lastAutoTable.finalY + 8;

        // Add process steps if they exist
        if (caseItem.processSteps && caseItem.processSteps.length > 0 && caseItem.processType) {
          this.addProcessSteps(caseItem.processSteps, caseItem.processType);
        }

        // Add spacing between services
        if (index < cases.length - 1) {
          this.currentY += this.tableSectionSpacing;
        }
      });
    }

    this.addPreparedBySection(adminName, adminEmail);

    this.updatePageNumbers();
    
    for (let i = 1; i <= this.totalPages; i++) {
      this.doc.setPage(i);
      this.addPageNumber(i);
      if (i === this.totalPages) {
        this.addConfidentialNotice();
      }
    }

    return this.doc;
  }

  // ========== REPORT 6: CLIENT INFORMATION REPORT (Admin Reports Page - COMPLETE) ==========
  generateClientInformationReport(
    client: {
      name: string;
      email: string;
      phone: string;
      address?: string;
      activeCases?: number;
      notes?: ClientNote[];
    },
    appointments: AppointmentData[],
    cases: CaseData[],
    adminName?: string,
    adminEmail?: string
  ): jsPDF {
    this.addHeader(adminName, adminEmail);
    this.addReportTitle('Client Information Report');
    
    // TABLE 1: CLIENT INFORMATION (horizontal format) - ALIGNED TITLE
    this.doc.setFontSize(11);
    this.doc.setTextColor(30, 58, 138);
    this.doc.text('Client Information', this.tableLeftMargin, this.currentY);
    this.currentY += this.titleToTableSpacing;

    const clientData = [[
      client.name,
      client.email,
      client.phone,
      client.address || 'No address provided',
      (client.activeCases || 0).toString()
    ]];

    autoTable(this.doc, {
      startY: this.currentY,
      margin: { left: this.tableLeftMargin, right: this.margin, top: this.margin, bottom: this.margin },
      head: [['Full Name', 'Email', 'Phone', 'Address', 'Active Services']],
      body: clientData,
      theme: 'grid',
      showHead: 'firstPage',
      headStyles: { 
        fillColor: [30, 58, 138], 
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        lineColor: [30, 58, 138],
        lineWidth: 0.5
      },
      bodyStyles: {
        lineColor: [150, 150, 150],
        lineWidth: 0.3,
        halign: 'center',
        valign: 'middle'
      },
      styles: { 
        fontSize: 8, 
        cellPadding: 4,
        halign: 'center',
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 33, halign: 'center' },
        1: { cellWidth: 33, halign: 'center' },
        2: { cellWidth: 33, halign: 'center' },
        3: { cellWidth: 33, halign: 'center' },
        4: { cellWidth: 33, halign: 'center' }
      },
      tableWidth: 165
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + this.tableSectionSpacing;

    // TABLE 2: APPOINTMENTS HISTORY - ALIGNED TITLE
    if (appointments.length > 0) {
      this.doc.setFontSize(11);
      this.doc.setTextColor(30, 58, 138);
      this.doc.text(`Appointments History (${appointments.length})`, this.tableLeftMargin, this.currentY);
      this.currentY += this.titleToTableSpacing;

      const appointmentRows = appointments.map(apt => [
        this.formatDate(apt.date),
        apt.time,
        apt.location,
        this.capitalizeStatus(apt.status),
      ]);

      autoTable(this.doc, {
        startY: this.currentY,
        margin: { left: this.tableLeftMargin, right: this.margin, top: this.margin, bottom: this.margin },
        head: [['Date', 'Time', 'Location', 'Status']],
        body: appointmentRows,
        theme: 'grid',
        showHead: 'firstPage',
        headStyles: { 
          fillColor: [30, 58, 138], 
          textColor: 255, 
          fontSize: 9,
          halign: 'center',
          valign: 'middle',
          lineColor: [30, 58, 138],
          lineWidth: 0.5
        },
        bodyStyles: {
          lineColor: [150, 150, 150],
          lineWidth: 0.3,
          halign: 'center',
          valign: 'middle'
        },
        styles: { 
          fontSize: 8, 
          cellPadding: 4,
          halign: 'center',
          valign: 'middle'
        },
        columnStyles: {
          0: { cellWidth: 41.25, halign: 'center' },
          1: { cellWidth: 41.25, halign: 'center' },
          2: { cellWidth: 41.25, halign: 'center' },
          3: { cellWidth: 41.25, halign: 'center' }
        },
        tableWidth: 165
      });

      this.currentY = (this.doc as any).lastAutoTable.finalY + this.tableSectionSpacing;
    }

    // TABLE 3: SERVICES HISTORY (with process steps) - ALIGNED TITLE
    if (cases.length > 0) {
      this.doc.setFontSize(11);
      this.doc.setTextColor(30, 58, 138);
      this.doc.text(`Services History (${cases.length})`, this.tableLeftMargin, this.currentY);
      this.currentY += this.titleToTableSpacing;

      cases.forEach((caseItem, index) => {
        // Service info - NO "Service X of Y" text
        const serviceData = [[
          caseItem.title,
          caseItem.caseType,
          caseItem.serviceType,
          this.capitalizeStatus(caseItem.status),
          this.formatDate(caseItem.openedDate)
        ]];

        autoTable(this.doc, {
          startY: this.currentY,
          margin: { left: this.tableLeftMargin, right: this.margin, top: this.margin, bottom: this.margin },
          head: [['Service', 'Type', 'Service Type', 'Status', 'Date Added']],
          body: serviceData,
          theme: 'grid',
          headStyles: { 
            fillColor: [30, 58, 138], 
            textColor: 255,
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            lineColor: [30, 58, 138],
            lineWidth: 0.5
          },
          bodyStyles: {
            lineColor: [150, 150, 150],
            lineWidth: 0.3,
            halign: 'center',
            valign: 'middle'
          },
          styles: { 
            fontSize: 8, 
            cellPadding: 4,
            halign: 'center',
            valign: 'middle'
          },
          columnStyles: {
            0: { cellWidth: 33, halign: 'center' },
            1: { cellWidth: 33, halign: 'center' },
            2: { cellWidth: 33, halign: 'center' },
            3: { cellWidth: 33, halign: 'center' },
            4: { cellWidth: 33, halign: 'center' }
          },
          tableWidth: 165
        });

        this.currentY = (this.doc as any).lastAutoTable.finalY + 8;

        // Add process steps if they exist
        if (caseItem.processSteps && caseItem.processSteps.length > 0 && caseItem.processType) {
          this.addProcessSteps(caseItem.processSteps, caseItem.processType);
        }

        if (index < cases.length - 1) {
          this.currentY += this.tableSectionSpacing;
        }
      });
    }

    // TABLE 4: NOTES - ALIGNED TITLE
    if (client.notes && client.notes.length > 0) {
      this.currentY += this.tableSectionSpacing;
      
      this.doc.setFontSize(11);
      this.doc.setTextColor(30, 58, 138);
      this.doc.text(`Client Notes (${client.notes.length})`, this.tableLeftMargin, this.currentY);
      this.currentY += this.titleToTableSpacing;

      const noteRows = client.notes.map((note, index) => [
        `Note ${index + 1}`,
        note.content,
        note.createdBy,
        this.formatDate(note.createdAt.toISOString()),
      ]);

      autoTable(this.doc, {
        startY: this.currentY,
        margin: { left: this.tableLeftMargin, right: this.margin, top: this.margin, bottom: this.margin },
        head: [['#', 'Content', 'Created By', 'Date']],
        body: noteRows,
        theme: 'grid',
        showHead: 'firstPage',
        headStyles: { 
          fillColor: [30, 58, 138], 
          textColor: 255, 
          fontSize: 9,
          halign: 'center',
          valign: 'middle',
          lineColor: [30, 58, 138],
          lineWidth: 0.5
        },
        bodyStyles: {
          lineColor: [150, 150, 150],
          lineWidth: 0.3,
          halign: 'center',
          valign: 'middle'
        },
        styles: { 
          fontSize: 8, 
          cellPadding: 4,
          halign: 'center',
          valign: 'middle'
        },
        columnStyles: {
          0: { cellWidth: 20, halign: 'center' },
          1: { cellWidth: 85, halign: 'center' },
          2: { cellWidth: 30, halign: 'center' },
          3: { cellWidth: 30, halign: 'center' }
        },
        tableWidth: 165
      });

      this.currentY = (this.doc as any).lastAutoTable.finalY;
    }

    this.addPreparedBySection(adminName, adminEmail);

    this.updatePageNumbers();
    
    for (let i = 1; i <= this.totalPages; i++) {
      this.doc.setPage(i);
      this.addPageNumber(i);
      if (i === this.totalPages) {
        this.addConfidentialNotice();
      }
    }

    return this.doc;
  }

  // ========== HELPER METHODS ==========

  private formatAddress(client: ClientData): string {
    const parts = [];
    if (client.address) parts.push(client.address);
    if (client.city) parts.push(client.city);
    if (client.state) parts.push(client.state);
    if (client.zipCode) parts.push(client.zipCode);
    return parts.length > 0 ? parts.join(', ') : 'No address';
  }

  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  }

  private formatTimestamp(timestamp: string | Date): string {
    try {
      const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  }

  download(filename: string) {
    this.doc.save(filename);
  }
}