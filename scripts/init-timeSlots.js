// scripts/init-timeSlots.js
const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  collection,
  doc,
  setDoc,
  serverTimestamp,
} = require("firebase/firestore");
const { format, addDays } = require("date-fns");

const firebaseConfig = {
  apiKey: "AIzaSyBh163L6sInonJPzyJkTKFgcfCUdfixuVc",
  authDomain: "lawdelgado-f695b.firebaseapp.com",
  projectId: "lawdelgado-f695b",
  storageBucket: "lawdelgado-f695b.firebasestorage.app",
  messagingSenderId: "186700328046",
  appId: "1:186700328046:web:49f39451dd6d2231fc0a7f",
  measurementId: "G-B0343W9JMX",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function initializeTimeSlots() {
  const attorneyId = "atty.alia_jan_delgado";
  const attorneyName = "Atty. Alia Jan Delgado";

  const startDate = new Date();
  const endDate = addDays(startDate, 180); // Next 6 months

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const dateStr = format(d, "yyyy-MM-dd");
    const docId = `${attorneyId}_${dateStr}`;

    // Generate time slots (9 AM to 5 PM)
    const slots = [];
    for (let hour = 9; hour < 17; hour++) {
      slots.push({
        startTime: `${hour.toString().padStart(2, "0")}:00`,
        endTime: `${(hour + 1).toString().padStart(2, "0")}:00`,
        isBooked: false,
        slotId: `${hour.toString().padStart(2, "0")}:00-${(hour + 1)
          .toString()
          .padStart(2, "0")}:00`,
        bookedBy: null,
        appointmentId: null,
      });
    }

    await setDoc(doc(db, "timeSlots", docId), {
      attorneyId,
      attorneyName,
      date: dateStr,
      availableSlots: slots,
      isUnavailable: isWeekend,
      unavailableReason: isWeekend ? "Weekend" : "",
      unavailableTimeRange: isWeekend ? "All Day" : "",
      holidays: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log(`Initialized: ${dateStr} ${isWeekend ? "(Weekend)" : ""}`);
  }

  console.log("Time slots initialized successfully!");
}

initializeTimeSlots().catch(console.error);
