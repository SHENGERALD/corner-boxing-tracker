import type { AppState } from "./storage";

export interface InitialStateResolution {
  state: AppState;
  source: "guest" | "account" | "cloud";
  shouldUpload: boolean;
}

function isAfter(candidate?: string | null, reference?: string | null) {
  if (!candidate || !reference) return false;
  const candidateTime = Date.parse(candidate);
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
  if (cloudState && accountState && isAfter(accountSavedAt, cloudUpdatedAt)) {
    return { state: accountState, source: "account", shouldUpload: true };
  }
  if (cloudState) return { state: cloudState, source: "cloud", shouldUpload: false };
  if (accountState) return { state: accountState, source: "account", shouldUpload: true };
  return { state: guestState, source: "guest", shouldUpload: true };
}
