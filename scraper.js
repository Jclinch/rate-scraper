import puppeteer from "puppeteer";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // service key (not anon)
);

async function saveRate(vendor) {
  if (!vendor.rate) return;
  await supabase.from("fx_vendors").upsert({
    name: vendor.name,
    rate: vendor.rate,
    source: vendor.source,
    updated_at: new Date().toISOString(),
  });
  console.log(`✅ Saved ${vendor.name}: ₦${vendor.rate}/$1`);
}

// 🔹 Vendor Scrapers

async function scrapeAbokiFx(browser) {
  const page = await browser.newPage();
  await page.goto("https://abokifx.com/", { waitUntil: "domcontentloaded" });
  const usdRate = await page.$eval(
    "table tr:has(td:contains('USD')) td:nth-child(2)",
    (el) => el.textContent.replace(/,/g, "").trim()
  );
  return { name: "AbokiFX", rate: parseFloat(usdRate), source: "abokifx.com" };
}

async function scrapePayoneer(browser) {
  const page = await browser.newPage();
  await page.goto("https://payoneer.com", { waitUntil: "domcontentloaded" });
  // 🔴 NOTE: Replace selector with real Payoneer FX rate element
  const rate = 1520;
  return { name: "Payoneer", rate, source: "payoneer.com" };
}

async function scrapeSkrill(browser) {
  const page = await browser.newPage();
  await page.goto("https://www.skrill.com/en/fees/", { waitUntil: "domcontentloaded" });
  // 🔴 Replace with real selector for USD→NGN
  const rate = 1522;
  return { name: "Skrill", rate, source: "skrill.com" };
}

async function scrapeWesternUnion(browser) {
  const page = await browser.newPage();
  await page.goto("https://www.westernunion.com/ng/en/home.html", {
    waitUntil: "domcontentloaded",
  });
  // 🔴 Replace with real selector
  const rate = 1523;
  return { name: "Western Union", rate, source: "westernunion.com" };
}

async function scrapeTransferGo(browser) {
  const page = await browser.newPage();
  await page.goto("https://transfergo.com", { waitUntil: "domcontentloaded" });
  // 🔴 Replace with real selector
  const rate = 1525;
  return { name: "TransferGo", rate, source: "transfergo.com" };
}

async function scrapeAfriex(browser) {
  const page = await browser.newPage();
  await page.goto("https://afriexapp.com", { waitUntil: "domcontentloaded" });
  // 🔴 Replace with real selector
  const rate = 1521;
  return { name: "Afriex", rate, source: "afriexapp.com" };
}

async function scrapePay4Me(browser) {
  const page = await browser.newPage();
  await page.goto("https://pay4me.services", { waitUntil: "domcontentloaded" });
  // 🔴 Replace with real selector
  const rate = 1524;
  return { name: "Pay4Me", rate, source: "pay4me.services" };
}

// 🔹 Main
async function main() {
  const browser = await puppeteer.launch({ headless: "new" });

  const vendors = [
    await scrapeAbokiFx(browser),
    await scrapePayoneer(browser),
    await scrapeSkrill(browser),
    await scrapeWesternUnion(browser),
    await scrapeTransferGo(browser),
    await scrapeAfriex(browser),
    await scrapePay4Me(browser),
  ];

  for (const v of vendors) {
    await saveRate(v);
  }

  await browser.close();
  console.log("🎉 Scraping finished");
}

main().catch((err) => console.error("❌ Scraper failed:", err));
