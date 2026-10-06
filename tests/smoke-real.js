/* Smoke test with the REAL supabase-js from jsDelivr and the real config.js.
   Read-only: loads the auth screen and runs the username availability check
   (an RPC call). It never signs up or writes anything. */
const path = require("path");
const { spawn } = require("child_process");
const { chromium } = require(process.env.PW_CORE || "/workspace/social-app-mockup/node_modules/playwright-core");
const ROOT = path.resolve(__dirname, "..");
const PORT = 8643;
(async () => {
  const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], { cwd: ROOT, stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 800));
  const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
  const errors = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));
    await page.goto(`http://127.0.0.1:${PORT}/`);
    await page.waitForSelector("#auth .auth-card", { timeout: 20000 });
    const lib = await page.evaluate(() => !!(window.supabase && window.supabase.createClient));
    console.log("supabase-js loaded:", lib, "| not-configured notice:", !!(await page.$("#auth .notice")));
    await page.fill("#au-user", "smoketest_" + Date.now().toString().slice(-5));
    await page.waitForFunction(() => !/Checking/.test(document.querySelector("#au-hint").textContent), null, { timeout: 20000 });
    console.log("availability hint:", (await page.textContent("#au-hint")).trim());
  } finally {
    await browser.close(); server.kill();
  }
  console.log("errors:", errors.length ? errors : "none");
})();
