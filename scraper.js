import axios from "axios";
import * as cheerio from "cheerio"; // for parsing HTML
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function scrapeWithScrapingBee(url, selector, name) {
  try {
    const res = await axios.get("https://app.scrapingbee.com/api/v1", {
      params: {
        api_key: process.env.SCRAPINGBEE_KEY,
        url: url,
        render_js: "true", // ensures JS-heavy sites are rendered
      },
    });

    const $ = cheerio.load(res.data);
    const text = $(selector).first().text().replace(/,/g, "").trim();
    const rate = parseFloat(text.match(/\d+(\.\d+)?/)[0]);

    return { name, rate, source: url };
  } catch (err) {
    console.error(`❌ Failed to scrape ${name}`, err.message);
    return null;
  }
}

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

async function main() {
  const vendors = [
    await scrapeWithScrapingBee("https://abokifx.com", "table tr:contains('USD') td:nth-child(2)", "AbokiFX"),
    await scrapeWithScrapingBee("https://www.payoneer.com", ".exchange-rate-selector", "Payoneer"),
    await scrapeWithScrapingBee("https://www.skrill.com/en/fees/", ".fees-exchange-rate", "Skrill"),
    await scrapeWithScrapingBee("https://www.westernunion.com/ng/en/home.html", ".exchange-rate", "Western Union"),
    await scrapeWithScrapingBee("https://transfergo.com", ".exchange-rate", "TransferGo"),
    await scrapeWithScrapingBee("https://afriexapp.com", ".exchange-rate", "Afriex"),
    await scrapeWithScrapingBee("https://pay4me.services", ".exchange-rate", "Pay4Me"),
  ];

  for (const v of vendors) {
    if (v) await saveRate(v);
  }

  console.log("🎉 Scraping finished via ScrapingBee");
}

main().catch(console.error);
