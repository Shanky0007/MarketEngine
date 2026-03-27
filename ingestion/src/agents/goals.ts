const AGENT_GOALS: Record<string, { url: string; goal: string; signal_id: string }> = {

  fii_dii: {
    signal_id: "fii_dii",
    url: "https://www.nseindia.com/market-data/fii-dii-activity",
    goal: `Extract today's FII and DII net activity. Return ONLY JSON:
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
    url: "https://www.bseindia.com/markets/equity/EQReports/bulk_deals.aspx",
    goal: `Extract today's bulk and block deals table. Return ONLY JSON:
{
  "deals": [
    { "company": "string", "quantity": number, "price": number, "type": "buy|sell" }
  ],
  "count": number
}
Max 10 deals. If unavailable: { "status": "unavailable" }`
  },

  insider_trades: {
    signal_id: "insider_trades",
    url: "https://www.nseindia.com/companies-listing/corporate-filings-insider-trading",
    goal: `Extract insider trading disclosures filed today. Return ONLY JSON:
{
  "filings": [
    { "company": "string", "insider": "string", "type": "buy|sell", "value_cr": number }
  ],
  "count": number
}
Max 10 filings. If unavailable: { "status": "unavailable" }`
  },

  option_chain: {
    signal_id: "option_chain",
    url: "https://www.nseindia.com/option-chain",
    goal: `Extract the current put-call ratio and max pain for NIFTY and BANKNIFTY.
Return ONLY JSON:
{
  "nifty": { "pcr": number, "max_pain": number, "iv_atm": number },
  "banknifty": { "pcr": number, "max_pain": number }
}
If unavailable: { "status": "unavailable" }`
  },

  sgx_nifty: {
    signal_id: "sgx_nifty",
    url: "https://www.google.com/finance/quote/NIFTY_50:INDEXNSE",
    goal: `Extract the current NIFTY 50 index value and percentage change.
Return ONLY JSON: { "price": number, "change_pct": number, "timestamp": "string" }
If unavailable: { "status": "unavailable" }`
  },

  us_markets: {
    signal_id: "us_markets",
    url: "https://www.cnbc.com/world/?region=world",
    goal: `Extract the prior US session closing values for Dow Jones and Nasdaq.
Return ONLY JSON:
{
  "dow": { "close": number, "change_pct": number },
  "nasdaq": { "close": number, "change_pct": number }
}
If unavailable: { "status": "unavailable" }`
  },

  usd_inr: {
    signal_id: "usd_inr",
    url: "https://www.google.com/finance/quote/USD-INR",
    goal: `Extract the current USD/INR exchange rate and percentage change.
Return ONLY JSON: { "rate": number, "change_pct": number }
If unavailable: { "status": "unavailable" }`
  },

  brent_crude: {
    signal_id: "brent_crude",
    url: "https://oilprice.com/oil-price-charts/",
    goal: `Extract the current Brent Crude oil price and percentage change.
Return ONLY JSON: { "price_usd": number, "change_pct": number }
If unavailable: { "status": "unavailable" }`
  },

  gold_mcx: {
    signal_id: "gold_mcx",
    url: "https://www.mcxindia.com/market-data/spot-market-price",
    goal: `Extract the current MCX Gold spot price and percentage change.
Return ONLY JSON: { "price_inr_10g": number, "change_pct": number }
If unavailable: { "status": "unavailable" }`
  },

  earnings_bse: {
    signal_id: "earnings_bse",
    url: "https://www.bseindia.com/corporates/ann.html",
    goal: `Extract companies that filed quarterly earnings results in the last 24 hours.
Return ONLY JSON:
{
  "results": [
    { "company": "string", "scrip_code": "string", "result_type": "string" }
  ],
  "count": number
}
Max 10. If unavailable: { "status": "unavailable" }`
  },

  rbi_releases: {
    signal_id: "rbi_releases",
    url: "https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx",
    goal: `Check if any new RBI press releases or circulars were published today.
Return ONLY JSON:
{
  "new_releases": [
    { "title": "string", "date": "string", "url": "string" }
  ],
  "count": number
}
If none today: { "count": 0, "new_releases": [] }`
  },

  asia_cues: {
    signal_id: "asia_cues",
    url: "https://www.cnbc.com/asia-markets/",
    goal: `Extract current values for Nikkei 225, Hang Seng, and KOSPI.
Return ONLY JSON:
{
  "nikkei": { "value": number, "change_pct": number },
  "hang_seng": { "value": number, "change_pct": number },
  "kospi": { "value": number, "change_pct": number }
}
If unavailable: { "status": "unavailable" }`
  }
};

export default AGENT_GOALS;
