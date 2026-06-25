export const RARITY_LIST = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'mythic'
];

export const RARITY_LABELS = {
  common: 'Biasa',
  uncommon: 'Tidak Biasa',
  rare: 'Rare',
  epic: 'Epic',
  mythic: 'Mythic'
};

export const RARITY_COLORS = {
  common: 'putih',
  uncommon: 'abu-abu',
  rare: 'dongker',
  epic: 'kuning',
  mythic: 'merah'
};

export function normalizeRarity(rarity = 'common') {
  const value = String(rarity || 'common').toLowerCase().trim();

  if (['common', 'biasa', 'white', 'putih'].includes(value)) {
    return 'common';
  }

  if (['uncommon', 'tidak biasa', 'tidak-biasa', 'gray', 'grey', 'abu', 'abu-abu'].includes(value)) {
    return 'uncommon';
  }

  if (['rare', 'dongker', 'navy', 'biru dongker'].includes(value)) {
    return 'rare';
  }

  if (['epic', 'gold', 'golden', 'kuning', 'emas'].includes(value)) {
    return 'epic';
  }

  if (['mythic', 'mythical', 'red', 'merah', 'legendary'].includes(value)) {
    return 'mythic';
  }

  return 'common';
}

export function getRarityLabel(rarity = 'common') {
  const normalized = normalizeRarity(rarity);

  return RARITY_LABELS[normalized] || RARITY_LABELS.common;
}

export function getRarityColorName(rarity = 'common') {
  const normalized = normalizeRarity(rarity);

  return RARITY_COLORS[normalized] || RARITY_COLORS.common;
}

export function getRarityClassName(rarity = 'common') {
  return `rarity-${normalizeRarity(rarity)}`;
}

export function isHighRarity(rarity = 'common') {
  const normalized = normalizeRarity(rarity);

  return ['epic', 'mythic'].includes(normalized);
}