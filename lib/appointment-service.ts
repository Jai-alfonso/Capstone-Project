import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  getDoc,
  Timestamp,
  onSnapshot,
  setDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { format, isBefore, isAfter, isSameDay } from "date-fns";

export interface Appointment {
  id: string;
  title: string;
  type?: string;
  date: string;
  time: string;
  client: string;
  clientId?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientName?: string;
  attorney: string;
  attorneyId?: string;
  attorneyName?: string;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "rescheduled";
  location: string;
  description: string;
  consultationType: "online" | "in-person";
  rescheduleReason?: string;
  cancellationReason?: string;
  rescheduledBy?: "client" | "admin";
  cancelledBy?: "client" | "admin";
  createdAt: string;
  updatedAt: string;
  uid?: string;
  videoLink?: string; 
  videoLinkAddedAt?: string; 
  videoLinkAddedBy?: string; 
  videoLinkValidated?: boolean; 
  caseId?: string;
  caseStepInfo?: {
    currentStep?: number;
    currentStepName?: string;
    processSteps?: any[];
    progressPercentage?: number;
  };
  appointmentPurpose?: string;
  caseStepDescription?: string;
}

export interface Notification {
  id: string;
  type: "appointment";
  notificationType: "new_appointment" | "cancelled_appointment" | "rescheduled_appointment" | "confirmed_appointment" | "completed_appointment";
  title: string;
  message: string;
  appointmentId: string;
  userId?: string;
  createdAt: string;
  read: boolean;
  metadata?: Record<string, any>;
}

export interface TimeSlot {
  startTime: string; 
  endTime: string;
  isBooked: boolean;
  slotId: string;
  bookedBy?: string | null;
  appointmentId?: string | null;
}

export interface TimeSlotDay {
  attorneyId: string;
  attorneyName: string;
  date: string; 
  availableSlots: TimeSlot[];
  isUnavailable: boolean;
  unavailableReason?: string;
  unavailableTimeRange?: string;
  holidays?: Array<{
    name: string;
    type: string;
  }>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const getUserEmail = (): string => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("userEmail") || "";
  }
  return "";
};

const getCurrentUserId = (): string => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("userId") || "";
  }
  return "";
};

const getCurrentUserRole = (): string => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("userRole") || "";
  }
  return "";
};

const DEFAULT_ATTORNEY = {
  id: "atty.alia_jan_delgado",
  name: "Atty. Alia Jan Delgado",
};

class AppointmentService {
  private readonly APPOINTMENTS_COLLECTION = "appointments";
  private readonly NOTIFICATIONS_COLLECTION = "notifications";
  private readonly TIMESLOTS_COLLECTION = "timeSlots";

  private generateTimeSlots(): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const startHour = 9;
    const endHour = 17; 

    for (let hour = startHour; hour < endHour; hour++) {
      const startTime = `${hour.toString().padStart(2, "0")}:00`;
      const endTime = `${(hour + 1).toString().padStart(2, "0")}:00`;

      slots.push({
        startTime,
        endTime,
        isBooked: false,
        slotId: `${startTime}-${endTime}`,
        bookedBy: null,
        appointmentId: null,
      });
    }

