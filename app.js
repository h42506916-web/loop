/* =========================================================
   App name — change it here and it updates everywhere.
   ========================================================= */
const APP_NAME = "Loop";

/* ---------- Icons (inline SVG, 24px grid, stroke-based) ---------- */
const svg = (body, { fill = "none", sw = 2, cls = "" } = {}) =>
  `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const I = {
  home: (o) => svg('<path d="M3 10.2 12 3l9 7.2V19a2 2 0 0 1-2 2h-4v-6.5H9V21H5a2 2 0 0 1-2-2z"/>', o),
  search: (o) => svg('<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.2-4.2"/>', o),
  plus: (o) => svg('<path d="M12 5v14M5 12h14"/>', o),
  clips: (o) => svg('<rect x="5" y="2.5" width="14" height="19" rx="4"/><path d="M10.2 9.2v5.6l4.6-2.8z" fill="currentColor"/>', o),
  user: (o) => svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c.6-3.8 3.9-6 8-6s7.4 2.2 8 6"/>', o),
  bell: (o) => svg('<path d="M6 8.5a6 6 0 0 1 12 0c0 6.5 2.5 8.5 2.5 8.5h-17S6 15 6 8.5"/><path d="M10.2 20.5a2 2 0 0 0 3.6 0"/>', o),
  send: (o) => svg('<path d="M21.5 2.5 14.8 21l-3.6-8.2L3 9.2z"/><path d="M21.5 2.5 11.2 12.8"/>', o),
  chat: (o) => svg('<path d="M20.5 11.6a8.4 8.4 0 0 1-12.3 7.4L3.5 20.5l1.5-4.6A8.4 8.4 0 1 1 20.5 11.6z"/>', o),
  heart: (o) => svg('<path d="M12 20.5s-8.5-5-8.5-11.1A4.9 4.9 0 0 1 12 6.3a4.9 4.9 0 0 1 8.5 3.1c0 6.1-8.5 11.1-8.5 11.1z"/>', o),
  bookmark: (o) => svg('<path d="M18.5 21 12 16.8 5.5 21V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2z"/>', o),
  more: (o) => svg('<circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/>', o),
  play: (o) => svg('<path d="M7.5 4.8v14.4c0 .8.9 1.3 1.6.8l10.8-7.2a1 1 0 0 0 0-1.6L9.1 4c-.7-.5-1.6 0-1.6.8z" fill="currentColor" stroke="none"/>', o),
  compass: (o) => svg('<circle cx="12" cy="12" r="9.5"/><path d="m15.8 8.2-2.1 5.5-5.5 2.1 2.1-5.5z"/>', o),
  video: (o) => svg('<rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="M10.3 9.4v5.2l4.4-2.6z" fill="currentColor"/>', o),
  image: (o) => svg('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="9" cy="9" r="1.8"/><path d="m20.5 15-4.8-4.8L5 21"/>', o),
  users: (o) => svg('<path d="M16 20.5v-1.6a4 4 0 0 0-4-4H6.5a4 4 0 0 0-4 4v1.6"/><circle cx="9.2" cy="7.5" r="3.8"/><path d="M21.5 20.5v-1.6a4 4 0 0 0-3-3.9M15.8 3.8a3.8 3.8 0 0 1 0 7.4"/>', o),
  radio: (o) => svg('<circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19.1 4.9a10 10 0 0 1 0 14.2M4.9 19.1a10 10 0 0 1 0-14.2"/>', o),
  music: (o) => svg('<path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>', o),
  chevron: (o) => svg('<path d="m9 18 6-6-6-6"/>', o),
  eye: (o) => svg('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', o),
  settings: (o) => svg('<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>', o),
  sparkle: (o) => svg('<path d="M12 2.5c.6 4.6 2.9 6.9 7.5 7.5-4.6.6-6.9 2.9-7.5 7.5-.6-4.6-2.9-6.9-7.5-7.5 4.6-.6 6.9-2.9 7.5-7.5z" fill="currentColor" stroke="none"/><path d="M19 15.5c.25 1.9 1.1 2.75 3 3-1.9.25-2.75 1.1-3 3-.25-1.9-1.1-2.75-3-3 1.9-.25 2.75-1.1 3-3z" fill="currentColor" stroke="none"/>', o),
  flame: (o) => svg('<path d="M12 21.5c-4 0-7-2.7-7-6.6 0-3.4 2.3-5.4 3.8-7.6.4 1.6 1.3 2.6 2.2 3 0-3.3 1.5-6.2 4-7.8-.2 2.6.9 4.4 2.4 6 1.5 1.6 2.6 3.4 2.6 6.4 0 3.9-3 6.6-8 6.6z"/>', o),
  verified: () => `<svg class="verified" viewBox="0 0 24 24" aria-label="Verified"><path fill="currentColor" d="M12 1.8l2.6 1.9 3.2-.1 1 3 2.6 1.9-1 3.1 1 3.1-2.6 1.9-1 3-3.2-.1L12 22.2l-2.6-1.9-3.2.1-1-3-2.6-1.9 1-3.1-1-3.1 2.6-1.9 1-3 3.2.1z"/><path d="m8.2 12.3 2.5 2.5 5-5.2" fill="none" stroke="#04140f" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

