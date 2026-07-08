import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PixelButton from './PixelButton';

const publicPrimaryLinks = [
  { to: '/', label: 'Beranda', icon: '🏠' },
  { to: '/cara-bermain', label: 'Cara Bermain', icon: '🎮' }
];

const publicMoreLinks = [
  { to: '/about', label: 'Tentang', icon: '📘' },
  { to: '/activities', label: 'Kegiatan', icon: '⚔️' },
  { to: '/documentation', label: 'Dokumentasi', icon: '📸' },
  { to: '/gallery', label: 'Karya', icon: '🖼️' },
  { to: '/terms', label: 'Aturan', icon: '📜' },
  { to: '/admin-login', label: 'Admin', icon: '🛡️' }
];

const memberPrimaryLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: '🎯' },
  { to: '/map', label: 'Map', icon: '🗺️' },
  { to: '/rewards', label: 'Reward', icon: '🎁' },
  { to: '/shop', label: 'Shop', icon: '🛒' },
  { to: '/profile', label: 'Profil', icon: '🧙' }
];

const memberMoreLinks = [
  { to: '/challenges', label: 'Tantangan', icon: '⚔️' },
  { to: '/leaderboard', label: 'Rank', icon: '🏆' },
  { to: '/notifications', label: 'Notifikasi', icon: '🔔' },
  { to: '/cara-bermain', label: 'Cara Bermain', icon: '🎮' },
  { to: '/documentation', label: 'Dokumentasi', icon: '📸' },
  { to: '/gallery', label: 'Karya', icon: '🖼️' },
  { to: '/terms', label: 'Aturan', icon: '📜' }
];

const adminPrimaryLinks = [
  { to: '/admin', label: 'Admin', icon: '🛡️' }
];

function uniqueLinks(links = []) {
  const seen = new Set();

  return links.filter((link) => {
    if (seen.has(link.to)) return false;
    seen.add(link.to);
    return true;
  });
}

