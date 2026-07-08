import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingState from '../components/LoadingState';
import PixelCard from '../components/PixelCard';
import { useAuth } from '../context/AuthContext';
import { loadCertificates } from '../services/dataApi';

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', { dateStyle: 'long' });
}

export default function Certificate() {
  const { currentMember } = useAuth();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCertificates()
      .then((items) => {
        const owned = items.find((item) => String(item.uid || '') === String(currentMember.uid || '') && String(item.status || 'valid') === 'valid');
        setCertificate(owned || null);
      })
      .finally(() => setLoading(false));
  }, [currentMember.uid]);

  if (loading) return <LoadingState />;

  if (!certificate) {
    return (
      <main className="page-shell center-page">
        <PixelCard>
          <h1>Sertifikat belum diterbitkan</h1>
          <p>Sertifikat diterbitkan admin setelah semua stage selesai dan Final Project disetujui.</p>
          <p>Status Final Project: <strong>{currentMember.finalProjectStatus || 'belum dikirim'}</strong></p>
          <Link className="pixel-button primary" to="/final-quest">Buka Final Project</Link>
        </PixelCard>
      </main>
    );
  }

  return (
    <main className="page-shell center-page">
      <section className="certificate-card managed-certificate-card">
        {certificate.logoUrl ? <img className="certificate-logo" src={certificate.logoUrl} alt={certificate.organizationName} /> : null}
        <p>Certificate of Completion</p>
        <h1>{certificate.memberName}</h1>
        <h2>{certificate.programName}</h2>
        <p>{certificate.requirementText}</p>
        <p>Diterbitkan oleh <strong>{certificate.organizationName}</strong> pada {formatDate(certificate.issuedAt)}</p>
        <div className="certificate-signature-row">
          <div>
            {certificate.signatureUrl ? <img src={certificate.signatureUrl} alt="Tanda tangan" /> : null}
            <strong>{certificate.signerName}</strong>
            <span>{certificate.signerTitle}</span>
          </div>
          {certificate.stampUrl ? <img className="certificate-stamp" src={certificate.stampUrl} alt="Stempel" /> : null}
        </div>
        <strong className="certificate-code">{certificate.code}</strong>
        <div className="button-row center-buttons">
          <button className="pixel-button primary" type="button" onClick={() => window.print()}>Cetak Sertifikat</button>
          <Link className="pixel-button secondary" to={`/verify-certificate/${certificate.code}`}>Cek Validitas</Link>
        </div>
      </section>
    </main>
  );
}
