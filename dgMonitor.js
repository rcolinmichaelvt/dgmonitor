// ============================================================
//  Takeoff Monitors — Dollar General Pokémon Restock Monitor
// ============================================================

const fs = require("fs");
const path = require("path");
const { fileURLToPath } = require("url");

const WEBHOOK_URL = process.env.DG_WEBHOOK;

// ── Config ──────────────────────────────────────────────────
const CONFIG = {
  // Latitude / longitude for the search center
  latitude: 37.236075,
  longitude: -80.427231,
  radius: 25, // miles

  // SKUs to monitor (UPC codes)
  skus: [
    { upc: "196214158801", label: "30th ETBs" },
    { upc: "196214158757", label: "30th Posters" },
    { upc: "196214152397", label: "Knockout Boxes" },
    { upc: "196214150669", label: "Poster Collections"},
    { upc: "820650105838", label: "Mini Tins" },
    //{ upc: "820650850363", label: "Phantasmal Portfolios"},
    { upc: "196214152076", label: "AH Ex Boxes"},
    { upc: "820650801563", label: "Booster Packs"},
    { upc: "820650806568", label: "Checklane Blisters"},
    { upc: "820650809859", label: "3 Pack Tins"},
    //{ upc: "196214133099", label: "Sticker Collections"},
  ],

  // How often to poll (ms)
  pollInterval: 3 * 60 * 1000,          // 5 minutes

  // How often to send a full stock summary (ms)
  fullSummaryInterval: 6 * 60 * 60 * 1000, // 6 hours

  // Path to the persistent cache file (sits next to this script)
  cacheFile: path.join(__dirname, "dg-stock-cache.json"),

  // Static session values — these don't rotate with the auth token
  session: {
    "x-dg-appsessiontoken": "SNB4WK4GLWBTIR7WENW6CTCU5QO20J2R",
    "x-dg-apptoken":        "6dinqus4908fkssw9h7aa8ldcgkimn3p",
    "x-dg-customerguid":    "000000000000000000000000002436478174",
    "x-dg-deviceuniqueid":  "f6c4e08b-136a-45a9-957d-27694ce813bd",
    "x-dg-partnerapitoken": "11619A82-8E80-4A6F-8AD2-A14F4A8FFD74",
    // Full cookie string from the browser — needed by the token refresh endpoint
    cookie: "optOut=false; uniqueDeviceId=3974657f-0bfc-4ef3-ba01-39d386c483f1; authType=0; appToken=6dinqus4908fkssw9h7aa8ldcgkimn3p; affinity=\"1069399ee55b7332\"; appSessionToken=2GIMSRPO6DYXLO6N3NNC8WA7RI0854KN; customerGuid=000000000000000000000000002317284937; partnerApiToken=11619A82-8E80-4A6F-8AD2-A14F4A8FFD74; akamaiLatitude=37.2556; akamaiLongitude=-80.429; order-type=in-store",
  },

  // Auth — the authorization token is refreshed automatically; seed with any valid token to start
  auth: {
    authorization: "Bearer eyJ0eXAiOiJhdCtKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6Ik5qRTJNemczTXpSRVFrUXpNak5GUmprMU1FUkNNRUZDTVRBek1FWTFRa0pCTXpRM1EwTkNNZyJ9.eyJzY29wZSI6bnVsbCwiaWF0IjoxNzgwNTgwODA3LCJleHAiOjE3ODA1ODQ0MDcsImF1ZCI6IldLOTlLc2VCYnUybmFoNC1ibFE3ZmsyUiIsImlzcyI6Imh0dHBzOi8vcHJvZC1kZ2dvLyIsInN1YiI6IldLOTlLc2VCYnUybmFoNC1ibFE3ZmsyUiIsInNpZCI6IlRXMU9makF5TURRMU1EVXpOVFEwWWpBM016SXpNak14TXpFek9ETTNNekV3TWpreFl6VitUVVZLUmtkSlFtdHdYMXBXWDBscFNUQXpieTFOUVdSd1VUQllhSG8yVkZwclQyMVlZM2xyZGxWbGRVTkhkM3A1TW1SSFQwZEdWMVJDVG1VMlMwVkdRemhvUTE5SE5VcHVObGhuTURSb2JuUkVhVlF3UTBzelNIND0iLCJqdGkiOiJzdDIucy5BdEx0QWlzNnhRLnRiM0xpVnBTUjVlWU5ueGZDT1c4QzIyRF9BX1lVWUIzRENMbXZ3N1NQZTVxdC1MMmpudjItNG5pRmxaaHplVUR1VEh6LTBfVXk3OUp0Nm9zVGtYV29VTGV4Ym01QmtTZERMWUc4bXNBekdJLnljT1F3eS0zZFdSZG9EYjJzTWl2Zkpwa2loRGNjbWpWV2NyM3M4TnN4TFdVLW1WUnhxZXJBX21ESGVYZTZHRWU5b2xvRC1PQWtWR2k2Y21mT1E1ZjlBLnNjMyIsImNsaWVudF9pZCI6IldLOTlLc2VCYnUybmFoNC1ibFE3ZmsyUiIsImF6cCI6IldLOTlLc2VCYnUybmFoNC1ibFE3ZmsyUiJ9.TBEdsB0TbIybVZdd9FgTg36Qz6bWBI_0yEX1BUKA0nmByrfvn6A3icTfvCJ4hwyBved74ItF1vnknApyUFq0-J4igNiwREmMS2-CXOc5DoJiXX8s3Un6NKSzN5EQW7jgJe-dGREVNIfgxbURHPcaTeBRJeCZirjNc_J7AM-pK3MmXCw6F-QWxjv2-T82gWb3mjwBhz3fFCDmRKB7Vsry5tF34X4eHCbK96qQsvfcYrZRiTajEmPCMugwaA1etdsARVHJQgqrjIOZXT4L8UpDI68VTEFpyyAaG2IzB5tEpgr3zBw4lF3YdlJ7jZIQxzk4VTsW3nBQJJyKQCzkZS9w2Q",
  },
};

