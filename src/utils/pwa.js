export function registerPwaServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    const baseUrl = import.meta.env.BASE_URL || '/';
    const swUrl = `${baseUrl.replace(/\/$/, '')}/sw.js`;

    navigator.serviceWorker
      .register(swUrl)
      .catch((error) => console.warn('Service worker gagal didaftarkan.', error));
  });
}