    return slots;
  }
  private convertTo24Hour(time12h: string): string {
    if (!time12h) return "00:00";

    const [time, modifier] = time12h.split(" ");
    let [hours, minutes] = time.split(":").map(Number);

    if (modifier === "PM" && hours < 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;

    return `${hours.toString().padStart(2, "0")}:${
      minutes?.toString().padStart(2, "0") || "00"
    }`;
  }

  private convertTo12Hour(time24h: string): string {
    if (!time24h) return "12:00 AM";

    const [hours, minutes] = time24h.split(":").map(Number);
    const modifier = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${modifier}`;
  }

  private validateVideoLink(link: string): boolean {
    if (!link) return false;

    try {
      const url = new URL(link);
      const validProtocols = ["http:", "https:"];
      const validDomains = [
        "zoom.us",
        "meet.google.com",
        "teams.microsoft.com",
        "whereby.com",
        "gotomeet.me",
        "gotomeeting.com",
        "webex.com",
      ];

      if (!validProtocols.includes(url.protocol)) {
        return false;
      }

      const domain = url.hostname;
      const isValidDomain = validDomains.some((validDomain) =>
        domain.includes(validDomain)
      );

      return (
        isValidDomain ||
        domain.includes("meet") ||
        domain.includes("video") ||
        domain.includes("call")
      );
    } catch {
      return false;
    }
  }

  private formatVideoLink(link: string): string {
    if (!link) return "";

    return link.replace(/\/+$/, "");
  }

  async initializeTimeSlots(date: Date): Promise<void> {
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const docId = `${DEFAULT_ATTORNEY.id}_${dateStr}`;

      const docRef = doc(db, this.TIMESLOTS_COLLECTION, docId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        const isHoliday = await this.isPhilippineHoliday(date);

        await setDoc(docRef, {
          attorneyId: DEFAULT_ATTORNEY.id,
          attorneyName: DEFAULT_ATTORNEY.name,
          date: dateStr,
          availableSlots: this.generateTimeSlots(),
          isUnavailable: isWeekend || isHoliday,
          unavailableReason: isWeekend
            ? "Weekend"
            : isHoliday
            ? "Philippine Holiday"
            : "",
          unavailableTimeRange: isWeekend || isHoliday ? "All Day" : "",
          holidays: isHoliday
            ? [{ name: "Philippine Holiday", type: "regular" }]
            : [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Error initializing time slots:", error);
      throw error;
    }
  }

  private async isPhilippineHoliday(date: Date): Promise<boolean> {
    try {
   
      const holidays: string[] = []; 
      const dateStr = format(date, "yyyy-MM-dd");
      return holidays.includes(dateStr);
    } catch (error) {
      console.error("Error checking holiday:", error);
      return false;
    }
  }

  async getAvailableTimeSlots(date: Date): Promise<string[]> {
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const docId = `${DEFAULT_ATTORNEY.id}_${dateStr}`;

      await this.initializeTimeSlots(date);

      const docSnap = await getDoc(doc(db, this.TIMESLOTS_COLLECTION, docId));

      if (!docSnap.exists()) {
        return [];
      }

      const data = docSnap.data() as TimeSlotDay;

      if (data.isUnavailable) {
        return [];
      }

      const availableSlots = data.availableSlots
        .filter((slot) => !slot.isBooked)
        .map((slot) => this.convertTo12Hour(slot.startTime));

      return availableSlots;
    } catch (error) {
      console.error("Error getting available time slots:", error);
      return [];
    }
  }

  async getTimeSlotsForDate(date: Date): Promise<TimeSlotDay | null> {
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const docId = `${DEFAULT_ATTORNEY.id}_${dateStr}`;

      await this.initializeTimeSlots(date);

      const docSnap = await getDoc(doc(db, this.TIMESLOTS_COLLECTION, docId));

      if (!docSnap.exists()) {
        return null;
      }

      return docSnap.data() as TimeSlotDay;
    } catch (error) {
      console.error("Error getting time slots for date:", error);
      return null;
    }
  }

  async isTimeSlotAvailable(
    date: Date,
    time: string
  ): Promise<{
    available: boolean;
    reason?: string;
    conflictAppointmentId?: string;
  }> {
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const time24h = this.convertTo24Hour(time);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(dateStr);

      if (selectedDate < today) {
        return {
          available: false,
          reason: "Cannot book appointments in the past",
        };
      }

      const docId = `${DEFAULT_ATTORNEY.id}_${dateStr}`;
      const docSnap = await getDoc(doc(db, this.TIMESLOTS_COLLECTION, docId));

      if (docSnap.exists()) {
        const data = docSnap.data() as TimeSlotDay;

        if (data.isUnavailable) {
          return {
            available: false,
            reason:
              data.unavailableReason || "Attorney is unavailable on this date",
          };
        }

        const slot = data.availableSlots.find((s) => s.startTime === time24h);

        if (!slot) {
          return { available: false, reason: "Invalid time slot" };
        }

        if (slot.isBooked) {
          return {
            available: false,
            reason: "This time slot is already booked",
            conflictAppointmentId: slot.appointmentId || undefined,
          };
        }
      }

      const appointmentsRef = collection(db, this.APPOINTMENTS_COLLECTION);
      const q = query(
        appointmentsRef,
        where("date", "==", dateStr),
        where("time", "==", time),
        where("status", "in", ["pending", "confirmed"])
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const appointment = querySnapshot.docs[0].data() as Appointment;
        return {
          available: false,
          reason: `Time slot already booked by ${
            appointment.clientName || appointment.client
          }`,
          conflictAppointmentId: querySnapshot.docs[0].id,
        };
      }

      return { available: true };
    } catch (error) {
      console.error("Error checking time slot:", error);
      return {
        available: false,
        reason: "Error checking availability. Please try again.",
      };
    }
  }

  async checkDoubleBooking(
    date: Date,
    time: string,
    excludeAppointmentId?: string
  ): Promise<{
    isDoubleBooked: boolean;
    conflictingAppointment?: Appointment;
    reason?: string;
  }> {
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const time24h = this.convertTo24Hour(time);

      const docId = `${DEFAULT_ATTORNEY.id}_${dateStr}`;
      const docSnap = await getDoc(doc(db, this.TIMESLOTS_COLLECTION, docId));

      if (docSnap.exists()) {
        const data = docSnap.data() as TimeSlotDay;
        const slot = data.availableSlots.find((s) => s.startTime === time24h);

        if (slot?.isBooked && slot.appointmentId !== excludeAppointmentId) {
          if (slot.appointmentId) {
            const appointment = await this.getAppointmentById(
              slot.appointmentId
            );
            if (appointment) {
              return {
                isDoubleBooked: true,
                conflictingAppointment: appointment,
                reason: `Time slot already booked by ${
                  appointment.clientName || appointment.client
                }`,
              };
            }
          }
        }
      }

      const appointmentsRef = collection(db, this.APPOINTMENTS_COLLECTION);
      const q = query(
        appointmentsRef,
        where("date", "==", dateStr),
        where("time", "==", time),
        where("status", "in", ["pending", "confirmed"])
      );

      const querySnapshot = await getDocs(q);

      for (const aptDoc of querySnapshot.docs) {
        const appointment = aptDoc.data() as Appointment;
        if (aptDoc.id !== excludeAppointmentId) {
          return {
            isDoubleBooked: true,
            conflictingAppointment: { ...appointment, id: aptDoc.id },
            reason: `Time slot already booked by ${
              appointment.clientName || appointment.client
            }`,
          };
        }
      }

      return { isDoubleBooked: false };
    } catch (error) {
      console.error("Error checking double booking:", error);
      return { isDoubleBooked: false };
    }
  }

  async addAppointment(
    appointmentData: Omit<Appointment, "id" | "createdAt" | "updatedAt">
  ): Promise<Appointment | null> {
    try {
      const batch = writeBatch(db);

      const availability = await this.isTimeSlotAvailable(
        new Date(appointmentData.date),
        appointmentData.time
      );

      if (!availability.available) {
        const errorMessage =
          availability.reason || "Time slot is not available";
        console.error("Appointment availability error:", errorMessage);
        throw new Error(errorMessage);
      }

      const doubleBooking = await this.checkDoubleBooking(
        new Date(appointmentData.date),
        appointmentData.time
      );

      if (doubleBooking.isDoubleBooked) {
        const errorMessage = doubleBooking.reason || "Double booking detected";
        console.error("Double booking error:", errorMessage);
        throw new Error(errorMessage);
      }

      if (
        appointmentData.consultationType === "online" &&
        appointmentData.videoLink
      ) {
        if (!this.validateVideoLink(appointmentData.videoLink)) {
          throw new Error("Invalid video link format");
        }
        appointmentData.videoLink = this.formatVideoLink(
          appointmentData.videoLink
        );
        appointmentData.videoLinkAddedAt = new Date().toISOString();
        appointmentData.videoLinkAddedBy = getCurrentUserId() || "admin";
        appointmentData.videoLinkValidated = true;
      }

      const appointmentsRef = collection(db, this.APPOINTMENTS_COLLECTION);

      const newAppointment = {
        ...appointmentData,
        attorneyId: DEFAULT_ATTORNEY.id,
        attorneyName: DEFAULT_ATTORNEY.name,
        uid: appointmentData.clientId,
        clientName: appointmentData.clientName || appointmentData.client,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        videoLinkValidated: appointmentData.videoLink ? true : false,
      };

      const appointmentDocRef = doc(appointmentsRef);
      batch.set(appointmentDocRef, newAppointment);

      const dateStr = appointmentData.date;
      const time24h = this.convertTo24Hour(appointmentData.time);
      const docId = `${DEFAULT_ATTORNEY.id}_${dateStr}`;

      const timeSlotRef = doc(db, this.TIMESLOTS_COLLECTION, docId);
      const timeSlotSnap = await getDoc(timeSlotRef);

      if (timeSlotSnap.exists()) {
        const data = timeSlotSnap.data() as TimeSlotDay;
        const updatedSlots = data.availableSlots.map((slot) => {
          if (slot.startTime === time24h) {
            return {
              ...slot,
              isBooked: true,
              bookedBy: appointmentData.clientId,
              appointmentId: appointmentDocRef.id,
            };
          }
          return slot;
        });

        batch.update(timeSlotRef, {
          availableSlots: updatedSlots,
          updatedAt: serverTimestamp(),
        });
      } else {
        const slots = this.generateTimeSlots().map((slot) => {
          if (slot.startTime === time24h) {
            return {
              ...slot,
              isBooked: true,
              bookedBy: appointmentData.clientId,
              appointmentId: appointmentDocRef.id,
            };
          }
          return slot;
        });

        batch.set(timeSlotRef, {
          attorneyId: DEFAULT_ATTORNEY.id,
          attorneyName: DEFAULT_ATTORNEY.name,
          date: dateStr,
          availableSlots: slots,
          isUnavailable: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();

      return {
        id: appointmentDocRef.id,
        ...newAppointment,
      } as Appointment;
    } catch (error) {
      console.error("Error adding appointment:", error);
      throw error;
    }
  }
  async updateAppointment(
    id: string,
    updates: Partial<Appointment>
  ): Promise<Appointment | null> {
    try {
      const appointmentRef = doc(db, this.APPOINTMENTS_COLLECTION, id);
      const appointmentSnap = await getDoc(appointmentRef);

      if (!appointmentSnap.exists()) {
        throw new Error("Appointment not found");
      }

      const currentAppointment = appointmentSnap.data() as Appointment;
      const batch = writeBatch(db);

      if (updates.videoLink !== undefined) {
        if (updates.videoLink) {
          if (!this.validateVideoLink(updates.videoLink)) {
            throw new Error(
              "Invalid video link format. Please provide a valid video conference link (Zoom, Google Meet, etc.)"
            );
          }
          updates.videoLink = this.formatVideoLink(updates.videoLink);
          updates.videoLinkAddedAt = new Date().toISOString();
          updates.videoLinkAddedBy = getCurrentUserId() || "admin";
          updates.videoLinkValidated = true;

          if (
            currentAppointment.status === "confirmed" &&
            currentAppointment.clientId
          ) {
            await this.createClientNotification(currentAppointment.clientId, {
              notificationType: "confirmed_appointment",
              title: "Video Consultation Link Added",
              message: `A video link has been added to your appointment on ${currentAppointment.date} at ${currentAppointment.time}. Click here to join.`,
              appointmentId: id,
              metadata: {
                appointmentId: id,
                videoLink: updates.videoLink,
                date: currentAppointment.date || "",
                time: currentAppointment.time || "",
              },
            });
          }
        } else {
          updates.videoLink = "";
          updates.videoLinkValidated = false;
        }
      }
      if (updates.date || updates.time) {
        const oldDate = currentAppointment.date;
        const oldTime = currentAppointment.time;
        const oldTime24h = this.convertTo24Hour(oldTime);

        const newDate = updates.date || oldDate;
        const newTime = updates.time || oldTime;
        const newTime24h = this.convertTo24Hour(newTime);

        if (oldDate !== newDate || oldTime !== newTime) {
          const oldDocId = `${DEFAULT_ATTORNEY.id}_${oldDate}`;
          const oldTimeSlotRef = doc(db, this.TIMESLOTS_COLLECTION, oldDocId);
          const oldTimeSlotSnap = await getDoc(oldTimeSlotRef);

          if (oldTimeSlotSnap.exists()) {
            const oldData = oldTimeSlotSnap.data() as TimeSlotDay;
            const updatedOldSlots = oldData.availableSlots.map((slot) => {
              if (slot.startTime === oldTime24h) {
                return {
                  ...slot,
                  isBooked: false,
                  bookedBy: null,
                  appointmentId: null,
                };
              }
              return slot;
            });

            batch.update(oldTimeSlotRef, {
              availableSlots: updatedOldSlots,
              updatedAt: serverTimestamp(),
            });
          }

          const newDateObj = new Date(newDate);
          const availability = await this.isTimeSlotAvailable(
            newDateObj,
            newTime
          );

          if (!availability.available && !currentAppointment.caseId) {
            throw new Error(
              availability.reason || "New time slot is not available"
            );
          }

          const doubleBooking = await this.checkDoubleBooking(
            newDateObj,
            newTime,
            id
          );

          if (doubleBooking.isDoubleBooked) {
            throw new Error(doubleBooking.reason || "Double booking detected");
          }

          const newDocId = `${DEFAULT_ATTORNEY.id}_${newDate}`;
          const newTimeSlotRef = doc(db, this.TIMESLOTS_COLLECTION, newDocId);
          const newTimeSlotSnap = await getDoc(newTimeSlotRef);

          if (newTimeSlotSnap.exists()) {
            const newData = newTimeSlotSnap.data() as TimeSlotDay;
            const updatedNewSlots = newData.availableSlots.map((slot) => {
              if (slot.startTime === newTime24h) {
                return {
                  ...slot,
                  isBooked: true,
                  bookedBy: currentAppointment.clientId,
                  appointmentId: id,
                };
              }
              return slot;
            });

            batch.update(newTimeSlotRef, {
              availableSlots: updatedNewSlots,
              updatedAt: serverTimestamp(),
            });
          } else {
            const slots = this.generateTimeSlots().map((slot) => {
              if (slot.startTime === newTime24h) {
                return {
                  ...slot,
                  isBooked: true,
                  bookedBy: currentAppointment.clientId,
                  appointmentId: id,
                };
              }
              return slot;
            });

            batch.set(newTimeSlotRef, {
              attorneyId: DEFAULT_ATTORNEY.id,
              attorneyName: DEFAULT_ATTORNEY.name,
              date: newDate,
              availableSlots: slots,
              isUnavailable: false,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        }
      }

      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      batch.update(appointmentRef, updateData);

      await batch.commit();

      const updatedAppointment = await this.getAppointmentById(id);
      return updatedAppointment;
    } catch (error) {
      console.error("Error updating appointment:", error);
      throw error;
    }
  }
  async updateAppointmentStatus(
    id: string,
    newStatus: Appointment["status"],
    videoLink?: string
  ): Promise<Appointment | null> {
    try {
      const appointmentRef = doc(db, this.APPOINTMENTS_COLLECTION, id);
      const appointmentSnap = await getDoc(appointmentRef);

      if (!appointmentSnap.exists()) {
        throw new Error("Appointment not found");
      }

      const currentAppointment = appointmentSnap.data() as Appointment;

      const isVirtual =
        currentAppointment.consultationType === "online" ||
        (currentAppointment.location &&
          (currentAppointment.location.toLowerCase().includes("virtual") ||
            currentAppointment.location.toLowerCase().includes("video") ||
            currentAppointment.location.toLowerCase().includes("online")));

      const updates: Partial<Appointment> = {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };

      if (newStatus === "confirmed" && isVirtual) {
        if (videoLink) {
          if (!this.validateVideoLink(videoLink)) {
            throw new Error(
              "Invalid video link format. Please provide a valid video conference link (Zoom, Google Meet, etc.)"
            );
          }
          updates.videoLink = this.formatVideoLink(videoLink);
          updates.videoLinkAddedAt = new Date().toISOString();
          updates.videoLinkAddedBy = getCurrentUserId() || "admin";
          updates.videoLinkValidated = true;
        } else if (!currentAppointment.videoLink) {
          throw new Error(
            "Video consultation link is required to confirm this appointment. Please provide a valid video conference link."
          );
        }
      }

      await updateDoc(appointmentRef, updates);

      if (newStatus === "confirmed" && currentAppointment.clientId) {
        await this.createClientNotification(currentAppointment.clientId, {
          notificationType: "confirmed_appointment",
          title: "Appointment Confirmed",
          message: `Your appointment on ${currentAppointment.date} at ${
            currentAppointment.time
          } has been confirmed.${
            updates.videoLink ? ` Video link: ${updates.videoLink}` : ""
          }`,
          appointmentId: id,
          metadata: {
            appointmentId: id,
            date: currentAppointment.date || "",
            time: currentAppointment.time || "",
            clientName: currentAppointment.clientName || currentAppointment.client || "",
            serviceType: currentAppointment.type || currentAppointment.appointmentPurpose || "",
            consultationType: currentAppointment.consultationType || "in-person",
            location: currentAppointment.location || "",
            confirmedBy: "admin",
            ...(updates.videoLink && { videoLink: updates.videoLink }),
          },
        });
      }

      return await this.getAppointmentById(id);
    } catch (error) {
      console.error("Error updating appointment status:", error);
      throw error;
    }
  }

  async updateVideoLink(
    id: string,
    videoLink: string
  ): Promise<Appointment | null> {
    try {
      if (!this.validateVideoLink(videoLink)) {
        throw new Error(
          "Invalid video link format. Please provide a valid video conference link (Zoom, Google Meet, etc.)"
        );
      }

      const formattedLink = this.formatVideoLink(videoLink);

      return await this.updateAppointment(id, {
        videoLink: formattedLink,
        videoLinkAddedAt: new Date().toISOString(),
        videoLinkAddedBy: getCurrentUserId() || "admin",
        videoLinkValidated: true,
      });
    } catch (error) {
      console.error("Error updating video link:", error);
      throw error;
    }
  }

  async addVideoLink(
    id: string,
    videoLink: string,
    addedBy?: string
  ): Promise<Appointment | null> {
    try {
      if (!this.validateVideoLink(videoLink)) {
        throw new Error(
          "Invalid video link format. Please provide a valid video conference link (Zoom, Google Meet, etc.)"
        );
      }

      const formattedLink = this.formatVideoLink(videoLink);
      const userRole = getCurrentUserRole();

      return await this.updateAppointment(id, {
        videoLink: formattedLink,
        videoLinkAddedAt: new Date().toISOString(),
        videoLinkAddedBy:
          addedBy ||
          getCurrentUserId() ||
          (userRole === "admin" ? "admin" : "attorney"),
        videoLinkValidated: true,
      });
    } catch (error) {
      console.error("Error adding video link:", error);
      throw error;
    }
  }

  async requiresVideoLink(id: string): Promise<{
    requires: boolean;
    reason?: string;
    currentLink?: string;
  }> {
    try {
      const appointment = await this.getAppointmentById(id);
      if (!appointment) {
        return { requires: false, reason: "Appointment not found" };
      }

      const isVirtual =
        appointment.consultationType === "online" ||
        (appointment.location &&
          (appointment.location.toLowerCase().includes("virtual") ||
            appointment.location.toLowerCase().includes("video") ||
            appointment.location.toLowerCase().includes("online")));

      if (!isVirtual) {
        return { requires: false, reason: "Not a virtual consultation" };
      }

      if (appointment.status !== "confirmed") {
        return {
          requires: false,
          reason: "Appointment must be confirmed first",
        };
      }

      if (!appointment.videoLink) {
        return {
          requires: true,
          reason:
            "Video consultation link is required for virtual appointments",
        };
      }

      return {
        requires: false,
        currentLink: appointment.videoLink,
      };
    } catch (error) {
      console.error("Error checking video link requirement:", error);
      return { requires: false, reason: "Error checking requirements" };
    }
  }

  async getAppointmentsNeedingVideoLinks(): Promise<Appointment[]> {
    try {
      const appointmentsRef = collection(db, this.APPOINTMENTS_COLLECTION);
      const q = query(
        appointmentsRef,
        where("status", "==", "confirmed"),
        where("consultationType", "==", "online"),
        where("videoLink", "==", "")
      );

      const querySnapshot = await getDocs(q);
      const appointments: Appointment[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        appointments.push({
          id: doc.id,
          ...data,
        } as Appointment);
      });

      const virtualAppointments = appointments.filter(
        (apt) =>
          apt.location?.toLowerCase().includes("virtual") ||
          apt.location?.toLowerCase().includes("video") ||
          apt.location?.toLowerCase().includes("online")
      );

      return virtualAppointments;
    } catch (error) {
      console.error("Error getting appointments needing video links:", error);
      return [];
    }
  }

  async deleteAppointment(id: string): Promise<boolean> {
    try {
      const appointmentRef = doc(db, this.APPOINTMENTS_COLLECTION, id);
      const appointmentSnap = await getDoc(appointmentRef);

      if (!appointmentSnap.exists()) {
        return false;
      }

      const appointment = appointmentSnap.data() as Appointment;
      const batch = writeBatch(db);

      const dateStr = appointment.date;
      const time24h = this.convertTo24Hour(appointment.time);
      const docId = `${DEFAULT_ATTORNEY.id}_${dateStr}`;

      const timeSlotRef = doc(db, this.TIMESLOTS_COLLECTION, docId);
      const timeSlotSnap = await getDoc(timeSlotRef);

      if (timeSlotSnap.exists()) {
        const data = timeSlotSnap.data() as TimeSlotDay;
        const updatedSlots = data.availableSlots.map((slot) => {
          if (slot.startTime === time24h) {
            return {
              ...slot,
              isBooked: false,
              bookedBy: null,
              appointmentId: null,
            };
          }
          return slot;
        });

        batch.update(timeSlotRef, {
          availableSlots: updatedSlots,
          updatedAt: serverTimestamp(),
        });
      }

      batch.delete(appointmentRef);

      await batch.commit();
      return true;
    } catch (error) {
      console.error("Error deleting appointment:", error);
      return false;
    }
  }

  async getAllAppointments(): Promise<Appointment[]> {
    try {
      const appointmentsRef = collection(db, this.APPOINTMENTS_COLLECTION);
      const q = query(appointmentsRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      const appointments: Appointment[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        appointments.push({
          id: doc.id,
          ...data,
        } as Appointment);
      });

      return appointments;
    } catch (error) {
      console.error("Error fetching appointments:", error);
      return [];
    }
  }

  async getAppointmentsByClient(clientId: string): Promise<Appointment[]> {
    try {
      console.log(
        "[AppointmentService] Getting appointments for client:",
        clientId
      );

      const appointmentsRef = collection(db, this.APPOINTMENTS_COLLECTION);

      const q = query(appointmentsRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const appointments: Appointment[] = [];
      const userEmail = getUserEmail().toLowerCase().trim();

      querySnapshot.forEach((doc) => {
        const data = doc.data() as Appointment;

        const aptClientId = (data.clientId || "").toLowerCase();
        const aptEmail = (data.clientEmail || "").toLowerCase();
        const aptUid = (data.uid || "").toLowerCase();
        if (
          aptClientId === clientId.toLowerCase() ||
          aptEmail === userEmail ||
          aptUid === clientId.toLowerCase()
        ) {
          appointments.push({
            ...data,
            id: doc.id,
          } as Appointment);
        }
      });

      console.log(
        "[AppointmentService] Total appointments found:",
        appointments.length
      );
      return appointments;
    } catch (error) {
      console.error("Error fetching client appointments:", error);
      return [];
    }
  }

  async getAppointmentsByAttorney(attorneyId: string): Promise<Appointment[]> {
    try {
      const appointmentsRef = collection(db, this.APPOINTMENTS_COLLECTION);
      const q = query(
        appointmentsRef,
        where("attorneyId", "==", attorneyId),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);

      const appointments: Appointment[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        appointments.push({
          id: doc.id,
          ...data,
        } as Appointment);
      });

      return appointments;
    } catch (error) {
      console.error("Error fetching attorney appointments:", error);
      return [];
    }
  }

  async getAppointmentById(id: string): Promise<Appointment | null> {
    try {
      const appointmentRef = doc(db, this.APPOINTMENTS_COLLECTION, id);
      const appointmentSnap = await getDoc(appointmentRef);

      if (appointmentSnap.exists()) {
        const data = appointmentSnap.data();
        return {
          id: appointmentSnap.id,
          ...data,
        } as Appointment;
      }

      return null;
    } catch (error) {
      console.error("Error fetching appointment:", error);
      return null;
    }
  }

  async completeAppointment(id: string): Promise<Appointment | null> {
    return this.updateAppointment(id, {
      status: "completed",
      updatedAt: new Date().toISOString(),
    });
  }

  async cancelAppointment(
    id: string,
    reason: string,
    cancelledBy: "client" | "admin"
  ): Promise<Appointment | null> {
    const appointment = await this.updateAppointment(id, {
      status: "cancelled",
      cancellationReason: reason,
      cancelledBy,
      updatedAt: new Date().toISOString(),
    });

    if (appointment) {
      // Create notification for admin if client cancelled
      if (cancelledBy === "client") {
        await this.createAdminNotificationForAppointmentAction(
          appointment,
          "cancelled_appointment",
          `Appointment cancelled by ${appointment.clientName || "client"}`,
          reason
        );
      }
      // Create notification for client if admin cancelled
      else if (cancelledBy === "admin" && appointment.clientId) {
        await this.createClientNotification(appointment.clientId, {
          notificationType: "cancelled_appointment",
          title: "Appointment Cancelled",
          message: `Your appointment on ${appointment.date} at ${appointment.time} has been cancelled. Reason: ${reason}`,
          appointmentId: id,
          metadata: {
            appointmentId: id,
            date: appointment.date || "",
            time: appointment.time || "",
            clientName: appointment.clientName || appointment.client || "",
            cancellationReason: reason || "",
            cancelledBy: "admin",
          },
        });
      }
    }

    return appointment;
  }

  async rescheduleAppointment(
    id: string,
    newDate: string,
    newTime: string,
    reason: string,
    rescheduledBy: "client" | "admin"
  ): Promise<Appointment | null> {
    const appointmentSnap = await getDoc(
      doc(db, this.APPOINTMENTS_COLLECTION, id)
    );
    const currentAppointment = appointmentSnap.data() as Appointment;

    const appointment = await this.updateAppointment(id, {
      date: newDate,
      time: newTime,
      status: "rescheduled",
      rescheduleReason: reason,
      rescheduledBy,
      updatedAt: new Date().toISOString(),
    });

    if (appointment && currentAppointment) {
      // Create notification for admin if client rescheduled
      if (rescheduledBy === "client") {
        await this.createAdminNotificationForAppointmentAction(
          appointment,
          "rescheduled_appointment",
          `Appointment rescheduled by ${appointment.clientName || "client"}`,
          reason,
          {
            oldDate: currentAppointment.date,
            oldTime: currentAppointment.time,
            newDate,
            newTime,
          }
        );
      }
      // Create notification for client if admin rescheduled
      else if (rescheduledBy === "admin" && appointment.clientId) {
        await this.createClientNotification(appointment.clientId, {
          notificationType: "rescheduled_appointment",
          title: "Appointment Rescheduled",
          message: `Your appointment has been rescheduled to ${newDate} at ${newTime}. Reason: ${reason}`,
          appointmentId: id,
          metadata: {
            appointmentId: id,
            oldDate: currentAppointment.date || "",
            oldTime: currentAppointment.time || "",
            newDate: newDate || "",
            newTime: newTime || "",
            clientName: appointment.clientName || appointment.client || "",
            rescheduleReason: reason || "",
            rescheduledBy: "admin",
          },
        });
      }
    }

    return appointment;
  }

  async isDateUnavailable(date: Date): Promise<boolean> {
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const docId = `${DEFAULT_ATTORNEY.id}_${dateStr}`;
      const docSnap = await getDoc(doc(db, this.TIMESLOTS_COLLECTION, docId));

      if (docSnap.exists()) {
        const data = docSnap.data() as TimeSlotDay;
        return data.isUnavailable;
      }

      const dayOfWeek = date.getDay();
      return dayOfWeek === 0 || dayOfWeek === 6;
    } catch (error) {
      console.error("Error checking date availability:", error);
      return false;
    }
  }

  async getUnavailableDates(year: number, month: number): Promise<string[]> {
    try {
      const unavailableDates: string[] = [];

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const timeSlotsRef = collection(db, this.TIMESLOTS_COLLECTION);
      const q = query(
        timeSlotsRef,
        where("attorneyId", "==", DEFAULT_ATTORNEY.id),
        where("date", ">=", format(startDate, "yyyy-MM-dd")),
        where("date", "<=", format(endDate, "yyyy-MM-dd")),
        where("isUnavailable", "==", true)
      );

      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        const data = doc.data() as TimeSlotDay;
        unavailableDates.push(data.date);
      });

      for (
        let d = new Date(startDate);
        d <= endDate;
        d.setDate(d.getDate() + 1)
      ) {
        const dayOfWeek = d.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          unavailableDates.push(format(d, "yyyy-MM-dd"));
        }
      }

      return [...new Set(unavailableDates)];
    } catch (error) {
      console.error("Error getting unavailable dates:", error);
      return [];
    }
  }

  private cleanMetadata(metadata?: Record<string, any>): Record<string, any> {
    if (!metadata) return {};
    
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (value !== undefined && value !== null) {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }

  async createClientNotification(
    clientId: string,
    notification: Omit<Notification, "id" | "createdAt" | "read" | "type">
  ): Promise<void> {
    try {
      // Validate required fields
      if (!notification.notificationType) {
        console.error("[AppointmentService] notificationType is required but not provided");
        throw new Error("notificationType is required");
      }

      const notificationsRef = collection(db, this.NOTIFICATIONS_COLLECTION);
      const newNotification = {
        type: "appointment" as const,
        notificationType: notification.notificationType,
        title: notification.title || "Appointment Notification",
        message: notification.message || "",
        appointmentId: notification.appointmentId || "",
        metadata: this.cleanMetadata(notification.metadata),
        userId: clientId,
        createdAt: new Date().toISOString(),
        read: false,
      };

      await addDoc(notificationsRef, newNotification);
      console.log(`[AppointmentService] Created notification for client: ${clientId}`);
    } catch (error) {
      console.error("Error creating client notification:", error);
      throw error;
    }
  }

  async createAdminNotification(
    notification: Omit<Notification, "id" | "createdAt" | "read" | "type">
  ): Promise<void> {
    try {
      // Validate required fields
      if (!notification.notificationType) {
        console.error("[AppointmentService] notificationType is required but not provided");
        throw new Error("notificationType is required");
      }

      const notificationsRef = collection(db, this.NOTIFICATIONS_COLLECTION);
      const newNotification = {
        type: "appointment" as const,
        notificationType: notification.notificationType,
        title: notification.title || "Appointment Notification",
        message: notification.message || "",
        appointmentId: notification.appointmentId || "",
        metadata: this.cleanMetadata(notification.metadata),
        userId: "admin",
        createdAt: new Date().toISOString(),
        read: false,
      };

      await addDoc(notificationsRef, newNotification);
      console.log("[AppointmentService] Created notification for admin");
    } catch (error) {
      console.error("Error creating admin notification:", error);
      throw error;
    }
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    try {
      const notificationsRef = collection(db, this.NOTIFICATIONS_COLLECTION);
      const q = query(
        notificationsRef,
        where("userId", "in", [userId, "admin"]),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(q);
      const notifications: Notification[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        notifications.push({
          id: doc.id,
          ...data,
        } as Notification);
      });

      return notifications;
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return [];
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(
        db,
        this.NOTIFICATIONS_COLLECTION,
        notificationId
      );
      await updateDoc(notificationRef, { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }

  subscribeToAppointments(
    callback: (appointments: Appointment[]) => void,
    clientId?: string
  ): () => void {
    try {
      const appointmentsRef = collection(db, this.APPOINTMENTS_COLLECTION);

      if (clientId) {
        const userEmail = getUserEmail().toLowerCase().trim();
        const q = query(appointmentsRef, orderBy("createdAt", "desc"));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          const allAppointments: Appointment[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            allAppointments.push({
              id: doc.id,
              ...data,
            } as Appointment);
          });

          const userAppointments = allAppointments.filter((apt) => {
            const aptClientId = (apt.clientId || "").toLowerCase();
            const aptEmail = (apt.clientEmail || "").toLowerCase();
            const aptUid = (apt.uid || "").toLowerCase();

            return (
              aptClientId === clientId.toLowerCase() ||
              aptEmail === userEmail ||
              aptUid === clientId.toLowerCase()
            );
          });

          callback(userAppointments);
        });

        return unsubscribe;
      } else {
        const q = query(appointmentsRef, orderBy("createdAt", "desc"));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          const appointments: Appointment[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            appointments.push({
              id: doc.id,
              ...data,
            } as Appointment);
          });
          callback(appointments);
        });

        return unsubscribe;
      }
    } catch (error) {
      console.error("Error subscribing to appointments:", error);
      return () => {};
    }
  }

  async fixAppointmentClientData(
    appointmentId: string,
    correctClientId: string,
    correctClientEmail: string,
    correctClientName: string
  ): Promise<boolean> {
    try {
      const appointmentRef = doc(
        db,
        this.APPOINTMENTS_COLLECTION,
        appointmentId
      );

      await updateDoc(appointmentRef, {
        clientId: correctClientId,
        clientEmail: correctClientEmail,
        clientName: correctClientName,
        uid: correctClientId,
        updatedAt: new Date().toISOString(),
      });

      console.log(
        "[AppointmentService] Fixed appointment data for:",
        appointmentId
      );
      return true;
    } catch (error) {
      console.error("Error fixing appointment data:", error);
      return false;
    }
  }

  async findAppointmentsByEmail(email: string): Promise<Appointment[]> {
    try {
      const appointmentsRef = collection(db, this.APPOINTMENTS_COLLECTION);
      const q = query(
        appointmentsRef,
        where("clientEmail", "==", email.toLowerCase()),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(q);
      const appointments: Appointment[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        appointments.push({
          id: doc.id,
          ...data,
        } as Appointment);
      });

      return appointments;
    } catch (error) {
      console.error("Error finding appointments by email:", error);
      return [];
    }
  }

  async getUpcomingVirtualAppointments(): Promise<Appointment[]> {
    try {
      const appointmentsRef = collection(db, this.APPOINTMENTS_COLLECTION);
      const today = format(new Date(), "yyyy-MM-dd");

      const q = query(
        appointmentsRef,
        where("date", ">=", today),
        where("consultationType", "==", "online"),
        where("status", "==", "confirmed"),
        orderBy("date", "asc"),
        orderBy("time", "asc")
      );

      const querySnapshot = await getDocs(q);
      const appointments: Appointment[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        appointments.push({
          id: doc.id,
          ...data,
        } as Appointment);
      });

      return appointments;
    } catch (error) {
      console.error("Error getting upcoming virtual appointments:", error);
      return [];
    }
  }

  async validateAndTestVideoLink(id: string): Promise<{
    isValid: boolean;
    message?: string;
    link?: string;
  }> {
    try {
      const appointment = await this.getAppointmentById(id);
      if (!appointment || !appointment.videoLink) {
        return { isValid: false, message: "No video link found" };
      }

      if (!this.validateVideoLink(appointment.videoLink)) {
        return {
          isValid: false,
          message: "Invalid video link format",
          link: appointment.videoLink,
        };
      }

      const isActive = true;

      return {
        isValid: isActive,
        message: isActive
          ? "Video link is valid and active"
          : "Video link may be expired",
        link: appointment.videoLink,
      };
    } catch (error) {
      console.error("Error validating video link:", error);
      return { isValid: false, message: "Error validating video link" };
    }
  }

  private async createAdminNotificationForAppointmentAction(
    appointment: Appointment,
    notificationType: "cancelled_appointment" | "rescheduled_appointment",
    title: string,
    reason: string,
    additionalMetadata?: Record<string, any>
  ) {
    try {
      console.log("[AppointmentService] Creating notification for appointment action:", {
        notificationType,
        appointmentId: appointment.id,
        clientName: appointment.clientName,
      });

      const notificationsRef = collection(db, "notifications");
      
      // Get all admin users
      const usersRef = collection(db, "users");
      const adminQuery = query(usersRef, where("role", "==", "admin"));
      const adminSnapshot = await getDocs(adminQuery);

      console.log("[AppointmentService] Found admin users:", adminSnapshot.docs.length);

      if (adminSnapshot.docs.length === 0) {
        console.warn("[AppointmentService] No admin users found to notify");
        return;
      }

      // Create notification for each admin
      const promises = adminSnapshot.docs.map((adminDoc) => {
        const metadata = {
          appointmentId: appointment.id,
          clientName: appointment.clientName || "Client",
          clientEmail: appointment.clientEmail || "",
          clientPhone: appointment.clientPhone || "",
          date: appointment.date,
          time: appointment.time,
          serviceType: appointment.type || appointment.appointmentPurpose || "Legal Consultation",
          consultationType: appointment.consultationType || "in-person",
          location: appointment.location || "Office",
          ...(notificationType === "cancelled_appointment" && { cancellationReason: reason }),
          ...(notificationType === "rescheduled_appointment" && { rescheduleReason: reason }),
          ...additionalMetadata,
        };

        const notificationData = {
          userId: adminDoc.id,
          type: "appointment",
          notificationType,
          title,
          message: reason || `Appointment ${notificationType.replace(/_/g, " ")}`,
          metadata: this.cleanMetadata(metadata),
          read: false,
          priority: "high",
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        console.log("[AppointmentService] Creating notification for admin:", adminDoc.id);
        return addDoc(notificationsRef, notificationData);
      });

      const results = await Promise.all(promises);
      console.log("[AppointmentService] Successfully created", results.length, "appointment notifications");
    } catch (error) {
      console.error("[AppointmentService] Error creating admin notification for appointment action:", error);
    }
  }
}

export default new AppointmentService();
