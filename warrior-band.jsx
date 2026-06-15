import React, { useState, useEffect, useCallback, useRef } from "react";

// ─────────────────────────────────────────────────────────────
// Every Man a Warrior — clickable preview
// In this preview, data lives in memory for THIS session only
// (so you can click through solo). The deployable version (zip)
// shares one wall across the whole group via hosted storage.
// ─────────────────────────────────────────────────────────────

const __mem = {};
if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    async get(key) { return key in __mem ? { key, value: __mem[key], shared: true } : null; },
    async set(key, value) { __mem[key] = value; return { key, value, shared: true }; },
  };
}

// Real shared-storage round-trip self-test, surfaced by the Leader → "Test
// connection" button. Writes a probe key with shared:true, reads it back, and
// reports exactly which stage fails so a silent storage failure is visible.
if (typeof window !== "undefined" && !window.WARRIOR_DIAG) {
  window.WARRIOR_DIAG = async () => {
    const probe = "warrior:diag:probe";
    const token = "diag-" + Date.now();
    let stage = "write";
    try {
      await window.storage.set(probe, token, true);
      stage = "read";
      const res = await window.storage.get(probe, true);
      stage = "verify";
      if (!res || res.value !== token) {
        return {
          ok: false,
          stage,
          msg: res
            ? "Wrote a test value but read back something different — shared storage isn't round-tripping."
            : "Wrote a test value but read back nothing — shared storage isn't persisting.",
        };
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, stage, msg: String((e && e.message) || e) };
    }
  };
}




// ─────────────────────────────────────────────────────────────
// Every Man a Warrior — small-group companion app
// Four rooms: Check-In · Prayer · Scripture · God Moments
// Shared data persists across the group via window.storage.
// ─────────────────────────────────────────────────────────────

const ACCENT = "#B7472A";       // forged iron-oxide red
const STEEL = "#2E3A40";        // cold steel
const PARCHMENT = "#EDE6D6";    // field-manual paper
const PARCHMENT_DK = "#DCD2BC";
const INK = "#1C2226";

const ROOMS = [
  { id: "chat", label: "Chat", verse: "Encourage one another" },
  { id: "checkin", label: "Check-In", verse: "As iron sharpens iron" },
  { id: "prayer", label: "Prayer", verse: "Pray for one another" },
  { id: "scripture", label: "Scripture", verse: "Hidden in my heart" },
  { id: "moments", label: "God Moments", verse: "Declare his works" },
];

const STORE_KEY = "warrior:band:v1";
const ADMIN_PIN = "7777"; // leader unlock PIN

// Official Every Man a Warrior memory verses (NIV unless noted), Books 1–3.
// Source: everymanawarrior.com scripture memory pack.
const EMAW_VERSES = [
  { book: 1, n: 1, ref: "Matthew 22:36-38", text: "“Teacher, which is the greatest commandment in the Law?” Jesus replied: “Love the Lord your God with all your heart and with all your soul and with all your mind. This is the first and greatest commandment.”" },
  { book: 1, n: 2, ref: "2 Timothy 3:16-17", text: "All Scripture is God-breathed and is useful for teaching, rebuking, correcting and training in righteousness, so that the man of God may be thoroughly equipped for every good work." },
  { book: 1, n: 3, ref: "Joshua 1:8", text: "Do not let this Book of the Law depart from your mouth; meditate on it day and night, so that you may be careful to do everything written in it. Then you will be prosperous and successful." },
  { book: 1, n: 4, ref: "John 16:24", text: "Until now you have not asked for anything in my name. Ask and you will receive, and your joy will be complete." },
  { book: 1, n: 5, ref: "Philippians 4:6-7", text: "Do not be anxious about anything, but in everything, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus." },
  { book: 1, n: 6, ref: "James 1:22", text: "Do not merely listen to the word, and so deceive yourselves. Do what it says." },
  { book: 1, n: 7, ref: "Hebrews 12:11", text: "No discipline seems pleasant at the time, but painful. Later on, however, it produces a harvest of righteousness and peace for those who have been trained by it." },
  { book: 2, n: 8, ref: "Genesis 2:18", text: "The Lord God said, “It is not good for the man to be alone. I will make a helper suitable for him.”" },
  { book: 2, n: 9, ref: "Ephesians 5:25", text: "Husbands, love your wives, just as Christ loved the church and gave himself up for her." },
  { book: 2, n: 10, ref: "My Marriage Commitment (John 14:21; Eph. 5:25; 1 Peter 3:7)", text: "It is my privilege, to show my love for Jesus by caring for my wife—to love her, show her honor, try to understand her and to give up my life and rights for her." },
  { book: 2, n: 11, ref: "1 Peter 4:19", text: "So then, those who suffer according to God’s will should commit themselves to their faithful Creator and continue to do good." },
  { book: 2, n: 12, ref: "1 Peter 3:7 (NASB)", text: "You husbands in the same way, live with your wives in an understanding way, as with someone weaker, since she is a woman; and show her honor as a fellow heir of the grace of life, so that your prayers will not be hindered." },
  { book: 2, n: 13, ref: "Raising children (Eph. 6:4; Prov. 17:6; Prov. 18:21)", text: "Three biblical principles: It is the father’s God-given responsibility to train his children (Eph. 6:4); children get their self-image from what they believe dad thinks about them (Prov. 17:6); the words spoken to a child will determine his destiny (Prov. 18:21)." },
  { book: 2, n: 14, ref: "Ephesians 6:4", text: "Fathers, do not exasperate your children; instead, bring them up in the training and instruction of the Lord." },
  { book: 2, n: 15, ref: "Proverbs 18:21", text: "The tongue has the power of life and death…" },
  { book: 2, n: 16, ref: "Proverbs 18:13", text: "He who answers before listening—that is his folly and his shame." },
  { book: 2, n: 17, ref: "1 Peter 3:8-9", text: "Finally, all of you, live in harmony with one another; be sympathetic, love as brothers, be compassionate and humble. Do not repay evil with evil or insult with insult, but with blessing, because to this you were called so that you may inherit a blessing." },
  { book: 3, n: 18, ref: "Mark 4:19", text: "…but the worries of this life, the deceitfulness of wealth and the desires for other things come in and choke the word, making it unfruitful." },
  { book: 3, n: 19, ref: "Proverbs 22:7 (RSV)", text: "The rich rule over the poor, and the borrower is the slave of the lender." },
  { book: 3, n: 20, ref: "Ecclesiastes 11:2", text: "Give portions to seven, yes to eight, for you do not know what disaster may come upon the land." },
  { book: 3, n: 21, ref: "1 Timothy 6:18-19", text: "Command them to do good, to be rich in good deeds, and to be generous and willing to share. In this way they will lay up treasure for themselves as a firm foundation for the coming age, so that they may take hold of the life that is truly life." },
  { book: 3, n: 22, ref: "James 1:2-4", text: "Consider it pure joy, my brothers, whenever you face trials of many kinds, because you know that the testing of your faith develops perseverance. Perseverance must finish its work so that you may be mature and complete, not lacking anything." },
  { book: 3, n: 23, ref: "Matthew 11:28-30", text: "Come to me, all you who are weary and burdened, and I will give you rest. Take my yoke upon you and learn from me, for I am gentle and humble in heart, and you will find rest for your souls. For my yoke is easy and my burden is light." },
  { book: 3, n: 24, ref: "Matthew 28:18-20", text: "Then Jesus came to them and said, “All authority in heaven and on earth has been given to me. Therefore go and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit, teaching them to obey everything I have commanded you. And surely I am with you always, to the very end of the age.”" },
  { book: 3, n: 25, ref: "1 Corinthians 6:20", text: "You are not your own; you were bought at a price. Therefore honor God with your body." },
  { book: 3, n: 26, ref: "Colossians 3:23-24", text: "Whatever you do, work at it with all your heart, as working for the Lord, not for men, since you know that you will receive an inheritance from the Lord as a reward. It is the Lord Christ you are serving." },
];

