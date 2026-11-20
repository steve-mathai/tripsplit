import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { How } from "@/components/landing/how";
import { Menu } from "@/components/landing/menu";
import { RevealRoot } from "@/components/landing/reveal";
import { Showcase } from "@/components/landing/showcase";
import { Start } from "@/components/landing/start";

// Static page: everything on it is computed from the demo data at build time.
export default function LandingPage() {
  return (
    <>
      <RevealRoot />
      <main>
        <Hero />
        <Showcase />
        <Menu />
        <How />
        <Start />
      </main>
      <Footer />
    </>
  );
}
