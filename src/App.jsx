import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase.js";

const REPS = ["Lucas", "Giovanni", "Francesco"];
const REP_COLORS = {
  Lucas:     { main: "#378ADD", dot: "#60aaff" },
  Giovanni:  { main: "#E85D24", dot: "#ff7a45" },
  Francesco: { main: "#A855F7", dot: "#c97fff" },
};
const STAGES = ["New Lead", "Contacted", "Interested", "Proposal Sent", "Closed Won", "Closed Lost"];
const STAGE_COLORS = {
  "New Lead":      { bg: "#1a2a3a", text: "#60aaff", border: "#378ADD" },
  "Contacted":     { bg: "#2a1f10", text: "#ff9a55", border: "#BA7517" },
  "Interested":    { bg: "#162410", text: "#7bc95a", border: "#639922" },
  "Proposal Sent": { bg: "#221a3a", text: "#b07fff", border: "#7F77DD" },
  "Closed Won":    { bg: "#0d2a1e", text: "#3dd68c", border: "#1D9E75" },
  "Closed Lost":   { bg: "#2a1010", text: "#ff6b6b", border: "#E24B4A" },
};
const EMPTY_LEAD = { name: "", company: "", phone: "", stage: "New Lead", rep: "Lucas", notes: "", value: "" };
const EMPTY_LOG  = { rep: "Lucas", calls: "", connected: "", demos: "", closes: "", date: "" };

// Follow-up schedule days for Interested leads
const FOLLOWUP_DAYS = [1, 3, 7, 10];

// Timeframe options for calls filter
const TIMEFRAMES = [
  { value: "week",  label: "This Week" },
  { value: "7d",    label: "7 Days"    },
  { value: "month", label: "30 Days"   },
  { value: "all",   label: "All Time"  },
];

// Calendar constants
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW_LABELS  = ["Su","Mo","Tu","We","Th","Fr","Sa"];

