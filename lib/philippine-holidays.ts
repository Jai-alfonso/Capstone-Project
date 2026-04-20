export interface Holiday {
  name: string;
  date: Date;
  type: "regular" | "special";
}

export function getPhilippineHolidays(year: number): Holiday[] {
  const holidays: Holiday[] = [
    { name: "New Year's Day", date: new Date(year, 0, 1), type: "regular" },
    {
      name: "Araw ng Kagitingan (Day of Valor)",
      date: new Date(year, 3, 9),
      type: "regular",
    },
    { name: "Labor Day", date: new Date(year, 4, 1), type: "regular" },
    { name: "Independence Day", date: new Date(year, 5, 12), type: "regular" },
    {
      name: "National Heroes Day",
      date: getLastMondayOfAugust(year),
      type: "regular",
    },
    { name: "Bonifacio Day", date: new Date(year, 10, 30), type: "regular" },
    { name: "Christmas Day", date: new Date(year, 11, 25), type: "regular" },
    { name: "Rizal Day", date: new Date(year, 11, 30), type: "regular" },

    {
      name: "EDSA People Power Revolution Anniversary",
      date: new Date(year, 1, 25),
      type: "special",
    },
    { name: "Ninoy Aquino Day", date: new Date(year, 7, 21), type: "special" },
    { name: "All Saints' Day", date: new Date(year, 10, 1), type: "special" },
    { name: "All Souls' Day", date: new Date(year, 10, 2), type: "special" },
    {
      name: "Feast of the Immaculate Conception of Mary",
      date: new Date(year, 11, 8),
      type: "special",
    },
    { name: "Christmas Eve", date: new Date(year, 11, 24), type: "special" },
    {
      name: "Last Day of the Year",
      date: new Date(year, 11, 31),
      type: "special",
    },
  ];

  const easter = calculateEaster(year);
  holidays.push(
    {
      name: "Maundy Thursday",
      date: new Date(easter.getTime() - 3 * 24 * 60 * 60 * 1000),
      type: "regular",
    },
    {
      name: "Good Friday",
      date: new Date(easter.getTime() - 2 * 24 * 60 * 60 * 1000),
      type: "regular",
    },
    {
      name: "Black Saturday",
      date: new Date(easter.getTime() - 1 * 24 * 60 * 60 * 1000),
      type: "special",
    }
  );

  return holidays;
}

export function isPhilippineHoliday(date: Date): boolean {
  const year = date.getFullYear();
  const holidays = getPhilippineHolidays(year);

  return holidays.some(
    (holiday) =>
      holiday.date.getFullYear() === date.getFullYear() &&
      holiday.date.getMonth() === date.getMonth() &&
      holiday.date.getDate() === date.getDate()
  );
}

export function getHolidayName(date: Date): string | null {
  const year = date.getFullYear();
  const holidays = getPhilippineHolidays(year);

  const holiday = holidays.find(
    (h) =>
      h.date.getFullYear() === date.getFullYear() &&
      h.date.getMonth() === date.getMonth() &&
      h.date.getDate() === date.getDate()
  );

  return holiday ? holiday.name : null;
}

export function getHolidaysInRange(startDate: Date, endDate: Date): Holiday[] {
  const holidays: Holiday[] = [];
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  for (let year = startYear; year <= endYear; year++) {
    const yearHolidays = getPhilippineHolidays(year);
    holidays.push(
      ...yearHolidays.filter((h) => h.date >= startDate && h.date <= endDate)
    );
  }

  return holidays;
}

function getLastMondayOfAugust(year: number): Date {
  const lastDayOfAugust = new Date(year, 8, 0);
  const lastDay = lastDayOfAugust.getDate();

  for (let day = lastDay; day >= 1; day--) {
    const date = new Date(year, 7, day);
    if (date.getDay() === 1) {
      return date;
    }
  }

  return new Date(year, 7, 1);
}

function calculateEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month, day);
}

export function formatDateForComparison(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
