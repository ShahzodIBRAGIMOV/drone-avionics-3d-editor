export const SERVO_INSTANCES_CONFIG: {
  index: number;
  label: string;
  defaultPosMm: [number, number, number];
  defaultRotRad?: [number, number, number];
}[] = [
  { index: 1, label: "Chap qanot eleron 1 (Left Aileron)", defaultPosMm: [-1100, 15, -60], defaultRotRad: [0, 0, 0] },
  { index: 2, label: "Chap qanot flap 2 (Left Flap)", defaultPosMm: [-650, 15, -70], defaultRotRad: [0, 0, 0] },
  { index: 3, label: "O‘ng qanot eleron 1 (Right Aileron)", defaultPosMm: [1100, 15, -60], defaultRotRad: [0, Math.PI, 0] },
  { index: 4, label: "O‘ng qanot flap 2 (Right Flap)", defaultPosMm: [650, 15, -70], defaultRotRad: [0, Math.PI, 0] },
  { index: 5, label: "Old shassi buruvchi (Nose Gear Steering)", defaultPosMm: [0, -110, 480], defaultRotRad: [Math.PI / 2, 0, 0] },
  { index: 6, label: "Vertikal fin ruder (Vertical Fin)", defaultPosMm: [0, 180, -980], defaultRotRad: [0, 0, Math.PI / 2] },
  { index: 7, label: "Chap dum qanotchasi elevon (Left Elevator)", defaultPosMm: [-380, 80, -1020], defaultRotRad: [0, 0, 0] },
  { index: 8, label: "O‘ng dum qanotchasi elevon (Right Elevator)", defaultPosMm: [380, 80, -1020], defaultRotRad: [0, Math.PI, 0] },
];

export const MOTOR_INSTANCES_CONFIG: { index: number; label: string; defaultPosMm: [number, number, number] }[] = [
  { index: 1, label: "Chap dvigatel (Left Motor)", defaultPosMm: [-520, 20, 180] },
  { index: 2, label: "O‘ng dvigatel (Right Motor)", defaultPosMm: [520, 20, 180] },
];

export const ESC_INSTANCES_CONFIG: { index: number; label: string; defaultPosMm: [number, number, number] }[] = [
  { index: 1, label: "Chap motor regulyatori (ESC 1)", defaultPosMm: [-480, 10, 110] },
  { index: 2, label: "O‘ng motor regulyatori (ESC 2)", defaultPosMm: [480, 10, 110] },
];

export const PROPELLER_INSTANCES_CONFIG: { index: number; label: string; defaultPosMm: [number, number, number] }[] = [
  { index: 1, label: "Chap propeller (Left Prop 20x10)", defaultPosMm: [-520, 20, 250] },
  { index: 2, label: "O‘ng propeller (Right Prop 20x10)", defaultPosMm: [520, 20, 250] },
];

export const LED_INSTANCES_CONFIG: { index: number; label: string; defaultPosMm: [number, number, number] }[] = [
  { index: 1, label: "Chap qanot uchi navi-chiroq (Left Wingtip Red)", defaultPosMm: [-1740, 25, -20] },
  { index: 2, label: "O‘ng qanot uchi navi-chiroq (Right Wingtip Green)", defaultPosMm: [1740, 25, -20] },
];

export const UBEC_INSTANCES_CONFIG: { index: number; label: string; defaultPosMm: [number, number, number] }[] = [
  { index: 1, label: "Servo quvvatlash UBEC 12A", defaultPosMm: [-40, -15, 60] },
  { index: 2, label: "Avionika va datchiklar UBEC 12A", defaultPosMm: [40, -15, 60] },
];
