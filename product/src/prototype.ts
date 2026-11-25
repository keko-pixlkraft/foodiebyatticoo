export const nutritionFields = [
  { key: 'kcal', label: 'Energy', unit: 'kcal', max: 10000, step: 1 },
  { key: 'protein', label: 'Protein', unit: 'g', max: 1000, step: 0.1 },
  { key: 'carbs', label: 'Carbohydrates', unit: 'g', max: 1000, step: 0.1 },
  { key: 'fat', label: 'Fat', unit: 'g', max: 1000, step: 0.1 },
] as const;

type TranslatableDish = {
  id: string;
  name: string;
  translations?: Record<string, { name?: string; summary?: string }>;
};

// Upgrade former English placeholders while preserving restaurant-authored content.
export function refreshDefaultDishNames<T extends TranslatableDish>(dishes: T[], defaults: readonly TranslatableDish[]): T[] {
  const seeds = new Map(defaults.map(dish => [dish.id, dish]));
  return dishes.map(dish => {
    const seed = seeds.get(dish.id);
    if (!seed || dish.name !== seed.name) return dish;
    const translations = { ...dish.translations };
    for (const [language, translation] of Object.entries(seed.translations ?? {})) {
      const saved = translations[language];
      if (translation.name && (!saved?.name?.trim() || saved.name === seed.name)) {
        translations[language] = { ...translation, ...saved, name: translation.name };
      }
    }
    return { ...dish, translations };
  });
}

type Nutrient = (typeof nutritionFields)[number]['key'];
type Nutrition = Partial<Record<Nutrient, number>> & {
  serving?: string;
  source: 'sample' | 'entered';
};

export function parseNutrition(input: Partial<Record<Nutrient | 'serving' | 'source', string>>): Nutrition | null {
  const values: Partial<Record<Nutrient, number>> = {};
  for (const { key, max, step } of nutritionFields) {
    const raw = input[key]?.trim();
    if (!raw) continue;
    const number = Number(raw);
    const format = step === 1 ? /^\d+$/ : /^\d+(?:\.\d)?$/;
    if (!format.test(raw) || !Number.isFinite(number) || number > max) throw new RangeError(key);
    values[key] = number;
  }
  const serving = input.serving?.trim();
  if (serving && serving.length > 48) throw new RangeError('serving');
  if (!Object.keys(values).length && !serving) return null;
  return {
    ...values,
    ...(serving ? { serving } : {}),
    source: input.source === 'sample' ? 'sample' : 'entered',
  };
}

export function matchesCalorieLimit(nutrition: Nutrition | null | undefined, limit: number | null): boolean {
  if (limit === null) return true;
  const kcal = nutrition?.kcal;
  return typeof kcal === 'number' && Number.isFinite(kcal) && kcal >= 0 && kcal < limit;
}

type GuestTheme = { accent: string; surface: string; button: 'pill' | 'rounded' | 'outline' };
export const defaultTheme: Readonly<GuestTheme> = { accent: '#d6a46f', surface: '#fcf2e3', button: 'pill' };
export const themePresets: ReadonlyArray<{ name: string; theme: Readonly<GuestTheme> }> = [
  { name: 'Aurel House', theme: defaultTheme },
  { name: 'Olive Grove', theme: { accent: '#53694e', surface: '#f0f2e7', button: 'rounded' } },
  { name: 'Coastal Blue', theme: { accent: '#426479', surface: '#edf4f7', button: 'outline' } },
];

export function normalizeTheme(input?: { accent?: unknown; surface?: unknown; button?: unknown } | null): GuestTheme {
  const hex = (value: unknown, fallback: string): string =>
    typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;
  return {
    accent: hex(input?.accent, defaultTheme.accent),
    surface: hex(input?.surface, defaultTheme.surface),
    button: input?.button === 'rounded' || input?.button === 'outline' ? input.button : 'pill',
  };
}

export function readableInk(hex: string): '#000000' | '#ffffff' {
  const channels = [1, 3, 5].map((offset) => {
    const s = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return luminance >= 0.17913 ? '#000000' : '#ffffff';
}

type MediaStatus = 'ready' | 'requested' | 'production' | 'approved';
export function mediaStatus(value: unknown): MediaStatus {
  return value === 'requested' || value === 'production' || value === 'approved' ? value : 'ready';
}

export function nextMediaStatus(status: MediaStatus): MediaStatus {
  const next: Record<MediaStatus, MediaStatus> = {
    ready: 'requested', requested: 'production', production: 'approved', approved: 'requested',
  };
  return next[status];
}

export function viewCartRate(views: number, viewsWithAdd: number): number | null {
  if (!Number.isFinite(views) || !Number.isFinite(viewsWithAdd) || views <= 0 || viewsWithAdd < 0 || viewsWithAdd > views) return null;
  return viewsWithAdd / views * 100;
}
export const mediaChangeTypes = ['lighting', 'crop', 'background', 'presentation', 'color', 'retouching', 'motion'] as const;
type MediaChange = typeof mediaChangeTypes[number];
export type LocalMediaRequest = {
  restaurantId: string; dishId: string; mediaId: string; requestedChanges: MediaChange[];
  note: string; priority: 'normal' | 'high'; createdAt: string; status: 'requested';
};
export function createMediaRequest(input: {
  restaurantId: string; dishId: string; mediaId: string; requestedChanges: string[];
  note: string; priority: string; createdAt: string;
}): LocalMediaRequest {
  if (!input.restaurantId || !input.dishId || !input.mediaId || !input.requestedChanges.length ||
      input.requestedChanges.some(value => !mediaChangeTypes.includes(value as MediaChange)) ||
      input.note.trim().length > 600 || !['normal', 'high'].includes(input.priority) ||
      !Number.isFinite(Date.parse(input.createdAt))) throw new RangeError('Invalid media request');
  return {restaurantId: input.restaurantId, dishId: input.dishId, mediaId: input.mediaId,
    requestedChanges: [...new Set(input.requestedChanges)] as MediaChange[], note: input.note.trim(),
    priority: input.priority as 'normal' | 'high', createdAt: input.createdAt, status: 'requested'};
}

export function eventPhase(date: string, today: string): 'upcoming' | 'today' | 'past' {
  const parsed = new Date(date + 'T12:00:00');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) ||
      `${parsed.getFullYear()}-${String(parsed.getMonth()+1).padStart(2,'0')}-${String(parsed.getDate()).padStart(2,'0')}` !== date) throw new RangeError('Invalid date');
  return date === today ? 'today' : date > today ? 'upcoming' : 'past';
}

