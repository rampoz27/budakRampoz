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
  {
    id: 'tier8',
    title: 'TIER 8 — Frontend & UI Engineering',
    subtitle: 'Junior–Mid, domain berbeda dari backend',
    rows: [
      { id: 't8-1', gejala: 'Komponen re-render terus tanpa alasan jelas, app jadi lag', penyebab: 'State/props berubah referensi tiap render', konsep: 'Memoization (useMemo/useCallback/React.memo)' },
      { id: 't8-2', gejala: 'Data lama masih kelihatan padahal sudah update di server', penyebab: 'Cache client-side tidak di-invalidate', konsep: 'Client-side Cache Invalidation (React Query/SWR)' },
      { id: 't8-3', gejala: 'Tampilan beda-beda di tiap browser', penyebab: 'CSS/JS API tidak didukung merata', konsep: 'Cross-browser Compatibility, Polyfill' },
      { id: 't8-4', gejala: 'Layar "lompat-lompat" saat gambar/konten baru dimuat', penyebab: 'Dimensi elemen tidak direservasi', konsep: 'Cumulative Layout Shift (CLS), Skeleton Loading' },
      { id: 't8-5', gejala: 'Form kosong lagi setelah refresh tanpa sengaja', penyebab: 'State tidak dipersist', konsep: 'Local Storage/Session Persistence, Form State Management' },
      { id: 't8-6', gejala: 'Race condition antar API call, data yang tampil ketuker', penyebab: 'Response call lama masuk belakangan (out-of-order)', konsep: 'Request Cancellation, Stale Response Guard' },
      { id: 't8-7', gejala: 'Aplikasi tidak bisa dipakai screen reader/keyboard-only', penyebab: 'Tidak ada semantic HTML/ARIA', konsep: 'Web Accessibility (a11y)' },
      { id: 't8-8', gejala: 'Bundle size membengkak, loading awal lama', penyebab: 'Semua kode dimuat sekaligus', konsep: 'Code Splitting, Lazy Loading, Tree Shaking' },
    ],
  },
  {
    id: 'tier9',
    title: 'TIER 9 — Mobile-specific',
    subtitle: 'Mid, khas platform mobile',
    rows: [
      { id: 't9-1', gejala: 'App tiba-tiba force close tanpa error jelas di log', penyebab: 'Memory leak / OOM (Out of Memory)', konsep: 'Memory Profiling, Lifecycle-aware Component' },
      { id: 't9-2', gejala: 'Fitur jalan normal di 1 device, crash di device lain', penyebab: 'Fragmentasi OS version/hardware', konsep: 'Platform Fragmentation Testing' },
      { id: 't9-3', gejala: 'Data hilang saat app dipindah ke background lalu dibuka lagi', penyebab: 'State tidak disimpan saat lifecycle berubah', konsep: 'App Lifecycle Handling, State Restoration' },
      { id: 't9-4', gejala: 'Aksi user (misal transfer) hilang saat koneksi putus mendadak', penyebab: 'Tidak ada penanganan offline', konsep: 'Offline-first Design, Local Queue Sync' },
      { id: 't9-5', gejala: 'Baterai device boros drastis pas pakai app tertentu', penyebab: 'Background process/polling berlebihan', konsep: 'Battery-aware Background Task, Push Notification vs Polling' },
      { id: 't9-6', gejala: 'Update app di store ditolak Apple/Google', penyebab: 'Melanggar guideline platform (izin, privasi, dsb)', konsep: 'App Store/Play Store Review Guidelines' },
    ],
  },
  {
    id: 'tier10',
    title: 'TIER 10 — Data & Machine Learning Pipeline',
    subtitle: 'Mid–Senior, domain berbeda dari CRUD app',
    rows: [
      { id: 't10-1', gejala: 'Model akurat saat testing, buruk saat dipakai user asli', penyebab: 'Data training tidak representatif kondisi nyata', konsep: 'Training/Serving Skew, Data Drift' },
      { id: 't10-2', gejala: 'Pipeline data jalan, tapi hasil akhirnya salah tanpa error', penyebab: 'Data corrupt/hilang di tengah proses tanpa validasi', konsep: 'Data Quality Checks, Schema Validation on Pipeline' },
      { id: 't10-3', gejala: 'Model bagus untuk grup mayoritas, buruk untuk grup minoritas', penyebab: 'Bias pada data training', konsep: 'Model Fairness, Bias Detection' },
      { id: 't10-4', gejala: 'Model performanya menurun pelan-pelan seiring waktu', penyebab: 'Pola data berubah, model tidak di-retrain', konsep: 'Model Monitoring, Retraining Pipeline' },
      { id: 't10-5', gejala: 'Job pemrosesan data jalan 10 jam, harusnya bisa lebih cepat', penyebab: 'Proses tidak diparalelkan/di-batch', konsep: 'Batch Processing, Parallelization (Spark/Dask)' },
      { id: 't10-6', gejala: 'Eksperimen model tidak bisa direproduksi hasil yang sama', penyebab: 'Versi data/parameter tidak dicatat', konsep: 'Experiment Tracking, Data Versioning (MLflow/DVC)' },
    ],
  },
  {
    id: 'tier11',
    title: 'TIER 11 — DevOps & Infrastructure',
    subtitle: 'Mid–Senior',
    rows: [
      { id: 't11-1', gejala: '"Works on my machine" tapi gagal di server produksi', penyebab: 'Environment tidak konsisten antar mesin', konsep: 'Containerization (Docker), Infrastructure as Code' },
      { id: 't11-2', gejala: 'Deploy baru gagal setengah jalan, sistem jadi campur versi lama-baru', penyebab: 'Tidak ada strategi deployment yang aman', konsep: 'Rolling Update, Health Check sebelum Cutover' },
      { id: 't11-3', gejala: 'Container tiba-tiba mati sendiri berulang kali', penyebab: 'Resource limit terlalu kecil / crash loop', konsep: 'Resource Requests/Limits, Crash Loop Debugging (Kubernetes)' },
      { id: 't11-4', gejala: 'Baru sadar server down setelah user komplain', penyebab: 'Tidak ada monitoring/alerting', konsep: 'Monitoring & Alerting (Prometheus/Grafana), SLO/SLA' },
      { id: 't11-5', gejala: 'Secret/API key ketahuan bocor di repository publik', penyebab: 'Credential disimpan di kode, bukan secret manager', konsep: 'Secrets Management (Vault, environment secrets)' },
      { id: 't11-6', gejala: 'Backup ada, tapi pas dicoba restore ternyata gagal/corrupt', penyebab: 'Backup tidak pernah diuji restore-nya', konsep: 'Disaster Recovery Testing, Backup Verification' },
      { id: 't11-7', gejala: 'Tagihan cloud membengkak tanpa penjelasan jelas bulan ini', penyebab: 'Resource idle tidak dimatikan / auto-scaling tidak terkontrol', konsep: 'Cost Monitoring, Resource Right-sizing' },
    ],
  },
  {
    id: 'tier12',
    title: 'TIER 12 — Low-level & Embedded Systems',
    subtitle: 'Senior, domain khusus (di luar web/app biasa)',
    rows: [
      { id: 't12-1', gejala: 'Program crash acak, kadang jalan kadang tidak (di C/C++)', penyebab: 'Akses memori yang sudah dibebaskan', konsep: 'Use-after-free, Memory Safety' },
      { id: 't12-2', gejala: 'Program pelan-pelan makan RAM sampai habis', penyebab: 'Memory dialokasikan tapi tidak pernah dibebaskan', konsep: 'Memory Leak, Manual Memory Management' },
      { id: 't12-3', gejala: 'Nilai variabel berubah sendiri tanpa alasan (di sistem embedded)', penyebab: 'Dua proses/interrupt akses memori sama tanpa proteksi', konsep: 'Interrupt Safety, Atomic Operations' },
      { id: 't12-4', gejala: 'Program jalan beda hasil di compiler/optimasi berbeda', penyebab: 'Undefined Behavior dalam bahasa (C/C++)', konsep: 'Undefined Behavior Awareness, Compiler Flags/Sanitizers' },
      { id: 't12-5', gejala: 'Perangkat hang total dan harus restart manual', penyebab: 'Tidak ada mekanisme recovery otomatis', konsep: 'Watchdog Timer' },
      { id: 't12-6', gejala: 'Program terlalu lambat merespons sinyal real-time (misal sensor)', penyebab: 'Latency tidak terjamin', konsep: 'Real-time Constraints, Deterministic Scheduling' },
    ],
  },
];

export const CATALOG_LEARNING_GUIDE = [
  'Cetak/screenshot, tandai baris yang pernah kamu alami tapi nggak tahu namanya — itu prioritas belajar tertinggi (kamu sudah punya konteksnya).',
  'Untuk baris yang belum pernah dialami, cukup hafal nama konsepnya dulu — jangan deep-dive sebelum ketemu kasusnya.',
  'Tiap ketemu kasus nyata di kerjaan, cocokkan ke tabel ini, baru deep-dive ke nama konsep yang cocok.',
  'Progres yang benar bukan "sudah baca semua baris", tapi "sudah pernah nge-debug real case dari tiap tier".',
];