const emptyState = {
  members: [],
  messages: [],
  checkins: [],
  prayers: [],
  scriptures: [],
  moments: [],
  reads: {}, // { name: [ "2026-06-11", ... ] } daily Bible-reading log
  presence: {}, // { name: lastSeenTs }
};

const __today=(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;})();
const __yest=(()=>{const d=new Date(Date.now()-86400000);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;})();
if(!__mem[STORE_KEY]){
  __mem[STORE_KEY]=JSON.stringify({
    members:["Ben","Marcus","Eli","Tom"],
    messages:[
      {id:1,author:"Ben",text:"Morning men — good to have the band together. Let's be in the Word today.",ts:Date.now()-7200000},
      {id:2,author:"Marcus",text:"Amen. Praying for you all this week.",ts:Date.now()-5400000},
    ],
    checkins:[{id:1,author:"Eli",mood:"Struggling",note:"Hard week at work, felt distant from God. Could use prayer.",ts:Date.now()-9000000,nods:["Ben","Marcus"]}],
    prayers:[{id:1,author:"Tom",text:"My father's surgery is Thursday. Praying it goes well.",ts:Date.now()-10800000,praying:["Ben","Eli"],answered:false}],
    scriptures:[{id:1,author:"Ben",ref:"Joshua 1:8",text:"Do not let this Book of the Law depart from your mouth; meditate on it day and night, so that you may be careful to do everything written in it. Then you will be prosperous and successful.",ts:Date.now()-86400000,memorized:["Ben","Marcus"]}],
    moments:[{id:1,author:"Marcus",text:"Got to share my testimony with a coworker today. God opened the door.",ts:Date.now()-14400000,amens:["Ben","Eli","Tom"]}],
    reads:{Ben:[__yest,__today],Marcus:[__today],Eli:[__yest],Tom:[]},
    presence:{Ben:Date.now()-30000,Marcus:Date.now()-120000},
  });
}


