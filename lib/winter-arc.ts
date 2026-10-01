export const START_DATE = "2026-10-01";
export const END_DATE = "2027-02-28";
export const DAY_COUNT = 151;

export type Habit = { id: string; name: string; icon: string };
export type DayRecord = {
  completed: Record<string, boolean>;
  sleepStart: string;
  wakeTime: string;
};
export type AppData = {
  habits: Habit[];
  records: Record<string, DayRecord>;
  weeklyReviews: Record<string, { wins: string; lessons: string; focus: string }>;
  monthlyReviews: Record<string, { win: string; lesson: string; improve: string; goal: string }>;
};

export const DEFAULT_HABITS: Habit[] = [
  { id: "workout", name: "Workout / Exercise", icon: "Dumbbell" },
  { id: "steps", name: "10,000 Steps", icon: "Footprints" },
  { id: "water", name: "Drink 3L Water", icon: "Droplets" },
  { id: "junk", name: "No Junk Food", icon: "Ban" },
  { id: "healthy", name: "Healthy Meals", icon: "Salad" },
  { id: "learn", name: "Read / Learn", icon: "BookOpen" },
  { id: "meditate", name: "Meditate / Journal", icon: "Brain" },
  { id: "early", name: "Wake Up Early", icon: "Sunrise" },
  { id: "sleep", name: "Sleep On Time", icon: "Moon" },
  { id: "productive", name: "Be Productive", icon: "Target" },
];

export const EMPTY_DAY: DayRecord = { completed: {}, sleepStart: "", wakeTime: "" };

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseDate(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function dateOffset(key: string, offset: number): string {
  const date = parseDate(key);
  date.setDate(date.getDate() + offset);
  return dateKey(date);
}

export function challengeDay(key: string): number {
  const [year, month, day] = key.split("-").map(Number);
  const [startYear, startMonth, startDay] = START_DATE.split("-").map(Number);
  const ordinal = Date.UTC(year, month - 1, day);
  const startOrdinal = Date.UTC(startYear, startMonth - 1, startDay);
  return Math.floor((ordinal - startOrdinal) / 86_400_000) + 1;
}

export function clampChallengeDate(key: string): string {
  return key < START_DATE ? START_DATE : key > END_DATE ? END_DATE : key;
}

export function dayScore(record: DayRecord | undefined, habits: Habit[]): number {
  if (!habits.length) return 0;
  const done = habits.filter((habit) => record?.completed[habit.id]).length;
  return Math.round((done / habits.length) * 100);
}

export function sleepMinutes(record: DayRecord | undefined): number {
  if (!record?.sleepStart || !record.wakeTime) return 0;
  const [startHour, startMinute] = record.sleepStart.split(":").map(Number);
  const [wakeHour, wakeMinute] = record.wakeTime.split(":").map(Number);
  let duration = wakeHour * 60 + wakeMinute - (startHour * 60 + startMinute);
  if (duration <= 0) duration += 24 * 60;
  return duration;
}

export function inclusiveDates(start: string, end: string): string[] {
  const dates: string[] = [];
  for (let key = start; key <= end; key = dateOffset(key, 1)) dates.push(key);
  return dates;
}