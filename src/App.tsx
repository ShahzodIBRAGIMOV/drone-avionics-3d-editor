import { useEffect, useMemo, useState } from "react";

type InventoryItem = { id: string; name: string; quantity: number };

export default function App() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  useEffect(() => {
    fetch("/data/component_manifest.csv")
      .then(response => response.text())
      .then(text => {
        const rows = text.trim().split(/\r?\n/).slice(1);
        setInventory(rows.map(row => {
          const [id, name, quantity] = row.split(",");
          return { id, name, quantity: Number(quantity) };
        }));
      });
  }, []);

  const totalUnits = useMemo(
    () => inventory.reduce((total, item) => total + item.quantity, 0),
    [inventory]
  );

  return <main><section><p className="kicker">3.5 M TWIN-MOTOR UAV</p><h1>Dron avionika 3D editor</h1><p>Faqat tasdiqlangan inventardagi modellar ishlatiladi. Har bir modelning pin va portlari kabel ulash uchun ko‘rinadigan bo‘lishi shart.</p><div className="status">{inventory.length} turdagi komponent, jami {totalUnits} dona</div></section><aside><h2>Tasdiqlangan inventar</h2><p>AI Studio ro‘yxatdan tashqari komponent yoki qo‘shimcha nusxa yaratmasligi kerak.</p><ul>{inventory.map(item => <li key={item.id}>{item.name} — {item.quantity} dona</li>)}</ul></aside></main>;
}