function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// local YYYY-MM-DD for "today" comparisons
function dayKey(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// last 7 day-keys, oldest → newest
function last7Days() {
  const out = [];
  for (let i = 6; i >= 0; i--) out.push(dayKey(Date.now() - i * 86400000));
  return out;
}

// consecutive-day streak ending today (or yesterday, grace)
function streakOf(days = []) {
  const set = new Set(days);
  let streak = 0;
  let cursor = Date.now();
  // allow today to not yet be logged without breaking streak
  if (!set.has(dayKey(cursor))) cursor -= 86400000;
  while (set.has(dayKey(cursor))) {
    streak++;
    cursor -= 86400000;
  }
  return streak;
}

export default function App() {
  // Remember the name on THIS device (separate from the shared wall),
  // so a man doesn't have to retype it every time he opens the app.
  const savedName =
    typeof window !== "undefined" && window.localStorage
      ? window.localStorage.getItem("warrior:myname")
      : null;
  const [name, setName] = useState(savedName || null);
  const [nameInput, setNameInput] = useState("");
  const [room, setRoom] = useState("chat");
  const [data, setData] = useState(emptyState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null); // last write failure, shown as a toast
  const [isAdmin, setIsAdmin] = useState(false); // unlocked this session via PIN

  // Refs to coordinate background refresh with user writes.
  const dataRef = useRef(emptyState);     // always-current data, readable inside async work
  const writeInFlight = useRef(0);        // >0 while a save is happening
  const lastWriteAt = useRef(0);          // timestamp of last successful write

  useEffect(() => { dataRef.current = data; }, [data]);

  // load shared band state — but never stomp on a write that's in flight
  // or one that just happened (gives the bin a moment to reflect it).
  const load = useCallback(async () => {
    try {
      if (writeInFlight.current > 0) { setLoading(false); return; }
      if (Date.now() - lastWriteAt.current < 4000) { setLoading(false); return; }
      const res = await window.storage.get(STORE_KEY, true);
      if (writeInFlight.current > 0) { setLoading(false); return; }
      if (res && res.value) {
        const incoming = { ...emptyState, ...JSON.parse(res.value) };
        setData(incoming);
        dataRef.current = incoming;
      }
    } catch (e) {
      // On the hosted API, get() THROWS when the key doesn't exist yet, so a
      // first run is expected here. Log it (don't toast) so a genuine read
      // failure is still visible in the console without alarming first-load.
      console.error("[warrior] load: could not read shared state (expected on first run):", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 8000); // gentle polling so the group stays in sync
    return () => clearInterval(id);
  }, [load]);

  // heartbeat: quietly mark this person as "here" while the app is open
  useEffect(() => {
    if (!name) return;
    const beat = async () => {
      try {
        if (writeInFlight.current > 0) return;
        writeInFlight.current += 1;
        const res = await window.storage.get(STORE_KEY, true);
        const cur = res && res.value ? { ...emptyState, ...JSON.parse(res.value) } : { ...emptyState };
        const next = { ...cur, presence: { ...(cur.presence || {}), [name]: Date.now() } };
        await window.storage.set(STORE_KEY, JSON.stringify(next), true);
        dataRef.current = next;
        lastWriteAt.current = Date.now();
      } catch (e) {
        console.error("[warrior] presence heartbeat failed:", e);
      } finally {
        writeInFlight.current -= 1;
      }
    };
    beat();
    const id = setInterval(beat, 30000);
    return () => clearInterval(id);
  }, [name]);

  // Merge helper: union list items by id (append-aware), so a racing write
  // can't drop entries that landed between our read and our write.
  const mergeStates = (base, mine) => {
    const out = { ...base, ...mine };
    const listKeys = ["messages", "checkins", "prayers", "scriptures", "moments"];
    for (const k of listKeys) {
      const a = Array.isArray(base[k]) ? base[k] : [];
      const b = Array.isArray(mine[k]) ? mine[k] : [];
      const byId = new Map();
      // base first, then mine — mine wins on shared ids (e.g. an edit/react)
      for (const item of a) if (item && item.id != null) byId.set(item.id, item);
      for (const item of b) if (item && item.id != null) byId.set(item.id, item);
      // preserve chat (messages) oldest→newest; others newest→oldest by ts
      const merged = [...byId.values()];
      merged.sort((x, y) => (k === "messages" ? x.ts - y.ts : y.ts - x.ts));
      out[k] = merged;
    }
    // members / reads / presence: the change function already computed these
    // from the freshest base inside mutate(), so take its result as-is.
    // (Unioning here would silently re-add a removed member.)
    out.members = Array.isArray(mine.members) ? mine.members : (base.members || []);
    out.reads = mine.reads !== undefined ? mine.reads : (base.reads || {});
    out.presence = mine.presence !== undefined ? mine.presence : (base.presence || {});
    return out;
  };

  // Safer write: re-read the freshest shared copy, apply just our change,
  // then write the merged result. Deterministic (no work inside setData).
  const mutate = useCallback(async (changeFn) => {
    setSaving(true);
    writeInFlight.current += 1;
    try {
      let latest = null;
      try {
        const res = await window.storage.get(STORE_KEY, true);
        latest = res && res.value ? { ...emptyState, ...JSON.parse(res.value) } : { ...emptyState };
      } catch (e) {
        // Read-before-write failed. A missing key (first ever write) is fine —
        // we fall back to local state — but a real read failure is worth seeing.
        console.warn("[warrior] mutate: could not read latest before write (using local copy):", e);
        latest = null;
      }
      const base = latest || dataRef.current || emptyState;
      const mine = changeFn(base);
      const next = latest ? mergeStates(latest, mine) : mine;
      setData(next);
      dataRef.current = next;
      await window.storage.set(STORE_KEY, JSON.stringify(next), true);
      dataRef.current = next; // confirmed written
      lastWriteAt.current = Date.now();
      setSaveError(null); // a good write clears any prior failure notice
    } catch (e) {
      // The write itself failed — this is what makes posts silently "vanish".
      // Log it AND surface it so the user knows the band didn't get it.
      console.error("[warrior] mutate: write to shared storage FAILED:", e);
      setSaveError(String((e && e.message) || e) || "Save failed");
    } finally {
      writeInFlight.current -= 1;
      setSaving(false);
    }
  }, []);

  const persist = useCallback(async (next) => {
    setData(next);
    setSaving(true);
    try {
      await window.storage.set(STORE_KEY, JSON.stringify(next), true);
      setSaveError(null);
    } catch (e) {
      console.error("[warrior] persist: write to shared storage FAILED:", e);
      setSaveError(String((e && e.message) || e) || "Save failed");
    }
    setSaving(false);
  }, []);

  const join = () => {
    const n = nameInput.trim();
    if (!n) return;
    setName(n);
    try {
      if (window.localStorage) window.localStorage.setItem("warrior:myname", n);
    } catch (e) {
      // private mode / storage blocked — app still works for this session
    }
    mutate((d) => ({
      ...d,
      members: d.members.includes(n) ? d.members : [...d.members, n],
      presence: { ...(d.presence || {}), [n]: Date.now() },
    }));
  };

  // If a remembered name reopens the app, make sure he's in the roster.
  useEffect(() => {
    if (!name) return;
    mutate((d) => ({
      ...d,
      members: d.members.includes(name) ? d.members : [...d.members, name],
      presence: { ...(d.presence || {}), [name]: Date.now() },
    }));
    // eslint-disable-next-line
  }, [name]);

  // add a member by name (leader action)
  const addMember = (raw) => {
    const n = (raw || "").trim();
    if (!n) return;
    mutate((d) => (d.members.includes(n) ? d : { ...d, members: [...d.members, n] }));
  };

  // remove a member and their per-person data (leader action)
  const removeMember = (n) => {
    mutate((d) => {
      const reads = { ...(d.reads || {}) };
      delete reads[n];
      const presence = { ...(d.presence || {}) };
      delete presence[n];
      return {
        ...d,
        members: d.members.filter((m) => m !== n),
        reads,
        presence,
      };
    });
  };

  // Deliberate identity switch (e.g. a shared phone). Lives in Leader tab.
  const switchUser = () => {
    try { if (window.localStorage) window.localStorage.removeItem("warrior:myname"); } catch (e) {}
    setIsAdmin(false);
    setName(null);
    setNameInput("");
  };

  if (loading) {
    return (
      <Shell>
        <div style={{ textAlign: "center", padding: "120px 0", color: PARCHMENT, opacity: 0.7, letterSpacing: "0.1em" }}>
          MUSTERING THE BAND…
        </div>
      </Shell>
    );
  }

  if (!name) {
    return (
      <Shell>
        <Enlist
          nameInput={nameInput}
          setNameInput={setNameInput}
          join={join}
          members={data.members}
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <Header
        name={name}
        saving={saving}
        memberCount={data.members.length}
        isAdmin={isAdmin}
        members={data.members}
        presence={data.presence}
      />
      <Nav room={room} setRoom={setRoom} data={data} isAdmin={isAdmin} />
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px 80px" }}>
        {room === "chat" && <Chat name={name} data={data} persist={persist} mutate={mutate} setRoom={setRoom} />}
        {room === "checkin" && <CheckIn name={name} data={data} persist={persist} mutate={mutate} />}
        {room === "prayer" && <Prayer name={name} data={data} persist={persist} mutate={mutate} />}
        {room === "scripture" && <Scripture name={name} data={data} persist={persist} mutate={mutate} isAdmin={isAdmin} />}
        {room === "moments" && <Moments name={name} data={data} persist={persist} mutate={mutate} />}
        {room === "admin" && (
          <Admin
            name={name}
            data={data}
            isAdmin={isAdmin}
            setIsAdmin={setIsAdmin}
            addMember={addMember}
            removeMember={removeMember}
            switchUser={switchUser}
            setRoom={setRoom}
          />
        )}
      </main>
      {saveError && <SaveErrorToast msg={saveError} onClose={() => setSaveError(null)} />}
    </Shell>
  );
}

// Visible failure notice — without this, a failed write looks identical to
// "it just didn't save" and nobody knows the band never got the post.
function SaveErrorToast({ msg, onClose }) {
  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        left: 16,
        right: 16,
        bottom: 16,
        maxWidth: 560,
        margin: "0 auto",
        background: "#2a201d",
        border: `1px solid ${ACCENT}`,
        borderRadius: 10,
        padding: "12px 14px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        zIndex: 50,
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13, letterSpacing: "0.06em", textTransform: "uppercase", color: ACCENT }}>
          ✗ That didn't save
        </div>
        <div style={{ fontSize: 13, color: PARCHMENT, marginTop: 3, lineHeight: 1.45 }}>
          The band may not see it. Check your connection and try again.
          <span style={{ display: "block", color: "#8a9499", marginTop: 4, fontSize: 12 }}>{msg}</span>
        </div>
      </div>
      <button
        onClick={onClose}
        aria-label="Dismiss"
        style={{ background: "none", border: "none", color: "#8a9499", fontSize: 18, cursor: "pointer", lineHeight: 1, padding: 2 }}
      >
        ×
      </button>
    </div>
  );
}