export default function Navbar() {
  const { currentMember, isApproved, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const navRef = useRef(null);
  const measureRef = useRef(null);
  const topMoreRef = useRef(null);
  const bottomMoreRef = useRef(null);

  const [visibleCount, setVisibleCount] = useState(99);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 720px)');

    function handleChange() {
      setIsMobile(media.matches);
    }

    handleChange();
    media.addEventListener('change', handleChange);

    return () => {
      media.removeEventListener('change', handleChange);
    };
  }, []);

  const primaryLinks = useMemo(() => {
    if (isAdmin) return adminPrimaryLinks;
    if (isApproved) return memberPrimaryLinks;
    return publicPrimaryLinks;
  }, [isApproved, isAdmin]);

  const menuLinks = useMemo(() => {
    if (isAdmin) {
      return uniqueLinks([
        ...adminPrimaryLinks,
        { to: '/dashboard', label: 'Dashboard', icon: '🎯' },
        { to: '/map', label: 'Map', icon: '🗺️' },
        { to: '/cara-bermain', label: 'Cara Bermain', icon: '🎮' }
      ]);
    }

    if (isApproved) {
      return uniqueLinks([...memberPrimaryLinks, ...memberMoreLinks]);
    }

    return uniqueLinks([
      ...publicPrimaryLinks,
      ...publicMoreLinks,
      ...(!currentMember
        ? [
            { to: '/login', label: 'Masuk', icon: '🔑' },
            { to: '/register', label: 'Daftar', icon: '📝' }
          ]
        : [])
    ]);
  }, [currentMember, isApproved, isAdmin]);

  const allLinks = useMemo(() => {
    if (isMobile) return primaryLinks;
    return primaryLinks;
  }, [isMobile, primaryLinks]);

  const mobilePrimaryLinks = useMemo(() => {
    if (isAdmin) {
      return [
        { to: '/admin', label: 'Admin', icon: '🛡️' },
        { to: '/dashboard', label: 'Home', icon: '🎯' },
        { to: '/map', label: 'Map', icon: '🗺️' },
        { to: '/profile', label: 'Profil', icon: '🧙' }
      ];
    }

    if (isApproved) {
      return [
        { to: '/dashboard', label: 'Home', icon: '🎯' },
        { to: '/map', label: 'Map', icon: '🗺️' },
        { to: '/shop', label: 'Shop', icon: '🛒' },
        { to: '/profile', label: 'Profil', icon: '🧙' }
      ];
    }

    return [
      { to: '/', label: 'Home', icon: '🏠' },
      { to: '/cara-bermain', label: 'Cara', icon: '🎮' },
      { to: '/login', label: 'Masuk', icon: '🔑' },
      { to: '/register', label: 'Daftar', icon: '📝' }
    ];
  }, [isApproved, isAdmin]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        topMoreRef.current &&
        topMoreRef.current.open &&
        !topMoreRef.current.contains(event.target)
      ) {
        topMoreRef.current.removeAttribute('open');
      }

      if (
        bottomMoreRef.current &&
        bottomMoreRef.current.open &&
        !bottomMoreRef.current.contains(event.target)
      ) {
        bottomMoreRef.current.removeAttribute('open');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    function updateVisibleLinks() {
      const nav = navRef.current;
      const measure = measureRef.current;

      if (!nav || !measure || allLinks.length === 0) return;

      const navWidth = nav.clientWidth;
      const items = Array.from(measure.querySelectorAll('[data-nav-item]'));
      const moreButton = measure.querySelector('[data-nav-more]');

      const gap = 10;
      const moreWidth = moreButton ? moreButton.offsetWidth + gap : 90;

      let usedWidth = 0;
      let count = 0;

      for (let i = 0; i < items.length; i++) {
        const itemWidth = items[i].offsetWidth + gap;
        const stillHasHiddenItems = i < items.length - 1;
        const reserveMoreButton = stillHasHiddenItems ? moreWidth : 0;

        if (usedWidth + itemWidth + reserveMoreButton <= navWidth || count < 1) {
          usedWidth += itemWidth;
          count++;
        } else {
          break;
        }
      }

      setVisibleCount(count);
    }

    updateVisibleLinks();

    const resizeObserver = new ResizeObserver(updateVisibleLinks);

    if (navRef.current) {
      resizeObserver.observe(navRef.current);
    }

    window.addEventListener('resize', updateVisibleLinks);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateVisibleLinks);
    };
  }, [allLinks]);

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  const visibleLinks = allLinks.slice(0, visibleCount);
  const hiddenLinks = uniqueLinks([...allLinks.slice(visibleCount), ...menuLinks.filter((link) => !primaryLinks.some((item) => item.to === link.to))]);

  return (
    <>
      <header className="top-nav">
        <NavLink className="brand" to="/">
          <img src="./images/logo.svg" alt="Study Group Coding" />
          <span>Study Group Coding</span>
        </NavLink>

        <nav className="main-nav" ref={navRef} aria-label="Navigasi utama">
          {visibleLinks.map((link) => (
            <NavLink key={link.to} to={link.to}>
              {link.label}
            </NavLink>
          ))}

          {hiddenLinks.length > 0 ? (
            <details className="nav-more" ref={topMoreRef}>
              <summary>Lainnya</summary>

              <div className="nav-more-menu">
                {hiddenLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={() => topMoreRef.current?.removeAttribute('open')}
                  >
                    {link.icon ? <span>{link.icon} </span> : null}
                    {link.label}
                  </NavLink>
                ))}
              </div>
            </details>
          ) : null}

          <div className="nav-measure" ref={measureRef} aria-hidden="true">
            {allLinks.map((link) => (
              <span key={link.to} data-nav-item>
                {link.label}
              </span>
            ))}

            <span data-nav-more>Lainnya</span>
          </div>
        </nav>

        <div className="nav-actions">
          {currentMember ? (
            <PixelButton variant="ghost" onClick={handleLogout}>
              Keluar
            </PixelButton>
          ) : (
            <>
              <NavLink className="small-link" to="/login">
                Masuk
              </NavLink>

              <NavLink className="small-link primary-small-link" to="/register">
                Daftar
              </NavLink>
            </>
          )}
        </div>
      </header>

      <nav className="bottom-nav game-bottom-nav" aria-label="Navigasi mobile">
        {mobilePrimaryLinks.map((link) => (
          <NavLink key={link.to} to={link.to}>
            <span className="bottom-nav-icon">{link.icon}</span>
            <small>{link.label}</small>
          </NavLink>
        ))}

        <details className="bottom-more" ref={bottomMoreRef}>
          <summary>
            <span className="bottom-nav-icon">☰</span>
            <small>Menu</small>
          </summary>

          <div className="bottom-more-menu">
            {menuLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => bottomMoreRef.current?.removeAttribute('open')}
              >
                <span>{link.icon}</span>
                <small>{link.label}</small>
              </NavLink>
            ))}

            {currentMember ? (
              <button
                type="button"
                onClick={() => {
                  bottomMoreRef.current?.removeAttribute('open');
                  handleLogout();
                }}
              >
                <span>🚪</span>
                <small>Keluar</small>
              </button>
            ) : null}
          </div>
        </details>
      </nav>
    </>
  );
}
