/* Loop UI test + screenshots with a mocked Supabase.
   Run: node tests/shoot.js   (uses playwright-core from /workspace/social-app-mockup)
   - Serves the repo on http://127.0.0.1:8642
   - Swaps the supabase-js CDN script for tests/mock-supabase.js and config.js for a mock config
   - Mock Storage uploads are kept in memory here and served back as public URLs */
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const { chromium } = require(process.env.PW_CORE || "/workspace/social-app-mockup/node_modules/playwright-core");

const ROOT = path.resolve(__dirname, "..");
const OUT = process.env.SHOTS || "/workspace/loop-shots";
const FIX = process.env.FIXTURES || "/workspace/loop-testdata";
const PORT = 8642;
const BASE = `http://127.0.0.1:${PORT}/`;
const MOCK_URL = "https://mock-loop.supabase.co";
fs.mkdirSync(OUT, { recursive: true });

const SEED_OTHERS = [
  { username: "mira.k", profile: { display_name: "Mira Koh", accent: "pink", bio: "Film photos and late trains.", pronouns: "she/her", onboarded: true, interests: ["Photos", "Travel"], created_at: "2026-10-01T02:00:00Z" } },
  { username: "kai_drifts", profile: { display_name: "Kai Mercer", accent: "cyan", onboarded: true, interests: ["Clips"], created_at: "2026-10-02T02:00:00Z" } },
  { username: "noor", profile: { display_name: "Noor", accent: "violet", onboarded: true, created_at: "2026-10-03T02:00:00Z" } },
  { username: "halfway", profile: { onboarded: false } },
];

const results = [];
const errors = [];
const check = (name, ok, extra = "") => { results.push(`${ok ? "PASS" : "FAIL"} ${name}${extra ? " - " + extra : ""}`); };

async function setup(ctx, seed) {
  const store = new Map();
  await ctx.addInitScript((s) => { window.__LOOP_MOCK_SEED = s; }, seed);
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js/, (r) => r.fulfill({ contentType: "application/javascript", body: fs.readFileSync(path.join(__dirname, "mock-supabase.js"), "utf8") }));
  await ctx.route(/\/config\.js(\?|$)/, (r) => r.fulfill({ contentType: "application/javascript", body: `window.LOOP_CONFIG = { SUPABASE_URL: "${MOCK_URL}", SUPABASE_KEY: "sb_publishable_mock" };` }));
  await ctx.route(`${MOCK_URL}/storage/**`, async (r) => {
    const req = r.request();
    const u = new URL(req.url());
    const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,POST,PUT,OPTIONS" };
    if (req.method() === "OPTIONS") return r.fulfill({ status: 204, headers: cors, body: "" });
    if (req.method() === "POST") { store.set(u.pathname.replace("/storage/v1/object/", ""), { body: req.postDataBuffer(), type: req.headers()["content-type"] }); return r.fulfill({ status: 200, headers: cors, contentType: "application/json", body: "{}" }); }
    const f = store.get(u.pathname.replace("/storage/v1/object/public/", ""));
    return f ? r.fulfill({ status: 200, contentType: f.type, body: f.body }) : r.fulfill({ status: 404, body: "" });
  });
  return store;
}

async function settle(page, ms = 350) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const imgs = Promise.all([...document.images].map((i) => (i.complete ? 1 : new Promise((r) => { i.onload = i.onerror = r; }))));
    await Promise.race([imgs, new Promise((r) => setTimeout(r, 2500))]);
  });
  await page.waitForTimeout(ms);
}
async function noOverflow(page, label) {
  const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth }));
  check(`no horizontal overflow: ${label}`, o.sw <= o.w, `${o.sw} vs ${o.w}`);
}
async function shot(page, file, { full = false } = {}) {
  await settle(page);
  await page.screenshot({ path: path.join(OUT, file), fullPage: full });
}

