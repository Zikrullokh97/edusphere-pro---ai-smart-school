# EduSphere Pro — RBAC Huquqlar Matritsasi (ROLE_PERMISSION_MATRIX.md)

**Versiya:** 3.0.0-PROD  
**Sana:** 2026-09-05  

---

## 1. 3 Asosiy Rol va Ularning Chegaralari (Scope)

```text
┌─────────────────────────────────────────────────────────────┐
│                           ADMIN                             │
│                       (SCHOOL SCOPE)                        │
│   To‘liq maktab boshqaruvi, barcha o‘quvchilar, xodimlar,   │
│       sinflar, jadval, monitoring, xavfsizlik, hisobotlar   │
└──────────────────────────────┬──────────────────────────────┘
                               │
       ┌───────────────────────┴───────────────────────┐
       ▼                                               ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│           TEACHER           │ │           PARENT            │
│  (ASSIGNED TEACHING SCOPE)  │ │        (CHILD SCOPE)        │
│ Faqat biriktirilgan sinflar │ │ Faqat o‘z farzandlarining   │
│  va fanlar bo‘yicha jurnal  │ │  turniket, davomat, baho va │
│    yuritish; Jadval readonly│ │   jadval ma'lumotlari       │
└─────────────────────────────┘ └─────────────────────────────┘
```

---

## 2. To‘liq RBAC Matritsasi

| Resurs / Harakat | ADMIN | TEACHER | PARENT / STUDENT | Xavfsizlik Qoidasi / Bloklash Mexanizmi |
|:---|:---:|:---:|:---:|:---|
| **Maktab KPI va Umumiy Statistika** | ✅ To‘liq | ❌ Taqiq | ❌ Taqiq | Boshqa rollar uchun `403 Forbidden` |
| **O‘quvchilar Ro‘yxatini Ko‘rish** | ✅ To‘liq | ✅ Ko‘rish | ❌ Faqat o‘z bolasi | O‘qituvchi barcha o‘quvchilarni ko‘ra oladi, lekin faqat o‘z sinfini baholaydi |
| **O‘quvchi Yaratish / Tahrirlash** | ✅ To‘liq | ❌ Taqiq | ❌ Taqiq | Faqat Admin o‘quvchi qo‘sha oladi / sinfini o‘zgartiradi |
| **O‘qituvchilar Ro‘yxati va Stavkalari** | ✅ To‘liq | ✅ Profil | ❌ Taqiq | O‘qituvchi faqat o‘z profilini ko‘radi/tahrirlaydi |
| **Dars Jadvalini Tuzish / Tahrirlash** | ✅ To‘liq | ❌ Read-Only | ❌ Read-Only | Jadval o‘zgarishini faqat Admin amalga oshiradi (403 guard) |
| **Dars Jadvalini Ko‘rish** | ✅ To‘liq | ✅ To‘liq | ✅ Faqat o‘z sinfi | Ota-ona va o‘quvchi faqat o‘z sinfining dars jadvalini ko‘radi |
| **Elektron Jurnal (Davomat & Baho Qo‘yish)** | ✅ To‘liq | ✅ O‘z darslari | ❌ Taqiq | O‘qituvchi begona dars/sinfga baho qo‘ysa `403 Forbidden` |
| **Yopiq Choraqqa Baho Qo‘yish** | ✅ Ruxsat | ❌ Taqiq | ❌ Taqiq | Chorak yopilgach o‘qituvchi bahoni o‘zgartira olmaydi |
| **Dars Rejalari (KTP) Yuklash** | ✅ To‘liq | ✅ O‘z fani | ❌ Taqiq | O‘qituvchi o‘z fani bo‘yicha KTP yuklaydi |
| **KTP Tasdiqlash / Rad Etish** | ✅ To‘liq | ❌ Taqiq | ❌ Taqiq | Faqat Admin/Metodist KTP ni tasdiqlaydi |
| **Uy Vazifasi Yaratish** | ✅ To‘liq | ✅ O‘z fani | ❌ Taqiq | O‘qituvchi o‘z sinfiga vazifa yuklaydi |
| **Uy Vazifasi Topshirish** | ❌ Taqiq | ❌ Taqiq | ✅ O‘quvchi | O‘quvchi o‘z vazifasini topshiradi |
| **Sokratik AI Repetitor** | ✅ Test | ❌ Taqiq | ✅ Ruxsat | O‘quvchi fanlar bo‘yicha tushuntirish oladi |
| **Forma 73-ОШ va Hisobotlar** | ✅ To‘liq | ✅ O‘z sinfi | ❌ Taqiq | Maktab miqyosidagi hisobot faqat Adminga ochiq |
| **Xavfsizlik Audit Loglari** | ✅ To‘liq | ❌ Taqiq | ❌ Taqiq | Audit loglar o‘zgarmas (immutable) |
| **Zaxira Nusxa (Backup) Yaratish** | ✅ To‘liq | ❌ Taqiq | ❌ Taqiq | Faqat Admin zaxira yarata oladi va tiklay oladi |

---

## 3. Xulosa
Server-authoritative RBAC qat'iyan ta'minlangan. Har qanday noqonuniy so‘rov server tomonida to‘xtatiladi.

