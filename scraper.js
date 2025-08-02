// scraper/scraper.js
import axios from "axios";
import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";

// 🔹 Supabase setup
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// 🔹 Save vendor rate to Supabase
async function saveRate(vendor) {
  if (!vendor?.rate) return;
  await supabase.from("fx_vendors").upsert({
    name: vendor.name,
    rate: vendor.rate,
    source: vendor.source,
    updated_at: new Date().toISOString(),
  });
  console.log(`✅ Saved ${vendor.name}: ₦${vendor.rate}/$1`);
}

// 🔹 ScrapingBee helper
async function scrapeWithScrapingBee(url, selector, name) {
  try {
    const res = await axios.get("https://app.scrapingbee.com/api/v1", {
      params: {
        api_key: process.env.SCRAPINGBEE_KEY,
        url,
        render_js: "true",
      },
    });

    const $ = cheerio.load(res.data);
    const text = $(selector).first().text().replace(/,/g, "").trim();
    const match = text.match(/\d+(\.\d+)?/);
    const rate = match ? parseFloat(match[0]) : null;

    return { name, rate, source: url };
  } catch (err) {
    console.error(`❌ ${name} scrape failed:`, err.message);
    return null;
  }
}

// 🔹 Vendors
async function scrapeVendors() {
  return [
    // ✅ AbokiFX — parallel market USD/NGN
    await scrapeWithScrapingBee(
      "https://abokifx.com",
      "table tr:contains('USD') td:nth-child(2)",
      "AbokiFX"
    ),

    // ✅ Skrill — fees page
    await scrapeWithScrapingBee(
      "https://www.skrill.com/en/fees/",
      "div.fees__exchange-rate span",
      "Skrill"
    ),

    // ✅ Western Union Nigeria — homepage calculator
    await scrapeWithScrapingBee(
      "https://www.westernunion.com/ng/en/home.html",
      "span[data-qa='exchange-rate']",
      "Western Union"
    ),

    // ✅ TransferGo — homepage calculator
    await scrapeWithScrapingBee(
      "https://transfergo.com/en",
      ".exchange-rate",
      "TransferGo"
    ),

    // ✅ Afriex — homepage rate display
    await scrapeWithScrapingBee(
      "https://www.afriexapp.com",
      ".hero-section .rate", // ⚠️ adjust if structure changes
      "Afriex"
    ),

    // ✅ Pay4Me — homepage
    await scrapeWithScrapingBee(
      "https://pay4me.services",
      ".exchange-rate", // ⚠️ adjust with DevTools
      "Pay4Me"
    ),
  ];
}

// 🔹 Main runner
async function main() {
  const vendors = await scrapeVendors();
  for (const v of vendors) {
    if (v) await saveRate(v);
  }
  console.log("🎉 All vendors scraped & saved to Supabase");
}

main().catch(console.error);
