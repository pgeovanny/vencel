export type VisualPreset = {
  slug: string;
  name: string;
  description?: string | null;
  category?: string;
  config: Record<string, any>;
};

export type RuntimeSettings = {
  default_preset?: string;
  ui_theme?: string;
  renderer_quality?: 'low' | 'balanced' | 'high' | string;
  mobile_quality?: 'low' | 'balanced' | 'high' | string;
  agent_schema_version?: string;
  settings?: Record<string, any>;
};

export const VISUAL_PRESET_FALLBACKS: Record<string, Record<string, any>> = {
  urban_night_cinematic: { time: 'night', weather: 'clear', palette: 'urban_blue', lighting: 'streetlamp', fog: .16, vignette: .28, particles: 'dust', accent: '#6ee7f2' },
  urban_rain_night: { time: 'night', weather: 'rain', palette: 'rain_blue', lighting: 'wet_street', fog: .22, vignette: .32, particles: 'rain', accent: '#73d6ff' },
  urban_day_clean: { time: 'day', weather: 'clear', palette: 'day_clean', lighting: 'sun_soft', fog: .02, vignette: .08, particles: 'none', accent: '#4bc8d4' },
  sunset_warm: { time: 'sunset', weather: 'clear', palette: 'sunset_warm', lighting: 'sunset', fog: .08, vignette: .16, particles: 'dust', accent: '#ffb45f' },
  station_cool: { time: 'indoor', weather: 'none', palette: 'station_cool', lighting: 'fluorescent', fog: 0, vignette: .12, particles: 'none', accent: '#65d1dc' },
  station_warm: { time: 'indoor', weather: 'none', palette: 'station_warm', lighting: 'mixed', fog: .02, vignette: .2, particles: 'dust', accent: '#f2c66d' },
  court_day_premium: { time: 'day', weather: 'none', palette: 'court_warm', lighting: 'window_day', fog: 0, vignette: .1, particles: 'none', accent: '#d8b76c' },
  court_evening: { time: 'sunset', weather: 'none', palette: 'court_evening', lighting: 'window_warm', fog: .03, vignette: .18, particles: 'dust', accent: '#e7bc73' },
};

export const ENVIRONMENT_DEFAULT_PRESET: Record<string, string> = {
  parking_night: 'urban_night_cinematic',
  parking_day: 'urban_day_clean',
  urban_street: 'urban_day_clean',
  police_station: 'station_warm',
  courtroom: 'court_day_premium',
  office: 'station_cool',
};

export const CHARACTER_ARCHETYPES = [
  'police', 'delegate', 'clerk', 'civilian', 'security', 'suspect', 'medic', 'prosecutor', 'judge', 'court_staff', 'operational', 'investigator', 'analyst', 'formal',
] as const;

export const WEATHER_OPTIONS = ['auto', 'clear', 'rain', 'overcast', 'none'] as const;
export const TIME_OPTIONS = ['auto', 'day', 'sunset', 'night', 'indoor'] as const;

export function resolveVisualConfig(stage: any, mission: any, presets: VisualPreset[] = [], runtime?: RuntimeSettings) {
  const presetMap = new Map(presets.map(p => [p.slug, p.config || {}]));
  const fallbackSlug = ENVIRONMENT_DEFAULT_PRESET[stage?.environment] || runtime?.default_preset || mission?.visual_theme?.default_preset || 'urban_night_cinematic';
  const slug = stage?.visual?.preset || mission?.visual_theme?.default_preset || fallbackSlug;
  const base = presetMap.get(slug) || VISUAL_PRESET_FALLBACKS[slug] || VISUAL_PRESET_FALLBACKS[fallbackSlug] || {};
  const merged = {
    slug,
    ...base,
    ...(mission?.visual_theme?.overrides || {}),
    ...(stage?.visual || {}),
  } as Record<string, any>;
  if (merged.time === 'auto') merged.time = base.time || 'day';
  if (merged.weather === 'auto') merged.weather = base.weather || 'clear';
  return merged;
}
