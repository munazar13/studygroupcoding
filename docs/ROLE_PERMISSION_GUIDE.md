# Role & Permission Guide — Study Group Coding Academy

Dokumen ini dibuat agar aturan akses admin/member tetap jelas ketika Firestore Rules makin ketat.

## Admin

Admin boleh:

- mengelola stage, materi, soal, reward, shop, challenge, final project, sertifikat, media, backup, dan health check;
- membaca data member untuk kebutuhan pengelolaan;
- membaca dan menulis collection internal seperti `courses`, `courseSections`, `questions`, `rewards`, `shopItems`, `challengeSubmissions`, `certificates`, dan `auditLogs`;
- melakukan import/export konten belajar.

Admin tidak sebaiknya memakai akun member biasa untuk mengedit data.

## Member

Member boleh:

- membaca konten belajar yang dipublikasikan;
- membaca dan mengubah data miliknya sendiri;
- menyimpan progress materi, quiz, catatan pribadi, bookmark materi, tes mandiri, dan mini project miliknya;
- mengirim laporan materi/soal;
- mengirim bukti challenge miliknya sendiri;
- melihat leaderboard dari `publicProfiles`, bukan dari dokumen lengkap `members`.

Member tidak boleh:

- membaca dokumen lengkap member lain;
- mengubah role/status dirinya sendiri;
- menulis konten belajar, reward, shop, sertifikat, atau data admin;
- membaca semua certificate secara list bebas.

## Data Publik

Data yang aman untuk publik/leaderboard:

- name
- avatar
- level
- totalXp
- currentStage
- activeTitle
- activeNameColor
- badge publik

Data yang tidak boleh dibuat publik:

- recoveryEmail
- privateNotes
- notifications pribadi
- detail internal progress penuh
- riwayat data sensitif lain

## Catatan Patch

Patch Learning UX V3 menambahkan progress tes mandiri dan mini project di dalam `stageProgress`. Field ini masih mengikuti pola progress member yang sudah ada. Untuk keamanan produksi penuh, reward, XP, koin, dan kelulusan idealnya diproses backend/Cloud Functions, bukan hanya frontend.
