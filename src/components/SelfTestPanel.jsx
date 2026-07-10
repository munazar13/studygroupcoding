import { useMemo, useState } from 'react';
import PixelButton from './PixelButton';
import PixelCard from './PixelCard';

function getStageSelfTest(stageNumber, module = {}) {
  const title = String(module.title || '').toLowerCase();
  const type = String(module.type || '').toLowerCase();

  if (stageNumber >= 15 && stageNumber <= 16) {
    return {
      title: 'Tes Mandiri HTML',
      prompt: type === 'practice' || title.includes('praktik')
        ? 'Buat potongan HTML kecil sesuai contoh materi. Pastikan ada struktur yang jelas, label yang tepat, dan elemen yang sesuai fungsi.'
        : 'Jelaskan dengan bahasamu sendiri: elemen HTML apa yang paling penting dari bagian ini dan kapan elemen itu digunakan?',
      checklist: ['Menggunakan tag sesuai fungsi', 'Tidak hanya memilih tag karena tampilannya besar/kecil', 'Jika ada form, input punya label dan name'],
      sample: 'Jawaban yang baik menyebut fungsi elemen, contoh penggunaan, dan alasan memilih elemen tersebut. Misalnya form dipakai menerima input user, label menjelaskan input, name disiapkan untuk pemrosesan data.'
    };
  }

  if (stageNumber >= 17 && stageNumber <= 19) {
    return {
      title: 'Tes Mandiri CSS',
      prompt: 'Ambil satu elemen dari materi, lalu tentukan style dasar yang membuatnya lebih rapi. Jelaskan juga bagian mana yang memakai warna, padding, margin, atau layout.',
      checklist: ['Membedakan margin dan padding', 'Memakai selector yang tepat', 'Tidak memakai tabel untuk layout', 'Memikirkan tampilan mobile jika sudah masuk responsive'],
      sample: 'Jawaban yang baik menjelaskan selector yang dipakai, property yang diubah, dan efek visualnya. Contoh: padding memberi jarak dalam tombol, margin memberi jarak tombol dengan elemen lain.'
    };
  }

  if (stageNumber >= 20 && stageNumber <= 24) {
    return {
      title: 'Tes Mandiri JavaScript',
      prompt: 'Prediksi apa yang terjadi saat kode dijalankan. Setelah itu, coba ubah satu baris kode di playground dan lihat perubahan outputnya.',
      checklist: ['Bisa menjelaskan input/proses/output kode', 'Bisa menyebut event atau DOM yang terlibat jika ada', 'Bisa membedakan data yang tampil dan data yang disimpan'],
      sample: 'Jawaban yang baik tidak hanya menyebut hasil akhir, tetapi juga urutan prosesnya: kode mengambil elemen, event terjadi, data diproses, lalu tampilan berubah.'
    };
  }

  if (stageNumber >= 26 && stageNumber <= 29) {
    return {
      title: 'Tes Mandiri PHP',
      prompt: 'Jelaskan data apa yang masuk, proses apa yang dilakukan PHP, dan output apa yang dikirim kembali ke halaman.',
      checklist: ['Menyebut sumber data', 'Menyebut proses di backend', 'Tidak mencampur proses PHP dengan CSS/HTML murni'],
      sample: 'Jawaban yang baik menjelaskan bahwa PHP berjalan di server, menerima/mengolah data, lalu menghasilkan output yang dikirim ke browser.'
    };
  }

  if (stageNumber >= 30) {
    return {
      title: 'Tes Mandiri Database',
      prompt: 'Bayangkan data yang sedang dibahas disimpan di database. Tentukan tabel, kolom penting, dan contoh satu baris datanya.',
      checklist: ['Bisa membedakan tabel, kolom, dan baris', 'Bisa menyebut data kunci seperti id', 'Bisa menjelaskan relasi sederhana jika diperlukan'],
      sample: 'Jawaban yang baik berisi contoh tabel dan kolom. Misalnya tabel siswa memiliki id, nama, nim, angkatan, dan status.'
    };
  }

  return {
    title: 'Tes Mandiri Konsep',
    prompt: 'Tuliskan ulang inti materi ini dengan bahasamu sendiri, lalu beri satu contoh sederhana dari kehidupan sehari-hari atau dari coding.',
    checklist: ['Menyebut istilah utama', 'Menjelaskan fungsi istilah', 'Memberi contoh sederhana'],
    sample: 'Jawaban yang baik tidak menyalin mentah materi, tetapi menjelaskan konsep dengan kalimat sendiri dan contoh yang masuk akal.'
  };
}

export default function SelfTestPanel({ stageNumber, module, completed = false, onComplete }) {
  const test = useMemo(() => getStageSelfTest(Number(stageNumber || 0), module), [stageNumber, module]);
  const [answer, setAnswer] = useState('');
  const [showSample, setShowSample] = useState(false);
  const [checkedItems, setCheckedItems] = useState({});

  const checklistDone = test.checklist.every((_, index) => checkedItems[index]);
  const canComplete = completed || (answer.trim().length >= 15 && checklistDone);

  return (
    <PixelCard className={`self-test-panel ${completed ? 'done' : ''}`.trim()}>
      <div className="section-title-row">
        <div>
          <p className="eyebrow">Tes Mandiri</p>
          <h3>{test.title}</h3>
          <p>{test.prompt}</p>
        </div>
        <span className={`status-pill ${completed ? 'resolved' : 'open'}`}>{completed ? 'Selesai' : 'Belum selesai'}</span>
      </div>

      <label className="self-test-answer">
        Jawaban / catatan percobaanmu
        <textarea
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder="Tulis hasil pikiranmu dulu. Tidak harus sempurna, yang penting kamu mencoba menjelaskan dengan bahasa sendiri."
        />
      </label>

      <div className="self-test-checklist">
        {test.checklist.map((item, index) => (
          <label className="check-line" key={item}>
            <input
              type="checkbox"
              checked={Boolean(checkedItems[index])}
              onChange={(event) => setCheckedItems({ ...checkedItems, [index]: event.target.checked })}
            />
            {item}
          </label>
        ))}
      </div>

      <div className="self-test-actions">
        <button type="button" className="checkpoint-reveal-button" onClick={() => setShowSample((open) => !open)}>
          {showSample ? 'Sembunyikan contoh arahan' : 'Bandingkan dengan arahan'}
        </button>
        <PixelButton type="button" disabled={!canComplete} onClick={onComplete}>
          {completed ? '✓ Tes mandiri selesai' : 'Tandai tes mandiri selesai'}
        </PixelButton>
      </div>

      {showSample ? <p className="checkpoint-hint">{test.sample}</p> : null}
    </PixelCard>
  );
}