// ── Constants ────────────────────────────────────────────────
const BRAND_COLOR = 0xa78bfa; // light purple
const AVATAR_URL  = "https://i.imgur.com/4M34hi2.png";
const USERNAME    = "Takeoff Monitors";
const API_URL     = "https://dggo.dollargeneral.com/omni/api/store/search/inventory";

// ── In-memory state ──────────────────────────────────────────
// stockState[upc][storeNumber] = { qty, address, city, state, distance, phoneNumber }
const stockState = {};

// ── Token refresh ────────────────────────────────────────────
let isRefreshing = false; // prevent concurrent refresh calls

async function refreshToken() {
  if (isRefreshing) {
    // Another SKU loop already triggered a refresh — wait for it to finish
    await sleep(3000);
    return;
  }
  isRefreshing = true;
  console.log(`[${timestamp()}] [Auth] Token expired — refreshing…`);

  try {
    const res = await fetch("https://www.dollargeneral.com/bin/dg/user?refreshCookies=true", {
      method: "GET",
      headers: {
        accept:                   "application/json, text/plain, */*",
        "accept-language":        "en-US,en;q=0.9",
        "content-type":           "application/json",
        authorization:            CONFIG.auth.authorization,
        "x-dg-appsessiontoken":   CONFIG.session["x-dg-appsessiontoken"],
        "x-dg-apptoken":          CONFIG.session["x-dg-apptoken"],
        "x-dg-cloud-service":     "true",
        "x-dg-customerguid":      CONFIG.session["x-dg-customerguid"],
        "x-dg-deviceuniqueid":    CONFIG.session["x-dg-deviceuniqueid"],
        "x-dg-partnerapitoken":   CONFIG.session["x-dg-partnerapitoken"],
        cookie:                   CONFIG.session.cookie,
        "sec-ch-ua":              '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"',
        "sec-ch-ua-mobile":       "?0",
        "sec-ch-ua-platform":     '"Windows"',
        "sec-fetch-dest":         "empty",
        "sec-fetch-mode":         "cors",
        "sec-fetch-site":         "same-origin",
        priority:                 "u=1, i",
        Referer:                  "https://www.dollargeneral.com/p/pokemon-trading-card-game-15-card-pack-1-ct/728192558375",
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} — ${await res.text()}`);
    }

    const data = await res.json();

    if (res.status !== 200 || !data.idToken) {
      throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
    }

    CONFIG.auth.authorization = `Bearer ${data.idToken}`;
    CONFIG.session['x-dg-appsessiontoken'] = data.appSessionToken
    CONFIG.session['x-dg-apptoken'] = data.appToken
    CONFIG.session['x-dg-customerguid'] = data.customerGuid
    CONFIG.session['x-dg-partnerapitoken'] = data.partnerApiToken
    CONFIG.session['x-dg-deviceuniqueid'] = data.uniqueDeviceId
    console.log(`[${timestamp()}] [Auth] Token refreshed successfully.`);
  } catch (err) {
    console.error(`[${timestamp()}] [Auth] Token refresh failed: ${err.message}`);
    console.error(`[${timestamp()}] [Auth] ⚠️  You may need to update the cookie/session values in CONFIG.session manually.`);
  } finally {
    isRefreshing = false;
  }
}

// ── Cache helpers ────────────────────────────────────────────
/*
  Cache file shape:
  {
    "lastSaved": "2026-04-06T14:26:35.000Z",
    "state": {
      "<upc>": {
        "<storeNumber>": {
          "qty": 2,
          "address": "112 W Main St",
          "city": "Blacksburg",
          "state": "VA",
          "distance": 0.4,
          "phoneNumber": "5401234567"
        }
      }
    }
  }
*/

function loadCache() {
  try {
    if (!fs.existsSync(CONFIG.cacheFile)) {
      console.log("[Cache] No cache file found — starting fresh.");
      return null;
    }
    const raw    = fs.readFileSync(CONFIG.cacheFile, "utf8");
    const parsed = JSON.parse(raw);
    console.log(`[Cache] Loaded — last saved ${parsed.lastSaved}`);
    return parsed;
  } catch (err) {
    console.error(`[Cache] Failed to load: ${err.message} — starting fresh.`);
    return null;
  }
}

function saveCache() {
  try {
    const payload = {
      lastSaved: new Date().toISOString(),
      state: stockState,
    };
    fs.writeFileSync(CONFIG.cacheFile, JSON.stringify(payload, null, 2), "utf8");
  } catch (err) {
    console.error(`[Cache] Failed to save: ${err.message}`);
  }
}

// ── Helpers ──────────────────────────────────────────────────
function timestamp() {
  return new Date().toLocaleString("en-US", {
    month: "short", day: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
  });
}

function friendlyDate(isoString) {
  return new Date(isoString).toLocaleString("en-US", {
    month: "short", day: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function storeLabel(store) {
  return `${store.address}, ${store.city}, ${store.state}`;
}

function formatPhone(num) {
  if (!num) return "N/A";
  return `(${num.slice(0, 3)}) ${num.slice(3, 6)}-${num.slice(6)}`;
}

function buildStoreTable(stores) {
  return stores
    .map((s) => `[${s.productQTY}]`.padEnd(5) + ` ${storeLabel(s)}`)
    .join("\n");
}

// ── Discord helpers ──────────────────────────────────────────
async function sendWebhook(payload) {
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`[Webhook] ${res.status} — ${text}`);
    }
  } catch (err) {
    console.error("[Webhook] Failed to send:", err.message);
  }
}

async function sendFullSummary(sku, stores) {
  const inStock  = stores.filter((s) => s.productQTY > 0);
  const outStock = stores.filter((s) => s.productQTY === 0);
  const totalQty = stores.reduce((sum, s) => sum + s.productQTY, 0);

  const inStockText  = inStock.length  > 0 ? buildStoreTable(inStock)  : "No stores currently in stock.";
  const outStockText = outStock.length > 0 ? buildStoreTable(outStock) : "All stores have stock!";

  await sendWebhook({
    username: USERNAME,
    avatar_url: AVATAR_URL,
    embeds: [{
      title: `📦 Full Stock Summary — ${sku.label}`,
      description: `**${inStock.length}** store(s) in stock · **${totalQty}** total units · **${stores.length}** stores monitored`,
      color: BRAND_COLOR,
      fields: [
        { name: `✅ In Stock (${inStock.length})`,   value: `\`\`\`\n${inStockText}\n\`\`\``,  inline: false },
        { name: `❌ Out of Stock (${outStock.length})`, value: `\`\`\`\n${outStockText}\n\`\`\``, inline: false },
      ],
      footer: { text: `Takeoff Monitors • Dollar General • UPC ${sku.upc}` },
      timestamp: new Date().toISOString(),
    }],
  });

  console.log(`[${timestamp()}] [${sku.label}] Full summary sent.`);
}