/* ---------- Data (fake but plausible) ---------- */
const av = (n) => `assets/img/av-${n}.jpg`;
const U = {
  me:      { name: "harvey",         display: "Harvey",          avatar: av(20) },
  mira:    { name: "mira.koh",       display: "Mira Koh",        avatar: av(1),  verified: true },
  solenne: { name: "solenne.wav",    display: "Solenne",         avatar: av(2) },
  kai:     { name: "kai.drifts",     display: "Kai Mercer",      avatar: av(3),  verified: true },
  noor:    { name: "noor.frames",    display: "Noor Haddad",     avatar: av(4),  verified: true },
  juno:    { name: "juno.shoots",    display: "Juno Park",       avatar: av(5) },
  ari:     { name: "ari.reads",      display: "Ari Lindqvist",   avatar: av(6) },
  lex:     { name: "lex.riffs",      display: "Lex Okafor",      avatar: av(7),  verified: true },
  elodie:  { name: "elodie.v",       display: "Élodie Vasseur",  avatar: av(8) },
  tara:    { name: "tara.outdoors",  display: "Tara Quinn",      avatar: av(9),  verified: true },
  wren:    { name: "wren.fields",    display: "Wren",            avatar: av(10) },
  biscuit: { name: "biscuit.the.lab",display: "Biscuit 🐾",       avatar: av(11) },
  pug:     { name: "pugsley.daily",  display: "Pugsley",         avatar: av(12) },
  wild:    { name: "wildlens.co",    display: "WildLens",        avatar: av(13), verified: true },
  husky:   { name: "husky.hq",       display: "Husky HQ",        avatar: av(14) },
  bear:    { name: "bearcountry",    display: "Bear Country",    avatar: av(15), verified: true },
  trail:   { name: "trailmix.tv",    display: "Trailmix",        avatar: av(16), verified: true },
  street:  { name: "street.sage",    display: "Street Sage",     avatar: av(17) },
  night:   { name: "nightowl.dev",   display: "Night Owl",       avatar: av(19) },
  golden:  { name: "golden.hour",    display: "Golden Hour",     avatar: av(20), verified: true },
};

const stories = [
  { u: U.me, you: true },
  { u: U.mira, live: true },
  { u: U.solenne }, { u: U.kai }, { u: U.noor }, { u: U.juno }, { u: U.lex },
  { u: U.elodie }, { u: U.tara }, { u: U.wren },
  { u: U.pug, seen: true }, { u: U.husky, seen: true }, { u: U.biscuit, seen: true },
];

const chips = [
  { label: "All", icon: "sparkle", active: true, filter: "all" },
  { label: "Photos", icon: "image", filter: "photos" },
  { label: "Clips", icon: "clips", filter: "clips" },
  { label: "Videos", icon: "video", filter: "videos" },
  { label: "Following", icon: "users", filter: "all" },
  { label: "Live", icon: "radio", filter: "all", live: true },
  { label: "Travel" }, { label: "Music" }, { label: "Food" }, { label: "Outdoors" }, { label: "Gaming" }, { label: "Art" },
];

