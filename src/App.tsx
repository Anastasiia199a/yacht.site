import { ArrowDown, ArrowRight, ArrowUpRight, ChevronDown, Phone } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";

import ilyaPhoto from "@/assets/ilya.webp";
import yachtLong from "@/assets/yacht-long.jpg";
import yachtMotor from "@/assets/yacht-motor.jpg";
import yachtSail from "@/assets/yacht-sail.jpg";
import { DepthGauge, type DepthGaugeHandle } from "@/components/site/depth-gauge";
import { HullDrawing } from "@/components/site/hull-drawing";
import { OceanSurface, type OceanFrame } from "@/components/ui/fft-ocean-surface";
import { underwaterAt } from "@/components/ui/fft-ocean-surface-utils/renderer";
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

// Fill in the real handles and number before launch.
const CONTACTS = {
  instagram: { handle: "@ваш_ник", href: "https://instagram.com/" },
  telegram: { handle: "@ваш_ник", href: "https://t.me/" },
  phone: { display: "+7 000 000-00-00", href: "tel:+70000000000" },
};

const PLANS = [
  {
    id: "start",
    name: "Старт",
    title: "Твой первый шаг к карьере в море",
    price: "$500",
    audience: "Для тех, кто хочет попасть в яхтенную индустрию, но не понимает, с чего начать.",
    points: [
      "Какие документы и квалификации нужны.",
      "Как устроен найм и где искать вакансии.",
      "Как подготовиться к первым откликам.",
      "Персональная консультация со мной.",
    ],
    result: "Понятный план действий вместо хаотичного поиска информации.",
    photo: yachtSail,
    alt: "Парусная яхта сверху на тёмной воде",
  },
  {
    id: "mentor",
    name: "С сопровождением",
    title: "Из новичка — к первому выходу в море",
    price: "$1 200",
    audience:
      "Для тех, кому нужен не очередной гайд из интернета, а человек, который проведёт по пути лично.",
    points: [
      "Индивидуальный план подготовки.",
      "Помощь с документами и поиском возможностей.",
      "Разбор следующих шагов и типичных ошибок.",
      "Сопровождение вплоть до совместной поездки из России на Сейшелы — если позволяют документы и обстоятельства.",
    ],
    result: "Поддержка и ориентир на каждом согласованном этапе.",
    photo: yachtMotor,
    alt: "Моторная яхта сверху на якорной стоянке",
  },
  {
    id: "full",
    name: "Полная программа",
    title: "Твой маршрут в профессию",
    price: "$2 500",
    audience:
      "Для тех, кто готов серьёзно вложиться в новую профессию и хочет структурированную подготовку.",
    points: [
      "Обучение в течение 3 месяцев.",
      "План получения морских документов, включая паспорт моряка.",
      "Подготовка к выходу на рынок яхтенных вакансий.",
      "Наставничество и разбор твоих личных вопросов.",
      "Сопровождение по согласованной программе до следующих этапов трудоустройства.",
    ],
    result: "Системная подготовка к старту в яхтенной индустрии.",
    photo: yachtLong,
    alt: "Длинный корпус яхты сверху",
  },
];

