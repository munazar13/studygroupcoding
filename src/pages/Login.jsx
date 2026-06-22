import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import PixelButton from '../components/PixelButton';
import PixelCard from '../components/PixelCard';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Login() {
  const [form, setForm] = useState({ nim: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { loginMember } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);

    try {
      const member = await loginMember(form.nim, form.password);
      showToast(member.status === 'approved' ? 'Login berhasil.' : 'Akun menunggu persetujuan.');
      navigate(member.status === 'approved' ? '/dashboard' : '/pending');
    } catch (error) {
      showToast(error.message || 'Gagal login.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell auth-page">
      <PixelCard className="auth-card">
        <p className="eyebrow">Member Login</p>
        <h1>Masuk Anggota</h1>
        <p>Gunakan NIM dan password yang sudah didaftarkan.</p>
        <form className="form-stack" onSubmit={handleSubmit}>
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
            Password
            <input
              required
              type="password"
              placeholder="Masukkan password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
          </label>
          <PixelButton disabled={loading} type="submit">{loading ? 'Memproses...' : 'Masuk'}</PixelButton>
        </form>
        <p className="auth-footer">Belum punya akun? <Link to="/register">Daftar dulu</Link></p>
      </PixelCard>
    </main>
  );
}
