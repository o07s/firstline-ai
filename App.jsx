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

// ── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ callLogs }) {
  const size = 180, cx = 90, cy = 90, R = 72, r = 48;

  const now = new Date();
  const dow = (now.getDay() + 6) % 7;
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - dow); weekStart.setHours(0,0,0,0);
  const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);
  const fmt = d => d.toISOString().slice(0,10);
  const ws = fmt(weekStart), we = fmt(weekEnd);

  const weekLogs = callLogs.filter(l => l.date >= ws && l.date < we);
  const repCalls = REPS.map(rep => ({
    rep,
    calls: weekLogs.filter(l => l.rep === rep).reduce((s, l) => s + Number(l.calls || 0), 0),
  }));
  const total = repCalls.reduce((s, r) => s + r.calls, 0);

  function describeArc(startPct, pct) {
    if (pct <= 0) return null;
    const gap = 0.008;
    const s = startPct + gap / 2, e = startPct + pct - gap / 2;
    if (e <= s) return null;
    const a1 = s * 2 * Math.PI - Math.PI / 2, a2 = e * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
    const x2 = cx + R * Math.cos(a2), y2 = cy + R * Math.sin(a2);
    const x1i= cx + r * Math.cos(a1), y1i= cy + r * Math.sin(a1);
    const x2i= cx + r * Math.cos(a2), y2i= cy + r * Math.sin(a2);
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
            ? <circle cx={cx} cy={cy} r={(R+r)/2} fill="none" stroke="#222" strokeWidth={R-r} />
            : segments.map(({ rep, path }) => path && <path key={rep} d={path} fill={REP_COLORS[rep].main} />)
          }
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{total}</div>
          <div style={{ fontSize: 11, color: "#555", marginTop: 3 }}>this week</div>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#555", marginBottom: 14, textTransform: "uppercase", letterSpacing: 1.2 }}>Weekly Calls by Rep</div>
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
        {total === 0 && <div style={{ fontSize: 12, color: "#444", marginTop: 4 }}>Log calls to see the weekly breakdown.</div>}
      </div>
    </div>
  );
}

