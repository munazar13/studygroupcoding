import { Link } from 'react-router-dom';
import { useState } from 'react';
import PixelButton from '../components/PixelButton';
import PixelCard from '../components/PixelCard';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const { resetMemberPassword } = useAuth();
  const { showToast } = useToast();

  async function handleSubmit(event) {
    event.preventDefault();

    if (!identifier.trim()) {
      showToast('Isi NIM atau email pemulihan terlebih dahulu.', 'error');
      return;
    }

    setLoading(true);

    try {
      await resetMemberPassword(identifier.trim());
      showToast('Link reset sandi sudah dikirim ke email pemulihan. Cek inbox atau spam.');
      setIdentifier('');
    } catch (error) {
      showToast(error.message || 'Gagal mengirim reset sandi.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell auth-page">
      <PixelCard className="auth-card">
        <p className="eyebrow">Reset Sandi</p>
        <h1>Lupa Password?</h1>
        <p>
          Masukkan NIM atau email pemulihan. Sistem akan mengirim link reset sandi langsung ke email,
          tanpa perlu admin mengganti password secara manual.
        </p>

        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            NIM atau email pemulihan
            <input
              required
              placeholder="Contoh: 250212806 atau nama@email.com"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
            />
          </label>

          <PixelButton type="submit" disabled={loading}>
            {loading ? 'Mengirim...' : 'Kirim Link Reset'}
          </PixelButton>
        </form>

        <p className="auth-footer">
          Sudah ingat password? <Link to="/login">Kembali login</Link>
        </p>
      </PixelCard>
    </main>
  );
}
