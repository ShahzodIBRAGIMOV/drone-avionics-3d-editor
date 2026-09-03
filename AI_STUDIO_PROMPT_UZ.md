# AI Studio topshirig‘i

Ushbu repository asosida React, TypeScript va Three.js bilan interaktiv dron avionika joylashtirish muharririni yarat.

## Modellardan foydalanish

- Modellarning to‘liq indeksi: /data/model-assets.json
- Kichik modellar /models ichida, katta modellar /model-parts ichida gzip/base64 qismlarga bo‘lingan.
- src/modelAssetLoader.ts dagi loadModelIndex va loadModelAsset funksiyalaridan foydalan.
- Katta modellarni o‘zing qayta yozma; loader qismlarni birlashtirib DecompressionStream orqali asl STL/OBJ geometriyasini tiklaydi.
- Ro‘yxat: /data/component_manifest.csv
- Hech qanday placeholder model yaratma.
- Manifestda 20 turdagi komponent va quantity ustuni bo‘yicha jami 32 dona fizik obyekt bor. Sahnada bundan ortiq komponent yaratma.
- Faqat manifestdagi id va quantity qiymatlarini inventarning yagona manbasi deb ol. Ro‘yxatda yo‘q komponentni qo‘shma.
- Bir turdagi komponent uchun aynan quantity miqdorida nusxa yarat; ortiqcha avtomatik nusxa, demo obyekt va test geometriyasi yaratma.
- “Duplicate” funksiyasini qo‘shma. “Remove” komponentni inventardan yo‘q qilmasin, faqat sahnadan “Joylashtirilmagan komponentlar” paneliga qaytarsin.
- Dron qanot oralig‘ini 3500 mm qil.
- Komponentlarni avtomatik joylashtirma.

## Model aniqligi, pinlar va portlar

- Oddiy quti, taxminiy korpus, rangli blok yoki proksi geometriyani 100% real model deb ko‘rsatma.
- Har bir komponent ishlab chiqaruvchining aynan ro‘yxatda ko‘rsatilgan modeli ko‘rinishiga, o‘lchamiga va ulagich joylashuviga mos bo‘lsin.
- Modelda mavjud barcha tashqi elektr pinlari va portlari ko‘rinadigan geometriya bo‘lsin: quvvat, GND, signal, PWM/servo, CAN, UART, USB, Ethernet, HDMI, antennalar va boshqa real ulagichlar.
- Pin yoki portlarni korpus ichiga yashirma va tekstura bilan soxta chizma sifatida ko‘rsatma. Kabel chiqadigan kontakt yuzasi 3D geometriya bo‘lishi kerak.
- Har bir ulanish nuqtasiga barqaror nom ber: `componentId.connectorId.pinId`. Masalan: `19.usb-c.port`, `02.can1.h`, `02.can1.l`.
- Raycaster bilan pin yoki portni alohida tanlash mumkin bo‘lsin. Tanlangan ulanish nuqtasi yoritilsin va nomi o‘ng panelda ko‘rinsin.
- Kabel aynan tanlangan pin/port koordinatasidan boshlansin. Komponent ko‘chirilsa yoki aylantirilsa kabelning boshlanish nuqtasi komponent bilan birga yangilansin.
- Datasheet yoki original CAD bilan tasdiqlanmagan port/pinni o‘ylab topma. Tasdiqlanmagan modelni “Tekshirilmagan” deb belgilab, kabel ulashni blokla.
- Jetson assetining yagona ruxsat etilgan identifikatori `jetson-p3737`. Uni `/data/model-assets.json` indeksidan yukla.
- Jetson uchun faqat 35 ta `jetson-p3737.stl.gz.part-XX.b64` qismidan tiklanadigan, foydalanuvchi qabul qilgan P3737 modeli ishlatilsin.
- Jetson yuklanmasa hech qanday eski OBJ, procedural radiator, oddiy quti, primitive, proxy yoki fallback geometriya yaratma. Jetsonni sahnaga qo‘shma va foydalanuvchiga “P3737 modeli yuklanmadi” xatosini ko‘rsat.

## Muharrir

- STLLoader, OBJLoader, OrbitControls, TransformControls va Raycaster ishlat.
- Foydalanuvchi komponentni sichqoncha bilan tanlasin.
- Tanlangan komponentni ushlab istalgan joyga sudray olsin.
- W — ko‘chirish, E — aylantirish, R — masshtablash.
- Ko‘chirish vaqtida OrbitControls o‘chsin.
- X/Y/Z koordinatalari, rotatsiya va o‘lchamlar o‘ng panelda millimetrda tahrirlansin.
- Yuqoridan, oldindan, orqadan, chapdan, o‘ngdan va perspektiv kamera tugmalari bo‘lsin.
- Dron shaffofligi, wireframe va yashirish boshqaruvlari bo‘lsin.
- Komponentlarni lock, hide, reset va “inventarga qaytarish” mumkin bo‘lsin.
- Joylashuv localStorage’da avtomatik saqlansin.
- JSON import/export, CSV eksport va yuqori sifatli PNG eksport bo‘lsin.

## Servolar

Savox servolar jami 8 ta: chap qanotda 2 ta, o‘ng qanotda 2 ta, old shassi buruvchi 1 ta, vertikal fin 1 ta, chap dum qanotchasi 1 ta va o‘ng dum qanotchasi 1 ta.

Har bir komponent dastlab “Joylashtirilmagan komponentlar” panelida tursin. “Sahnaga qo‘shish” bosilganda kamera markazida paydo bo‘lsin. Foydalanuvchining o‘rniga dron ichiga taxminiy joylashtirma.

Bir fizik obyekt bir vaqtda faqat bitta holatda bo‘lsin: “Joylashtirilmagan” yoki “Sahnada”. Sahifani qayta yuklash, JSON import qilish va reset qilish komponentlarni ko‘paytirib yubormasin. JSON import manifestdagi id va instance indeksiga mos kelmagan obyektlarni rad etsin.

Interfeys o‘zbek tilida, qoramtir aviatsiya muhandislik uslubida bo‘lsin. Ish tugagach barcha modellar yuklanishini, drag/rotate/scale, JSON va PNG eksportni tekshir.
