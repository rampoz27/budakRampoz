// Konten katalog ini STATIS (dikirim bareng aplikasi, bukan disimpen di
// Supabase) — yang disimpen di database cuma status checklist-nya
// (lihat lib/supabase/catalog-progress.ts), bukan isi tabelnya sendiri.

export interface CatalogRow {
  id: string; // stabil, dipake buat nyimpen status checklist per baris
  gejala: string;
  penyebab: string;
  konsep: string;
}

export interface CatalogTier {
  id: string;
  title: string;
  subtitle: string;
  rows: CatalogRow[];
}

export const CATALOG_TIERS: CatalogTier[] = [
  {
    id: 'tier1',
    title: 'TIER 1 — Fundamental / Sintaks',
    subtitle: 'Junior',
    rows: [
      { id: 't1-1', gejala: 'undefined is not a function / NoneType has no attribute', penyebab: 'Variabel belum di-assign atau salah scope', konsep: 'Null/Undefined Checking, Optional Chaining' },
      { id: 't1-2', gejala: 'Hasil perbandingan "10" == 10 beda-beda tergantung bahasa', penyebab: 'Type coercion', konsep: 'Strict Equality (===), Static Typing' },
      { id: 't1-3', gejala: 'Angka desimal hasil kalkulasi aneh (0.1 + 0.2 ≠ 0.3)', penyebab: 'Floating point precision', konsep: 'Decimal/BigDecimal type, rounding strategy' },
      { id: 't1-4', gejala: 'Infinite loop / recursion crash stack', penyebab: 'Kondisi berhenti salah/tidak ada', konsep: 'Base case, loop invariant' },
      { id: 't1-5', gejala: 'Off-by-one error (kurang/lebih 1 elemen di array)', penyebab: 'Index boundary salah', konsep: 'Boundary Testing' },
      { id: 't1-6', gejala: 'Variabel global ketimpa tanpa sengaja', penyebab: 'Scope tidak dijaga', konsep: 'Variable Scoping, Closures' },
      { id: 't1-7', gejala: 'Kode "hardcode" susah diubah', penyebab: 'Nilai ditulis langsung di logika', konsep: 'Constants, Config file' },
    ],
  },
  {
    id: 'tier2',
    title: 'TIER 2 — Logika & Data Handling',
    subtitle: 'Junior–Mid, ini area kuat kamu',
    rows: [
      { id: 't2-1', gejala: '"Rp 2,000" vs 2000 gagal dibandingkan', penyebab: 'Tipe data tidak konsisten dari input', konsep: 'Data Sanitization, Type Coercion Rules' },
      { id: 't2-2', gejala: 'Validasi lolos di frontend tapi data rusak di database', penyebab: 'Validasi hanya di client-side', konsep: 'Server-side Validation, Schema Validation (Zod/Valibot)' },
      { id: 't2-3', gejala: '>= dipakai padahal harusnya == (atau sebaliknya)', penyebab: 'Kesalahan operator pada nilai pasti', konsep: 'Boundary Condition Review' },
      { id: 't2-4', gejala: 'Field opsional bikin null pointer di tempat lain', penyebab: 'Tidak ada default value', konsep: 'Default Parameters, Nullable Type handling' },
      { id: 't2-5', gejala: 'Data tanggal beda-beda karena timezone', penyebab: 'Timezone tidak distandarkan', konsep: 'UTC Standardization, ISO 8601' },
      { id: 't2-6', gejala: 'Enkoding rusak (é jadi Ã©)', penyebab: 'Encoding tidak konsisten', konsep: 'UTF-8 Standardization' },
      { id: 't2-7', gejala: 'Sorting/searching lambat saat data banyak', penyebab: 'Algoritma naive (linear search di data besar)', konsep: 'Big-O Complexity, Indexing' },
    ],
  },
  {
    id: 'tier3',
    title: 'TIER 3 — Arsitektur Aplikasi',
    subtitle: 'Mid',
    rows: [
      { id: 't3-1', gejala: 'Ubah 1 fitur, fitur lain ikut rusak', penyebab: 'Logic bisnis campur dengan logic support', konsep: 'Separation of Concerns, Layered Architecture' },
      { id: 't3-2', gejala: 'Fungsi 1 file isinya 500 baris ngerjain segalanya', penyebab: 'Tidak ada pemisahan tanggung jawab', konsep: 'Single Responsibility Principle' },
      { id: 't3-3', gejala: 'Kode sulit di-test karena semua nyambung', penyebab: 'Dependency tidak di-inject', konsep: 'Dependency Injection, Mocking' },
      { id: 't3-4', gejala: 'Ganti 1 library bikin seluruh app harus diubah', penyebab: 'Coupling terlalu erat ke implementasi', konsep: 'Interface/Abstraction Layer' },
      { id: 't3-5', gejala: 'Error tidak jelas asalnya, cuma "500 Internal Server Error"', penyebab: 'Tidak ada structured error handling', konsep: 'Custom Error Classes, Centralized Error Handler' },
      { id: 't3-6', gejala: 'Config beda-beda tiap environment bikin bug "works on my machine"', penyebab: 'Config hardcoded', konsep: 'Environment Variables, .env management' },
      { id: 't3-7', gejala: 'Response API berubah bentuk-bentuk tanpa peringatan', penyebab: 'Tidak ada API contract', konsep: 'API Versioning, OpenAPI/Swagger' },
    ],
  },
  {
    id: 'tier4',
    title: 'TIER 4 — Concurrency & Database',
    subtitle: 'Mid–Senior, gap kamu sekarang',
    rows: [
      { id: 't4-1', gejala: 'Saldo/kuota jadi salah hitung saat traffic tinggi', penyebab: 'Dua proses baca-ubah-simpan bersamaan', konsep: 'Race Condition → Optimistic/Pessimistic Locking' },
      { id: 't4-2', gejala: 'User klik submit 2x, data ke-insert dobel', penyebab: 'Tidak ada penanda request unik', konsep: 'Idempotency Key' },
      { id: 't4-3', gejala: 'Transaksi setengah jalan, data jadi korup saat error di tengah', penyebab: 'Tidak ada rollback mekanisme', konsep: 'Database Transaction (BEGIN/COMMIT/ROLLBACK)' },
      { id: 't4-4', gejala: 'Dua transaksi saling tunggu selamanya', penyebab: 'Urutan locking berbeda antar proses', konsep: 'Deadlock, Lock Ordering' },
      { id: 't4-5', gejala: 'Baca data "basi" padahal sudah diubah proses lain', penyebab: 'Isolation level terlalu longgar', konsep: 'Transaction Isolation Levels (Read Committed, Serializable, dll)' },
      { id: 't4-6', gejala: 'Query lambat drastis saat data jutaan baris', penyebab: 'Tidak ada index / index salah', konsep: 'Database Indexing, Query Execution Plan' },
      { id: 't4-7', gejala: 'Notifikasi/report gagal bikin seluruh request lambat/timeout', penyebab: 'Proses berat dijalankan synchronous', konsep: 'Background Job, Message Queue (Redis/BullMQ)' },
      { id: 't4-8', gejala: 'Data hilang saat server mendadak mati', penyebab: 'Job antrian cuma di memory', konsep: 'Persistent Queue, Write-Ahead Log' },
      { id: 't4-9', gejala: 'Retry otomatis malah bikin efek dobel (kirim email 2x)', penyebab: 'Retry tidak idempotent', konsep: 'Idempotent Retry Design' },
    ],
  },
  {
    id: 'tier5',
    title: 'TIER 5 — Keamanan',
    subtitle: 'Mid–Senior',
    rows: [
      { id: 't5-1', gejala: 'User bisa ubah harga/nominal lewat inspect element', penyebab: 'Variabel krusial dipercaya dari client', konsep: 'Server-side Authoritative Data' },
      { id: 't5-2', gejala: 'Query database bisa "disuntik" perintah lain', penyebab: 'Input digabung langsung ke query string', konsep: 'SQL Injection → Parameterized Query/ORM' },
      { id: 't5-3', gejala: 'Script asing jalan di halaman web', penyebab: 'Input user ditampilkan mentah', konsep: 'XSS (Cross-Site Scripting) → Output Escaping' },
      { id: 't5-4', gejala: 'Request dari situs lain bisa eksekusi aksi tanpa izin', penyebab: 'Tidak ada validasi origin request', konsep: 'CSRF Token' },
      { id: 't5-5', gejala: 'Password tersimpan bisa dibaca kalau database bocor', penyebab: 'Password disimpan plain text', konsep: 'Hashing (bcrypt/argon2), Salting' },
      { id: 't5-6', gejala: 'Token API tidak pernah kadaluarsa', penyebab: 'Tidak ada expiry mechanism', konsep: 'JWT Expiry, Refresh Token Rotation' },
      { id: 't5-7', gejala: 'Endpoint bisa diakses tanpa login', penyebab: 'Middleware auth tidak konsisten', konsep: 'Authentication/Authorization Middleware' },
      { id: 't5-8', gejala: 'Rate limit tidak ada, API bisa di-spam', penyebab: 'Tidak ada pembatasan request', konsep: 'Rate Limiting, API Throttling' },
    ],
  },
  {
    id: 'tier6',
    title: 'TIER 6 — Skalabilitas & Distributed Systems',
    subtitle: 'Senior',
    rows: [
      { id: 't6-1', gejala: 'Server tunggal down, seluruh sistem mati', penyebab: 'Single point of failure', konsep: 'Load Balancing, Horizontal Scaling' },
      { id: 't6-2', gejala: 'Data beda antar server setelah replikasi', penyebab: 'Sinkronisasi tidak instan', konsep: 'Eventual Consistency, CAP Theorem' },
      { id: 't6-3', gejala: 'Cache nunjukin data lama setelah diupdate', penyebab: 'Cache tidak di-invalidate', konsep: 'Cache Invalidation Strategy' },
      { id: 't6-4', gejala: 'Sistem A gagal karena Sistem B lambat/down', penyebab: 'Dependency langsung antar service tanpa proteksi', konsep: 'Circuit Breaker, Timeout & Retry Policy' },
      { id: 't6-5', gejala: 'Log tersebar di banyak server, susah debug', penyebab: 'Tidak ada log terpusat', konsep: 'Centralized Logging (ELK, Loki)' },
      { id: 't6-6', gejala: 'Tidak tahu bagian mana yang lambat di request kompleks', penyebab: 'Tidak ada tracing lintas service', konsep: 'Distributed Tracing (OpenTelemetry)' },
      { id: 't6-7', gejala: 'Deploy baru bikin semua service down bersamaan', penyebab: 'Tidak ada strategi rollout bertahap', konsep: 'Blue-Green Deployment, Canary Release' },
      { id: 't6-8', gejala: 'Dua service beda tim saling break tiap ganti API', penyebab: 'Tidak ada kontrak yang dijaga', konsep: 'Contract Testing, Backward Compatibility' },
    ],
  },
  {
    id: 'tier7',
    title: 'TIER 7 — Arsitektur Level Senior/Staff/Architect',
    subtitle: '',
    rows: [
      { id: 't7-1', gejala: 'Fitur baru butuh waktu lama karena takut merusak yang lama', penyebab: 'Sistem terlalu monolitik & tidak modular', konsep: 'Modular Monolith, Bounded Context (DDD)' },
      { id: 't7-2', gejala: 'Tim lain harus nunggu tim lain selesai untuk deploy', penyebab: 'Deployment saling bergantung', konsep: 'Microservices Decoupling, Independent Deployability' },
      { id: 't7-3', gejala: 'Keputusan teknis lama tidak ada yang ingat alasannya', penyebab: 'Tidak terdokumentasi', konsep: 'Architecture Decision Record (ADR)' },
      { id: 't7-4', gejala: 'Sistem sulit diuji ulang alurnya setelah bug produksi', penyebab: 'Tidak ada event trail', konsep: 'Event Sourcing, Audit Log' },
      { id: 't7-5', gejala: 'Sulit menjamin data konsisten lintas beberapa service', penyebab: 'Transaksi tunggal tidak cukup lintas service', konsep: 'Saga Pattern, Two-Phase Commit' },
      { id: 't7-6', gejala: 'Biaya infrastruktur membengkak tanpa insight jelas', penyebab: 'Tidak ada observability cost-aware', konsep: 'Observability, Cost Monitoring' },
      { id: 't7-7', gejala: 'Sistem tidak tahan saat traffic naik 10x mendadak', penyebab: 'Tidak ada perencanaan kapasitas', konsep: 'Capacity Planning, Auto-scaling' },
      { id: 't7-8', gejala: 'Perubahan requirement bisnis butuh rombak besar', penyebab: 'Domain model tidak mencerminkan bisnis nyata', konsep: 'Domain-Driven Design (DDD)' },
      { id: 't7-9', gejala: 'AI atau developer baru "hilang arah" saat lanjutkan proyek', penyebab: 'Tidak ada dokumentasi arsitektur menyeluruh', konsep: 'System Design Document, Blueprint' },
    ],
  },
];

export const CATALOG_LEARNING_GUIDE = [
  'Cetak/screenshot, tandai baris yang pernah kamu alami tapi nggak tahu namanya — itu prioritas belajar tertinggi (kamu sudah punya konteksnya).',
  'Untuk baris yang belum pernah dialami, cukup hafal nama konsepnya dulu — jangan deep-dive sebelum ketemu kasusnya.',
  'Tiap ketemu kasus nyata di kerjaan, cocokkan ke tabel ini, baru deep-dive ke nama konsep yang cocok.',
  'Progres yang benar bukan "sudah baca semua baris", tapi "sudah pernah nge-debug real case dari tiap tier".',
];
