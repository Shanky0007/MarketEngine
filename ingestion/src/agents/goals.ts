const AGENT_GOALS: Record<string, { url: string; goal: string; signal_id: string; timeout_ms?: number }> = {

  fii_dii: {
    signal_id: "fii_dii",
    url: "https://www.moneycontrol.com/stocks/marketstats/fii_dii_activity/index.php",
    timeout_ms: 480_000, // 8 min — heavy page
    goal: `Extract today's FII and DII net activity from this page. Return ONLY JSON:
{
  "date": "DD-MMM-YYYY",
  "fii": { "buy_value": number, "sell_value": number, "net_value": number },
  "dii": { "buy_value": number, "sell_value": number, "net_value": number },
  "unit": "crores INR"
}
If unavailable: { "status": "unavailable", "reason": "string" }`
  },

  block_deals: {
    signal_id: "block_deals",
    url: "https://www.moneycontrol.com/stocks/marketstats/blockdeals.html",
    timeout_ms: 480_000, // 8 min — heavy page
    goal: `Extract today's block deals from the table on this page. Return ONLY JSON:
{
  "deals": [
    { "company": "string", "quantity": number, "price": number, "type": "buy|sell" }
  ],
  "count": number
}
Max 10 deals. If no deals today or unavailable: { "status": "unavailable" }`
  },

  insider_trades: {
    signal_id: "insider_trades",
    url: "https://www.moneycontrol.com/stocks/marketstats/insider.html",
    timeout_ms: 480_000, // 8 min — heavy page
    goal: `Extract recent insider trading disclosures from the table. Return ONLY JSON:
{
  "filings": [
    { "company": "string", "insider": "string", "type": "acquisition|disposal", "value_cr": number }
  ],
  "count": number
}
Max 10 filings. If unavailable: { "status": "unavailable" }`
  },

  option_chain: {
    signal_id: "option_chain",
    url: "https://www.moneycontrol.com/stocks/fno/marketstats/nifty-option-chain.html",
    timeout_ms: 480_000, // 8 min — heavy page
    goal: `Extract the NIFTY put-call ratio (PCR) and any max pain data visible on this page.
Return ONLY JSON:
{
  "nifty_pcr": number,
  "max_pain": number
}
If unavailable: { "status": "unavailable" }`
  },

  nifty_50: {
    signal_id: "nifty_50",
    url: "https://www.google.com/finance/quote/NIFTY_50:INDEXNSE",
    goal: `Extract the NIFTY 50 index value and percentage change shown on this page.
Return ONLY JSON: { "price": number, "change_pct": number }
If unavailable: { "status": "unavailable" }`
  },

  us_markets: {
    signal_id: "us_markets",
    url: "https://www.google.com/finance/quote/.DJI:INDEXDJX",
    goal: `Extract the Dow Jones Industrial Average value and percentage change shown on this page.
Return ONLY JSON: { "dow": { "close": number, "change_pct": number } }
If unavailable: { "status": "unavailable" }`
  },

  usd_inr: {
    signal_id: "usd_inr",
    url: "https://www.google.com/finance/quote/USD-INR",
    goal: `Extract the USD/INR exchange rate and percentage change shown on this page.
Return ONLY JSON: { "rate": number, "change_pct": number }
If unavailable: { "status": "unavailable" }`
  },

  brent_crude: {
    signal_id: "brent_crude",
    url: "https://www.moneycontrol.com/commodity/mcx-crudeoil-price/",
    goal: `Extract the current crude oil price and percentage change from this page.
Return ONLY JSON: { "price": number, "change_pct": number, "unit": "INR per barrel" }
If unavailable: { "status": "unavailable" }`
  },

  gold_mcx: {
    signal_id: "gold_mcx",
    url: "https://www.moneycontrol.com/commodity/mcx-gold-price/",
    goal: `Extract the current MCX Gold futures price and percentage change from this page.
Return ONLY JSON: { "price_inr_10g": number, "change_pct": number }
If unavailable: { "status": "unavailable" }`
  },

  earnings_bse: {
    signal_id: "earnings_bse",
    url: "https://www.moneycontrol.com/markets/earnings/latest-results/",
    timeout_ms: 480_000, // 8 min — heavy page
    goal: `Extract companies that reported quarterly earnings results recently from this page.
Return ONLY JSON:
{
  "results": [
    { "company": "string", "result_type": "string" }
  ],
  "count": number
}
Max 10. If unavailable: { "status": "unavailable" }`
  },

  rbi_releases: {
    signal_id: "rbi_releases",
    url: "https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx",
    goal: `Check if any new RBI press releases were published today or yesterday. Return ONLY JSON:
{
  "new_releases": [
    { "title": "string", "date": "string" }
  ],
  "count": number
}
If none today: { "count": 0, "new_releases": [] }`
  },

  asia_cues: {
    signal_id: "asia_cues",
    url: "https://www.google.com/finance/quote/NI225:INDEXNIKKEI",
    goal: `Extract the Nikkei 225 index value and percentage change shown on this page.
Return ONLY JSON: { "nikkei": { "value": number, "change_pct": number } }
If unavailable: { "status": "unavailable" }`
  }
};

