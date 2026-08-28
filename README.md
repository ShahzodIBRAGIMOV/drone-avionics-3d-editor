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

Komponentlar avtomatik joylashtirilmasligi kerak. Foydalanuvchi ularni TransformControls yordamida qo‘lda ko‘chiradi, aylantiradi va masshtablaydi.
