// scraper/scraper.js
import axios from "axios";
import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config"; // ✅ loads .env locally

// 🔹 Supabase setup (Service Key for writes)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in env");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 🔹 Save vendor rate to Supabase (update instead of duplicate)
async function saveRate(vendor) {
  if (!vendor?.rate) {
    console.warn(`⚠️ Skipping ${vendor?.name} – no rate found`);
    return;
  }

  const { error } = await supabase.from("fx_vendors").upsert(
    {
      name: vendor.name,
      rate: vendor.rate,
      source: vendor.source,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "name" } // ✅ ensure update instead of duplicate
  );

  if (error) {
    console.error(`❌ Failed to save ${vendor.name}:`, error.message);
  } else {
    console.log(`✅ Saved ${vendor.name}: ₦${vendor.rate}/$1`);
  }
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

    if (!text) {
      console.warn(`⚠️ ${name}: selector ${selector} returned empty`);
      return null;
    }

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
    await scrapeWithScrapingBee(
      "https://abokifx.com",
      "table tr:contains('USD') td:nth-child(2)",
      "AbokiFX"
    ),
    await scrapeWithScrapingBee(
      "https://www.skrill.com/en/fees/",
      "div.fees__exchange-rate span",
      "Skrill"
    ),
    await scrapeWithScrapingBee(
      "https://www.westernunion.com/ng/en/home.html",
      "span[data-qa='exchange-rate']",
      "Western Union"
    ),
    await scrapeWithScrapingBee(
      "https://transfergo.com/en",
      ".exchange-rate",
      "TransferGo"
    ),
    await scrapeWithScrapingBee(
      "https://www.afriexapp.com",
      ".hero-section .rate",
      "Afriex"
    ),
    await scrapeWithScrapingBee(
      "https://pay4me.services",
      ".exchange-rate",
      "Pay4Me"
    ),
  ];
}

// 🔹 Main runner
async function main() {
  console.log("🚀 Starting vendor scrape…");

  const vendors = await scrapeVendors();
  for (const v of vendors) {
    if (v) await saveRate(v);
  }

  // ✅ Add TestVendor (always updates instead of duplicating)
  await saveRate({
    name: "TestVendor",
    rate: 1500,
    source: "manual",
  });

  console.log("🎉 Done: All vendors scraped & saved to Supabase");
}

main().catch((err) => {
  console.error("❌ Fatal error:", err.message);
});
