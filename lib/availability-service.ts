import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  updateDoc,
  DocumentData,
} from "firebase/firestore";
import { HolidayService } from "./holiday-service";

export interface AttorneyAvailability {
  id: string;
  date: string; // YYYY-MM-DD format
  reason: string;
  timeRange: string;
  attorneyId: string;
  attorneyName: string;
  createdAt: Timestamp | Date;
}

export interface BookedSlot {
  appointmentId: string;
  date: string;
  time: string;
  clientId: string;
  attorneyId: string;
  status: string;
}

export class AvailabilityService {
  // Get all attorney unavailable dates from Firestore
  static async getAttorneyUnavailableDates(
    attorneyId: string = "atty.alia_jan_delgado"
  ): Promise<AttorneyAvailability[]> {
    try {
      const q = query(
        collection(db, "availability"),
        where("attorneyId", "==", attorneyId)
      );
      const querySnapshot = await getDocs(q);

      const entries: AttorneyAvailability[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        entries.push({
          id: doc.id,
          date: data.date,
          reason: data.reason,
          timeRange: data.timeRange,
          attorneyId: data.attorneyId,
          attorneyName: data.attorneyName,
          createdAt: data.createdAt,
        });
      });

      // Filter out expired entries
      const today = new Date().toISOString().split("T")[0];
      const validEntries = entries.filter((entry) => entry.date >= today);

      // Remove expired entries from database
      const expiredEntries = entries.filter((entry) => entry.date < today);
      if (expiredEntries.length > 0) {
        expiredEntries.forEach(async (entry) => {
          await deleteDoc(doc(db, "availability", entry.id));
        });
      }

      return validEntries;
    } catch (error) {
      console.error("Error loading attorney availability:", error);
      return [];
    }
  }

  // Save attorney unavailable date to Firestore
  static async saveAttorneyUnavailableDate(
    entry: Omit<AttorneyAvailability, "id" | "createdAt">
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const id = `availability_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      await setDoc(doc(db, "availability", id), {
        ...entry,
        createdAt: Timestamp.now(),
      });
      return { success: true, id };
    } catch (error) {
      console.error("Error saving attorney availability:", error);
      return { success: false, error: "Failed to save availability" };
    }
  }

  // Remove attorney unavailable date
  static async removeAttorneyUnavailableDate(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, "availability", id));
      return true;
    } catch (error) {
      console.error("Error removing attorney availability:", error);
      return false;
    }
  }

  // Check if attorney is available on a specific date
  static async isAttorneyAvailable(
    date: Date,
    attorneyId: string = "atty.alia_jan_delgado"
  ): Promise<{
    available: boolean;
    reason?: string;
    entry?: AttorneyAvailability;
  }> {
    try {
      const dateStr = date.toISOString().split("T")[0];
      const q = query(
        collection(db, "availability"),
        where("attorneyId", "==", attorneyId),
        where("date", "==", dateStr)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const entry = {
          id: doc.id,
          ...doc.data(),
        } as AttorneyAvailability;

        return {
          available: false,
          reason: `${entry.reason} (${entry.timeRange})`,
          entry,
        };
      }
      return { available: true };
    } catch (error) {
      console.error("Error checking attorney availability:", error);
      return { available: true }; // Default to available on error
    }
  }

  // Get all booked appointments for time slot checking
  static async getBookedAppointments(
    date: Date,
    attorneyId: string = "atty.alia_jan_delgado"
  ): Promise<BookedSlot[]> {
    try {
      const dateStr = date.toISOString().split("T")[0];
      const q = query(
        collection(db, "appointments"),
        where("attorneyId", "==", attorneyId),
        where("date", "==", dateStr),
        where("status", "in", ["pending", "confirmed", "rescheduled"])
      );

      const querySnapshot = await getDocs(q);
      const bookedSlots: BookedSlot[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        bookedSlots.push({
          appointmentId: doc.id,
          date: data.date,
          time: data.time || "9:00 AM",
          clientId: data.clientId,
          attorneyId: data.attorneyId,
          status: data.status,
        });
      });

      return bookedSlots;
    } catch (error) {
      console.error("Error getting booked appointments:", error);
      return [];
    }
  }

  // Check if a time slot is already booked
  static async isTimeSlotBooked(
    date: Date,
    time: string,
    excludeAppointmentId?: string,
    attorneyId: string = "atty.alia_jan_delgado"
  ): Promise<{ booked: boolean; appointmentId?: string; appointment?: any }> {
    try {
      const dateStr = date.toISOString().split("T")[0];
      const q = query(
        collection(db, "appointments"),
        where("attorneyId", "==", attorneyId),
        where("date", "==", dateStr),
        where("time", "==", time),
        where("status", "in", ["pending", "confirmed", "rescheduled"])
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const appointment = doc.data();

        // Skip if this is the same appointment we're updating
        if (excludeAppointmentId && doc.id === excludeAppointmentId) {
          return { booked: false };
        }

        return {
          booked: true,
          appointmentId: doc.id,
          appointment: { id: doc.id, ...appointment },
        };
      }
      return { booked: false };
    } catch (error) {
      console.error("Error checking time slot:", error);
      return { booked: false };
    }
  }

  // Get available time slots considering attorney availability and booked appointments
  static async getAvailableTimeSlots(
    date: Date,
    attorneyId: string = "atty.alia_jan_delgado"
  ): Promise<string[]> {
    // Standard business hours
    const standardSlots = [
      "9:00 AM",
      "10:00 AM",
      "11:00 AM",
      "12:00 PM",
      "1:00 PM",
      "2:00 PM",
      "3:00 PM",
      "4:00 PM",
      "5:00 PM",
    ];

    try {
      // Check attorney availability
      const attorneyAvailability = await this.isAttorneyAvailable(
        date,
        attorneyId
      );
      if (!attorneyAvailability.available) {
        return [];
      }

      // Get booked appointments
      const bookedAppointments = await this.getBookedAppointments(
        date,
        attorneyId
      );
      const bookedTimes = bookedAppointments.map((app) => app.time);

      // Filter out booked slots
      return standardSlots.filter((slot) => !bookedTimes.includes(slot));
    } catch (error) {
      console.error("Error getting available time slots:", error);
      return standardSlots; // Return all slots on error
    }
  }

  // Check if a date is bookable (considering weekends, holidays, attorney availability)
  static async isDateBookable(
    date: Date,
    attorneyId: string = "atty.alia_jan_delgado"
  ): Promise<{ bookable: boolean; reason?: string }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    // Check if date is in the past
    if (dateOnly < today) {
      return {
        bookable: false,
        reason: "Cannot book appointments in the past",
      };
    }

    // Check if it's a weekend
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return {
        bookable: false,
        reason: "Weekends are not available for appointments",
      };
    }

    // Check attorney availability
    const attorneyAvailable = await this.isAttorneyAvailable(date, attorneyId);
    if (!attorneyAvailable.available) {
      return { bookable: false, reason: attorneyAvailable.reason };
    }

    // Check if it's a holiday using the provided HolidayService
    try {
      const isHoliday = HolidayService.isHoliday(date);
      if (isHoliday) {
        const holidayName = HolidayService.getHolidayName(date);
        return {
          bookable: false,
          reason: `Philippine holiday: ${holidayName || "Public holiday"}`,
        };
      }
    } catch (error) {
      console.error("Error checking holiday:", error);
      // Continue if holiday check fails
    }

    return { bookable: true };
  }

  // Get all upcoming unavailable dates (including holidays)
  static async getUnavailableDatesWithReasons(
    attorneyId: string = "atty.alia_jan_delgado"
  ): Promise<
    Array<{ date: string; reason: string; type: "attorney" | "holiday" }>
  > {
    const unavailableDates: Array<{
      date: string;
      reason: string;
      type: "attorney" | "holiday";
    }> = [];

    try {
      // Get attorney unavailable dates
      const attorneyUnavailable = await this.getAttorneyUnavailableDates(
        attorneyId
      );
      attorneyUnavailable.forEach((entry) => {
        unavailableDates.push({
          date: entry.date,
          reason: `Attorney: ${entry.reason} (${entry.timeRange})`,
          type: "attorney",
        });
      });

      // Get holidays for current year
      const holidays = await HolidayService.getPhilippineHolidays();
      const today = new Date().toISOString().split("T")[0];

      holidays.forEach((holiday) => {
        if (holiday.date >= today) {
          unavailableDates.push({
            date: holiday.date,
            reason: `Holiday: ${holiday.name} (${holiday.type})`,
            type: "holiday",
          });
        }
      });

      // Sort by date
      return unavailableDates.sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error("Error getting unavailable dates:", error);
      return [];
    }
  }
}
