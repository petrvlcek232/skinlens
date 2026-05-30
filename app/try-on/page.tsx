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
      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-12 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-20">
        <div className="order-2 animate-fade-up lg:order-1">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper-raised px-3 py-1 text-xs font-medium text-ink-soft">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Bonus · AR makeup try-on
          </span>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl">
            Try every shade. <span className="text-accent">Instantly.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-soft">
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
            className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-ink"
          >
            <ArrowLeft className="h-4 w-4" />
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
