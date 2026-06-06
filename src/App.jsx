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

const EMPTY_LEAD = { name: "", company: "", phone: "", stage: "New Lead", rep: "Lucas", notes: "", value: "", follow_up_date: "" };
const EMPTY_LOG  = { rep: "Lucas", calls: "", connected: "", demos: "", closes: "", date: "" };

const FOLLOWUP_DAYS = [1, 3, 7, 10];

const TIMEFRAMES = [
  { value: "week",  it: "Questa Sett.", en: "This Week" },
  { value: "7d",    it: "7 Giorni",     en: "7 Days"    },
  { value: "month", it: "30 Giorni",    en: "30 Days"   },
  { value: "all",   it: "Sempre",       en: "All Time"  },
];

const MONTH_NAMES_IT = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const MONTH_NAMES_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW_IT = ["Do","Lu","Ma","Me","Gi","Ve","Sa"];
const DOW_EN = ["Su","Mo","Tu","We","Th","Fr","Sa"];

// ── Translations ───────────────────────────────────────────────────────────
const T = {
  it: {
    // Nav
    metrics: "Metriche", pipeline: "Pipeline", leaderboard: "Classifica", tracking: "Monitoraggio",
    // Actions
    add_lead: "+ Aggiungi Lead", log_calls: "+ Registra Chiamate",
    // Filter chips
    owner_yes: "Con Proprietario", owner_no: "Senza Proprietario",
    followup_chip: "Follow-up oggi", clear_all: "Azzera filtri",
    // Pipeline
    search_ph: "Cerca nome, azienda, telefono…", no_leads: "Nessun lead. Clicca \"+ Aggiungi Lead\" per iniziare.",
    // Lead card
    edit: "Modifica", remove: "✕",
    followup: "Follow-up", overdue: "Scaduto", today_chip: "Oggi",
    // Modals
    edit_lead: "Modifica Lead", add_lead_title: "Aggiungi Nuovo Lead",
    name_field: "Nome Contatto *", company_field: "Azienda", phone_field: "Telefono",
    stage_field: "Fase", rep_field: "Rep Assegnato", value_field: "Valore Affare (€)",
    notes_field: "Note", followup_date_field: "Data Follow-up",
    cancel: "Annulla", save_changes: "Salva Modifiche", saving: "Salvataggio…", add_lead_btn: "Aggiungi Lead",
    log_session_title: "Sessione Chiamate", log_session_desc: "Registra l'attività di oggi.",
    rep_label: "Rep", date_label: "Data",
    total_calls_field: "Totale Chiamate *", connected_field: "Connessi", demos_field: "Demo", closes_field: "Chiusure",
    log_session_btn: "Registra Sessione",
    // Metrics
    total_calls: "Totale Chiamate", connect_rate: "Tasso Connessione",
    demos_set: "Demo Fissate", close_rate: "Tasso Chiusura",
    pipeline_val: "Valore Pipeline", won_rev: "Ricavi Vinti",
    active_leads: "Lead Attivi", closed_won_card: "Chiuso Vinto",
    open_deals: "trattative aperte", in_progress: "in corso",
    closed_won_deals: "affari",
    pipeline_by_stage: "Pipeline per Fase",
    recent_sessions: "Sessioni Recenti",
    no_sessions: "Nessuna sessione. Clicca \"+ Registra Chiamate\" per iniziare.",
    calls_by_rep: "Chiamate per Rep",
    log_to_see: "Registra chiamate per vedere la suddivisione.",
    // Leaderboard
    lb_title: "🏆 Classifica Team", ranked_by: "Classificato per chiusure",
    most_calls: "📞 Più Chiamate", top_closer: "🤝 Top Chiusura", top_earner: "💰 Top Guadagno",
    calls_l: "Chiamate", connects_l: "Connessi", demos_l: "Demo", closes_l: "Chiusure", won_l: "Vinti",
    connect_pct: "Connessione",
    // Tracking
    daily_tracking: "📅 Monitoraggio Giornaliero",
    tracking_desc: "Clicca su un giorno per aggiungere to-do e registrare i completamenti.",
    done_l: "Fatto", missed_l: "Mancato", today_l: "Oggi", planned_l: "Pianificato",
    todos_label: "📝 To-do del giorno",
    todos_ph: "Cosa devi fare oggi?\n\n- \n- \n- ",
    done_notes_label: "✅ Cosa ho fatto",
    done_notes_ph: "Cosa hai effettivamente realizzato?\n\n- \n- \n- ",
    mark_done: "Segna come completato",
    marked_done: "✓ Giornata completata — il giorno brillerà di verde",
    save: "Salva",
    // System
    connecting: "Connessione al database…", conn_error: "Errore di Connessione", retry: "Riprova",
    confirm_remove: "Rimuovere questo lead?",
    leads_count: (n) => `${n} lead${n !== 1 ? "s" : ""}`,
    tf_label: (tf) => TIMEFRAMES.find(t => t.value === tf)?.it || "",
    center_label: { week: "questa sett.", "7d": "7 giorni", month: "30 giorni", all: "sempre" },
  },
  en: {
    metrics: "Metrics", pipeline: "Pipeline", leaderboard: "Leaderboard", tracking: "Tracking",
    add_lead: "+ Add Lead", log_calls: "+ Log Calls",
    owner_yes: "Has Owner", owner_no: "No Owner",
    followup_chip: "Follow-up today", clear_all: "Clear all",
    search_ph: "Search name, company, phone…", no_leads: "No leads yet. Click \"+ Add Lead\" to get started.",
    edit: "Edit", remove: "✕",
    followup: "Follow-up", overdue: "Overdue", today_chip: "Today",
    edit_lead: "Edit Lead", add_lead_title: "Add New Lead",
    name_field: "Contact Name *", company_field: "Company", phone_field: "Phone",
    stage_field: "Stage", rep_field: "Assigned Rep", value_field: "Deal Value ($)",
    notes_field: "Notes", followup_date_field: "Follow-up Date",
    cancel: "Cancel", save_changes: "Save Changes", saving: "Saving…", add_lead_btn: "Add Lead",
    log_session_title: "Log Call Session", log_session_desc: "Record today's activity for any team member.",
    rep_label: "Rep", date_label: "Date",
    total_calls_field: "Total Calls *", connected_field: "Connected", demos_field: "Demos", closes_field: "Closes",
    log_session_btn: "Log Session",
    total_calls: "Total Calls", connect_rate: "Connect Rate",
    demos_set: "Demos Set", close_rate: "Close Rate",
    pipeline_val: "Pipeline Value", won_rev: "Won Revenue",
    active_leads: "Active Leads", closed_won_card: "Closed Won",
    open_deals: "open deals", in_progress: "in progress",
    closed_won_deals: "deals",
    pipeline_by_stage: "Pipeline by Stage",
    recent_sessions: "Recent Call Sessions",
    no_sessions: "No sessions yet — click \"+ Log Calls\" to start.",
    calls_by_rep: "Calls by Rep",
    log_to_see: "Log calls to see the breakdown.",
    lb_title: "🏆 Team Leaderboard", ranked_by: "Ranked by closes",
    most_calls: "📞 Most Calls", top_closer: "🤝 Top Closer", top_earner: "💰 Top Earner",
    calls_l: "Calls", connects_l: "Connected", demos_l: "Demos", closes_l: "Closes", won_l: "Won",
    connect_pct: "Connect",
    daily_tracking: "📅 Daily Tracking",
    tracking_desc: "Click any day to write your to-do's and log what you got done.",
    done_l: "Done", missed_l: "Missed", today_l: "Today", planned_l: "Planned",
    todos_label: "📝 To-do's for the day",
    todos_ph: "What do you need to get done today?\n\n- \n- \n- ",
    done_notes_label: "✅ What I got done",
    done_notes_ph: "What did you actually accomplish today?\n\n- \n- \n- ",
    mark_done: "Mark this day as complete",
    marked_done: "✓ Marked as complete — day will glow green",
    save: "Save",
    connecting: "Connecting to database…", conn_error: "Connection Error", retry: "Retry",
    confirm_remove: "Remove this lead?",
    leads_count: (n) => `${n} lead${n !== 1 ? "s" : ""}`,
    tf_label: (tf) => TIMEFRAMES.find(t => t.value === tf)?.en || "",
    center_label: { week: "this week", "7d": "7 days", month: "30 days", all: "all time" },
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────
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

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function fmtShortDate(iso) {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

// ── Firstline Logo SVG ─────────────────────────────────────────────────────
function FirstlineLogo({ size = 32, color = "#378ADD" }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="5" width="90" height="90" stroke={color} strokeWidth="2.5" fill={color + "06"} />
      <polyline points="62,5 95,5 95,38" stroke={color} strokeWidth="2.5" fill="none" opacity="0.4" />
      <rect x="15" y="15" width="20" height="70" fill={color} />
      <rect x="35" y="15" width="50" height="16" fill={color} />
      <rect x="35" y="46" width="34" height="14" fill={color} />
      <line x1="62" y1="5" x2="95" y2="38" stroke={color} strokeWidth="1.5" opacity="0.5" />
    </svg>
  );
}

// ── RepCalendar ────────────────────────────────────────────────────────────
function RepCalendar({ rep, trackingData, month, onDayClick, onPrevMonth, onNextMonth, lang }) {
  const year = month.getFullYear();
  const mon  = month.getMonth();
  const td   = todayISO();
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  const firstDow    = new Date(year, mon, 1).getDay();
  const rc = REP_COLORS[rep];
  const mNames   = lang === "it" ? MONTH_NAMES_IT : MONTH_NAMES_EN;
  const dowNames = lang === "it" ? DOW_IT : DOW_EN;
  const tx = T[lang];

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{ flex: 1, minWidth: 270, background: "#111", border: `1px solid ${rc.main}44`, borderRadius: 14, padding: "16px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button onClick={onPrevMonth} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 22, lineHeight: 1, padding: "0 6px" }}>‹</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: rc.dot }}>{rep}</div>
          <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{mNames[mon]} {year}</div>
        </div>
        <button onClick={onNextMonth} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 22, lineHeight: 1, padding: "0 6px" }}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
        {dowNames.map(d => (
          <div key={d} style={{ fontSize: 9, color: "#333", textAlign: "center", fontWeight: 600, padding: "2px 0", letterSpacing: 0.5 }}>{d}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} style={{ height: 34 }} />;
          const dateStr = `${year}-${String(mon + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const entry   = trackingData.find(t => t.rep === rep && t.date === dateStr);
          const isToday = dateStr === td;
          const isPast  = dateStr < td;

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
            <div key={idx} onClick={() => onDayClick(rep, dateStr, entry)}
              style={{ cursor: "pointer", background: bg, border, borderRadius: 5, boxShadow: shadow, height: 34, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: isToday ? 700 : 400, color, transition: "all .15s" }}>
              {day}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 12, justifyContent: "center", flexWrap: "wrap" }}>
        {[
          { color: "#3dd68c", label: tx.done_l },
          { color: "#ff6b6b", label: tx.missed_l },
          { color: rc.dot,    label: tx.today_l },
          { color: "#777",    label: tx.planned_l },
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

// ── TimeframeToggle ────────────────────────────────────────────────────────
function TimeframeToggle({ value, onChange, lang }) {
  return (
    <div style={{ display: "flex", gap: 3, background: "#0d0d0d", borderRadius: 9, padding: 3, border: "1px solid #1a1a1a", width: "fit-content", marginBottom: 16 }}>
      {TIMEFRAMES.map(tf => (
        <button key={tf.value} onClick={() => onChange(tf.value)} style={{
          background: value === tf.value ? "#185FA5" : "none",
          border: "none", borderRadius: 6,
          color: value === tf.value ? "#fff" : "#555",
          cursor: "pointer", padding: "5px 14px", fontSize: 13,
          fontWeight: value === tf.value ? 600 : 400, transition: "all .15s",
        }}>
          {lang === "it" ? tf.it : tf.en}
        </button>
      ))}
    </div>
  );
}

// ── DonutChart ─────────────────────────────────────────────────────────────
function DonutChart({ callLogs, timeframe, lang }) {
  const size = 180, cx = 90, cy = 90, R = 72, r = 48;
  const tx = T[lang];

  const repCalls = REPS.map(rep => ({
    rep,
    calls: callLogs.filter(l => l.rep === rep).reduce((s, l) => s + Number(l.calls || 0), 0),
  }));
  const total = repCalls.reduce((s, rc) => s + rc.calls, 0);
  const centerLabel = tx.center_label[timeframe] || "";

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
        <div style={{ fontSize: 11, fontWeight: 600, color: "#555", marginBottom: 14, textTransform: "uppercase", letterSpacing: 1.2 }}>{tx.calls_by_rep}</div>
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
        {total === 0 && <div style={{ fontSize: 12, color: "#444", marginTop: 4 }}>{tx.log_to_see}</div>}
      </div>
    </div>
  );
}

// ── UI Primitives ──────────────────────────────────────────────────────────
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

// ── Kanban Card ────────────────────────────────────────────────────────────
function KanbanCard({ lead, onEdit, onDelete, onDragStart, onDragEnd, lang }) {
  const rc = REP_COLORS[lead.rep];
  const td = todayISO();
  const fud = lead.follow_up_date;
  const isOverdue = fud && fud < td;
  const isToday   = fud && fud === td;
  const tx = T[lang];

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = "move"; onDragStart(lead.id); }}
      onDragEnd={onDragEnd}
      style={{ background: "#161616", border: "1px solid #232323", borderRadius: 10, padding: "11px 13px", cursor: "grab", userSelect: "none" }}
    >
      {/* Name + rep dot */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6, marginBottom: 4 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: "#e0e0e0", lineHeight: 1.3, flex: 1 }}>{lead.name}</div>
        <div title={lead.rep} style={{ width: 9, height: 9, borderRadius: "50%", background: rc?.dot || "#555", flexShrink: 0, marginTop: 4 }} />
      </div>

      {/* Company */}
      {lead.company && (
        <div style={{ fontSize: 12, color: "#555", marginBottom: 5 }}>{lead.company}</div>
      )}

      {/* Value */}
      {Number(lead.value) > 0 && (
        <div style={{ fontSize: 13, fontWeight: 700, color: "#3dd68c", marginBottom: 5 }}>
          €{Number(lead.value).toLocaleString("it-IT")}
        </div>
      )}

      {/* Follow-up date */}
      {fud && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 7,
          background: isOverdue ? "#2a0a0a" : isToday ? "#1a2a0a" : "#191919",
          border: `1px solid ${isOverdue ? "#7a2a2a" : isToday ? "#4a7a1a" : "#272727"}`,
          color: isOverdue ? "#ff6b6b" : isToday ? "#7bc95a" : "#555",
          borderRadius: 6, padding: "2px 7px", fontSize: 11, fontWeight: 600,
        }}>
          {isOverdue ? "⚠ " + tx.overdue : isToday ? "● " + tx.today_chip : "📅 " + tx.followup}
          {" · "}{fmtShortDate(fud)}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 5, paddingTop: 7, borderTop: "1px solid #1e1e1e" }}>
        <button onClick={() => onEdit(lead)}
          style={{ flex: 1, background: "none", border: "1px solid #2a2a2a", borderRadius: 6, color: "#777", fontSize: 11, padding: "4px 0", cursor: "pointer", fontWeight: 500 }}>
          {tx.edit}
        </button>
        <button onClick={() => onDelete(lead.id)}
          style={{ background: "none", border: "1px solid #3a1a1a", borderRadius: 6, color: "#ff6b6b", fontSize: 12, padding: "4px 9px", cursor: "pointer" }}>
          {tx.remove}
        </button>
      </div>
    </div>
  );
}

// ── Kanban Column ──────────────────────────────────────────────────────────
function KanbanColumn({ stage, leads, onEdit, onDelete, onDragStart, onDragEnd, onDrop, lang }) {
  const c = STAGE_COLORS[stage];
  const totalValue = leads.reduce((s, l) => s + Number(l.value || 0), 0);
  const [isOver, setIsOver] = useState(false);

  return (
    <div
      onDragOver={e => { e.preventDefault(); if (!isOver) setIsOver(true); }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setIsOver(false); }}
      onDrop={e => { e.preventDefault(); setIsOver(false); onDrop(stage); }}
      style={{
        minWidth: 210,
        flex: "0 0 210px",
        background: isOver ? "#141a1f" : "#111",
        border: `1px solid ${isOver ? c.border + "66" : "#1e1e1e"}`,
        borderTop: `3px solid ${c.border}`,
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        maxHeight: "calc(100vh - 140px)",
        transition: "border-color .12s, background .12s",
      }}
    >
      {/* Header */}
      <div style={{ padding: "11px 13px 9px", borderBottom: "1px solid #1a1a1a", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: c.text, textTransform: "uppercase", letterSpacing: 0.4, lineHeight: 1.2 }}>
            {stage}
          </div>
          <div style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: 12, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>
            {leads.length}
          </div>
        </div>
        {totalValue > 0 && (
          <div style={{ fontSize: 11, color: "#444" }}>€{totalValue.toLocaleString("it-IT")}</div>
        )}
      </div>

      {/* Cards */}
      <div style={{ padding: "9px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
        {leads.map(lead => (
          <KanbanCard
            key={lead.id}
            lead={lead}
            onEdit={onEdit}
            onDelete={onDelete}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            lang={lang}
          />
        ))}
        {leads.length === 0 && (
          <div style={{ color: "#252525", fontSize: 12, textAlign: "center", padding: "20px 0", userSelect: "none" }}>—</div>
        )}
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]                 = useState("pipeline");
  const [lang, setLang]               = useState("it");
  const [leads, setLeads]             = useState([]);
  const [callLogs, setCallLogs]       = useState([]);
  const [showAddLead, setShowAddLead] = useState(false);
  const [showLogCall, setShowLogCall] = useState(false);
  const [editLead, setEditLead]       = useState(null);
  const [leadForm, setLeadForm]       = useState(EMPTY_LEAD);
  const [logForm, setLogForm]         = useState(EMPTY_LOG);
  const [callsTimeframe, setCallsTimeframe] = useState("week");
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState(null);

  // Filters
  const [pipelineSearch, setPipelineSearch]   = useState("");
  const [filterOwner, setFilterOwner]         = useState(null);   // null | "yes" | "no"
  const [filterFollowup, setFilterFollowup]   = useState(false);
  const [filterRep, setFilterRep]             = useState(null);   // null | rep name

  // Kanban DnD
  const [draggingId, setDraggingId] = useState(null);

  // Tracking
  const [trackingData, setTrackingData]   = useState([]);
  const [showDayModal, setShowDayModal]   = useState(false);
  const [selectedDay, setSelectedDay]     = useState(null);
  const [dayForm, setDayForm]             = useState({ todos: "", completed_notes: "", is_done: false });
  const [calMonth, setCalMonth]           = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; });
  const [savingDay, setSavingDay]         = useState(false);

  // Login
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginCode, setLoginCode]   = useState("");
  const [loginShake, setLoginShake] = useState(false);

  const tx = T[lang];

  function attemptLogin() {
    if (loginCode === "3286472112") {
      setIsLoggedIn(true);
    } else {
      setLoginShake(true);
      setLoginCode("");
      setTimeout(() => setLoginShake(false), 700);
    }
  }

  // ── Load data ──────────────────────────────────────────────────────────
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
      setError("Could not connect: " + e.message);
    }
    setLoading(false);
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  // ── Computed values ────────────────────────────────────────────────────
  const filteredCallLogs = filterLogsByTimeframe(callLogs, callsTimeframe);
  const totalCalls     = filteredCallLogs.reduce((s, l) => s + Number(l.calls     || 0), 0);
  const totalConnected = filteredCallLogs.reduce((s, l) => s + Number(l.connected || 0), 0);
  const totalDemos     = filteredCallLogs.reduce((s, l) => s + Number(l.demos     || 0), 0);
  const totalCloses    = filteredCallLogs.reduce((s, l) => s + Number(l.closes    || 0), 0);
  const connectRate    = totalCalls > 0 ? ((totalConnected / totalCalls) * 100).toFixed(1) : "0.0";
  const closeRate      = totalDemos > 0 ? ((totalCloses    / totalDemos) * 100).toFixed(1) : "0.0";
  const pipelineValue  = leads.filter(l => l.stage !== "Closed Lost").reduce((s, l) => s + Number(l.value || 0), 0);
  const wonValue       = leads.filter(l => l.stage === "Closed Won").reduce((s, l) => s + Number(l.value || 0), 0);

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
  const todayStr = todayISO();
  const filteredLeads = leads.filter(l => {
    const q = pipelineSearch.toLowerCase();
    const matchSearch = !q ||
      l.name.toLowerCase().includes(q) ||
      (l.company || "").toLowerCase().includes(q) ||
      (l.phone   || "").includes(q) ||
      (l.notes   || "").toLowerCase().includes(q);
    const matchOwner = filterOwner === null ? true :
      filterOwner === "yes" ? !!l.rep : !l.rep;
    const matchFollowup = !filterFollowup || l.follow_up_date === todayStr;
    const matchRep = !filterRep || l.rep === filterRep;
    return matchSearch && matchOwner && matchFollowup && matchRep;
  });

  const hasActiveFilters = filterOwner !== null || filterFollowup || filterRep;

  // ── Lead CRUD ──────────────────────────────────────────────────────────
  function openAddLead() { setLeadForm(EMPTY_LEAD); setEditLead(null); setShowAddLead(true); }
  function openEditLead(lead) {
    setLeadForm({
      name: lead.name, company: lead.company || "", phone: lead.phone || "",
      stage: lead.stage, rep: lead.rep, notes: lead.notes || "",
      value: lead.value || "", follow_up_date: lead.follow_up_date || "",
    });
    setEditLead(lead.id);
    setShowAddLead(true);
  }

  async function saveLead() {
    if (!leadForm.name.trim()) return;
    setSaving(true);
    const payload = {
      name: leadForm.name.trim(), company: leadForm.company, phone: leadForm.phone,
      stage: leadForm.stage, rep: leadForm.rep, notes: leadForm.notes,
      value: Number(leadForm.value) || 0,
      follow_up_date: leadForm.follow_up_date || null,
    };
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
    if (!window.confirm(tx.confirm_remove)) return;
    await supabase.from("leads").delete().eq("id", id);
    setLeads(prev => prev.filter(l => l.id !== id));
  }

  async function updateLeadStage(id, stage) {
    await supabase.from("leads").update({ stage }).eq("id", id);
    setLeads(prev => prev.map(l => l.id === id ? { ...l, stage } : l));
  }

  // ── Kanban DnD ─────────────────────────────────────────────────────────
  async function handleDrop(targetStage) {
    if (!draggingId) return;
    const lead = leads.find(l => l.id === draggingId);
    if (!lead || lead.stage === targetStage) { setDraggingId(null); return; }
    await updateLeadStage(draggingId, targetStage);
    setDraggingId(null);
  }

  // ── Call log ───────────────────────────────────────────────────────────
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

  // ── Day tracking ───────────────────────────────────────────────────────
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
    const { data, error } = await supabase.from("daily_tracking")
      .upsert({ rep: selectedDay.rep, date: selectedDay.date, todos: dayForm.todos, completed_notes: dayForm.completed_notes, is_done: dayForm.is_done }, { onConflict: "rep,date" })
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

  const NAV_TABS = [
    { id: "pipeline",    icon: "🏗", key: "pipeline"    },
    { id: "metrics",     icon: "📊", key: "metrics"     },
    { id: "leaderboard", icon: "🏆", key: "leaderboard" },
    { id: "tracking",    icon: "📅", key: "tracking"    },
  ];

  // ── Login Screen ────────────────────────────────────────────────────────
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
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(#00d4ff 1px, transparent 1px), linear-gradient(90deg, #00d4ff 1px, transparent 1px)", backgroundSize: "44px 44px", animation: "gridpulse 4s ease-in-out infinite", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 30%, #010811 80%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", left: 0, right: 0, height: 3, background: "linear-gradient(transparent, #00d4ff55, transparent)", boxShadow: "0 0 18px #00d4ffaa", animation: "scan 3.5s linear infinite", zIndex: 2, pointerEvents: "none" }} />
        {[["top:18px","left:18px","borderTop","borderLeft"],["top:18px","right:18px","borderTop","borderRight"],["bottom:18px","left:18px","borderBottom","borderLeft"],["bottom:18px","right:18px","borderBottom","borderRight"]].map((c, i) => {
          const pos = {}; c.slice(0,2).forEach(p => { const [k,v] = p.split(":"); pos[k] = v; });
          const borders = {}; c.slice(2).forEach(b => { borders[b] = "2px solid #00d4ff33"; });
          return <div key={i} style={{ position: "absolute", width: 44, height: 44, ...pos, ...borders, pointerEvents: "none", zIndex: 2 }} />;
        })}
        <div style={{ position: "absolute", top: 26, left: "50%", transform: "translateX(-50%)", fontSize: 9, color: "#00d4ff44", letterSpacing: 4, textTransform: "uppercase", whiteSpace: "nowrap", zIndex: 3 }}>
          FIRSTLINE SYSTEMS · SECURE ACCESS PORTAL
        </div>
        <div style={{ position: "relative", zIndex: 4, display: "flex", flexDirection: "column", alignItems: "center", gap: 36 }}>
          <div style={{ animation: "pulse 2.8s ease-in-out infinite" }}>
            <svg viewBox="0 0 100 100" width="130" height="130" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="5" y="5" width="90" height="90" stroke="#00d4ff" strokeWidth="2.5" fill="#00d4ff06" />
              <polyline points="62,5 95,5 95,38" stroke="#00d4ff" strokeWidth="2.5" fill="none" opacity="0.4"/>
              <rect x="15" y="15" width="20" height="70" fill="#00d4ff" />
              <rect x="35" y="15" width="50" height="16" fill="#00d4ff" />
              <rect x="35" y="46" width="34" height="14" fill="#00d4ff" />
              <line x1="62" y1="5" x2="95" y2="38" stroke="#00d4ff" strokeWidth="1.5" opacity="0.5"/>
            </svg>
          </div>
          <div style={{ textAlign: "center", lineHeight: 1.3 }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: "#00d4ff", letterSpacing: 8, textTransform: "uppercase", textShadow: "0 0 20px #00d4ff, 0 0 50px #0088ff66" }}>FIRSTLINE</div>
            <div style={{ fontSize: 10, color: "#00d4ff55", letterSpacing: 6, marginTop: 6, textTransform: "uppercase" }}>INTELLIGENCE · CRM</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, animation: loginShake ? "shake 0.6s ease" : "none" }}>
            <div style={{ fontSize: 9, color: "#00d4ff44", letterSpacing: 5, textTransform: "uppercase" }}>ENTER ACCESS CODE</div>
            <input className="holo-input" type="password" value={loginCode}
              onChange={e => setLoginCode(e.target.value)}
              onKeyDown={e => e.key === "Enter" && attemptLogin()}
              maxLength={20} autoFocus placeholder="· · · · · · · · · ·"
              style={{ background: "#00d4ff08", border: `1px solid ${loginShake ? "#ff444488" : "#00d4ff44"}`, borderRadius: 2, color: "#00d4ff", fontSize: 24, letterSpacing: 10, padding: "14px 28px", width: 280, textAlign: "center", boxShadow: loginShake ? "0 0 24px #ff444433, inset 0 0 12px #ff44440a" : "0 0 20px #00d4ff1a, inset 0 0 10px #00d4ff08", caretColor: "#00d4ff", transition: "all .3s" }} />
            {loginShake && (
              <div style={{ color: "#ff4444", fontSize: 10, letterSpacing: 4, textTransform: "uppercase", animation: "blink 0.4s ease 4" }}>⚠ ACCESS DENIED</div>
            )}
            <button className="login-btn" onClick={attemptLogin}
              style={{ background: "transparent", border: "1px solid #00d4ff44", color: "#00d4ff", padding: "11px 48px", letterSpacing: 5, fontSize: 10, textTransform: "uppercase", cursor: "pointer", borderRadius: 2, transition: "all .2s", boxShadow: "none", marginTop: 4 }}>
              AUTHENTICATE
            </button>
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 26, left: "50%", transform: "translateX(-50%)", fontSize: 9, color: "#00d4ff2a", letterSpacing: 3, whiteSpace: "nowrap", zIndex: 3 }}>
          AES-256 · ENCRYPTED CHANNEL · ACTIVE
        </div>
      </div>
    );
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0a0a0a", flexDirection: "column", gap: 12 }}>
      <div style={{ width: 36, height: 36, border: "3px solid #1e1e1e", borderTop: "3px solid #378ADD", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ color: "#444", fontSize: 14 }}>{tx.connecting}</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0a0a0a", flexDirection: "column", gap: 12, padding: 24 }}>
      <div style={{ color: "#ff6b6b", fontSize: 16, fontWeight: 600 }}>{tx.conn_error}</div>
      <div style={{ color: "#555", fontSize: 13, textAlign: "center", maxWidth: 400 }}>{error}</div>
      <button style={BTN.primary} onClick={loadData}>{tx.retry}</button>
    </div>
  );

  // ── Main Layout ────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0a0a0a", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* ── SIDEBAR ── */}
      <div style={{ width: 220, position: "fixed", top: 0, left: 0, bottom: 0, background: "#0d0d0d", borderRight: "1px solid #1a1a1a", display: "flex", flexDirection: "column", zIndex: 100 }}>

        {/* Logo */}
        <div style={{ padding: "18px 18px 14px", borderBottom: "1px solid #161616", display: "flex", alignItems: "center", gap: 10 }}>
          <FirstlineLogo size={28} color="#378ADD" />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#e8e8e8", letterSpacing: -0.3 }}>Firstline</div>
            <div style={{ fontSize: 10, color: "#2e2e2e", marginTop: 1, letterSpacing: 0.5 }}>CRM</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: "10px 10px 0", flex: 1 }}>
          {NAV_TABS.map(item => {
            const active = tab === item.id;
            return (
              <button key={item.id} onClick={() => setTab(item.id)} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 8, marginBottom: 2,
                background: active ? "#185FA518" : "none",
                border: "none",
                color: active ? "#60aaff" : "#484848",
                fontSize: 14, fontWeight: active ? 600 : 400,
                cursor: "pointer", textAlign: "left", transition: "all .15s",
                borderLeft: `3px solid ${active ? "#60aaff" : "transparent"}`,
              }}>
                <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
                {tx[item.key]}
              </button>
            );
          })}
        </nav>

        {/* Bottom actions + lang toggle */}
        <div style={{ padding: "12px 10px 16px", borderTop: "1px solid #161616" }}>
          <button style={{ ...BTN.primary, width: "100%", marginBottom: 7, display: "block", textAlign: "center" }} onClick={openAddLead}>
            {tx.add_lead}
          </button>
          <button style={{ ...BTN.secondary, width: "100%", marginBottom: 14, display: "block", textAlign: "center" }} onClick={() => setShowLogCall(true)}>
            {tx.log_calls}
          </button>
          {/* EN / IT toggle */}
          <div style={{ display: "flex", background: "#111", borderRadius: 7, padding: 3, border: "1px solid #1a1a1a" }}>
            {["it", "en"].map(l => (
              <button key={l} onClick={() => setLang(l)} style={{
                flex: 1, background: lang === l ? "#185FA5" : "none",
                border: "none", borderRadius: 5,
                color: lang === l ? "#fff" : "#3a3a3a",
                fontSize: 11, fontWeight: 600, padding: "5px 0", cursor: "pointer",
                textTransform: "uppercase", letterSpacing: 1, transition: "all .15s",
              }}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ marginLeft: 220, flex: 1, minWidth: 0, overflowX: "hidden" }}>

        {/* ── PIPELINE ── */}
        {tab === "pipeline" && (
          <div style={{ padding: "20px 20px 20px" }}>

            {/* Search */}
            <div style={{ marginBottom: 10, position: "relative", maxWidth: 520 }}>
              <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#3a3a3a", pointerEvents: "none" }}>🔍</span>
              <input type="text" placeholder={tx.search_ph} value={pipelineSearch}
                onChange={e => setPipelineSearch(e.target.value)}
                style={{ width: "100%", padding: "9px 32px 9px 34px", borderRadius: 8, border: "1px solid #222", background: "#111", color: "#e0e0e0", fontSize: 14, boxSizing: "border-box", outline: "none" }} />
              {pipelineSearch && (
                <button onClick={() => setPipelineSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
              )}
            </div>

            {/* Filter chips */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
              {/* Owner chips */}
              {[{ val: "yes", label: tx.owner_yes }, { val: "no", label: tx.owner_no }].map(({ val, label }) => (
                <button key={val} onClick={() => setFilterOwner(filterOwner === val ? null : val)} style={{
                  padding: "5px 13px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all .15s",
                  background: filterOwner === val ? "#185FA5" : "#111",
                  border: `1px solid ${filterOwner === val ? "#185FA5" : "#222"}`,
                  color: filterOwner === val ? "#fff" : "#484848",
                }}>{label}</button>
              ))}

              {/* Follow-up today */}
              <button onClick={() => setFilterFollowup(f => !f)} style={{
                padding: "5px 13px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all .15s",
                background: filterFollowup ? "#1a3a0a" : "#111",
                border: `1px solid ${filterFollowup ? "#4a7a1a" : "#222"}`,
                color: filterFollowup ? "#7bc95a" : "#484848",
              }}>{tx.followup_chip}</button>

              {/* By rep */}
              {REPS.map(rep => (
                <button key={rep} onClick={() => setFilterRep(filterRep === rep ? null : rep)} style={{
                  padding: "5px 13px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all .15s",
                  background: filterRep === rep ? REP_COLORS[rep].main + "2a" : "#111",
                  border: `1px solid ${filterRep === rep ? REP_COLORS[rep].main : "#222"}`,
                  color: filterRep === rep ? REP_COLORS[rep].dot : "#484848",
                }}>{rep}</button>
              ))}

              {/* Clear all */}
              {hasActiveFilters && (
                <button onClick={() => { setFilterOwner(null); setFilterFollowup(false); setFilterRep(null); }} style={{
                  padding: "5px 12px", borderRadius: 20, fontSize: 11, cursor: "pointer",
                  background: "none", border: "1px solid #222", color: "#3a3a3a", transition: "all .15s",
                }}>{tx.clear_all}</button>
              )}

              <span style={{ fontSize: 12, color: "#2e2e2e", marginLeft: 2 }}>
                {tx.leads_count(filteredLeads.length)}
              </span>
            </div>

            {/* Kanban board */}
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 16, alignItems: "flex-start" }}>
              {STAGES.map(stage => (
                <KanbanColumn
                  key={stage}
                  stage={stage}
                  leads={filteredLeads.filter(l => l.stage === stage)}
                  onEdit={openEditLead}
                  onDelete={deleteLead}
                  onDragStart={id => setDraggingId(id)}
                  onDragEnd={() => setDraggingId(null)}
                  onDrop={handleDrop}
                  lang={lang}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── METRICS ── */}
        {tab === "metrics" && (
          <div style={{ padding: "20px 24px", maxWidth: 960 }}>
            <TimeframeToggle value={callsTimeframe} onChange={setCallsTimeframe} lang={lang} />

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
              <StatCard label={tx.total_calls}  value={totalCalls.toLocaleString()} sub={tx.tf_label(callsTimeframe)} />
              <StatCard label={tx.connect_rate} value={connectRate + "%"} sub={`${totalConnected} ${tx.connects_l.toLowerCase()}`} accent="#60aaff" />
              <StatCard label={tx.demos_set}    value={totalDemos} accent="#7bc95a" />
              <StatCard label={tx.close_rate}   value={closeRate + "%"} sub={`${totalCloses} ${tx.closes_l.toLowerCase()}`} accent="#3dd68c" />
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
              <StatCard label={tx.pipeline_val}    value={"€" + pipelineValue.toLocaleString("it-IT")} sub={tx.open_deals}        accent="#c97fff" />
              <StatCard label={tx.won_rev}          value={"€" + wonValue.toLocaleString("it-IT")}      sub={tx.closed_won_card}   accent="#3dd68c" />
              <StatCard label={tx.active_leads}     value={leads.filter(l => !["Closed Won", "Closed Lost"].includes(l.stage)).length} sub={tx.in_progress} />
              <StatCard label={tx.closed_won_card}  value={leads.filter(l => l.stage === "Closed Won").length} sub={tx.closed_won_deals} accent="#3dd68c" />
            </div>

            <div style={{ marginBottom: 20 }}>
              <DonutChart callLogs={filteredCallLogs} timeframe={callsTimeframe} lang={lang} />
            </div>

            {/* Pipeline by Stage */}
            <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "18px 20px", marginBottom: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: "#d0d0d0", marginBottom: 14 }}>{tx.pipeline_by_stage}</div>
              {STAGES.map(stage => {
                const count = leads.filter(l => l.stage === stage).length;
                const pct   = leads.length > 0 ? (count / leads.length) * 100 : 0;
                const c     = STAGE_COLORS[stage];
                return (
                  <div key={stage} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: "#999" }}>{stage}</span>
                      <span style={{ color: "#444" }}>{count}</span>
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
              <div style={{ fontWeight: 600, fontSize: 15, color: "#d0d0d0", marginBottom: 14 }}>{tx.recent_sessions}</div>
              {callLogs.length === 0 ? (
                <div style={{ color: "#333", fontSize: 14, padding: "20px 0", textAlign: "center" }}>{tx.no_sessions}</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #1e1e1e" }}>
                        {[tx.date_label, "Rep", tx.calls_l, tx.connects_l, tx.demos_l, tx.closes_l].map(h => (
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

        {/* ── LEADERBOARD ── */}
        {tab === "leaderboard" && (
          <div style={{ padding: "20px 24px", maxWidth: 820 }}>
            <TimeframeToggle value={callsTimeframe} onChange={setCallsTimeframe} lang={lang} />
            <div style={{ marginBottom: 20 }}>
              <DonutChart callLogs={filteredCallLogs} timeframe={callsTimeframe} lang={lang} />
            </div>
            <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e1e1e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#e0e0e0" }}>{tx.lb_title}</div>
                <div style={{ fontSize: 12, color: "#333" }}>{tx.ranked_by}</div>
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
                        { val: r.calls,                              label: tx.calls_l,    color: "#888" },
                        { val: r.connected,                          label: tx.connects_l, color: "#60aaff" },
                        { val: r.demos,                              label: tx.demos_l,    color: "#7bc95a" },
                        { val: r.closes,                             label: tx.closes_l,   color: "#3dd68c" },
                        { val: `€${r.won.toLocaleString("it-IT")}`, label: tx.won_l,      color: "#c97fff" },
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
                        <div style={{ fontSize: 11, color: "#3a3a3a" }}>{tx.connect_pct}</div>
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
                  { label: tx.most_calls, val: topCaller?.calls  > 0 ? `${topCaller.rep} (${topCaller.calls})` : "—",                           color: REP_COLORS[topCaller?.rep]?.dot },
                  { label: tx.top_closer, val: topCloser?.closes > 0 ? `${topCloser.rep} (${topCloser.closes})` : "—",                          color: REP_COLORS[topCloser?.rep]?.dot },
                  { label: tx.top_earner, val: topEarner?.won    > 0 ? `${topEarner.rep} (€${topEarner.won.toLocaleString("it-IT")})` : "—",    color: REP_COLORS[topEarner?.rep]?.dot },
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
          <div style={{ padding: "20px 24px" }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 17, color: "#d0d0d0", marginBottom: 6 }}>{tx.daily_tracking}</div>
              <div style={{ fontSize: 13, color: "#444" }}>{tx.tracking_desc}</div>
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {REPS.map(rep => (
                <RepCalendar key={rep} rep={rep} trackingData={trackingData} month={calMonth}
                  onDayClick={openDayModal} onPrevMonth={prevMonth} onNextMonth={nextMonth} lang={lang} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── ADD / EDIT LEAD MODAL ── */}
      {showAddLead && (
        <Modal title={editLead ? tx.edit_lead : tx.add_lead_title} onClose={() => setShowAddLead(false)}>
          <Inp label={tx.name_field}    type="text"   placeholder="Marco Rossi"         value={leadForm.name}    onChange={e => setLeadForm(f => ({ ...f, name:    e.target.value }))} />
          <Inp label={tx.company_field} type="text"   placeholder="Acme SRL"            value={leadForm.company} onChange={e => setLeadForm(f => ({ ...f, company: e.target.value }))} />
          <Inp label={tx.phone_field}   type="text"   placeholder="+39 333 0000000"      value={leadForm.phone}   onChange={e => setLeadForm(f => ({ ...f, phone:   e.target.value }))} />
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <Inp label={tx.stage_field} as="select" value={leadForm.stage} onChange={e => setLeadForm(f => ({ ...f, stage: e.target.value }))}>
                {STAGES.map(s => <option key={s}>{s}</option>)}
              </Inp>
            </div>
            <div style={{ flex: 1 }}>
              <Inp label={tx.rep_field} as="select" value={leadForm.rep} onChange={e => setLeadForm(f => ({ ...f, rep: e.target.value }))}>
                {REPS.map(r => <option key={r}>{r}</option>)}
              </Inp>
            </div>
          </div>
          <Inp label={tx.value_field}        type="number" placeholder="0"          value={leadForm.value}           onChange={e => setLeadForm(f => ({ ...f, value:           e.target.value }))} />
          <Inp label={tx.followup_date_field} type="date"                            value={leadForm.follow_up_date}  onChange={e => setLeadForm(f => ({ ...f, follow_up_date:  e.target.value }))} />
          <Inp label={tx.notes_field}        as="textarea" placeholder="Note, next steps..." value={leadForm.notes} onChange={e => setLeadForm(f => ({ ...f, notes:           e.target.value }))} />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <button style={BTN.secondary} onClick={() => setShowAddLead(false)}>{tx.cancel}</button>
            <button style={{ ...BTN.primary, opacity: saving ? 0.6 : 1 }} onClick={saveLead} disabled={saving}>
              {saving ? tx.saving : editLead ? tx.save_changes : tx.add_lead_btn}
            </button>
          </div>
        </Modal>
      )}

      {/* ── LOG CALLS MODAL ── */}
      {showLogCall && (
        <Modal title={tx.log_session_title} onClose={() => setShowLogCall(false)}>
          <div style={{ fontSize: 13, color: "#555", marginBottom: 14 }}>{tx.log_session_desc}</div>
          <Inp label={tx.rep_label} as="select" value={logForm.rep} onChange={e => setLogForm(f => ({ ...f, rep: e.target.value }))}>
            {REPS.map(r => <option key={r}>{r}</option>)}
          </Inp>
          <Inp label={tx.date_label} type="date" value={logForm.date || new Date().toISOString().slice(0, 10)} onChange={e => setLogForm(f => ({ ...f, date: e.target.value }))} />
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><Inp label={tx.total_calls_field} type="number" min="0" placeholder="0" value={logForm.calls}     onChange={e => setLogForm(f => ({ ...f, calls:     e.target.value }))} /></div>
            <div style={{ flex: 1 }}><Inp label={tx.connected_field}   type="number" min="0" placeholder="0" value={logForm.connected} onChange={e => setLogForm(f => ({ ...f, connected: e.target.value }))} /></div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><Inp label={tx.demos_field}  type="number" min="0" placeholder="0" value={logForm.demos}  onChange={e => setLogForm(f => ({ ...f, demos:  e.target.value }))} /></div>
            <div style={{ flex: 1 }}><Inp label={tx.closes_field} type="number" min="0" placeholder="0" value={logForm.closes} onChange={e => setLogForm(f => ({ ...f, closes: e.target.value }))} /></div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <button style={BTN.secondary} onClick={() => { setShowLogCall(false); setLogForm(EMPTY_LOG); }}>{tx.cancel}</button>
            <button style={{ ...BTN.primary, opacity: saving ? 0.6 : 1 }} onClick={saveLog} disabled={saving}>
              {saving ? tx.saving : tx.log_session_btn}
            </button>
          </div>
        </Modal>
      )}

      {/* ── DAY TRACKING MODAL ── */}
      {showDayModal && selectedDay && (
        <Modal
          title={`${selectedDay.rep} — ${new Date(selectedDay.date + "T12:00:00").toLocaleDateString(lang === "it" ? "it-IT" : "en-US", { weekday: "long", month: "long", day: "numeric" })}`}
          onClose={() => setShowDayModal(false)}
        >
          {dayForm.is_done && (
            <div style={{ background: "#0a2a15", border: "1px solid #2a7a3a", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: 13, color: "#3dd68c", fontWeight: 600 }}>
              {tx.marked_done}
            </div>
          )}
          <div style={{ fontSize: 12, color: "#555", marginBottom: 6, fontWeight: 500 }}>{tx.todos_label}</div>
          <textarea value={dayForm.todos} onChange={e => setDayForm(f => ({ ...f, todos: e.target.value }))}
            placeholder={tx.todos_ph}
            style={{ width: "100%", minHeight: 110, padding: "9px 11px", borderRadius: 7, border: "1px solid #2a2a2a", background: "#0d0d0d", color: "#e0e0e0", fontSize: 13, boxSizing: "border-box", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
          <div style={{ fontSize: 12, color: "#555", marginBottom: 6, fontWeight: 500, marginTop: 16 }}>{tx.done_notes_label}</div>
          <textarea value={dayForm.completed_notes} onChange={e => setDayForm(f => ({ ...f, completed_notes: e.target.value }))}
            placeholder={tx.done_notes_ph}
            style={{ width: "100%", minHeight: 110, padding: "9px 11px", borderRadius: 7, border: "1px solid #2a2a2a", background: "#0d0d0d", color: "#e0e0e0", fontSize: 13, boxSizing: "border-box", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
          <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18, cursor: "pointer", padding: "10px 12px", background: dayForm.is_done ? "#0a2a15" : "#111", borderRadius: 8, border: `1px solid ${dayForm.is_done ? "#2a7a3a" : "#2a2a2a"}`, transition: "all .2s" }}>
            <input type="checkbox" checked={dayForm.is_done} onChange={e => setDayForm(f => ({ ...f, is_done: e.target.checked }))}
              style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#3dd68c" }} />
            <span style={{ fontSize: 13, color: dayForm.is_done ? "#3dd68c" : "#888", fontWeight: 600 }}>
              {dayForm.is_done ? tx.marked_done : tx.mark_done}
            </span>
          </label>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button style={BTN.secondary} onClick={() => setShowDayModal(false)}>{tx.cancel}</button>
            <button style={{ ...BTN.primary, opacity: savingDay ? 0.6 : 1 }} onClick={saveDayEntry} disabled={savingDay}>
              {savingDay ? tx.saving : tx.save}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
