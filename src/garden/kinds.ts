import type { Active } from "../shared/daynight";
import type { GuideEntry } from "../shared/guide";
import { FLOWER_TYPES, type FlowerType } from "./layout";
import type { ThemeConfig } from "./theme";

/** What the garden guide says about each flower and creature, and when each is out (day, night or both). */
export type FlowerInfo = { name: string; sci: string; text: string; height: string; grows: string; active: Active; weight: number };
export type CreatureInfo = { name: string; sci: string; text: string; size: string; lives: string; eats: string; active: Active };

const COMMON = 10, UNCOMMON = 6, RARE = 3, LEGENDARY = 1;
export const rarityOf = (weight: number): string => (weight >= 10 ? "Common" : weight >= 6 ? "Uncommon" : weight >= 3 ? "Rare" : "Legendary");

export const FLOWER_INFO: Record<FlowerType, FlowerInfo> = {
  daisy: { name: "Daisy", sci: "Bellis perennis", text: "A daisy is really many tiny flowers in one: the yellow middle and every petal around it are separate little flowers.", height: "Usually 10 to 20 cm", grows: "Lawns and meadows", active: "day", weight: COMMON },
  sunflower: { name: "Sunflower", sci: "Helianthus annuus", text: "Young sunflowers turn their heads to follow the sun across the sky. Birds love the seeds.", height: "1.5 to 3 meters", grows: "Open, sunny fields", active: "day", weight: COMMON },
  tulip: { name: "Tulip", sci: "Tulipa gesneriana", text: "Tulips grow from bulbs and bloom in spring. Their petals open in warm light and close up as it cools.", height: "20 to 60 cm", grows: "Gardens and fields", active: "day", weight: COMMON },
  bell: { name: "Bluebell", sci: "Hyacinthoides non-scripta", text: "Bluebells carpet woodlands in spring, and their drooping bells all hang to one side of the stem.", height: "20 to 50 cm", grows: "Woodlands", active: "day", weight: UNCOMMON },
  poppy: { name: "Poppy", sci: "Papaver rhoeas", text: "Poppy seeds can sleep in the soil for many years, and sprout when the ground is dug up.", height: "30 to 60 cm", grows: "Fields and roadsides", active: "day", weight: COMMON },
  daffodil: { name: "Daffodil", sci: "Narcissus pseudonarcissus", text: "Daffodils grow from bulbs and are among the first flowers of spring. Animals avoid eating them because the sap tastes bad and is poisonous.", height: "30 to 50 cm", grows: "Meadows and gardens", active: "day", weight: COMMON },
  cosmos: { name: "Cosmos", sci: "Cosmos bipinnatus", text: "Cosmos flowers come from Mexico. Their name comes from a Greek word meaning an orderly, beautiful universe.", height: "0.5 to 1.5 meters", grows: "Sunny gardens and meadows", active: "day", weight: COMMON },
  lavender: { name: "Lavender", sci: "Lavandula angustifolia", text: "Lavender's tiny flowers make a sweet scent that bees love.", height: "30 to 60 cm", grows: "Dry, sunny hillsides", active: "day", weight: UNCOMMON },
  rose: { name: "Rose", sci: "Genus Rosa", text: "Roses have sharp prickles to protect them. When the flower fades, it leaves behind a red fruit called a rose hip.", height: "30 cm to several meters, depending on the kind", grows: "Gardens and hedges", active: "day", weight: RARE },
  iris: { name: "Iris", sci: "Genus Iris", text: "The iris is named for the Greek goddess of the rainbow, because its flowers come in so many colors.", height: "20 to 100 cm", grows: "Gardens and damp meadows", active: "day", weight: UNCOMMON },
  moonflower: { name: "Moonflower", sci: "Ipomoea alba", text: "A moonflower opens in the evening and gives off a sweet scent that draws night-flying moths.", height: "Vines several meters long", grows: "Warm gardens and fences", active: "night", weight: RARE },
  eveningprimrose: { name: "Evening primrose", sci: "Oenothera biennis", text: "An evening primrose opens its petals at dusk, so fast that you can watch it happen.", height: "0.5 to 1.5 meters", grows: "Meadows and roadsides", active: "night", weight: UNCOMMON },
  nightjasmine: { name: "Night-blooming jasmine", sci: "Cestrum nocturnum", text: "This plant saves its strong perfume for after dark, when moths come to visit.", height: "2 to 4 meters", grows: "Warm gardens", active: "night", weight: RARE },
  cereus: { name: "Queen of the night", sci: "Epiphyllum oxypetalum", text: "This cactus is famous for a huge, white flower that often opens for just one night and has faded by morning.", height: "A sprawling plant up to about 3 meters", grows: "Warm, shady places", active: "night", weight: LEGENDARY },
};

