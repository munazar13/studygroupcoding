import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PixelButton from '../components/PixelButton';
import PixelCard from '../components/PixelCard';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const avatars = ['🧑‍💻', '🧙', '🛡️', '🏹', '🤖', '🐱'];

export default function Register() {
  const [form, setForm] = useState({
    name: '',
    nim: '',
    cohort: '',
    password: '',
    avatar: avatars[0]
  });
  const [loading, setLoading] = useState(false);
  const { registerMember } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();

    if (!/^\d{6,15}$/.test(form.nim.trim())) {
      showToast('NIM harus berupa angka dengan format rapi.', 'error');
      return;
    }

    if (form.password.length < 6) {
      showToast('Password minimal 6 karakter.', 'error');
      return;
    }

    setLoading(true);

    try {
      await registerMember(form);
      showToast('Pendaftaran berhasil. Akun menunggu persetujuan pengurus.');
      navigate('/pending');
    } catch (error) {
      showToast(error.message || 'Pendaftaran gagal.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell auth-page">
      <PixelCard className="auth-card wide-auth">
        <p className="eyebrow">Join Academy</p>
        <h1>Daftar Anggota</h1>
        <p>Gunakan nama asli. Akses kursus akan terbuka setelah disetujui pengurus.</p>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Nama asli
            <input
              required
              placeholder="Contoh: Munazar"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </label>
          <label>
            NIM
            <input
              required
              inputMode="numeric"
              placeholder="Contoh: 250212806"
              value={form.nim}
              onChange={(event) => setForm({ ...form, nim: event.target.value })}
            />
          </label>
          <label>
            Angkatan
            <input
              required
              placeholder="Format: Letting 25 / PTI 2025"
              value={form.cohort}
              onChange={(event) => setForm({ ...form, cohort: event.target.value })}
            />
          </label>
          <label>
            Password
            <input
              required
              type="password"
              placeholder="Minimal 6 karakter"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
          </label>
          <div className="avatar-picker">
            {avatars.map((avatar) => (
              <button
                className={form.avatar === avatar ? 'active' : ''}
                key={avatar}
                type="button"
                onClick={() => setForm({ ...form, avatar })}
              >
                {avatar}
              </button>
            ))}
          </div>
          <PixelButton disabled={loading} className="form-full" type="submit">
            {loading ? 'Mendaftarkan...' : 'Daftar dan Tunggu Persetujuan'}
          </PixelButton>
        </form>
      </PixelCard>
    </main>
  );
}