(async () => {
  const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], { cwd: ROOT, stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 900));
  const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
  try {
    /* ---------------- Mobile flow (iPhone 390x844) ---------------- */
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const store = await setup(ctx, { id: "mobile-1", users: SEED_OTHERS });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push("pageerror: " + e));
    page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));

    await page.goto(BASE);
    await page.waitForSelector("#auth .auth-card");
    check("auth gate shown first", await page.isVisible("#auth") && !(await page.isVisible("#app")));
    await noOverflow(page, "auth");
    await shot(page, "auth.png");

    // username validation + live availability
    await page.fill("#au-user", "Mira.K");
    await page.waitForSelector("#au-hint.bad");
    check("username lowercased as typed", (await page.inputValue("#au-user")) === "mira.k");
    check("taken username detected", /taken/.test(await page.textContent("#au-hint")));
    await shot(page, "auth-taken.png");
    await page.fill("#au-user", "a..b");
    check("double dot rejected", /double dots/i.test(await page.textContent("#au-hint")));
    await page.fill("#au-user", "harvey");
    await page.waitForSelector("#au-hint.ok");
    check("available username detected", /available/.test(await page.textContent("#au-hint")));
    await page.fill("#au-pass", "short");
    await page.fill("#au-pass2", "short");
    await page.click("#au-submit");
    check("short password rejected", /at least 8/.test(await page.textContent("#au-error")));
    await page.fill("#au-pass", "supersecret1");
    await page.fill("#au-pass2", "supersecret2");
    await page.click("#au-submit");
    check("password mismatch rejected", /match/.test(await page.textContent("#au-error")));
    await page.fill("#au-pass2", "supersecret1");
    await shot(page, "auth-filled.png");

    // login tab
    await page.click('.seg button[data-mode="login"]');
    await page.waitForSelector("#au-pass2", { state: "detached" });
    check("login tab has no confirm field", !(await page.$("#au-pass2")));
    await shot(page, "auth-login.png");
    await page.fill("#au-pass", "wrongpass1");
    await page.click("#au-submit");
    await page.waitForFunction(() => document.querySelector("#au-error").textContent.length > 0);
    check("unknown login rejected", /Wrong username or password/.test(await page.textContent("#au-error")));

    // sign up
    await page.click('.seg button[data-mode="signup"]');
    await page.fill("#au-user", "harvey");
    await page.fill("#au-pass", "supersecret1");
    await page.fill("#au-pass2", "supersecret1");
    await page.click("#au-submit");
    await page.waitForSelector('#onboard .ob[data-step="name"]');
    check("signup goes to onboarding", true);
    check("continue disabled without display name", await page.isDisabled('[data-ob="next"]'));
    check("no skip on display name step", !(await page.$('[data-ob="skip"]')));
    await page.fill("#ob-name", "Harvey");
    await page.click('.mini-chip[data-pronoun="he/him"]');
    await noOverflow(page, "onboarding-1");
    await shot(page, "onboarding-1.png");

    await page.click('[data-ob="next"]');
    await page.waitForSelector('.ob[data-step="media"]');
    await shot(page, "onboarding-2-empty.png");
    await page.setInputFiles("#ob-media .pick-avatar", path.join(FIX, "post-1.jpg"));
    await page.waitForSelector("#ob-media .me-avatar img.avatar");
    await page.setInputFiles("#ob-media .pick-banner", path.join(FIX, "vid-1.jpg"));
    await page.waitForSelector("#ob-media .me-banner.has img");
    await noOverflow(page, "onboarding-2");
    await shot(page, "onboarding-2.png");

    await page.click('[data-ob="next"]');
    await page.waitForSelector('.ob[data-step="about"]');
    await page.fill("#ob-bio", "Building Loop. Photos, clips and late-night ideas. Sydney.");
    await page.fill("#ob-web", "not a url");
    await page.click('[data-ob="next"]');
    check("bad website rejected", /doesn't look right/.test(await page.textContent("#ob-error")));
    await page.fill("#ob-web", "github.com/h42506916-web");
    await noOverflow(page, "onboarding-3");
    await shot(page, "onboarding-3.png");

    await page.click('[data-ob="next"]');
    await page.waitForSelector('.ob[data-step="accent"]');
    await page.click('[data-accent="cyan"]');
    await noOverflow(page, "onboarding-4");
    await shot(page, "onboarding-4.png");

    await page.click('[data-ob="next"]');
    await page.waitForSelector('.ob[data-step="interests"]');
    for (const t of ["Photos", "Clips", "Music", "Travel", "Tech"]) await page.click(`[data-interest="${t}"]`);
    await noOverflow(page, "onboarding-5");
    await shot(page, "onboarding-5.png");

    await page.click('[data-ob="next"]');
    await page.waitForSelector("#app:not([hidden]) .feed .photos-sec", { timeout: 8000 }).catch(async (e) => {
      console.log("finish error:", await page.textContent("#ob-error").catch(() => "?")); throw e; });
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("loop-mock-db")).profiles.find((p) => p.username === "harvey"));
    check("profile saved with onboarding data", saved.onboarded && saved.display_name === "Harvey" && saved.accent === "cyan" && saved.pronouns === "he/him"
      && saved.website === "https://github.com/h42506916-web" && saved.interests.length === 5, JSON.stringify(saved).slice(0, 200));
    check("avatar uploaded to own folder with cache-buster", /\/avatars\/[0-9a-f-]+\/avatar\.jpg\?v=\d+$/.test(saved.avatar_url || ""), saved.avatar_url);
    const sizes = [...store.entries()].map(([k, v]) => `${k.split("/")[0]}=${v.body.length}B`).join(", ");
    check("uploads resized + small", [...store.values()].every((v) => v.body.length < 400000), sizes);
    await page.waitForTimeout(3200); // let the welcome toast fade
    await noOverflow(page, "feed");
    await shot(page, "feed-empty.png");
    await shot(page, "feed-empty-full.png", { full: true });
    check("suggested excludes non-onboarded + self", !(await page.$('.person a[href="#/u/halfway"]')) && !(await page.$('.person a[href="#/u/harvey"]')));

    // filter chips
    await page.click('.chips [data-filter="clips"]');
    check("clips filter hides photos", !(await page.isVisible(".photos-sec")) && (await page.isVisible(".clips-sec")));
    await page.click('.chips [data-filter="all"]');

    // own profile
    await page.click('.tab[data-nav="me"]');
    await page.waitForSelector(".profile .pf-info");
    await page.waitForFunction(() => document.querySelector("#st-followers").textContent !== "-");
    check("profile counts are real zeros", (await page.textContent("#st-posts")) === "0" && (await page.textContent("#st-followers")) === "0");
    await noOverflow(page, "profile");
    await shot(page, "profile.png");
    await shot(page, "profile-full.png", { full: true });

    // settings sheet
    await page.click('.pf-actions [data-act="settings"]');
    await page.waitForSelector(".sheet-wrap.open");
    await shot(page, "settings-sheet.png");
    await page.click(".sheet-backdrop", { position: { x: 20, y: 20 } });

    // other profile by ?u= deep link + follow
    await page.goto(BASE + "?u=mira.k");
    await page.waitForSelector(".profile .btn-follow");
    check("?u= deep link becomes hash route", (await page.evaluate(() => location.hash)) === "#/u/mira.k");
    check("session persisted across reload", await page.isVisible("#app"));
    await page.click(".pf-actions .btn-follow");
    await page.waitForFunction(() => document.querySelector(".pf-actions .btn-follow").textContent === "Following");
    await page.waitForFunction(() => document.querySelector("#st-followers").textContent === "1");
    check("follow updates followers count", true);
    await noOverflow(page, "other-profile");
    await shot(page, "profile-other.png");

    // search
    await page.click('.tab[data-nav="search"]');
    await page.waitForSelector("#search-input");
    await page.fill("#search-input", "ko");
    await page.waitForFunction(() => /1 person/.test(document.querySelector("#search-results").textContent));
    check("search by display name", (await page.textContent("#search-results")).includes("@mira.k"));
    await page.fill("#search-input", "zzz");
    await page.waitForFunction(() => /No matches/.test(document.querySelector("#search-results").textContent));
    await page.fill("#search-input", "");
    await page.waitForFunction(() => /People on Loop/.test(document.querySelector("#search-results").textContent));
    await noOverflow(page, "search");
    await shot(page, "search.png");

    // home with a follow
    await page.click('.tab[data-nav="home"]');
    await page.waitForSelector(".feed .photos-sec");
    await shot(page, "feed-following.png");

    // clips page
    await page.click('.tab[data-nav="clips"]');
    await page.waitForSelector("#kind-list .empty");
    await shot(page, "clips-empty.png");

    // edit profile
    await page.goto(BASE + "#/edit");
    await page.waitForSelector("#edit-form");
    await page.fill("#ed-bio", "Edited bio from the test.");
    await page.click('#ed-accent [data-accent="pink"]');
    await noOverflow(page, "edit");
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot(page, "edit-profile.png");
    await page.evaluate(() => window.scrollTo(0, 99999));
    await shot(page, "edit-profile-bottom.png");
    await page.click('#edit-form .edit-top [type="submit"]');
    await page.waitForSelector(".profile .pf-bio");
    check("edit saves + returns to profile", (await page.textContent(".pf-bio")).includes("Edited bio"));
    const acc = await page.evaluate(() => getComputedStyle(document.querySelector(".profile")).getPropertyValue("--acc").trim());
    check("accent tints profile", acc === "#ff3d9a", acc);

    // not found profile
    await page.goto(BASE + "#/u/nobody.here");
    await page.waitForSelector(".empty");
    check("unknown profile shows not found", (await page.textContent("#view")).includes("Profile not found"));

    // log out
    await page.goto(BASE + "#/");
    await page.waitForSelector(".feed .photos-sec");
    await page.click('.topbar [data-act="settings"]');
    await page.click('.sheet [data-act="logout"]');
    await page.waitForSelector('#auth .seg[data-mode="login"]');
    check("logout returns to login screen", true);
    await page.reload();
    await page.waitForSelector("#auth .auth-card");
    check("logged out stays logged out after reload", !(await page.isVisible("#app")));

    // log back in
    await page.click('.seg button[data-mode="login"]');
    await page.fill("#au-user", "harvey");
    await page.fill("#au-pass", "supersecret1");
    await page.click("#au-submit");
    await page.waitForSelector("#app:not([hidden])");
    check("login works", true);
    await ctx.close();

    /* ---------------- Empty world: first user ---------------- */
    const c3 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await setup(c3, { id: "solo-1", users: [{ username: "harvey", profile: { display_name: "Harvey", accent: "lime", onboarded: true } }], session: "harvey" });
    const p3 = await c3.newPage();
    p3.on("pageerror", (e) => errors.push("pageerror(solo): " + e));
    await p3.goto(BASE);
    await p3.waitForSelector(".feed .photos-sec");
    await p3.waitForTimeout(300);
    await shot(p3, "feed-empty-solo.png", { full: true });
    // onboarding gate: not onboarded user can't reach feed
    await c3.close();
    const c4 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true });
    await setup(c4, { id: "gate-1", users: [{ username: "newbie" }], session: "newbie" });
    const p4 = await c4.newPage();
    await p4.goto(BASE + "#/search");
    await p4.waitForSelector("#onboard .ob");
    check("non-onboarded session is gated to onboarding", !(await p4.isVisible("#app")));
    await c4.close();

    /* ---------------- Desktop ---------------- */
    const c2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    await setup(c2, { id: "desk-1", users: [...SEED_OTHERS, { username: "harvey", profile: { display_name: "Harvey", accent: "cyan", pronouns: "he/him", bio: "Building Loop. Photos, clips and late-night ideas.", website: "https://github.com/h42506916-web", interests: ["Photos", "Clips", "Music", "Tech"], onboarded: true } }],
      follows: [["harvey", "mira.k"], ["kai_drifts", "harvey"]], session: "harvey" });
    const p2 = await c2.newPage();
    p2.on("pageerror", (e) => errors.push("pageerror(desktop): " + e));
    await p2.goto(BASE + "#/u/harvey");
    await p2.waitForSelector(".profile .pf-info");
    await p2.waitForFunction(() => document.querySelector("#st-followers").textContent === "1");
    await shot(p2, "desktop-profile.png");
    await p2.goto(BASE + "#/");
    await p2.waitForSelector(".feed .photos-sec");
    await shot(p2, "desktop-feed.png");
    await p2.fill("#tb-search", "noor");
    await p2.waitForFunction(() => /1 person/.test((document.querySelector("#search-results") || {}).textContent || ""));
    await shot(p2, "desktop-search.png");
    await p2.goto(BASE + "#/edit");
    await p2.waitForSelector("#edit-form");
    await shot(p2, "desktop-edit.png");
    await p2.evaluate(() => localStorage.removeItem("loop-mock-session"));
    await p2.goto(BASE);
    await p2.waitForSelector("#auth .auth-card");
    await shot(p2, "desktop-auth.png");
    await c2.close();
  } catch (e) {
    errors.push("TEST CRASH: " + (e.stack || e));
  } finally {
    await browser.close();
    server.kill();
  }
  console.log(results.join("\n"));
  console.log("errors:", errors.length ? errors : "none");
  process.exit(errors.length || results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
})();
