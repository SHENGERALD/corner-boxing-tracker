function movementName(record) {
  return String(record?.name?.en ?? record?.name ?? "").toLocaleLowerCase();
}

export function getCableRecords(records) {
  return records.filter((record) => record.equipment === "cable");
}

export function inferCableFamilyId(record) {
  if (record?.equipment !== "cable") return undefined;
  const name = movementName(record);
  const category = record.category;

  if (/neck extension/.test(name)) return "cable-neck-extension";
  if (/bayesian/.test(name)) return "cable-curl-bayesian";
  if (/hammer.?curl/.test(name)) return "cable-curl-hammer";
  if (/wrist curl/.test(name)) return "cable-wrist-curl";
  if (/concentration curl|one.arm.*curl/.test(name)) return "cable-curl-single-arm";
  if (/curl/.test(name)) {
    return /bar|ez|overhand/.test(name) ? "cable-curl-bar" : "cable-curl";
  }

  if (/kickback/.test(name)) return "cable-triceps-kickback";
  if (/overhead.*tricep/.test(name)) return "cable-triceps-overhead";
  if (/cross.*tricep|internal rotation/.test(name)) return "cable-triceps-cross-extension";
  if (/single.arm.*pushdown|one arm triceps extension/.test(name)) return "cable-pushdown-single-arm";
  if (/rope.*pushdown/.test(name)) return "cable-pushdown-rope";
  if (/pushdown|triceps press|triceps extension/.test(name)) return "cable-pushdown-bar";

  if (/woodchop|trunk rotation|pallof/.test(name)) return "cable-core-rotation";
  if (/crunch/.test(name)) return "cable-crunch";
  if (/glute extension/.test(name)) return "cable-glute-extension";
  if (/pull through/.test(name)) return "cable-pull-through";
  if (/adduction/.test(name)) return "cable-hip-adduction";
  if (/leg flexion/.test(name)) return "cable-leg-curl";

  if (/external rotation|internal rotation/.test(name)) return "cable-shoulder-rotation";
  if (/face.?pull/.test(name)) return "cable-face-pull";
  if (/shrug/.test(name)) return "cable-shrug";
  if (/y.raise|y.pull/.test(name)) return "cable-y-raise";
  if (/front raise/.test(name)) return "cable-front-raise";
  if (/lateral raise/.test(name)) return "cable-lateral-raise";
  if (/rear.?delt fly|reverse.*fly|bent over cable fly/.test(name)) return "cable-rear-delt-fly";

  if (/chest press|press around/.test(name)) return "cable-chest-press";
  if (/cross.over/.test(name)) {
    return /low/.test(name) ? "cable-chest-fly-low" : "cable-chest-crossover";
  }
  if (/fly/.test(name)) {
    if (/upper|high/.test(name)) return "cable-chest-fly-high";
    if (/lower|low pulley/.test(name)) return "cable-chest-fly-low";
    return "cable-chest-fly-mid";
  }
  if (/hercules pillars/.test(name)) return "cable-chest-fly-mid";

  if (/straight.arm|pullover|pullback|mentzer pulldown/.test(name)) return "cable-straight-arm-pulldown";
  if (/pulldown|pull down|jal[oó]n/.test(name)) {
    if (/single|one.arm|1.arm|cross body|unilateral/.test(name)) return "cable-pulldown-single-arm";
    if (/wide|ancho/.test(name)) return "cable-pulldown-wide";
    return "cable-pulldown-neutral";
  }
  if (/row|remo|long.pulley/.test(name)) {
    if (/high|alto/.test(name)) return "cable-row-high";
    if (/single|one arm|unilateral|shotgun|lateral rows/.test(name)) return "cable-row-single-arm";
    return "cable-row-seated";
  }

  if (category === "chest") return "cable-chest-fly-mid";
  return undefined;
}

export function validateCableFamilyAssignments(records, families) {
  const familyIds = new Set(families.map((family) => family.id));
  const cableRecords = getCableRecords(records);
  const missingFamily = [];
  const genericFallback = [];
  const invalidFamily = [];
  const duplicateFamilyViolations = [];
  const seen = new Map();

  for (const record of cableRecords) {
    if (!record.mediaFamilyId) missingFamily.push(record.id);
    else if (!familyIds.has(record.mediaFamilyId)) invalidFamily.push(record.id);
    if (/\/assets\/strength\/generated\//.test(String(record.imageUrl ?? ""))) {
      genericFallback.push(record.id);
    }
    if (seen.has(record.id) && seen.get(record.id) !== record.mediaFamilyId) {
      duplicateFamilyViolations.push(record.id);
    }
    seen.set(record.id, record.mediaFamilyId);
  }

  return { missingFamily, genericFallback, invalidFamily, duplicateFamilyViolations };
}
