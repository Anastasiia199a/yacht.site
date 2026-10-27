import { ArrowDown, ArrowRight, ArrowUpRight, Phone } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import ilyaPhoto from "@/assets/ilya.webp";
import yachtLong from "@/assets/yacht-long.jpg";
import yachtMotor from "@/assets/yacht-motor.jpg";
import yachtSail from "@/assets/yacht-sail.jpg";
import { AssistantChat } from "@/components/site/assistant-chat";
import { DepthGauge, type DepthGaugeHandle } from "@/components/site/depth-gauge";
import { HullDrawing } from "@/components/site/hull-drawing";
import { InstagramIcon, TelegramIcon } from "@/components/site/icons";
import { LeadForm } from "@/components/site/lead-form";
import { OceanSurface, type OceanFrame } from "@/components/ui/fft-ocean-surface";
import { underwaterAt } from "@/components/ui/fft-ocean-surface-utils/renderer";
import { TELEGRAM } from "@/lib/backend";
import { sampleScript, WAVE_MAX, WAVE_MIN } from "@/lib/ocean-script";

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

function scrollProgress(): number {
  const range = document.documentElement.scrollHeight - window.innerHeight;
  return range > 0 ? clamp01(window.scrollY / range) : 0;
}

const isLowPower = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;

/** Stagger index for an entrance; see `[data-reveal]` in index.css. */
const rise = (i: number) => ({ "data-reveal": "", style: { "--i": i } as CSSProperties });

// Fill in the real Instagram handle and phone number before launch.
const CONTACTS = {
  instagram: { handle: "@your_handle", href: "https://instagram.com/" },
  telegram: { handle: TELEGRAM.handle, href: TELEGRAM.url },
  phone: { display: "+000 00 000 0000", href: "tel:+000000000000" },
};

const PLANS = [
  {
    id: "start",
    name: "Start",
    title: "Your first step toward a career at sea",
    price: "$500",
    audience: "For those who want to get into the yachting industry but don't know where to start.",
    points: [
      "Which documents and qualifications you need.",
      "How hiring works and where to find jobs.",
      "How to prepare your first applications.",
      "A one-on-one consultation with me.",
    ],
    result: "A clear action plan instead of a chaotic search for information.",
    photo: yachtSail,
    alt: "Sailing yacht seen from above on dark water",
  },
  {
    id: "mentor",
    name: "Mentoring",
    title: "From beginner to your first time at sea",
    price: "$1,200",
    audience:
      "For those who need a person to walk the path with them, not another guide from the internet.",
    points: [
      "A personal preparation plan.",
      "Help with documents and finding opportunities.",
      "A breakdown of next steps and common mistakes.",
      "Support all the way to a joint trip to the Seychelles, if documents and circumstances allow.",
    ],
    result: "Support and direction at every agreed stage.",
    photo: yachtMotor,
    alt: "Motor yacht seen from above at anchor",
  },
  {
    id: "full",
    name: "Full program",
    title: "Your route into the profession",
    price: "$2,500",
    audience:
      "For those ready to invest seriously in a new profession who want structured training.",
    points: [
      "Three months of training.",
      "A plan for getting your maritime documents, including a seaman's book.",
      "Preparation for entering the yacht job market.",
      "Mentoring and answers to your personal questions.",
      "Support through an agreed program up to the next stages of employment.",
    ],
    result: "Systematic preparation for starting out in the yachting industry.",
    photo: yachtLong,
    alt: "Long yacht hull seen from above",
  },
];

// Options for the request forms; the label is what lands in the sheet and the emails.
const PLAN_OPTIONS = [
  ...PLANS.map((p) => ({ id: p.id, label: `${p.name} · ${p.price}` })),
  { id: "unsure", label: "Not sure yet" },
];

const FACTS = [
  ["Age", "26"],
  ["On board", "2 years as yacht crew"],
  ["Waters", "Seychelles, Maldives"],
  ["Format", "Online and in person"],
];

