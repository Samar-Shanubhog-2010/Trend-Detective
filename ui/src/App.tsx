import { lazy, Suspense } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import ExploreVariables from "@/components/ExploreVariables";
import UnderstandingPlanet from "@/components/UnderstandingPlanet";
import Footer from "@/components/Footer";

const GameApp = lazy(() => import("@/game-nisac/GameApp"));

export default function App() {
  const isGameRoute = window.location.pathname.replace(/\/+$/, "") === "/game";

  if (isGameRoute) {
    return (
      <Suspense
        fallback={
          <main className="flex min-h-screen items-center justify-center bg-[#0b111e] text-slate-200">
            Loading investigation...
          </main>
        }
      >
        <GameApp />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#020711] text-white antialiased selection:bg-cyan-500/30 selection:text-white">
      <Header />
      <main>
        <Hero />
        <ExploreVariables />
        <UnderstandingPlanet />
      </main>
      <Footer />
    </div>
  );
}
