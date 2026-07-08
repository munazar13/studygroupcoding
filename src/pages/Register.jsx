import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PixelButton from '../components/PixelButton';
import PixelCard from '../components/PixelCard';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const avatars = ['🧑‍💻', '🧙', '🛡️', '🏹', '🤖', '🐱'];
const LETTING_OPTIONS = ['2022', '2023', '2024', '2025', '2026'];

export default function Register() {
  const [form, setForm] = useState({
    name: '',
    nim: '',
    email: '',
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

    const cleanEmail = form.email.trim().toLowerCase();

    if (!/^\d{6,15}$/.test(form.nim.trim())) {
      showToast('NIM harus berupa angka dengan format rapi.', 'error');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      showToast('Email pemulihan wajib diisi dengan format email yang benar.', 'error');
      return;
    }

    if (form.password.length < 6) {
      showToast('Password minimal 6 karakter.', 'error');
      return;
    }

    setLoading(true);

    try {
      await registerMember({ ...form, email: cleanEmail, recoveryEmail: cleanEmail });
      showToast('Pendaftaran berhasil. Akun menunggu persetujuan pengurus.');
      navigate('/pending');
    } catch (error) {
      console.error('REGISTER ERROR CODE:', error.code);
      console.error('REGISTER ERROR MESSAGE:', error.message);
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
        <p>
          Login tetap memakai NIM, tetapi email pemulihan dipakai sistem untuk reset sandi kalau kamu lupa password.
        </p>
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
          <label className="form-full">
            Email pemulihan
            <input
              required
              type="email"
              placeholder="Contoh: nama@email.com"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
            <small>Email ini tidak dipakai untuk login harian. Login tetap memakai NIM.</small>
          </label>
          <label>
            Angkatan
            <select
              name="cohort"
              value={form.cohort}
              onChange={(event) => setForm({...form, cohort: event.target.value })}
              required
            >
              <option value="">Pilih Letting</option>

              {LETTING_OPTIONS.map((year) => (
                <option key={year} value={year}>
                  Letting {year}
                </option>
              ))}
            </select>
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
          <div className="avatar-picker form-full">
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
