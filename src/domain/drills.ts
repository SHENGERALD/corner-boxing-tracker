import type { LocalizedLabel, TrainingUnit } from "./types";
import { strengthLibrary } from "./strengthData";

export type TrainingDomain = "boxing" | "strength";
export type DrillCategory = "fundamentals" | "footwork" | "offense" | "defense" | "equipment" | "conditioning" | "chest" | "back" | "legs" | "shoulders" | "arms" | "core" | "calves" | "cardio";
export type EquipmentType = "barbell" | "dumbbell" | "kettlebell" | "cable" | "hammer" | "machine" | "bodyweight";
export interface Drill { id: string; domain: TrainingDomain; category: DrillCategory; name: LocalizedLabel; cue: LocalizedLabel; defaultUnit: TrainingUnit; defaultQuantity: number; imageUrl?: string; imagePosition?: string; imageSource?: string; equipment?: EquipmentType; searchTerms?: string[]; }
const d = (id: string, category: DrillCategory, zhTW: string, en: string, cueZh: string, cueEn: string, defaultUnit: TrainingUnit = "rounds", defaultQuantity = 3, domain: TrainingDomain = "boxing"): Drill => ({ id, domain, category, name: { zhTW, en }, cue: { zhTW: cueZh, en: cueEn }, defaultUnit, defaultQuantity });
const s = (id: string, category: DrillCategory, zhTW: string, en: string, cueZh: string, cueEn: string, imageUrl: string, defaultUnit: TrainingUnit = "rounds", defaultQuantity = 3): Drill => ({ ...d(id, category, zhTW, en, cueZh, cueEn, defaultUnit, defaultQuantity, "strength"), imageUrl, imageSource: "wger" });
export const drillCategories: DrillCategory[] = ["fundamentals", "footwork", "offense", "defense", "equipment", "conditioning", "chest", "back", "legs", "shoulders", "arms", "core", "calves", "cardio"];
const strengthExpansion: Drill[] = [
 s("dumbbell-bench-press", "chest", "啞鈴臥推", "Dumbbell Bench Press", "肩胛穩定，啞鈴沿胸口兩側下放", "Set the shoulders and lower beside the chest", "https://wger.de/media/exercise-images/97/Dumbbell-bench-press-1.png"),
 s("incline-barbell-press", "chest", "上斜槓鈴臥推", "Incline Barbell Press", "肩胛後收，槓鈴下放到上胸", "Keep the shoulders set and lower to the upper chest", "https://wger.de/media/exercise-images/41/Incline-bench-press-1.png"),
 s("chest-press-machine", "chest", "機械胸推", "Machine Chest Press", "手腕直，推到接近伸直即可", "Keep wrists straight and press without locking out", "https://wger.de/media/exercise-images/129/b263c968-e067-4750-916a-d8758a7df23e.webp"),
 s("parallel-bar-dips", "chest", "雙槓撐體", "Parallel Bar Dips", "肩膀保持下沉，身體略向前", "Keep the shoulders down and lean slightly forward", "https://wger.de/media/exercise-images/194/34600351-8b0b-4cb0-8daa-583537be15b0.png"),
 s("deadlift", "back", "傳統硬舉", "Deadlift", "槓鈴貼腿，背部保持中立", "Keep the bar close and the spine neutral", "https://wger.de/media/exercise-images/184/1709c405-620a-4d07-9658-fade2b66a2df.jpeg"),
 s("pull-up", "back", "引體向上", "Pull-up", "先下壓肩胛，再用背部拉起", "Set the shoulders down before pulling with the back", "https://wger.de/media/exercise-images/475/b0554016-16fd-4dbe-be47-a2a17d16ae0e.jpg"),
 s("t-bar-row", "back", "T 槓划船", "T-Bar Row", "軀幹固定，手肘往後帶", "Brace the torso and drive the elbows back", "https://wger.de/media/exercise-images/106/T-bar-row-1.png"),
 s("one-arm-dumbbell-row", "back", "單臂啞鈴划船", "One-arm Dumbbell Row", "背部平穩，啞鈴往髖部方向拉", "Keep the back steady and pull toward the hip", "https://wger.de/media/exercise-images/1186/1987a039-cf35-437e-bbdc-40c53dd7d053.jpg"),
 s("goblet-squat", "legs", "高腳杯深蹲", "Goblet Squat", "胸口抬起，膝蓋跟隨腳尖", "Keep the chest tall and knees tracking the toes", "https://wger.de/media/exercise-images/203/1c052351-2af0-4227-aeb0-244008e4b0a8.jpeg"),
 s("front-squat", "legs", "前蹲", "Front Squat", "手肘抬高，核心保持張力", "Keep the elbows high and brace the core", "https://wger.de/media/exercise-images/191/Front-squat-1-857x1024.png"),
 s("leg-press", "legs", "腿推", "Leg Press", "膝蓋朝腳尖方向，勿鎖死膝蓋", "Track the knees over the toes without locking out", "https://wger.de/media/exercise-images/371/d2136f96-3a43-4d4c-9944-1919c4ca1ce1.webp"),
 s("walking-lunge", "legs", "行走弓箭步", "Walking Lunge", "前腳踩穩，軀幹保持直立", "Plant the front foot and keep the torso tall", "https://wger.de/media/exercise-images/113/Walking-lunges-1.png"),
 s("dumbbell-hip-thrust", "legs", "啞鈴臀推", "Dumbbell Hip Thrust", "下巴微收，頂端收緊臀部", "Keep the chin tucked and squeeze the glutes at the top", "https://wger.de/media/exercise-images/1642/a81ad922-caf5-47f8-99b4-640cb0717436.webp"),
 s("dumbbell-shoulder-press", "shoulders", "啞鈴肩推", "Dumbbell Shoulder Press", "肋骨收好，啞鈴向上推直", "Keep the ribs down and press straight overhead", "https://wger.de/media/exercise-images/123/dumbbell-shoulder-press-large-1.png"),
 s("rear-delt-raise", "shoulders", "反向飛鳥", "Rear Delt Raise", "肩膀遠離耳朵，控制回程", "Keep the shoulders away from the ears and control the return", "https://wger.de/media/exercise-images/487/ad724e5c-b1ed-49e8-9279-a17545b0dd0b.png"),
 s("barbell-shrug", "shoulders", "槓鈴聳肩", "Barbell Shrug", "垂直聳肩，不要繞肩", "Lift straight up without rolling the shoulders", "https://wger.de/media/exercise-images/150/Barbell-shrugs-1.png"),
 s("barbell-curl", "arms", "槓鈴彎舉", "Barbell Curl", "手肘固定，避免身體後仰借力", "Keep the elbows fixed and avoid leaning back", "https://wger.de/media/exercise-images/74/Bicep-curls-1.png"),
 s("hammer-curl", "arms", "槌式彎舉", "Hammer Curl", "手腕保持中立，慢慢放下", "Keep a neutral wrist and lower under control", "https://wger.de/media/exercise-images/86/Bicep-hammer-curl-1.png"),
 s("triceps-pushdown", "arms", "繩索下壓", "Triceps Pushdown", "手肘貼近身體，底端伸直手臂", "Keep the elbows close and extend at the bottom", "https://wger.de/media/exercise-images/1185/c5ca283d-8958-4fd8-9d59-a3f52a3ac66b.jpg"),
 s("skullcrusher", "arms", "仰臥臂屈伸", "Skullcrusher", "上臂固定，前臂向額頭方向下放", "Keep the upper arms still and lower toward the forehead", "https://wger.de/media/exercise-images/84/Lying-close-grip-triceps-press-to-chin-1.png"),
 s("plank", "core", "棒式", "Plank", "臀部與肩膀保持同一直線", "Keep the hips and shoulders in one line", "https://wger.de/media/exercise-images/458/b7bd9c28-9f1d-4647-bd17-ab6a3adf5770.png", "minutes", 1),
 s("ab-rollout", "core", "滾腹輪", "Ab Rollout", "骨盆收好，伸展到能控制的位置", "Tuck the pelvis and extend only as far as you can control", "https://wger.de/media/exercise-images/41/34b37423-269f-43d4-9d29-d2a90eeaa6b4.png"),
 s("russian-twist", "core", "俄羅斯轉體", "Russian Twist", "胸口旋轉，避免只甩手臂", "Rotate through the torso instead of swinging the arms", "https://wger.de/media/exercise-images/1193/70ca5d80-3847-4a8c-8882-c6e9e485e29e.png"),
 s("bird-dog", "core", "鳥狗式", "Bird Dog", "骨盆保持穩定，慢慢伸展對側手腳", "Keep the hips square and extend the opposite limbs slowly", "https://wger.de/media/exercise-images/1572/3d14e761-a73d-49da-8804-f3016a7573ff.png"),
 s("standing-calf-raise", "calves", "站姿提踵", "Standing Calf Raise", "頂端停留，腳跟慢慢下放", "Pause at the top and lower the heels slowly", "https://wger.de/media/exercise-images/622/9a429bd0-afd3-4ad0-8043-e9beec901c81.jpeg"),
];

