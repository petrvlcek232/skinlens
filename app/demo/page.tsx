import type { Metadata } from "next";
import Link from "next/link";
import { Fraunces } from "next/font/google";
import { EmbedSnippet } from "@/components/marketing/embed-snippet";
import { ProductArt, type BottleShape } from "@/components/marketing/product-art";

const serif = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Aurélie Paris — Skincare with an AI skin analysis (SkinLens demo)",
  description:
    "A fictional beauty storefront showing the SkinLens widget embedded via iframe.",
  robots: { index: false },
};

interface Product {
  name: string;
  category: string;
  active: string;
  /** What the active does — grounded in the clinical reference data. */
  use: string;
  price: number;
  shape: BottleShape;
  from: string;
  to: string;
}

// Aurélie is a fictional brand, but each product is built on a real, evidence-
// backed active with an honest description (from lib/clinical/dermatology.ts) —
// realistic and copyright-clean.
const PRODUCTS: Product[] = [
  { name: "Velvet Cleansing Balm", category: "Cleanse", active: "Ceramides", use: "Lifts makeup while protecting the skin barrier.", price: 28, shape: "tube", from: "#f6dbe5", to: "#e6abc6" },
  { name: "Calm Niacinamide Serum", category: "Treat", active: "Niacinamide 10%", use: "Calms redness and refines uneven tone.", price: 34, shape: "dropper", from: "#f9e7ec", to: "#eebfc8" },
  { name: "Bright Vitamin C Serum", category: "Treat", active: "Vitamin C 15%", use: "Antioxidant that brightens and evens tone.", price: 46, shape: "dropper", from: "#fceeda", to: "#f2cf9f" },
  { name: "Overnight Retinal Serum", category: "Treat", active: "Retinal 0.2%", use: "Speeds renewal to smooth fine lines.", price: 56, shape: "dropper", from: "#e9dcf1", to: "#c3a9d9" },
  { name: "Ceramide Day Cream", category: "Moisturize", active: "Ceramides + HA", use: "Repairs the barrier and locks in moisture.", price: 42, shape: "jar", from: "#f1e8df", to: "#ddc3ac" },
  { name: "Bright Eye Concentrate", category: "Eyes", active: "Caffeine + peptides", use: "De-puffs and softens the under-eye area.", price: 38, shape: "dropper", from: "#deebf2", to: "#aecde0" },
  { name: "Mineral Veil SPF 50", category: "Protect", active: "Zinc oxide", use: "Mineral broad-spectrum daily protection.", price: 30, shape: "pump", from: "#fceeda", to: "#f2cf9f" },
  { name: "Smooth AHA Exfoliant", category: "Renew", active: "Glycolic + lactic acid", use: "Resurfaces for smoother, brighter skin.", price: 32, shape: "dropper", from: "#e7dcef", to: "#cdb6de" },
];

const NAV = ["New In", "Skincare", "Serums", "Moisturizers", "SPF", "About"];