// Shared frame: one pair of margins, text on a common left edge right of the depth gauge.
const FRAME = "px-5 sm:px-8 md:px-10 lg:pl-[max(12vw,15rem)] xl:pr-[6vw]";
const H2 = "display relative z-10 text-[12vw] leading-[0.95] sm:text-[9vw] md:text-[5.6vw]";

export default function App() {
  const [lowPower] = useState(isLowPower);
  const [plan, setPlan] = useState(PLANS[0].id);
  const frameRef = useRef<OceanFrame>(sampleScript(0));
  const heroRef = useRef<HTMLElement>(null);
  const heroBackRef = useRef<HTMLDivElement>(null);
  const heroFrontRef = useRef<HTMLDivElement>(null);
  const shadeRef = useRef<HTMLDivElement>(null);
  const gaugeRef = useRef<DepthGaugeHandle>(null);

  // One frame loop drives the scene, the hero block and the instruments.
  useEffect(() => {
    let eased = scrollProgress();
    let last = performance.now();
    let depth = -1;
    let raf = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      eased += (scrollProgress() - eased) * Math.min(1, dt * 3.5);
      const frame = sampleScript(eased);
      frameRef.current = frame;

      const vh = window.innerHeight;
      const hero = heroRef.current;
      if (hero) {
        const run = hero.offsetHeight - vh + 0.3 * vh;
        const approach = clamp01(window.scrollY / run);
        const transform = `translate3d(0, ${(approach * 44).toFixed(3)}vh, 0) scale(${(1 - 0.42 * approach).toFixed(4)})`;
        const fade = clamp01(1 - approach * 1.6);
        const opacity = fade.toFixed(3);
        const visibility = fade <= 0.001 ? "hidden" : "visible";
        for (const el of [heroBackRef.current, heroFrontRef.current]) {
          if (!el) continue;
          el.style.transform = transform;
          el.style.opacity = opacity;
          el.style.visibility = visibility;
        }
      }

      const y = frame.position[1];
      const under = underwaterAt(y);
      const calm = clamp01(1 - (frame.heightScale - WAVE_MIN) / (WAVE_MAX - WAVE_MIN));
      if (shadeRef.current) {
        shadeRef.current.style.opacity = ((1 - 0.9 * under) * (0.45 + 0.55 * calm)).toFixed(3);
      }
      const nextDepth = Math.round(clamp01(-y / 30) * 100) / 100;
      if (nextDepth !== depth) {
        depth = nextDepth;
        document.documentElement.style.setProperty("--depth", String(depth));
      }
      gaugeRef.current?.update(y, frame.heightScale);

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Entrances: reveal each marked part once as it enters the frame.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("js-reveal");
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.1 }
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      root.classList.remove("js-reveal");
    };
  }, []);

  return (
    <>
      <OceanSurface getFrame={() => frameRef.current} lowPower={lowPower} />

      {/* Shading for legibility: edges plus the left text column; strongest in the calm, nearly off underwater. */}
      <div
        ref={shadeRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-[5]"
        style={{
          background:
            "radial-gradient(ellipse 115% 85% at 50% 42%, transparent 40%, rgb(4 18 31 / 0.85) 100%), linear-gradient(90deg, rgb(4 18 31 / 0.62) 0%, rgb(4 18 31 / 0.38) 45%, transparent 72%)",
        }}
      />

      <Header />
      <DepthGauge ref={gaugeRef} />

      {/* Hero: two fixed layers sharing one transform. Headline sinks under the water sheet (z 10 < 15); caption and button stay above (z 20). */}
      <div
        ref={heroBackRef}
        className="pointer-events-none fixed inset-0 z-10 origin-center will-change-transform"
      >
        <HeroLayout part="title" />
      </div>
      <div
        ref={heroFrontRef}
        className="pointer-events-none fixed inset-0 z-20 origin-center will-change-transform"
      >
        <HeroLayout part="caption" />
      </div>

      <main className="relative">
        <section ref={heroRef} aria-label="Switch winter to summer" className="h-[148vh] md:h-[170vh]" />

        <section id="path" className={`min-h-[92vh] pt-[4vh] pb-16 ${FRAME}`}>
          <h2 {...rise(0)} className={`${H2} max-sm:text-[9.4vw]`}>
            Seychelles —
            <br />
            not for everyone?
          </h2>
          <div className="mt-8 grid items-start gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-20">
            <div>
              <p {...rise(1)} className="relative z-20 max-w-[30ch] text-xl leading-snug md:text-2xl">
                I used to think so too. Until I realised you can get to the islands as crew, not
                as a tourist.
              </p>
              <p {...rise(2)} className="relative z-20 mt-6 max-w-[44ch] md:text-[17px]">
                I'll show you how to get into the yachting industry, which documents to sort out
                and where to start as a sailor. I'll help you go from the first step to your first
                time at sea, based on my own experience working on a yacht.
              </p>
            </div>
            <figure {...rise(3)} className="relative z-20 max-w-xl lg:-mt-6 lg:max-w-none">
              <HullDrawing />
              <figcaption className="mt-4 text-sm text-gauge">
                A yacht from the inside: what you can't see from the beach
              </figcaption>
            </figure>
          </div>
        </section>

        <section id="plans" className={`min-h-[200vh] pt-[10vh] pb-[20vh] ${FRAME}`}>
          <h2 {...rise(0)} className={H2}>
            Choose your start
          </h2>
          <p {...rise(1)} className="relative z-20 mt-6 max-w-[40ch] text-xl text-ink/90 md:text-2xl">
            Three formats, from a single conversation to three months of training.
          </p>
          <div className="mt-[14vh] space-y-[18vh] md:space-y-[16vh]">
            {PLANS.map((p, i) => (
              <PlanCard key={p.id} plan={p} flip={i % 2 === 1} onChoose={() => setPlan(p.id)} />
            ))}
          </div>
        </section>

        <section id="about" className={`min-h-[110vh] pt-[10vh] ${FRAME}`}>
          <div className="grid items-start gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-24">
            <div>
              <h2 {...rise(0)} className={H2}>
                I'm Ilya Belov
              </h2>
              <p {...rise(1)} className="relative z-20 mt-8 max-w-[30ch] text-xl leading-snug md:text-2xl">
                I don't sell fairy tales about easy money under the palms.
              </p>
              <div {...rise(2)} className="relative z-20 mt-6 max-w-[46ch] space-y-4 md:text-[17px]">
                <p>
                  I'm 26, and for the last two years I've worked as crew on a yacht. I share what
                  I've learned in practice so you understand the profession, avoid unnecessary
                  mistakes and know how to take your first step toward working abroad.
                </p>
                <p>I show you how this path really works, and help you walk it with your eyes open.</p>
              </div>
              <table {...rise(3)} className="relative z-20 mt-12 w-full max-w-xl text-left">
                <caption className="sr-only">About me in brief</caption>
                <tbody>
                  {FACTS.map(([k, v]) => (
                    <tr key={k} className="flex items-baseline gap-6 border-t border-gauge/20 py-3.5">
                      <th scope="row" className="w-28 shrink-0 text-sm font-normal text-gauge sm:w-36">
                        {k}
                      </th>
                      <td className="md:text-[17px]">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <figure {...rise(2)} className="relative z-20 mx-auto w-full max-w-[400px] lg:mx-0 lg:mt-6 lg:max-w-none">
              <div className="overflow-hidden">
                <img
                  src={ilyaPhoto}
                  alt="Ilya Belov on a yacht deck watching the sunset over the sea"
                  loading="lazy"
                  className="deck-photo aspect-[3/4] w-full object-cover object-[50%_35%]"
                />
              </div>
            </figure>
          </div>
        </section>

        <RequestSection plan={plan} onPlanChange={setPlan} />
      </main>

      <AssistantChat plans={PLAN_OPTIONS} />
    </>
  );
}

function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-30">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-28 md:h-32"
        style={{ background: "linear-gradient(rgb(4 18 31 / 0.92), rgb(4 18 31 / 0.6) 55%, transparent)" }}
      />
      <div className="flex items-center justify-between gap-4 px-5 pt-4 pb-3 sm:px-8 md:px-10 md:pt-5">
        <a href="#" className="group flex items-baseline gap-4 py-2" aria-label="Ilya Belov, back to top">
          <span className="display text-[17px] tracking-[0.32em] transition-colors group-hover:text-ink md:text-xl">
            ILYA BELOV
          </span>
          <span className="hidden text-sm text-gauge lg:inline">yacht crew, Seychelles and Maldives</span>
        </a>
        <nav className="flex items-center gap-7 text-[14px]">
          <a href="#plans" className="link hidden md:inline">
            Plans
          </a>
          <a href="#about" className="link hidden md:inline">
            About
          </a>
          <a href="#contact" className="link hidden md:inline">
            Contact
          </a>
          <a href="#apply" className="btn-gold !min-h-10 !px-5 !text-[14px]">
            Apply
          </a>
        </nav>
      </div>
      <div className="chart-frame mx-5 sm:mx-8 md:mx-10" aria-hidden />
    </header>
  );
}

/** Same box in both hero layers so the two halves can never drift apart. */
function HeroLayout({ part }: { part: "title" | "caption" }) {
  const title = part === "title";
  const Tag = title ? "h1" : "div";
  const Cta = title ? "span" : "a";
  return (
    <div className="flex h-full flex-col items-center justify-center px-5 pt-[8vh] text-center">
      <Tag
        aria-hidden={!title || undefined}
        className={`display text-[10.8vw] leading-[0.95] whitespace-nowrap md:text-[8.8vw] lg:text-[8vw] ${title ? "hero-title" : "invisible"}`}
      >
        <span className="hero-rise block">
          <span className="winter">Switch winter</span>
          <br />
          <span className="winter">to </span>summer
        </span>
      </Tag>
      <div aria-hidden={title} className={`flex flex-col items-center ${title ? "invisible" : ""}`}>
        <p
          className="hero-rise mt-8 max-w-[36ch] text-xl leading-snug md:mt-10 md:text-2xl"
          style={{ "--delay": "180ms" } as CSSProperties}
        >
          Your life under the palms is closer than you think.
        </p>
        <p
          className="hero-rise mt-3 text-sm text-gauge md:text-base"
          style={{ "--delay": "260ms" } as CSSProperties}
        >
          Ilya Belov, yacht crew. Consultations and mentoring from $500.
        </p>
        <Cta
          href={title ? undefined : "#plans"}
          className="btn-gold hero-rise pointer-events-auto mt-9 w-full max-w-xs sm:w-auto"
          style={{ "--delay": "360ms" } as CSSProperties}
        >
          Choose a format
          <ArrowDown className="nudge-down size-4" strokeWidth={1.75} />
        </Cta>
      </div>
    </div>
  );
}

function PlanCard({
  plan: p,
  flip,
  onChoose,
}: {
  plan: (typeof PLANS)[number];
  flip: boolean;
  onChoose: () => void;
}) {
  return (
    <article className="grid items-center gap-10 lg:grid-cols-2 lg:gap-24">
      <figure
        {...rise(0)}
        className={`relative z-20 mx-auto w-full max-w-[440px] overflow-hidden ${flip ? "lg:order-2" : ""}`}
      >
        <img
          src={p.photo}
          width={900}
          height={1125}
          decoding="async"
          alt={p.alt}
          loading="lazy"
          className="underwater-photo aspect-[4/5] w-full object-cover"
        />
      </figure>
      <div className="relative z-20">
        <div {...rise(1)} className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <h3 className="display text-[2.6rem] leading-none md:text-5xl">{p.name}</h3>
          <p className="text-4xl font-light text-gold md:text-5xl">{p.price}</p>
        </div>
        <p {...rise(2)} className="mt-5 text-xl leading-snug md:text-2xl">
          {p.title}
        </p>
        <p {...rise(3)} className="mt-4 max-w-[44ch] text-ink/90 md:text-[17px]">
          {p.audience}
        </p>
        <ul {...rise(4)} className="mt-7 max-w-[46ch] space-y-3 md:text-[17px]">
          {p.points.map((point) => (
            <li key={point} className="flex gap-4 leading-snug">
              <span aria-hidden className="mt-[0.55em] h-[5px] w-[5px] shrink-0 bg-ink" />
              {point}
            </li>
          ))}
        </ul>
        <p {...rise(5)} className="mt-8 max-w-[46ch] bg-field/80 px-5 py-4 leading-snug md:text-[17px]">
          <span className="text-ink">Result: </span>
          {p.result}
        </p>
        <a {...rise(6)} href="#apply" onClick={onChoose} className="btn-gold mt-8 w-full sm:w-auto">
          Choose “{p.name}”
          <ArrowRight className="nudge-right size-4" strokeWidth={1.75} />
        </a>
      </div>
    </article>
  );
}

function RequestSection({
  plan,
  onPlanChange,
}: {
  plan: string;
  onPlanChange: (id: string) => void;
}) {
  return (
    <section
      id="apply"
      className="flex min-h-screen flex-col justify-center px-5 pt-28 pb-14 sm:px-8 md:px-10"
    >
      <div className="mx-auto w-full max-w-5xl">
        <div className="text-center">
          <h2 {...rise(0)} className={H2}>
            Your start
          </h2>
          <p {...rise(1)} className="relative z-20 mx-auto mt-6 max-w-[34ch] text-xl leading-snug md:text-2xl">
            It doesn't begin with a yacht. It begins with a decision.
          </p>
        </div>

        <div className="mt-14 grid gap-14 md:grid-cols-[1.1fr_1fr] md:gap-16">
          <div {...rise(2)} className="relative z-20">
            <p className="mb-5 text-ink/90">
              Leave your details and I'll message you personally. You'll get a copy of your request by email.
            </p>
            <LeadForm plans={PLAN_OPTIONS} plan={plan} onPlanChange={onPlanChange} source="form" />
          </div>

          <div {...rise(3)} id="contact" className="relative z-20">
            <h3 className="display text-3xl leading-tight md:text-4xl">Or message me directly</h3>
            <ul className="mt-6 grid gap-2">
              <ContactRow href={CONTACTS.telegram.href} label="Telegram" value={CONTACTS.telegram.handle} icon={<TelegramIcon />} external />
              <ContactRow href={CONTACTS.instagram.href} label="Instagram" value={CONTACTS.instagram.handle} icon={<InstagramIcon />} external />
              <ContactRow
                href={CONTACTS.phone.href}
                label="Phone"
                value={CONTACTS.phone.display}
                icon={<Phone className="size-5" strokeWidth={1.5} />}
              />
            </ul>
          </div>
        </div>

        <footer className="relative z-20 mt-20 flex flex-col items-center gap-5 text-center">
          <a href={TELEGRAM.url} target="_blank" rel="noreferrer" className="btn-gold">
            <TelegramIcon />
            Message Ilya on Telegram
            <span className="text-gauge">{TELEGRAM.handle}</span>
          </a>
          <p className="text-sm text-gauge">Ilya Belov, yacht crew. Seychelles and Maldives.</p>
        </footer>
      </div>
    </section>
  );
}

function ContactRow({
  href,
  label,
  value,
  icon,
  external,
}: {
  href: string;
  label: string;
  value: string;
  icon: ReactNode;
  external?: boolean;
}) {
  return (
    <li>
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
        className="contact-row group flex min-h-[4.5rem] items-center gap-5 bg-field/70 px-5 py-3 transition-colors hover:bg-field-hi hover:text-ink"
      >
        <span className="text-ink">{icon}</span>
        <span className="flex flex-1 flex-col leading-tight">
          <span className="text-[13px] text-gauge">{label}</span>
          <span className="text-xl">{value}</span>
        </span>
        <ArrowUpRight aria-hidden className="arrow size-5 text-gauge group-hover:text-ink" strokeWidth={1.5} />
      </a>
    </li>
  );
}