const legacyDrillLibrary: Drill[] = [
 d("stance","fundamentals","站架","Stance","重心在腳掌中心","Balance on mid-foot","minutes",5), d("guard","fundamentals","護手","Guard","下巴收、手回位","Chin tucked, hands return","minutes",5), d("skipping","fundamentals","跳繩","Skipping","輕快、穩定節奏","Light, steady rhythm","minutes",10), d("shadow","fundamentals","影子拳擊","Shadow Boxing","慢速且有目的","Slow and intentional"),
 d("step-forward","footwork","前進步法","Step Forward","前腳先、站架不變","Lead foot first"), d("step-back","footwork","後退步法","Step Back","後腳先、保持距離","Rear foot first"), d("lateral-slide","footwork","側移","Lateral Slide","腳不交叉、不併攏","Do not cross feet"), d("pivot","footwork","轉樞","Pivot","組合後轉出角度","Exit at an angle"),
 d("jab","offense","刺拳","Jab","直線出、直線回","Straight out, straight back"), d("cross","offense","直拳","Cross","後腳跟與髖帶動","Turn heel and hip"), d("hook","offense","勾拳","Hook","手肘與肩同高","Elbow level with shoulder"), d("uppercut","offense","上勾拳","Uppercut","微下沉再上頂","Dip then rise"), d("one-two","offense","1-2 組合","1-2 Combination","打完退一步","Step out after the combination"), d("one-two-three","offense","1-2-3 組合","1-2-3 Combination","出拳後保持護手","Guard after every shot"),
 d("high-guard","defense","高護手","High Guard","肘收、視線越過手套","Elbows in, eyes over gloves"), d("parry","defense","拍擋","Parry","小幅度帶開刺拳","Redirect, do not swat"), d("slip","defense","閃躲","Slip","靠腿和核心移動","Move with legs and core"), d("roll","defense","搖避","Roll","下沉穿過對手拳線","Dip under the punch line"), d("pull-back","defense","後撤","Pull Back","保有站架與回擊距離","Keep balance to return"),
 d("heavy-bag","equipment","沙包技術回合","Heavy Bag Technique","力量控制在六成","Keep power at sixty percent"), d("double-end","equipment","雙端球","Double-end Bag","先準確、再加速","Accuracy before speed"), d("speed-bag","equipment","速度球","Speed Bag","放鬆肩膀，維持穩定節奏","Relax shoulders, keep a steady rhythm"), d("slip-rope","equipment","繩下閃躲","Slip Rope","膝蓋下沉、不彎腰","Bend knees, not waist"), d("padwork","equipment","手靶","Padwork","帶著當日技術重點","Bring one technical focus"),
 d("core-circuit","conditioning","拳擊核心循環","Boxing Core Circuit","抗旋轉與傳力","Resist rotation and transfer force","minutes",10), d("zone-two","conditioning","Zone 2 跑","Zone 2 Run","能完整講一句話","Able to speak a full sentence","minutes",30), d("round-intervals","conditioning","回合跑","Round Intervals","跑三分、走一分","Run 3, walk 1","rounds",4), d("mobility","conditioning","收操伸展","Mobility Cooldown","肩、胸、髖活動度","Shoulders, chest, hips","minutes",10),
 d("bench-press","chest","槓鈴臥推","Barbell Bench Press","肩胛後收、雙腳穩定踩地","Set shoulders, feet planted","rounds",3,"strength"), d("incline-dumbbell-press","chest","上斜啞鈴臥推","Incline Dumbbell Press","手肘略低於肩線","Elbows slightly below shoulders","rounds",3,"strength"), d("cable-fly","chest","滑輪夾胸","Cable Fly","控制離心、胸肌收緊","Control the eccentric","rounds",3,"strength"),
 d("barbell-row","back","槓鈴划船","Barbell Row","軀幹固定、手肘往後帶","Brace torso, drive elbows back","rounds",3,"strength"), d("lat-pulldown","back","高位下拉","Lat Pulldown","胸口向上、拉向鎖骨","Chest up, pull to collarbone","rounds",3,"strength"), d("seated-row","back","坐姿划船","Seated Cable Row","肩膀放下再拉","Keep shoulders down","rounds",3,"strength"),
 d("back-squat","legs","槓鈴深蹲","Back Squat","膝蓋跟隨腳尖方向","Knees track toes","rounds",3,"strength"), d("romanian-deadlift","legs","羅馬尼亞硬舉","Romanian Deadlift","髖部後推、背保持中立","Hips back, neutral spine","rounds",3,"strength"), d("split-squat","legs","保加利亞分腿蹲","Bulgarian Split Squat","前腳踩穩、膝蓋穩定","Plant the lead foot","rounds",3,"strength"),
 d("overhead-press","shoulders","站姿肩推","Overhead Press","肋骨收好、推過頭頂","Ribs down, press overhead","rounds",3,"strength"), d("lateral-raise","shoulders","側平舉","Lateral Raise","輕重量控制高度","Use control over load","rounds",3,"strength"), d("face-pull","shoulders","面拉","Face Pull","拉向眉間、手肘外開","Pull to eyebrow level","rounds",3,"strength"),
 d("pallof-press","core","Pallof 抗旋轉推","Pallof Press","骨盆保持正、不要旋轉","Resist rotation","rounds",3,"strength"), d("dead-bug","core","死蟲式","Dead Bug","下背貼地、慢慢伸展","Low back stays down","rounds",3,"strength"), d("farmer-carry","core","農夫走路","Farmer Carry","握緊、軀幹直立","Grip tight, stand tall","minutes",3,"strength"),
 ...strengthExpansion,
];
const spritePosition = (index: number) => {
  const offset = ["0%", "33.333%", "66.667%", "100%"][index % 4];
  const row = ["0%", "33.333%", "66.667%", "100%"][Math.floor(index / 4)];
  return offset + " " + row;
};
const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
const boxingSpriteA = assetUrl("assets/boxing/boxing-sprite-a.png");
const boxingSpriteB = assetUrl("assets/boxing/boxing-sprite-b.png");
const boxingSpriteMap: Record<string, { imageUrl: string; imagePosition: string }> = {
  stance: { imageUrl: boxingSpriteA, imagePosition: spritePosition(0) },
  guard: { imageUrl: boxingSpriteA, imagePosition: spritePosition(1) },
  jab: { imageUrl: boxingSpriteA, imagePosition: spritePosition(2) },
  cross: { imageUrl: boxingSpriteA, imagePosition: spritePosition(3) },
  hook: { imageUrl: boxingSpriteA, imagePosition: spritePosition(4) },
  uppercut: { imageUrl: boxingSpriteA, imagePosition: spritePosition(5) },
  "one-two": { imageUrl: boxingSpriteA, imagePosition: spritePosition(6) },
  "step-forward": { imageUrl: boxingSpriteA, imagePosition: spritePosition(7) },
  "step-back": { imageUrl: boxingSpriteA, imagePosition: spritePosition(8) },
  "lateral-slide": { imageUrl: boxingSpriteA, imagePosition: spritePosition(9) },
  pivot: { imageUrl: boxingSpriteA, imagePosition: spritePosition(10) },
  "high-guard": { imageUrl: assetUrl("assets/boxing/high-guard-reference.png"), imagePosition: "" },
  parry: { imageUrl: boxingSpriteA, imagePosition: spritePosition(12) },
  slip: { imageUrl: boxingSpriteA, imagePosition: spritePosition(13) },
  "heavy-bag": { imageUrl: boxingSpriteA, imagePosition: spritePosition(14) },
  "speed-bag": { imageUrl: boxingSpriteA, imagePosition: spritePosition(15) },
  "one-two-three": { imageUrl: boxingSpriteB, imagePosition: spritePosition(0) },
  "pull-back": { imageUrl: boxingSpriteB, imagePosition: spritePosition(1) },
  roll: { imageUrl: boxingSpriteB, imagePosition: spritePosition(2) },
  "slip-rope": { imageUrl: boxingSpriteB, imagePosition: spritePosition(3) },
  padwork: { imageUrl: boxingSpriteB, imagePosition: spritePosition(4) },
  "core-circuit": { imageUrl: boxingSpriteB, imagePosition: spritePosition(5) },
  "zone-two": { imageUrl: boxingSpriteB, imagePosition: spritePosition(6) },
  "round-intervals": { imageUrl: boxingSpriteB, imagePosition: spritePosition(7) },
  mobility: { imageUrl: boxingSpriteB, imagePosition: spritePosition(8) },
  skipping: { imageUrl: boxingSpriteB, imagePosition: spritePosition(9) },
  shadow: { imageUrl: boxingSpriteB, imagePosition: "calc(66.667% + 8px) 100%" },
  "double-end": { imageUrl: boxingSpriteB, imagePosition: "0% calc(100% + 8px)" },
};
const boxingDrillsWithImages = legacyDrillLibrary.map((drill) => {
  const sprite = boxingSpriteMap[drill.id];
  return sprite ? { ...drill, ...sprite, imageSource: "corner" } : drill;
});
export const drillLibrary: Drill[] = [...boxingDrillsWithImages.filter((drill) => drill.domain === "boxing"), ...strengthLibrary];
export function filterDrills(drills: Drill[], options: { query: string; domain: TrainingDomain; category: DrillCategory | "all"; equipment?: EquipmentType | "all"; favoriteIds: string[]; favoritesOnly: boolean }) { const q = options.query.toLowerCase().replace(/\s+/g, " ").trim(); return drills.filter((drill) => { const searchable = [drill.name.en, drill.name.zhTW, drill.category, drill.equipment ?? "", ...(drill.searchTerms ?? [])].join(" ").toLowerCase().replace(/\s+/g, " "); return drill.domain === options.domain && (options.category === "all" || drill.category === options.category) && (options.equipment === undefined || options.equipment === "all" || drill.equipment === options.equipment) && (!options.favoritesOnly || options.favoriteIds.includes(drill.id)) && (!q || searchable.includes(q)); }); }