export const CREATURE_INFO: Record<string, CreatureInfo> = {
  ladybug: { name: "Ladybug", sci: "Family Coccinellidae", text: "A ladybug eats aphids, which makes gardeners glad to see one.", size: "4 to 10 mm", lives: "Gardens and meadows", eats: "Aphids and other small insects", active: "day" },
  butterfly: { name: "Butterfly", sci: "Order Lepidoptera", text: "A butterfly tastes with its feet and drinks nectar through a long, curled tongue.", size: "Wingspan 3 to 10 cm", lives: "Meadows and gardens", eats: "Nectar", active: "day" },
  bee: { name: "Honey bee", sci: "Apis mellifera", text: "A honey bee visits many flowers each day, carrying pollen from bloom to bloom.", size: "About 1.2 cm", lives: "Hives, in meadows and gardens", eats: "Nectar and pollen", active: "day" },
  hummingbird: { name: "Hummingbird", sci: "Family Trochilidae", text: "A hummingbird can hover in place by beating its wings many times a second.", size: "7 to 13 cm", lives: "Gardens and forests in the Americas", eats: "Nectar and small insects", active: "day" },
  caterpillar: { name: "Caterpillar", sci: "Young of butterflies and moths", text: "A caterpillar eats leaves almost nonstop. Then it wraps itself up and changes into a butterfly or a moth.", size: "1 to 10 cm", lives: "On leaves and stems", eats: "Leaves", active: "both" },
  snail: { name: "Garden snail", sci: "Cornu aspersum", text: "A garden snail carries its shell home and slides along on a trail of slime. It pulls inside to stay damp.", size: "Shell about 3 to 4 cm", lives: "Gardens and hedges", eats: "Leaves and soft plants", active: "both" },
  robin: { name: "American robin", sci: "Turdus migratorius", text: "A robin hops across lawns, listening and watching for worms.", size: "About 25 cm", lives: "Lawns, gardens and woods", eats: "Worms, insects and berries", active: "day" },
  dragonfly: { name: "Dragonfly", sci: "Suborder Anisoptera", text: "A dragonfly can fly in any direction, even backward, and its huge eyes help it spot a meal.", size: "5 to 10 cm", lives: "Near ponds and streams", eats: "Mosquitoes and other small insects", active: "day" },
  rabbit: { name: "Eastern cottontail", sci: "Sylvilagus floridanus", text: "A rabbit's long ears turn like little dishes to catch faint sounds. It is most active at dawn and dusk.", size: "About 40 cm", lives: "Meadows and gardens", eats: "Grasses, clover and plants", active: "both" },
  bluebird: { name: "Eastern bluebird", sci: "Sialia sialis", text: "Bluebirds eat insects and nest in small holes in trees and fence posts.", size: "About 17 cm", lives: "Open fields with a few trees", eats: "Insects and berries", active: "day" },
  firefly: { name: "Firefly", sci: "Family Lampyridae", text: "Fireflies make their own light, and their flashes help them find each other at night.", size: "1 to 2 cm", lives: "Warm meadows and woods", eats: "Many eat little as adults. The young eat snails and worms.", active: "night" },
  moth: { name: "Moth", sci: "Order Lepidoptera", text: "Many moths fly at night, drinking nectar from flowers that open after dark.", size: "Wingspan 1 to 10 cm", lives: "Gardens, fields and forests", eats: "Nectar", active: "night" },
  frog: { name: "Green frog", sci: "Lithobates clamitans", text: "A frog breathes partly through its skin and catches insects with its sticky tongue.", size: "6 to 9 cm", lives: "Ponds and damp gardens", eats: "Insects and worms", active: "night" },
  hedgehog: { name: "European hedgehog", sci: "Erinaceus europaeus", text: "A hedgehog rolls into a prickly ball when it feels threatened, and it hunts for insects at night.", size: "20 to 30 cm", lives: "Gardens, hedges and woods", eats: "Insects, worms and slugs", active: "night" },
  bat: { name: "Little brown bat", sci: "Myotis lucifugus", text: "Bats find insects in the dark by sending out squeaks and listening for the echoes.", size: "Wingspan about 25 cm", lives: "Woods, meadows and barns", eats: "Insects", active: "night" },
  owl: { name: "Great horned owl", sci: "Bubo virginianus", text: "An owl's soft feathers let it fly almost silently, and its big eyes work well in the dark.", size: "45 to 60 cm", lives: "Woods and open country", eats: "Mice, rabbits and birds", active: "night" },
};