// ── Layout shell ──────────────────────────────────────────────
function Shell({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: INK,
        backgroundImage:
          "radial-gradient(circle at 20% 0%, #243036 0%, #141a1d 60%, #0e1214 100%)",
        fontFamily: "'Inter', system-ui, sans-serif",
        color: PARCHMENT,
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
        overflowX: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&family=Crimson+Pro:ital@0;1&display=swap');
        * { box-sizing: border-box; }
        html, body { margin: 0; max-width: 100%; overflow-x: hidden; }
        #root { overflow-x: hidden; }
        ::placeholder { color: #8a9499; }
        img, svg, video { max-width: 100%; height: auto; }
        input, textarea, select, button { max-width: 100%; }
        h1, h2, h3, p, span, div { overflow-wrap: anywhere; word-break: break-word; }
        button:focus-visible, input:focus-visible, textarea:focus-visible {
          outline: 2px solid ${ACCENT}; outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
      `}</style>
      {children}
    </div>
  );
}

// ── Enlist / name entry ───────────────────────────────────────
function Enlist({ nameInput, setNameInput, join, members }) {
  return (
    <div style={{ maxWidth: 460, margin: "0 auto", padding: "72px 24px" }}>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <Crest />
      </div>
      <h1
        style={{
          fontFamily: "'Oswald', sans-serif",
          fontWeight: 700,
          fontSize: 34,
          letterSpacing: "0.04em",
          textAlign: "center",
          margin: "16px 0 4px",
          textTransform: "uppercase",
          lineHeight: 1.05,
        }}
      >
        Every Man<br />a Warrior
      </h1>
      <p
        style={{
          textAlign: "center",
          fontFamily: "'Crimson Pro', serif",
          fontStyle: "italic",
          fontSize: 17,
          color: "#b9b09a",
          margin: "0 0 36px",
        }}
      >
        “Fight the good fight of the faith.” — 1 Timothy 6:12
      </p>

      <label style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13, letterSpacing: "0.14em", color: "#9aa3a8" }}>
        YOUR NAME
      </label>
      <input
        value={nameInput}
        onChange={(e) => setNameInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && join()}
        placeholder="e.g. Marcus"
        style={inputStyle}
      />
      <button onClick={join} style={primaryBtn}>
        Join the Band
      </button>

      {members.length > 0 && (
        <div style={{ marginTop: 28, textAlign: "center", fontSize: 13, color: "#8a9499" }}>
          {members.length} man{members.length > 1 ? "" : ""} already mustered:{" "}
          <span style={{ color: PARCHMENT }}>{members.join(" · ")}</span>
        </div>
      )}
      <p style={{ marginTop: 32, fontSize: 12, color: "#6f7a80", textAlign: "center", lineHeight: 1.6 }}>
        Pick the name your brothers know you by. Everyone in this link shares
        the same wall — check-ins, prayers, scripture, and God moments.
      </p>
    </div>
  );
}

function Crest() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden>
      <path d="M32 4 L56 14 V32 C56 47 45 56 32 60 C19 56 8 47 8 32 V14 Z"
        fill="none" stroke={ACCENT} strokeWidth="2.5" />
      <path d="M32 18 V44 M24 26 H40" stroke={PARCHMENT} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Header ────────────────────────────────────────────────────
function Header({ name, saving, memberCount, isAdmin, members, presence }) {
  const [showRoster, setShowRoster] = useState(false);
  const roster = members || [];
  const onlineCutoff = Date.now() - 2 * 60 * 1000;

  return (
    <header
      style={{
        borderBottom: `1px solid #2b363b`,
        padding: "18px 20px 14px",
        maxWidth: 720,
        margin: "0 auto",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 30, height: 30 }}><Crest /></div>
        <div>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 16, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            The Band
          </div>
          <button
            onClick={() => setShowRoster((v) => !v)}
            style={{ background: "none", border: "none", padding: 0, color: "#8a9499", fontSize: 11, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}
          >
            {memberCount} {memberCount === 1 ? "brother" : "brothers"} · who's here ›
          </button>
        </div>

        {showRoster && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 20,
              marginTop: 4,
              background: "#1f282c",
              border: "1px solid #34424a",
              borderRadius: 10,
              padding: "10px 4px",
              minWidth: 200,
              zIndex: 20,
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6b7178", padding: "2px 14px 8px" }}>
              The Band · {roster.length}
            </div>
            {roster.length === 0 && (
              <div style={{ fontSize: 13, color: "#6b7178", padding: "2px 14px" }}>No one yet.</div>
            )}
            {roster.map((m) => {
              const here = ((presence || {})[m] || 0) > onlineCutoff;
              return (
                <div key={m} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: here ? "#3f7d4a" : "#4a565c", flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: PARCHMENT }}>
                    {m}{m === name && <span style={{ color: "#6b7178", fontSize: 12 }}> · you</span>}
                  </span>
                </div>
              );
            })}
            <div style={{ fontSize: 10, color: "#6b7178", padding: "8px 14px 2px" }}>
              Green dot = in the app now
            </div>
          </div>
        )}
      </div>

      <div style={{ fontSize: 12, color: "#8a9499", textAlign: "right" }}>
        <div>
          {saving ? "saving…" : <>standing watch as <span style={{ color: PARCHMENT }}>{name}</span>{isAdmin && <span style={{ color: ACCENT, marginLeft: 6, fontFamily: "'Oswald', sans-serif", letterSpacing: "0.06em" }}>★ LEADER</span>}</>}
        </div>
      </div>
    </header>
  );
}

