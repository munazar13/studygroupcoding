import { useState } from 'react';
import { useParams } from 'react-router-dom';
import PixelButton from '../components/PixelButton';
import PixelCard from '../components/PixelCard';
import { verifyCertificate } from '../services/dataApi';

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', { dateStyle: 'long' });
}

export default function VerifyCertificate() {
  const { code: routeCode = '' } = useParams();
  const [code, setCode] = useState(routeCode);
  const [certificate, setCertificate] = useState(null);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleVerify(event) {
    event?.preventDefault();
    setLoading(true);
    try {
      const result = await verifyCertificate(code);
      setCertificate(result);
      setChecked(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell center-page">
      <PixelCard className="verify-card">
        <p className="eyebrow">Verifikasi Sertifikat</p>
        <h1>Cek Kode Sertifikat</h1>
        <p>Masukkan kode sertifikat untuk memastikan statusnya valid atau dibatalkan.</p>

        <form className="form-stack" onSubmit={handleVerify}>
          <label>
            Kode Sertifikat
            <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="SGC-2026-XXXXXX" />
          </label>
          <PixelButton type="submit" disabled={loading || !code.trim()}>{loading ? 'Mengecek...' : 'Cek Sertifikat'}</PixelButton>
        </form>

        {checked ? (
          certificate ? (
            <div className={`certificate-verify-result ${certificate.status === 'valid' ? 'valid' : 'revoked'}`}>
              <h2>{certificate.status === 'valid' ? 'Sertifikat Valid' : 'Sertifikat Tidak Aktif'}</h2>
              <p><strong>Nama:</strong> {certificate.memberName}</p>
              <p><strong>Program:</strong> {certificate.programName}</p>
              <p><strong>Tanggal Terbit:</strong> {formatDate(certificate.issuedAt)}</p>
              <p><strong>Status:</strong> {certificate.status}</p>
            </div>
          ) : (
            <div className="certificate-verify-result revoked">
              <h2>Kode tidak ditemukan</h2>
              <p>Periksa lagi kode sertifikat yang dimasukkan.</p>
            </div>
          )
        ) : null}
      </PixelCard>
    </main>
  );
}
