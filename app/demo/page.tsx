import type { Metadata } from "next";
import Link from "next/link";
import { EmbedSnippet } from "@/components/marketing/embed-snippet";

export const metadata: Metadata = {
  title: "Aurélie Paris — Skincare with an AI skin analysis (SkinLens demo)",
  description:
    "A fictional beauty storefront showing the SkinLens widget embedded via iframe.",
  robots: { index: false },
};

interface Product {
  name: string;
  category: string;
  price: number;
  from: string;
  to: string;
}

const PRODUCTS: Product[] = [
  { name: "Velvet Cleansing Balm", category: "Cleanse", price: 28, from: "#f3dCE4", to: "#e8b9cf" },
  { name: "Rosewater Essence", category: "Treat", price: 34, from: "#f7e6ea", to: "#f0c9cf" },
  { name: "Ceramide Day Cream", category: "Moisturize", price: 42, from: "#efe7df", to: "#e3cdbb" },
  { name: "Overnight Retinal Serum", category: "Treat", price: 56, from: "#e7dcef", to: "#cdb6de" },
  { name: "Bright Eye Concentrate", category: "Eyes", price: 38, from: "#dfeaf0", to: "#bcd4e2" },
  { name: "Mineral Veil SPF 50", category: "Protect", price: 30, from: "#fbeede", to: "#f4d8b0" },
];

const NAV = ["New In", "Skincare", "Serums", "Moisturizers", "SPF", "About"];

export default function DemoPage() {
  return (
    <div className="min-h-dvh bg-[#fbf4f6] text-[#3a2b36]">
      {/* Announcement bar */}
      <div className="bg-[#7c4a63] py-2 text-center text-xs font-medium tracking-wide text-white">
        Complimentary shipping over $50 · Free AI skin analysis in-store
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-[#ecd7df] bg-[#fbf4f6]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <span className="text-xl font-semibold tracking-[0.25em] text-[#7c4a63]">
            AURÉLIE
          </span>
          <nav className="hidden gap-6 text-sm text-[#6b5660] lg:flex">
            {NAV.map((item) => (
              <span key={item} className="cursor-pointer hover:text-[#7c4a63]">
                {item}
              </span>
            ))}
          </nav>
          <div className="flex items-center gap-4 text-sm text-[#6b5660]">
            <span className="hidden cursor-pointer hover:text-[#7c4a63] sm:inline">
              Search
            </span>
            <span className="cursor-pointer hover:text-[#7c4a63]">Bag (0)</span>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-12 md:grid-cols-2 lg:py-20">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-[#9c6d83]">
              New · The Ritual Edit
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.1] sm:text-5xl">
              Skincare that starts with{" "}
              <span className="text-[#7c4a63]">your skin.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-[#6b5660]">
              Clean, barrier-first formulas — paired with a free AI skin analysis
              that builds your routine in seconds.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#analysis"
                className="rounded-full bg-[#7c4a63] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#653a51]"
              >
                Take the skin analysis
              </a>
              <button className="rounded-full border border-[#d8b9c6] px-6 py-3 text-sm font-medium text-[#7c4a63] transition-colors hover:bg-white">
                Shop best sellers
              </button>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#f3d9e2] to-[#d9b8c8] md:aspect-square">
            <div className="absolute inset-0 flex items-end p-8">
              <p className="font-serif text-2xl italic text-[#6b3a52]">
                Aurélie<br />Paris
              </p>
            </div>
          </div>
        </section>

        {/* Best sellers */}
        <section className="mx-auto max-w-6xl px-5 py-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-semibold">Best sellers</h2>
            <span className="text-sm text-[#9c6d83]">Shop all →</span>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {PRODUCTS.map((p) => (
              <div key={p.name} className="group">
                <div
                  className="aspect-[3/4] rounded-2xl"
                  style={{
                    backgroundImage: `linear-gradient(150deg, ${p.from}, ${p.to})`,
                  }}
                />
                <p className="mt-2 text-[11px] uppercase tracking-wide text-[#9c6d83]">
                  {p.category}
                </p>
                <p className="text-sm font-medium leading-snug">{p.name}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm">${p.price}</span>
                  <button className="text-xs font-medium text-[#7c4a63] opacity-0 transition-opacity group-hover:opacity-100">
                    Add to bag
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* AI skin analysis — the embedded widget */}
        <section
          id="analysis"
          className="mt-10 scroll-mt-20 bg-white py-14"
        >
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-[#9c6d83]">
                Powered by SkinLens
              </p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
                Not sure where to start?
              </h2>
              <p className="mt-4 max-w-md text-lg leading-relaxed text-[#6b5660]">
                Our free 60-second skin analysis reads your skin on your device —
                nothing is uploaded — and matches a routine from our range. Tap
                start when you&apos;re ready; the camera only turns on then.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-[#574651]">
                <li>• Private — no photo ever leaves your device</li>
                <li>• Personalized to your own skin</li>
                <li>• No account, no email required</li>
              </ul>
            </div>
            <div className="mx-auto w-full max-w-md rounded-[1.75rem] border border-[#ecd7df] bg-[#fbf4f6] p-3 shadow-sm">
              <iframe
                src="/embed"
                title="Aurélie Paris — AI skin analysis"
                allow="camera; fullscreen"
                className="h-[860px] w-full rounded-[1.4rem] border-0"
              />
            </div>
          </div>
        </section>

        {/* Developer / brand pitch */}
        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="rounded-[1.75rem] border border-[#ecd7df] bg-white p-7 sm:p-9">
            <h2 className="text-2xl font-semibold">Add SkinLens to your store</h2>
            <p className="mt-2 max-w-2xl text-[#6b5660]">
              One iframe. No backend, no SDK build step, no data pipeline — the
              analysis runs entirely in the shopper&apos;s browser, so you never
              touch a face image.
            </p>
            <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-center">
              <EmbedSnippet />
              <ul className="space-y-3 text-sm text-[#574651]">
                <li>✓ Drops into any site or CMS</li>
                <li>✓ On-device — GDPR-friendly by construction</li>
                <li>✓ White-label: your brand, your product feed</li>
                <li>✓ Responsive — works on mobile front cameras</li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#ecd7df] bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="text-lg font-semibold tracking-[0.2em] text-[#7c4a63]">
              AURÉLIE
            </span>
            <p className="mt-3 text-xs leading-relaxed text-[#9c8590]">
              A fictional brand, built to demonstrate the SkinLens analyzer
              embedded in a real storefront.
            </p>
          </div>
          {[
            { h: "Shop", links: ["Skincare", "Serums", "SPF", "Gift sets"] },
            { h: "Help", links: ["Shipping", "Returns", "Contact", "FAQ"] },
            { h: "Company", links: ["About", "Sustainability", "Careers"] },
          ].map((col) => (
            <div key={col.h}>
              <p className="text-sm font-semibold">{col.h}</p>
              <ul className="mt-3 space-y-2 text-sm text-[#6b5660]">
                {col.links.map((l) => (
                  <li key={l} className="cursor-pointer hover:text-[#7c4a63]">
                    {l}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-[#f0e1e7] py-5 text-center text-xs text-[#9c8590]">
          Demo only ·{" "}
          <Link href="/" className="underline">
            About SkinLens
          </Link>
        </div>
      </footer>
    </div>
  );
}