async function sendStockChange(sku, store, oldQty, newQty) {
  const increased = newQty > oldQty;
  const emoji = increased ? "🟢" : "🔴";
  const verb  = increased ? "Restock" : "Stock Drop";
  const color = increased ? 0x4ade80 : 0xf87171;

  await sendWebhook({
    username: USERNAME,
    avatar_url: AVATAR_URL,
    embeds: [{
      title: `${emoji} ${verb} — ${sku.label}`,
      color,
      fields: [
        { name: "Store",        value: storeLabel(store),                inline: false },
        { name: "Stock Change", value: `**${oldQty}** → **${newQty}**`, inline: true  },
        { name: "Distance",     value: `${store.distance} mi`,           inline: true  },
        { name: "Phone",        value: formatPhone(store.phoneNumber),    inline: true  },
      ],
      footer: { text: `Takeoff Monitors • Dollar General • UPC ${sku.upc}` },
      timestamp: new Date().toISOString(),
    }],
  });

  console.log(`[${timestamp()}] [${sku.label}] CHANGE @ ${storeLabel(store)} — ${oldQty} → ${newQty}`);
}

// Grouped embed showing everything that changed while the bot was offline
async function sendOfflineDiff(sku, changes, cacheAge) {
  if (changes.length === 0) return;

  const lines = changes.map(({ store, oldQty, newQty }) => {
    const arrow = newQty > oldQty ? "🟢" : "🔴";
    return `${arrow} ${storeLabel(store).padEnd(44)} ${oldQty} → ${newQty}`;
  });

  // Chunk into ≤980-char field values (Discord limit: 1024)
  const chunks = [];
  let current  = "";
  for (const line of lines) {
    const next = current ? current + "\n" + line : line;
    if (next.length > 980) { chunks.push(current); current = line; }
    else current = next;
  }
  if (current) chunks.push(current);

  const fields = chunks.map((chunk, i) => ({
    name:   i === 0 ? `Changes while offline (${changes.length})` : "\u200b",
    value:  `\`\`\`\n${chunk}\n\`\`\``,
    inline: false,
  }));

  await sendWebhook({
    username: USERNAME,
    avatar_url: AVATAR_URL,
    embeds: [{
      title: `⏰ Missed Changes — ${sku.label}`,
      description: `Monitor was **offline**. Last known state was from **${cacheAge}**.`,
      color: 0xfbbf24, // amber
      fields,
      footer: { text: `Takeoff Monitors • Dollar General • UPC ${sku.upc}` },
      timestamp: new Date().toISOString(),
    }],
  });

  console.log(`[${timestamp()}] [${sku.label}] Offline diff sent (${changes.length} change(s)).`);
}

