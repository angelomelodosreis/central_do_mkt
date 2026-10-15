import { syncRealBuPages } from "./sync-real-bu-pages.mjs";

export async function seedInsightsLps() {
  await syncRealBuPages();
}

if (process.argv[1]?.endsWith("seed-insights-lps.mjs")) {
  seedInsightsLps().catch((err) => {
    console.error("Erro no seed:", err);
    process.exit(1);
  });
}
