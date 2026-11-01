import { newCard, newSchedule, type Schedule } from "./model";

export type Starter = { id: string; name: string; description: string; make: () => Schedule };

const c = (name: string, icon: string, startTime?: string) => newCard(name, startTime ? { icon, startTime } : { icon });

/** Examples the teacher can edit freely. Only labels, icons and times. */
export const STARTERS: Starter[] = [
  { id: "elementary", name: "Typical elementary day", description: "9 cards with times", make: () => newSchedule("Typical elementary day", "day", [
    c("Arrival", "backpack", "08:30"), c("Circle time", "circle-time", "08:50"), c("Reading", "reading", "09:15"), c("Recess", "recess", "10:30"),
    c("Math", "math", "10:50"), c("Lunch", "lunch", "12:00"), c("Specialist", "specialist", "12:45"), c("Pack up", "pack-up", "14:30"), c("Go home", "go-home", "14:45")]) },
  { id: "morning", name: "Morning routine", description: "4 cards", make: () => newSchedule("Morning routine", "day", [
    c("Backpack", "backpack"), c("Coat", "coat"), c("Wash hands", "wash-hands"), c("Morning work", "writing")]) },
  { id: "firstthen", name: "First and Then", description: "2 big cards", make: () => newSchedule("First and Then", "firstThen", [
    c("Writing", "writing"), c("Break", "break")]) },
];
