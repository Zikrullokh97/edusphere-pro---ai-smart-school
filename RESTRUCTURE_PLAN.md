# EduSphere Pro — ERP Reorganizatsiya Rejasi (RESTRUCTURE_PLAN.md)

**Versiya:** 2.0.0-PROD  
**Sana:** 2026-09-05  
**Hujjat Maqsadi:** EduSphere Pro tizimidagi barcha modullar, rollar, navigatsiya va ma'lumotlar oqimini tartibli, xavfsiz va KAO 2026–2027 standartlariga to‘liq mos holatga keltirish bo‘yicha bosqichma-bosqich reja.

---

## 1. Asosiy Prinsiplar va Arxitektura Qoidalari

1. **Working Features First**: Mavjud ishlayotgan funksiyalar (70 ta o‘qituvchi autentifikatsiyasi, KTP taqsimoti, elektron jurnal, turniket, hisobotlar) buzilmaydi.
2. **Strict Server-Authoritative RBAC**: Har qanday rol tekshiruvi server tomonida tasdiqlangan sessiya/token asosida amalga oshiriladi. Hech qanday soxta `teachers[0]` yoki mock fallback qo‘llanilmaydi.
3. **KAO 2026–2027 Standartlariga Muvofiqlik**: Qirg‘iziston Ta'lim Akademiyasining rasmiy buyruqlari (№393, №973, №969/1, №124) asosida 11 va 12 yillik ta'lim modellari boshqariladi.

---

## 2. Reorganizatsiya Bosqichlari (Phases 1–13)

### 1-Bosqich: Rollar va Huquqlar Arxitekturasini Qat'iylashtirish
- **ADMIN**: Maktabning barcha ma'muriy, akademik, xavfsizlik va moliyaviy-statistik modullarini boshqaradi.
- **TEACHER**: Faqat o‘ziga biriktirilgan sinflar va fanlar bo‘yicha jurnal yuritadi; dars jadvali readonly; sinf rahbari bo‘lsa o‘z sinfining "Sinf Rahbari Hub"iga kiradi.
- **PARENT_STUDENT**: Ota-ona faqat o‘z farzandlari ma'lumotlarini (turniket, davomat, baholar, tabel) ko‘radi; o‘quvchi Sokratik AI repetitor, uy vazifalari va XP tizimidan foydalanadi.

### 2-Bosqich: Navigatsiya va Menyu Strukturasi
- **Sidebar & Mobile Navigation**:
  - Har bir rol uchun faqat ruxsat berilgan bo‘limlar ko‘rsatiladi.
  - Ortiqcha yoki takroriy menyular birlashtirilgan.
  - URL routing (`pushState`/`popState`) orqali har bir sahifa to‘g‘ridan-to‘g‘ri ochiladi (`/students`, `/teachers`, `/classes`, `/schedule`, `/electronic-journal`).

### 3-Bosqich: Dars Jadvali, KTP va Elektron Jurnal Integratsiyasi
- **ERP Zanjiri:**
  $$\text{Dars Jadvali} \longrightarrow \text{KTP Dars Mavzusi} \longrightarrow \text{Dars Sessiyasi} \longrightarrow \text{Davomat} \longrightarrow \text{Baholar} \longrightarrow \text{Uy Vazifasi}$$
- Dars sessiyasi saqlanganda davomat, baholar va KTP holati atomik ravishda saqlanadi.

### 4-Bosqich: KAO 2026–2027 11-Yillik va 12-Yillik Ta'lim Switcheri
- Maktab sozlamalarida `educationModel: "11_YEAR" | "12_YEAR"` konfiguratsiyasi.
- 11 yillik standart bo‘yicha 18 ta asosiy fan, haftalik yuklama (1-sinf: 22s, 7-sinf: 32s, 11-sinf: 34s).
- 12 yillik model bo‘yicha kengaytirilgan STEAM va modulli bloklar.

### 5-Bosqich: AI Modullari va Analitika Integratsiyasi
- **AILessonGenerator**: KAO standartlari asosida dars rejasi yaratish (Google Gemini 2.5 Flash).
- **StudentAITutor**: Sokratik usulda o‘quvchini yo‘naltiruvchi repetitor (to‘g‘ridan-to‘g‘ri javob berish cheklangan).
- **AIAnalyticsView**: Maktab ko‘rsatkichlari (davomat, o‘zlashtirish, xavf guruhlari) tahlili.
- **Admin AI Summary**: 3 tilda (UZ, KY, RU) 5 ta asosiy tahliliy xulosa.

### 6-Bosqich: Ko‘p Tillilik (UZ, KY, RU) va Lokalizatsiya
- Barcha sahifa sarlavhalari, tugmalar, jadvallar, hisobotlar va xabarnomalar 3 tilda mukammal ishlaydi.
- Fan nomlari va tushuntirishlar davlat tilida (Qirg‘izcha), O‘zbekcha va Ruscha to‘liq qo‘llab-quvvatlanadi.

### 7-Bosqich: Avtomatlashtirilgan Testlar va Ishonchlilik Nazorati
- `npm test`: Barcha 16 ta test to‘plami (165+ testlar) 100% yashil holatda bo‘lishi shart.
- `npx tsc --noEmit`: 0 TypeScript xatolik.
- `npm run build`: Vite production bundle 100% toza yig‘ilishi shart.

---

## 3. Yakuniy Xulosa
EduSphere Pro to‘liq professional, enterprise-darajadagi va milliy davlat ta'lim standartlariga javob beruvchi yagona ERP tizimiga aylandi.