const posts = [
  { u: U.kai, img: "assets/img/post-1.jpg", place: "Preikestolen, Norway", time: "2h", likes: "12,480", comments: 248, liked: true, carousel: 4,
    caption: "Woke up at 4am for this. Worth every single minute. 🌄", tags: ["norway", "fjords", "goldenhour"], likedBy: [U.mira, U.noor, U.tara] },
  { u: U.wild, img: "assets/img/post-2.jpg", place: "Monterey Bay Aquarium", time: "5h", likes: "48,902", comments: "1.1K",
    caption: "Neon in the deep 🪼 100mm macro, zero color edits.", tags: ["ocean", "macro"], likedBy: [U.kai, U.juno, U.elodie] },
  { u: U.noor, img: "assets/img/post-3.jpg", place: "Page, Arizona", time: "8h", likes: "9,214", comments: 132, carousel: 6,
    caption: "Light leaks, but make it geology.", tags: ["antelopecanyon", "roadtrip"], likedBy: [U.solenne, U.trail, U.lex] },
  { u: U.tara, img: "assets/img/post-5.jpg", place: "Dolomites, Italy", time: "1d", likes: "21,306", comments: 410,
    caption: "First snow on the ridge. The silence up here is unreal ❄️", tags: ["dolomites", "hiking"], likedBy: [U.kai, U.wren, U.mira] },
  { u: U.elodie, img: "assets/img/post-6.jpg", place: "Café Lumen, Melbourne", time: "1d", likes: "5,640", comments: 87, liked: true,
    caption: "first flat white of the week ☕ who's coming next time?", tags: ["coffee", "melbourne"], likedBy: [U.juno, U.ari, U.noor] },
  { u: U.juno, img: "assets/img/post-4.jpg", place: "Prahran Market", time: "2d", likes: "3,877", comments: 64,
    caption: "Sunday market haul 🍓 shot handheld at f/2.8", tags: ["foodphotography"], likedBy: [U.elodie, U.mira, U.solenne] },
];

const clips = [
  { u: U.tara,   img: "assets/img/clip-1.jpg",  views: "2.4M", caption: "POV: you finally booked the trip 🛶", sound: "original sound · tara.outdoors" },
  { u: U.golden, img: "assets/img/clip-5.jpg",  views: "3.1M", caption: "Above the clouds ☁️ 6-hour timelapse", sound: "Weightless · Marconi Union" },
  { u: U.lex,    img: "assets/img/clip-6.jpg",  views: "5.6M", caption: "Front row energy ⚡ last night was insane", sound: "live · lex.riffs", live: true },
  { u: U.trail,  img: "assets/img/clip-2.jpg",  views: "891K", caption: "Hidden waterfall, 20 min from the road", sound: "Sunrise · Ólafur Arnalds" },
  { u: U.street, img: "assets/img/clip-3.jpg",  views: "1.2M", caption: "Rainy city walk — pure ASMR 🌧️", sound: "original sound · street.sage" },
  { u: U.kai,    img: "assets/img/clip-4.jpg",  views: "640K", caption: "Mirror lake at 6am. No filter.", sound: "Holocene · Bon Iver" },
  { u: U.wild,   img: "assets/img/clip-8.jpg",  views: "1.8M", caption: "Storm watch at the lighthouse 🌊", sound: "original sound · wildlens.co" },
  { u: U.noor,   img: "assets/img/clip-7.jpg",  views: "422K", caption: "Lisbon in 15 seconds", sound: "Saudade · Mariza" },
];

