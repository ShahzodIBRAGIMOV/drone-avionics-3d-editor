import { useEffect, useState } from "react";
export default function App(){
  const [assets,setAssets]=useState<string[]>([]);
  useEffect(()=>{fetch("/data/component_manifest.csv").then(r=>r.text()).then(t=>setAssets(t.trim().split("\\n").slice(1).map(r=>r.split(",")[1])));},[]);
  return <main><section><p className="kicker">3.5 M TWIN-MOTOR UAV</p><h1>Dron avionika 3D editor</h1><p>Haqiqiy STL va OBJ modellar repository ichida tayyor.</p><div className="status">{assets.length} turdagi komponent aniqlandi</div></section><aside><h2>Keyingi qadam</h2><p>Ushbu repository’ni Google AI Studio’ga import qiling va <b>AI_STUDIO_PROMPT_UZ.md</b> faylidagi promptni yuboring.</p><ul>{assets.map((a,i)=><li key={i}>{a}</li>)}</ul></aside></main>;
}
