import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PixelButton from '../components/PixelButton';
import PixelCard from '../components/PixelCard';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function AdminLogin() {
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { loginAdmin } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);

    try {
      await loginAdmin(form.identifier, form.password);
      showToast('Admin berhasil masuk.');
      navigate('/admin');
    } catch (error) {
      showToast(error.message || 'Login admin gagal.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell auth-page">
      <PixelCard className="auth-card">
        <p className="eyebrow">Admin Gate</p>
        <h1>Login Pengurus</h1>
        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            Email / NIM Admin
            <input
              required
              placeholder="admin@studygroupcoding.app"
              value={form.identifier}
              onChange={(event) => setForm({ ...form, identifier: event.target.value })}
            />
          </label>
          <label>
            Password
            <input
              required
              type="password"
              placeholder="Password admin"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
          </label>
          <PixelButton disabled={loading} type="submit">{loading ? 'Memeriksa...' : 'Masuk Admin'}</PixelButton>
        </form>
      </PixelCard>
    </main>
  );
}
