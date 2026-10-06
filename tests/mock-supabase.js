/* Test-only fake of the parts of supabase-js v2 that Loop uses.
   NOT loaded by the site: tests/shoot.js serves this file in place of the
   jsDelivr supabase-js URL via Playwright route interception.
   State lives in localStorage so reloads keep the session (like persistSession). */
(function () {
  "use strict";
  const DB_KEY = "loop-mock-db", SESSION_KEY = "loop-mock-session", SEED_KEY = "loop-mock-seed";
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : "id-" + Math.random().toString(16).slice(2));
  const load = () => { try { return JSON.parse(localStorage.getItem(DB_KEY)) || null; } catch (e) { return null; } };
  const blank = () => ({ users: [], profiles: [], follows: [], posts: [] });
  let db = load() || blank();
  const save = () => localStorage.setItem(DB_KEY, JSON.stringify(db));
  const USER_RE = /^(?!\.)(?!.*\.\.)(?!.*\.$)[a-z0-9._]{3,20}$/;

  function newProfile(id, username, extra) {
    const now = new Date().toISOString();
    return Object.assign({ id, username, display_name: null, bio: null, pronouns: null, website: null, avatar_url: null, banner_url: null,
      accent: "lime", interests: [], onboarded: false, created_at: now, updated_at: now }, extra || {});
  }
  function makeSession(u) {
    return { access_token: "mock-" + u.id, token_type: "bearer", expires_in: 3600, user: { id: u.id, email: u.email, user_metadata: { username: u.username } } };
  }

  // Seed once per seed id (set by the test with addInitScript)
  const seed = window.__LOOP_MOCK_SEED;
  if (seed && localStorage.getItem(SEED_KEY) !== seed.id) {
    db = blank();
    (seed.users || []).forEach((s) => {
      const id = s.id || uuid();
      db.users.push({ id, email: s.username + "@loop.local", password: s.password || "password123", username: s.username });
      db.profiles.push(newProfile(id, s.username, s.profile));
    });
    const idOf = (u) => (db.profiles.find((p) => p.username === u) || {}).id;
    (seed.follows || []).forEach(([a, b]) => db.follows.push({ follower_id: idOf(a), following_id: idOf(b), created_at: new Date().toISOString() }));
    save();
    localStorage.setItem(SEED_KEY, seed.id);
    if (seed.session) {
      const u = db.users.find((x) => x.username === seed.session);
      localStorage.setItem(SESSION_KEY, JSON.stringify(makeSession(u)));
    } else localStorage.removeItem(SESSION_KEY);
  }

  const getSession = () => { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; } };
  const uid = () => (getSession() || { user: {} }).user.id || null;
  const err = (message, code) => ({ data: null, error: { message, code } });

  class Query {
    constructor(table) { this.t = table; this.op = "select"; this.f = []; this.opts = {}; this.ord = null; this.lim = null; this.sg = null; this.ret = false; }
    select(cols, opts) { if (this.op === "select") this.opts = opts || {}; else this.ret = true; return this; }
    insert(rows) { this.op = "insert"; this.rows = Array.isArray(rows) ? rows : [rows]; return this; }
    update(patch) { this.op = "update"; this.patch = patch; return this; }
    delete() { this.op = "delete"; return this; }
    eq(c, v) { this.f.push((r) => r[c] === v); return this; }
    neq(c, v) { this.f.push((r) => r[c] !== v); return this; }
    in(c, arr) { this.f.push((r) => arr.includes(r[c])); return this; }
    order(c, o) { this.ord = [c, !o || o.ascending !== false]; return this; }
    limit(n) { this.lim = n; return this; }
    maybeSingle() { this.sg = "maybe"; return this; }
    single() { this.sg = "one"; return this; }
    then(res, rej) { return this.run().then(res, rej); }
    async run() {
      await delay(40);
      db = load() || db;
      const rows = db[this.t];
      if (!rows) return err(`Could not find the table 'public.${this.t}' in the schema cache`, "PGRST205");
      const me = uid();
      const match = (r) => this.f.every((fn) => fn(r));
      let out;
      if (this.op === "select") {
        out = rows.filter(match);
        if (this.ord) { const [c, asc] = this.ord; out.sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (asc ? 1 : -1)); }
        if (this.lim != null) out = out.slice(0, this.lim);
        if (this.opts.head) return { data: null, count: rows.filter(match).length, error: null };
      } else if (this.op === "insert") {
        if (!me) return err("new row violates row-level security policy", "42501");
        out = [];
        for (const r of this.rows) {
          if (this.t === "follows") {
            if (r.follower_id !== me) return err("new row violates row-level security policy", "42501");
            if (r.follower_id === r.following_id) return err('violates check constraint "follows_no_self"', "23514");
            if (rows.some((x) => x.follower_id === r.follower_id && x.following_id === r.following_id)) return err("duplicate key value", "23505");
            out.push(Object.assign({ created_at: new Date().toISOString() }, r));
          } else if (this.t === "profiles") {
            if (r.id !== me) return err("new row violates row-level security policy", "42501");
            out.push(newProfile(r.id, r.username, r));
          } else out.push(Object.assign({ id: uuid(), created_at: new Date().toISOString() }, r));
        }
        rows.push(...out); save();
      } else if (this.op === "update") {
        out = rows.filter(match).filter((r) => this.t !== "profiles" || r.id === me);
        const p = Object.assign({}, this.patch); delete p.id; delete p.username; delete p.created_at;
        if (this.t === "profiles") {
          if (p.bio && p.bio.length > 150) return err('violates check constraint "profiles_bio_check"', "23514");
          if (p.website && !/^https?:\/\/\S+$/i.test(p.website)) return err('violates check constraint "profiles_website_check"', "23514");
        }
        out.forEach((r) => Object.assign(r, p, { updated_at: new Date().toISOString() })); save();
      } else if (this.op === "delete") {
        const keep = rows.filter((r) => !(match(r) && (this.t !== "follows" || r.follower_id === me)));
        out = rows.filter((r) => !keep.includes(r));
        db[this.t] = keep; save();
      }
      if (this.op !== "select" && !this.ret && !this.sg) return { data: null, error: null };
      if (this.sg === "one") return out.length === 1 ? { data: out[0], error: null } : err("JSON object requested, multiple (or no) rows returned", "PGRST116");
      if (this.sg === "maybe") return { data: out[0] || null, error: null };
      return { data: out, error: null, count: null };
    }
  }

  function createClient(url) {
    const listeners = [];
    const emit = (ev, s) => listeners.forEach((cb) => { try { cb(ev, s); } catch (e) {} });
    return {
      from: (t) => new Query(t),
      async rpc(name, args) {
        await delay(120);
        db = load() || db;
        if (name === "username_available") {
          const v = String(args.p_username || "").trim().toLowerCase();
          return { data: USER_RE.test(v) && !db.profiles.some((p) => p.username === v) && !db.users.some((u) => u.email === v + "@loop.local"), error: null };
        }
        if (name === "search_profiles") {
          const q = String(args.p_query || "").trim().toLowerCase();
          const list = q ? db.profiles.filter((p) => p.onboarded && (p.username.includes(q) || (p.display_name || "").toLowerCase().includes(q))) : [];
          return { data: list.slice(0, args.p_limit || 20), error: null };
        }
        return err(`Could not find the function public.${name}`, "PGRST202");
      },
      auth: {
        async getSession() { return { data: { session: getSession() }, error: null }; },
        async getUser() { const s = getSession(); return { data: { user: s && s.user }, error: null }; },
        onAuthStateChange(cb) { listeners.push(cb); setTimeout(() => cb("INITIAL_SESSION", getSession()), 0); return { data: { subscription: { unsubscribe() {} } } }; },
        async signUp({ email, password, options }) {
          await delay(250);
          db = load() || db;
          email = email.toLowerCase();
          if (db.users.some((u) => u.email === email)) return err("User already registered", "user_already_exists");
          if ((password || "").length < 6) return err("Password should be at least 6 characters.", "weak_password");
          const username = email.split("@")[0];
          if (!USER_RE.test(username)) return err("Database error saving new user", "unexpected_failure");
          const u = { id: uuid(), email, password, username };
          db.users.push(u); db.profiles.push(newProfile(u.id, username)); save();
          const s = makeSession(u);
          localStorage.setItem(SESSION_KEY, JSON.stringify(s));
          emit("SIGNED_IN", s);
          return { data: { user: s.user, session: s }, error: null };
        },
        async signInWithPassword({ email, password }) {
          await delay(250);
          db = load() || db;
          const u = db.users.find((x) => x.email === email.toLowerCase() && x.password === password);
          if (!u) return err("Invalid login credentials", "invalid_credentials");
          const s = makeSession(u);
          localStorage.setItem(SESSION_KEY, JSON.stringify(s));
          emit("SIGNED_IN", s);
          return { data: { user: s.user, session: s }, error: null };
        },
        async signOut() { localStorage.removeItem(SESSION_KEY); emit("SIGNED_OUT", null); return { error: null }; },
      },
      storage: {
        from(bucket) {
          return {
            async upload(path, blob, opts) {
              if (!uid() || path.split("/")[0] !== uid()) return err("new row violates row-level security policy", "42501");
              const r = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, { method: "POST", body: blob, headers: { "content-type": (opts && opts.contentType) || blob.type } });
              if (!r.ok) return err("upload failed", String(r.status));
              return { data: { path }, error: null };
            },
            getPublicUrl(path) { return { data: { publicUrl: `${url}/storage/v1/object/public/${bucket}/${path}` } }; },
          };
        },
      },
    };
  }
  window.supabase = { createClient };
})();