const videos = [
  { u: U.trail,  img: "assets/img/vid-1.jpg",  dur: "24:18", title: "I spent 30 days hiking the Scottish Highlands — here's what nobody tells you", views: "1.2M views", ago: "3 days ago" },
  { u: U.noor,   img: "assets/img/vid-2.jpg",  dur: "12:47", title: "Utah's Hidden Canyons: A Cinematic Road Trip in 4K", views: "864K views", ago: "1 week ago" },
  { u: U.street, img: "assets/img/vid-5.jpg",  live: true, title: "Tokyo vs New York at night — which city never sleeps? 🔴", views: "8.2K watching", ago: "Started 42 min ago" },
  { u: U.kai,    img: "assets/img/vid-3.jpg",  dur: "18:05", title: "How big-wave surfers actually read the ocean", views: "2.3M views", ago: "2 weeks ago" },
  { u: U.juno,   img: "assets/img/vid-4.jpg",  dur: "9:32",  title: "Golden hour photography: 7 tricks the pros won't tell you", views: "412K views", ago: "5 days ago" },
  { u: U.tara,   img: "assets/img/vid-6.jpg",  dur: "32:10", title: "Building a coastal cabin from scratch — Ep. 4: The Roof", views: "1.7M views", ago: "1 month ago", progress: 64 },
  { u: U.golden, img: "assets/img/vid-8.jpg",  dur: "8:46",  title: "Floating over Cappadocia at sunrise 🎈", views: "2.9M views", ago: "3 weeks ago" },
  { u: U.night,  img: "assets/img/vid-7.jpg",  dur: "14:22", title: "My minimalist creator desk setup (2026 edition)", views: "356K views", ago: "2 days ago" },
  { u: U.wild,   img: "assets/img/vid-9.jpg",  dur: "21:03", title: "Chasing storms on the Atlantic coast", views: "701K views", ago: "4 days ago" },
  { u: U.bear,   img: "assets/img/vid-12.jpg", dur: "42:57", title: "Wolves of Yellowstone: a year inside the pack", views: "4.1M views", ago: "2 months ago" },
  { u: U.elodie, img: "assets/img/vid-11.jpg", dur: "16:40", title: "The Great Ocean Road in one day — the complete guide", views: "540K views", ago: "1 week ago" },
  { u: U.solenne,img: "assets/img/vid-10.jpg", dur: "11:15", title: "Macro flowers: shooting the tiny world in your backyard", views: "188K views", ago: "6 days ago", progress: 22 },
];

/* ---------- Templates ---------- */
const name = (u) => `<span class="uname">${u.name}${u.verified ? I.verified() : ""}</span>`;
const wordmark = () => `<a class="brand" href="#" aria-label="${APP_NAME} home"><img class="brand-logo" src="assets/logo-rings.png" alt="" /><span class="wordmark" data-app-name>${APP_NAME}</span></a>`;

function renderSidebar() {
  const nav = [
    ["home", "Home", true], ["compass", "Explore"], ["clips", "Clips"], ["video", "Videos"],
    ["send", "Messages", false, 3], ["bell", "Notifications", false, "dot"], ["bookmark", "Saved"], ["user", "Profile"],
  ];
  const following = [U.lex, U.mira, U.trail, U.wild, U.noor];
  return `
    ${wordmark()}
    <nav class="side-nav">
      ${nav.map(([ic, label, active, badge]) => `
        <a href="#" class="side-link ${active ? "active" : ""}">
          ${I[ic]()}<span>${label}</span>
          ${badge === "dot" ? '<i class="dot"></i>' : badge ? `<b class="badge">${badge}</b>` : ""}
        </a>`).join("")}
    </nav>
    <button class="btn-create">${I.plus({ sw: 2.6 })}<span>Create</span></button>
    <div class="side-section">
      <div class="side-title">Following</div>
      ${following.map((u, i) => `
        <a href="#" class="side-follow">
          <img src="${u.avatar}" alt="" />
          <span class="sf-name">${u.display}</span>
          ${i < 2 ? '<span class="live-pill sm">LIVE</span>' : i < 4 ? '<i class="new-dot"></i>' : ""}
        </a>`).join("")}
      <a href="#" class="side-more">Show all ${I.chevron()}</a>
    </div>
    <div class="side-foot">
      <img src="${U.me.avatar}" alt="" class="me-av" />
      <div class="me-meta"><b>${U.me.display}</b><span>@${U.me.name}</span></div>
      <button class="icon-btn ghost" aria-label="Settings">${I.settings()}</button>
    </div>`;
}

