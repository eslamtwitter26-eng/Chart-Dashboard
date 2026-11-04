import type { AssetCard, EmailData } from "./types";
import gbpUsdChart from "./images/gbp-usd.gif";
import usdJpyChart from "./images/usd-jpy.gif";
import eurUsdChart from "./images/eur-usd.gif";
import ibexChart from "./images/ibex.gif";
import crudeOilChart from "./images/crude-oil.gif";
import goldChart from "./images/gold.gif";
import bitcoinUsdChart from "./images/bitcoin-usd.gif";
import nvidiaChart from "./images/nvidia.gif";

export const report: EmailData = {
  subject: "FW: Technical Analysis (European Session)",
  session: "European Session",
  date: "Wednesday, November 4, 2026",
  receivedAt: "2026-11-04T20:42:57.000Z",
  fetchedAt: Date.parse("2026-11-04T20:42:57.000Z"),
  cards: [
    {
      id: "gbp-usd", assetName: "GBP/USD", timeframe: "30 MIN", pivot: "1.3415",
      watchText: "Towards 1.3498",
      preference: "The upside prevails as long as 1.3415 is support, with 1.3498 and 1.3515 as targets",
      alternative: "Below 1.3415, expect 1.3387 and 1.3371.",
      comment: "The RSI is above its neutrality area at 50. The MACD is above its signal line and positive. The price is above its 20 and 50 period moving average (respectively at 1.3439 and 1.3426).",
      chartUrl: gbpUsdChart, direction: "neutral",
    },
    {
      id: "usd-jpy", assetName: "USD/JPY", timeframe: "30 MIN", pivot: "158.16",
      watchText: "The downside prevails as long as 158.16 is resistance",
      preference: "The downside prevails as long as 158.16 is resistance, with 157.57 and 157.45 as targets",
      alternative: "Above 158.16, look for 158.37 and 158.50.",
      comment: "The RSI is below its neutrality area at 50. The MACD is below its signal line and negative. The configuration is negative. The price stands below its 20 and 50 period moving average (respectively at 158.25 and 158.22).",
      chartUrl: usdJpyChart, direction: "neutral",
    },
    {
      id: "eur-usd", assetName: "EUR/USD", timeframe: "30 MIN", pivot: "1.1198",
      watchText: "Watch 1.1274",
      preference: "The upside prevails as long as 1.1198 is support, with 1.1274 and 1.1286 as targets",
      alternative: "Below 1.1198, expect 1.1178 and 1.1166.",
      comment: "The RSI is above its neutrality area at 50. The MACD is above its signal line and positive. The price is above its 20 and 50 period moving average (respectively at 1.1218 and 1.1201).",
      chartUrl: eurUsdChart, direction: "neutral",
    },
    {
      id: "ibex", assetName: "IBEX (MEFF)", timeframe: "30 MIN", pivot: "18,980",
      watchText: "Key resistance at 18,980.",
      preference: "Short positions below 18980 with targets at 18660 & 18521 in extension.",
      alternative: "Above 18980 look for further upside with 19080 & 19160 as targets.",
      comment: "The RSI is around its neutrality area at 50%.",
      chartUrl: ibexChart, direction: "bearish",
    },
    {
      id: "crude-oil", assetName: "Crude Oil (WTI)", timeframe: "30 MIN", pivot: "100.00",
      watchText: "Choppy.",
      preference: "Short positions below 100.00 with targets at 92.00 & 90.00 in extension.",
      alternative: "Above 100.00 look for further upside with 102.00 & 103.35 as targets.",
      comment: "The RSI is mixed to bearish.",
      chartUrl: crudeOilChart, direction: "bearish",
    },
    {
      id: "gold", assetName: "Gold", timeframe: "30 MIN", pivot: "3,934",
      watchText: "Throwback or further upside?",
      preference: "The upside prevails as long as 3,934 is support, with 4,049 and 4,069 as targets",
      alternative: "Below 3,934, expect 3,901 and 3,881.",
      comment: "Prices are now closing in on our first target. Should this level hold, a throwback is likely to emerge; however, a convincing break above it could open the door to additional upside.",
      chartUrl: goldChart, direction: "neutral",
    },
    {
      id: "bitcoin-usd", assetName: "Bitcoin / USD", timeframe: "30 MIN", pivot: "75,836",
      watchText: "First target, continuation or consolidation?",
      preference: "The technical picture is a bit hazy. Above 75,836, look for a rise towards 78,404",
      alternative: "Below 75,836, expect 75,049 and 74,581.",
      comment: "Prices are now close to our first target. Reaching this level could trigger a throwback. Conversely, a clear break above it could help drive the asset price higher.",
      chartUrl: bitcoinUsdChart, direction: "neutral",
    },
    {
      id: "nvidia", assetName: "Nvidia", timeframe: "30 MIN", pivot: "204.43",
      watchText: "Rebound towards 212.05",
      preference: "Rebound above 204.43 towards 212.05",
      alternative: "Below 204.43, expect 201.88 and 200.36.",
      comment: "The RSI is below its neutrality area at 50. The MACD is above its signal line and negative. The configuration is mixed. The price stands below its 20 and 50 period moving average (respectively at 206.68 and 207.72).",
      chartUrl: nvidiaChart, direction: "neutral",
    },
  ] satisfies AssetCard[],
};
