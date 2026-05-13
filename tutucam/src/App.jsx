import { useState, useEffect, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

const CATEGORIES = ["底片相機", "數位相機", "玩具相機", "鏡頭", "底片", "小物/裝飾", "維修", "其他"];
const PAYMENT_METHODS = ["現金", "Line Pay", "銀行轉帳"];
const CAT_COLORS = ["#1a1a1a", "#e8d5b0", "#b5a48a", "#7a6e62", "#3a7d44", "#c0a87a", "#a0522d", "#888"];
const PAY_COLORS = ["#1a1a1a", "#e8a020", "#4a90d9"];

const fmt = (n) => n.toLocaleString("zh-TW");
const todayStr = () => new Date().toISOString().slice(0, 10);
const STORAGE_KEY = "tutucam_records";

export default function App() {
  const [records, setRecords] = useState([]);
  const [view, setView] = useState("pos");
  const [form, setForm] = useState({ item: "", category: "底片相機", amount: "", payment: "現金", note: "" });
  const [flash, setFlash] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [filterDate, setFilterDate] = useState(todayStr());
  const [reportMonth, setReportMonth] = useState(todayStr().slice(0, 7));
  const itemRef = useRef(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      setRecords(saved);
    } catch {
      setRecords([]);
    }
  }, []);

  function saveRecords(nr) {
    setRecords(nr);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(nr)); } catch {}
  }

  const todayRecords = records.filter((r) => r.date === todayStr());
  const todayTotal = todayRecords.reduce((s, r) => s + r.amount, 0);
  const filteredRecords = records.filter((r) => r.date === filterDate).sort((a, b) => b.id - a.id);
  const filteredTotal = filteredRecords.reduce((s, r) => s + r.amount, 0);

  const monthRecords = records.filter((r) => r.date.startsWith(reportMonth));
  const monthTotal = monthRecords.reduce((s, r) => s + r.amount, 0);

  const lastDay = new Date(+reportMonth.slice(0,4), +reportMonth.slice(5,7), 0).getDate();
  const dailyData = Array.from({ length: lastDay }, (_, i) => {
    const d = `${reportMonth}-${String(i + 1).padStart(2, "0")}`;
    return { day: i + 1, total: records.filter((r) => r.date === d).reduce((s, r) => s + r.amount, 0) };
  });

  const catData = CATEGORIES.map((cat) => ({
    name: cat,
    value: monthRecords.filter((r) => r.category === cat).reduce((s, r) => s + r.amount, 0),
  })).filter((d) => d.value > 0);

  const payData = PAYMENT_METHODS.map((p) => ({
    name: p,
    value: monthRecords.filter((r) => r.payment === p).reduce((s, r) => s + r.amount, 0),
  })).filter((d) => d.value > 0);

  const monthTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    const ym = d.toISOString().slice(0, 7);
    return { month: ym.slice(5) + "月", total: records.filter((r) => r.date.startsWith(ym)).reduce((s, r) => s + r.amount, 0) };
  });

  const itemMap = {};
  monthRecords.forEach((r) => {
    if (!itemMap[r.item]) itemMap[r.item] = { count: 0, total: 0 };
    itemMap[r.item].count++; itemMap[r.item].total += r.amount;
  });
  const topItems = Object.entries(itemMap).sort((a, b) => b[1].total - a[1].total).slice(0, 5);

  function handleSubmit() {
    if (!form.item.trim() || !form.amount || Number(form.amount) <= 0) return;
    const rec = { id: Date.now(), date: todayStr(), item: form.item.trim(), category: form.category, amount: Number(form.amount), payment: form.payment, note: form.note.trim() };
    saveRecords([rec, ...records]);
    setForm({ item: "", category: form.category, amount: "", payment: form.payment, note: "" });
    setFlash(true); setTimeout(() => setFlash(false), 600);
    itemRef.current?.focus();
  }

  function handleDelete(id) {
    if (deleteConfirm === id) { saveRecords(records.filter((r) => r.id !== id)); setDeleteConfirm(null); }
    else { setDeleteConfirm(id); setTimeout(() => setDeleteConfirm(null), 3000); }
  }

  const groupedDates = [...new Set(records.map((r) => r.date))].sort((a, b) => b.localeCompare(a));
  const navItems = [{ key: "pos", label: "收銀", icon: "💴" }, { key: "history", label: "紀錄", icon: "📋" }, { key: "report", label: "報表", icon: "📊" }];
  const ttStyle = { contentStyle: { borderRadius: 8, border: "none", background: "#1a1a1a", color: "#e8d5b0", fontSize: 12 } };

  return (
    <div style={s.root}>
      <div style={s.header}>
        <div style={s.headerLeft}><span style={s.logo}>🎞</span><span style={s.brand}>凸相機</span></div>
        <div style={s.tabs}>
          {navItems.map(({ key, label, icon }) => (
            <button key={key} style={{ ...s.tab, ...(view === key ? s.tabActive : {}) }} onClick={() => setView(key)}>
              <span>{icon}</span>{label}
            </button>
          ))}
        </div>
      </div>

      {view === "pos" && (
        <div style={s.layout}>
          <div style={{ ...s.summaryCard, ...(flash ? s.summaryFlash : {}) }}>
            <div style={s.summaryLabel}>今日營業額</div>
            <div style={s.summaryAmount}>NT$ {fmt(todayTotal)}</div>
            <div style={s.summaryCount}>{todayRecords.length} 筆</div>
          </div>
          <div style={s.card}>
            <div style={s.fieldGroup}>
              <label style={s.label}>品項名稱</label>
              <input ref={itemRef} style={s.input} placeholder="例：Nikon FM2、Portra 400..." value={form.item}
                onChange={(e) => setForm({ ...form, item: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()} autoFocus />
            </div>
            <div style={s.row2}>
              <div style={{ ...s.fieldGroup, flex: 1 }}>
                <label style={s.label}>類別</label>
                <select style={s.select} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ ...s.fieldGroup, flex: 1 }}>
                <label style={s.label}>付款方式</label>
                <select style={s.select} value={form.payment} onChange={(e) => setForm({ ...form, payment: e.target.value })}>
                  {PAYMENT_METHODS.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>金額 (NT$)</label>
              <input style={{ ...s.input, ...s.amountInput }} type="number" placeholder="0" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()} min="0" />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>備註（選填）</label>
              <input style={s.input} placeholder="..." value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
            </div>
            <button style={{ ...s.submitBtn, ...(!form.item.trim() || !form.amount || Number(form.amount) <= 0 ? s.submitDisabled : {}) }} onClick={handleSubmit}>
              ＋ 新增紀錄
            </button>
          </div>
          {todayRecords.length > 0 && (
            <div style={s.card}>
              <div style={s.sectionTitle}>今日明細</div>
              {[...todayRecords].sort((a, b) => b.id - a.id).map((r) => <RecordRow key={r.id} r={r} deleteConfirm={deleteConfirm} onDelete={handleDelete} />)}
              <div style={s.dayTotal}><span>今日合計</span><span>NT$ {fmt(todayTotal)}</span></div>
            </div>
          )}
        </div>
      )}

      {view === "history" && (
        <div style={s.layout}>
          <div style={s.card}>
            <div style={s.historyHeader}>
              <div style={s.sectionTitle}>查詢日期</div>
              <input type="date" style={s.dateInput} value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
            </div>
            {filteredRecords.length === 0 ? <div style={s.empty}>這天沒有紀錄</div> : (
              <>
                {filteredRecords.map((r) => <RecordRow key={r.id} r={r} deleteConfirm={deleteConfirm} onDelete={handleDelete} />)}
                <div style={s.dayTotal}><span>當日合計</span><span>NT$ {fmt(filteredTotal)}</span></div>
              </>
            )}
          </div>
          <div style={s.card}>
            <div style={s.sectionTitle}>歷史總覽</div>
            {groupedDates.length === 0 ? <div style={s.empty}>尚無紀錄</div> : groupedDates.map((date) => {
              const dr = records.filter((r) => r.date === date);
              const dt = dr.reduce((s, r) => s + r.amount, 0);
              return (
                <div key={date} style={{ ...s.historyDayRow, ...(date === filterDate ? s.historyDayActive : {}) }} onClick={() => setFilterDate(date)}>
                  <div><div style={s.historyDate}>{date}</div><div style={s.historyCount}>{dr.length} 筆</div></div>
                  <div style={s.historyDayTotal}>NT$ {fmt(dt)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "report" && (
        <div style={s.layout}>
          <div style={s.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={s.sectionTitle}>選擇月份</div>
              <input type="month" style={s.dateInput} value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} />
            </div>
          </div>
          <div style={s.kpiRow}>
            <div style={s.kpiCard}><div style={s.kpiLabel}>月營業額</div><div style={s.kpiValue}>NT$ {fmt(monthTotal)}</div></div>
            <div style={s.kpiCard}><div style={s.kpiLabel}>銷售筆數</div><div style={s.kpiValue}>{monthRecords.length} 筆</div></div>
            <div style={s.kpiCard}><div style={s.kpiLabel}>平均客單價</div><div style={s.kpiValue}>NT$ {monthRecords.length > 0 ? fmt(Math.round(monthTotal / monthRecords.length)) : 0}</div></div>
          </div>
          <div style={s.card}>
            <div style={s.sectionTitle}>每日營業額</div>
            {monthTotal === 0 ? <div style={s.empty}>本月無資料</div> : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={dailyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#aaa" }} tickLine={false} axisLine={false} tickFormatter={(v) => v % 5 === 0 || v === 1 ? v : ""} />
                  <YAxis tick={{ fontSize: 10, fill: "#aaa" }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : v} />
                  <Tooltip formatter={(v) => [`NT$ ${fmt(v)}`, "營業額"]} labelFormatter={(l) => `${reportMonth}-${String(l).padStart(2, "0")}`} contentStyle={ttStyle.contentStyle} />
                  <Bar dataKey="total" fill="#1a1a1a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div style={s.card}>
            <div style={s.sectionTitle}>近六個月趨勢</div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={monthTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#aaa" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#aaa" }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : v} />
                <Tooltip formatter={(v) => [`NT$ ${fmt(v)}`, "營業額"]} contentStyle={ttStyle.contentStyle} />
                <Line type="monotone" dataKey="total" stroke="#e8a020" strokeWidth={2.5} dot={{ fill: "#e8a020", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={s.row2col}>
            <div style={s.card}>
              <div style={s.sectionTitle}>類別佔比</div>
              {catData.length === 0 ? <div style={s.empty}>無資料</div> : (
                <>
                  <ResponsiveContainer width="100%" height={130}>
                    <PieChart>
                      <Pie data={catData} dataKey="value" cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={3}>
                        {catData.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => `NT$ ${fmt(v)}`} contentStyle={ttStyle.contentStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={s.legend}>
                    {catData.map((d, i) => (
                      <div key={d.name} style={s.legendItem}>
                        <span style={{ ...s.legendDot, background: CAT_COLORS[i % CAT_COLORS.length] }} />
                        <span style={s.legendLabel}>{d.name}</span>
                        <span style={s.legendPct}>{Math.round(d.value / monthTotal * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div style={s.card}>
              <div style={s.sectionTitle}>付款方式</div>
              {payData.length === 0 ? <div style={s.empty}>無資料</div> : (
                <>
                  <ResponsiveContainer width="100%" height={130}>
                    <PieChart>
                      <Pie data={payData} dataKey="value" cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={3}>
                        {payData.map((_, i) => <Cell key={i} fill={PAY_COLORS[i % PAY_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => `NT$ ${fmt(v)}`} contentStyle={ttStyle.contentStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={s.legend}>
                    {payData.map((d, i) => (
                      <div key={d.name} style={s.legendItem}>
                        <span style={{ ...s.legendDot, background: PAY_COLORS[i % PAY_COLORS.length] }} />
                        <span style={s.legendLabel}>{d.name}</span>
                        <span style={s.legendPct}>{Math.round(d.value / monthTotal * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          <div style={s.card}>
            <div style={s.sectionTitle}>本月熱銷品項 Top 5</div>
            {topItems.length === 0 ? <div style={s.empty}>無資料</div> : topItems.map(([name, { count, total }], i) => (
              <div key={name} style={s.topRow}>
                <div style={s.topLeft}>
                  <span style={{ ...s.topRank, ...(i === 0 ? s.topRank1 : {}) }}>#{i + 1}</span>
                  <span style={s.topName}>{name}</span>
                  <span style={s.topCount}>{count} 筆</span>
                </div>
                <span style={s.topTotal}>NT$ {fmt(total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RecordRow({ r, deleteConfirm, onDelete }) {
  return (
    <div style={s.recordRow}>
      <div style={s.recordLeft}>
        <span style={s.categoryBadge}>{r.category}</span>
        <span style={s.recordItem}>{r.item}</span>
        {r.note && <span style={s.recordNote}>{r.note}</span>}
      </div>
      <div style={s.recordRight}>
        <span style={s.paymentTag}>{r.payment}</span>
        <span style={s.recordAmount}>NT$ {fmt(r.amount)}</span>
        <button style={{ ...s.deleteBtn, ...(deleteConfirm === r.id ? s.deleteBtnConfirm : {}) }} onClick={() => onDelete(r.id)}>
          {deleteConfirm === r.id ? "確認?" : "✕"}
        </button>
      </div>
    </div>
  );
}

const s = {
  root: { minHeight: "100vh", background: "#f5f0eb", fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif", color: "#1a1a1a" },
  header: { background: "#1a1a1a", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52, position: "sticky", top: 0, zIndex: 100 },
  headerLeft: { display: "flex", alignItems: "center", gap: 8 },
  logo: { fontSize: 20 },
  brand: { color: "#e8d5b0", fontWeight: 800, fontSize: 16, letterSpacing: 1 },
  tabs: { display: "flex", gap: 2 },
  tab: { background: "transparent", border: "none", color: "#666", padding: "5px 10px", borderRadius: 20, cursor: "pointer", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 },
  tabActive: { background: "#e8d5b0", color: "#1a1a1a" },
  layout: { maxWidth: 540, margin: "0 auto", padding: "16px 14px 40px", display: "flex", flexDirection: "column", gap: 14 },
  summaryCard: { background: "#1a1a1a", borderRadius: 16, padding: "22px 24px", textAlign: "center", transition: "background 0.2s" },
  summaryFlash: { background: "#3a7d44" },
  summaryLabel: { color: "#888", fontSize: 12, marginBottom: 4 },
  summaryAmount: { color: "#e8d5b0", fontSize: 36, fontWeight: 800, letterSpacing: -1 },
  summaryCount: { color: "#555", fontSize: 12, marginTop: 4 },
  card: { background: "#fff", borderRadius: 14, padding: "18px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" },
  fieldGroup: { marginBottom: 12 },
  label: { display: "block", fontSize: 11, color: "#999", marginBottom: 5, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" },
  input: { width: "100%", boxSizing: "border-box", border: "1.5px solid #ede8e0", borderRadius: 10, padding: "10px 13px", fontSize: 15, background: "#faf8f5", outline: "none", fontFamily: "inherit" },
  amountInput: { fontSize: 24, fontWeight: 800 },
  row2: { display: "flex", gap: 10, marginBottom: 12 },
  select: { width: "100%", boxSizing: "border-box", border: "1.5px solid #ede8e0", borderRadius: 10, padding: "10px 13px", fontSize: 14, background: "#faf8f5", outline: "none", fontFamily: "inherit", cursor: "pointer" },
  submitBtn: { width: "100%", background: "#1a1a1a", color: "#e8d5b0", border: "none", borderRadius: 10, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: 1, marginTop: 4 },
  submitDisabled: { background: "#ccc", color: "#fff", cursor: "not-allowed" },
  sectionTitle: { fontSize: 11, fontWeight: 800, color: "#aaa", letterSpacing: 1, marginBottom: 12, textTransform: "uppercase" },
  recordRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #f0ece6", gap: 8 },
  recordLeft: { display: "flex", alignItems: "center", gap: 7, flex: 1, minWidth: 0, flexWrap: "wrap" },
  categoryBadge: { background: "#f0ece6", color: "#888", borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" },
  recordItem: { fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  recordNote: { fontSize: 11, color: "#bbb" },
  recordRight: { display: "flex", alignItems: "center", gap: 7, flexShrink: 0 },
  paymentTag: { fontSize: 10, color: "#aaa", background: "#f5f5f5", borderRadius: 4, padding: "2px 6px", whiteSpace: "nowrap" },
  recordAmount: { fontSize: 14, fontWeight: 800, minWidth: 72, textAlign: "right" },
  deleteBtn: { background: "transparent", border: "1px solid #e0e0e0", borderRadius: 5, color: "#ccc", cursor: "pointer", padding: "2px 6px", fontSize: 11 },
  deleteBtnConfirm: { background: "#fee", border: "1px solid #f99", color: "#c00" },
  dayTotal: { display: "flex", justifyContent: "space-between", padding: "11px 0 0", marginTop: 4, fontSize: 15, fontWeight: 800, borderTop: "2px solid #1a1a1a" },
  historyHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  dateInput: { border: "1.5px solid #ede8e0", borderRadius: 8, padding: "6px 10px", fontSize: 13, background: "#faf8f5", outline: "none", fontFamily: "inherit" },
  empty: { textAlign: "center", color: "#ccc", padding: "28px 0", fontSize: 13 },
  historyDayRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 9, cursor: "pointer", marginBottom: 3, border: "1.5px solid transparent" },
  historyDayActive: { background: "#f5f0eb", border: "1.5px solid #e8d5b0" },
  historyDate: { fontSize: 13, fontWeight: 600 },
  historyCount: { fontSize: 11, color: "#bbb", marginTop: 1 },
  historyDayTotal: { fontSize: 15, fontWeight: 800 },
  kpiRow: { display: "flex", gap: 10 },
  kpiCard: { flex: 1, background: "#1a1a1a", borderRadius: 12, padding: "14px 10px", textAlign: "center" },
  kpiLabel: { fontSize: 10, color: "#888", fontWeight: 700, letterSpacing: 0.5, marginBottom: 6, textTransform: "uppercase" },
  kpiValue: { fontSize: 14, fontWeight: 800, color: "#e8d5b0", lineHeight: 1.3 },
  row2col: { display: "flex", gap: 10 },
  legend: { marginTop: 10, display: "flex", flexDirection: "column", gap: 5 },
  legendItem: { display: "flex", alignItems: "center", gap: 7 },
  legendDot: { width: 9, height: 9, borderRadius: "50%", flexShrink: 0 },
  legendLabel: { fontSize: 12, flex: 1, color: "#555" },
  legendPct: { fontSize: 12, fontWeight: 700 },
  topRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #f0ece6" },
  topLeft: { display: "flex", alignItems: "center", gap: 8 },
  topRank: { fontSize: 11, fontWeight: 800, color: "#bbb", minWidth: 24 },
  topRank1: { color: "#e8a020" },
  topName: { fontSize: 14, fontWeight: 600 },
  topCount: { fontSize: 11, color: "#bbb" },
  topTotal: { fontSize: 14, fontWeight: 800 },
};
