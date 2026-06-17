import React, { useState, useMemo, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ── Supabase connection ──────────────────────────────────────────────────
const SUPABASE_URL = "https://dtdshgpxoltksomuyget.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_9V5GYWQkvKaQxt6Dl292vg_zO3Whx_5";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ZONES = ["Porto", "Matosinhos", "São Mamede de Infesta", "Pedrouços", "Rio Tinto", "Fânzeres", "São Cosme"];

// Progress stage order — furthest TRUE toggle wins. Discarded/standby override everything else.
function getProgressStage(listing) {
  if (listing.discarded) return "Descartada";
  if (listing.standby) return "Stand-by";
  if (listing.proposal_sent) return "Proposta enviada";
  if (listing.visit_done) return "Visitada";
  if (listing.visit_scheduled) return "Visita agendada";
  if (listing.reply_received) return "Resposta recebida";
  if (listing.message_sent) return "Contactado";
  return "Novo";
}

const ONGOING_STAGES = ["Contactado", "Resposta recebida", "Visita agendada", "Visitada", "Proposta enviada"];
function isOngoing(stage) {
  return ONGOING_STAGES.includes(stage);
}

function daysSinceContact(lastContactDate) {
  if (!lastContactDate) return null;
  const last = new Date(lastContactDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = today - last;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function contactUrgencyClass(days) {
  if (days == null) return "";
  if (days <= 3) return "urgency-ok";
  if (days <= 7) return "urgency-warn";
  return "urgency-bad";
}

function formatPrice(p) {
  if (p == null) return "—";
  return p.toLocaleString("pt-PT") + " €";
}

function formatDate(d) {
  if (!d) return "—";
  const date = new Date(d + "T12:00:00");
  return date.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });
}

function formatDateTime(dt) {
  if (!dt) return "";
  const date = new Date(dt);
  return date.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" }) +
    " " + date.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

function toDateTimeInputValue(dt) {
  if (!dt) return "";
  const date = new Date(dt);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// ── Login screen ─────────────────────────────────────────────────────────

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Email ou password incorretos.");
    } else {
      onLogin();
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-title">Casas — Porto</div>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <div className="login-error">{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? "A entrar..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}

// ── Score stamp ──────────────────────────────────────────────────────────

function ScoreStamp({ value, onChange }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <select
        autoFocus
        value={value ?? ""}
        onChange={(e) => {
          onChange(e.target.value ? Number(e.target.value) : null);
          setEditing(false);
        }}
        onBlur={() => setEditing(false)}
        className="score-select"
      >
        <option value="">—</option>
        {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
      </select>
    );
  }

  return (
    <button className="score-stamp" onClick={() => setEditing(true)}>
      {value ?? "—"}
    </button>
  );
}

// ── Add House form ───────────────────────────────────────────────────────

function AddHouseForm({ onAdd, onClose }) {
  const [form, setForm] = useState({ url: "", typology: "T3", region: "", price: "", source: "" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.url) return;
    setSaving(true);
    await onAdd({
      url: form.url,
      typology: form.typology,
      region: form.region,
      price: form.price ? Number(form.price) : null,
      source: form.source,
    });
    setSaving(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal-title">Adicionar casa</div>

        <label className="field-label">Link do anúncio</label>
        <input
          type="text"
          placeholder="https://..."
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          required
        />

        <div className="field-row">
          <div>
            <label className="field-label">Tipologia</label>
            <select value={form.typology} onChange={(e) => setForm({ ...form, typology: e.target.value })}>
              <option>T3</option><option>T4</option><option>T5</option><option>T6+</option>
            </select>
          </div>
          <div>
            <label className="field-label">Preço (€)</label>
            <input
              type="number"
              placeholder="285000"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
        </div>

        <label className="field-label">Localização</label>
        <input
          type="text"
          placeholder="Bonfim, Porto"
          value={form.region}
          onChange={(e) => setForm({ ...form, region: e.target.value })}
        />

        <label className="field-label">Site</label>
        <input
          type="text"
          placeholder="Idealista, Imovirtual..."
          value={form.source}
          onChange={(e) => setForm({ ...form, source: e.target.value })}
        />

        <div className="hint-row">
          <i className="ti ti-calendar" />
          Data de adição preenchida automaticamente (hoje)
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "A guardar..." : "Guardar casa"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Detail panel ─────────────────────────────────────────────────────────

function DetailPanel({ listing, onClose, onUpdate }) {
  const [local, setLocal] = useState(listing);

  useEffect(() => setLocal(listing), [listing]);

  const save = (patch) => {
    const updated = { ...local, ...patch };
    setLocal(updated);
    onUpdate(listing.id, patch);
  };

  const [visitFeedback, setVisitFeedback] = useState(listing.visit_feedback || "");
  const [proposalFeedback, setProposalFeedback] = useState(listing.proposal_feedback || "");

  useEffect(() => setVisitFeedback(listing.visit_feedback || ""), [listing]);
  useEffect(() => setProposalFeedback(listing.proposal_feedback || ""), [listing]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card detail-card" onClick={(e) => e.stopPropagation()}>
        <div className="detail-header">
          <div className="detail-header-fields">
            <input
              className="detail-inline-input detail-url"
              type="text"
              value={local.url || ""}
              onChange={(e) => save({ url: e.target.value })}
              placeholder="Link do anúncio"
            />
            <div className="detail-header-row">
              <input
                className="detail-inline-input"
                type="text"
                value={local.region || ""}
                onChange={(e) => save({ region: e.target.value })}
                placeholder="Zona"
                style={{ width: 110 }}
              />
              <input
                className="detail-inline-input"
                type="text"
                value={local.typology || ""}
                onChange={(e) => save({ typology: e.target.value })}
                placeholder="Tipologia"
                style={{ width: 60 }}
              />
              <input
                className="detail-inline-input"
                type="text"
                value={local.source || ""}
                onChange={(e) => save({ source: e.target.value })}
                placeholder="Site"
                style={{ width: 90 }}
              />
              <input
                className="detail-inline-input"
                type="number"
                value={local.price ?? ""}
                onChange={(e) => save({ price: e.target.value ? Number(e.target.value) : null })}
                placeholder="Preço"
                style={{ width: 90 }}
              />
            </div>
            <div className="detail-sub">adicionada a {formatDate(local.day_added)}</div>
          </div>
          <span className={`progress-tag ${local.discarded ? "is-discarded" : ""} ${local.standby ? "is-standby" : ""} ${isOngoing(getProgressStage(local)) ? "is-ongoing" : ""} ${getProgressStage(local) === "Novo" ? "is-new" : ""}`}>
            {getProgressStage(local)}
          </span>
        </div>

        <div className="detail-body">
          <div className="detail-row">
            <label>Pontuação</label>
            <ScoreStamp value={local.score} onChange={(v) => save({ score: v })} />
          </div>

          <div className="detail-row">
            <label>Mensagem enviada</label>
            <input type="checkbox" checked={!!local.message_sent} onChange={(e) => save({ message_sent: e.target.checked })} />
          </div>

          <div className="detail-row">
            <label>Data último contacto</label>
            <input
              type="date"
              value={local.last_contact_date || ""}
              onChange={(e) => save({ last_contact_date: e.target.value || null })}
              style={{ width: 140 }}
            />
          </div>

          <div className="detail-row">
            <label>Enviada por</label>
            <input
              type="text"
              value={local.sent_by || ""}
              onChange={(e) => save({ sent_by: e.target.value })}
              placeholder="Nome"
              style={{ width: 120 }}
            />
          </div>

          <div className="detail-row">
            <label>Resposta recebida</label>
            <input type="checkbox" checked={!!local.reply_received} onChange={(e) => save({ reply_received: e.target.checked })} />
          </div>

          <div className="detail-row">
            <label>Visita agendada</label>
            <input type="checkbox" checked={!!local.visit_scheduled} onChange={(e) => save({ visit_scheduled: e.target.checked })} />
          </div>

          <div className="detail-row">
            <label>Visita feita</label>
            <input type="checkbox" checked={!!local.visit_done} onChange={(e) => save({ visit_done: e.target.checked })} />
          </div>

          <div className="detail-row">
            <label>Data e hora da visita</label>
            <input
              type="datetime-local"
              value={toDateTimeInputValue(local.visit_datetime)}
              onChange={(e) => save({ visit_datetime: e.target.value ? new Date(e.target.value).toISOString() : null })}
              style={{ width: 180 }}
            />
          </div>

          <div className="detail-textarea">
            <label>Feedback após visita</label>
            <textarea
              rows={2}
              value={visitFeedback}
              onChange={(e) => setVisitFeedback(e.target.value)}
              onBlur={() => save({ visit_feedback: visitFeedback })}
              placeholder="Notas sobre a visita..."
            />
          </div>

          <div className="detail-row">
            <label>Proposta enviada</label>
            <input type="checkbox" checked={!!local.proposal_sent} onChange={(e) => save({ proposal_sent: e.target.checked })} />
          </div>

          <div className="detail-textarea">
            <label>Feedback da proposta</label>
            <textarea
              rows={2}
              value={proposalFeedback}
              onChange={(e) => setProposalFeedback(e.target.value)}
              onBlur={() => save({ proposal_feedback: proposalFeedback })}
              placeholder="Resposta do vendedor..."
            />
          </div>
        </div>

        <div className="detail-footer">
          <button
            className="btn-standby"
            onClick={() => save({ standby: !local.standby })}
          >
            <i className={`ti ${local.standby ? "ti-player-play" : "ti-player-pause"}`} />
            {local.standby ? "Retirar stand-by" : "Stand-by"}
          </button>
          <button
            className="btn-discard"
            onClick={() => save({ discarded: !local.discarded })}
          >
            <i className={`ti ${local.discarded ? "ti-rotate" : "ti-x"}`} />
            {local.discarded ? "Reativar casa" : "Descartar casa"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main dashboard ───────────────────────────────────────────────────────

const SORT_FIELDS = {
  region: "Zona", typology: "Tipologia", price: "Preço",
  source: "Site", day_added: "Data adição", visit_datetime: "Data visita",
  last_contact_date: "Último contacto",
  score: "Nota", sent_by: "Enviada por",
};

export default function Dashboard() {
  const [session, setSession] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeListing, setActiveListing] = useState(null);

  const [sortField, setSortField] = useState("day_added");
  const [sortDir, setSortDir] = useState("desc");

  const [filters, setFilters] = useState({
    typology: "all", source: "all", progress: "all",
    maxPrice: 400000, minScore: 0, showDiscarded: true,
    dayAdded: "", visitDate: "", sentBy: "all",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    fetchListings();
  }, [session]);

  async function fetchListings() {
    setLoading(true);
    const { data, error } = await supabase.from("listings").select("*");
    if (error) console.error(error);
    setListings(data || []);
    setLoading(false);
  }

  const updateListing = async (id, patch) => {
    setListings(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));
    const { error } = await supabase.from("listings").update(patch).eq("id", id);
    if (error) console.error("Failed to save:", error);
  };

  const addListing = async (newRow) => {
    const { data, error } = await supabase.from("listings").insert(newRow).select();
    if (error) {
      console.error(error);
      alert("Erro ao guardar.");
    } else if (data?.[0]) {
      setListings(prev => [data[0], ...prev]);
      setShowAddForm(false);
    }
  };

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    let rows = listings.filter(l => {
      if (filters.typology !== "all" && l.typology !== filters.typology) return false;
      if (filters.source !== "all" && (l.source || "").toLowerCase() !== filters.source.toLowerCase()) return false;
      if (filters.progress !== "all" && getProgressStage(l) !== filters.progress) return false;
      if ((l.price ?? 0) > filters.maxPrice) return false;
      if ((l.score ?? 0) < filters.minScore) return false;
      if (!filters.showDiscarded && l.discarded) return false;
      if (filters.dayAdded && l.day_added !== filters.dayAdded) return false;
      if (filters.visitDate) {
        const visitDay = l.visit_datetime ? l.visit_datetime.slice(0, 10) : null;
        if (visitDay !== filters.visitDate) return false;
      }
      if (filters.sentBy !== "all" && (l.sent_by || "") !== filters.sentBy) return false;
      return true;
    });

    rows.sort((a, b) => {
      let av = a[sortField], bv = b[sortField];
      if (sortField === "visit_datetime") {
        av = av ? new Date(av).getTime() : null;
        bv = bv ? new Date(bv).getTime() : null;
      }
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av == null) av = sortDir === "asc" ? Infinity : -Infinity;
      if (bv == null) bv = sortDir === "asc" ? Infinity : -Infinity;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return rows;
  }, [listings, filters, sortField, sortDir]);

  const sources = useMemo(() => [...new Set(listings.map(l => l.source).filter(Boolean))], [listings]);
  const typologies = useMemo(() => [...new Set(listings.map(l => l.typology).filter(Boolean))], [listings]);
  const sentByOptions = useMemo(() => [...new Set(listings.map(l => l.sent_by).filter(Boolean))].sort(), [listings]);

  if (!session) {
    return (
      <>
        <style>{GLOBAL_STYLES}</style>
        <LoginScreen onLogin={() => {}} />
      </>
    );
  }

  return (
    <div className="page">
      <style>{GLOBAL_STYLES}</style>

      <div className="masthead">
        <div>
          <div className="masthead-title">Casas — Porto</div>
          <div className="masthead-sub">{filtered.length} casas visíveis</div>
        </div>
        <div className="masthead-actions">
          <button className="btn-primary" onClick={() => setShowAddForm(true)}>
            <i className="ti ti-plus" /> Adicionar casa
          </button>
          <button className="btn-secondary" onClick={() => supabase.auth.signOut()}>
            Sair
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <span className="filter-label">Data adição</span>
          <input
            type="date"
            value={filters.dayAdded}
            onChange={e => setFilters({ ...filters, dayAdded: e.target.value })}
          />
          {filters.dayAdded && (
            <button className="filter-clear" onClick={() => setFilters({ ...filters, dayAdded: "" })}>
              <i className="ti ti-x" />
            </button>
          )}
        </div>

        <div className="filter-group">
          <span className="filter-label">Data visita</span>
          <input
            type="date"
            value={filters.visitDate}
            onChange={e => setFilters({ ...filters, visitDate: e.target.value })}
          />
          {filters.visitDate && (
            <button className="filter-clear" onClick={() => setFilters({ ...filters, visitDate: "" })}>
              <i className="ti ti-x" />
            </button>
          )}
        </div>

        <div className="filter-group">
          <span className="filter-label">Enviada por</span>
          <select value={filters.sentBy} onChange={e => setFilters({ ...filters, sentBy: e.target.value })}>
            <option value="all">Todos</option>
            {sentByOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <span className="filter-label">Tipologia</span>
          <select value={filters.typology} onChange={e => setFilters({ ...filters, typology: e.target.value })}>
            <option value="all">Todas</option>
            {typologies.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <span className="filter-label">Site</span>
          <select value={filters.source} onChange={e => setFilters({ ...filters, source: e.target.value })}>
            <option value="all">Todos</option>
            {sources.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <span className="filter-label">Progresso</span>
          <select value={filters.progress} onChange={e => setFilters({ ...filters, progress: e.target.value })}>
            <option value="all">Todos</option>
            <option>Novo</option>
            <option>Contactado</option>
            <option>Resposta recebida</option>
            <option>Visita agendada</option>
            <option>Visitada</option>
            <option>Proposta enviada</option>
            <option>Stand-by</option>
            <option>Descartada</option>
          </select>
        </div>

        <div className="filter-group">
          <span className="filter-label">Preço máx.</span>
          <input
            type="range" min="100000" max="400000" step="5000"
            value={filters.maxPrice}
            onChange={e => setFilters({ ...filters, maxPrice: Number(e.target.value) })}
          />
          <span className="price-value">{formatPrice(filters.maxPrice)}</span>
        </div>

        <div className="filter-group">
          <span className="filter-label">Nota mín.</span>
          <select value={filters.minScore} onChange={e => setFilters({ ...filters, minScore: Number(e.target.value) })}>
            <option value="0">Todas</option>
            {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}+</option>)}
          </select>
        </div>

        <label className="filter-group checkbox-group">
          <input
            type="checkbox"
            checked={filters.showDiscarded}
            onChange={e => setFilters({ ...filters, showDiscarded: e.target.checked })}
          />
          <span className="filter-label">Mostrar descartadas</span>
        </label>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Link</th>
              {Object.entries(SORT_FIELDS).map(([field, label]) => (
                <th key={field} onClick={() => toggleSort(field)} className="sortable">
                  {label}
                  {sortField === field && (
                    <i className={`ti ti-chevron-${sortDir === "asc" ? "up" : "down"}`} />
                  )}
                </th>
              ))}
              <th>Progresso</th>
              <th>Dias s/ contacto</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11}><div className="empty-state">A carregar...</div></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={11}><div className="empty-state">Sem casas para este filtro.</div></td></tr>
            ) : (
              filtered.map(l => (
                <tr
                  key={l.id}
                  onClick={() => setActiveListing(l)}
                  className={l.discarded ? "row-discarded" : ""}
                >
                  <td className="link-cell" onClick={e => e.stopPropagation()}>
                    <a href={l.url} target="_blank" rel="noreferrer">Ver anúncio →</a>
                  </td>
                  <td>{l.region || "—"}</td>
                  <td>{l.typology || "—"}</td>
                  <td className="price-cell">{formatPrice(l.price)}</td>
                  <td>{l.source || "—"}</td>
                  <td className="date-cell">{formatDate(l.day_added)}</td>
                  <td className="date-cell">{formatDateTime(l.visit_datetime) || "—"}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <ScoreStamp value={l.score} onChange={(v) => updateListing(l.id, { score: v })} />
                  </td>
                  <td>{l.sent_by || "—"}</td>
                  <td>
                    <span className={`progress-tag ${l.discarded ? "is-discarded" : ""} ${l.standby ? "is-standby" : ""} ${isOngoing(getProgressStage(l)) ? "is-ongoing" : ""} ${getProgressStage(l) === "Novo" ? "is-new" : ""}`}>
                      {getProgressStage(l)}
                    </span>
                  </td>
                  <td>
                    {l.last_contact_date ? (
                      <span className={`urgency-pill ${contactUrgencyClass(daysSinceContact(l.last_contact_date))}`}>
                        {daysSinceContact(l.last_contact_date)}d
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAddForm && (
        <AddHouseForm onAdd={addListing} onClose={() => setShowAddForm(false)} />
      )}

      {activeListing && (
        <DetailPanel
          listing={listings.find(l => l.id === activeListing.id) || activeListing}
          onClose={() => setActiveListing(null)}
          onUpdate={updateListing}
        />
      )}
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────

const GLOBAL_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600;700&display=swap');

* { box-sizing: border-box; }

:root {
  --paper: #F6F1E7;
  --paper-raised: #FFFFFF;
  --ink: #1C2B33;
  --ink-soft: #5B6B72;
  --azulejo: #1B4965;
  --azulejo-soft: #DCE7EC;
  --line: #DDD5C4;
  --discard-red: #A32D2D;
}

body { margin: 0; }

.page {
  background: var(--paper);
  min-height: 100vh;
  font-family: 'Inter', sans-serif;
  color: var(--ink);
  padding: 32px 40px 80px;
}

.login-page {
  background: var(--paper);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Inter', sans-serif;
}
.login-card {
  background: var(--paper-raised);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 36px 32px;
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.login-title {
  font-family: 'Fraunces', serif;
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 8px;
  text-align: center;
}
.login-card input {
  border: 1.5px solid var(--line);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  font-family: inherit;
}
.login-card button {
  background: var(--azulejo);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 11px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 6px;
}
.login-error { color: var(--discard-red); font-size: 12.5px; }

.masthead {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 18px;
  border-bottom: 2px solid var(--ink);
}
.masthead-title { font-family: 'Fraunces', serif; font-size: 28px; font-weight: 600; }
.masthead-sub { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--ink-soft); margin-top: 4px; }
.masthead-actions { display: flex; gap: 10px; }

button { font-family: 'Inter', sans-serif; cursor: pointer; }

.btn-primary {
  background: var(--azulejo);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}
.btn-secondary {
  background: var(--paper-raised);
  border: 1.5px solid var(--line);
  border-radius: 8px;
  padding: 9px 16px;
  font-size: 13px;
  color: var(--ink-soft);
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  align-items: center;
  background: var(--paper-raised);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 14px 18px;
  margin-bottom: 22px;
}
.filter-group { display: flex; align-items: center; gap: 8px; }
.checkbox-group { gap: 6px; }
.filter-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ink-soft);
}
.filter-bar select {
  border: 1.5px solid var(--line);
  border-radius: 6px;
  padding: 6px 9px;
  font-size: 13px;
  background: var(--paper);
  color: var(--ink);
}
input[type="range"] { width: 120px; accent-color: var(--azulejo); }
.price-value { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: var(--azulejo); min-width: 72px; }

.table-wrap {
  background: var(--paper-raised);
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  overflow-x: auto;
}
table { width: 100%; border-collapse: collapse; }
thead th {
  text-align: left;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ink-soft);
  padding: 12px 14px;
  border-bottom: 1.5px solid var(--ink);
  background: #FBF8F1;
  white-space: nowrap;
}
th.sortable { cursor: pointer; user-select: none; }
th.sortable:hover { color: var(--azulejo); }
th.sortable i { font-size: 12px; margin-left: 3px; vertical-align: -1px; }

tbody tr { border-bottom: 1px solid var(--line); cursor: pointer; }
tbody tr:hover { background: #FBF8F1; }
tbody tr:last-child { border-bottom: none; }
tr.row-discarded { opacity: 0.45; }

td { padding: 12px 14px; font-size: 13.5px; vertical-align: middle; }
.link-cell a { color: var(--azulejo); text-decoration: none; font-weight: 500; }
.link-cell a:hover { text-decoration: underline; }
.price-cell { font-family: 'IBM Plex Mono', monospace; font-weight: 500; }
.date-cell { color: var(--ink-soft); font-size: 12.5px; }

.score-stamp {
  width: 28px; height: 28px;
  border-radius: 6px;
  border: 1.5px solid var(--line);
  background: var(--paper);
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 600;
  font-size: 12.5px;
  color: var(--ink-soft);
}
.score-select { width: 28px; height: 28px; border-radius: 6px; border: 1.5px solid var(--azulejo); font-size: 12px; text-align: center; }

.progress-tag {
  font-size: 11px;
  padding: 3px 9px;
  border-radius: 100px;
  background: var(--paper);
  color: var(--ink-soft);
  border: 1px solid var(--line);
  white-space: nowrap;
}
.progress-tag.is-new {
  background: rgba(91,107,114,0.12);
  border-color: rgba(91,107,114,0.45);
  color: var(--ink);
  font-weight: 600;
}
.progress-tag.is-discarded { opacity: 0.6; text-decoration: line-through; }
.progress-tag.is-standby {
  background: rgba(186,138,46,0.12);
  border-color: rgba(186,138,46,0.4);
  color: #85530B;
  font-weight: 500;
  opacity: 1;
}
.progress-tag.is-ongoing {
  background: rgba(27,73,101,0.08);
  border-color: rgba(27,73,101,0.3);
  color: var(--azulejo);
  border-left: 3px solid var(--azulejo);
  padding-left: 7px;
  font-weight: 500;
}

.detail-header-fields { flex: 1; }
.detail-header-row { display: flex; gap: 8px; margin: 6px 0; }
.detail-inline-input {
  border: 1.5px solid transparent;
  border-radius: 6px;
  padding: 4px 6px;
  font-size: 13.5px;
  font-weight: 600;
  font-family: inherit;
  background: transparent;
}
.detail-inline-input:hover, .detail-inline-input:focus {
  border-color: var(--line);
  background: var(--paper);
}
.detail-url { width: 100%; font-weight: 500; color: var(--azulejo); }

.btn-standby {
  display: flex; align-items: center; gap: 6px;
  background: none;
  border: 1.5px solid var(--line);
  color: var(--ink-soft);
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
  margin-right: auto;
}

.empty-state { padding: 50px 20px; text-align: center; color: var(--ink-soft); font-family: 'IBM Plex Mono', monospace; font-size: 13px; }

.urgency-pill {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11.5px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
}
.urgency-ok { background: rgba(75,122,81,0.15); color: #27500A; }
.urgency-warn { background: rgba(186,138,46,0.18); color: #85530B; }
.urgency-bad { background: rgba(163,45,45,0.15); color: var(--discard-red); }

.filter-clear {
  border: none;
  background: none;
  color: var(--ink-soft);
  padding: 2px;
  display: flex;
  align-items: center;
}
.filter-clear i { font-size: 14px; }
.filter-bar input[type="date"] {
  border: 1.5px solid var(--line);
  border-radius: 6px;
  padding: 5px 8px;
  font-size: 12.5px;
  background: var(--paper);
  color: var(--ink);
  font-family: inherit;
}

.modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(28,43,51,0.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
  padding: 20px;
}
.modal-card {
  background: var(--paper-raised);
  border-radius: 14px;
  padding: 26px 28px;
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 88vh;
  overflow-y: auto;
}
.modal-title { font-family: 'Fraunces', serif; font-size: 19px; font-weight: 600; margin-bottom: 4px; }
.modal-card input, .modal-card select {
  border: 1.5px solid var(--line);
  border-radius: 8px;
  padding: 9px 11px;
  font-size: 14px;
  font-family: inherit;
  width: 100%;
}
.field-label { font-size: 11.5px; color: var(--ink-soft); margin-bottom: 3px; display: block; }
.field-row { display: flex; gap: 12px; }
.field-row > div { flex: 1; }
.hint-row { font-size: 11px; color: var(--ink-soft); display: flex; align-items: center; gap: 6px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }

.detail-card { max-width: 480px; }
.detail-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; padding-bottom: 14px; border-bottom: 1px solid var(--line); }
.detail-title { font-weight: 600; font-size: 15px; }
.detail-sub { font-size: 12px; color: var(--ink-soft); margin-top: 3px; }
.detail-body { display: flex; flex-direction: column; gap: 14px; padding-top: 4px; }
.detail-row { display: flex; justify-content: space-between; align-items: center; font-size: 13.5px; }
.detail-row input[type="checkbox"] { width: 18px; height: 18px; accent-color: var(--azulejo); }
.detail-textarea label { font-size: 13.5px; display: block; margin-bottom: 5px; }
.detail-textarea textarea {
  width: 100%;
  font-family: inherit;
  font-size: 13px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1.5px solid var(--line);
  resize: vertical;
}
.detail-footer { border-top: 1px solid var(--line); margin-top: 6px; padding-top: 14px; display: flex; justify-content: flex-end; }
.btn-discard {
  display: flex; align-items: center; gap: 6px;
  background: none;
  border: 1.5px solid var(--discard-red);
  color: var(--discard-red);
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
}
`;
