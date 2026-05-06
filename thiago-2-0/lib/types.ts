export interface Profile {
  id: string;
  display_name: string | null;
  start_date: string;
  current_weight: number;
  current_hba1c: number;
  total_xp: number;
  streak: number;
  last_streak_date: string | null;
  push_subscription: PushSubscriptionJSON | null;
  created_at: string;
}

export interface DailyQuestRow {
  id: string;
  user_id: string;
  date: string;
  quest_id: string;
  completed_at: string;
}

export interface GlucoseReading {
  id: string;
  user_id: string;
  value: number;
  context: string;
  reading_date: string;
  reading_time: string;
  created_at: string;
}

export interface WeightLogRow {
  id: string;
  user_id: string;
  weight: number;
  date: string;
}

export interface AchievementRow {
  id: string;
  user_id: string;
  milestone_id: string;
  achieved_at: string;
}

export interface ReminderRow {
  id: string;
  user_id: string;
  reminder_type: string;
  hour: number;
  minute: number;
  enabled: boolean;
}
