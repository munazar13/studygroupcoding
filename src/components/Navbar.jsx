import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PixelButton from './PixelButton';

const publicLinks = [
  { to: '/', label: 'Beranda' },
  { to: '/about', label: 'Tentang' },
  { to: '/activities', label: 'Kegiatan' },
  { to: '/documentation', label: 'Dokumentasi' },
  { to: '/gallery', label: 'Karya' }
];

const memberLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { to: '/map', label: 'Map', icon: '🗺️' },
  { to: '/rewards', label: 'Reward', icon: '🎁' },
  { to: '/leaderboard', label: 'Rank', icon: '🏆' },
  { to: '/profile', label: 'Profil', icon: '👤' }
];

export default function Navbar() {
  const { currentMember, isApproved, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <>
      <header className="top-nav">
        <NavLink className="brand" to="/">
          <img src="./images/logo.svg" alt="Study Group Coding" />
          <span>Study Group Coding</span>
        </NavLink>

        <nav className="desktop-links" aria-label="Navigasi utama">
          {publicLinks.map((link) => (
            <NavLink key={link.to} to={link.to}>
              {link.label}
            </NavLink>
          ))}
          {isApproved ? <NavLink to="/dashboard">Belajar</NavLink> : null}
          {isAdmin ? <NavLink to="/admin">Admin</NavLink> : null}
        </nav>

        <div className="nav-actions">
          {currentMember ? (
            <PixelButton variant="ghost" onClick={handleLogout}>Keluar</PixelButton>
          ) : (
            <>
              <NavLink className="small-link" to="/login">Masuk</NavLink>
              <NavLink className="small-link" to="/admin-login">Admin</NavLink>
            </>
          )}
        </div>
      </header>

      {isApproved ? (
        <nav className="bottom-nav" aria-label="Navigasi belajar">
          {memberLinks.map((link) => (
            <NavLink key={link.to} to={link.to}>
              <span>{link.icon}</span>
              <small>{link.label}</small>
            </NavLink>
          ))}
        </nav>
      ) : null}
    </>
  );
}