const FACTS = [
  ["Возраст", "26 лет"],
  ["На борту", "2 года, моряк на яхте"],
  ["Воды", "Сейшелы, Мальдивы"],
  ["Откуда", "Россия — начинал с нуля, как и ты"],
  ["Формат", "Онлайн и лично"],
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
        <section ref={heroRef} aria-label="Переключи зиму на лето" className="h-[148vh] md:h-[170vh]" />

        <section id="put" className={`min-h-[92vh] pt-[4vh] pb-16 ${FRAME}`}>
          <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-20">
            <div>
              <h2 {...rise(0)} className={H2}>
                Сейшелы —
                <br />
                не для всех?
              </h2>
              <p {...rise(1)} className="relative z-20 mt-8 max-w-[30ch] text-xl leading-snug md:text-2xl">
                Я тоже так думал. Пока не понял: на остров можно попасть не туристом, а членом
                экипажа.
              </p>
              <p {...rise(2)} className="relative z-20 mt-6 max-w-[44ch] md:text-[17px]">
                Расскажу, как попасть в яхтенную индустрию, какие документы оформить и с чего
                начать путь моряка. Помогу пройти его от первого шага до выхода в море — на основе
                моего личного опыта работы на яхте.
              </p>
            </div>
            <figure {...rise(3)} className="relative z-20 max-w-xl lg:max-w-none lg:pt-28">
              <HullDrawing />
              <figcaption className="mt-4 text-sm text-gauge">
                Яхта изнутри: то, что не видно с пляжа
              </figcaption>
            </figure>
          </div>
        </section>

        <section id="formaty" className={`min-h-[200vh] pt-[10vh] pb-[20vh] ${FRAME}`}>
          <h2 {...rise(0)} className={H2}>
            Выбери свой старт
          </h2>
          <p {...rise(1)} className="relative z-20 mt-6 max-w-[40ch] text-xl text-ink/90 md:text-2xl">
            Три формата — от разговора до трёх месяцев обучения.
          </p>
          <div className="mt-[14vh] space-y-[18vh] md:space-y-[16vh]">
            {PLANS.map((p, i) => (
              <PlanCard key={p.id} plan={p} flip={i % 2 === 1} onChoose={() => setPlan(p.id)} />
            ))}
          </div>
        </section>

        <section id="obo-mne" className={`min-h-[110vh] pt-[10vh] ${FRAME}`}>
          <div className="grid items-start gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-24">
            <div>
              <h2 {...rise(0)} className={H2}>
                Я Илья Белов
              </h2>
              <p {...rise(1)} className="relative z-20 mt-8 max-w-[30ch] text-xl leading-snug md:text-2xl">
                Не продаю сказку о лёгких деньгах под пальмами.
              </p>
              <div {...rise(2)} className="relative z-20 mt-6 max-w-[46ch] space-y-4 md:text-[17px]">
                <p>
                  Мне 26 лет, и последние два года я работаю моряком на яхте. Делюсь тем, что узнал
                  на практике, чтобы ты разобрался в профессии, не наделал лишних ошибок и понял, как
                  сделать первый шаг к работе за границей.
                </p>
                <p>Показываю, как этот путь устроен в реальности, — и помогаю пройти его осознанно.</p>
              </div>
              <table {...rise(3)} className="relative z-20 mt-12 w-full max-w-xl text-left">
                <caption className="sr-only">Коротко обо мне</caption>
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
                  alt="Илья Белов на палубе яхты смотрит на закат над морем"
                  loading="lazy"
                  className="deck-photo aspect-[3/4] w-full object-cover object-[50%_35%]"
                />
              </div>
            </figure>
          </div>
        </section>

        <RequestSection plan={plan} onPlanChange={setPlan} />
      </main>
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
        <a href="#" className="group flex items-baseline gap-4 py-2" aria-label="Илья Белов — наверх">
          <span className="display text-[17px] tracking-[0.32em] transition-colors group-hover:text-ink md:text-xl">
            ИЛЬЯ БЕЛОВ
          </span>
          <span className="hidden text-sm text-gauge lg:inline">моряк, Сейшелы и Мальдивы</span>
        </a>
        <nav className="flex items-center gap-7 text-[14px]">
          <a href="#formaty" className="link hidden md:inline">
            Форматы
          </a>
          <a href="#obo-mne" className="link hidden md:inline">
            Обо мне
          </a>
          <a href="#kontakty" className="link hidden md:inline">
            Контакты
          </a>
          <a href="#zayavka" className="btn-gold !min-h-10 !px-5 !text-[14px]">
            Заявка
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
          <span className="winter">Переключи зиму</span>
          <br />
          <span className="winter">на </span>лето
        </span>
      </Tag>
      <div aria-hidden={title} className={`flex flex-col items-center ${title ? "invisible" : ""}`}>
        <p
          className="hero-rise mt-8 max-w-[36ch] text-xl leading-snug md:mt-10 md:text-2xl"
          style={{ "--delay": "180ms" } as CSSProperties}
        >
          Твоя жизнь под пальмами ближе, чем кажется.
        </p>
        <p
          className="hero-rise mt-3 text-sm text-gauge md:text-base"
          style={{ "--delay": "260ms" } as CSSProperties}
        >
          Илья Белов, моряк на яхте. Консультации и наставничество — от $500.
        </p>
        <Cta
          href={title ? undefined : "#formaty"}
          className="btn-gold hero-rise pointer-events-auto mt-9 w-full max-w-xs sm:w-auto"
          style={{ "--delay": "360ms" } as CSSProperties}
        >
          Выбрать формат
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
          <span className="text-ink">Результат: </span>
          {p.result}
        </p>
        <a {...rise(6)} href="#zayavka" onClick={onChoose} className="btn-gold mt-8 w-full sm:w-auto">
          Выбрать «{p.name}»
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
  const [sent, setSent] = useState(false);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSent(true);
  };
  const selected = PLANS.find((p) => p.id === plan) ?? PLANS[0];

  return (
    <section
      id="zayavka"
      className="flex min-h-screen flex-col justify-center px-5 pt-28 pb-14 sm:px-8 md:px-10"
    >
      <div className="mx-auto w-full max-w-5xl">
        <div className="text-center">
          <h2 {...rise(0)} className={H2}>
            Твой старт
          </h2>
          <p {...rise(1)} className="relative z-20 mx-auto mt-6 max-w-[34ch] text-xl leading-snug md:text-2xl">
            Он начинается не с яхты. Он начинается с решения.
          </p>
        </div>

        <div className="mt-14 grid gap-14 md:grid-cols-[1.1fr_1fr] md:gap-16">
          <div {...rise(2)} className="relative z-20">
            <p className="mb-5 text-ink/90">Оставь контакт — я напишу лично и отвечу на вопросы.</p>
            {sent ? (
              <p className="bg-field/80 px-5 py-6 text-lg" role="status">
                Заявка у меня: «{selected.name}», {selected.price}. Скоро напишу.
              </p>
            ) : (
              <form onSubmit={submit} className="grid gap-3 text-left">
                <label className="sr-only" htmlFor="f-name">Имя</label>
                <input id="f-name" name="name" required autoComplete="name" placeholder="Имя" className="field" />
                <label className="sr-only" htmlFor="f-contact">Телефон или Telegram</label>
                <input
                  id="f-contact"
                  name="contact"
                  required
                  autoComplete="tel"
                  placeholder="Телефон или Telegram"
                  className="field"
                />
                <label className="sr-only" htmlFor="f-plan">Формат</label>
                <div className="relative">
                  <select
                    id="f-plan"
                    name="plan"
                    value={plan}
                    onChange={(e) => onPlanChange(e.target.value)}
                    className="field appearance-none pr-12"
                  >
                    {PLANS.map((p) => (
                      <option key={p.id} value={p.id} className="bg-deep">
                        {p.name} · {p.price}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    aria-hidden
                    strokeWidth={1.5}
                    className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-gauge"
                  />
                </div>
                <button type="submit" className="btn-gold mt-3 w-full">
                  Хочу на борт
                  <ArrowRight className="nudge-right size-4" strokeWidth={1.75} />
                </button>
              </form>
            )}
          </div>

          <div {...rise(3)} id="kontakty" className="relative z-20">
            <h3 className="display text-3xl leading-tight md:text-4xl">Или напиши напрямую</h3>
            <ul className="mt-6 grid gap-2">
              <ContactRow href={CONTACTS.telegram.href} label="Telegram" value={CONTACTS.telegram.handle} icon={<TelegramIcon />} external />
              <ContactRow href={CONTACTS.instagram.href} label="Instagram" value={CONTACTS.instagram.handle} icon={<InstagramIcon />} external />
              <ContactRow
                href={CONTACTS.phone.href}
                label="Телефон"
                value={CONTACTS.phone.display}
                icon={<Phone className="size-5" strokeWidth={1.5} />}
              />
            </ul>
          </div>
        </div>

        <p className="relative z-20 mt-16 text-center text-sm text-gauge">
          Илья Белов, моряк на яхте. Сейшелы и Мальдивы.
        </p>
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

function InstagramIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round">
      <path d="M21.5 3.5 2.8 10.7c-.9.3-.9 1.6 0 1.9l4.6 1.5 1.8 5.6c.2.7 1.1.9 1.6.4l2.6-2.5 4.8 3.5c.6.4 1.4.1 1.6-.6l3-15.5c.2-.9-.6-1.6-1.3-1.5Z" />
      <path d="m7.4 14.1 10.4-7.4-8.1 9" />
    </svg>
  );
}