// ── Nav ───────────────────────────────────────────────────────
function Nav({ room, setRoom, data, isAdmin }) {
  const counts = {
    chat: data.messages.length,
    checkin: data.checkins.length,
    prayer: data.prayers.filter((p) => !p.answered).length,
    scripture: data.scriptures.length,
    moments: data.moments.length,
  };
  const tabs = [...ROOMS, { id: "admin", label: isAdmin ? "★ Leader" : "Leader" }];
  return (
    <nav
      style={{
        display: "flex",
        gap: 4,
        maxWidth: 720,
        margin: "0 auto",
        padding: "14px 14px 18px",
        overflowX: "auto",
      }}
    >
      {tabs.map((r) => {
        const active = room === r.id;
        const leaderTab = r.id === "admin";
        return (
          <button
            key={r.id}
            onClick={() => setRoom(r.id)}
            style={{
              flex: 1,
              minWidth: 84,
              cursor: "pointer",
              border: leaderTab && isAdmin ? `1px solid ${ACCENT}` : "none",
              borderRadius: 8,
              padding: "10px 8px",
              background: active ? ACCENT : "#1f282c",
              color: active ? "#fff" : leaderTab && isAdmin ? ACCENT : "#b9b09a",
              fontFamily: "'Oswald', sans-serif",
              fontSize: 13,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              transition: "background 0.15s",
            }}
          >
            {r.label}
            {counts[r.id] > 0 && (
              <span style={{ display: "block", fontSize: 10, opacity: 0.8, marginTop: 2 }}>
                {counts[r.id]}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

// ── Shared card primitives ────────────────────────────────────
const cardStyle = {
  background: PARCHMENT,
  color: INK,
  borderRadius: 10,
  padding: "16px 18px",
  marginBottom: 14,
  boxShadow: "0 2px 0 rgba(0,0,0,0.25)",
};

function RoomTitle({ title, verse }) {
  return (
    <div style={{ margin: "8px 0 20px" }}>
      <h2 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 24, letterSpacing: "0.04em", textTransform: "uppercase", margin: 0 }}>
        {title}
      </h2>
      <p style={{ fontFamily: "'Crimson Pro', serif", fontStyle: "italic", color: "#9aa3a8", margin: "2px 0 0", fontSize: 16 }}>
        {verse}
      </p>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  background: "#11171a",
  border: "1px solid #34424a",
  borderRadius: 8,
  color: PARCHMENT,
  padding: "12px 14px",
  fontSize: 15,
  margin: "8px 0 14px",
  fontFamily: "inherit",
};

const textareaStyle = { ...inputStyle, minHeight: 80, resize: "vertical" };

const primaryBtn = {
  width: "100%",
  background: ACCENT,
  border: "none",
  borderRadius: 8,
  color: "#fff",
  padding: "13px",
  fontFamily: "'Oswald', sans-serif",
  fontSize: 15,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  cursor: "pointer",
};

const smallBtn = {
  background: "transparent",
  border: `1px solid ${STEEL}`,
  borderRadius: 6,
  color: STEEL,
  padding: "5px 12px",
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "'Oswald', sans-serif",
  letterSpacing: "0.04em",
};

function Byline({ author, ts }) {
  return (
    <div style={{ fontSize: 12, color: "#6b7178", marginTop: 10, display: "flex", justifyContent: "space-between" }}>
      <span style={{ fontWeight: 600 }}>{author}</span>
      <span>{timeAgo(ts)}</span>
    </div>
  );
}

// ── Room: Chat ────────────────────────────────────────────────
function Chat({ name, data, persist, mutate, setRoom }) {
  const [text, setText] = useState("");
  const messages = data.messages || [];

  const today = dayKey();
  const myReads = (data.reads && data.reads[name]) || [];
  const readToday = myReads.includes(today);
  const toggleRead = () => {
    mutate((d) => {
      const reads = { ...(d.reads || {}) };
      const mine = new Set(reads[name] || []);
      if (mine.has(today)) mine.delete(today);
      else mine.add(today);
      reads[name] = [...mine].sort();
      return { ...d, reads };
    });
  };
  const roster = data.members || [];
  const readersToday = roster.filter((m) => ((data.reads || {})[m] || []).includes(today)).length;

  const send = () => {
    if (!text.trim()) return;
    const entry = { id: Date.now(), author: name, text: text.trim(), ts: Date.now() };
    mutate((d) => ({ ...d, messages: [...(d.messages || []), entry] }));
    setText("");
  };

  // oldest at top, newest at bottom (chat order)
  const ordered = [...messages].sort((a, b) => a.ts - b.ts);

  return (
    <>
      <RoomTitle title="Band Chat" verse="Encourage one another and build each other up. — 1 Thess. 5:11" />

      {/* Daily Word prompt — first thing the band sees each day */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          background: readToday ? "#1c2c22" : "#2a201d",
          border: `1px solid ${readToday ? "#3f7d4a" : ACCENT}`,
          borderRadius: 10,
          padding: "12px 14px",
          marginBottom: 16,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: PARCHMENT }}>
            {readToday ? "✓ You're in the Word today" : "Have you been in the Word today?"}
          </div>
          <button
            onClick={() => setRoom && setRoom("checkin")}
            style={{ background: "none", border: "none", padding: 0, marginTop: 2, color: "#8a9499", fontSize: 12, cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}
          >
            {readersToday} of {roster.length || 1} read today — see the band ›
          </button>
        </div>
        <button
          onClick={toggleRead}
          style={{ ...primaryBtn, width: "auto", padding: "10px 16px", flexShrink: 0, background: readToday ? "#3f7d4a" : ACCENT }}
        >
          {readToday ? "✓ Read" : "I read today"}
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        {ordered.length === 0 && <Empty text="No messages yet. Say the first word." />}
        {ordered.map((m, i) => {
          const mine = m.author === name;
          const prev = ordered[i - 1];
          const sameAuthor = prev && prev.author === m.author && m.ts - prev.ts < 5 * 60 * 1000;
          return (
            <div
              key={m.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: mine ? "flex-end" : "flex-start",
                marginTop: sameAuthor ? 3 : 12,
                width: "100%",
              }}
            >
              {!sameAuthor && (
                <span style={{ fontSize: 11, color: "#8a9499", margin: "0 4px 3px", fontWeight: 600 }}>
                  {mine ? "You" : m.author}
                </span>
              )}
              <div
                style={{
                  maxWidth: "78%",
                  background: mine ? ACCENT : PARCHMENT,
                  color: mine ? "#fff" : INK,
                  borderRadius: 14,
                  borderBottomRightRadius: mine ? 4 : 14,
                  borderBottomLeftRadius: mine ? 14 : 4,
                  padding: "9px 13px",
                  fontSize: 15,
                  lineHeight: 1.4,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {m.text}
              </div>
              <span style={{ fontSize: 10, color: "#6b7178", margin: "3px 4px 0" }}>{timeAgo(m.ts)}</span>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Message the band…"
          style={{ ...textareaStyle, minHeight: 46, margin: 0, flex: 1 }}
        />
        <button onClick={send} style={{ ...primaryBtn, width: "auto", padding: "13px 20px" }}>
          Send
        </button>
      </div>
      <p style={{ fontSize: 11, color: "#6b7178", marginTop: 8, textAlign: "center" }}>
        Enter to send · Shift+Enter for a new line · refreshes every few seconds
      </p>
    </>
  );
}

// ── Room: Check-In ────────────────────────────────────────────
const MOODS = ["Strong", "Steady", "Struggling", "Need backup"];

function CheckIn({ name, data, persist, mutate }) {
  const [mood, setMood] = useState("Steady");
  const [note, setNote] = useState("");

  const today = dayKey();
  const myReads = (data.reads && data.reads[name]) || [];
  const readToday = myReads.includes(today);

  const toggleRead = () => {
    mutate((d) => {
      const reads = { ...(d.reads || {}) };
      const mine = new Set(reads[name] || []);
      if (mine.has(today)) mine.delete(today);
      else mine.add(today);
      reads[name] = [...mine].sort();
      return { ...d, reads };
    });
  };

  const post = () => {
    if (!note.trim()) return;
    const entry = { id: Date.now(), author: name, mood, note: note.trim(), ts: Date.now(), nods: [] };
    mutate((d) => ({ ...d, checkins: [entry, ...(d.checkins || [])] }));
    setNote("");
    setMood("Steady");
  };

  const nod = (id) => {
    mutate((d) => ({
      ...d,
      checkins: (d.checkins || []).map((c) =>
        c.id === id
          ? { ...c, nods: c.nods.includes(name) ? c.nods.filter((n) => n !== name) : [...c.nods, name] }
          : c
      ),
    }));
  };

  const moodColor = { Strong: "#3f7d4a", Steady: STEEL, Struggling: "#b5862f", "Need backup": ACCENT };

  return (
    <>
      <RoomTitle title="Weekly Check-In" verse="As iron sharpens iron, so one man sharpens another. — Prov. 27:17" />

      <DailyRead name={name} data={data} readToday={readToday} toggleRead={toggleRead} myStreak={streakOf(myReads)} />

      <div style={{ background: "#1f282c", borderRadius: 10, padding: 16, marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
          {MOODS.map((m) => (
            <button
              key={m}
              onClick={() => setMood(m)}
              style={{
                ...smallBtn,
                color: mood === m ? "#fff" : "#b9b09a",
                border: `1px solid ${mood === m ? moodColor[m] : "#34424a"}`,
                background: mood === m ? moodColor[m] : "transparent",
              }}
            >
              {m}
            </button>
          ))}
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="How's the week going? Where do you need the band?"
          style={textareaStyle}
        />
        <button onClick={post} style={primaryBtn}>Post Check-In</button>
      </div>

      {data.checkins.length === 0 && <Empty text="No check-ins yet. Be the first to report in." />}
      {data.checkins.map((c) => (
        <div key={c.id} style={cardStyle}>
          <span
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontSize: 12,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#fff",
              background: moodColor[c.mood] || STEEL,
              padding: "3px 9px",
              borderRadius: 5,
            }}
          >
            {c.mood}
          </span>
          <p style={{ margin: "12px 0 0", fontSize: 15, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{c.note}</p>
          <Byline author={c.author} ts={c.ts} />
          <button onClick={() => nod(c.id)} style={{ ...smallBtn, marginTop: 8, color: c.nods.includes(name) ? ACCENT : STEEL, borderColor: c.nods.includes(name) ? ACCENT : STEEL }}>
            ✓ I've got your back{c.nods.length ? ` · ${c.nods.length}` : ""}
          </button>
        </div>
      ))}
    </>
  );
}

// ── Daily Bible-reading tracker + band progress ───────────────
function DailyRead({ name, data, readToday, toggleRead, myStreak }) {
  const days = last7Days();
  const reads = data.reads || {};
  const presence = data.presence || {};
  const today = dayKey();
  // band roster: everyone who has joined
  const roster = data.members || [];
  const readersToday = roster.filter((m) => (reads[m] || []).includes(today));
  const onlineCutoff = Date.now() - 2 * 60 * 1000; // "here now" if seen in last 2 min

  return (
    <div style={{ background: "#1f282c", borderRadius: 10, padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase", color: PARCHMENT }}>
            Daily Word
          </div>
          <div style={{ fontSize: 12, color: "#8a9499", marginTop: 2 }}>
            {readersToday.length} of {roster.length || 1} read today
            {myStreak > 0 && <> · your streak <span style={{ color: ACCENT, fontWeight: 600 }}>{myStreak}🔥</span></>}
          </div>
        </div>
        <button
          onClick={toggleRead}
          style={{
            ...primaryBtn,
            width: "auto",
            padding: "11px 18px",
            background: readToday ? "#3f7d4a" : ACCENT,
          }}
        >
          {readToday ? "✓ Read today" : "I read today"}
        </button>
      </div>

      {/* Per-man 7-day grid so the band can see each other's progress */}
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 7 }}>
        {roster.length === 0 && (
          <div style={{ fontSize: 12, color: "#6b7178" }}>No one has joined yet.</div>
        )}
        {roster.map((m) => {
          const log = reads[m] || [];
          const here = (presence[m] || 0) > onlineCutoff;
          return (
            <div key={m} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 96, fontSize: 12, color: PARCHMENT, display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                <span
                  title={here ? "here now" : "away"}
                  style={{ width: 7, height: 7, borderRadius: "50%", background: here ? "#3f7d4a" : "#4a565c", flexShrink: 0 }}
                />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m === name ? "You" : m}
                </span>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {days.map((d) => {
                  const hit = log.includes(d);
                  const isToday = d === today;
                  return (
                    <span
                      key={d}
                      title={d}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        background: hit ? "#3f7d4a" : "#11171a",
                        border: isToday ? `1px solid ${ACCENT}` : "1px solid #2b363b",
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: "#6b7178", marginTop: 10 }}>
        Green dot = in the app now · last 7 days shown, today outlined in red
      </div>
    </div>
  );
}

// ── Room: Prayer ──────────────────────────────────────────────
function Prayer({ name, data, persist, mutate }) {
  const [text, setText] = useState("");

  const post = () => {
    if (!text.trim()) return;
    const entry = { id: Date.now(), author: name, text: text.trim(), ts: Date.now(), praying: [], answered: false };
    mutate((d) => ({ ...d, prayers: [entry, ...(d.prayers || [])] }));
    setText("");
  };

  const togglePray = (id) =>
    mutate((d) => ({
      ...d,
      prayers: (d.prayers || []).map((p) =>
        p.id === id
          ? { ...p, praying: p.praying.includes(name) ? p.praying.filter((n) => n !== name) : [...p.praying, name] }
          : p
      ),
    }));

  const markAnswered = (id) =>
    mutate((d) => ({ ...d, prayers: (d.prayers || []).map((p) => (p.id === id ? { ...p, answered: !p.answered } : p)) }));

  const active = data.prayers.filter((p) => !p.answered);
  const answered = data.prayers.filter((p) => p.answered);

  return (
    <>
      <RoomTitle title="Prayer Requests" verse="Pray for one another, that you may be healed. — James 5:16" />
      <div style={{ background: "#1f282c", borderRadius: 10, padding: 16, marginBottom: 24 }}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="What can the band lift up for you?" style={textareaStyle} />
        <button onClick={post} style={primaryBtn}>Post Request</button>
      </div>

      {active.length === 0 && <Empty text="No open requests. The watch is quiet." />}
      {active.map((p) => (
        <div key={p.id} style={cardStyle}>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{p.text}</p>
          <Byline author={p.author} ts={p.ts} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={() => togglePray(p.id)} style={{ ...smallBtn, color: p.praying.includes(name) ? ACCENT : STEEL, borderColor: p.praying.includes(name) ? ACCENT : STEEL }}>
              🙏 Praying{p.praying.length ? ` · ${p.praying.length}` : ""}
            </button>
            <button onClick={() => markAnswered(p.id)} style={smallBtn}>Mark answered</button>
          </div>
        </div>
      ))}

      {answered.length > 0 && (
        <>
          <h3 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 14, letterSpacing: "0.1em", textTransform: "uppercase", color: "#3f7d4a", margin: "28px 0 12px" }}>
            ✦ Answered Prayers
          </h3>
          {answered.map((p) => (
            <div key={p.id} style={{ ...cardStyle, background: PARCHMENT_DK, opacity: 0.92 }}>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{p.text}</p>
              <Byline author={p.author} ts={p.ts} />
              <button onClick={() => markAnswered(p.id)} style={{ ...smallBtn, marginTop: 8 }}>Reopen</button>
            </div>
          ))}
        </>
      )}
    </>
  );
}

// ── Room: Scripture memory ────────────────────────────────────
function Scripture({ name, data, persist, mutate, isAdmin }) {
  const [showForm, setShowForm] = useState(false);
  const [picked, setPicked] = useState(""); // index into EMAW_VERSES, or "custom"
  const [ref, setRef] = useState("");
  const [verse, setVerse] = useState("");

  const usedRefs = (data.scriptures || []).map((s) => s.ref);

  const postVerse = (r, t) => {
    if (!r.trim() || !t.trim()) return;
    const entry = { id: Date.now(), author: name, ref: r.trim(), verse: t.trim(), ts: Date.now(), memorized: [] };
    mutate((d) => ({ ...d, scriptures: [entry, ...(d.scriptures || [])] }));
    setPicked("");
    setRef("");
    setVerse("");
    setShowForm(false);
  };

  const postPicked = () => {
    if (picked === "custom") return postVerse(ref, verse);
    const v = EMAW_VERSES[Number(picked)];
    if (v) postVerse(v.ref, v.text);
  };

  const toggleMemorized = (id) =>
    mutate((d) => ({
      ...d,
      scriptures: (d.scriptures || []).map((s) =>
        s.id === id
          ? { ...s, memorized: s.memorized.includes(name) ? s.memorized.filter((n) => n !== name) : [...s.memorized, name] }
          : s
      ),
    }));

  const verses = data.scriptures || [];
  const current = verses[0];
  const past = verses.slice(1);

  return (
    <>
      <RoomTitle title="Scripture Memory" verse="I have hidden your word in my heart. — Psalm 119:11" />

      {/* Leader controls — pick from the official EMAW list */}
      {isAdmin && (
        <div style={{ marginBottom: 20 }}>
          {!showForm ? (
            <button onClick={() => setShowForm(true)} style={{ ...primaryBtn, width: "auto", padding: "10px 18px" }}>
              ★ {current ? "Set a new verse" : "Set this week's verse"}
            </button>
          ) : (
            <div style={{ background: "#1f282c", borderRadius: 10, padding: 16 }}>
              <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: ACCENT, marginBottom: 10 }}>
                ★ Leader · choose this week's verse
              </div>
              <select
                value={picked}
                onChange={(e) => setPicked(e.target.value)}
                style={{ ...inputStyle, appearance: "auto" }}
              >
                <option value="">Select from Every Man a Warrior…</option>
                {[1, 2, 3].map((bk) => (
                  <optgroup key={bk} label={`Book ${bk}`}>
                    {EMAW_VERSES.filter((v) => v.book === bk).map((v) => {
                      const idx = EMAW_VERSES.indexOf(v);
                      const done = usedRefs.includes(v.ref);
                      return (
                        <option key={idx} value={idx}>
                          {v.n}. {v.ref}{done ? "  ✓ used" : ""}
                        </option>
                      );
                    })}
                  </optgroup>
                ))}
                <option value="custom">✎ Enter a custom verse…</option>
              </select>

              {/* Preview of the selected official verse */}
              {picked !== "" && picked !== "custom" && EMAW_VERSES[Number(picked)] && (
                <div style={{ background: "#11171a", border: "1px solid #34424a", borderRadius: 8, padding: "12px 14px", margin: "4px 0 14px" }}>
                  <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: ACCENT }}>
                    {EMAW_VERSES[Number(picked)].ref}
                  </div>
                  <p style={{ fontFamily: "'Crimson Pro', serif", fontStyle: "italic", fontSize: 16, lineHeight: 1.4, margin: "6px 0 0", color: PARCHMENT }}>
                    “{EMAW_VERSES[Number(picked)].text}”
                  </p>
                </div>
              )}

              {/* Custom entry fallback */}
              {picked === "custom" && (
                <>
                  <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Reference — e.g. Joshua 1:9" style={inputStyle} />
                  <textarea value={verse} onChange={(e) => setVerse(e.target.value)} placeholder="Type the verse text…" style={textareaStyle} />
                </>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={postPicked} style={{ ...primaryBtn, opacity: picked === "" ? 0.5 : 1 }} disabled={picked === ""}>
                  Post Verse
                </button>
                <button onClick={() => { setShowForm(false); setPicked(""); }} style={{ ...smallBtn, padding: "0 16px", color: "#b9b09a", borderColor: "#34424a" }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}


      {/* The verse — the hero of this room */}
      {!current ? (
        <Empty text="The weekly memory verse will appear here once your leader sets it." />
      ) : (
        <VerseCard s={current} name={name} members={data.members} toggleMemorized={toggleMemorized} hero />
      )}

      {/* Past verses — quiet archive */}
      {past.length > 0 && (
        <>
          <h3 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b7178", margin: "30px 0 12px" }}>
            Previous Verses
          </h3>
          {past.map((s) => (
            <VerseCard key={s.id} s={s} name={name} members={data.members} toggleMemorized={toggleMemorized} />
          ))}
        </>
      )}
    </>
  );
}

function VerseCard({ s, name, members, toggleMemorized, hero }) {
  const done = s.memorized.includes(name);
  const count = s.memorized.length;
  const total = members.length || 1;
  const pct = Math.round((count / total) * 100);
  const everyone = count >= total && total > 0;

  return (
    <div
      style={{
        ...cardStyle,
        ...(hero
          ? { padding: "26px 24px", boxShadow: "0 4px 0 rgba(0,0,0,0.3)", borderTop: `4px solid ${ACCENT}` }
          : { background: PARCHMENT_DK, opacity: 0.95 }),
      }}
    >
      <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: hero ? 16 : 13, letterSpacing: "0.08em", textTransform: "uppercase", color: ACCENT }}>
        {s.ref}
      </div>
      <p style={{ fontFamily: "'Crimson Pro', serif", fontSize: hero ? 26 : 18, lineHeight: 1.4, margin: "10px 0 0", fontStyle: "italic" }}>
        “{s.verse}”
      </p>

      {/* live memorized tracker */}
      <div style={{ marginTop: hero ? 22 : 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: everyone ? "#3f7d4a" : STEEL }}>
            {everyone ? "✦ The whole band has it" : `${count} of ${total} memorized`}
          </span>
          <span style={{ fontSize: 12, color: "#6b7178" }}>{pct}%</span>
        </div>
        <div style={{ height: 8, background: "#cabfa6", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: everyone ? "#3f7d4a" : ACCENT, transition: "width 0.4s ease" }} />
        </div>
        {count > 0 && (
          <div style={{ marginTop: 8, fontSize: 12, color: "#6b7178", lineHeight: 1.5 }}>
            <span style={{ color: "#3f7d4a", fontWeight: 600 }}>✓</span>{" "}
            {s.memorized.map((m) => (m === name ? "You" : m)).join(", ")}
          </div>
        )}
      </div>

      <button
        onClick={() => toggleMemorized(s.id)}
        style={{
          ...smallBtn,
          marginTop: 14,
          padding: hero ? "9px 18px" : "5px 12px",
          fontSize: hero ? 14 : 12,
          color: done ? "#fff" : STEEL,
          background: done ? "#3f7d4a" : "transparent",
          borderColor: done ? "#3f7d4a" : STEEL,
        }}
      >
        {done ? "✓ I've memorized it" : "I've memorized it"}
      </button>
    </div>
  );
}

// ── Room: God Moments ─────────────────────────────────────────
function Moments({ name, data, persist, mutate }) {
  const [text, setText] = useState("");

  const post = () => {
    if (!text.trim()) return;
    const entry = { id: Date.now(), author: name, text: text.trim(), ts: Date.now(), amens: [] };
    mutate((d) => ({ ...d, moments: [entry, ...(d.moments || [])] }));
    setText("");
  };

  const amen = (id) =>
    mutate((d) => ({
      ...d,
      moments: (d.moments || []).map((m) =>
        m.id === id
          ? { ...m, amens: m.amens.includes(name) ? m.amens.filter((n) => n !== name) : [...m.amens, name] }
          : m
      ),
    }));

  return (
    <>
      <RoomTitle title="God Moments" verse="I will declare the works of the Lord. — Psalm 118:17" />
      <div style={{ background: "#1f282c", borderRadius: 10, padding: 16, marginBottom: 24 }}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Where did you see God move this week?" style={textareaStyle} />
        <button onClick={post} style={primaryBtn}>Share the Moment</button>
      </div>

      {data.moments.length === 0 && <Empty text="No moments shared yet. Tell the band what God did." />}
      {data.moments.map((m) => (
        <div key={m.id} style={{ ...cardStyle, borderLeft: `4px solid ${ACCENT}` }}>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{m.text}</p>
          <Byline author={m.author} ts={m.ts} />
          <button onClick={() => amen(m.id)} style={{ ...smallBtn, marginTop: 8, color: m.amens.includes(name) ? ACCENT : STEEL, borderColor: m.amens.includes(name) ? ACCENT : STEEL }}>
            🔥 Amen{m.amens.length ? ` · ${m.amens.length}` : ""}
          </button>
        </div>
      ))}
    </>
  );
}

function Empty({ text }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px", color: "#6b7178", fontFamily: "'Crimson Pro', serif", fontStyle: "italic", fontSize: 16 }}>
      {text}
    </div>
  );
}

// ── Leader room: PIN unlock + member management ───────────────
function Admin({ name, data, isAdmin, setIsAdmin, addMember, removeMember, switchUser, setRoom }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);
  const [newName, setNewName] = useState("");
  const [confirm, setConfirm] = useState(null); // name pending removal
  const [diag, setDiag] = useState(null);
  const [diagBusy, setDiagBusy] = useState(false);

  const runDiag = async () => {
    setDiagBusy(true);
    setDiag(null);
    try {
      const r = window.WARRIOR_DIAG ? await window.WARRIOR_DIAG() : { ok: false, msg: "diag unavailable" };
      setDiag(r);
    } catch (e) {
      setDiag({ ok: false, msg: String((e && e.message) || e) });
    }
    setDiagBusy(false);
  };

  const tryUnlock = () => {
    if (pin === ADMIN_PIN) {
      setIsAdmin(true);
      setErr(false);
      setPin("");
    } else {
      setErr(true);
    }
  };

  if (!isAdmin) {
    return (
      <>
        <RoomTitle title="Leader Access" verse="To whom much is given, much will be required. — Luke 12:48" />
        <div style={{ background: "#1f282c", borderRadius: 10, padding: 20, maxWidth: 320, margin: "0 auto" }}>
          <label style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, letterSpacing: "0.12em", color: "#9aa3a8", textTransform: "uppercase" }}>
            Enter 4-digit PIN
          </label>
          <input
            value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setErr(false); }}
            onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
            type="password"
            inputMode="numeric"
            placeholder="••••"
            style={{ ...inputStyle, textAlign: "center", letterSpacing: "0.5em", fontSize: 22 }}
          />
          {err && <div style={{ color: ACCENT, fontSize: 13, marginBottom: 10 }}>Wrong PIN. Try again.</div>}
          <button onClick={tryUnlock} style={primaryBtn}>Unlock</button>
          <p style={{ fontSize: 12, color: "#6b7178", marginTop: 14, lineHeight: 1.5 }}>
            The leader PIN opens verse-setting and member management. Ask whoever
            set up the band if you don't have it.
          </p>
        </div>
      </>
    );
  }

  const roster = data.members || [];

  return (
    <>
      <RoomTitle title="Leader Tools" verse="Shepherd the flock of God that is among you. — 1 Peter 5:2" />

      {/* Connection self-test */}
      <div style={{ background: "#1f282c", borderRadius: 10, padding: 16, marginBottom: 16 }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: ACCENT, marginBottom: 10 }}>
          Shared-storage check
        </div>
        <button onClick={runDiag} disabled={diagBusy} style={{ ...primaryBtn, width: "auto", padding: "10px 18px", opacity: diagBusy ? 0.6 : 1 }}>
          {diagBusy ? "Testing…" : "Test connection"}
        </button>
        {diag && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 12px",
              borderRadius: 8,
              background: diag.ok ? "#1c2c22" : "#2a201d",
              border: `1px solid ${diag.ok ? "#3f7d4a" : ACCENT}`,
              fontSize: 13,
              lineHeight: 1.5,
              color: PARCHMENT,
            }}
          >
            {diag.ok
              ? "✓ Saving works — the group shares one wall."
              : <>✗ Not saving. Stage: <b>{diag.stage}</b><br />{diag.msg}</>}
          </div>
        )}
        <p style={{ fontSize: 11, color: "#6b7178", marginTop: 10, lineHeight: 1.5 }}>
          Tap this if posts seem to vanish. Green means saving works. If it's red,
          screenshot it — the message says exactly what to fix.
        </p>
      </div>

      {/* Add member */}
      <div style={{ background: "#1f282c", borderRadius: 10, padding: 16, marginBottom: 16 }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: ACCENT, marginBottom: 10 }}>
          Add a man to the band
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { addMember(newName); setNewName(""); } }}
            placeholder="Name"
            style={{ ...inputStyle, margin: 0, flex: 1 }}
          />
          <button onClick={() => { addMember(newName); setNewName(""); }} style={{ ...primaryBtn, width: "auto", padding: "0 18px" }}>
            Add
          </button>
        </div>
      </div>

      {/* Roster with remove */}
      <div style={{ background: "#1f282c", borderRadius: 10, padding: 16 }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9aa3a8", marginBottom: 12 }}>
          The band · {roster.length}
        </div>
        {roster.length === 0 && <div style={{ fontSize: 13, color: "#6b7178" }}>No one has joined yet.</div>}
        {roster.map((m) => (
          <div key={m} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #2b363b" }}>
            <span style={{ color: PARCHMENT, fontSize: 15 }}>
              {m}{m === name && <span style={{ color: "#6b7178", fontSize: 12 }}> · you</span>}
            </span>
            {confirm === m ? (
              <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#9aa3a8" }}>Remove?</span>
                <button onClick={() => { removeMember(m); setConfirm(null); }} style={{ ...smallBtn, color: "#fff", background: ACCENT, borderColor: ACCENT }}>Yes</button>
                <button onClick={() => setConfirm(null)} style={{ ...smallBtn, color: "#b9b09a", borderColor: "#34424a" }}>No</button>
              </span>
            ) : (
              <button onClick={() => setConfirm(m)} style={{ ...smallBtn, color: "#b9b09a", borderColor: "#34424a" }}>Remove</button>
            )}
          </div>
        ))}
        <p style={{ fontSize: 11, color: "#6b7178", marginTop: 12, lineHeight: 1.5 }}>
          Removing a man clears his reading log and presence. He can rejoin any time by opening the link and typing his name.
        </p>
      </div>

      {/* Set verse shortcut */}
      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
        <button onClick={() => setRoom("scripture")} style={{ ...primaryBtn, width: "auto", padding: "11px 18px" }}>
          ★ Set this week's verse
        </button>
      </div>

      {/* Leadership session controls */}
      <div style={{ background: "#1f282c", borderRadius: 10, padding: 16, marginTop: 16 }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9aa3a8", marginBottom: 10 }}>
          Leadership
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setIsAdmin(false)} style={{ ...primaryBtn, width: "auto", padding: "11px 18px", background: STEEL }}>
            Sign out of leader role
          </button>
          {switchUser && (
            <button onClick={switchUser} style={{ ...smallBtn, padding: "0 16px", color: "#b9b09a", borderColor: "#34424a" }}>
              Switch device login
            </button>
          )}
        </div>
        <p style={{ fontSize: 11, color: "#6b7178", marginTop: 10, lineHeight: 1.5 }}>
          Signing out locks the leader tools again. You stay in the band as {name} — you'll just need the PIN to manage verses or members next time.
        </p>
      </div>
    </>
  );
}