export default AGENT_GOALS;

// ─── Sector Pulse Agent Goals ─────────────────────────────────────────────────

export const SECTOR_AGENT_GOALS: Record<string, { url: string; goal: string; signal_id: string; timeout_ms?: number }> = {

  sector_fii_block_deals: {
    signal_id: "sector_fii_block_deals",
    url: "https://www.bseindia.com/markets/equity/EQReports/bulk_deals.aspx",
    timeout_ms: 480_000,
    goal: `Extract ALL bulk and block deals from today's table.
For each deal return: company name, BSE scrip code, quantity, price,
transaction type (buy or sell), deal value in crores.
Return ONLY JSON:
{
  "deals": [
    {
      "company": "string",
      "scrip_code": "string",
      "quantity": number,
      "price": number,
      "type": "buy" | "sell",
      "value_cr": number
    }
  ],
  "count": number,
  "session": "string (morning/full day)"
}
If no deals today: { "deals": [], "count": 0 }
If unavailable: { "status": "unavailable" }`
  },

  sector_pcr: {
    signal_id: "sector_pcr",
    url: "https://www.nseindia.com/option-chain",
    timeout_ms: 480_000,
    goal: `Extract the put-call ratio for each of these sectoral indices:
NIFTY IT, NIFTY BANK, NIFTY PHARMA, NIFTY AUTO, NIFTY FMCG,
NIFTY ENERGY, NIFTY METAL.
Return ONLY JSON:
{
  "sectoral_pcr": [
    { "index": "string", "pcr": number, "max_pain": number }
  ],
  "nifty_pcr": number,
  "timestamp": "string"
}
If a sector index option is not available, set pcr to null.
If page unavailable: { "status": "unavailable" }`
  },

  sector_fii_cumulative: {
    signal_id: "sector_fii_cumulative",
    url: "https://www.nseindia.com/market-data/fii-dii-activity",
    goal: `Extract today's cumulative FII and DII net activity to date.
Return ONLY JSON:
{
  "date": "DD-MMM-YYYY",
  "fii": { "buy_value": number, "sell_value": number, "net_value": number },
  "dii": { "buy_value": number, "sell_value": number, "net_value": number },
  "unit": "crores INR",
  "as_of": "string (time this data was last updated on the page)"
}
If unavailable: { "status": "unavailable" }`
  },

  sector_insider_trades: {
    signal_id: "sector_insider_trades",
    url: "https://www.sebi.gov.in/sebiweb/other/OtherAction.do?doRecognisedFpi=yes&intmId=4",
    timeout_ms: 480_000,
    goal: `Extract all insider trading disclosures filed today.
Return ONLY JSON:
{
  "filings": [
    {
      "company": "string",
      "scrip_code": "string",
      "insider_name": "string",
      "transaction_type": "buy" | "sell",
      "shares": number,
      "value_cr": number
    }
  ],
  "count": number
}
If none today: { "filings": [], "count": 0 }
If unavailable: { "status": "unavailable" }`
  },

  sector_mf_inflows: {
    signal_id: "sector_mf_inflows",
    url: "https://www.amfiindia.com/net-data-dated-fund-activity",
    goal: `Extract the latest weekly mutual fund net inflows by equity category.
Return ONLY JSON:
{
  "week_ending": "string",
  "categories": [
    { "category": "string", "net_inflow_cr": number }
  ]
}
Categories to extract: Large Cap, Mid Cap, Small Cap, Sectoral/Thematic,
IT/Technology funds, Banking/Financial funds, Pharma/Healthcare funds.
If unavailable: { "status": "unavailable" }`
  }

};
