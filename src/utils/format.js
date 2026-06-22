export function formatDate(value) {
  if (!value) {
    return 'Belum diatur';
  }

  try {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
