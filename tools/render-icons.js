// Render icon.svg → icon-192.png, icon-512.png via Chromium.
// Also render at 40x40 and a maskable preview for visual sanity checks.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SVG = fs.readFileSync(path.join(ROOT, "icon.svg"), "utf8");
const PREVIEW_DIR = path.join(__dirname, "screenshots");
fs.mkdirSync(PREVIEW_DIR, { recursive: true });

function pageHTML(size) {
  return `<!DOCTYPE html><html><head><style>
    *{margin:0;padding:0}
    html,body{background:transparent}
    .wrap{width:${size}px;height:${size}px}
    .wrap svg{width:100%;height:100%;display:block}
  </style></head><body><div class="wrap">${SVG}</div></body></html>`;
}

function maskPreviewHTML(size, shape) {
  // shape: "circle" | "squircle"
  const clip = shape === "circle"
    ? "circle(50% at 50% 50%)"
    : "path('M0,40 C0,18 18,0 40,0 L60,0 C82,0 100,18 100,40 L100,60 C100,82 82,100 60,100 L40,100 C18,100 0,82 0,60 Z')";
  return `<!DOCTYPE html><html><head><style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{background:#0a0a14}
    .wrap{width:${size}px;height:${size}px;display:grid;place-items:center;background:#0a0a14}
    .icon{width:${size}px;height:${size}px;overflow:hidden;${shape === "circle" ? `clip-path:circle(50%)` : `clip-path:inset(0 round ${size * 0.22}px)`}}
    .icon svg{width:100%;height:100%;display:block}
  </style></head><body><div class="wrap"><div class="icon">${SVG}</div></div></body></html>`;
}

async function renderAt(page, html, size, outPath) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(html, { waitUntil: "load" });
  await page.screenshot({ path: outPath, omitBackground: false, clip: { x: 0, y: 0, width: size, height: size } });
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ deviceScaleFactor: 1 });
  const page = await ctx.newPage();

  // Production icons
  await renderAt(page, pageHTML(512), 512, path.join(ROOT, "icon-512.png"));
  await renderAt(page, pageHTML(192), 192, path.join(ROOT, "icon-192.png"));

  // Sanity previews — bei 2x deviceScaleFactor, damit das Antialiasing
  // dem echten Retina-Display entspricht.
  await renderAt(page, pageHTML(40),  40,  path.join(PREVIEW_DIR, "icon-40.png"));
  await renderAt(page, pageHTML(48),  48,  path.join(PREVIEW_DIR, "icon-48.png"));
  await renderAt(page, pageHTML(64),  64,  path.join(PREVIEW_DIR, "icon-64.png"));
  await renderAt(page, pageHTML(96),  96,  path.join(PREVIEW_DIR, "icon-96.png"));

  // Maskable previews (circle = aggressive Android, squircle = iOS-like)
  await renderAt(page, maskPreviewHTML(192, "circle"),   192, path.join(PREVIEW_DIR, "icon-mask-circle.png"));
  await renderAt(page, maskPreviewHTML(192, "squircle"), 192, path.join(PREVIEW_DIR, "icon-mask-squircle.png"));

  await browser.close();
  console.log("icons written:");
  console.log("  ", path.join(ROOT, "icon-512.png"));
  console.log("  ", path.join(ROOT, "icon-192.png"));
  console.log("previews in tools/screenshots/icon-*.png");
})().catch((e) => { console.error(e); process.exit(1); });
