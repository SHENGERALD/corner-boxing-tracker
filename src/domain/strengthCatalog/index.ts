import { drillLibrary, type Drill } from "../drills";
import reviewedOverrides from "./reviewedOverrides.json";

export const strengthCategoryIds = [
  "chest",
  "back",
  "legs",
  "shoulders",
  "arms",
  "core",
  "calves",
  "mobility",
  "cardio",
] as const;

const categoryLoaders = {
  chest: () => import("./generated/chest").then((module) => module.records),
  back: () => import("./generated/back").then((module) => module.records),
  legs: () => import("./generated/legs").then((module) => module.records),
  shoulders: () => import("./generated/shoulders").then((module) => module.records),
  arms: () => import("./generated/arms").then((module) => module.records),
  core: () => import("./generated/core").then((module) => module.records),
  calves: () => import("./generated/calves").then((module) => module.records),
  mobility: () => import("./generated/mobility").then((module) => module.records),
  cardio: () => import("./generated/cardio").then((module) => module.records),
} as const;

function mergeWithoutDuplicateIds(drills: Drill[]) {
  const ids = new Set<string>();
  for (const drill of drills) {
    if (ids.has(drill.id)) throw new Error("Duplicate strength drill id: " + drill.id);
    ids.add(drill.id);
  }
  return drills;
}

export function applyReviewedOverrides(drills: Drill[]): Drill[] {
  return drills.map((drill) => {
    const override = reviewedOverrides[drill.id as keyof typeof reviewedOverrides] as Partial<Drill> | undefined;
    return override ? { ...drill, ...override } : drill;
  });
}

export async function loadStrengthLibrary(): Promise<Drill[]> {
  const generated = await Promise.all(
    strengthCategoryIds.map((category) => categoryLoaders[category]())
  );
  const baseline = drillLibrary.filter((drill) => drill.domain === "strength");
  const merged = applyReviewedOverrides([
    ...baseline,
    ...generated.flat() as Drill[],
  ]).map((drill) => drill.imageUrl?.startsWith("/")
    ? { ...drill, imageUrl: `${import.meta.env.BASE_URL}${drill.imageUrl.replace(/^\/+/, "")}` }
    : drill);
  return mergeWithoutDuplicateIds(merged);
}
