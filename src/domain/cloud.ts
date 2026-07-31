import type { AppState } from "./storage";

export interface InitialStateResolution {
  state: AppState;
  source: "guest" | "account" | "cloud";
  shouldUpload: boolean;
}

function isAfter(candidate?: string | null, reference?: string | null) {
  if (!candidate) return false;
  const candidateTime = Date.parse(candidate);
  if (!Number.isFinite(candidateTime)) return false;
  if (!reference) return true;
  const referenceTime = Date.parse(reference);
  return Number.isFinite(candidateTime) && Number.isFinite(referenceTime) && candidateTime > referenceTime;
}

export function resolveInitialState({
  guestState,
  accountState,
  accountSavedAt,
  cloudState,
  cloudUpdatedAt,
}: {
  guestState: AppState;
  accountState: AppState | null;
  accountSavedAt: string | null;
  cloudState: AppState | null;
  cloudUpdatedAt: string | null;
}): InitialStateResolution {
  if (cloudState) {
    const localState = accountState ?? guestState;
    const mergedRecords = { ...cloudState.records };
    let localRecordWon = false;
    const dateKeys = new Set([...Object.keys(localState.records), ...Object.keys(cloudState.records)]);
    for (const dateKey of dateKeys) {
      const localRecord = localState.records[dateKey];
      const cloudRecord = cloudState.records[dateKey];
      if (!localRecord) continue;
      if (!cloudRecord || isAfter(localRecord.updatedAt, cloudRecord.updatedAt)) {
        mergedRecords[dateKey] = localRecord;
        localRecordWon = true;
      }
    }
    const localPlanWon = isAfter(localState.weeklyPlanUpdatedAt, cloudState.weeklyPlanUpdatedAt);
    const mergedState: AppState = {
      ...cloudState,
      records: mergedRecords,
      weeklyPlan: localPlanWon ? localState.weeklyPlan : cloudState.weeklyPlan,
      weeklyPlanUpdatedAt: localPlanWon ? localState.weeklyPlanUpdatedAt : cloudState.weeklyPlanUpdatedAt,
    };
    return { state: mergedState, source: "cloud", shouldUpload: localRecordWon || localPlanWon };
  }
  if (accountState) return { state: accountState, source: "account", shouldUpload: true };
  return { state: guestState, source: "guest", shouldUpload: true };
}
