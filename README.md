# Drone Avionics 3D Editor

Google AI Studio orqali rivojlantirish uchun tayyorlangan 3.5 metrli twin-motor UAV
avionika va kabel montaji muharriri.

## Ishlaydigan funksiyalar

- `+X`, `-X`, `+Y`, `-Y`, `+Z`, `-Z` ortografik texnik ko‘rinishlar.
- Kamera aylanishi qulflangan; zoom va pan ishlaydi.
- Shaffof, konturli va 3500 mm ga masshtablangan tasdiqlangan dron GLB modeli.
- Komponentlarni kutubxonadan qo‘shish va TransformControls bilan joylashtirish.
- Millimetrdagi X/Y/Z koordinatalari, gradusdagi burilish va masshtab nazorati.
- Port/pin ustidan boshlanadigan ko‘p nuqtali rangli kabel chizish.
- Kabel diametri va uzunligini millimetrda hisoblash.
- localStorage, JSON import/eksport va PNG eksport.
- Ranglari ichiga joylangan Holybro PM02D GLB modeli.

## Tarkib

- public/models/* — brauzerga tayyor OBJ va rangli GLB avionika modellari.
- public/data/component_manifest.csv — komponentlar ro‘yxati va miqdorlari.
- public/data/model-assets.json — barcha 3D assetlar indeksi.
- public/model-parts/*.b64 — katta modellar gzip/base64 qismlari.
- src/modelAssetLoader.ts — qismlarni brauzerda asl GLB/STL/OBJ ko‘rinishiga qaytaruvchi loader.
- AI_STUDIO_PROMPT_UZ.md — AI Studio uchun asosiy topshiriq.

## AI Studio

1. Repository’ni GitHub hisobingizga yuklang.
2. Google AI Studio Apps sahifasida Import from GitHub ni tanlang.
3. Shu repository’ni import qiling.
4. AI_STUDIO_PROMPT_UZ.md ichidagi promptni yuboring.

Komponentlar avtomatik joylashtirilmaydi. Foydalanuvchi ularni TransformControls
yordamida qo‘lda ko‘chiradi, aylantiradi va masshtablaydi. Kamera erkin aylanmaydi;
texnik ko‘rinish yuqoridagi o‘q tugmalari bilan tanlanadi.

Holybro PM02D original SolidWorks geometriyasidan GLB formatiga konvertatsiya qilingan
va uning material ranglari fayl ichida saqlanadi. P3737 detailed assembly foydalanuvchi
tomonidan loyiha Jetson kompyuteri sifatida qabul qilingan.

Manifest inventarning yagona manbasi: 20 turdagi, jami 32 dona fizik komponentdan
ortiq nusxa yaratilmaydi. Sahnadan chiqarilgan komponent inventarga qaytadi.

Kabel faqat datasheet yoki original CAD bilan tasdiqlangan, ko‘rinadigan 3D pin va
portga elektr ulanish sifatida belgilanadi. Tasdiqlanmagan sirt nuqtasi elektr porti
deb ko‘rsatilmaydi.

Jetsonning yagona asset identifikatori `jetson-p3737`. Loyihada Jetson uchun OBJ,
procedural, primitive yoki fallback model yaratilmaydi.