function renderTopbar() {
  return `
    <div class="tb-left">${wordmark()}</div>
    <label class="search">
      ${I.search()}
      <input type="search" placeholder="Search creators, clips, videos…" />
      <kbd>⌘K</kbd>
    </label>
    <div class="tb-right">
      <button class="icon-btn mobile-only" aria-label="Search">${I.search()}</button>
      <button class="icon-btn" aria-label="Notifications">${I.heart()}<i class="dot"></i></button>
      <button class="icon-btn" aria-label="Messages">${I.send()}<b class="badge">3</b></button>
      <button class="btn-upload desktop-only">${I.plus({ sw: 2.6 })}<span>Upload</span></button>
      <img class="tb-avatar desktop-only" src="${U.me.avatar}" alt="Your profile" />
    </div>`;
}

function renderStories() {
  return `<div class="stories-track">${stories.map((s) => `
    <a href="#" class="story ${s.seen ? "seen" : ""} ${s.live ? "is-live" : ""}">
      <span class="ring"><img src="${s.u.avatar}" alt="" /></span>
      ${s.you ? `<span class="add">${I.plus({ sw: 3 })}</span>` : ""}
      ${s.live ? '<span class="live-pill">LIVE</span>' : ""}
      <span class="story-name">${s.you ? "Your story" : s.u.name}</span>
    </a>`).join("")}</div>`;
}

function renderChips() {
  return `<div class="chips-track">${chips.map((c) => `
    <button class="chip ${c.active ? "active" : ""}" data-filter="${c.filter || "all"}">
      ${c.live ? '<i class="live-dot"></i>' : c.icon ? I[c.icon]() : ""}${c.label}
    </button>`).join("")}</div>`;
}