// ── API fetch ────────────────────────────────────────────────
async function fetchInventory(sku) {
  const body = new URLSearchParams({
    latitude:        CONFIG.latitude.toString(),
    longitude:       CONFIG.longitude.toString(),
    radius:          CONFIG.radius.toString(),
    upc:             sku.upc,
    offerSourceType: "0",
  });

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      accept:                   "application/json, text/plain, */*",
      "accept-language":        "en-US,en;q=0.9",
      "content-type":           "application/x-www-form-urlencoded; charset=UTF-8",
      authorization:            CONFIG.auth.authorization,
      "x-dg-appsessiontoken":   CONFIG.session["x-dg-appsessiontoken"],
      "x-dg-apptoken":          CONFIG.session["x-dg-apptoken"],
      "x-dg-cloud-service":     "true",
      "x-dg-customerguid":      CONFIG.session["x-dg-customerguid"],
      "x-dg-deviceuniqueid":    CONFIG.session["x-dg-deviceuniqueid"],
      "x-dg-partnerapitoken":   CONFIG.session["x-dg-partnerapitoken"],
      "sec-ch-ua":              '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"',
      "sec-ch-ua-mobile":       "?0",
      "sec-ch-ua-platform":     '"Windows"',
      "sec-fetch-dest":         "empty",
      "sec-fetch-mode":         "cors",
      "sec-fetch-site":         "same-site",
      priority:                 "u=1, i",
      Referer:                  "https://www.dollargeneral.com/",
    },
    body: body.toString(),
  });

  // Auth expired — refresh token and signal caller to retry
  if (res.status === 401 || res.status === 403) {
    await refreshToken();
    throw new Error(`AUTH_EXPIRED`);
  }

  if (!res.ok) throw new Error(`HTTP ${res.status} — ${await res.text()}`);

  const text = await res.text();

  // Empty or non-JSON body — treat as auth expiry and refresh
  if (!text || text.trim() === "") {
    await refreshToken();
    throw new Error(`AUTH_EXPIRED`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    // Malformed JSON (e.g. HTML error page) — likely auth issue
    await refreshToken();
    throw new Error(`AUTH_EXPIRED`);
  }

  return data.stores ?? [];
}

