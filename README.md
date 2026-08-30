# Drone Avionics 3D Editor

Google AI Studio orqali rivojlantirish uchun tayyorlangan 3.5 metrli twin-motor UAV loyihasi.

## Tarkib

- public/models/drone.stl — original dron modeli.
- public/models/*.obj — brauzerga tayyor avionika modellari.
- public/data/component_manifest.csv — komponentlar ro‘yxati va miqdorlari.
- public/data/model-assets.json — barcha 3D assetlar indeksi.
- public/model-parts/*.b64 — katta modellar gzip/base64 qismlari.
- src/modelAssetLoader.ts — qismlarni brauzerda asl STL/OBJ ko‘rinishiga qaytaruvchi loader.
- AI_STUDIO_PROMPT_UZ.md — AI Studio uchun asosiy topshiriq.

## AI Studio

1. Repository’ni GitHub hisobingizga yuklang.
2. Google AI Studio Apps sahifasida Import from GitHub ni tanlang.
3. Shu repository’ni import qiling.
4. AI_STUDIO_PROMPT_UZ.md ichidagi promptni yuboring.

Komponentlar avtomatik joylashtirilmasligi va ko‘paytirilmasligi kerak. Manifestda 20 turdagi, miqdorlar bilan jami 32 dona fizik komponent bor. Foydalanuvchi ularni TransformControls yordamida qo‘lda ko‘chiradi, aylantiradi va masshtablaydi.

Kabel faqat datasheet yoki original CAD bilan tasdiqlangan, ko‘rinadigan 3D pin va portlarga ulanishi kerak. Tasdiqlanmagan ulanish nuqtasi o‘ylab topilmaydi va model “100% real” deb belgilanmaydi.

Jetson uchun foydalanuvchi qabul qilgan `00_top_lvl_p3737_01142022.stp` asosidagi batafsil P3737 modeli ishlatiladi. Model GitHub cheklovlariga mos ravishda gzip/base64 qismlariga bo‘lingan va loader orqali asl STL geometriyasiga tiklanadi.
