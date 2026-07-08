const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const SAFE_CSS_NAMED_COLORS = new Set([
  'black', 'white', 'red', 'blue', 'green', 'yellow', 'orange', 'purple',
  'pink', 'brown', 'gray', 'grey', 'cyan', 'magenta', 'lime', 'navy',
  'teal', 'maroon', 'olive', 'gold', 'silver', 'transparent'
]);

export function isValidCosmeticColor(value) {
  const color = String(value || '').trim();
  if (!color) return false;
  if (HEX_COLOR_PATTERN.test(color)) return true;
  return SAFE_CSS_NAMED_COLORS.has(color.toLowerCase());
}

export function normalizeShopType(type = '') {
  const value = String(type || '').trim();
  if (value.toLowerCase() === 'namecolor') return 'nameColor';
  if (value.toLowerCase() === 'profiledecoration') return 'profileDecoration';
  return value;
}

export function getShopInventory(member = {}) {
  return Array.isArray(member.shopInventory) ? member.shopInventory : [];
}

export function findShopItem(shopItems = [], itemId = '') {
  const cleanId = String(itemId || '').trim();
  if (!cleanId) return null;
  return (shopItems || []).find((item) => String(item?.id || '').trim() === cleanId) || null;
}

export function findInventoryItem(member = {}, itemId = '', type = '') {
  const cleanId = String(itemId || '').trim();
  const cleanType = normalizeShopType(type);
  if (!cleanId && !cleanType) return null;

  return getShopInventory(member).find((item) => {
    const sameId = cleanId ? String(item?.id || '').trim() === cleanId : true;
    const sameType = cleanType ? normalizeShopType(item?.type) === cleanType : true;
    return sameId && sameType;
  }) || null;
}

export function getOwnedShopItemIds(member = {}) {
  const explicitIds = Array.isArray(member.ownedShopItems) ? member.ownedShopItems : [];
  const inventoryIds = getShopInventory(member).map((item) => item?.id);

  return Array.from(new Set([...explicitIds, ...inventoryIds]
    .map((item) => String(item || '').trim())
    .filter(Boolean)));
}

export function getShopInventoryByType(member = {}, type = '') {
  const cleanType = normalizeShopType(type);
  return getShopInventory(member).filter((item) => normalizeShopType(item?.type) === cleanType);
}

export function getActiveNameColor(member = {}, shopItems = []) {
  const activeItemId = String(member.activeNameColorItemId || member.activeNameColorId || '').trim();

  if (activeItemId) {
    const liveShopItem = findShopItem(shopItems, activeItemId);
    if (liveShopItem?.color && isValidCosmeticColor(liveShopItem.color)) {
      return liveShopItem.color;
    }

    const inventoryItem = findInventoryItem(member, activeItemId, 'nameColor');
    if (inventoryItem?.color && isValidCosmeticColor(inventoryItem.color)) {
      return inventoryItem.color;
    }
  }

  const legacyColor = String(member.activeNameColor || '').trim();
  if (isValidCosmeticColor(legacyColor)) {
    return legacyColor;
  }

  return '';
}

export function getMemberNameStyle(member = {}, shopItems = []) {
  const color = getActiveNameColor(member, shopItems);
  return color ? { color } : undefined;
}

function normalizeRewardType(reward = {}) {
  const value = String(reward.type || reward.category || '').trim().toLowerCase();
  if (value.includes('badge')) return 'badge';
  if (value.includes('title')) return 'title';
  if (value.includes('avatar')) return 'avatar';
  if (value.includes('frame')) return 'frame';
  return value;
}

function createFallbackCosmetic(id, type = 'badge') {
  const cleanId = String(id || '').trim();
  if (!cleanId) return null;

  const name = cleanId.replace(/[-_]+/g, ' ');

  return {
    id: cleanId,
    name,
    title: name,
    type,
    category: type,
    icon: type === 'title' ? '🎖️' : type === 'badge' ? '🏅' : '🎁',
    rarity: 'common',
    description: type === 'title'
      ? 'Title yang sudah kamu miliki.'
      : 'Badge yang sudah kamu miliki.'
  };
}

export function findCosmeticById({ rewards = [], shopItems = [], member = {}, id = '', type = 'badge' } = {}) {
  const cleanId = String(id || '').trim();
  const cleanType = normalizeShopType(type);

  if (!cleanId) return null;

  const liveShopItem = (shopItems || []).find((item) => (
    String(item?.id || '').trim() === cleanId &&
    normalizeShopType(item?.type) === cleanType
  ));

  if (liveShopItem) {
    return {
      ...liveShopItem,
      category: cleanType,
      title: liveShopItem.title || liveShopItem.name,
      source: 'shop'
    };
  }

  const inventoryItem = findInventoryItem(member, cleanId, cleanType);
  if (inventoryItem) {
    return {
      ...inventoryItem,
      category: cleanType,
      title: inventoryItem.title || inventoryItem.name,
      source: 'inventory'
    };
  }

  const reward = (rewards || []).find((item) => String(item?.id || '').trim() === cleanId && normalizeRewardType(item) === cleanType);
  if (reward) return reward;

  return createFallbackCosmetic(cleanId, cleanType);
}

export function mergeOwnedCosmetics({ rewards = [], shopItems = [], member = {}, ownedIds = [], type = 'badge' } = {}) {
  const cleanType = normalizeShopType(type);
  const ids = new Set((ownedIds || []).map((item) => String(item || '').trim()).filter(Boolean));

  getShopInventoryByType(member, cleanType).forEach((item) => {
    if (item?.id) ids.add(String(item.id));
  });

  return Array.from(ids)
    .map((id) => findCosmeticById({ rewards, shopItems, member, id, type: cleanType }))
    .filter(Boolean);
}
