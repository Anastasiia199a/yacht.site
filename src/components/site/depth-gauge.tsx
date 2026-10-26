import { useImperativeHandle, useRef, type Ref } from "react";

import { WAVE_MAX, WAVE_MIN } from "@/lib/ocean-script";

export interface DepthGaugeHandle {
  update(cameraHeight: number, waveHeight: number): void;
}

const TOP = 120;
const BOTTOM = -40;
const SCALE_PX = 280;
const STEPS = (TOP - BOTTOM) / 10;

const toPx = (h: number) => ((TOP - Math.min(TOP, Math.max(BOTTOM, h))) / (TOP - BOTTOM)) * SCALE_PX;

/** Depth gauge with the waterline at zero and a sea-state scale of nine ticks below it. */
export function DepthGauge({ ref }: { ref: Ref<DepthGaugeHandle> }) {
  const markerRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);
  const sideRef = useRef<HTMLSpanElement>(null);
  const ticksRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const last = useRef({ metres: NaN, score: -1, under: false });

  useImperativeHandle(
    ref,
    () => ({
      update(cameraHeight, waveHeight) {
        const marker = markerRef.current;
        if (marker) marker.style.transform = `translateY(${toPx(cameraHeight).toFixed(1)}px)`;

        const metres = Math.round(cameraHeight);
        const under = cameraHeight < 0;
        const score = Math.round(
          Math.min(1, Math.max(0, (waveHeight - WAVE_MIN) / (WAVE_MAX - WAVE_MIN))) * 9
        );
        const prev = last.current;
        if (metres !== prev.metres && valueRef.current) {
          valueRef.current.textContent = `${metres > 0 ? "+" : metres < 0 ? "−" : ""}${Math.abs(metres)} м`;
        }
        if (under !== prev.under || Number.isNaN(prev.metres)) {
          if (sideRef.current) sideRef.current.textContent = under ? "под водой" : "над водой";
        }
        if (score !== prev.score) {
          if (scoreRef.current) scoreRef.current.textContent = String(score);
          ticksRef.current?.querySelectorAll("i").forEach((tick, i) => {
            tick.style.opacity = i < score ? "1" : "0.22";
          });
        }
        last.current = { metres, score, under };
      },
    }),
    []
  );

  return (
    <aside
      aria-hidden
      className="pointer-events-none fixed top-1/2 left-10 z-20 hidden -translate-y-1/2 select-none lg:block"
    >
      <p className="mb-4 text-[13px] text-gauge">Глубина</p>
      <div className="relative" style={{ height: SCALE_PX }}>
        <div className="absolute top-0 left-0 h-full w-px bg-gauge/50" />
        {Array.from({ length: STEPS + 1 }, (_, i) => {
          const h = TOP - i * 10;
          const waterline = h === 0;
          return (
            <div
              key={h}
              className="absolute left-0 flex items-center"
              style={{ top: (i / STEPS) * SCALE_PX }}
            >
              <span
                className={waterline ? "h-px w-5 bg-ink" : h % 50 === 0 ? "h-px w-3 bg-gauge/70" : "h-px w-1.5 bg-gauge/45"}
              />
              {(waterline || h % 50 === 0) && (
                <span className={`ml-2 text-[13px] whitespace-nowrap ${waterline ? "text-ink" : "text-gauge"}`}>
                  {waterline ? "0 ватерлиния" : h > 0 ? `+${h}` : `−${-h}`}
                </span>
              )}
            </div>
          );
        })}
        <div ref={markerRef} className="absolute top-0 -left-1 will-change-transform">
          <div className="flex -translate-y-1/2 items-center gap-2">
            <span className="h-[3px] w-[3px] rounded-full bg-ink" />
            <span className="h-px w-8 bg-ink" />
            <span className="text-[13px] whitespace-nowrap text-ink">
              <span ref={valueRef}>+118 м</span>
              <span ref={sideRef} className="ml-2 text-gauge">
                над водой
              </span>
            </span>
          </div>
        </div>
      </div>

      <p className="mt-10 mb-3 text-[13px] text-gauge">
        Волнение: <span ref={scoreRef} className="text-ink">5</span> из 9
      </p>
      <div ref={ticksRef} className="flex items-end gap-[5px]">
        {Array.from({ length: 9 }, (_, i) => (
          <i
            key={i}
            className="block w-px bg-ink transition-opacity duration-500"
            style={{ height: 6 + i * 2, opacity: 0.22 }}
          />
        ))}
      </div>
    </aside>
  );
}