// ── Poll logic ───────────────────────────────────────────────
async function pollSku(sku, isFirst = false) {
  let stores;
  try {
    stores = await fetchInventory(sku);
  } catch (err) {
    if (err.message === "AUTH_EXPIRED") {
      // Token was just refreshed — wait a moment then retry once
      console.log(`[${timestamp()}] [${sku.label}] Retrying after token refresh…`);
      await sleep(2000);
      try {
        stores = await fetchInventory(sku);
      } catch (retryErr) {
        console.error(`[${timestamp()}] [${sku.label}] Retry failed: ${retryErr.message}`);
        return;
      }
    } else {
      console.error(`[${timestamp()}] [${sku.label}] Fetch error: ${err.message}`);
      return;
    }
  }

  if (!stockState[sku.upc]) stockState[sku.upc] = {};
  const prev = stockState[sku.upc];

  if (isFirst) {
    const cachedSkuState = sku._cachedState ?? null;
    const cacheAge       = sku._cacheAge    ?? null;

    if (cachedSkuState) {
      // ── Resumed from cache: diff against live ──
      const changes = [];

      for (const store of stores) {
        const entry  = cachedSkuState[store.storeNumber];
        const oldQty = entry !== undefined ? entry.qty : null;
        const newQty = store.productQTY;

        if (oldQty !== null && oldQty !== newQty) {
          changes.push({ store, oldQty, newQty });
        }

        prev[store.storeNumber] = {
          qty:         newQty,
          address:     store.address,
          city:        store.city,
          state:       store.state,
          distance:    store.distance,
          phoneNumber: store.phoneNumber,
        };
      }

      if (changes.length > 0) {
        await sendOfflineDiff(sku, changes, cacheAge);
      } else {
        console.log(`[${timestamp()}] [${sku.label}] Resumed — no changes since last run.`);
      }
    } else {
      // ── Fresh start: no cache ──
      for (const store of stores) {
        prev[store.storeNumber] = {
          qty:         store.productQTY,
          address:     store.address,
          city:        store.city,
          state:       store.state,
          distance:    store.distance,
          phoneNumber: store.phoneNumber,
        };
      }
    }

    // Always send the opening full summary
    await sendFullSummary(sku, stores);
    saveCache();
    return;
  }

  // ── Normal poll ──
  let changed = false;
  for (const store of stores) {
    const entry  = prev[store.storeNumber];
    const oldQty = entry ? entry.qty : null;
    const newQty = store.productQTY;

    if (oldQty === null) {
      // Brand-new store appeared mid-run
      prev[store.storeNumber] = {
        qty: newQty, address: store.address, city: store.city,
        state: store.state, distance: store.distance, phoneNumber: store.phoneNumber,
      };
      changed = true;
    } else if (oldQty !== newQty) {
      await sendStockChange(sku, store, oldQty, newQty);
      prev[store.storeNumber].qty = newQty;
      changed = true;
    }
  }

  if (changed) saveCache();

  console.log(
    `[${timestamp()}] [${sku.label}] Polled ${stores.length} stores. ` +
    `In stock: ${stores.filter((s) => s.productQTY > 0).length}`
  );
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Per-SKU loop ─────────────────────────────────────────────
// Each SKU runs its own independent loop:
//   poll → wait 5 min → poll → wait 5 min → ...
// Loops are staggered at startup so they never fire simultaneously.
// Full summaries are tracked per-SKU by poll count.

async function skuLoop(sku, isFirst, startDelayMs) {
  // Stagger: wait before starting this SKU's loop
  if (startDelayMs > 0) {
    console.log(`[${timestamp()}] [${sku.label}] Starting in ${startDelayMs / 1000}s…`);
    await sleep(startDelayMs);
  }

  let pollCount = 0;
  const summaryEveryN = Math.round(CONFIG.fullSummaryInterval / CONFIG.pollInterval);

  while (true) {
    const thisIsFirst = isFirst && pollCount === 0;

    // On the very first poll, if it's NOT the startup first-run, still handle normally
    await pollSku(sku, thisIsFirst);
    pollCount++;

    // Send scheduled full summary (skip count 0 — startup already sends one)
    if (pollCount > 0 && pollCount % summaryEveryN === 0) {
      let stores;
      try {
        stores = await fetchInventory(sku);
      } catch (err) {
        if (err.message === "AUTH_EXPIRED") {
          await sleep(2000);
          try { stores = await fetchInventory(sku); } catch { /* skip this summary */ }
        }
      }
      if (stores) await sendFullSummary(sku, stores);
    }

    await sleep(CONFIG.pollInterval);
  }
}

// ── Entry point ──────────────────────────────────────────────
async function main() {
  console.log("╔══════════════════════════════════════╗");
  console.log("║   Takeoff Monitors — DG Pokémon      ║");
  console.log("╚══════════════════════════════════════╝");
  console.log(`SKUs monitored : ${CONFIG.skus.map((s) => s.label).join(", ")}`);
  console.log(`Poll interval  : ${CONFIG.pollInterval / 1000}s per SKU`);
  console.log(`Stagger        : ${CONFIG.pollInterval / 1000}s between SKUs`);
  console.log(`Summary every  : ${CONFIG.fullSummaryInterval / 3600000}h`);
  console.log(`Cache file     : ${CONFIG.cacheFile}`);
  console.log(`Started        : ${timestamp()}\n`);

  // Load cache and inject per-SKU saved state
  const cache = loadCache();
  if (cache?.state) {
    const cacheAge = friendlyDate(cache.lastSaved);
    for (const sku of CONFIG.skus) {
      if (cache.state[sku.upc]) {
        sku._cachedState = cache.state[sku.upc];
        sku._cacheAge    = cacheAge;
        console.log(`[Cache] [${sku.label}] ${Object.keys(cache.state[sku.upc]).length} stores restored.`);
      }
    }
  }

  console.log("");

  // Launch one loop per SKU, each staggered by pollInterval
  // e.g. with 2 SKUs and 5-min interval:
  //   SKU 0 polls at t=0, 5, 10, 15 …
  //   SKU 1 polls at t=5, 10, 15, 20 …
  for (let i = 0; i < CONFIG.skus.length; i++) {
    const sku          = CONFIG.skus[i];
    const startDelayMs = i * CONFIG.pollInterval;
    skuLoop(sku, true, startDelayMs); // intentionally not awaited — runs forever in background
  }

  // Save on clean exit
  process.on("SIGINT",  () => { saveCache(); console.log("\n[Cache] Saved on exit."); process.exit(0); });
  process.on("SIGTERM", () => { saveCache(); process.exit(0); });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
