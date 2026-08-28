# AI Studio topshirig‘i

Ushbu repository asosida React, TypeScript va Three.js bilan interaktiv dron avionika joylashtirish muharririni yarat.

## Modellardan foydalanish

- Dron: /models/drone.stl
- Komponentlar: /models/*.obj
- Ro‘yxat: /data/component_manifest.csv
- Hech qanday placeholder model yaratma.
- Dron qanot oralig‘ini 3500 mm qil.
- Komponentlarni avtomatik joylashtirma.

## Muharrir

- STLLoader, OBJLoader, OrbitControls, TransformControls va Raycaster ishlat.
- Foydalanuvchi komponentni sichqoncha bilan tanlasin.
- Tanlangan komponentni ushlab istalgan joyga sudray olsin.
- W — ko‘chirish, E — aylantirish, R — masshtablash.
- Ko‘chirish vaqtida OrbitControls o‘chsin.
- X/Y/Z koordinatalari, rotatsiya va o‘lchamlar o‘ng panelda millimetrda tahrirlansin.
- Yuqoridan, oldindan, orqadan, chapdan, o‘ngdan va perspektiv kamera tugmalari bo‘lsin.
- Dron shaffofligi, wireframe va yashirish boshqaruvlari bo‘lsin.
- Komponentlarni lock, hide, duplicate, reset va remove qilish mumkin bo‘lsin.
- Joylashuv localStorage’da avtomatik saqlansin.
- JSON import/export, CSV eksport va yuqori sifatli PNG eksport bo‘lsin.

## Servolar

Savox servolar jami 8 ta: chap qanotda 2 ta, o‘ng qanotda 2 ta, old shassi buruvchi 1 ta, vertikal fin 1 ta, chap dum qanotchasi 1 ta va o‘ng dum qanotchasi 1 ta.

Har bir komponent dastlab “Joylashtirilmagan komponentlar” panelida tursin. “Sahnaga qo‘shish” bosilganda kamera markazida paydo bo‘lsin. Foydalanuvchining o‘rniga dron ichiga taxminiy joylashtirma.

Interfeys o‘zbek tilida, qoramtir aviatsiya muhandislik uslubida bo‘lsin. Ish tugagach barcha modellar yuklanishini, drag/rotate/scale, JSON va PNG eksportni tekshir.
