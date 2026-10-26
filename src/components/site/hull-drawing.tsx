import { useEffect, useRef, useState, type CSSProperties } from "react";

// Body plan: aft stations on the left of the centre plane, fore stations on the right.
const CX = 220;
const DWL = 168;
const AFT = [
  { b: 158, keel: 262, deck: 84 },
  { b: 152, keel: 262, deck: 82 },
  { b: 140, keel: 258, deck: 80 },
  { b: 122, keel: 248, deck: 79 },
  { b: 96, keel: 228, deck: 78 },
];
const FORE = [
  { b: 150, keel: 258, deck: 76 },
  { b: 134, keel: 250, deck: 72 },
  { b: 110, keel: 238, deck: 67 },
  { b: 78, keel: 220, deck: 61 },
  { b: 40, keel: 196, deck: 54 },
];
const WATERLINES = [
  { y: 228, label: "ВЛ 1" },
  { y: 198, label: "ВЛ 2" },
  { y: DWL, label: "КВЛ" },
  { y: 138, label: "ВЛ 4" },
  { y: 108, label: "ВЛ 5" },
];

function section(side: -1 | 1, { b, keel, deck }: { b: number; keel: number; deck: number }) {
  const x = (d: number) => (CX + side * d).toFixed(1);
  const bilge = keel - (keel - deck) * 0.42;
  return `M ${CX} ${keel} C ${x(b * 0.62)} ${keel} ${x(b)} ${bilge + 22} ${x(b)} ${bilge} S ${x(b * 0.97)} ${deck + 18} ${x(b * 0.95)} ${deck}`;
}

/** Lines plan in hairlines that draws itself the first time it scrolls into view. */
export function HullDrawing() {
  const ref = useRef<SVGSVGElement>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setDrawn(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  let i = 0;
  const delay = () => ({ "--d": `${(i++ * 0.11).toFixed(2)}s` }) as CSSProperties;

  return (
    <svg
      ref={ref}
      viewBox="0 0 440 320"
      role="img"
      aria-label="Теоретический чертёж корпуса: шпангоуты, ватерлинии, диаметральная плоскость"
      className={`w-full text-gauge ${drawn ? "drawn" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={0.75}
    >
      {/* base line and centre plane */}
      <path className="draw" pathLength={1} style={delay()} d={`M 30 ${AFT[0].keel} H 410`} />
      <path
        className="draw"
        pathLength={1}
        style={delay()}
        d={`M ${CX} 30 V 300`}
        opacity={0.9}
      />
      {WATERLINES.map((w) => (
        <path
          key={w.y}
          className="draw"
          pathLength={1}
          style={delay()}
          d={`M 44 ${w.y} H 396`}
          opacity={w.y === DWL ? 1 : 0.45}
          stroke={w.y === DWL ? "var(--color-ink)" : undefined}
        />
      ))}
      {AFT.map((s, k) => (
        <path key={`a${k}`} className="draw" pathLength={1} style={delay()} d={section(-1, s)} />
      ))}
      {FORE.map((s, k) => (
        <path key={`f${k}`} className="draw" pathLength={1} style={delay()} d={section(1, s)} />
      ))}
      {/* fin keel and sheer of the deck */}
      <path
        className="draw"
        pathLength={1}
        style={delay()}
        d={`M ${CX - 7} 262 L ${CX - 4} 304 H ${CX + 4} L ${CX + 7} 262`}
      />
      <path
        className="draw"
        pathLength={1}
        style={delay()}
        d={`M ${CX - 150} ${AFT[0].deck} Q ${CX} 76 ${CX + 38} 54`}
        opacity={0.45}
      />

      <g className="draw-label" style={delay()} fill="currentColor" stroke="none" fontSize={8} fontFamily="Onest, sans-serif">
        {WATERLINES.map((w) => (
          <text key={w.y} x={400} y={w.y + 3} fill={w.y === DWL ? "var(--color-ink)" : undefined}>
            {w.label}
          </text>
        ))}
        <text x={CX + 5} y={26}>ДП</text>
        <text x={30} y={AFT[0].keel + 12}>ОЛ</text>
        <text x={CX - 110} y={22}>корма · шп. 0–4</text>
        <text x={CX + 52} y={22}>нос · шп. 5–9</text>
      </g>
    </svg>
  );
}
