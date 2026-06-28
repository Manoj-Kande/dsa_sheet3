export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  condition: (stats: BadgeStats) => boolean;
}

export interface BadgeStats {
  totalSolved: number;
  currentStreak: number;
  longestStreak: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  topicsCompleted: number; // topics where solved === total
}

export const BADGES: Badge[] = [
  { id: "first-blood", title: "First Blood", description: "Solve your first problem", icon: "🎯", color: "text-emerald-400", condition: s => s.totalSolved >= 1 },
  { id: "getting-started", title: "Getting Started", description: "Solve 10 problems", icon: "🚀", color: "text-blue-400", condition: s => s.totalSolved >= 10 },
  { id: "momentum", title: "Momentum", description: "Solve 25 problems", icon: "⚡", color: "text-yellow-400", condition: s => s.totalSolved >= 25 },
  { id: "grinder", title: "Grinder", description: "Solve 50 problems", icon: "💪", color: "text-orange-400", condition: s => s.totalSolved >= 50 },
  { id: "centurion", title: "Centurion", description: "Solve 100 problems", icon: "🏆", color: "text-accent", condition: s => s.totalSolved >= 100 },
  { id: "legend", title: "Legend", description: "Solve 200 problems", icon: "👑", color: "text-violet-400", condition: s => s.totalSolved >= 200 },
  { id: "streak-3", title: "On Fire", description: "3 day streak", icon: "🔥", color: "text-orange-400", condition: s => s.currentStreak >= 3 },
  { id: "streak-7", title: "Week Warrior", description: "7 day streak", icon: "📅", color: "text-blue-400", condition: s => s.currentStreak >= 7 },
  { id: "streak-30", title: "Unstoppable", description: "30 day streak", icon: "⚡", color: "text-accent", condition: s => s.currentStreak >= 30 },
  { id: "easy-master", title: "Easy Master", description: "Solve 20 easy problems", icon: "🌱", color: "text-emerald-400", condition: s => s.easySolved >= 20 },
  { id: "medium-master", title: "Medium Master", description: "Solve 20 medium problems", icon: "🌿", color: "text-yellow-400", condition: s => s.mediumSolved >= 20 },
  { id: "hard-master", title: "Hard Hitter", description: "Solve 10 hard problems", icon: "🔥", color: "text-red-400", condition: s => s.hardSolved >= 10 },
  { id: "topic-master", title: "Topic Master", description: "Complete an entire topic", icon: "🎓", color: "text-violet-400", condition: s => s.topicsCompleted >= 1 },
  { id: "all-rounder", title: "All Rounder", description: "Complete 3 topics", icon: "🌟", color: "text-accent", condition: s => s.topicsCompleted >= 3 },
];

export function computeBadges(stats: BadgeStats) {
  return BADGES.map(b => ({ ...b, earned: b.condition(stats) }));
}
