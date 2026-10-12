import { supabase } from "./supabase";

export interface LeaderboardProfile {
  display_name: string;
  opt_in: boolean;
}

export interface LeaderboardRow {
  week_start: string;
  position: number;
  display_name: string;
  points: number;
  training_days: number;
  is_me: boolean;
}

export async function fetchLeaderboard(userId: string): Promise<{ profile: LeaderboardProfile | null; rows: LeaderboardRow[] }> {
  if (!supabase) throw new Error("Cloud is not configured");
  const [profileResult, rankingResult] = await Promise.all([
    supabase.from("leaderboard_profiles").select("display_name, opt_in").eq("user_id", userId).maybeSingle(),
    supabase.rpc("get_weekly_leaderboard"),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (rankingResult.error) throw rankingResult.error;
  return {
    profile: profileResult.data as LeaderboardProfile | null,
    rows: (rankingResult.data ?? []) as LeaderboardRow[],
  };
}

export async function saveLeaderboardProfile(userId: string, displayName: string, optIn: boolean): Promise<void> {
  if (!supabase) throw new Error("Cloud is not configured");
  const { error } = await supabase.from("leaderboard_profiles").upsert({
    user_id: userId,
    display_name: displayName,
    opt_in: optIn,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) throw error;
}
