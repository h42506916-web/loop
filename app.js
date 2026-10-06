/* =========================================================
   Loop - signed-in social app on Supabase.
   Accounts are username + password; the username maps to the
   synthetic login email <username>@loop.local (never emailed).
   ========================================================= */
(function () {
  "use strict";

  const APP_NAME = "Loop";
  const DOMAIN = "loop.local";
  const cfg = window.LOOP_CONFIG || {};
  const USER_RE = /^(?!\.)(?!.*\.\.)(?!.*\.$)[a-z0-9._]{3,20}$/;
  const LIMITS = { name: 40, bio: 150, pronouns: 30, website: 200 };

  const ACCENTS = [
    { key: "lime", label: "Lime", hex: "#c6ff00", rgb: "198,255,0" },
    { key: "cyan", label: "Cyan", hex: "#00f0ff", rgb: "0,240,255" },
    { key: "pink", label: "Hot pink", hex: "#ff3d9a", rgb: "255,61,154" },
    { key: "violet", label: "Violet", hex: "#a66bff", rgb: "166,107,255" },
    { key: "orange", label: "Orange", hex: "#ff8a1f", rgb: "255,138,31" },
    { key: "mint", label: "Mint", hex: "#3dffb0", rgb: "61,255,176" },
    { key: "yellow", label: "Yellow", hex: "#ffe53d", rgb: "255,229,61" },
    { key: "blue", label: "Blue", hex: "#3d7bff", rgb: "61,123,255" },
  ];
  const INTERESTS = ["Photos", "Clips", "Videos", "Gaming", "Music", "Travel", "Food", "Art", "Sports", "Fitness",
    "Fashion", "Tech", "Nature", "Pets", "Comedy", "Film", "Books", "Cars"];
  const PRONOUNS = ["she/her", "he/him", "they/them"];

  /* ---------- Helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ESC[c]);
  const accentOf = (p) => ACCENTS.find((a) => a.key === (p && p.accent)) || ACCENTS[0];
  const accVars = (p) => { const a = accentOf(p); return `--acc:${a.hex};--acc-rgb:${a.rgb}`; };
  const safeImg = (u) => typeof u === "string" && /^(https?:|blob:|data:image\/)/i.test(u);
  const safeHref = (u) => typeof u === "string" && /^https?:\/\/\S+$/i.test(u);
  const linkLabel = (u) => String(u || "").replace(/^https?:\/\//i, "").replace(/\/$/, "");
  const firstChar = (s) => (Array.from(String(s || "").trim())[0] || "?").toUpperCase();
  const fmtCount = (n) => n == null ? "-" : n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, "") + "M" : n >= 1e4 ? (n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, "") + "K" : n.toLocaleString();
  const joined = (iso) => { const d = new Date(iso); return isNaN(d) ? "" : "Joined " + d.toLocaleDateString(undefined, { month: "long", year: "numeric" }); };
  const nameOf = (p) => (p && (p.display_name || p.username)) || "";
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const bust = (url) => url.split("?")[0] + "?v=" + Date.now();
  function normWebsite(v) {
    v = String(v || "").trim();
    if (!v) return null;
    if (!/^https?:\/\//i.test(v)) v = "https://" + v;
    return v;
  }

  /* ---------- Icons ---------- */
  const svg = (body, { fill = "none", sw = 2, cls = "" } = {}) =>
    `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const I = {
    home: (o) => svg('<path d="M3 10.2 12 3l9 7.2V19a2 2 0 0 1-2 2h-4v-6.5H9V21H5a2 2 0 0 1-2-2z"/>', o),
    search: (o) => svg('<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.2-4.2"/>', o),
    plus: (o) => svg('<path d="M12 5v14M5 12h14"/>', o),
    clips: (o) => svg('<rect x="5" y="2.5" width="14" height="19" rx="4"/><path d="M10.2 9.2v5.6l4.6-2.8z" fill="currentColor"/>', o),
    user: (o) => svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c.6-3.8 3.9-6 8-6s7.4 2.2 8 6"/>', o),
    users: (o) => svg('<path d="M16 20.5v-1.6a4 4 0 0 0-4-4H6.5a4 4 0 0 0-4 4v1.6"/><circle cx="9.2" cy="7.5" r="3.8"/><path d="M21.5 20.5v-1.6a4 4 0 0 0-3-3.9M15.8 3.8a3.8 3.8 0 0 1 0 7.4"/>', o),
    play: (o) => svg('<path d="M7.5 4.8v14.4c0 .8.9 1.3 1.6.8l10.8-7.2a1 1 0 0 0 0-1.6L9.1 4c-.7-.5-1.6 0-1.6.8z" fill="currentColor" stroke="none"/>', o),
    video: (o) => svg('<rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="M10.3 9.4v5.2l4.4-2.6z" fill="currentColor"/>', o),
    image: (o) => svg('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="9" cy="9" r="1.8"/><path d="m20.5 15-4.8-4.8L5 21"/>', o),
    grid: (o) => svg('<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>', o),
    chevron: (o) => svg('<path d="m9 18 6-6-6-6"/>', o),
    back: (o) => svg('<path d="m15 18-6-6 6-6"/>', o),
    settings: (o) => svg('<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>', o),
    sparkle: (o) => svg('<path d="M12 2.5c.6 4.6 2.9 6.9 7.5 7.5-4.6.6-6.9 2.9-7.5 7.5-.6-4.6-2.9-6.9-7.5-7.5 4.6-.6 6.9-2.9 7.5-7.5z" fill="currentColor" stroke="none"/><path d="M19 15.5c.25 1.9 1.1 2.75 3 3-1.9.25-2.75 1.1-3 3-.25-1.9-1.1-2.75-3-3 1.9-.25 2.75-1.1 3-3z" fill="currentColor" stroke="none"/>', o),
    camera: (o) => svg('<path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.3l1.4-2h5.6l1.4 2h1.3A2.5 2.5 0 0 1 20 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5z"/><circle cx="12" cy="13" r="3.6"/>', o),
    link: (o) => svg('<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/>', o),
    calendar: (o) => svg('<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>', o),
    check: (o) => svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>', o),
    x: (o) => svg('<path d="M6 6l12 12M18 6 6 18"/>', o),
    edit: (o) => svg('<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>', o),
    eye: (o) => svg('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', o),
    eyeOff: (o) => svg('<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7c1.9 0 3.5-.6 4.9-1.4"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>', o),
    logout: (o) => svg('<path d="M14 4h3.5A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5H14"/><path d="M10 16.5 5.5 12 10 7.5M5.5 12H15"/>', o),
    share: (o) => svg('<path d="M12 3.5v11M7.5 8 12 3.5 16.5 8"/><path d="M5 13v4.5A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5V13"/>', o),
    flame: (o) => svg('<path d="M12 21.5c-4 0-7-2.7-7-6.6 0-3.4 2.3-5.4 3.8-7.6.4 1.6 1.3 2.6 2.2 3 0-3.3 1.5-6.2 4-7.8-.2 2.6.9 4.4 2.4 6 1.5 1.6 2.6 3.4 2.6 6.4 0 3.9-3 6.6-8 6.6z"/>', o),
    lock: (o) => svg('<rect x="4.5" y="10.5" width="15" height="10" rx="3"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>', o),
  };

  /* =========================================================
     Data layer (supabase-js v2)
     ========================================================= */
  const S = { sb: null, session: null, me: null, followingIds: new Set(), gen: 0, filter: "all" };

  const configured = () => !!(cfg.SUPABASE_URL && cfg.SUPABASE_KEY && !/^(REPLACE|YOUR)/i.test(cfg.SUPABASE_URL + "") && !/^(REPLACE|YOUR)/i.test(cfg.SUPABASE_KEY + ""));
  const emailFor = (u) => String(u || "").trim().toLowerCase() + "@" + DOMAIN;
  const usernameFromEmail = (e) => { const m = /^([a-z0-9._]+)@loop\.local$/i.exec(e || ""); return m ? m[1].toLowerCase() : ""; };

  function timedFetch(url, opts) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    opts = Object.assign({}, opts || {});
    if (opts.signal) opts.signal.addEventListener("abort", () => ctrl.abort());
    opts.signal = ctrl.signal;
    return fetch(url, opts).finally(() => clearTimeout(t));
  }

  function client() {
    if (S.sb) return S.sb;
    if (!configured()) throw new Error("not_configured");
    if (!window.supabase || !window.supabase.createClient) throw new Error("lib_missing");
    S.sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: "loop-auth" },
      global: { fetch: timedFetch },
    });
    return S.sb;
  }
  function check(res) {
    if (res && res.error) {
      const e = new Error(res.error.message || "Database error");
      e.code = res.error.code; e.status = res.error.status; e.details = res.error;
      throw e;
    }
    return res ? res.data : null;
  }
  const isMissingSchema = (e) => /PGRST20[25]|42P01|42883/.test((e && e.code) || "") ||
    /could not find the (table|function)|schema cache|does not exist/i.test((e && e.message) || "");

  function friendly(e) {
    const m = String((e && e.message) || e || "");
    const code = (e && e.code) || "";
    if (m === "not_configured") return "Loop isn't connected to its database yet (config.js).";
    if (m === "lib_missing") return "Couldn't load Loop's sign-in library. Check your connection and reload.";
    if (m === "confirm_email_on") return "Sign-up is almost ready: email confirmation is still switched on for this server.";
    if (isMissingSchema(e)) return "Loop's database isn't set up yet. Please try again a little later.";
    if (code === "invalid_credentials" || /invalid login credentials/i.test(m)) return "Wrong username or password.";
    if (code === "user_already_exists" || /already registered/i.test(m)) return "That username is taken. Try another, or log in.";
    if (code === "weak_password" || /password should/i.test(m)) return "Please choose a stronger password (at least 8 characters).";
    if (/database error saving new user/i.test(m)) return "That username isn't available. Please pick another.";
    if (code === "over_request_rate_limit" || /rate limit|too many/i.test(m)) return "Too many tries. Please wait a minute and try again.";
    if (/Failed to fetch|NetworkError|Load failed|abort|timed? ?out|network/i.test(m)) return "Couldn't reach Loop's server. Check your connection and try again.";
    if (/JWT|row-level|not authori[sz]ed|42501|permission/i.test(m)) return "You're not allowed to do that. Try logging in again.";
    if (/payload too large|exceeded the maximum/i.test(m)) return "That image is too large. Try a smaller one.";
    return m || "Something went wrong. Please try again.";
  }

  const api = {
    async usernameAvailable(u) { return !!check(await client().rpc("username_available", { p_username: u })); },
    async signUp(username, password) {
      const data = check(await client().auth.signUp({ email: emailFor(username), password, options: { data: { username } } }));
      if (!data.session) throw new Error("confirm_email_on");
      return data;
    },
    async signIn(username, password) { return check(await client().auth.signInWithPassword({ email: emailFor(username), password })); },
    async signOut() { try { await client().auth.signOut(); } catch (e) { /* local session is cleared anyway */ } },
    async myProfile() {
      const uid = S.session.user.id;
      let p = check(await client().from("profiles").select("*").eq("id", uid).maybeSingle());
      if (!p) {
        // Normally created by the auth trigger; create it here if that didn't happen.
        const username = usernameFromEmail(S.session.user.email) || (S.session.user.user_metadata || {}).username;
        p = check(await client().from("profiles").insert({ id: uid, username }).select("*").single());
      }
      return p;
    },
    async profileByUsername(u) { return check(await client().from("profiles").select("*").eq("username", u).maybeSingle()); },
    async updateProfile(patch) {
      return check(await client().from("profiles").update(patch).eq("id", S.me.id).select("*").single());
    },
    async uploadImage(bucket, blob) {
      const path = `${S.me.id}/${bucket === "avatars" ? "avatar" : "banner"}.jpg`;
      const store = client().storage.from(bucket);
      check(await store.upload(path, blob, { upsert: true, contentType: "image/jpeg", cacheControl: "3600" }));
      const { data } = store.getPublicUrl(path);
      return bust(data.publicUrl);
    },
    async counts(uid) {
      const sb = client();
      const head = { count: "exact", head: true };
      const [a, b, c] = await Promise.all([
        sb.from("posts").select("id", head).eq("author_id", uid),
        sb.from("follows").select("follower_id", head).eq("following_id", uid),
        sb.from("follows").select("following_id", head).eq("follower_id", uid),
      ]);
      [a, b, c].forEach(check);
      return { posts: a.count || 0, followers: b.count || 0, following: c.count || 0 };
    },
    async loadFollowing() {
      const rows = check(await client().from("follows").select("following_id").eq("follower_id", S.me.id).limit(1000)) || [];
      S.followingIds = new Set(rows.map((r) => r.following_id));
    },
    async profilesByIds(ids) {
      if (!ids.length) return [];
      return check(await client().from("profiles").select("*").in("id", ids)) || [];
    },
    async follow(id) { check(await client().from("follows").insert({ follower_id: S.me.id, following_id: id })); S.followingIds.add(id); },
    async unfollow(id) { check(await client().from("follows").delete().eq("follower_id", S.me.id).eq("following_id", id)); S.followingIds.delete(id); },
    async suggested(limit = 12) {
      const rows = check(await client().from("profiles").select("*").eq("onboarded", true).neq("id", S.me.id)
        .order("created_at", { ascending: false }).limit(limit + S.followingIds.size)) || [];
      return rows.filter((p) => !S.followingIds.has(p.id)).slice(0, limit);
    },
    async search(q) { return check(await client().rpc("search_profiles", { p_query: q, p_limit: 25 })) || []; },
    async feed() {
      const ids = [S.me.id, ...S.followingIds];
      return check(await client().from("posts").select("*").in("author_id", ids).order("created_at", { ascending: false }).limit(60)) || [];
    },
    async postsBy(uid, kind) {
      return check(await client().from("posts").select("*").eq("author_id", uid).eq("kind", kind).order("created_at", { ascending: false }).limit(60)) || [];
    },
  };

  /* =========================================================
     Image processing: centre crop + resize on a canvas, JPEG 0.85
     ========================================================= */
  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => resolve({ img, url });
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Couldn't read that image. Try a JPG or PNG.")); };
      img.src = url;
    });
  }
  async function processImage(file, kind) {
    if (!file || !/^image\//.test(file.type || "image/")) throw new Error("Please choose an image file.");
    const { img, url } = await loadImage(file);
    try {
      const w = img.naturalWidth, h = img.naturalHeight;
      let sx, sy, sw, sh, tw, th;
      if (kind === "avatar") {
        const s = Math.min(w, h);
        sw = sh = s; sx = (w - s) / 2; sy = (h - s) / 2;
        tw = th = Math.min(512, s);
      } else {
        const ratio = 3; // banner aspect 3:1
        if (w / h > ratio) { sh = h; sw = h * ratio; } else { sw = w; sh = w / ratio; }
        sx = (w - sw) / 2; sy = (h - sh) / 2;
        tw = Math.round(Math.min(1600, sw)); th = Math.round(tw / ratio);
      }
      const c = document.createElement("canvas");
      c.width = tw; c.height = th;
      const ctx = c.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.fillStyle = "#0b0b13"; ctx.fillRect(0, 0, tw, th);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, tw, th);
      const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.85));
      if (!blob) throw new Error("Couldn't process that image.");
      return { blob, preview: URL.createObjectURL(blob) };
    } finally { URL.revokeObjectURL(url); }
  }

  /* =========================================================
     Shared UI bits
     ========================================================= */
  function avatar(p, cls = "") {
    if (p && safeImg(p.avatar_url)) return `<img class="avatar ${cls}" src="${esc(p.avatar_url)}" alt="" loading="lazy" decoding="async" />`;
    return `<span class="avatar avatar-fallback ${cls}" style="${accVars(p)}" aria-hidden="true">${esc(firstChar(nameOf(p)))}</span>`;
  }
  const wordmark = () => `<a class="brand" href="#/" aria-label="${APP_NAME} home"><img class="brand-logo" src="assets/logo-rings.png" alt="" /><span class="wordmark">${APP_NAME}</span></a>`;

  function emptyState(icon, title, text, action = "") {
    return `<div class="empty"><span class="empty-ic">${I[icon]()}</span><b>${title}</b><p>${text}</p>${action}</div>`;
  }

  let toastTimer;
  function toast(msg, kind = "") {
    const t = $("#toast");
    t.textContent = msg; t.className = "toast " + kind; t.hidden = false;
    requestAnimationFrame(() => t.classList.add("show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.classList.remove("show"); setTimeout(() => (t.hidden = true), 250); }, 2800);
  }

  function openSheet(html, cls = "") {
    closeSheet();
    const wrap = document.createElement("div");
    wrap.className = "sheet-wrap";
    wrap.innerHTML = `<div class="sheet-backdrop" data-close></div><div class="sheet card ${cls}" role="dialog" aria-modal="true"><span class="sheet-grab"></span>${html}</div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add("open"));
    wrap.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeSheet(); });
    return wrap;
  }
  function closeSheet() { $$(".sheet-wrap").forEach((w) => w.remove()); }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });

  function openCreateSheet() {
    openSheet(`
      <div class="sheet-body center">
        <img class="sheet-logo" src="assets/logo-rings-sparkles.png" alt="" />
        <h3>Posting is coming soon</h3>
        <p>Photos, clips and videos will land right here. Your profile is ready for them.</p>
        <div class="create-kinds">
          <span>${I.image()}Photo</span><span>${I.clips()}Clip</span><span>${I.video()}Video</span>
        </div>
        <button class="btn-primary block" data-close>Got it</button>
      </div>`);
  }

  function openSettingsSheet() {
    const me = S.me;
    openSheet(`
      <div class="sheet-body">
        <div class="sheet-me" style="${accVars(me)}"><span class="ring-acc">${avatar(me, "md")}</span><div><b>${esc(nameOf(me))}</b><span>@${esc(me.username)}</span></div></div>
        <a class="sheet-row" href="#/edit" data-close>${I.edit()}<span>Edit profile</span>${I.chevron({ cls: "row-chev" })}</a>
        <a class="sheet-row" href="#/u/${esc(me.username)}" data-close>${I.user()}<span>View profile</span>${I.chevron({ cls: "row-chev" })}</a>
        <button class="sheet-row" data-act="share-profile">${I.share()}<span>Share profile link</span>${I.chevron({ cls: "row-chev" })}</button>
        <button class="sheet-row danger" data-act="logout">${I.logout()}<span>Log out</span></button>
      </div>`);
  }

  async function copyLink(url, label) {
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) { await navigator.share({ title: APP_NAME, url }); return; }
      await navigator.clipboard.writeText(url);
      toast(label || "Link copied");
    } catch (e) { if (e && e.name !== "AbortError") toast(url); }
  }
  const siteUrl = () => location.origin + location.pathname;
  const profileUrl = (u) => siteUrl() + "?u=" + encodeURIComponent(u);

  /* =========================================================
     Screens: boot / auth / onboarding / app
     ========================================================= */
  function show(view) {
    document.body.dataset.view = view;
    $("#boot").hidden = view !== "boot";
    $("#auth").hidden = view !== "auth";
    $("#onboard").hidden = view !== "onboard";
    $("#app").hidden = view !== "app";
    window.scrollTo(0, 0);
  }

  /* ---------- Auth ---------- */
  const auth = { mode: "signup", avail: null, lastChecked: "" };

  function renderAuth(notice = "") {
    show("auth");
    document.title = `${APP_NAME} - Welcome`;
    const off = !configured() || !window.supabase;
    const su = auth.mode === "signup";
    $("#auth").innerHTML = `
      <div class="auth-wrap">
        <section class="auth-hero">
          <img class="auth-logo" src="assets/logo-rings-sparkles.png" alt="" />
          <h1 class="auth-title">${APP_NAME}</h1>
          <p class="auth-tag">Photos, clips and videos from the people you actually care about.</p>
          <ul class="auth-points">
            <li><span>${I.image()}</span>Share photos in a feed that feels like you</li>
            <li><span>${I.clips()}</span>Swipe through short vertical clips</li>
            <li><span>${I.video()}</span>Watch long-form videos from friends</li>
          </ul>
        </section>
        <section class="auth-card card">
          <div class="seg" role="tablist" data-mode="${auth.mode}">
            <span class="seg-thumb" aria-hidden="true"></span>
            <button type="button" role="tab" data-mode="signup" aria-selected="${su}">Create account</button>
            <button type="button" role="tab" data-mode="login" aria-selected="${!su}">Log in</button>
          </div>
          <h2 class="auth-h">${su ? "Join Loop" : "Welcome back"}</h2>
          <p class="auth-sub">${su ? "Pick a username and password to get started." : "Log in with your username and password."}</p>
          ${off ? `<div class="notice">${I.lock()}<span>${esc(friendly(new Error(!configured() ? "not_configured" : "lib_missing")))}</span></div>` : ""}
          ${notice ? `<div class="notice">${I.sparkle()}<span>${esc(notice)}</span></div>` : ""}
          <form id="auth-form" novalidate autocomplete="on">
            <div class="field">
              <label for="au-user">Username</label>
              <div class="input-wrap prefix">
                <span class="input-prefix">@</span>
                <input id="au-user" name="username" type="text" inputmode="text" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="20" placeholder="yourname" required />
                <span class="input-status" id="au-status" aria-hidden="true"></span>
              </div>
              ${su ? `<p class="hint" id="au-hint">3-20 characters: lowercase letters, numbers, . and _</p>` : `<p class="hint" id="au-hint" hidden></p>`}
            </div>
            <div class="field">
              <label for="au-pass">Password</label>
              <div class="input-wrap">
                <input id="au-pass" name="password" type="password" autocomplete="${su ? "new-password" : "current-password"}" placeholder="${su ? "At least 8 characters" : "Your password"}" required />
                <button type="button" class="input-btn" data-act="toggle-pass" aria-label="Show password">${I.eye()}</button>
              </div>
            </div>
            ${su ? `
            <div class="field">
              <label for="au-pass2">Confirm password</label>
              <div class="input-wrap">
                <input id="au-pass2" name="password2" type="password" autocomplete="new-password" placeholder="Type it again" required />
              </div>
            </div>` : ""}
            <p class="form-error" id="au-error" role="alert"></p>
            <button class="btn-primary block" type="submit" id="au-submit">${su ? "Create account" : "Log in"}</button>
          </form>
          <p class="auth-foot">${su
            ? `${I.lock()}No email needed. Keep your password safe: there's no email reset.`
            : `<span>New to Loop?</span> <button type="button" class="linkish" data-mode="signup">Create an account</button>`}</p>
        </section>
      </div>`;
    bindAuth();
  }

  function setUserStatus(state, msg) {
    const st = $("#au-status"), hint = $("#au-hint");
    if (!st) return;
    st.className = "input-status " + state;
    st.innerHTML = state === "ok" ? I.check({ sw: 3 }) : state === "bad" ? I.x({ sw: 3 }) : state === "busy" ? '<i class="spin"></i>' : "";
    hint.className = "hint " + state;
    hint.innerHTML = msg;
  }

  const checkAvailability = debounce(async (u) => {
    if (auth.mode !== "signup" || ($("#au-user") || {}).value !== u) return;
    try {
      const ok = await api.usernameAvailable(u);
      if (($("#au-user") || {}).value !== u) return;
      auth.avail = ok; auth.lastChecked = u;
      setUserStatus(ok ? "ok" : "bad", ok ? `@${esc(u)} is available` : `@${esc(u)} is taken`);
    } catch (e) {
      auth.avail = null;
      setUserStatus("", esc(friendly(e)));
    }
  }, 380);

  function userProblem(u) {
    if (!u) return "Pick a username";
    if (u.length < 3) return "At least 3 characters";
    if (!/^[a-z0-9._]+$/.test(u)) return "Only lowercase letters, numbers, . and _";
    if (/^\.|\.$/.test(u)) return "Can't start or end with a dot";
    if (/\.\./.test(u)) return "No double dots";
    return USER_RE.test(u) ? "" : "Not a valid username";
  }

  function bindAuth() {
    const root = $("#auth");
    const user = $("#au-user"), pass = $("#au-pass"), err = $("#au-error");
    $$("button[data-mode]", root).forEach((b) => b.addEventListener("click", () => {
      if (auth.mode === b.dataset.mode) return;
      const keep = user.value;
      auth.mode = b.dataset.mode; auth.avail = null; auth.lastChecked = "";
      renderAuth();
      const u2 = $("#au-user"); u2.value = keep; if (keep) u2.dispatchEvent(new Event("input"));
    }));
    $('[data-act="toggle-pass"]', root).addEventListener("click", (e) => {
      const showIt = pass.type === "password";
      [pass, $("#au-pass2")].forEach((i) => i && (i.type = showIt ? "text" : "password"));
      e.currentTarget.innerHTML = showIt ? I.eyeOff() : I.eye();
      e.currentTarget.setAttribute("aria-label", showIt ? "Hide password" : "Show password");
    });
    user.addEventListener("input", () => {
      const pos = user.selectionStart;
      const v = user.value.toLowerCase().replace(/\s+/g, "");
      if (v !== user.value) { user.value = v; try { user.setSelectionRange(pos, pos); } catch (e) {} }
      err.textContent = "";
      if (auth.mode !== "signup") return;
      auth.avail = null;
      const prob = userProblem(v);
      if (!v) return setUserStatus("", "3-20 characters: lowercase letters, numbers, . and _");
      if (prob) return setUserStatus("bad", prob);
      if (!configured() || !window.supabase) return setUserStatus("", "Looks good");
      setUserStatus("busy", "Checking availability...");
      checkAvailability(v);
    });
    [pass, $("#au-pass2")].forEach((i) => i && i.addEventListener("input", () => (err.textContent = "")));
    $("#auth-form").addEventListener("submit", onAuthSubmit);
  }

  async function onAuthSubmit(e) {
    e.preventDefault();
    const u = $("#au-user").value.trim().toLowerCase();
    const p = $("#au-pass").value;
    const err = $("#au-error"), btn = $("#au-submit");
    const fail = (m, focus) => { err.textContent = m; if (focus) focus.focus(); };
    if (auth.mode === "signup") {
      const prob = userProblem(u);
      if (prob) return fail(prob, $("#au-user"));
      if (p.length < 8) return fail("Password must be at least 8 characters.", $("#au-pass"));
      if (p !== $("#au-pass2").value) return fail("Passwords don't match.", $("#au-pass2"));
    } else {
      if (!u) return fail("Enter your username.", $("#au-user"));
      if (!p) return fail("Enter your password.", $("#au-pass"));
    }
    const label = btn.textContent;
    btn.disabled = true; btn.classList.add("loading");
    btn.textContent = auth.mode === "signup" ? "Creating account..." : "Logging in...";
    try {
      if (auth.mode === "signup") {
        if (!(auth.avail === true && auth.lastChecked === u)) {
          const ok = await api.usernameAvailable(u);
          if (!ok) { setUserStatus("bad", `@${esc(u)} is taken`); throw new Error("That username is taken. Try another."); }
        }
        S.session = (await api.signUp(u, p)).session;
      } else {
        S.session = (await api.signIn(u, p)).session;
      }
      await afterSignIn(auth.mode === "login");
    } catch (ex) {
      fail(friendly(ex));
      btn.disabled = false; btn.classList.remove("loading"); btn.textContent = label;
    }
  }

  /* ---------- After sign in: load profile, route to onboarding or app ---------- */
  async function afterSignIn(greet) {
    try { S.me = await api.myProfile(); } catch (e) { return renderFatal(friendly(e)); }
    if (!S.me.onboarded || !S.me.display_name) return startOnboarding();
    try { await api.loadFollowing(); } catch (e) { /* non-fatal */ }
    enterApp();
    if (greet) toast(`Welcome back, ${nameOf(S.me)}`);
  }

  function renderFatal(msg) {
    show("auth");
    $("#auth").innerHTML = `
      <div class="auth-wrap single">
        <section class="auth-card card center">
          <img class="auth-logo sm" src="assets/logo-rings.png" alt="" />
          <h2 class="auth-h">Hang tight</h2>
          <p class="auth-sub">${esc(msg)}</p>
          <button class="btn-primary block" data-act="retry">Try again</button>
          <button class="btn-ghost block" data-act="logout">Log out</button>
        </section>
      </div>`;
    $('#auth [data-act="retry"]').addEventListener("click", () => { show("boot"); afterSignIn(false); });
  }

  /* ---------- Onboarding ---------- */
  let ob = null;
  const OB_STEPS = [
    { key: "name", title: "What should we call you?", sub: "This is the name people see on your profile. You can change it any time." },
    { key: "media", title: "Add a photo and banner", sub: "A profile photo and a wide banner, like a channel cover. Both optional.", skip: true },
    { key: "about", title: "Tell people about you", sub: "A short bio and a link. Totally optional.", skip: true },
    { key: "accent", title: "Pick your colour", sub: "Your accent tints your profile ring, buttons and banner glow.", skip: true },
    { key: "interests", title: "What are you into?", sub: "Pick a few. We'll use these to shape Loop for you.", skip: true },
  ];

  function startOnboarding() {
    ob = {
      step: 0, saving: false,
      d: { display_name: S.me.display_name || "", pronouns: S.me.pronouns || "", bio: S.me.bio || "", website: S.me.website || "",
        accent: S.me.accent || "lime", interests: [...(S.me.interests || [])] },
      avatar: null, banner: null,
    };
    show("onboard");
    document.title = `${APP_NAME} - Set up your profile`;
    renderOnboarding();
  }

  // Profile look-alike (banner + avatar) used as the photo/banner picker and preview.
  function mediaEditor(state, base, { removable = false } = {}) {
    const p = Object.assign({}, base, state.d, {
      avatar_url: state.avatar ? state.avatar.preview : state.removeAvatar ? null : base.avatar_url,
      banner_url: state.banner ? state.banner.preview : state.removeBanner ? null : base.banner_url,
    });
    const hasBanner = safeImg(p.banner_url), hasAvatar = safeImg(p.avatar_url);
    return `
      <div class="media-ed" style="${accVars(p)}">
        <button type="button" class="me-banner ${hasBanner ? "has" : ""}" data-pick="banner" aria-label="Choose banner image">
          ${hasBanner ? `<img src="${esc(p.banner_url)}" alt="" />` : `<span class="banner-fallback"></span>`}
          <span class="me-cam">${I.camera()}<em>${hasBanner ? "Change banner" : "Add banner"}</em></span>
        </button>
        <button type="button" class="me-avatar" data-pick="avatar" aria-label="Choose profile photo">
          <span class="ring-acc">${avatar(p, "xl")}</span>
          <span class="me-cam round">${I.camera()}</span>
        </button>
      </div>
      ${removable && (hasAvatar || hasBanner) ? `<div class="me-remove">
        ${hasAvatar ? '<button type="button" class="linkish" data-remove="avatar">Remove photo</button>' : ""}
        ${hasBanner ? '<button type="button" class="linkish" data-remove="banner">Remove banner</button>' : ""}
      </div>` : ""}
      <input type="file" accept="image/*" class="pick-avatar" hidden />
      <input type="file" accept="image/*" class="pick-banner" hidden />`;
  }

  function bindMediaEditor(root, state, rerender) {
    $$("[data-pick]", root).forEach((b) => b.addEventListener("click", () => $(".pick-" + b.dataset.pick, root).click()));
    $$("[data-remove]", root).forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.remove;
      state[k] = null; state[k === "avatar" ? "removeAvatar" : "removeBanner"] = true; rerender();
    }));
    ["avatar", "banner"].forEach((k) => {
      const input = $(".pick-" + k, root);
      input.addEventListener("change", async () => {
        const f = input.files && input.files[0];
        input.value = "";
        if (!f) return;
        try {
          const r = await processImage(f, k);
          if (state[k]) URL.revokeObjectURL(state[k].preview);
          state[k] = r; state[k === "avatar" ? "removeAvatar" : "removeBanner"] = false;
          rerender();
        } catch (e) { toast(e.message || "Couldn't use that image", "bad"); }
      });
    });
  }

  function accentPicker(sel) {
    return `<div class="swatches" role="radiogroup" aria-label="Accent colour">${ACCENTS.map((a) => `
      <button type="button" class="swatch ${a.key === sel ? "on" : ""}" role="radio" aria-checked="${a.key === sel}" data-accent="${a.key}" style="--sw:${a.hex};--sw-rgb:${a.rgb}">
        <i>${a.key === sel ? I.check({ sw: 3 }) : ""}</i><span>${a.label}</span>
      </button>`).join("")}</div>`;
  }
  function interestPicker(list) {
    return `<div class="int-chips">${INTERESTS.map((t) => `
      <button type="button" class="chip ${list.includes(t) ? "active" : ""}" data-interest="${t}" aria-pressed="${list.includes(t)}">${list.includes(t) ? I.check({ sw: 3 }) : I.plus({ sw: 2.4 })}${t}</button>`).join("")}</div>`;
  }
  const counter = (id, n, max) => `<span class="counter ${n > max ? "over" : ""}" id="${id}">${n}/${max}</span>`;

  function obStepBody(key) {
    const d = ob.d;
    if (key === "name") return `
      <div class="field">
        <label for="ob-name">Display name</label>
        <div class="input-wrap"><input id="ob-name" type="text" maxlength="${LIMITS.name}" autocomplete="name" placeholder="Your name" value="${esc(d.display_name)}" /></div>
        <p class="hint">Shown above your @${esc(S.me.username)}</p>
      </div>
      <div class="field">
        <label for="ob-pronouns">Pronouns <em>optional</em></label>
        <div class="input-wrap"><input id="ob-pronouns" type="text" maxlength="${LIMITS.pronouns}" autocapitalize="none" placeholder="e.g. they/them" value="${esc(d.pronouns)}" /></div>
        <div class="mini-chips">${PRONOUNS.map((p) => `<button type="button" class="mini-chip ${d.pronouns === p ? "on" : ""}" data-pronoun="${p}">${p}</button>`).join("")}</div>
      </div>`;
    if (key === "media") return `<div id="ob-media" class="ob-media">${mediaEditor(ob, S.me)}</div>
      <div class="ob-preview-name"><b>${esc(d.display_name)}</b><span>@${esc(S.me.username)}</span></div>
      <div class="ob-pick-btns">
        <button type="button" class="btn-ghost" data-proxy="avatar">${I.camera()}Profile photo</button>
        <button type="button" class="btn-ghost" data-proxy="banner">${I.image()}Banner</button>
      </div>
      <p class="hint center">We crop and resize them for you: square for your photo, wide for your banner.</p>`;
    if (key === "about") return `
      <div class="field">
        <label for="ob-bio">Bio <em>optional</em> ${counter("ob-bio-count", d.bio.length, LIMITS.bio)}</label>
        <div class="input-wrap area"><textarea id="ob-bio" rows="4" maxlength="${LIMITS.bio}" placeholder="Film photographer. Coffee first. Always chasing golden hour.">${esc(d.bio)}</textarea></div>
      </div>
      <div class="field">
        <label for="ob-web">Website <em>optional</em></label>
        <div class="input-wrap prefix"><span class="input-prefix">${I.link()}</span><input id="ob-web" type="url" inputmode="url" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="${LIMITS.website}" placeholder="yoursite.com" value="${esc(linkLabel(d.website))}" /></div>
      </div>`;
    if (key === "accent") {
      const prev = Object.assign({}, S.me, d, { avatar_url: ob.avatar ? ob.avatar.preview : S.me.avatar_url });
      return `
      <div class="accent-preview card" style="${accVars(d)}">
        <div class="ap-banner ${ob.banner ? "has" : ""}">${ob.banner ? `<img src="${esc(ob.banner.preview)}" alt="" />` : `<span class="banner-fallback"></span>`}</div>
        <div class="ap-row">
          <span class="ring-acc">${avatar(prev, "lg")}</span>
          <span class="btn-follow on-acc">Follow</span>
        </div>
        <div class="ap-meta"><b>${esc(d.display_name)}</b><span>@${esc(S.me.username)}</span></div>
        <div class="ap-tabs"><span class="on">Posts</span><span>Clips</span><span>Videos</span></div>
      </div>
      ${accentPicker(d.accent)}`;
    }
    if (key === "interests") return interestPicker(d.interests) + `<p class="hint center" id="int-count">${d.interests.length ? `${d.interests.length} selected` : "Tap to select"}</p>`;
    return "";
  }

  function renderOnboarding() {
    const st = OB_STEPS[ob.step];
    const last = ob.step === OB_STEPS.length - 1;
    const nameOk = ob.d.display_name.trim().length > 0;
    $("#onboard").innerHTML = `
      <div class="ob" data-step="${st.key}">
        <header class="ob-top">
          <button type="button" class="icon-btn ghost" data-ob="back" aria-label="Back" ${ob.step === 0 ? 'style="visibility:hidden"' : ""}>${I.back()}</button>
          <div class="ob-progress" aria-label="Step ${ob.step + 1} of ${OB_STEPS.length}">
            ${OB_STEPS.map((_, i) => `<i class="${i < ob.step ? "done" : i === ob.step ? "on" : ""}"></i>`).join("")}
          </div>
          ${st.skip ? `<button type="button" class="skip" data-ob="skip">Skip</button>` : `<span class="skip skip-ph"></span>`}
        </header>
        <div class="ob-body">
          <p class="ob-step">Step ${ob.step + 1} of ${OB_STEPS.length}</p>
          <h1>${st.title}</h1>
          <p class="ob-sub">${st.sub}</p>
          <div class="ob-content">${obStepBody(st.key)}</div>
          <p class="form-error" id="ob-error" role="alert"></p>
        </div>
        <footer class="ob-foot">
          <button type="button" class="btn-primary block" data-ob="next" ${st.key === "name" && !nameOk ? "disabled" : ""}>${last ? "Finish" : "Continue"}</button>
        </footer>
      </div>`;
    bindOnboarding(st.key);
  }

  function bindOnboarding(key) {
    const root = $("#onboard");
    const d = ob.d;
    $('[data-ob="back"]', root).addEventListener("click", () => { if (ob.step > 0 && !ob.saving) { ob.step--; renderOnboarding(); } });
    const skip = $('[data-ob="skip"]', root);
    if (skip) skip.addEventListener("click", () => obAdvance(true));
    $('[data-ob="next"]', root).addEventListener("click", () => obAdvance(false));
    if (key === "name") {
      const n = $("#ob-name"), pr = $("#ob-pronouns"), next = $('[data-ob="next"]', root);
      n.addEventListener("input", () => { d.display_name = n.value; next.disabled = !n.value.trim(); $("#ob-error").textContent = ""; });
      n.addEventListener("keydown", (e) => { if (e.key === "Enter" && n.value.trim()) obAdvance(false); });
      pr.addEventListener("input", () => { d.pronouns = pr.value; $$(".mini-chip", root).forEach((c) => c.classList.toggle("on", c.dataset.pronoun === pr.value)); });
      $$(".mini-chip", root).forEach((c) => c.addEventListener("click", () => {
        pr.value = pr.value === c.dataset.pronoun ? "" : c.dataset.pronoun; pr.dispatchEvent(new Event("input"));
      }));
      if (!matchMedia("(pointer: coarse)").matches) n.focus();
    }
    if (key === "media") {
      const box = $("#ob-media");
      const rr = () => { box.innerHTML = mediaEditor(ob, S.me); bindMediaEditor(box, ob, rr); };
      bindMediaEditor(box, ob, rr);
      $$("[data-proxy]", root).forEach((b) => b.addEventListener("click", () => $(".pick-" + b.dataset.proxy, box).click()));
    }
    if (key === "about") {
      const b = $("#ob-bio"), w = $("#ob-web");
      b.addEventListener("input", () => { d.bio = b.value; $("#ob-bio-count").outerHTML = counter("ob-bio-count", b.value.length, LIMITS.bio); });
      w.addEventListener("input", () => { d.website = w.value; $("#ob-error").textContent = ""; });
    }
    if (key === "accent") $$("[data-accent]", root).forEach((s) => s.addEventListener("click", () => { d.accent = s.dataset.accent; renderOnboarding(); }));
    if (key === "interests") $$("[data-interest]", root).forEach((c) => c.addEventListener("click", () => {
      const t = c.dataset.interest, i = d.interests.indexOf(t);
      if (i >= 0) d.interests.splice(i, 1); else d.interests.push(t);
      const y = window.scrollY; renderOnboarding(); window.scrollTo(0, y);
    }));
  }

  function validateAbout(d) {
    if (d.bio.length > LIMITS.bio) return "Bio can be at most 150 characters.";
    const w = normWebsite(d.website);
    if (w && (w.length > LIMITS.website || !/^https?:\/\/[^\s/.]+(\.[^\s/.]+)+(\/\S*)?$/i.test(w))) return "That website doesn't look right. Try something like yoursite.com";
    return "";
  }

  async function obAdvance(skipped) {
    if (ob.saving) return;
    const st = OB_STEPS[ob.step];
    const err = $("#ob-error");
    if (st.key === "name" && !ob.d.display_name.trim()) { err.textContent = "Please add a display name."; return; }
    if (skipped && st.key === "about") { ob.d.bio = ""; ob.d.website = ""; }
    if (st.key === "about") { const p = validateAbout(ob.d); if (p) { err.textContent = p; return; } }
    if (ob.step < OB_STEPS.length - 1) { ob.step++; renderOnboarding(); window.scrollTo(0, 0); return; }
    // Finish: upload images, then save the profile
    ob.saving = true;
    const btn = $('[data-ob="next"]');
    btn.disabled = true; btn.classList.add("loading"); btn.textContent = "Saving your profile...";
    try {
      const patch = profilePatch(ob.d);
      if (ob.avatar) patch.avatar_url = await api.uploadImage("avatars", ob.avatar.blob);
      if (ob.banner) patch.banner_url = await api.uploadImage("banners", ob.banner.blob);
      patch.onboarded = true;
      S.me = await api.updateProfile(patch);
      try { await api.loadFollowing(); } catch (e) {}
      ob = null;
      history.replaceState(null, "", location.pathname + location.search + "#/");
      enterApp();
      toast(`Welcome to ${APP_NAME}, ${nameOf(S.me)}!`);
    } catch (e) {
      ob.saving = false;
      err.textContent = friendly(e);
      btn.disabled = false; btn.classList.remove("loading"); btn.textContent = "Finish";
    }
  }

  function profilePatch(d) {
    return {
      display_name: d.display_name.trim().slice(0, LIMITS.name),
      pronouns: d.pronouns.trim().slice(0, LIMITS.pronouns) || null,
      bio: d.bio.trim().slice(0, LIMITS.bio) || null,
      website: normWebsite(d.website),
      accent: d.accent,
      interests: d.interests.slice(0, 20),
    };
  }

  /* =========================================================
     App shell
     ========================================================= */
  function enterApp() {
    show("app");
    renderShell();
    route();
  }

  function renderShell() {
    const me = S.me;
    const meLink = `#/u/${esc(me.username)}`;
    $("#sidebar").innerHTML = `
      ${wordmark()}
      <nav class="side-nav">
        <a href="#/" class="side-link" data-nav="home">${I.home()}<span>Home</span></a>
        <a href="#/search" class="side-link" data-nav="search">${I.search()}<span>Search</span></a>
        <a href="#/clips" class="side-link" data-nav="clips">${I.clips()}<span>Clips</span></a>
        <a href="#/videos" class="side-link" data-nav="videos">${I.video()}<span>Videos</span></a>
        <a href="${meLink}" class="side-link" data-nav="me">${I.user()}<span>Profile</span></a>
      </nav>
      <button class="btn-create" data-act="create">${I.plus({ sw: 2.6 })}<span>Create</span></button>
      <div class="side-section" id="side-following"></div>
      <div class="side-foot">
        <a href="${meLink}" class="side-me" style="${accVars(me)}"><span class="ring-acc">${avatar(me, "sm")}</span>
          <span class="me-meta"><b>${esc(nameOf(me))}</b><span>@${esc(me.username)}</span></span></a>
        <button class="icon-btn ghost" data-act="settings" aria-label="Settings">${I.settings()}</button>
      </div>`;
    $("#topbar").innerHTML = `
      <div class="tb-left">${wordmark()}</div>
      <label class="search">
        ${I.search()}
        <input type="search" id="tb-search" placeholder="Search people on Loop" autocomplete="off" autocapitalize="none" spellcheck="false" />
      </label>
      <div class="tb-right">
        <a class="icon-btn mobile-only" href="#/search" aria-label="Search">${I.search()}</a>
        <button class="icon-btn mobile-only" data-act="settings" aria-label="Settings">${I.settings()}</button>
        <button class="btn-upload desktop-only" data-act="create">${I.plus({ sw: 2.6 })}<span>Create</span></button>
        <a class="tb-avatar desktop-only" href="${meLink}" aria-label="Your profile" style="${accVars(me)}"><span class="ring-acc">${avatar(me, "sm")}</span></a>
      </div>`;
    $("#tabbar").innerHTML = `
      <a href="#/" class="tab" data-nav="home">${I.home()}<span>Home</span></a>
      <a href="#/search" class="tab" data-nav="search">${I.search()}<span>Search</span></a>
      <button class="tab create" data-act="create" aria-label="Create"><span class="create-btn">${I.plus({ sw: 2.8 })}</span></button>
      <a href="#/clips" class="tab" data-nav="clips">${I.clips()}<span>Clips</span></a>
      <a href="${meLink}" class="tab" data-nav="me" style="${accVars(me)}">${avatar(me, "tab-av")}<span>Profile</span></a>`;
    const tbs = $("#tb-search");
    tbs.addEventListener("input", () => {
      const q = tbs.value;
      if (routeInfo().name !== "search") location.hash = "#/search";
      setTimeout(() => { const ps = $("#search-input"); if (ps) ps.value = q; runSearch(q); }, 0);
    });
    renderSideFollowing();
  }

  async function renderSideFollowing() {
    const box = $("#side-following");
    if (!box) return;
    const ids = [...S.followingIds].slice(0, 8);
    let list = [];
    try { list = await api.profilesByIds(ids); } catch (e) {}
    box.innerHTML = `<div class="side-title">Following</div>${list.length
      ? list.map((p) => `<a href="#/u/${esc(p.username)}" class="side-follow">${avatar(p, "xs")}<span class="sf-name">${esc(nameOf(p))}</span></a>`).join("") +
        (S.followingIds.size > list.length ? `<span class="side-more">+${S.followingIds.size - list.length} more</span>` : "")
      : `<p class="side-empty">You're not following anyone yet.</p><a href="#/search" class="side-more">Find people ${I.chevron()}</a>`}`;
  }

  /* ---------- Router ---------- */
  function routeInfo() {
    const h = location.hash.replace(/^#\/?/, "");
    const [path, qs] = h.split("?");
    const parts = path.split("/").filter(Boolean).map((s) => { try { return decodeURIComponent(s); } catch (e) { return s; } });
    const q = new URLSearchParams(qs || "").get("q") || "";
    if (!parts.length) return { name: "home" };
    if (parts[0] === "u" && parts[1]) return { name: "profile", username: parts[1].toLowerCase().replace(/^@/, "") };
    if (parts[0] === "me" || parts[0] === "profile") return { name: "profile", username: S.me.username };
    if (["search", "clips", "videos", "edit"].includes(parts[0])) return { name: parts[0], q };
    return { name: "home" };
  }

  function route() {
    if (!S.me || document.body.dataset.view !== "app") return;
    const r = routeInfo();
    const gen = ++S.gen;
    closeSheet();
    const navKey = r.name === "profile" ? (r.username === S.me.username ? "me" : "") : r.name === "edit" ? "me" : r.name;
    $$("[data-nav]").forEach((a) => a.classList.toggle("active", a.dataset.nav === navKey));
    document.body.dataset.route = r.name;
    const view = $("#view");
    window.scrollTo(0, 0);
    if (r.name === "home") renderHome(view, gen);
    else if (r.name === "search") renderSearch(view, r.q);
    else if (r.name === "clips") renderKindPage(view, gen, "clip");
    else if (r.name === "videos") renderKindPage(view, gen, "video");
    else if (r.name === "profile") renderProfile(view, gen, r.username);
    else if (r.name === "edit") renderEdit(view);
    const tbs = $("#tb-search");
    if (tbs && r.name !== "search") tbs.value = "";
  }
  window.addEventListener("hashchange", route);

  /* ---------- Post renderers (posting UI arrives later; these render real rows) ---------- */
  function timeAgo(iso) {
    const s = (Date.now() - new Date(iso)) / 1000;
    if (!(s >= 0)) return "";
    if (s < 60) return "just now";
    const units = [[60, "m"], [24, "h"], [7, "d"], [4.35, "w"], [12, "mo"], [Infinity, "y"]];
    let v = s / 60;
    for (const [k, u] of units) { if (v < k) return Math.floor(v) + u + " ago"; v /= k; }
    return "";
  }
  function photoCard(post, author) {
    return `
    <article class="post card">
      <header class="post-head">
        <a href="#/u/${esc(author.username)}">${avatar(author, "post-av")}</a>
        <div class="post-meta"><a class="uname" href="#/u/${esc(author.username)}">${esc(author.username)}</a><span class="sub">${esc(timeAgo(post.created_at))}</span></div>
      </header>
      <div class="post-media">${safeImg(post.media_url) ? `<img src="${esc(post.media_url)}" alt="" loading="lazy" />` : ""}</div>
      ${post.caption ? `<div class="post-body"><p class="caption"><b>${esc(author.username)}</b> ${esc(post.caption)}</p></div>` : ""}
    </article>`;
  }
  function clipTile(post, author) {
    const img = post.thumb_url || post.media_url;
    return `
    <div class="clip">
      ${safeImg(img) ? `<img src="${esc(img)}" alt="" loading="lazy" />` : ""}
      <span class="clip-shade"></span><span class="play-btn">${I.play()}</span>
      <span class="clip-info">
        <a class="clip-user" href="#/u/${esc(author.username)}">${avatar(author, "xs")}@${esc(author.username)}</a>
        ${post.caption ? `<span class="clip-cap">${esc(post.caption)}</span>` : ""}
      </span>
    </div>`;
  }
  function videoCard(post, author) {
    return `
    <div class="vcard">
      <span class="thumb">${safeImg(post.thumb_url) ? `<img src="${esc(post.thumb_url)}" alt="" loading="lazy" />` : ""}<span class="thumb-play">${I.play()}</span></span>
      <span class="vmeta">
        <a href="#/u/${esc(author.username)}">${avatar(author, "vav")}</a>
        <span class="vtext"><span class="vtitle">${esc(post.caption || "Untitled video")}</span>
          <span class="vchan">${esc(nameOf(author))}</span><span class="vstats">${esc(timeAgo(post.created_at))}</span></span>
      </span>
    </div>`;
  }
  async function authorsFor(posts) {
    const map = new Map([[S.me.id, S.me]]);
    const missing = [...new Set(posts.map((p) => p.author_id))].filter((id) => !map.has(id));
    (await api.profilesByIds(missing)).forEach((p) => map.set(p.id, p));
    return map;
  }

  /* ---------- Home ---------- */
  function sectionHead(icon, title, sub, href, cls = "") {
    return `<div class="sec-head ${cls}"><span class="sec-ic">${I[icon]()}</span><div><h2>${title}</h2><p>${sub}</p></div>${href ? `<a href="${href}" class="see-all">See all ${I.chevron()}</a>` : ""}</div>`;
  }

  function personCard(p) {
    const following = S.followingIds.has(p.id);
    return `
      <div class="person card" style="${accVars(p)}">
        <a href="#/u/${esc(p.username)}" class="person-link">
          <span class="ring-acc">${avatar(p, "lg")}</span>
          <b>${esc(nameOf(p))}</b><span>@${esc(p.username)}</span>
        </a>
        <button class="btn-follow sm ${following ? "on" : ""}" data-follow="${esc(p.id)}">${following ? "Following" : "Follow"}</button>
      </div>`;
  }

  async function renderHome(view, gen) {
    document.title = `${APP_NAME} - Home`;
    const me = S.me;
    view.innerHTML = `
      <section class="stories" aria-label="People">
        <div class="stories-track" id="stories">
          <button class="story you" data-act="create" style="${accVars(me)}">
            <span class="ring">${avatar(me)}</span><span class="add">${I.plus({ sw: 3 })}</span><span class="story-name">Your story</span>
          </button>
        </div>
      </section>
      <nav class="chips" aria-label="Filter">
        <div class="chips-track">
          ${[["all", "All", "sparkle"], ["photos", "Photos", "image"], ["clips", "Clips", "clips"], ["videos", "Videos", "video"]].map(([f, l, ic]) =>
            `<button class="chip ${S.filter === f ? "active" : ""}" data-filter="${f}">${I[ic]()}${l}</button>`).join("")}
        </div>
      </nav>
      <div class="feed" id="feed" data-filter="${S.filter}">
        <div class="feed-loading"><i class="spin"></i></div>
      </div>`;
    let posts = [], suggested = [], following = [];
    try {
      [posts, suggested, following] = await Promise.all([
        api.feed(), api.suggested(10), api.profilesByIds([...S.followingIds].slice(0, 30)),
      ]);
    } catch (e) {
      if (gen !== S.gen) return;
      $("#feed").innerHTML = `<div class="empty-card card">${emptyState("flame", "Couldn't load your feed", esc(friendly(e)), `<button class="btn-ghost" data-act="reload">Try again</button>`)}</div>`;
      return;
    }
    if (gen !== S.gen) return;
    // People you follow appear in the top row (links to their profiles)
    $("#stories").insertAdjacentHTML("beforeend", following.map((p) => `
      <a href="#/u/${esc(p.username)}" class="story" style="${accVars(p)}"><span class="ring">${avatar(p)}</span><span class="story-name">${esc(p.username)}</span></a>`).join("") +
      `<a href="#/search" class="story find"><span class="ring"><span class="avatar find-ic">${I.search()}</span></span><span class="story-name">Find people</span></a>`);

    const authors = await authorsFor(posts).catch(() => new Map([[me.id, me]]));
    if (gen !== S.gen) return;
    const by = (k) => posts.filter((p) => p.kind === k && authors.has(p.author_id));
    const photos = by("photo"), clips = by("clip"), videos = by("video");
    const noFollows = S.followingIds.size === 0;

    const welcome = noFollows ? `
      <section class="welcome card" data-kind="all">
        <img src="assets/logo-rings-sparkles.png" alt="" />
        <h2>Follow people to fill your feed</h2>
        <p>Your home feed shows photos, clips and videos from the people you follow.</p>
        <a href="#/search" class="btn-primary">${I.search()}Find people</a>
      </section>` : "";
    const people = suggested.length ? `
      <section class="people-sec" data-kind="all">
        ${sectionHead("users", "People on Loop", "New faces to follow", "#/search")}
        <div class="people-track">${suggested.map(personCard).join("")}</div>
      </section>` : noFollows ? `
      <section class="people-sec" data-kind="all">
        ${sectionHead("users", "People on Loop", "You're one of the first here")}
        <div class="invite card"><p>Loop is brand new. Invite friends so you have someone to follow.</p>
        <button class="btn-ghost" data-act="invite">${I.share()}Copy invite link</button></div>
      </section>` : "";

    $("#feed").innerHTML = `
      ${welcome}
      ${people}
      <section class="photos-sec" data-kind="photos">
        ${sectionHead("image", "Photos", "From you and people you follow", "")}
        ${photos.length ? `<div class="post-grid">${photos.map((p) => photoCard(p, authors.get(p.author_id))).join("")}</div>`
          : `<div class="empty-card card">${emptyState("image", "No photos yet", noFollows ? "Follow people to see their photos here." : "When people you follow share photos, they'll show up here.")}</div>`}
      </section>
      <section class="clips-sec" data-kind="clips">
        ${sectionHead("clips", "Clips", "Short vertical videos", "#/clips", "cyan")}
        ${clips.length ? `<div class="clips-track">${clips.map((p) => clipTile(p, authors.get(p.author_id))).join("")}</div>`
          : `<div class="clips-track ghost">${[0, 1, 2, 3, 4, 5].map((i) => `<div class="clip ghost-tile">${i === 0 ? `<span class="ghost-msg">${I.clips()}<b>No clips yet</b><em>Clips from people you follow land here</em></span>` : ""}</div>`).join("")}</div>`}
      </section>
      <section class="videos-sec" data-kind="videos">
        ${sectionHead("video", "Videos", "Long-form from people you follow", "#/videos", "cyan")}
        ${videos.length ? `<div class="vgrid">${videos.map((p) => videoCard(p, authors.get(p.author_id))).join("")}</div>`
          : `<div class="empty-card card">${emptyState("video", "No videos yet", "Long-form videos from people you follow will appear here.")}</div>`}
      </section>
      <div class="feed-end">
        <img src="assets/logo-rings-sparkles.png" alt="" />
        <b>You're all caught up</b>
        <span>${posts.length ? "That's everything new for now." : "Nothing new yet. Check back soon."}</span>
      </div>`;
  }

  /* ---------- Clips / Videos pages ---------- */
  async function renderKindPage(view, gen, kind) {
    const isClip = kind === "clip";
    const word = isClip ? "clips" : "videos";
    document.title = `${APP_NAME} - ${isClip ? "Clips" : "Videos"}`;
    view.innerHTML = `<div class="page">
      ${sectionHead(isClip ? "clips" : "video", isClip ? "Clips" : "Videos", isClip ? "Short vertical videos from people you follow" : "Long-form videos from people you follow", "", "cyan page-head")}
      <div id="kind-list"><div class="feed-loading"><i class="spin"></i></div></div></div>`;
    let posts = [];
    try { posts = (await api.feed()).filter((p) => p.kind === kind); } catch (e) {
      if (gen === S.gen) $("#kind-list").innerHTML = `<div class="empty-card card">${emptyState("flame", "Couldn't load", esc(friendly(e)))}</div>`;
      return;
    }
    const authors = await authorsFor(posts).catch(() => new Map());
    if (gen !== S.gen) return;
    posts = posts.filter((p) => authors.has(p.author_id));
    $("#kind-list").innerHTML = posts.length
      ? (isClip ? `<div class="clip-grid">${posts.map((p) => clipTile(p, authors.get(p.author_id))).join("")}</div>` : `<div class="vgrid">${posts.map((p) => videoCard(p, authors.get(p.author_id))).join("")}</div>`)
      : `<div class="empty-card card tall">${emptyState(isClip ? "clips" : "video", `No ${word} yet`,
          S.followingIds.size ? `When people you follow post ${word}, you'll find them here.` : `Follow people to see their ${word} here.`,
          `<a href="#/search" class="btn-ghost">${I.search()}Find people</a>`)}</div>`;
  }

  /* ---------- Search ---------- */
  function personRow(p) {
    const self = p.id === S.me.id, following = S.followingIds.has(p.id);
    return `
      <div class="person-row" style="${accVars(p)}">
        <a href="#/u/${esc(p.username)}" class="pr-link">
          <span class="ring-acc">${avatar(p, "md")}</span>
          <span class="pr-meta"><b>${esc(nameOf(p))}</b><span>@${esc(p.username)}${p.pronouns ? ` &middot; ${esc(p.pronouns)}` : ""}</span></span>
        </a>
        ${self ? `<span class="you-tag">You</span>` : `<button class="btn-follow sm ${following ? "on" : ""}" data-follow="${esc(p.id)}">${following ? "Following" : "Follow"}</button>`}
      </div>`;
  }

  function renderSearch(view, q) {
    document.title = `${APP_NAME} - Search`;
    const tbs = $("#tb-search");
    const initial = q || (tbs && tbs.value) || "";
    view.innerHTML = `
      <div class="page search-page">
        <h1 class="page-title">Search</h1>
        <label class="search-bar">
          ${I.search()}
          <input type="search" id="search-input" placeholder="Search by name or @username" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="search" value="${esc(initial)}" />
        </label>
        <div id="search-results" class="results"></div>
      </div>`;
    const input = $("#search-input");
    input.addEventListener("input", () => { if (tbs) tbs.value = input.value; runSearch(input.value); });
    if (document.activeElement !== tbs && !matchMedia("(pointer: coarse)").matches && innerWidth < 1024) input.focus();
    runSearch(initial);
  }

  let searchSeq = 0;
  const runSearch = debounce(async (raw) => {
    const box = $("#search-results");
    if (!box) return;
    const q = String(raw || "").trim().replace(/^@/, "");
    const seq = ++searchSeq;
    if (!box.innerHTML) box.innerHTML = `<div class="feed-loading"><i class="spin"></i></div>`;
    try {
      if (!q) {
        const list = await api.suggested(20);
        if (seq !== searchSeq) return;
        box.innerHTML = list.length ? `<p class="results-title">People on Loop</p>` + list.map(personRow).join("")
          : `<div class="empty-card card">${emptyState("users", "No one else here yet", "Loop is brand new. Invite friends to join you.", `<button class="btn-ghost" data-act="invite">${I.share()}Copy invite link</button>`)}</div>`;
        return;
      }
      const list = await api.search(q);
      if (seq !== searchSeq) return;
      box.innerHTML = list.length ? `<p class="results-title">${list.length} ${list.length === 1 ? "person" : "people"}</p>` + list.map(personRow).join("")
        : `<div class="empty-card card">${emptyState("search", "No matches", `No one matches "${esc(q)}". Check the spelling or try their @username.`)}</div>`;
    } catch (e) {
      if (seq === searchSeq) box.innerHTML = `<div class="empty-card card">${emptyState("flame", "Search isn't working", esc(friendly(e)))}</div>`;
    }
  }, 220);

  /* ---------- Profile ---------- */
  async function renderProfile(view, gen, username) {
    const own = username === S.me.username;
    view.innerHTML = `<div class="feed-loading page-pad"><i class="spin"></i></div>`;
    let p;
    try { p = own ? S.me : await api.profileByUsername(username); } catch (e) {
      if (gen === S.gen) view.innerHTML = `<div class="page"><div class="empty-card card tall">${emptyState("flame", "Couldn't load profile", esc(friendly(e)))}</div></div>`;
      return;
    }
    if (gen !== S.gen) return;
    if (!p || (!p.onboarded && !own)) {
      document.title = `${APP_NAME} - Not found`;
      view.innerHTML = `<div class="page"><div class="empty-card card tall">${emptyState("user", "Profile not found", `No one on Loop goes by @${esc(username)}.`, `<a href="#/search" class="btn-ghost">${I.search()}Search people</a>`)}</div></div>`;
      return;
    }
    document.title = `${nameOf(p)} (@${p.username}) - ${APP_NAME}`;
    const following = S.followingIds.has(p.id);
    const hasBanner = safeImg(p.banner_url);
    view.innerHTML = `
      <div class="profile" style="${accVars(p)}" data-uid="${esc(p.id)}">
        <div class="pf-banner ${hasBanner ? "has" : ""}">${hasBanner ? `<img src="${esc(p.banner_url)}" alt="" />` : `<span class="banner-fallback"></span>`}</div>
        <div class="pf-head">
          <span class="pf-avatar ring-acc">${avatar(p, "xl")}</span>
          <div class="pf-actions">
            ${own ? `<a href="#/edit" class="btn-ghost">${I.edit()}Edit profile</a>
                     <button class="icon-btn boxed" data-act="settings" aria-label="Settings">${I.settings()}</button>`
                  : `<button class="btn-follow lg ${following ? "on" : ""}" data-follow="${esc(p.id)}">${following ? "Following" : "Follow"}</button>`}
            <button class="icon-btn boxed" data-act="share" data-username="${esc(p.username)}" aria-label="Share profile">${I.share()}</button>
          </div>
        </div>
        <div class="pf-info">
          <h1>${esc(nameOf(p))}</h1>
          <p class="pf-handle"><span>@${esc(p.username)}</span>${p.pronouns ? `<span class="dot-sep"></span><span>${esc(p.pronouns)}</span>` : ""}</p>
          ${p.bio ? `<p class="pf-bio">${esc(p.bio)}</p>` : own ? `<p class="pf-bio muted"><a href="#/edit" class="linkish">Add a bio</a> so people know who you are.</p>` : ""}
          <div class="pf-facts">
            ${safeHref(p.website) ? `<a href="${esc(p.website)}" target="_blank" rel="noopener noreferrer nofollow ugc" class="pf-link">${I.link()}<span>${esc(linkLabel(p.website))}</span></a>` : ""}
            <span>${I.calendar()}${esc(joined(p.created_at))}</span>
          </div>
          ${(p.interests || []).length ? `<div class="pf-interests">${p.interests.map((t) => `<span>${esc(t)}</span>`).join("")}</div>` : ""}
          <div class="pf-stats">
            <div><b id="st-posts">-</b><span>Posts</span></div>
            <div><b id="st-followers">-</b><span>Followers</span></div>
            <div><b id="st-following">-</b><span>Following</span></div>
          </div>
        </div>
        <div class="pf-tabs" role="tablist">
          <button class="on" data-ptab="photo" role="tab">${I.grid()}Posts</button>
          <button data-ptab="clip" role="tab">${I.clips()}Clips</button>
          <button data-ptab="video" role="tab">${I.video()}Videos</button>
        </div>
        <div class="pf-content" id="pf-content"></div>
      </div>`;
    const loadTab = async (kind) => {
      const box = $("#pf-content");
      box.innerHTML = `<div class="feed-loading"><i class="spin"></i></div>`;
      let posts = [];
      try { posts = await api.postsBy(p.id, kind); } catch (e) { if (gen === S.gen) box.innerHTML = emptyState("flame", "Couldn't load", esc(friendly(e))); return; }
      if (gen !== S.gen) return;
      const word = { photo: "photos", clip: "clips", video: "videos" }[kind];
      const icon = { photo: "image", clip: "clips", video: "video" }[kind];
      if (!posts.length) {
        box.innerHTML = emptyState(icon, own ? `Share your first ${kind}` : `No ${word} yet`,
          own ? `Your ${word} will live here. Posting arrives soon.` : `When @${esc(p.username)} posts ${word}, they'll show up here.`);
        return;
      }
      box.innerHTML = kind === "photo"
        ? `<div class="pf-grid">${posts.map((x) => `<span class="pf-tile">${safeImg(x.thumb_url || x.media_url) ? `<img src="${esc(x.thumb_url || x.media_url)}" alt="" loading="lazy" />` : ""}</span>`).join("")}</div>`
        : kind === "clip" ? `<div class="clip-grid">${posts.map((x) => clipTile(x, p)).join("")}</div>`
        : `<div class="vgrid">${posts.map((x) => videoCard(x, p)).join("")}</div>`;
    };
    $$("[data-ptab]", view).forEach((b) => b.addEventListener("click", () => {
      $$("[data-ptab]", view).forEach((x) => x.classList.toggle("on", x === b)); loadTab(b.dataset.ptab);
    }));
    loadTab("photo");
    refreshCounts(p.id, gen);
  }

  async function refreshCounts(uid, gen) {
    try {
      const c = await api.counts(uid);
      if (gen != null && gen !== S.gen) return;
      const set = (id, n) => { const el = $("#" + id); if (el) el.textContent = fmtCount(n); };
      set("st-posts", c.posts); set("st-followers", c.followers); set("st-following", c.following);
    } catch (e) { /* leave dashes */ }
  }

  /* ---------- Edit profile ---------- */
  let ed = null;
  function renderEdit(view) {
    document.title = `${APP_NAME} - Edit profile`;
    const me = S.me;
    ed = { d: { display_name: me.display_name || "", pronouns: me.pronouns || "", bio: me.bio || "", website: me.website || "", accent: me.accent || "lime", interests: [...(me.interests || [])] },
      avatar: null, banner: null, removeAvatar: false, removeBanner: false, saving: false };
    view.innerHTML = `
      <form class="page edit-page" id="edit-form" novalidate>
        <div class="edit-top">
          <a href="#/u/${esc(me.username)}" class="icon-btn ghost" aria-label="Cancel">${I.back()}</a>
          <h1 class="page-title">Edit profile</h1>
          <button type="submit" class="btn-primary sm">Save</button>
        </div>
        <div id="ed-media" class="ed-media"></div>
        <div class="edit-fields card">
          <div class="field">
            <label for="ed-name">Display name ${counter("ed-name-count", ed.d.display_name.length, LIMITS.name)}</label>
            <div class="input-wrap"><input id="ed-name" type="text" maxlength="${LIMITS.name}" value="${esc(ed.d.display_name)}" required /></div>
          </div>
          <div class="field">
            <label>Username</label>
            <div class="input-wrap prefix readonly"><span class="input-prefix">@</span><input type="text" value="${esc(me.username)}" readonly tabindex="-1" aria-readonly="true" /><span class="input-status">${I.lock()}</span></div>
            <p class="hint">Your username is how you log in, so it can't be changed.</p>
          </div>
          <div class="field">
            <label for="ed-pronouns">Pronouns <em>optional</em></label>
            <div class="input-wrap"><input id="ed-pronouns" type="text" maxlength="${LIMITS.pronouns}" autocapitalize="none" placeholder="e.g. they/them" value="${esc(ed.d.pronouns)}" /></div>
            <div class="mini-chips">${PRONOUNS.map((x) => `<button type="button" class="mini-chip ${ed.d.pronouns === x ? "on" : ""}" data-pronoun="${x}">${x}</button>`).join("")}</div>
          </div>
          <div class="field">
            <label for="ed-bio">Bio <em>optional</em> ${counter("ed-bio-count", ed.d.bio.length, LIMITS.bio)}</label>
            <div class="input-wrap area"><textarea id="ed-bio" rows="4" maxlength="${LIMITS.bio}" placeholder="Tell people a little about you">${esc(ed.d.bio)}</textarea></div>
          </div>
          <div class="field">
            <label for="ed-web">Website <em>optional</em></label>
            <div class="input-wrap prefix"><span class="input-prefix">${I.link()}</span><input id="ed-web" type="url" inputmode="url" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="${LIMITS.website}" placeholder="yoursite.com" value="${esc(linkLabel(ed.d.website))}" /></div>
          </div>
        </div>
        <div class="edit-fields card">
          <div class="field"><label>Accent colour</label><div id="ed-accent">${accentPicker(ed.d.accent)}</div></div>
        </div>
        <div class="edit-fields card">
          <div class="field"><label>Interests</label><div id="ed-interests">${interestPicker(ed.d.interests)}</div></div>
        </div>
        <p class="form-error" id="ed-error" role="alert"></p>
        <button type="submit" class="btn-primary block">Save changes</button>
        <button type="button" class="btn-ghost block danger" data-act="logout">${I.logout()}Log out</button>
      </form>`;
    const media = $("#ed-media");
    const rr = () => { media.innerHTML = mediaEditor(ed, me, { removable: true }); bindMediaEditor(media, ed, rr); };
    rr();
    const d = ed.d;
    $("#ed-name").addEventListener("input", (e) => { d.display_name = e.target.value; $("#ed-name-count").outerHTML = counter("ed-name-count", d.display_name.length, LIMITS.name); });
    const pr = $("#ed-pronouns");
    pr.addEventListener("input", () => { d.pronouns = pr.value; $$(".mini-chip", view).forEach((c) => c.classList.toggle("on", c.dataset.pronoun === pr.value)); });
    $$(".mini-chip", view).forEach((c) => c.addEventListener("click", () => { pr.value = pr.value === c.dataset.pronoun ? "" : c.dataset.pronoun; pr.dispatchEvent(new Event("input")); }));
    $("#ed-bio").addEventListener("input", (e) => { d.bio = e.target.value; $("#ed-bio-count").outerHTML = counter("ed-bio-count", d.bio.length, LIMITS.bio); });
    $("#ed-web").addEventListener("input", (e) => { d.website = e.target.value; });
    $("#ed-accent").addEventListener("click", (e) => {
      const s = e.target.closest("[data-accent]"); if (!s) return;
      d.accent = s.dataset.accent; $("#ed-accent").innerHTML = accentPicker(d.accent); rr();
    });
    $("#ed-interests").addEventListener("click", (e) => {
      const c = e.target.closest("[data-interest]"); if (!c) return;
      const t = c.dataset.interest, i = d.interests.indexOf(t);
      if (i >= 0) d.interests.splice(i, 1); else d.interests.push(t);
      $("#ed-interests").innerHTML = interestPicker(d.interests);
    });
    $("#edit-form").addEventListener("submit", saveEdit);
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!ed || ed.saving) return;
    const err = $("#ed-error");
    err.textContent = "";
    if (!ed.d.display_name.trim()) { err.textContent = "Display name can't be empty."; $("#ed-name").focus(); return; }
    const prob = validateAbout(ed.d);
    if (prob) { err.textContent = prob; $("#ed-web").focus(); return; }
    ed.saving = true;
    const btns = $$('#edit-form [type="submit"]');
    btns.forEach((b) => { b.disabled = true; b.classList.add("loading"); });
    try {
      const patch = profilePatch(ed.d);
      if (ed.avatar) patch.avatar_url = await api.uploadImage("avatars", ed.avatar.blob);
      else if (ed.removeAvatar) patch.avatar_url = null;
      if (ed.banner) patch.banner_url = await api.uploadImage("banners", ed.banner.blob);
      else if (ed.removeBanner) patch.banner_url = null;
      S.me = await api.updateProfile(patch);
      ed = null;
      renderShell();
      location.hash = "#/u/" + encodeURIComponent(S.me.username);
      toast("Profile saved");
    } catch (ex) {
      ed.saving = false;
      err.textContent = friendly(ex);
      btns.forEach((b) => { b.disabled = false; b.classList.remove("loading"); });
    }
  }

  /* =========================================================
     Global actions
     ========================================================= */
  async function logout() {
    closeSheet();
    await api.signOut();
    S.session = null; S.me = null; S.followingIds = new Set();
    history.replaceState(null, "", location.pathname);
    auth.mode = "login";
    renderAuth();
  }

  document.addEventListener("click", async (e) => {
    const act = e.target.closest("[data-act]");
    if (act) {
      const a = act.dataset.act;
      if (a === "create") { e.preventDefault(); openCreateSheet(); }
      else if (a === "settings") { e.preventDefault(); openSettingsSheet(); }
      else if (a === "logout") { e.preventDefault(); logout(); }
      else if (a === "reload") route();
      else if (a === "invite") copyLink(siteUrl(), "Invite link copied");
      else if (a === "share") copyLink(profileUrl(act.dataset.username), "Profile link copied");
      else if (a === "share-profile") { closeSheet(); copyLink(profileUrl(S.me.username), "Profile link copied"); }
    }
    const chip = e.target.closest(".chips [data-filter]");
    if (chip) {
      S.filter = chip.dataset.filter;
      $$(".chips [data-filter]").forEach((c) => c.classList.toggle("active", c === chip));
      const feed = $("#feed"); if (feed) feed.dataset.filter = S.filter;
    }
    const fb = e.target.closest("[data-follow]");
    if (fb && !fb.disabled && S.me) {
      e.preventDefault();
      const id = fb.dataset.follow;
      const was = S.followingIds.has(id);
      const all = $$(`[data-follow="${CSS.escape(id)}"]`);
      all.forEach((b) => { b.disabled = true; });
      try {
        if (was) await api.unfollow(id); else await api.follow(id);
        all.forEach((b) => { b.classList.toggle("on", !was); b.textContent = was ? "Follow" : "Following"; });
        const prof = $(".profile[data-uid]");
        if (prof) refreshCounts(prof.dataset.uid);
        renderSideFollowing();
      } catch (ex) { toast(friendly(ex), "bad"); }
      all.forEach((b) => { b.disabled = false; });
    }
  });

  /* =========================================================
     Boot
     ========================================================= */
  async function boot() {
    // ?u=username deep links become #/u/username
    const params = new URLSearchParams(location.search);
    const u = params.get("u");
    if (u) {
      params.delete("u");
      const qs = params.toString();
      history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + "#/u/" + encodeURIComponent(u.toLowerCase().replace(/^@/, "")));
    }
    if (!configured() || !window.supabase) return renderAuth();
    let sb;
    try { sb = client(); } catch (e) { return renderAuth(); }
    sb.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        if (S.me) { S.session = null; S.me = null; S.followingIds = new Set(); auth.mode = "login"; renderAuth(); }
      } else if (session) S.session = session;
    });
    try {
      const { data } = await sb.auth.getSession();
      S.session = data && data.session;
    } catch (e) { S.session = null; }
    if (!S.session) return renderAuth();
    afterSignIn(false);
  }

  boot();
})();