// ── UI Primitives ────────────────────────────────────────────────────────────
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

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]               = useState("metrics");
  const [leads, setLeads]           = useState([]);
  const [callLogs, setCallLogs]     = useState([]);
  const [showAddLead, setShowAddLead] = useState(false);
  const [showLogCall, setShowLogCall] = useState(false);
  const [editLead, setEditLead]     = useState(null);
  const [leadForm, setLeadForm]     = useState(EMPTY_LEAD);
  const [logForm, setLogForm]       = useState(EMPTY_LOG);
  const [filterStage, setFilterStage] = useState("All");
  const [filterRep, setFilterRep]   = useState("All");
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState(null);

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: leadsData, error: le }, { data: logsData, error: loge }] = await Promise.all([
        supabase.from("leads").select("*").order("created_at", { ascending: false }),
        supabase.from("call_logs").select("*").order("created_at", { ascending: false }),
      ]);
      if (le)   throw le;
      if (loge) throw loge;
      setLeads(leadsData || []);
      setCallLogs(logsData || []);
    } catch (e) {
      setError("Could not connect to database: " + e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Metrics ────────────────────────────────────────────────────────────────
  const totalCalls     = callLogs.reduce((s, l) => s + Number(l.calls     || 0), 0);
  const totalConnected = callLogs.reduce((s, l) => s + Number(l.connected || 0), 0);
  const totalDemos     = callLogs.reduce((s, l) => s + Number(l.demos     || 0), 0);
  const totalCloses    = callLogs.reduce((s, l) => s + Number(l.closes    || 0), 0);
  const connectRate    = totalCalls > 0 ? ((totalConnected / totalCalls) * 100).toFixed(1) : "0.0";
  const closeRate      = totalDemos > 0 ? ((totalCloses    / totalDemos) * 100).toFixed(1) : "0.0";
  const pipelineValue  = leads.filter(l => l.stage !== "Closed Lost").reduce((s, l) => s + Number(l.value || 0), 0);
  const wonValue       = leads.filter(l => l.stage === "Closed Won").reduce((s, l) => s + Number(l.value || 0), 0);

  // ── Leaderboard ────────────────────────────────────────────────────────────
  const repStats = REPS.map(rep => {
    const logs      = callLogs.filter(l => l.rep === rep);
    const calls     = logs.reduce((s, l) => s + Number(l.calls     || 0), 0);
    const connected = logs.reduce((s, l) => s + Number(l.connected || 0), 0);
    const demos     = logs.reduce((s, l) => s + Number(l.demos     || 0), 0);
    const closes    = logs.reduce((s, l) => s + Number(l.closes    || 0), 0);
    const won       = leads.filter(l => l.rep === rep && l.stage === "Closed Won").reduce((s, l) => s + Number(l.value || 0), 0);
    return { rep, calls, connected, demos, closes, won };
  }).sort((a, b) => b.closes - a.closes || b.calls - a.calls);

  // ── Filtered leads ─────────────────────────────────────────────────────────
  const filteredLeads = leads.filter(l =>
    (filterStage === "All" || l.stage === filterStage) &&
    (filterRep   === "All" || l.rep   === filterRep)
  );

  // ── Lead CRUD ──────────────────────────────────────────────────────────────
  function openAddLead()      { setLeadForm(EMPTY_LEAD); setEditLead(null); setShowAddLead(true); }
  function openEditLead(lead) { setLeadForm({ name: lead.name, company: lead.company || "", phone: lead.phone || "", stage: lead.stage, rep: lead.rep, notes: lead.notes || "", value: lead.value || "" }); setEditLead(lead.id); setShowAddLead(true); }

  async function saveLead() {
    if (!leadForm.name.trim()) return;
    setSaving(true);
    const payload = { name: leadForm.name.trim(), company: leadForm.company, phone: leadForm.phone, stage: leadForm.stage, rep: leadForm.rep, notes: leadForm.notes, value: Number(leadForm.value) || 0 };
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
    await supabase.from("leads").update({ stage }).eq("id", id);
    setLeads(prev => prev.map(l => l.id === id ? { ...l, stage } : l));
  }

  // ── Call log ───────────────────────────────────────────────────────────────
  async function saveLog() {
    if (!logForm.calls) return;
    setSaving(true);
    const payload = { rep: logForm.rep, calls: Number(logForm.calls) || 0, connected: Number(logForm.connected) || 0, demos: Number(logForm.demos) || 0, closes: Number(logForm.closes) || 0, date: logForm.date || new Date().toISOString().slice(0, 10) };
    const { data, error } = await supabase.from("call_logs").insert(payload).select().single();
    if (!error && data) setCallLogs(prev => [data, ...prev]);
    setSaving(false);
    setShowLogCall(false);
    setLogForm(EMPTY_LOG);
  }

  const TABS = [
    { id: "metrics",     label: "📊 Metrics" },
    { id: "pipeline",    label: "🏗️ Pipeline" },
    { id: "leaderboard", label: "🏆 Leaderboard" },
  ];

  const selStyle = { padding: "7px 12px", borderRadius: 7, border: "1px solid #2a2a2a", background: "#111", color: "#bbb", fontSize: 13 };

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
          <div style={{ fontSize: 12, color: "#3a3a3a", marginTop: 2 }}>{leads.length} leads · {totalCalls} calls logged</div>
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
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
              <StatCard label="Total Calls"    value={totalCalls.toLocaleString()} sub="all time" />
              <StatCard label="Connect Rate"   value={connectRate + "%"} sub={`${totalConnected} connected`} accent="#60aaff" />
              <StatCard label="Demos Set"      value={totalDemos}  sub="scheduled"  accent="#7bc95a" />
              <StatCard label="Close Rate"     value={closeRate + "%"} sub={`${totalCloses} closes`} accent="#3dd68c" />
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
              <StatCard label="Pipeline Value" value={"$" + pipelineValue.toLocaleString()} sub="open deals"  accent="#c97fff" />
              <StatCard label="Won Revenue"    value={"$" + wonValue.toLocaleString()}       sub="closed won"  accent="#3dd68c" />
              <StatCard label="Active Leads"   value={leads.filter(l => !["Closed Won","Closed Lost"].includes(l.stage)).length} sub="in progress" />
              <StatCard label="Closed Won"     value={leads.filter(l => l.stage === "Closed Won").length} sub="deals" accent="#3dd68c" />
            </div>

            <div style={{ marginBottom: 20 }}><DonutChart callLogs={callLogs} /></div>

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

            <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: "#d0d0d0", marginBottom: 14 }}>Recent Call Sessions</div>
              {callLogs.length === 0 ? (
                <div style={{ color: "#333", fontSize: 14, padding: "20px 0", textAlign: "center" }}>No sessions yet — click "+ Log Calls" to start.</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #1e1e1e" }}>
                        {["Date","Rep","Calls","Connected","Demos","Closes"].map(h => (
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
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
              <select value={filterStage} onChange={e => setFilterStage(e.target.value)} style={selStyle}>
                <option value="All">All Stages</option>
                {STAGES.map(s => <option key={s}>{s}</option>)}
              </select>
              <select value={filterRep} onChange={e => setFilterRep(e.target.value)} style={selStyle}>
                <option value="All">All Reps</option>
                {REPS.map(r => <option key={r}>{r}</option>)}
              </select>
              <span style={{ fontSize: 13, color: "#333", marginLeft: 4 }}>{filteredLeads.length} leads</span>
            </div>

            {filteredLeads.length === 0 ? (
              <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: 40, textAlign: "center", color: "#333", fontSize: 14 }}>
                No leads yet. Click "+ Add Lead" to get started.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {filteredLeads.map(lead => {
                  const rc = REP_COLORS[lead.rep];
                  return (
                    <div key={lead.id} style={{ background: "#111", border: "1px solid #1e1e1e", borderLeft: `3px solid ${rc?.main || "#333"}`, borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <div style={{ fontWeight: 600, fontSize: 15, color: "#e0e0e0", marginBottom: 2 }}>{lead.name}</div>
                        <div style={{ fontSize: 13, color: "#777" }}>{lead.company}</div>
                        {lead.phone && <div style={{ fontSize: 12, color: "#444", marginTop: 2 }}>{lead.phone}</div>}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-end", minWidth: 130 }}>
                        <Badge stage={lead.stage} />
                        <div style={{ fontSize: 12, color: rc?.dot || "#888" }}>{lead.rep}</div>
                        {lead.value > 0 && <div style={{ fontSize: 13, fontWeight: 600, color: "#3dd68c" }}>${Number(lead.value).toLocaleString()}</div>}
                      </div>
                      {lead.notes && <div style={{ width: "100%", fontSize: 12, color: "#777", background: "#0d0d0d", borderRadius: 6, padding: "6px 10px", marginTop: 4 }}>{lead.notes}</div>}
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
            <div style={{ marginBottom: 20 }}><DonutChart callLogs={callLogs} /></div>

            <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e1e1e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#e0e0e0" }}>🏆 Team Leaderboard</div>
                <div style={{ fontSize: 12, color: "#333" }}>Ranked by closes</div>
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
                const topCaller = [...repStats].sort((a,b) => b.calls  - a.calls)[0];
                const topCloser = [...repStats].sort((a,b) => b.closes - a.closes)[0];
                const topEarner = [...repStats].sort((a,b) => b.won    - a.won)[0];
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
          <Inp label="Date" type="date" value={logForm.date || new Date().toISOString().slice(0,10)} onChange={e => setLogForm(f => ({ ...f, date: e.target.value }))} />
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
    </div>
  );
}
