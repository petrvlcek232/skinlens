import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, ShieldCheck, Cpu, ArrowLeft } from "lucide-react";
import { LipTryOn } from "@/components/tryon/lip-tryon";

export const metadata: Metadata = {
  title: "SkinLens — Virtual lipstick try-on",
  description:
    "Real-time AR lipstick try-on, on-device. A bonus demo alongside the SkinLens skin analyzer.",
};

export default function TryOnPage() {
  return (
    <main className="flex-1">
      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-14 lg:grid-cols-[5fr_7fr] lg:items-center lg:gap-20 lg:py-28">
        <div className="order-2 animate-fade-up lg:order-1">
          <span className="inline-flex items-center gap-2 text-[0.7rem] font-label font-semibold uppercase tracking-[0.18em] text-accent">
            <span className="h-px w-6 bg-accent/50" />
            Bonus · AR Makeup Try-On
          </span>
          <h1 className="mt-6 font-display text-[2.75rem] font-medium leading-[1.05] tracking-[-0.01em] text-ink sm:text-6xl">
            Try every shade.
            <br />
            <span className="italic text-accent">Instantly.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-soft">
            Real-time lipstick try-on powered by the same on-device face mesh —
            478 landmarks tracking your lips at 60fps. Pick a shade and move
            around; it tracks live.
          </p>

          <ul className="mt-8 space-y-3">
            <li className="flex items-start gap-3 text-sm text-ink">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper-raised ring-1 ring-line">
                <Cpu className="h-4 w-4 text-accent" />
              </span>
              <span className="leading-relaxed">
                Same MediaPipe engine as the skin analyzer — one mesh, two products
              </span>
            </li>
            <li className="flex items-start gap-3 text-sm text-ink">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper-raised ring-1 ring-line">
                <ShieldCheck className="h-4 w-4 text-sage" />
              </span>
              <span className="leading-relaxed">
                On-device — the camera feed never leaves your browser
              </span>
            </li>
          </ul>

          <Link
            href="/"
            className="mt-9 inline-flex w-fit items-center gap-1.5 px-1 font-label text-xs font-medium uppercase tracking-[0.12em] text-ink-soft transition-colors hover:text-accent"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to skin analysis
          </Link>
        </div>

        <div className="order-1 lg:order-2">
          <LipTryOn />
        </div>
      </section>
    </main>
  );
}
