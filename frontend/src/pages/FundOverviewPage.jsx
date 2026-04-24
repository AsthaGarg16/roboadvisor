import { useState, useEffect } from 'react'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell
} from 'recharts'
import { BarChart2, TrendingUp, Grid, Activity, RefreshCw } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5001'

const FUND_COLORS = [
  '#c9a84c','#38bdf8','#4ade80','#f87171','#a78bfa',
  '#fb923c','#34d399','#f472b6','#60a5fa','#facc15',
]

// ─── Fund descriptions shown on hover in the stats table ─────────────────────
const FUND_DESC = {
  SPY: 'S&P 500 — US large-cap equities',
  QQQ: 'NASDAQ-100 — US tech & growth',
  XLV: 'Health Care Select Sector SPDR',
  EWJ: 'iShares MSCI Japan ETF',
  FXI: 'iShares China Large-Cap ETF',
  EWZ: 'iShares MSCI Brazil ETF',
  EEM: 'iShares MSCI Emerging Markets',
  GLD: 'SPDR Gold Trust',
  VNQ: 'Vanguard Real Estate ETF',
  SHY: 'iShares 1-3 Year Treasury Bond',
}

// ─── Custom tooltip shared by bar charts ─────────────────────────────────────
function BarTooltip({ active, payload, label, suffix = '%', decimals = 2 }) {
  if (!active || !payload?.length) return null
  const v = payload[0]?.value
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 14px', fontSize: '.9rem',
      fontFamily: "'IBM Plex Mono', monospace",
    }}>
      <div style={{ color: 'var(--gold)', marginBottom: 4, fontFamily: "'DM Sans',sans-serif", fontWeight: 600 }}>{label}</div>
      {FUND_DESC[label] && <div style={{ color: 'var(--text-muted)', fontSize: '.85rem', marginBottom: 6 }}>{FUND_DESC[label]}</div>}
      <div style={{ color: v >= 0 ? 'var(--green)' : 'var(--red)' }}>
        {v >= 0 && suffix === '%' ? '+' : ''}{v?.toFixed(decimals)}{suffix}
      </div>
    </div>
  )
}

// ─── Custom tooltip for line charts ──────────────────────────────────────────
function LineTooltip({ active, payload, label, suffix = '', decimals = 2 }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 14px', fontSize: '.88rem',
      fontFamily: "'IBM Plex Mono', monospace", maxWidth: 220,
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 6, fontSize: '.83rem' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: p.color, marginBottom: 2 }}>
          <span style={{ color: 'var(--text-muted)' }}>{p.name}</span>
          <span>{p.value?.toFixed(decimals)}{suffix}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Interactive Covariance / Correlation Heatmap ────────────────────────────
