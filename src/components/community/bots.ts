export const BUILT_IN_BOTS = [
  {
    key: "level-app",
    name: "Level App",
    description: "Tracks XP, posts level-up messages, awards roles based on activity.",
    icon: "⚡",
    commands: ["/rank", "/leaderboard", "/give-xp"],
  },
  {
    key: "bloxmod",
    name: "Bloxmod",
    description: "Auto-moderation: filters spam, bad words, and warns repeat offenders.",
    icon: "🛡️",
    commands: ["/warn", "/mute", "/clear", "/lock"],
  },
];

const BAD_WORDS = ["spam", "noob123badword"];

export function bloxmodScan(text: string): string | null {
  const lower = text.toLowerCase();
  for (const w of BAD_WORDS) if (lower.includes(w)) return `Message blocked by Bloxmod (matched "${w}")`;
  if (text.length > 500 && /(.)\1{20,}/.test(text)) return "Message blocked by Bloxmod (spam pattern)";
  return null;
}

export function levelAppXp(messageLength: number): number {
  return Math.min(5, Math.max(1, Math.floor(messageLength / 20) + 1));
}
