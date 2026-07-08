import { useEffect, useMemo, useState } from 'react';
import PixelButton from './PixelButton';

function isAppStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function getInstallHint() {
  const ua = window.navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(ua)) {
    return 'iPhone/iPad: buka Safari, tekan tombol Share, lalu pilih Add to Home Screen.';
  }

  if (/android/.test(ua)) {
    return 'Android Chrome: tekan menu titik tiga, lalu pilih Add to Home screen / Install app.';
  }

  return 'Desktop Chrome/Edge: cari ikon install di address bar, atau buka menu browser lalu pilih Install app.';
}

export default function PwaInstallButton({ className = '', compact = false }) {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    setInstalled(isAppStandalone());

    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setInstallPrompt(event);
      setShowHelp(false);
    }

    function handleInstalled() {
      setInstalled(true);
      setInstallPrompt(null);
      setShowHelp(false);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const hint = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return getInstallHint();
  }, []);

  async function handleInstall() {
    if (!installPrompt) {
      setShowHelp((value) => !value);
      return;
    }

    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  if (installed) {
    return compact ? null : (
      <div className={`pwa-install-box installed ${className}`.trim()}>
        <strong>✅ App sudah terpasang</strong>
        <small>Kamu bisa membuka Study Group Coding dari layar utama/perangkatmu.</small>
      </div>
    );
  }

  return (
    <div className={`pwa-install-box ${compact ? 'compact' : ''} ${className}`.trim()}>
      <PixelButton type="button" variant="secondary" onClick={handleInstall}>
        {installPrompt ? 'Install App' : 'Cara Install App'}
      </PixelButton>

      {showHelp || !installPrompt ? (
        <small className="pwa-install-hint">
          {hint || 'Buka menu browser lalu pilih Install app / Add to Home screen.'}
        </small>
      ) : null}
    </div>
  );
}