function Heatmap({ matrix, labels, title, isCovariance = false }) {
  const [hovered, setHovered] = useState(null)   // { i, j }
  if (!matrix || !labels) return null

  const n = labels.length
  const cellSize = Math.min(56, Math.floor(600 / n))
  const values = matrix.flat()
  const absMax = isCovariance ? Math.max(...values.map(Math.abs)) : 1

  function getColor(v) {
    const t = Math.abs(v) / absMax
    if (v >= 0) {
      const r = Math.round(201 * t), g = Math.round(168 * t), b = Math.round(76 * t)
      return `rgba(${r},${g},${b},${0.15 + 0.75 * t})`
    } else {
      return `rgba(248,113,113,${0.1 + 0.75 * t})`
    }
  }

  const isHov = (i, j) => hovered && (hovered.i === i || hovered.j === j)

  return (
    <div>
      {/* Hover info bar */}
      <div style={{
        minHeight: 28, marginBottom: 10, fontSize: '.9rem',
        fontFamily: "'IBM Plex Mono', monospace",
        color: hovered ? 'var(--text)' : 'var(--text-muted)',
        transition: 'color .15s',
      }}>
        {hovered
          ? <>
              <span style={{ color: 'var(--gold)' }}>{labels[hovered.i]}</span>
              <span style={{ color: 'var(--text-muted)' }}> × </span>
              <span style={{ color: 'var(--gold)' }}>{labels[hovered.j]}</span>
              <span style={{ color: 'var(--text-muted)' }}>  →  </span>
              <span>{isCovariance
                ? matrix[hovered.i][hovered.j].toFixed(6)
                : matrix[hovered.i][hovered.j].toFixed(4)}
              </span>
            </>
          : 'Hover a cell to see the exact value'
        }
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'inline-block', minWidth: (n + 1) * cellSize }}>
          {/* Column headers */}
          <div style={{ display: 'flex', marginLeft: cellSize }}>
            {labels.map(l => (
              <div key={l} style={{
                width: cellSize, minWidth: cellSize, fontSize: 9,
                color: 'var(--text-muted)', textAlign: 'center', padding: '2px 0',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontFamily: "'IBM Plex Mono', monospace",
              }}>{l.slice(0, 6)}</div>
            ))}
          </div>

          {matrix.map((row, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              {/* Row label */}
              <div style={{
                width: cellSize, minWidth: cellSize, fontSize: 9,
                color: 'var(--text-muted)', textAlign: 'right', paddingRight: 6,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontFamily: "'IBM Plex Mono', monospace",
              }}>{labels[i].slice(0, 6)}</div>

              {row.map((v, j) => {
                const highlighted = isHov(i, j)
                return (
                  <div key={j}
                    onMouseEnter={() => setHovered({ i, j })}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      width: cellSize, height: cellSize, minWidth: cellSize,
                      background: getColor(v),
                      border: highlighted
                        ? '1px solid var(--gold)'
                        : '1px solid var(--surface)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: cellSize > 44 ? 8 : 7,
                      color: Math.abs(v) / absMax > 0.5 ? 'var(--surface)' : 'var(--text-muted)',
                      fontFamily: "'IBM Plex Mono', monospace",
                      cursor: 'crosshair',
                      transition: 'border .1s, transform .1s',
                      transform: highlighted ? 'scale(1.06)' : 'scale(1)',
                      zIndex: highlighted ? 2 : 0,
                      position: 'relative',
                    }}
                  >
                    {cellSize > 38
                      ? (isCovariance ? v.toFixed(4) : v.toFixed(2))
                      : ''}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: '.85rem', color: 'var(--text-muted)' }}>
        <div style={{ width: 80, height: 8, borderRadius: 4, background: 'linear-gradient(90deg,rgba(248,113,113,.85),var(--surface2),rgba(201,168,76,.9))' }}/>
        <span>{isCovariance ? 'Negative' : '−1.0'}</span>
        <span style={{ marginLeft: 'auto' }}>{isCovariance ? 'Positive' : '+1.0'}</span>
      </div>
    </div>
  )
}

// ─── Sortable Fund Stats Table ────────────────────────────────────────────────
function FundStatsTable({ data }) {
  const [sortKey, setSortKey]   = useState(null)
  const [sortDir, setSortDir]   = useState(null)   // null | 'desc' | 'asc'

  if (!data) return null
  const { fund_names, returns, std_devs, variances, sharpe_ratios } = data

  const rows = fund_names.map((name, i) => ({
    name, return: returns[i], std: std_devs[i],
    variance: variances[i], sharpe: sharpe_ratios[i],
    color: FUND_COLORS[i % FUND_COLORS.length],
  }))

  const sortedRows = (sortKey && sortDir)
    ? [...rows].sort((a, b) => {
        const v = a[sortKey] - b[sortKey]
        return sortDir === 'asc' ? v : -v
      })
    : rows

  function toggleSort(key) {
    if (sortKey !== key) {
      setSortKey(key); setSortDir('desc')
    } else {
      // cycle: desc → asc → null (default)
      if (sortDir === 'desc') setSortDir('asc')
      else if (sortDir === 'asc') { setSortKey(null); setSortDir(null) }
      else { setSortKey(key); setSortDir('desc') }
    }
  }

  const cols = [
    { key: 'name',     label: 'Fund',          sortable: false },
    { key: 'return',   label: 'Avg Return (ann.)',  sortable: true },
    { key: 'std',      label: 'Std Dev (ann.)',     sortable: true },
    { key: 'variance', label: 'Variance',           sortable: true },
    { key: 'sharpe',   label: 'Sharpe Ratio',       sortable: true },
  ]

  const arrow = (key) => {
    if (sortKey !== key) return ' ↕'
    return sortDir === 'asc' ? ' ↑' : ' ↓'
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.93rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {cols.map(c => (
              <th key={c.key}
                onClick={c.sortable ? () => toggleSort(c.key) : undefined}
                style={{
                  textAlign: 'left', padding: '8px 12px',
                  color: sortKey === c.key ? 'var(--gold)' : 'var(--text-muted)',
                  fontSize: '.83rem', textTransform: 'uppercase', letterSpacing: '.08em',
                  fontWeight: 500, cursor: c.sortable ? 'pointer' : 'default',
                  userSelect: 'none', whiteSpace: 'nowrap',
                }}>
                {c.label}{c.sortable ? arrow(c.key) : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map(row => (
            <tr key={row.name} style={{ borderBottom: '1px solid var(--border)', transition: 'background .15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <td style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: row.color, flexShrink: 0 }}/>
                <div>
                  <div style={{ fontWeight: 500 }}>{row.name}</div>
                  {FUND_DESC[row.name] && (
                    <div style={{ fontSize: '.81rem', color: 'var(--text-muted)', marginTop: 1 }}>{FUND_DESC[row.name]}</div>
                  )}
                </div>
              </td>
              <td style={{ padding: '10px 12px', fontFamily: "'IBM Plex Mono', monospace", color: row.return >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {row.return >= 0 ? '+' : ''}{(row.return * 100).toFixed(3)}%
              </td>
              <td style={{ padding: '10px 12px', fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text-muted)' }}>
                {(row.std * 100).toFixed(3)}%
              </td>
              <td style={{ padding: '10px 12px', fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text-muted)', fontSize: '.88rem' }}>
                {row.variance.toFixed(6)}
              </td>
              <td style={{ padding: '10px 12px', fontFamily: "'IBM Plex Mono', monospace", color: row.sharpe >= 0 ? 'var(--text)' : 'var(--red)' }}>
                {row.sharpe.toFixed(3)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: '.83rem', color: 'var(--text-muted)', marginTop: 8, paddingLeft: 12 }}>
        Click column headers to sort. Sharpe ratio uses Rf = 0%.
      </div>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function FundOverviewPage() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [hiddenFunds, setHiddenFunds] = useState(new Set())   // for line chart toggles

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/api/fund-overview`)
      if (!res.ok) throw new Error('Server returned ' + res.status)
      setData(await res.json())
    } catch (e) {
      setError('Could not load fund data. Make sure Flask is running on port 5000.')
    }
    setLoading(false)
  }

  function toggleFund(name) {
    setHiddenFunds(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  if (loading) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 16px' }}/>
        <div style={{ color: 'var(--text-muted)', fontSize: '.98rem', letterSpacing: '.08em', textTransform: 'uppercase' }}>Loading fund data…</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (error) return (
    <div className="page">
      <div style={{ background: 'rgba(248,113,113,.08)', border: '1px solid var(--red)', borderRadius: 'var(--radius-lg)', padding: '28px 32px' }}>
        <div style={{ color: 'var(--red)', fontWeight: 600, marginBottom: 8 }}>Connection Error</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '1.005rem', lineHeight: 1.6, marginBottom: 16 }}>{error}</div>
        <button onClick={loadData} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--gold)', color: 'var(--btn-text-on-gold)', fontWeight: 700, fontSize: '.95rem', padding: '10px 20px', borderRadius: 99, border: 'none', cursor: 'pointer' }}>
          <RefreshCw size={14}/> Retry
        </button>
      </div>
    </div>
  )

  const { fund_names, returns, std_devs, covariance, correlation, cumulative, rolling_vol } = data

  // Bar chart data
  const returnsBarData = fund_names.map((name, i) => ({ name, value: +(returns[i] * 100).toFixed(3) }))
  const stdBarData     = fund_names.map((name, i) => ({ name, value: +(std_devs[i] * 100).toFixed(3) }))

  // Line chart data — one object per date, one key per fund
  function buildLineData(seriesObj, dates) {
    return dates.map((date, di) => {
      const obj = { date }
      fund_names.forEach(name => { obj[name] = seriesObj[name]?.[di] ?? null })
      return obj
    })
  }
  const cumLineData  = buildLineData(cumulative.series,  cumulative.dates)
  const rolLineData  = buildLineData(rolling_vol.series, rolling_vol.dates)

  // Tick formatter: show every 6th label for readability
  const xTickFormatter = (val, idx) => idx % 6 === 0 ? val : ''

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-eyebrow">Fund Analytics</div>
        <h1 className="page-title">Fund Overview<br/><em style={{ color: 'var(--gold)' }}>& Statistics</em></h1>
        <p className="page-sub">
          Historical analysis of the {fund_names.length} funds available in the portfolio (2019–2024).
          All charts are interactive — hover for values, click the legend to show/hide individual funds.
        </p>
      </div>

      {/* ── 1. Average Annual Returns ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title"><BarChart2 size={14}/> Average Annual Return</div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={returnsBarData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" strokeOpacity={.5} vertical={false}/>
            <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'IBM Plex Mono' }}/>
            <YAxis tickFormatter={v => `${v}%`} tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'IBM Plex Mono' }}/>
            <Tooltip content={<BarTooltip suffix="%" decimals={3}/>} cursor={false}/>
            <ReferenceLine y={0} stroke="var(--border2)" strokeWidth={1}/>
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48} cursor={false}>
              {returnsBarData.map((entry, i) => (
                <Cell key={i} fill={entry.value >= 0 ? FUND_COLORS[i % FUND_COLORS.length] : '#f87171'}/>
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginTop: 4, paddingLeft: 4 }}>
          Annualised mean of daily log returns × 252. Negative bars shown in red.
        </div>
      </div>

      {/* ── 2. Standard Deviation ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title"><Activity size={14}/> Annualised Standard Deviation</div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stdBarData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" strokeOpacity={.5} vertical={false}/>
            <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'IBM Plex Mono' }}/>
            <YAxis tickFormatter={v => `${v}%`} tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'IBM Plex Mono' }}/>
            <Tooltip content={<BarTooltip suffix="%" decimals={3}/>} cursor={false}/>
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48} cursor={false}>
              {stdBarData.map((entry, i) => (
                <Cell key={i} fill={FUND_COLORS[i % FUND_COLORS.length]} fillOpacity={0.85}/>
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginTop: 4, paddingLeft: 4 }}>
          Annualised std dev of daily log returns × √252.
        </div>
      </div>

      {/* ── 3. Variance-Covariance Matrix ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title"><Grid size={14}/> Variance-Covariance Matrix</div>
        <Heatmap matrix={covariance} labels={fund_names} isCovariance={true}/>
      </div>

      {/* ── 4. Correlation Matrix ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title"><Grid size={14}/> Correlation Matrix</div>
        <Heatmap matrix={correlation} labels={fund_names} isCovariance={false}/>
      </div>

      {/* ── 5. Cumulative Price Growth ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title"><TrendingUp size={14}/> Cumulative Price Growth (Jan 2019 = 100)</div>

        {/* Fund toggle buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {fund_names.map((name, i) => {
            const hidden = hiddenFunds.has(name)
            return (
              <button key={name} onClick={() => toggleFund(name)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 12px', borderRadius: 99, fontSize: '.85rem', fontWeight: 600,
                border: '1px solid', cursor: 'pointer', transition: 'all .15s',
                background: hidden ? 'transparent' : `${FUND_COLORS[i % FUND_COLORS.length]}22`,
                borderColor: hidden ? 'var(--border2)' : FUND_COLORS[i % FUND_COLORS.length],
                color: hidden ? 'var(--text-muted)' : FUND_COLORS[i % FUND_COLORS.length],
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: hidden ? 'var(--border2)' : FUND_COLORS[i % FUND_COLORS.length], display: 'inline-block' }}/>
                {name}
              </button>
            )
          })}
        </div>

        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={cumLineData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" strokeOpacity={.4}/>
            <XAxis dataKey="date" tickFormatter={xTickFormatter}
              tick={{ fill: 'var(--text-muted)', fontSize: 9, fontFamily: 'IBM Plex Mono' }}/>
            <YAxis tickFormatter={v => v.toFixed(0)}
              tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'IBM Plex Mono' }}/>
            <Tooltip content={<LineTooltip suffix="" decimals={1}/>}/>
            <ReferenceLine y={100} stroke="var(--border2)" strokeDasharray="4 2" strokeWidth={1}/>
            {fund_names.map((name, i) => !hiddenFunds.has(name) && (
              <Line key={name} type="monotone" dataKey={name}
                stroke={FUND_COLORS[i % FUND_COLORS.length]}
                strokeWidth={1.8} dot={false} name={name}
                activeDot={{ r: 4, fill: FUND_COLORS[i % FUND_COLORS.length] }}/>
            ))}
          </LineChart>
        </ResponsiveContainer>
        <div style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginTop: 4, paddingLeft: 4 }}>
          Monthly resampled (end-of-month). Click fund buttons above to show/hide individual series.
        </div>
      </div>

      {/* ── 6. Rolling 30-Day Volatility ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title"><Activity size={14}/> 30-Day Rolling Volatility (Annualised)</div>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={rolLineData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" strokeOpacity={.4}/>
            <XAxis dataKey="date" tickFormatter={xTickFormatter}
              tick={{ fill: 'var(--text-muted)', fontSize: 9, fontFamily: 'IBM Plex Mono' }}/>
            <YAxis tickFormatter={v => `${(v * 100).toFixed(0)}%`}
              tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'IBM Plex Mono' }}/>
            <Tooltip content={<LineTooltip suffix="" decimals={4}/>}
              formatter={(v) => [`${(v * 100).toFixed(1)}%`]}/>
            <Legend wrapperStyle={{ fontSize: '.88rem', color: 'var(--text-muted)', paddingTop: 8 }}/>
            {fund_names.map((name, i) => !hiddenFunds.has(name) && (
              <Line key={name} type="monotone" dataKey={name}
                stroke={FUND_COLORS[i % FUND_COLORS.length]}
                strokeWidth={1.6} dot={false} name={name}
                activeDot={{ r: 4 }}/>
            ))}
          </LineChart>
        </ResponsiveContainer>
        <div style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginTop: 4, paddingLeft: 4 }}>
          Rolling 30-trading-day std dev × √252, resampled to monthly. COVID spike visible around Mar 2020.
        </div>
      </div>

      {/* ── 7. Fund Statistics Table ── */}
      <div className="card">
        <div className="card-title"><BarChart2 size={14}/> Fund Statistics — Sortable</div>
        <FundStatsTable data={data}/>
      </div>
    </div>
  )
}