/** Kinds that give off their own light at night. */
export const GLOW_CREATURES = new Set(["firefly"]);

export const activeOfFlower = (t: FlowerType): Active => FLOWER_INFO[t].active;
export const activeOfCreature = (kind: string): Active => CREATURE_INFO[kind]?.active ?? "both";

// ---- picking the flowers for a garden -------------------------------------------------------------
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hash = (s: string): number => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

/** The 12 flowers for a garden's 12 spots. The same garden always gets the same flowers, different gardens get different mixes,
 *  and rarer flowers turn up less often. Each kind appears at most once, and there are always some that open by day and some at night. */
export function chooseFlowers(seed: string, spots = 12): FlowerType[] {
  const rnd = mulberry32(hash(seed));
  const pool = FLOWER_TYPES.map((t) => ({ t, w: FLOWER_INFO[t].weight }));
  const picked: FlowerType[] = [];
  while (picked.length < spots && pool.length) {
    let roll = rnd() * pool.reduce((n, p) => n + p.w, 0);
    let i = 0;
    for (; i < pool.length - 1; i++) { roll -= pool[i]!.w; if (roll <= 0) break; }
    picked.push(pool.splice(i, 1)[0]!.t);
  }
  // shuffle which spot gets which
  for (let i = picked.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [picked[i], picked[j]] = [picked[j]!, picked[i]!]; }
  return picked;
}

// ---- guide entries ---------------------------------------------------------------------------------
export function gardenEntries(theme: ThemeConfig): GuideEntry[] {
  const flowers: GuideEntry[] = FLOWER_TYPES.map((t) => {
    const f = FLOWER_INFO[t];
    return { id: `flower:${t}`, order: 1000 + f.weight * 10, rarity: rarityOf(f.weight), name: f.name, sci: f.sci, text: f.text, active: f.active,
      facts: [["Height", f.height], ["Grows in", f.grows], ["Opens", f.active === "night" ? "At night" : "By day"]] };
  });
  const creatures: GuideEntry[] = theme.creatures.map((c) => {
    const f = CREATURE_INFO[c.kind]!;
    return { id: `creature:${c.kind}`, order: 500 - c.percent, rarity: `Arrives at ${c.percent}%`, name: f.name, sci: f.sci, text: f.text, active: f.active,
      facts: [["Size", f.size], ["Lives in", f.lives], ["Eats", f.eats], ["Arrives", `When the class is ${c.percent} percent of the way to its goal`]] };
  });
  return [...flowers, ...creatures];
}
