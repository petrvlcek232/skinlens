import { Sparkles, ShieldCheck, Cpu } from "lucide-react";
import { SkinAdvisorWidget } from "@/components/scanner/skin-advisor-widget";

export default function Home() {
  return (
    <main className="flex-1">
      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-12 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-20">
        <div className="order-2 lg:order-1">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper-raised px-3 py-1 text-xs font-medium text-ink-soft">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            On-device AI skin analysis
          </span>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl">
            See your skin the way <span className="text-accent">AI does.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-soft">
            A privacy-first skin analysis widget. Point your camera, and computer
            vision reads six facial regions to map redness, texture, tone
            evenness and more — entirely in your browser.
          </p>

          <ul className="mt-8 space-y-3">
            <Feature icon={<Cpu className="h-4 w-4 text-accent" />}>
              Real-time face mesh tracking with MediaPipe (478 landmarks)
            </Feature>
            <Feature icon={<ShieldCheck className="h-4 w-4 text-sage" />}>
              Photos never leave the device — no upload, no server
            </Feature>
            <Feature icon={<Sparkles className="h-4 w-4 text-amber" />}>
              Explainable, classical-CV metrics — not a black box
            </Feature>
          </ul>
        </div>

        <div className="order-1 lg:order-2">
          <SkinAdvisorWidget />
        </div>
      </section>
    </main>
  );
}

function Feature({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3 text-sm text-ink">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper-raised ring-1 ring-line">
        {icon}
      </span>
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}
