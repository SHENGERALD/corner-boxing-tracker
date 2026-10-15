import { supabase } from "./supabase";

export interface BasePlayer {
  user_id: string; display_name: string; opt_in: boolean;
  credits: number; energy: number; trophies: number; levels: number[];
}
export interface BaseBattle {
  won: boolean; power: number; defense: number; supply: number; trophies: number;
  attacker_name: string; defender_name: string; squad: number[]; defender_levels: number[];
}
export interface BaseDashboard {
  player: BasePlayer; today: string; can_claim: boolean; claimed_today: boolean;
  battle_position?: number | null;
  requests: { user_id: string; name: string }[];
  battles: { id: string; created_at: string; attacking: boolean; result: BaseBattle }[];
}
export interface BaseOpponent {
  user_id: string; display_name: string; levels: number[]; trophies: number;
  defense: number; reward: number; position: number; is_me: boolean;
  is_friend: boolean; requested: boolean; raided_today: boolean;
}
export type BaseAction = "profile" | "claim" | "upgrade" | "raid" | "friend_request" | "friend_accept" | "friend_remove";
export interface BaseRequest { action: BaseAction; id: string; args: Record<string, unknown> }
export interface BaseCommandResult { dashboard: BaseDashboard; battle: BaseBattle | null }

export class BaseApiError extends Error {
  constructor(message: string, readonly uncertain: boolean) { super(message); }
}
async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new BaseApiError("Cloud is not configured", false);
  const { data, error } = await supabase.rpc(name, args);
  if (error) {
    const message = error.code === "PGRST202" || error.code === "PGRST205" ? "base migration required" : error.message;
    throw new BaseApiError(message, !error.code || error.code.startsWith("08"));
  }
  if (data == null) throw new BaseApiError("empty server response", true);
  return data as T;
}
export const fetchBaseDashboard = () => rpc<BaseDashboard>("get_base_dashboard");
export const fetchBaseOpponents = (search = "", offset = 0, friendsOnly = false, power?: number) => rpc<BaseOpponent[]>("get_base_opponents", { p_search: search, p_offset: offset, p_friends_only: friendsOnly, ...(power === undefined ? {} : {p_power: power}) });
export const sendBaseCommand = (request: BaseRequest) => rpc<BaseCommandResult>("base_command", { p_action: request.action, p_request_id: request.id, p_args: request.args });

export function baseErrorText(error: unknown, zh: boolean): string {
  const message = error instanceof Error ? error.message : "";
  const messages: Record<string, [string,string]> = {
    "base migration required": ["基地功能尚未在伺服器啟用。", "The base feature has not been enabled on the server."],
    "Cloud is not configured": ["尚未設定雲端連線。", "Cloud connection is not configured."],
    "sync completed training first": ["請先完成並同步今天的訓練紀錄，再領取補給。", "Complete and sync today's training before claiming supply."],
    "battle participation required": ["請先開啟基地對戰。", "Enable base battles first."],
    "opponent unavailable": ["對手已退出對戰，請重新選擇。", "This opponent is no longer available."],
    "already raided today": ["今天已挑戰過此基地，請選擇其他對手。", "You already raided this base today."],
    "opponent outside strength range": ["戰力差距過大，請調整兵種或更換對手。", "Adjust your squad or choose an opponent closer to your power."],
    "insufficient energy": ["出征能量不足。", "Not enough raid energy."],
    "insufficient supply": ["升級所需補給不足。", "Not enough supply to upgrade."],
    "invalid profile": ["暱稱需為 2–20 個字，且不能包含控制字元。", "Nickname must contain 2–20 characters without control characters."],
    "invitation unavailable": ["邀請已取消，請重新整理名單。", "This invitation is no longer available."],
  };
  return messages[message]?.[zh ? 0 : 1] ?? (zh ? "連線或操作失敗，請重試。" : "Connection or operation failed. Please retry.");
}