// ── Helpers ────────────────────────────────────────────
function filterLogsByTimeframe(logs, timeframe) {
  const now = new Date();
  const fmt = d => d.toISOString().slice(0, 10);
  if (timeframe === "all") return logs;
  if (timeframe === "week") {
    const dow = (now.getDay() + 6) % 7;
    const ws = new Date(now); ws.setDate(now.getDate() - dow); ws.setHours(0, 0, 0, 0);
    const we = new Date(ws);  we.setDate(ws.getDate() + 7);
    return logs.filter(l => l.date >= fmt(ws) && l.date < fmt(we));
  }
  if (timeframe === "7d") {
    const cutoff = new Date(now); cutoff.setDate(now.getDate() - 7);
    return logs.filter(l => l.date >= fmt(cutoff));
  }
  if (timeframe === "month") {
    const cutoff = new Date(now); cutoff.setDate(now.getDate() - 30);
    return logs.filter(l => l.date >= fmt(cutoff));
  }
  return logs;
}

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function daysAgo(iso) {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function openWhatsApp(phone, name) {
  const cleaned = phone.replace(/\D/g, "");
  const msg = encodeURIComponent(`Hi ${name}, following up from Firstline! Is now a good time to chat?`);
  window.open(`https://wa.me/${cleaned}?text=${msg}`, "_blank");
}

// ── Rep Calendar ─────────────────────────────────────────────
function RepCalendar({ rep, trackingData, month, onDayClick, onPrevMonth, onNextMonth }) {
  const year = month.getFullYear();
  const mon  = month.getMonth();
  const todayStr    = new Date().toISOString().slice(0, 10);
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  const firstDow    = new Date(year, mon, 1).getDay();
  const rc = REP_COLORS[rep];

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{ flex: 1, minWidth: 270, background: "#111", border: `1px solid ${rc.main}44`, borderRadius: 14, padding: "16px 14px" }}>
      {/* Rep name + month navigation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button onClick={onPrevMonth} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 22, lineHeight: 1, padding: "0 6px" }}>‹</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: rc.dot }}>{rep}</div>
          <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{MONTH_NAMES[mon]} {year}</div>
        </div>
        <button onClick={onNextMonth} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 22, lineHeight: 1, padding: "0 6px" }}>›</button>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
        {DOW_LABELS.map(d => (
          <div key={d} style={{ fontSize: 9, color: "#333", textAlign: "center", fontWeight: 600, padding: "2px 0", letterSpacing: 0.5 }}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} style={{ height: 34 }} />;
          const dateStr = `${year}-${String(mon + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const entry   = trackingData.find(t => t.rep === rep && t.date === dateStr);
          const isToday = dateStr === todayStr;
          const isPast  = dateStr < todayStr;

          let bg = "transparent", border = "1px solid transparent", shadow = "none", color = "#444";

          if (entry?.is_done) {
            bg = "#0a2a15"; border = "1px solid #2a7a3a"; shadow = "0 0 10px #3dd68c55"; color = "#3dd68c";
          } else if (entry?.todos && isPast && !isToday) {
            bg = "#2a0a0a"; border = "1px solid #7a2a2a"; shadow = "0 0 10px #ff6b6b55"; color = "#ff6b6b";
          } else if (entry?.todos && isToday) {
            bg = "#0a1a2a"; border = `1px solid ${rc.main}`; color = rc.dot;
          } else if (entry?.todos) {
            bg = "#181818"; border = "1px solid #2a2a2a"; color = "#777";
          } else if (isToday) {
            border = `1px solid ${rc.main}88`; color = rc.dot;
          }

          return (
            <div
              key={idx}
              onClick={() => onDayClick(rep, dateStr, entry)}
              title={entry ? (entry.is_done ? "Complete ✓" : entry.todos ? "Has todos" : "") : "Click to add todos"}
              style={{
                cursor: "pointer", background: bg, border, borderRadius: 5, boxShadow: shadow,
                height: 34, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: isToday ? 700 : 400, color, transition: "all .15s",
              }}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 10, marginTop: 12, justifyContent: "center", flexWrap: "wrap" }}>
        {[
          { color: "#3dd68c", label: "Done" },
          { color: "#ff6b6b", label: "Missed" },
          { color: rc.dot,    label: "Today" },
          { color: "#777",    label: "Planned" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#444" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Timeframe Toggle ─────────────────────────────────────────────
function TimeframeToggle({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 3, background: "#0d0d0d", borderRadius: 9, padding: 3, border: "1px solid #1a1a1a", width: "fit-content", marginBottom: 16 }}>
      {TIMEFRAMES.map(tf => (
        <button key={tf.value} onClick={() => onChange(tf.value)} style={{
          background: value === tf.value ? "#185FA5" : "none",
          border: "none",
          borderRadius: 6,
          color: value === tf.value ? "#fff" : "#555",
          cursor: "pointer",
          padding: "5px 14px",
          fontSize: 13,
          fontWeight: value === tf.value ? 600 : 400,
          transition: "all .15s",
        }}>
          {tf.label}
        </button>
      ))}
    </div>
  );
}

// ── Donut Chart ──────────────────────────────────────────────
function DonutChart({ callLogs, timeframe }) {
  const size = 180, cx = 90, cy = 90, R = 72, r = 48;

  const repCalls = REPS.map(rep => ({
    rep,
    calls: callLogs.filter(l => l.rep === rep).reduce((s, l) => s + Number(l.calls || 0), 0),
  }));
  const total = repCalls.reduce((s, rc) => s + rc.calls, 0);

  const centerLabel = { week: "this week", "7d": "7 days", month: "30 days", all: "all time" }[timeframe] || "this week";

  function describeArc(startPct, pct) {
    if (pct <= 0) return null;
    const gap = 0.008;
    const s = startPct + gap / 2, e = startPct + pct - gap / 2;
    if (e <= s) return null;
    const a1 = s * 2 * Math.PI - Math.PI / 2, a2 = e * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
    const x2 = cx + R * Math.cos(a2), y2 = cy + R * Math.sin(a2);
    const x1i = cx + r * Math.cos(a1), y1i = cy + r * Math.sin(a1);
    const x2i = cx + r * Math.cos(a2), y2i = cy + r * Math.sin(a2);
    const lg = pct > 0.5 ? 1 : 0;
    return `M ${x1} ${y1} A ${R} ${R} 0 ${lg} 1 ${x2} ${y2} L ${x2i} ${y2i} A ${r} ${r} 0 ${lg} 0 ${x1i} ${y1i} Z`;
  }

  let cursor = 0;
  const segments = repCalls.map(({ rep, calls }) => {
    const pct = total > 0 ? calls / total : 0;
    const path = describeArc(cursor, pct);
    cursor += pct;
    return { rep, calls, pct, path };
  });

  return (
    <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 16, padding: "20px 24px", display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size}>
          {total === 0
            ? <circle cx={cx} cy={cy} r={(R + r) / 2} fill="none" stroke="#222" strokeWidth={R - r} />
            : segments.map(({ rep, path }) => path && <path key={rep} d={path} fill={REP_COLORS[rep].main} />)
          }
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{total}</div>
          <div style={{ fontSize: 11, color: "#555", marginTop: 3 }}>{centerLabel}</div>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#555", marginBottom: 14, textTransform: "uppercase", letterSpacing: 1.2 }}>Calls by Rep</div>
        {repCalls.map(({ rep, calls }) => (
          <div key={rep} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: REP_COLORS[rep].main, flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: 14, color: "#bbb" }}>{rep}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: REP_COLORS[rep].dot, minWidth: 28, textAlign: "right" }}>{calls}</div>
            <div style={{ fontSize: 12, color: "#444", minWidth: 34, textAlign: "right" }}>
              {total > 0 ? Math.round((calls / total) * 100) + "%" : "—"}
            </div>
          </div>
        ))}
        {total === 0 && <div style={{ fontSize: 12, color: "#444", marginTop: 4 }}>Log calls to see the breakdown.</div>}
      </div>
    </div>
  );
}

// ── UI Primitives ────────────────────────────────────────────
function Badge({ stage }) {
  const c = STAGE_COLORS[stage] || STAGE_COLORS["New Lead"];
  return <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>{stage}</span>;
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "14px 16px", flex: 1, minWidth: 100 }}>
      <div style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 600, color: accent || "#d0d0d0", lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#3a3a3a", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#141414", border: "1px solid #2a2a2a", borderRadius: 14, padding: "24px 28px", width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontWeight: 600, fontSize: 16, color: "#e0e0e0" }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#555", padding: 0, lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Inp({ label, ...props }) {
  const base = { width: "100%", padding: "7px 10px", borderRadius: 7, border: "1px solid #2a2a2a", background: "#0d0d0d", color: "#e0e0e0", fontSize: 14, boxSizing: "border-box" };
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <div style={{ fontSize: 12, color: "#777", marginBottom: 4, fontWeight: 500 }}>{label}</div>}
      {props.as === "select"   ? <select   {...props} as={undefined} style={base}>{props.children}</select>
      : props.as === "textarea" ? <textarea {...props} as={undefined} style={{ ...base, minHeight: 70, resize: "vertical" }} />
      :                           <input    {...props}               style={base} />}
    </div>
  );
}

const BTN = {
  primary:   { background: "#185FA5", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 600, fontSize: 14, cursor: "pointer" },
  secondary: { background: "#1a1a1a", color: "#bbb", border: "1px solid #2a2a2a", borderRadius: 8, padding: "7px 16px", fontWeight: 500, fontSize: 14, cursor: "pointer" },
  danger:    { background: "#1e0a0a", color: "#ff6b6b", border: "1px solid #4a1a1a", borderRadius: 8, padding: "7px 14px", fontWeight: 500, fontSize: 13, cursor: "pointer" },
};

// ── Main App ─────────────────────────────────────────────
export default function App() {
  const [tab, setTab]                 = useState("metrics");
  const [leads, setLeads]             = useState([]);
  const [callLogs, setCallLogs]       = useState([]);
  const [showAddLead, setShowAddLead] = useState(false);
  const [showLogCall, setShowLogCall] = useState(false);
  const [editLead, setEditLead]       = useState(null);
  const [leadForm, setLeadForm]       = useState(EMPTY_LEAD);
  const [logForm, setLogForm]         = useState(EMPTY_LOG);
  const [filterStage, setFilterStage]     = useState("All");
  const [filterRep, setFilterRep]         = useState("All");
  const [pipelineSearch, setPipelineSearch] = useState("");
  const [callsTimeframe, setCallsTimeframe] = useState("week");
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState(null);

  // Tracking state
  const [trackingData, setTrackingData]   = useState([]);
  const [showDayModal, setShowDayModal]   = useState(false);
  const [selectedDay, setSelectedDay]     = useState(null);
  const [dayForm, setDayForm]             = useState({ todos: "", completed_notes: "", is_done: false });
  const [calMonth, setCalMonth]           = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; });
  const [savingDay, setSavingDay]         = useState(false);

  // Login state
  const [isLoggedIn, setIsLoggedIn]   = useState(false);
  const [loginCode, setLoginCode]     = useState("");
  const [loginShake, setLoginShake]   = useState(false);

  function attemptLogin() {
    if (loginCode === "3286472112") {
      setIsLoggedIn(true);
    } else {
      setLoginShake(true);
      setLoginCode("");
      setTimeout(() => setLoginShake(false), 700);
    }
  }

  // ── Load data ──────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: leadsData, error: le }, { data: logsData, error: loge }, { data: trackData }] = await Promise.all([
        supabase.from("leads").select("*").order("created_at", { ascending: false }),
        supabase.from("call_logs").select("*").order("created_at", { ascending: false }),
        supabase.from("daily_tracking").select("*"),
      ]);
      if (le)   throw le;
      if (loge) throw loge;
      setLeads(leadsData || []);
      setCallLogs(logsData || []);
      setTrackingData(trackData || []);
    } catch (e) {
      setError("Could not connect to database: " + e.message);
    }
    setLoading(false);
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  // ── Filtered call logs by timeframe ─────────────────────────────────────────
  const filteredCallLogs = filterLogsByTimeframe(callLogs, callsTimeframe);

  // ── Metrics (all respect the timeframe filter) ────────────────────────────────
  const totalCalls     = filteredCallLogs.reduce((s, l) => s + Number(l.calls     || 0), 0);
  const totalConnected = filteredCallLogs.reduce((s, l) => s + Number(l.connected || 0), 0);
  const totalDemos     = filteredCallLogs.reduce((s, l) => s + Number(l.demos     || 0), 0);
  const totalCloses    = filteredCallLogs.reduce((s, l) => s + Number(l.closes    || 0), 0);
  const connectRate    = totalCalls > 0 ? ((totalConnected / totalCalls) * 100).toFixed(1) : "0.0";
  const closeRate      = totalDemos > 0 ? ((totalCloses    / totalDemos) * 100).toFixed(1) : "0.0";
  const pipelineValue  = leads.filter(l => l.stage !== "Closed Lost").reduce((s, l) => s + Number(l.value || 0), 0);
  const wonValue       = leads.filter(l => l.stage === "Closed Won").reduce((s, l) => s + Number(l.value || 0), 0);

  // ── Leaderboard (respects timeframe) ──────────────────────────────────────────
  const repStats = REPS.map(rep => {
    const logs      = filteredCallLogs.filter(l => l.rep === rep);
    const calls     = logs.reduce((s, l) => s + Number(l.calls     || 0), 0);
    const connected = logs.reduce((s, l) => s + Number(l.connected || 0), 0);
    const demos     = logs.reduce((s, l) => s + Number(l.demos     || 0), 0);
    const closes    = logs.reduce((s, l) => s + Number(l.closes    || 0), 0);
    const won       = leads.filter(l => l.rep === rep && l.stage === "Closed Won").reduce((s, l) => s + Number(l.value || 0), 0);
    return { rep, calls, connected, demos, closes, won };
  }).sort((a, b) => b.closes - a.closes || b.calls - a.calls);

  // ── Filtered leads ─────────────────────────────────────────────────────
  const filteredLeads = leads.filter(l => {
    const q = pipelineSearch.toLowerCase();
    const matchSearch = !q ||
      l.name.toLowerCase().includes(q) ||
      (l.company || "").toLowerCase().includes(q) ||
      (l.phone   || "").includes(q) ||
      (l.notes   || "").toLowerCase().includes(q);
    return (filterStage === "All" || l.stage === filterStage) &&
           (filterRep   === "All" || l.rep   === filterRep) &&
           matchSearch;
  });

  // ── Interested leads for follow-up tracker ─────────────────────────────────────
  const interestedLeads = leads.filter(l => l.stage === "Interested");

  // ── Lead CRUD ──────────────────────────────────────────────────────
  function openAddLead() { setLeadForm(EMPTY_LEAD); setEditLead(null); setShowAddLead(true); }
  function openEditLead(lead) {
    setLeadForm({ name: lead.name, company: lead.company || "", phone: lead.phone || "", stage: lead.stage, rep: lead.rep, notes: lead.notes || "", value: lead.value || "" });
    setEditLead(lead.id);
    setShowAddLead(true);
  }

  async function saveLead() {
    if (!leadForm.name.trim()) return;
    setSaving(true);
    const payload = {
      name: leadForm.name.trim(), company: leadForm.company, phone: leadForm.phone,
      stage: leadForm.stage, rep: leadForm.rep, notes: leadForm.notes, value: Number(leadForm.value) || 0,
    };
    // Record when a lead first enters "Interested" so follow-up days are accurate
    if (leadForm.stage === "Interested") {
      const existing = leads.find(l => l.id === editLead);
      if (!existing || existing.stage !== "Interested") {
        payload.interested_at = new Date().toISOString();
      }
    }
    if (editLead) {
      const { error } = await supabase.from("leads").update(payload).eq("id", editLead);
      if (!error) setLeads(prev => prev.map(l => l.id === editLead ? { ...l, ...payload } : l));
    } else {
      const { data, error } = await supabase.from("leads").insert(payload).select().single();
      if (!error && data) setLeads(prev => [data, ...prev]);
    }
    setSaving(false);
    setShowAddLead(false);
  }

  async function deleteLead(id) {
    await supabase.from("leads").delete().eq("id", id);
    setLeads(prev => prev.filter(l => l.id !== id));
  }

  async function updateLeadStage(id, stage) {
    const payload = { stage };
    // Stamp interested_at when moving to Interested for the first time
    if (stage === "Interested") {
      const existing = leads.find(l => l.id === id);
      if (!existing || existing.stage !== "Interested") {
        payload.interested_at = new Date().toISOString();
      }
    }
    await supabase.from("leads").update(payload).eq("id", id);
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...payload } : l));
  }

  // ── Call log ─────────────────────────────────────────────────────
  async function saveLog() {
    if (!logForm.calls) return;
    setSaving(true);
    const payload = {
      rep: logForm.rep, calls: Number(logForm.calls) || 0, connected: Number(logForm.connected) || 0,
      demos: Number(logForm.demos) || 0, closes: Number(logForm.closes) || 0,
      date: logForm.date || new Date().toISOString().slice(0, 10),
    };
    const { data, error } = await supabase.from("call_logs").insert(payload).select().single();
    if (!error && data) setCallLogs(prev => [data, ...prev]);
    setSaving(false);
    setShowLogCall(false);
    setLogForm(EMPTY_LOG);
  }

  // ── Day tracking ─────────────────────────────────────────────────────
  function openDayModal(rep, dateStr, existingEntry) {
    setSelectedDay({ rep, date: dateStr });
    setDayForm({
      todos:           existingEntry?.todos           || "",
      completed_notes: existingEntry?.completed_notes || "",
      is_done:         existingEntry?.is_done         || false,
    });
    setShowDayModal(true);
  }

  async function saveDayEntry() {
    if (!selectedDay) return;
    setSavingDay(true);
    const { data, error } = await supabase
      .from("daily_tracking")
      .upsert(
        { rep: selectedDay.rep, date: selectedDay.date, todos: dayForm.todos, completed_notes: dayForm.completed_notes, is_done: dayForm.is_done },
        { onConflict: "rep,date" }
      )
      .select().single();
    if (!error && data) {
      setTrackingData(prev => {
        const rest = prev.filter(t => !(t.rep === selectedDay.rep && t.date === selectedDay.date));
        return [...rest, data];
      });
    }
    setSavingDay(false);
    setShowDayModal(false);
  }

  function prevMonth() { setCalMonth(m => { const d = new Date(m); d.setMonth(d.getMonth() - 1); return d; }); }
  function nextMonth() { setCalMonth(m => { const d = new Date(m); d.setMonth(d.getMonth() + 1); return d; }); }

  const TABS = [
    { id: "metrics",     label: "📊 Metrics"     },
    { id: "pipeline",    label: "🏗️ Pipeline"    },
    { id: "leaderboard", label: "🏆 Leaderboard" },
    { id: "tracking",    label: "📅 Tracking"    },
  ];
  const selStyle = { padding: "7px 12px", borderRadius: 7, border: "1px solid #2a2a2a", background: "#111", color: "#bbb", fontSize: 13 };
  const tfLabel  = TIMEFRAMES.find(t => t.value === callsTimeframe)?.label || "";

  // ── Holographic Login Screen ──────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "#010811", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <style>{`
          @keyframes scan   { 0% { top: -2% } 100% { top: 102% } }
          @keyframes pulse  { 0%,100% { filter: drop-shadow(0 0 10px #00d4ff) drop-shadow(0 0 20px #0088ff44); opacity: .85; } 50% { filter: drop-shadow(0 0 24px #00d4ff) drop-shadow(0 0 50px #00d4ff66); opacity: 1; } }
          @keyframes shake  { 0%,100% { transform: translateX(0) } 20%,60% { transform: translateX(-10px) } 40%,80% { transform: translateX(10px) } }
          @keyframes blink  { 0%,100% { opacity: 1 } 50% { opacity: 0 } }
          @keyframes gridpulse { 0%,100% { opacity: .04 } 50% { opacity: .09 } }
          @keyframes spin   { to { transform: rotate(360deg); } }
          .login-btn:hover  { background: #00d4ff22 !important; box-shadow: 0 0 24px #00d4ff55 !important; }
          input.holo-input::placeholder { color: #00d4ff33; }
          input.holo-input:focus { border-color: #00d4ffaa !important; box-shadow: 0 0 30px #00d4ff33, inset 0 0 12px #00d4ff0d !important; outline: none; }
        `}</style>

        {/* Grid background */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(#00d4ff 1px, transparent 1px), linear-gradient(90deg, #00d4ff 1px, transparent 1px)", backgroundSize: "44px 44px", animation: "gridpulse 4s ease-in-out infinite", pointerEvents: "none" }} />

        {/* Radial vignette */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 30%, #010811 80%)", pointerEvents: "none" }} />

        {/* Scan line */}
        <div style={{ position: "absolute", left: 0, right: 0, height: 3, background: "linear-gradient(transparent, #00d4ff55, transparent)", boxShadow: "0 0 18px #00d4ffaa", animation: "scan 3.5s linear infinite", zIndex: 2, pointerEvents: "none" }} />

        {/* Corner HUD brackets */}
        {[["top:18px","left:18px","borderTop","borderLeft"],["top:18px","right:18px","borderTop","borderRight"],["bottom:18px","left:18px","borderBottom","borderLeft"],["bottom:18px","right:18px","borderBottom","borderRight"]].map((c, i) => {
          const pos = {}; c.slice(0,2).forEach(p => { const [k,v] = p.split(":"); pos[k] = v; });
          const borders = {}; c.slice(2).forEach(b => { borders[b] = "2px solid #00d4ff33"; });
          return <div key={i} style={{ position: "absolute", width: 44, height: 44, ...pos, ...borders, pointerEvents: "none", zIndex: 2 }} />;
        })}

        {/* Top status label */}
        <div style={{ position: "absolute", top: 26, left: "50%", transform: "translateX(-50%)", fontSize: 9, color: "#00d4ff44", letterSpacing: 4, textTransform: "uppercase", whiteSpace: "nowrap", zIndex: 3 }}>
          FIRSTLINE SYSTEMS · SECURE ACCESS PORTAL
        </div>

        {/* Main content */}
        <div style={{ position: "relative", zIndex: 4, display: "flex", flexDirection: "column", alignItems: "center", gap: 36 }}>

          {/* Firstline Logo SVG — holographic */}
          <div style={{ animation: "pulse 2.8s ease-in-out infinite" }}>
            <svg viewBox="0 0 100 100" width="130" height="130" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Outer frame */}
              <rect x="5" y="5" width="90" height="90" stroke="#00d4ff" strokeWidth="2.5" fill="#00d4ff06" />
              {/* Inner top-right notch */}
              <polyline points="62,5 95,5 95,38" stroke="#00d4ff" strokeWidth="2.5" fill="none" opacity="0.4"/>
              {/* Vertical left bar */}
              <rect x="15" y="15" width="20" height="70" fill="#00d4ff" />
              {/* Top horizontal bar */}
              <rect x="35" y="15" width="50" height="16" fill="#00d4ff" />
              {/* Middle horizontal bar */}
              <rect x="35" y="46" width="34" height="14" fill="#00d4ff" />
              {/* Notch corner accent */}
              <line x1="62" y1="5" x2="95" y2="38" stroke="#00d4ff" strokeWidth="1.5" opacity="0.5"/>
            </svg>
          </div>

          {/* Title block */}
          <div style={{ textAlign: "center", lineHeight: 1.3 }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: "#00d4ff", letterSpacing: 8, textTransform: "uppercase", textShadow: "0 0 20px #00d4ff, 0 0 50px #0088ff66" }}>FIRSTLINE</div>
            <div style={{ fontSize: 10, color: "#00d4ff55", letterSpacing: 6, marginTop: 6, textTransform: "uppercase" }}>INTELLIGENCE · CRM</div>
          </div>

          {/* Code input area */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, animation: loginShake ? "shake 0.6s ease" : "none" }}>
            <div style={{ fontSize: 9, color: "#00d4ff44", letterSpacing: 5, textTransform: "uppercase" }}>ENTER ACCESS CODE</div>

            <input
              className="holo-input"
              type="password"
              value={loginCode}
              onChange={e => setLoginCode(e.target.value)}
              onKeyDown={e => e.key === "Enter" && attemptLogin()}
              maxLength={20}
              autoFocus
              placeholder="· · · · · · · · · ·"
              style={{
                background: "#00d4ff08",
                border: `1px solid ${loginShake ? "#ff444488" : "#00d4ff44"}`,
                borderRadius: 2,
                color: "#00d4ff",
                fontSize: 24,
                letterSpacing: 10,
                padding: "14px 28px",
                width: 280,
                textAlign: "center",
                boxShadow: loginShake ? "0 0 24px #ff444433, inset 0 0 12px #ff44440a" : "0 0 20px #00d4ff1a, inset 0 0 10px #00d4ff08",
                caretColor: "#00d4ff",
                transition: "all .3s",
              }}
            />

            {loginShake && (
              <div style={{ color: "#ff4444", fontSize: 10, letterSpacing: 4, textTransform: "uppercase", animation: "blink 0.4s ease 4" }}>
                ⚠ ACCESS DENIED
              </div>
            )}

            <button
              className="login-btn"
              onClick={attemptLogin}
              style={{ background: "transparent", border: "1px solid #00d4ff44", color: "#00d4ff", padding: "11px 48px", letterSpacing: 5, fontSize: 10, textTransform: "uppercase", cursor: "pointer", borderRadius: 2, transition: "all .2s", boxShadow: "none", marginTop: 4 }}
            >
              AUTHENTICATE
            </button>
          </div>
        </div>

        {/* Bottom status */}
        <div style={{ position: "absolute", bottom: 26, left: "50%", transform: "translateX(-50%)", fontSize: 9, color: "#00d4ff2a", letterSpacing: 3, whiteSpace: "nowrap", zIndex: 3 }}>
          AES-256 · ENCRYPTED CHANNEL · ACTIVE
        </div>
      </div>
    );
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0a0a0a", flexDirection: "column", gap: 12 }}>
      <div style={{ width: 36, height: 36, border: "3px solid #1e1e1e", borderTop: "3px solid #378ADD", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ color: "#444", fontSize: 14 }}>Connecting to database…</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  if (error) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0a0a0a", flexDirection: "column", gap: 12, padding: 24 }}>
      <div style={{ color: "#ff6b6b", fontSize: 16, fontWeight: 600 }}>Connection Error</div>
      <div style={{ color: "#555", fontSize: 13, textAlign: "center", maxWidth: 400 }}>{error}</div>
      <button style={BTN.primary} onClick={loadData}>Retry</button>
    </div>
  );

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: "#0a0a0a", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: "#0d0d0d", borderBottom: "1px solid #1a1a1a", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 20, color: "#e8e8e8", letterSpacing: -0.5 }}>📞 Firstline A.I.</div>
          <div style={{ fontSize: 12, color: "#3a3a3a", marginTop: 2 }}>{leads.length} leads · {totalCalls} calls ({tfLabel.toLowerCase()})</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={BTN.secondary} onClick={() => setShowLogCall(true)}>+ Log Calls</button>
          <button style={BTN.primary}   onClick={openAddLead}>+ Add Lead</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: "#0d0d0d", borderBottom: "1px solid #1a1a1a", padding: "0 24px", display: "flex", gap: 4 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: "12px 16px", fontSize: 14, fontWeight: tab === t.id ? 600 : 400, color: tab === t.id ? "#60aaff" : "#444", borderBottom: tab === t.id ? "2px solid #60aaff" : "2px solid transparent", transition: "all .15s" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "20px 24px", maxWidth: 1100, margin: "0 auto" }}>

        {/* ── METRICS ── */}
        {tab === "metrics" && (
          <div>
            {/* Timeframe toggle controls everything on this tab */}
            <TimeframeToggle value={callsTimeframe} onChange={setCallsTimeframe} />

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
              <StatCard label="Total Calls"  value={totalCalls.toLocaleString()} sub={tfLabel.toLowerCase()} />
              <StatCard label="Connect Rate" value={connectRate + "%"} sub={`${totalConnected} connected`} accent="#60aaff" />
              <StatCard label="Demos Set"    value={totalDemos} sub="scheduled" accent="#7bc95a" />
              <StatCard label="Close Rate"   value={closeRate + "%"} sub={`${totalCloses} closes`} accent="#3dd68c" />
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
              <StatCard label="Pipeline Value" value={"$" + pipelineValue.toLocaleString()} sub="open deals"  accent="#c97fff" />
              <StatCard label="Won Revenue"    value={"$" + wonValue.toLocaleString()}       sub="closed won"  accent="#3dd68c" />
              <StatCard label="Active Leads"   value={leads.filter(l => !["Closed Won", "Closed Lost"].includes(l.stage)).length} sub="in progress" />
              <StatCard label="Closed Won"     value={leads.filter(l => l.stage === "Closed Won").length} sub="deals" accent="#3dd68c" />
            </div>

            {/* Calls wheel — filtered by timeframe toggle above */}
            <div style={{ marginBottom: 20 }}>
              <DonutChart callLogs={filteredCallLogs} timeframe={callsTimeframe} />
            </div>

            {/* WhatsApp Follow-up Tracker — only shows when there are Interested leads */}
            {interestedLeads.length > 0 && (
              <div style={{ background: "#111", border: "1px solid #1e3a1e", borderRadius: 12, padding: "18px 20px", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: "#d0d0d0" }}>💬 WhatsApp Follow-ups</div>
                  <div style={{ background: "#639922", color: "#fff", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>{interestedLeads.length}</div>
                </div>
                <div style={{ fontSize: 12, color: "#555", marginBottom: 14 }}>
                  Interested leads — D1 / D3 / D7 / D10 checkpoints · tap WhatsApp to send a quick message
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {interestedLeads.map(lead => {
                    const baseDate = lead.interested_at || lead.created_at;
                    const days = daysAgo(baseDate);
                    const nextFollowup = FOLLOWUP_DAYS.find(d => d > days);
                    const rc = REP_COLORS[lead.rep];
                    return (
                      <div key={lead.id} style={{ background: "#0d0d0d", border: "1px solid #1e3a1e", borderLeft: "3px solid #639922", borderRadius: 10, padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <div style={{ flex: 1, minWidth: 140 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: "#e0e0e0" }}>{lead.name}</div>
                            <div style={{ fontSize: 12, color: "#555", marginTop: 1 }}>{lead.phone || "No phone on file"}</div>
                          </div>
                          <div style={{ fontSize: 12, color: rc?.dot || "#888" }}>{lead.rep}</div>

                          {/* Day checkpoints */}
                          <div style={{ display: "flex", gap: 4 }}>
                            {FOLLOWUP_DAYS.map(d => {
                              const done = days >= d;
                              return (
                                <div key={d} style={{
                                  fontSize: 10, padding: "2px 7px", borderRadius: 10, fontWeight: 700,
                                  background: done ? "#1a3a1a" : "#111",
                                  border: `1px solid ${done ? "#3a7a3a" : "#2a2a2a"}`,
                                  color: done ? "#7bc95a" : "#444",
                                }}>
                                  D{d}{done ? " ✓" : ""}
                                </div>
                              );
                            })}
                          </div>

                          {/* Days counter */}
                          <div style={{ fontSize: 11, color: "#555", minWidth: 64, textAlign: "right" }}>
                            {days === 0 ? "today" : `${days}d ago`}
                            {nextFollowup && (
                              <div style={{ color: "#ff9a55", fontSize: 10, marginTop: 1 }}>
                                D{nextFollowup} in {nextFollowup - days}d
                              </div>
                            )}
                          </div>

                          {/* WhatsApp button */}
                          {lead.phone ? (
                            <button onClick={() => openWhatsApp(lead.phone, lead.name)}
                              style={{ background: "#1a4a1a", border: "1px solid #2a7a2a", color: "#7bc95a", borderRadius: 7, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}>
                              💬 WhatsApp
                            </button>
                          ) : (
                            <span style={{ fontSize: 11, color: "#333" }}>Add phone to use</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pipeline by Stage */}
            <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "18px 20px", marginBottom: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: "#d0d0d0", marginBottom: 14 }}>Pipeline by Stage</div>
              {STAGES.map(stage => {
                const count = leads.filter(l => l.stage === stage).length;
                const pct   = leads.length > 0 ? (count / leads.length) * 100 : 0;
                const c     = STAGE_COLORS[stage];
                return (
                  <div key={stage} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: "#999" }}>{stage}</span>
                      <span style={{ color: "#444" }}>{count} lead{count !== 1 ? "s" : ""}</span>
                    </div>
                    <div style={{ background: "#1a1a1a", borderRadius: 4, height: 8, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: c.border, borderRadius: 4, transition: "width .4s" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recent Call Sessions */}
            <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: "#d0d0d0", marginBottom: 14 }}>Recent Call Sessions</div>
              {callLogs.length === 0 ? (
                <div style={{ color: "#333", fontSize: 14, padding: "20px 0", textAlign: "center" }}>No sessions yet — click "+ Log Calls" to start.</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #1e1e1e" }}>
                        {["Date", "Rep", "Calls", "Connected", "Demos", "Closes"].map(h => (
                          <th key={h} style={{ padding: "6px 12px", textAlign: "left", color: "#444", fontWeight: 500 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {callLogs.slice(0, 20).map(log => (
                        <tr key={log.id} style={{ borderBottom: "1px solid #161616" }}>
                          <td style={{ padding: "8px 12px", color: "#666" }}>{log.date}</td>
                          <td style={{ padding: "8px 12px", fontWeight: 600, color: REP_COLORS[log.rep]?.dot || "#ccc" }}>{log.rep}</td>
                          <td style={{ padding: "8px 12px", color: "#aaa" }}>{log.calls}</td>
                          <td style={{ padding: "8px 12px", color: "#60aaff" }}>{log.connected}</td>
                          <td style={{ padding: "8px 12px", color: "#7bc95a" }}>{log.demos}</td>
                          <td style={{ padding: "8px 12px", color: "#3dd68c", fontWeight: 600 }}>{log.closes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PIPELINE ── */}
        {tab === "pipeline" && (
          <div>
            {/* Search bar */}
            <div style={{ marginBottom: 10, position: "relative" }}>
              <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: "#444", pointerEvents: "none" }}>🔍</span>
              <input
                type="text"
                placeholder="Search by name, company, phone, or notes…"
                value={pipelineSearch}
                onChange={e => setPipelineSearch(e.target.value)}
                style={{ width: "100%", padding: "9px 12px 9px 36px", borderRadius: 8, border: "1px solid #2a2a2a", background: "#111", color: "#e0e0e0", fontSize: 14, boxSizing: "border-box", outline: "none" }}
              />
              {pipelineSearch && (
                <button onClick={() => setPipelineSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
              <select value={filterStage} onChange={e => setFilterStage(e.target.value)} style={selStyle}>
                <option value="All">All Stages</option>
                {STAGES.map(s => <option key={s}>{s}</option>)}
              </select>
              <select value={filterRep} onChange={e => setFilterRep(e.target.value)} style={selStyle}>
                <option value="All">All Reps</option>
                {REPS.map(r => <option key={r}>{r}</option>)}
              </select>
              <span style={{ fontSize: 13, color: "#333", marginLeft: 4 }}>{filteredLeads.length} lead{filteredLeads.length !== 1 ? "s" : ""}{pipelineSearch ? ` for "${pipelineSearch}"` : ""}</span>
            </div>

            {filteredLeads.length === 0 ? (
              <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: 40, textAlign: "center", color: "#333", fontSize: 14 }}>
                No leads yet. Click "+ Add Lead" to get started.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {filteredLeads.map(lead => {
                  const rc = REP_COLORS[lead.rep];
                  const baseDate = lead.interested_at || lead.created_at;
                  const days = lead.stage === "Interested" ? daysAgo(baseDate) : null;

                  return (
                    <div key={lead.id} style={{ background: "#111", border: "1px solid #1e1e1e", borderLeft: `3px solid ${rc?.main || "#333"}`, borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>

                      {/* Lead info */}
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <div style={{ fontWeight: 600, fontSize: 15, color: "#e0e0e0", marginBottom: 2 }}>{lead.name}</div>
                        <div style={{ fontSize: 13, color: "#777" }}>{lead.company}</div>
                        {lead.phone && <div style={{ fontSize: 12, color: "#444", marginTop: 2 }}>{lead.phone}</div>}
                        {/* Date added */}
                        {lead.created_at && (
                          <div style={{ fontSize: 11, color: "#2e2e2e", marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
                            <span>📅</span>
                            <span>Added {fmtDate(lead.created_at)}</span>
                          </div>
                        )}
                      </div>

                      {/* Stage badge + rep + value */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-end", minWidth: 130 }}>
                        <Badge stage={lead.stage} />
                        <div style={{ fontSize: 12, color: rc?.dot || "#888" }}>{lead.rep}</div>
                        {lead.value > 0 && <div style={{ fontSize: 13, fontWeight: 600, color: "#3dd68c" }}>${Number(lead.value).toLocaleString()}</div>}
                      </div>

                      {/* Notes */}
                      {lead.notes && (
                        <div style={{ width: "100%", fontSize: 12, color: "#777", background: "#0d0d0d", borderRadius: 6, padding: "6px 10px", marginTop: 4 }}>
                          {lead.notes}
                        </div>
                      )}

                      {/* WhatsApp follow-up bar — only for Interested leads */}
                      {lead.stage === "Interested" && (
                        <div style={{ width: "100%", padding: "8px 10px", background: "#0a1a0a", border: "1px solid #1e3a1e", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <div style={{ display: "flex", gap: 4 }}>
                            {FOLLOWUP_DAYS.map(d => {
                              const done = days !== null && days >= d;
                              return (
                                <div key={d} style={{
                                  fontSize: 10, padding: "2px 6px", borderRadius: 10, fontWeight: 700,
                                  background: done ? "#1a3a1a" : "#111",
                                  border: `1px solid ${done ? "#3a7a3a" : "#2a2a2a"}`,
                                  color: done ? "#7bc95a" : "#444",
                                }}>
                                  D{d}{done ? "✓" : ""}
                                </div>
                              );
                            })}
                          </div>
                          <div style={{ fontSize: 11, color: "#444" }}>
                            {days !== null ? (days === 0 ? "interested today" : `${days}d since interested`) : ""}
                          </div>
                          {lead.phone && (
                            <button onClick={() => openWhatsApp(lead.phone, lead.name)}
                              style={{ marginLeft: "auto", background: "#1a4a1a", border: "1px solid #2a7a2a", color: "#7bc95a", borderRadius: 6, padding: "3px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                              💬 WA
                            </button>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{ display: "flex", gap: 6, width: "100%", marginTop: 4 }}>
                        <select value={lead.stage} onChange={e => updateLeadStage(lead.id, e.target.value)}
                          style={{ flex: 1, padding: "5px 8px", borderRadius: 6, border: "1px solid #2a2a2a", background: "#0d0d0d", color: "#ccc", fontSize: 12 }}>
                          {STAGES.map(s => <option key={s}>{s}</option>)}
                        </select>
                        <button style={BTN.secondary} onClick={() => openEditLead(lead)}>Edit</button>
                        <button style={BTN.danger}    onClick={() => deleteLead(lead.id)}>Remove</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── LEADERBOARD ── */}
        {tab === "leaderboard" && (
          <div>
            <TimeframeToggle value={callsTimeframe} onChange={setCallsTimeframe} />
            <div style={{ marginBottom: 20 }}>
              <DonutChart callLogs={filteredCallLogs} timeframe={callsTimeframe} />
            </div>
            <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e1e1e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#e0e0e0" }}>🏆 Team Leaderboard</div>
                <div style={{ fontSize: 12, color: "#333" }}>Ranked by closes · {tfLabel}</div>
              </div>
              {repStats.map((r, i) => {
                const medals = ["🥇", "🥈", "🥉"];
                const rc = REP_COLORS[r.rep];
                return (
                  <div key={r.rep} style={{ padding: "18px 20px", borderBottom: "1px solid #161616", background: i === 0 ? "#141414" : "transparent", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", borderLeft: `3px solid ${rc?.main || "#333"}` }}>
                    <div style={{ fontSize: 24, width: 32, textAlign: "center" }}>{medals[i] || `#${i + 1}`}</div>
                    <div style={{ fontWeight: 700, fontSize: 17, minWidth: 100, color: rc?.dot || "#ccc" }}>{r.rep}</div>
                    <div style={{ display: "flex", gap: 24, flex: 1, flexWrap: "wrap" }}>
                      {[
                        { val: r.calls,                      label: "Calls",     color: "#888" },
                        { val: r.connected,                  label: "Connected", color: "#60aaff" },
                        { val: r.demos,                      label: "Demos",     color: "#7bc95a" },
                        { val: r.closes,                     label: "Closes",    color: "#3dd68c" },
                        { val: `$${r.won.toLocaleString()}`, label: "Won",       color: "#c97fff" },
                      ].map(({ val, label, color }) => (
                        <div key={label} style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 20, fontWeight: 700, color }}>{val}</div>
                          <div style={{ fontSize: 11, color: "#3a3a3a" }}>{label}</div>
                        </div>
                      ))}
                    </div>
                    {r.calls > 0 && (
                      <div style={{ textAlign: "right", minWidth: 60 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#7bc95a" }}>{Math.round((r.connected / r.calls) * 100)}%</div>
                        <div style={{ fontSize: 11, color: "#3a3a3a" }}>Connect</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {(() => {
                const topCaller = [...repStats].sort((a, b) => b.calls  - a.calls)[0];
                const topCloser = [...repStats].sort((a, b) => b.closes - a.closes)[0];
                const topEarner = [...repStats].sort((a, b) => b.won    - a.won)[0];
                return [
                  { label: "📞 Most Calls", val: topCaller?.calls  > 0 ? `${topCaller.rep} (${topCaller.calls})`                  : "—", color: REP_COLORS[topCaller?.rep]?.dot },
                  { label: "🤝 Top Closer", val: topCloser?.closes > 0 ? `${topCloser.rep} (${topCloser.closes})`                 : "—", color: REP_COLORS[topCloser?.rep]?.dot },
                  { label: "💰 Top Earner", val: topEarner?.won    > 0 ? `${topEarner.rep} ($${topEarner.won.toLocaleString()})` : "—", color: REP_COLORS[topEarner?.rep]?.dot },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, minWidth: 140, background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "12px 16px" }}>
                    <div style={{ fontSize: 12, color: "#444", marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: s.color || "#ccc" }}>{s.val}</div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* ── TRACKING ── */}
        {tab === "tracking" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 17, color: "#d0d0d0", marginBottom: 6 }}>📅 Daily Tracking</div>
              <div style={{ fontSize: 13, color: "#444" }}>
                Click any day to write your to-do's and log what you got done.
                Days auto-turn <span style={{ color: "#ff6b6b" }}>red</span> if uncompleted and past,
                <span style={{ color: "#3dd68c" }}> green</span> when you mark them done.
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {REPS.map(rep => (
                <RepCalendar
                  key={rep}
                  rep={rep}
                  trackingData={trackingData}
                  month={calMonth}
                  onDayClick={openDayModal}
                  onPrevMonth={prevMonth}
                  onNextMonth={nextMonth}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── ADD/EDIT LEAD MODAL ── */}
      {showAddLead && (
        <Modal title={editLead ? "Edit Lead" : "Add New Lead"} onClose={() => setShowAddLead(false)}>
          <Inp label="Contact Name *" type="text"   placeholder="Jane Smith"        value={leadForm.name}    onChange={e => setLeadForm(f => ({ ...f, name:    e.target.value }))} />
          <Inp label="Company"        type="text"   placeholder="Acme Corp"         value={leadForm.company} onChange={e => setLeadForm(f => ({ ...f, company: e.target.value }))} />
          <Inp label="Phone"          type="text"   placeholder="+1 (555) 000-0000" value={leadForm.phone}   onChange={e => setLeadForm(f => ({ ...f, phone:   e.target.value }))} />
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <Inp label="Stage" as="select" value={leadForm.stage} onChange={e => setLeadForm(f => ({ ...f, stage: e.target.value }))}>
                {STAGES.map(s => <option key={s}>{s}</option>)}
              </Inp>
            </div>
            <div style={{ flex: 1 }}>
              <Inp label="Assigned Rep" as="select" value={leadForm.rep} onChange={e => setLeadForm(f => ({ ...f, rep: e.target.value }))}>
                {REPS.map(r => <option key={r}>{r}</option>)}
              </Inp>
            </div>
          </div>
          <Inp label="Deal Value ($)" type="number" placeholder="0" value={leadForm.value} onChange={e => setLeadForm(f => ({ ...f, value: e.target.value }))} />
          <Inp label="Notes" as="textarea" placeholder="Call notes, next steps..." value={leadForm.notes} onChange={e => setLeadForm(f => ({ ...f, notes: e.target.value }))} />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <button style={BTN.secondary} onClick={() => setShowAddLead(false)}>Cancel</button>
            <button style={{ ...BTN.primary, opacity: saving ? 0.6 : 1 }} onClick={saveLead} disabled={saving}>
              {saving ? "Saving…" : editLead ? "Save Changes" : "Add Lead"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── LOG CALLS MODAL ── */}
      {showLogCall && (
        <Modal title="Log Call Session" onClose={() => setShowLogCall(false)}>
          <div style={{ fontSize: 13, color: "#555", marginBottom: 14 }}>Record today's activity for any team member.</div>
          <Inp label="Rep" as="select" value={logForm.rep} onChange={e => setLogForm(f => ({ ...f, rep: e.target.value }))}>
            {REPS.map(r => <option key={r}>{r}</option>)}
          </Inp>
          <Inp label="Date" type="date" value={logForm.date || new Date().toISOString().slice(0, 10)} onChange={e => setLogForm(f => ({ ...f, date: e.target.value }))} />
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><Inp label="Total Calls *" type="number" min="0" placeholder="0" value={logForm.calls}     onChange={e => setLogForm(f => ({ ...f, calls:     e.target.value }))} /></div>
            <div style={{ flex: 1 }}><Inp label="Connected"     type="number" min="0" placeholder="0" value={logForm.connected} onChange={e => setLogForm(f => ({ ...f, connected: e.target.value }))} /></div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><Inp label="Demos Set" type="number" min="0" placeholder="0" value={logForm.demos}  onChange={e => setLogForm(f => ({ ...f, demos:  e.target.value }))} /></div>
            <div style={{ flex: 1 }}><Inp label="Closes"    type="number" min="0" placeholder="0" value={logForm.closes} onChange={e => setLogForm(f => ({ ...f, closes: e.target.value }))} /></div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <button style={BTN.secondary} onClick={() => { setShowLogCall(false); setLogForm(EMPTY_LOG); }}>Cancel</button>
            <button style={{ ...BTN.primary, opacity: saving ? 0.6 : 1 }} onClick={saveLog} disabled={saving}>
              {saving ? "Saving…" : "Log Session"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── DAY TRACKING MODAL ── */}
      {showDayModal && selectedDay && (
        <Modal
          title={`${selectedDay.rep} — ${new Date(selectedDay.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`}
          onClose={() => setShowDayModal(false)}
        >
          {/* Status indicator */}
          {dayForm.is_done && (
            <div style={{ background: "#0a2a15", border: "1px solid #2a7a3a", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: 13, color: "#3dd68c", fontWeight: 600 }}>
              ✓ This day is marked complete
            </div>
          )}

          <div style={{ fontSize: 12, color: "#555", marginBottom: 6, fontWeight: 500 }}>📝 To-do's for the day</div>
          <textarea
            value={dayForm.todos}
            onChange={e => setDayForm(f => ({ ...f, todos: e.target.value }))}
            placeholder={"What do you need to get done today?\n\n- \n- \n- "}
            style={{ width: "100%", minHeight: 110, padding: "9px 11px", borderRadius: 7, border: "1px solid #2a2a2a", background: "#0d0d0d", color: "#e0e0e0", fontSize: 13, boxSizing: "border-box", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
          />

          <div style={{ fontSize: 12, color: "#555", marginBottom: 6, fontWeight: 500, marginTop: 16 }}>✅ What I got done</div>
          <textarea
            value={dayForm.completed_notes}
            onChange={e => setDayForm(f => ({ ...f, completed_notes: e.target.value }))}
            placeholder={"What did you actually accomplish today?\n\n- \n- \n- "}
            style={{ width: "100%", minHeight: 110, padding: "9px 11px", borderRadius: 7, border: "1px solid #2a2a2a", background: "#0d0d0d", color: "#e0e0e0", fontSize: 13, boxSizing: "border-box", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
          />

          <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18, cursor: "pointer", padding: "10px 12px", background: dayForm.is_done ? "#0a2a15" : "#111", borderRadius: 8, border: `1px solid ${dayForm.is_done ? "#2a7a3a" : "#2a2a2a"}`, transition: "all .2s" }}>
            <input
              type="checkbox"
              checked={dayForm.is_done}
              onChange={e => setDayForm(f => ({ ...f, is_done: e.target.checked }))}
              style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#3dd68c" }}
            />
            <span style={{ fontSize: 13, color: dayForm.is_done ? "#3dd68c" : "#888", fontWeight: 600 }}>
              {dayForm.is_done ? "✓ Marked as complete — day will glow green" : "Mark this day as complete"}
            </span>
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button style={BTN.secondary} onClick={() => setShowDayModal(false)}>Cancel</button>
            <button style={{ ...BTN.primary, opacity: savingDay ? 0.6 : 1 }} onClick={saveDayEntry} disabled={savingDay}>
              {savingDay ? "Saving…" : "Save"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
