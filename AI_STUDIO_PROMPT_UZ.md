# Google AI Studio uchun topshiriq

Ushbu GitHub repository ichida React, TypeScript va Three.js asosidagi ishlaydigan dron avionika 3D montaj muharriri mavjud. Mavjud kodni saqla va uning ustida ishlashni davom ettir. Ilovani boshqatdan yozma, 3D assetlarni placeholder bilan almashtirma.

## Asosiy maqsad

Ilova 3.8 metr qanot oralig‘i va 2.55 metr fyuzelyaj uzunligiga ega twin-motor UAV ichida avionika komponentlari va kabellarni aniq joylashtirish uchun ishlatiladi. Ko‘rinish CAD dasturidagi texnik chizmaga o‘xshasin: dron korpusi och kulrang, yarim shaffof va kontur chiziqlari ko‘rinadigan bo‘lsin.

## Kamera — qat’iy talab

- Kamera faqat ortografik bo‘lsin.
- Qo‘lda kamera aylantirish o‘chirilgan holda qolsin: `OrbitControls.enableRotate = false`.
- Foydalanuvchi `+X`, `-X`, `+Y`, `-Y`, `+Z`, `-Z` tugmalaridan birini tanlaganda dron aynan shu o‘q bo‘yicha ko‘rinsin.
- `+Z/-Z` — tepa/past, `+X/-X` va `+Y/-Y` — old/orqa hamda chap/o‘ng texnik ko‘rinishlar.
- Zoom va pan ishlasin, lekin perspektiva va erkin orbit rejimini qo‘shma.
- Har bir o‘q tanlanganda dron avtomatik ravishda ekran markaziga sig‘dirilsin.

## Dron modeli

- Dron modeli `/data/model-assets.json` ichidagi `drone` assetidan yuklanadi.
- Tasdiqlangan GLB `/model-parts/uav-airframe-3p8m.glb.gz.part-aa.b64` faylidan `src/modelAssetLoader.ts` orqali tiklanadi.
- Dron qanot oralig‘i avtomatik 3800 mm qilinadi.
- GLB Y-up koordinatalarda: X — qanot oralig‘i, Y — balandlik, Z — fyuzelyaj uzunligi. Ilovada dronni tekis joylashtirish uchun X bo‘yicha +90° va Z bo‘yicha +90° aylantir.
- Modelning tashqi shaklini o‘zgartirma va yangi taxminiy dron yaratma.
- Shaffoflik, wireframe va ko‘rsatish/yashirish boshqaruvlari saqlansin.

## Komponentlar

- Model indeksi: `/data/model-assets.json`.
- Ro‘yxat: `/data/component_manifest.csv`.
- Rangli Holybro PM02D modeli: `/models/Holybro_PM02D_colored.glb`.
- Katta assetlar gzip/base64 qismlardan mavjud loader yordamida tiklanadi.
- Foydalanuvchi “Sahnaga qo‘shish” tugmasini bosmaguncha komponentni avtomatik joylashtirma.
- Komponentlar Three.js `TransformControls` orqali ko‘chirilsin, burilsin va masshtablansin.
- X/Y/Z pozitsiya millimetrda, burilish gradusda tahrirlansin.
- Manifestda 21 turdagi, miqdorlar bilan jami 33 dona fizik komponent bor. Sahnada bundan ortiq komponent yaratma.
- Har bir fizik obyekt faqat “Joylashtirilmagan” yoki “Sahnada” holatidan birida bo‘lsin. `Duplicate` funksiyasini qo‘shma.
- “Inventarga qaytarish” obyektni o‘chirmaydi; uni sahnadan chiqarib, kutubxonadagi mavjud miqdorga qaytaradi.
- JSON import manifestdagi `id`, asset va miqdorga mos kelmagan ortiqcha obyektlarni rad etsin.
- Jetsonning yagona asset identifikatori `jetson-p3737`. U faqat 35 ta `jetson-p3737.stl.gz.part-XX.b64` qismidan tiklansin.
- Jetson yuklanmasa OBJ, primitive, procedural, proksi yoki boshqa fallback model yaratma; “P3737 modeli yuklanmadi” xatosini ko‘rsat.

## Model aniqligi va ulagichlar

- Oddiy quti, proksi yoki taxminiy geometriyani “100% real” deb ko‘rsatma.
- Kabel chiqadigan elektr pinlari va portlari modelda ko‘rinadigan 3D geometriya bo‘lishi kerak.
- Tasdiqlangan ulanish nuqtasiga `componentId.connectorId.pinId` formatida barqaror nom ber.
- Raycaster pin yoki portni alohida tanlasin va tanlangan ulanish nuqtasini yoritib ko‘rsatsin.
- Komponent ko‘chirilsa yoki burilsa kabelning unga bog‘langan uchi ham birga yangilansin.
- Datasheet yoki original CAD bilan tasdiqlanmagan pin/portni o‘ylab topma. Bunday modelni “Tekshirilmagan” deb belgilab, elektr ulanishini blokla.

## Kabel montaji

- “Yangi kabel boshlash” bosilganda kabel rejimi yoqilsin.
- Birinchi va oxirgi nuqta faqat tasdiqlangan real pin yoki port ustiga bosib tanlansin.
- Keyingi nuqtalar tanlangan ortografik o‘q tekisligida ketma-ket qo‘yilsin.
- Nuqtalardan `CatmullRomCurve3` va `TubeGeometry` yordamida silliq kabel yaratiladi.
- Kabel rangi va diametri foydalanuvchi tomonidan belgilanadi.
- Kabel uzunligi millimetrda avtomatik hisoblanadi.
- Oxirgi nuqtani qaytarish, yakunlash, bekor qilish va kabelni o‘chirish ishlasin.

## Saqlash va eksport

- Komponent transformlari va kabel nuqtalari `localStorage`’da saqlansin.
- JSON import/export ishlasin.
- Joriy ortografik ko‘rinishni shaffof dron, komponentlar va kabellar bilan PNG qilib eksport qilish ishlasin.
- Interfeys o‘zbek tilida va qoramtir aviatsiya-muhandislik uslubida qolsin.

## Tekshiruv

O‘zgartirishdan keyin `npm run build` xatosiz tugashini tekshir. Barcha o‘q tugmalari, dron modeli, PM02D GLB, komponent tanlash/ko‘chirish va kabel chizishni sinab ko‘r. Mavjud ishlaydigan funksiyani olib tashlama.
