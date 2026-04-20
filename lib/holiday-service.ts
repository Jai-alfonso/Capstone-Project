// Philippine Holidays API Service
export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
  type: "regular" | "special" | "observance";
  description: string;
}

export class HolidayService {
  private static cachedHolidays: Holiday[] = [];
  private static cacheExpiry: number = 0;
  private static CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  static async getPhilippineHolidays(
    year: number = new Date().getFullYear()
  ): Promise<Holiday[]> {
    const now = Date.now();

    // Return cached data if valid
    if (this.cachedHolidays.length > 0 && now < this.cacheExpiry) {
      return this.cachedHolidays;
    }

    try {
      // Using a public API for Philippine holidays
      const response = await fetch(
        `https://calendarific.com/api/v2/holidays?api_key=demo&country=PH&year=${year}`,
        // Note: In production, replace 'demo' with a real API key
        // Alternative: Use local JSON file with pre-defined holidays
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch holidays");
      }

      const data = await response.json();

      if (data.response && data.response.holidays) {
        this.cachedHolidays = data.response.holidays.map((holiday: any) => ({
          date: holiday.date.iso,
          name: holiday.name,
          type: holiday.type[0],
          description: holiday.description || "",
        }));

        this.cacheExpiry = now + this.CACHE_DURATION;
        return this.cachedHolidays;
      }

      return this.getFallbackHolidays(year);
    } catch (error) {
      console.error("Error fetching holidays:", error);
      return this.getFallbackHolidays(year);
    }
  }

  private static getFallbackHolidays(year: number): Holiday[] {
    // Fallback hardcoded Philippine holidays (major ones)
    const holidays: Holiday[] = [
      // New Year's Day
      {
        date: `${year}-01-01`,
        name: "New Year's Day",
        type: "regular",
        description: "Regular holiday",
      },
      // Holy Week
      {
        date: this.calculateEaster(year),
        name: "Maundy Thursday",
        type: "regular",
        description: "Holy Week",
      },
      {
        date: this.addDays(this.calculateEaster(year), 1),
        name: "Good Friday",
        type: "regular",
        description: "Holy Week",
      },
      {
        date: this.addDays(this.calculateEaster(year), 2),
        name: "Black Saturday",
        type: "special",
        description: "Holy Week",
      },
      // Labor Day
      {
        date: `${year}-05-01`,
        name: "Labor Day",
        type: "regular",
        description: "Regular holiday",
      },
      // Independence Day
      {
        date: `${year}-06-12`,
        name: "Independence Day",
        type: "regular",
        description: "Regular holiday",
      },
      // National Heroes Day (Last Monday of August)
      {
        date: this.getLastMondayOfMonth(year, 8),
        name: "National Heroes Day",
        type: "regular",
        description: "Regular holiday",
      },
      // Bonifacio Day
      {
        date: `${year}-11-30`,
        name: "Bonifacio Day",
        type: "regular",
        description: "Regular holiday",
      },
      // Christmas Day
      {
        date: `${year}-12-25`,
        name: "Christmas Day",
        type: "regular",
        description: "Regular holiday",
      },
      // Rizal Day
      {
        date: `${year}-12-30`,
        name: "Rizal Day",
        type: "regular",
        description: "Regular holiday",
      },
    ];

    return holidays;
  }

  private static calculateEaster(year: number): string {
    // Simple Easter calculation (may not be 100% accurate)
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
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;

    return `${year}-${month.toString().padStart(2, "0")}-${day
      .toString()
      .padStart(2, "0")}`;
  }

  private static addDays(dateStr: string, days: number): string {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split("T")[0];
  }

  private static getLastMondayOfMonth(year: number, month: number): string {
    const date = new Date(year, month, 0); // Last day of month
    const day = date.getDay();
    const diff = (day === 0 ? 6 : day - 1) + 7;
    date.setDate(date.getDate() - diff);
    return date.toISOString().split("T")[0];
  }

  static isHoliday(date: Date): boolean {
    const dateStr = date.toISOString().split("T")[0];
    return this.cachedHolidays.some((holiday) => holiday.date === dateStr);
  }

  static getHolidayName(date: Date): string | null {
    const dateStr = date.toISOString().split("T")[0];
    const holiday = this.cachedHolidays.find((h) => h.date === dateStr);
    return holiday ? holiday.name : null;
  }
}
