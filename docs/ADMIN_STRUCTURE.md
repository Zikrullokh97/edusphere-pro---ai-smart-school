# EduSphere Pro — Admin Arxitekturasi va Navigatsiya Strukturasi (docs/ADMIN_STRUCTURE.md)

**Versiya:** 3.0.0-PROD  
**Sana:** 2026-09-05  

---

## 1. Kanonik Admin Navigatsiya Daraxti

```text
ADMIN PANEL (Maktab Boshqaruvi)
│
├── 1. Boshqaruv Markazi (Dashboard / Control Center)
│   ├── Real vaqt KPI kartalari (1000 o‘quvchi, 70 o‘qituvchi, 26 sinf)
│   ├── Bugungi davomat va kechikishlar
│   ├── O‘quvchilar jins taqsimoti
│   └── Shoshilinch ogohlantirishlar (Xavf guruhi, past davomatli sinflar)
│
├── 2. Maktab Boshqaruvi (School Management Hub)
│   ├── Sinflar Ro‘yxati (Classes Directory — 1-A dan 11-B gacha)
│   ├── O‘quvchilar Boshqaruvi (Students Directory — 1000 o‘quvchi, IIN)
│   ├── O‘qituvchilar Boshqaruvi (Teachers Directory — 70 o‘qituvchi, soatlar)
│   ├── Foydalanuvchilar va Loginlar (Users Management)
│   ├── Fanlar Ro‘yxati (Subjects Directory — KAO 18 ta fani)
│   ├── O‘quv Yili va Choraklar (Academic Years Manager — 2026–2027)
│   └── Ota-onalar Boshqaruvi (Parents Directory)
│
├── 3. Akademik Jarayon & Darslar
│   ├── O‘quv Dasturi & Standartlar (KAO 11 / 12 yillik standartlar)
│   ├── Dars Rejalari (KTP & Lesson Plan Reviewer)
│   ├── Dars Jadvali (Master Schedule Manager — To‘qnashuvsiz)
│   ├── Elektron Jurnal (Electronic Journal — Davomat va Baholar)
│   └── Uy Vazifalari Nazorati (Homework Manager)
│
├── 4. Nazorat, Monitoring & AI
│   ├── Monitoring & Reytinglar (Admin Monitoring Hub — O‘quvchi/O‘qituvchi/Sinf)
│   ├── Xonalar va Laboratoriyalar Boshqaruvi (Rooms Directory)
│   ├── AI Analitika (AI Analytics View — Haqiqiy DB ma'lumotlari)
│   └── Davlat Hisobotlari (Report Builder — 73-ОШ va Davlat Tabeli)
│
└── 5. Aloqa, Xavfsizlik & Tizim
    ├── Xabarnomalar Markazi (Announcement Center)
    ├── Audit Jurnali (Audit Logs Viewer — O‘zgarmas xavfsizlik loglari)
    ├── Xavfsizlik & Sessiyalar (Security Center — JWT va faol sessiyalar)
    ├── Tizim Salomatligi (System Health Monitor — DB, Auth, AI Gateway)
    ├── Zaxira va Tiklash (Backup & Recovery Manager)
    └── Tizim Sozlamalari (Settings Manager — UZ, KY, RU tillari)
```

---

## 2. Route va Komponent Zanjiri (1:1 Mapping)

Har bir sidebar va dashboard bo‘limi to‘g‘ridan-to‘g‘ri real komponent va backend API zanjiriga ega. Hech qanday soxta yoki bo‘sh sahifa mavjud emas.

