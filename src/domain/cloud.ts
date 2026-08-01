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
  return Number.isFinite(referenceTime) && candidateTime > referenceTime;
}

type RecordCandidate =
  | { kind: "record"; value: AppState["records"][string]; updatedAt?: string }
  | { kind: "deleted"; updatedAt: string };

function getCandidate(state: AppState, dateKey: string): RecordCandidate | null {
  const record = state.records[dateKey];
  const deletedAt = state.deletedRecordUpdatedAt?.[dateKey];
  if (record && deletedAt && isAfter(deletedAt, record.updatedAt)) return { kind: "deleted", updatedAt: deletedAt };
  if (record) return { kind: "record", value: record, updatedAt: record.updatedAt };
  if (deletedAt) return { kind: "deleted", updatedAt: deletedAt };
  return null;
}

function mergeFavorites(localState: AppState, cloudState: AppState) {
  const merged = new Set<string>();
  const mergedUpdatedAt = { ...(cloudState.favoriteDrillUpdatedAt ?? {}) };
  let localWon = false;
  const ids = new Set([
    ...localState.favoriteDrillIds,
    ...cloudState.favoriteDrillIds,
    ...Object.keys(localState.favoriteDrillUpdatedAt ?? {}),
    ...Object.keys(cloudState.favoriteDrillUpdatedAt ?? {}),
  ]);
  for (const id of ids) {
    const localHas = localState.favoriteDrillIds.includes(id);
    const cloudHas = cloudState.favoriteDrillIds.includes(id);
    const localAt = localState.favoriteDrillUpdatedAt?.[id];
    const cloudAt = cloudState.favoriteDrillUpdatedAt?.[id];
    const localIsNewer = Boolean(localAt) && isAfter(localAt, cloudAt);
    const cloudIsNewer = Boolean(cloudAt) && isAfter(cloudAt, localAt);
    const shouldInclude = localIsNewer ? localHas : cloudIsNewer ? cloudHas : localHas || cloudHas;
    if (shouldInclude) merged.add(id);
    if (localAt && (!cloudAt || isAfter(localAt, cloudAt))) mergedUpdatedAt[id] = localAt;
    if (localIsNewer) localWon = true;
  }
  return {
    favoriteDrillIds: [...merged],
    favoriteDrillUpdatedAt: Object.keys(mergedUpdatedAt).length > 0 ? mergedUpdatedAt : undefined,
    localWon,
  };
}

function mergeCustomDrills(localState: AppState, cloudState: AppState) {
  const localDrills = new Map((localState.customDrills ?? []).map((drill) => [drill.id, drill]));
  const cloudDrills = new Map((cloudState.customDrills ?? []).map((drill) => [drill.id, drill]));
  const merged = new Map(cloudDrills);
  const mergedUpdatedAt = { ...(cloudState.customDrillUpdatedAt ?? {}) };
  let localWon = false;
  const ids = new Set([...localDrills.keys(), ...cloudDrills.keys()]);
  for (const id of ids) {
    const localDrill = localDrills.get(id);
    const cloudDrill = cloudDrills.get(id);
    const localAt = localState.customDrillUpdatedAt?.[id];
    const cloudAt = cloudState.customDrillUpdatedAt?.[id];
    if (localDrill && !cloudDrill) {
      merged.set(id, localDrill);
      localWon = true;
    } else if (localDrill && localAt && isAfter(localAt, cloudAt)) {
      merged.set(id, localDrill);
      localWon = true;
    }
    if (localAt && (!cloudAt || isAfter(localAt, cloudAt))) mergedUpdatedAt[id] = localAt;
  }
  return {
    customDrills: [...merged.values()],
    customDrillUpdatedAt: Object.keys(mergedUpdatedAt).length > 0 ? mergedUpdatedAt : undefined,
    localWon,
  };
}

export function mergeStateWithCloud(localState: AppState, cloudState: AppState): { state: AppState; localWon: boolean } {
  const mergedRecords = { ...cloudState.records };
  const mergedDeleted = { ...(cloudState.deletedRecordUpdatedAt ?? {}) };
  let localWon = false;
  const dateKeys = new Set([
    ...Object.keys(localState.records),
    ...Object.keys(cloudState.records),
    ...Object.keys(localState.deletedRecordUpdatedAt ?? {}),
    ...Object.keys(cloudState.deletedRecordUpdatedAt ?? {}),
  ]);
  for (const dateKey of dateKeys) {
    const localCandidate = getCandidate(localState, dateKey);
    const cloudCandidate = getCandidate(cloudState, dateKey);
    if (!localCandidate) continue;
    if (!cloudCandidate || isAfter(localCandidate.updatedAt, cloudCandidate.updatedAt)) {
      localWon = true;
      if (localCandidate.kind === "deleted") {
        delete mergedRecords[dateKey];
        mergedDeleted[dateKey] = localCandidate.updatedAt;
      } else {
        mergedRecords[dateKey] = localCandidate.value;
        delete mergedDeleted[dateKey];
      }
    } else if (cloudCandidate.kind === "deleted") {
      delete mergedRecords[dateKey];
      mergedDeleted[dateKey] = cloudCandidate.updatedAt;
    } else {
      delete mergedDeleted[dateKey];
    }
  }
  const localPlanWon = isAfter(localState.weeklyPlanUpdatedAt, cloudState.weeklyPlanUpdatedAt);
  const favorites = mergeFavorites(localState, cloudState);
  const customDrills = mergeCustomDrills(localState, cloudState);
  const mergedState: AppState = {
    ...cloudState,
    records: mergedRecords,
    deletedRecordUpdatedAt: Object.keys(mergedDeleted).length > 0 ? mergedDeleted : undefined,
    favoriteDrillIds: favorites.favoriteDrillIds,
    favoriteDrillUpdatedAt: favorites.favoriteDrillUpdatedAt,
    customDrills: customDrills.customDrills,
    customDrillUpdatedAt: customDrills.customDrillUpdatedAt,
    weeklyPlan: localPlanWon ? localState.weeklyPlan : cloudState.weeklyPlan,
    weeklyPlanUpdatedAt: localPlanWon ? localState.weeklyPlanUpdatedAt : cloudState.weeklyPlanUpdatedAt,
  };
  return {
    state: mergedState,
    localWon: localWon || localPlanWon || favorites.localWon || customDrills.localWon,
  };
}

export function resolveInitialState({
  guestState,
  accountState,
  accountSavedAt: _accountSavedAt,
  cloudState,
  cloudUpdatedAt: _cloudUpdatedAt,
}: {
  guestState: AppState;
  accountState: AppState | null;
  accountSavedAt: string | null;
  cloudState: AppState | null;
  cloudUpdatedAt: string | null;
}): InitialStateResolution {
  if (cloudState) {
    const merged = mergeStateWithCloud(accountState ?? guestState, cloudState);
    return { state: merged.state, source: "cloud", shouldUpload: merged.localWon };
  }
  if (accountState) return { state: accountState, source: "account", shouldUpload: true };
  return { state: guestState, source: "guest", shouldUpload: true };
}


export interface RevisionedCloudState {
  state: AppState;
  revision: number | null;
}

export function mergeForRevisionedSave(localState: AppState, cloud: RevisionedCloudState | null) {
  if (!cloud) return { state: localState, expectedRevision: null };
  return { state: mergeStateWithCloud(localState, cloud.state).state, expectedRevision: cloud.revision };
}
