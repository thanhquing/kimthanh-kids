import type { Mood } from "@/api/reports";

export const moodOptions: Array<{ value: Mood; icon: string }> = [
  { value: "HAPPY", icon: ":)" },
  { value: "NEUTRAL", icon: ":|" },
  { value: "TIRED", icon: "-_-" },
  { value: "FUSSY", icon: ":(" },
];

export function moodIcon(mood?: Mood | null) {
  return moodOptions.find((item) => item.value === mood)?.icon ?? ":)";
}