function postCard(p, i) {
  return `
  <article class="post card" data-n="${i}">
    <header class="post-head">
      <img class="av ring-sm" src="${p.u.avatar}" alt="" />
      <div class="post-meta">
        ${name(p.u)}
        <span class="sub">${p.place} · ${p.time}</span>
      </div>
      <button class="follow-btn">Follow</button>
      <button class="icon-btn ghost sm" aria-label="More">${I.more()}</button>
    </header>
    <div class="post-media">
      <img src="${p.img}" alt="" />
      ${p.carousel ? `<span class="pill count">1/${p.carousel}</span>` : ""}
    </div>
    <div class="post-actions">
      <button class="act like ${p.liked ? "on" : ""}" aria-label="Like">${I.heart({ fill: p.liked ? "currentColor" : "none" })}</button>
      <button class="act" aria-label="Comment">${I.chat()}</button>
      <button class="act" aria-label="Share">${I.send()}</button>
      ${p.carousel ? `<div class="dots">${Array.from({ length: Math.min(p.carousel, 5) }, (_, k) => `<i class="${k === 0 ? "on" : ""}"></i>`).join("")}</div>` : '<div class="dots"></div>'}
      <button class="act" aria-label="Save">${I.bookmark()}</button>
    </div>
    <div class="post-body">
      <div class="liked-by">
        <span class="stack">${p.likedBy.map((u) => `<img src="${u.avatar}" alt="" />`).join("")}</span>
        <span>Liked by <b>${p.likedBy[0].name}</b> and <b>${p.likes} others</b></span>
      </div>
      <p class="caption"><b>${p.u.name}</b> ${p.caption} ${p.tags.map((t) => `<a href="#" class="tag">#${t}</a>`).join(" ")}</p>
      <a href="#" class="muted-link">View all ${p.comments} comments</a>
    </div>
  </article>`;
}

function sectionHead(icon, title, sub) {
  return `
    <div class="sec-head">
      <span class="sec-ic">${I[icon]()}</span>
      <div><h2>${title}</h2><p>${sub}</p></div>
      <a href="#" class="see-all">See all ${I.chevron()}</a>
    </div>`;
}

function renderClips() {
  return `
  <section class="clips-sec" data-kind="clips">
    ${sectionHead("clips", "Clips", "Short videos trending right now")}
    <div class="clips-track">
      ${clips.map((c) => `
      <a href="#" class="clip">
        <img src="${c.img}" alt="" />
        <span class="clip-shade"></span>
        <span class="pill views">${I.play()} ${c.views}</span>
        ${c.live ? '<span class="live-pill clip-live">LIVE</span>' : ""}
        <span class="play-btn">${I.play()}</span>
        <span class="clip-info">
          <span class="clip-user"><img src="${c.u.avatar}" alt="" />@${c.u.name}</span>
          <span class="clip-cap">${c.caption}</span>
          <span class="clip-sound">${I.music()}<span>${c.sound}</span></span>
        </span>
      </a>`).join("")}
    </div>
  </section>`;
}

function videoCard(v) {
  return `
  <a href="#" class="vcard">
    <span class="thumb">
      <img src="${v.img}" alt="" />
      ${v.live ? '<span class="live-pill thumb-badge">● LIVE</span>' : `<span class="dur">${v.dur}</span>`}
      ${v.progress ? `<span class="progress"><i style="width:${v.progress}%"></i></span>` : ""}
      <span class="thumb-play">${I.play()}</span>
    </span>
    <span class="vmeta">
      <img class="vav" src="${v.u.avatar}" alt="" />
      <span class="vtext">
        <span class="vtitle">${v.title}</span>
        <span class="vchan">${v.u.display}${v.u.verified ? I.verified() : ""}</span>
        <span class="vstats">${v.views} · ${v.ago}</span>
      </span>
      <span class="vmore">${I.more()}</span>
    </span>
  </a>`;
}

function renderVideos(list, cls, head = ["video", "Videos", "Long-form from creators you follow"]) {
  return `
  <section class="videos-sec ${cls}" data-kind="videos">
    ${sectionHead(...head)}
    <div class="vgrid">${list.map(videoCard).join("")}</div>
  </section>`;
}

function renderFeed() {
  return `
    ${renderClips()}
    <div class="post-group g1" data-kind="photos">${posts.slice(0, 3).map((p, i) => postCard(p, i + 1)).join("")}</div>
    ${renderVideos(videos.slice(0, 8), "v1")}
    <div class="post-group g2" data-kind="photos">${posts.slice(3, 6).map((p, i) => postCard(p, i + 1)).join("")}</div>
    ${renderVideos(videos.slice(8, 12), "v2", ["flame", "Trending", "Most watched this week"])}
    <div class="feed-end">
      <img src="assets/logo-rings-sparkles.png" alt="" />
      <b>You're all caught up</b>
      <span>You've seen everything new from the last 3 days.</span>
    </div>`;
}

function renderTabbar() {
  return `
    <a href="#" class="tab active">${I.home()}<span>Home</span></a>
    <a href="#" class="tab">${I.search()}<span>Search</span></a>
    <a href="#" class="tab create" aria-label="Create"><span class="create-btn">${I.plus({ sw: 2.8 })}</span></a>
    <a href="#" class="tab">${I.clips()}<span>Clips</span></a>
    <a href="#" class="tab"><img class="tab-av" src="${U.me.avatar}" alt="" /><span>Profile</span></a>`;
}

/* ---------- Mount ---------- */
document.title = `${APP_NAME} — Home`;
document.getElementById("sidebar").innerHTML = renderSidebar();
document.getElementById("topbar").innerHTML = renderTopbar();
document.getElementById("stories").innerHTML = renderStories();
document.getElementById("chips").innerHTML = renderChips();
document.getElementById("feed").innerHTML = renderFeed();
document.getElementById("tabbar").innerHTML = renderTabbar();
document.querySelectorAll("[data-app-name]").forEach((el) => (el.textContent = APP_NAME));

/* ---------- Small interactions ---------- */
document.getElementById("chips").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  document.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === chip));
  document.getElementById("feed").dataset.filter = chip.dataset.filter;
});
document.addEventListener("click", (e) => {
  const like = e.target.closest(".act.like");
  if (like) {
    like.classList.toggle("on");
    like.querySelector("svg").setAttribute("fill", like.classList.contains("on") ? "currentColor" : "none");
  }
  if (e.target.closest('a[href="#"]')) e.preventDefault();
});