export default function DemoPage() {
  return (
    <div className="min-h-dvh bg-[#fbf4f6] text-[#3a2b36]">
      <div className="bg-[#7c4a63] py-2 text-center text-xs font-medium tracking-wide text-white">
        Complimentary shipping over $50 · Free AI skin analysis
      </div>

      <header className="sticky top-0 z-20 border-b border-[#ecd7df] bg-[#fbf4f6]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <span className={`${serif.className} text-2xl tracking-[0.18em] text-[#7c4a63]`}>
            AURÉLIE
          </span>
          <nav className="hidden gap-6 text-sm text-[#6b5660] lg:flex">
            {NAV.map((item) => (
              <span key={item} className="cursor-pointer transition-colors hover:text-[#7c4a63]">
                {item}
              </span>
            ))}
          </nav>
          <div className="flex items-center gap-4 text-sm text-[#6b5660]">
            <span className="hidden cursor-pointer hover:text-[#7c4a63] sm:inline">Search</span>
            <span className="cursor-pointer hover:text-[#7c4a63]">Bag (0)</span>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-12 md:grid-cols-2 lg:py-20">
          <div className="animate-fade-up">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#9c6d83]">
              New · The Ritual Edit
            </p>
            <h1 className={`${serif.className} mt-4 text-5xl leading-[1.05] sm:text-6xl`}>
              Skincare that starts with{" "}
              <span className="italic text-[#7c4a63]">your skin.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-[#6b5660]">
              Clean, barrier-first formulas — paired with a free AI skin analysis
              that builds your routine in seconds.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#analysis"
                className="rounded-full bg-[#7c4a63] px-6 py-3 text-sm font-medium text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#653a51] hover:shadow-md"
              >
                Take the skin analysis
              </a>
              <button className="rounded-full border border-[#d8b9c6] px-6 py-3 text-sm font-medium text-[#7c4a63] transition-colors hover:bg-white">
                Shop best sellers
              </button>
            </div>
          </div>
          <div className="relative aspect-[5/4] overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#f3d9e2] via-[#ecc7d6] to-[#d9b0c4] shadow-sm md:aspect-square">
            <ProductArt
              shape="dropper"
              className="absolute left-1/2 top-1/2 h-[62%] -translate-x-1/2 -translate-y-1/2"
            />
            <p className={`${serif.className} absolute bottom-7 left-7 text-2xl italic text-[#6b3a52]`}>
              Aurélie
              <br />
              Paris
            </p>
          </div>
        </section>

        {/* Best sellers */}
        <section className="mx-auto max-w-6xl px-5 py-8">
          <div className="flex items-baseline justify-between">
            <h2 className={`${serif.className} text-3xl`}>Best sellers</h2>
            <span className="text-sm text-[#9c6d83]">Shop all →</span>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
            {PRODUCTS.map((p) => (
              <div key={p.name} className="group cursor-pointer">
                <div
                  className="relative aspect-[3/4] overflow-hidden rounded-2xl shadow-sm transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-lg"
                  style={{ backgroundImage: `linear-gradient(155deg, ${p.from}, ${p.to})` }}
                >
                  <ProductArt
                    shape={p.shape}
                    className="absolute left-1/2 top-1/2 h-[72%] -translate-x-1/2 -translate-y-1/2 transition-transform duration-300 group-hover:scale-105"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-white/75 px-2 py-0.5 text-[10px] font-medium text-[#7c4a63] backdrop-blur">
                    {p.active}
                  </span>
                </div>
                <p className="mt-2.5 text-[11px] uppercase tracking-wide text-[#9c6d83]">
                  {p.category}
                </p>
                <p className="text-sm font-medium leading-snug">{p.name}</p>
                <p className="mt-0.5 text-xs leading-snug text-[#6b5660]">{p.use}</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-sm font-medium">${p.price}</span>
                  <span className="text-xs font-medium text-[#7c4a63] opacity-0 transition-opacity group-hover:opacity-100">
                    Add to bag
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* AI skin analysis — the embedded widget */}
        <section id="analysis" className="mt-12 scroll-mt-24 bg-white py-16">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#9c6d83]">
                Powered by SkinLens
              </p>
              <h2 className={`${serif.className} mt-3 text-4xl leading-tight`}>
                Not sure where to start?
              </h2>
              <p className="mt-4 max-w-md text-lg leading-relaxed text-[#6b5660]">
                Our free 60-second skin analysis reads your skin on your device —
                nothing is uploaded — and matches a routine from our range. Tap
                start when you&apos;re ready; the camera only turns on then.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-[#574651]">
                <li className="flex gap-2"><span className="text-[#7c4a63]">✓</span> Private — no photo ever leaves your device</li>
                <li className="flex gap-2"><span className="text-[#7c4a63]">✓</span> Personalized to your own skin</li>
                <li className="flex gap-2"><span className="text-[#7c4a63]">✓</span> No account, no email required</li>
              </ul>
            </div>
            <div className="mx-auto w-full max-w-md rounded-[1.75rem] border border-[#ecd7df] bg-[#fbf4f6] p-3 shadow-md">
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
            <h2 className={`${serif.className} text-3xl`}>Add SkinLens to your store</h2>
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
            <span className={`${serif.className} text-xl tracking-[0.18em] text-[#7c4a63]`}>
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
