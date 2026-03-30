import { useState, useEffect } from 'react'
import {
  ScatterChart, Scatter, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceDot, Cell
} from 'recharts'
import { RefreshCw, TrendingUp, BarChart2, Grid, Info } from 'lucide-react'

const API = 'http://localhost:5000'

/* ── colour palette for 10 funds ── */
const FUND_COLORS = [
  '#c9a84c','#38bdf8','#4ade80','#f87171','#a78bfa',
  '#fb923c','#34d399','#f472b6','#60a5fa','#facc15'
]

/* ─────────────────────────────────────────────────────────
   Custom Tooltip for scatter charts
───────────────────────────────────────────────────────── */
function ScatterTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,padding:'10px 14px',fontSize:'.78rem',fontFamily:"'IBM Plex Mono',monospace"}}>
      {d.name && <div style={{color:'var(--gold)',marginBottom:4,fontFamily:"'Syne',sans-serif",fontWeight:600}}>{d.name}</div>}
      <div style={{color:'var(--text-muted)'}}>σ &nbsp;<span style={{color:'var(--text)'}}>{(+d.x).toFixed(2)}%</span></div>
      <div style={{color:'var(--text-muted)'}}>r &nbsp;<span style={{color:'var(--text)'}}>{(+d.y).toFixed(2)}%</span></div>
      {d.sharpe !== undefined && <div style={{color:'var(--text-muted)'}}>Sharpe <span style={{color:'var(--gold)'}}>{(+d.sharpe).toFixed(3)}</span></div>}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   Correlation Heatmap
───────────────────────────────────────────────────────── */
function CorrelationHeatmap({ matrix, labels }) {
  if (!matrix || !labels) return null
  const n = labels.length
  const cellSize = Math.min(52, Math.floor(560 / n))

  function getColor(v) {
    // -1 → red, 0 → surface2, +1 → gold
    if (v >= 0) {
      const t = v
      const r = Math.round(201 * t)
      const g = Math.round(168 * t)
      const b = Math.round(76 * t)
      return `rgba(${r},${g},${b},${0.2 + 0.7*t})`
    } else {
      const t = -v
      return `rgba(248,113,113,${0.1 + 0.75*t})`
    }
  }

  return (
    <div style={{overflowX:'auto'}}>
      <div style={{display:'inline-block',minWidth: (n+1)*cellSize}}>
        {/* header row */}
        <div style={{display:'flex', marginLeft: cellSize}}>
          {labels.map(l=>(
            <div key={l} style={{width:cellSize,minWidth:cellSize,fontSize:9,color:'var(--text-muted)',textAlign:'center',padding:'2px 0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontFamily:"'IBM Plex Mono',monospace"}}>
              {l.slice(0,6)}
            </div>
          ))}
        </div>
        {matrix.map((row, i)=>(
          <div key={i} style={{display:'flex',alignItems:'center'}}>
            <div style={{width:cellSize,minWidth:cellSize,fontSize:9,color:'var(--text-muted)',textAlign:'right',paddingRight:6,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontFamily:"'IBM Plex Mono',monospace"}}>
              {labels[i].slice(0,6)}
            </div>
            {row.map((v,j)=>(
              <div key={j}
                title={`${labels[i]} × ${labels[j]}: ${v.toFixed(3)}`}
                style={{
                  width:cellSize,height:cellSize,minWidth:cellSize,
                  background: getColor(v),
                  border:'1px solid var(--surface)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize: cellSize > 40 ? 9 : 7,
                  color: Math.abs(v) > 0.5 ? '#fff' : 'var(--text-muted)',
                  fontFamily:"'IBM Plex Mono',monospace",
                  cursor:'default',
                  transition:'transform .15s',
                }}
              >
                {cellSize > 36 ? v.toFixed(2) : ''}
              </div>
            ))}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div style={{display:'flex',alignItems:'center',gap:8,marginTop:12,fontSize:'.72rem',color:'var(--text-muted)'}}>
        <div style={{width:60,height:8,borderRadius:4,background:'linear-gradient(90deg,rgba(248,113,113,.85),var(--surface2),rgba(201,168,76,.85))'}}/>
        <span>-1.0 (inverse)</span><span style={{marginLeft:'auto'}}>+1.0 (perfect correlation)</span>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   GMVP Weights Bar Chart (custom, horizontal)
───────────────────────────────────────────────────────── */
function WeightsChart({ weights, labels }) {
  if (!weights || !labels) return null
  const items = labels.map((l,i)=>({label:l, weight:weights[i], color:FUND_COLORS[i%FUND_COLORS.length]}))
    .sort((a,b)=>Math.abs(b.weight)-Math.abs(a.weight))

  return (
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      {items.map((it,i)=>{
        const pct = Math.abs(it.weight)*100
        const isShort = it.weight < 0
        return (
          <div key={i} style={{display:'grid',gridTemplateColumns:'90px 1fr 48px',alignItems:'center',gap:10}}>
            <div style={{fontSize:'.72rem',color:'var(--text-muted)',textAlign:'right',fontFamily:"'IBM Plex Mono',monospace",overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={it.label}>
              {it.label.slice(0,10)}
            </div>
            <div style={{height:18,background:'var(--surface2)',borderRadius:4,overflow:'hidden',position:'relative'}}>
              <div style={{position:'absolute',top:0,left:0,height:'100%',width:`${Math.min(pct,100)}%`,background:isShort?'var(--red)':it.color,borderRadius:4,opacity:.85,transition:'width .6s ease'}}/>
            </div>
            <div style={{fontSize:'.72rem',fontFamily:"'IBM Plex Mono',monospace",color:isShort?'var(--red)':'var(--text)',textAlign:'right'}}>
              {isShort?'-':''}{pct.toFixed(1)}%
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────── */
export default function PortfolioPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('no-short')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/api/portfolio`)
      if (!res.ok) throw new Error('Server returned ' + res.status)
      const d = await res.json()
      setData(d)
    } catch(e) {
      setError('Could not load portfolio data. Make sure Flask is running on port 5000.')
    }
    setLoading(false)
  }

  if (loading) return (
    <div className="page" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:40,height:40,border:'3px solid var(--border)',borderTopColor:'var(--gold)',borderRadius:'50%',animation:'spin .8s linear infinite',margin:'0 auto 16px'}}/>
        <div style={{color:'var(--text-muted)',fontSize:'.85rem',letterSpacing:'.08em',textTransform:'uppercase'}}>Loading analytics…</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (error) return (
    <div className="page">
      <div style={{background:'rgba(248,113,113,.08)',border:'1px solid var(--red)',borderRadius:'var(--radius-lg)',padding:'28px 32px'}}>
        <div style={{color:'var(--red)',fontWeight:600,marginBottom:8}}>Connection Error</div>
        <div style={{color:'var(--text-muted)',fontSize:'.88rem',lineHeight:1.6,marginBottom:16}}>{error}</div>
        <button onClick={loadData} style={{display:'inline-flex',alignItems:'center',gap:8,background:'var(--gold)',color:'#000',fontWeight:700,fontSize:'.82rem',padding:'10px 20px',borderRadius:99,border:'none',cursor:'pointer'}}>
          <RefreshCw size={14}/> Retry
        </button>
      </div>
    </div>
  )

  const { funds, frontier_no_short, frontier_short, gmvp_no_short, gmvp_short, correlation, returns, std_devs, fund_names } = data

  const activeFrontier = activeTab === 'no-short' ? frontier_no_short : frontier_short
  const activeGmvp     = activeTab === 'no-short' ? gmvp_no_short     : gmvp_short

  /* Build fund scatter points */
  const fundPoints = fund_names.map((name,i)=>({
    x: +(std_devs[i]*100).toFixed(3),
    y: +(returns[i]*100).toFixed(3),
    name,
    color: FUND_COLORS[i % FUND_COLORS.length],
  }))

  /* Frontier line data */
  const frontierLine = activeFrontier.std.map((s,i)=>({
    x: +(s*100).toFixed(3),
    y: +(activeFrontier.ret[i]*100).toFixed(3),
  }))

  const gmvpPoint = [{
    x: +(activeGmvp.std*100).toFixed(3),
    y: +(activeGmvp.return*100).toFixed(3),
    name: 'GMVP',
    sharpe: activeGmvp.sharpe,
  }]

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-eyebrow">Part 1 · Portfolio Analytics</div>
        <h1 className="page-title">Efficient Frontier<br/><em style={{color:'var(--gold)'}}>& Analytics</em></h1>
        <p className="page-sub">Mean-variance analysis of {fund_names.length} funds. Toggle between constrained (no short sales) and unconstrained frontiers.</p>
      </div>

      {/* ── Tab switcher ── */}
      <div style={{display:'flex',gap:8,marginBottom:28}}>
        {[
          { id:'no-short', label:'No Short Sales' },
          { id:'short',    label:'Short Sales Allowed' },
        ].map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            style={{fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:'.8rem',letterSpacing:'.06em',textTransform:'uppercase',padding:'9px 20px',borderRadius:99,border:'1.5px solid',cursor:'pointer',transition:'all .2s',
              background:activeTab===t.id?'var(--gold)':'transparent',
              color:activeTab===t.id?'#000':'var(--text-muted)',
              borderColor:activeTab===t.id?'var(--gold)':'var(--border2)',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Frontier + GMVP stats ── */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:20,marginBottom:24}}>

        {/* Chart */}
        <div className="card" style={{padding:'24px 20px 16px'}}>
          <div className="card-title"><TrendingUp size={14}/> Efficient Frontier</div>
          <ResponsiveContainer width="100%" height={380}>
            <ScatterChart margin={{top:10,right:20,bottom:20,left:10}}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" strokeOpacity={.5}/>
              <XAxis dataKey="x" name="Risk (σ %)" type="number" domain={['auto','auto']}
                label={{value:'Annualised σ (%)',position:'insideBottom',offset:-8,fill:'var(--text-muted)',fontSize:11}}
                tick={{fill:'var(--text-muted)',fontSize:10,fontFamily:'IBM Plex Mono'}}/>
              <YAxis dataKey="y" name="Return (%)" type="number" domain={['auto','auto']}
                label={{value:'Annualised Return (%)',angle:-90,position:'insideLeft',offset:12,fill:'var(--text-muted)',fontSize:11}}
                tick={{fill:'var(--text-muted)',fontSize:10,fontFamily:'IBM Plex Mono'}}/>
              <Tooltip content={<ScatterTooltip/>}/>

              {/* Frontier line (use Line via LineChart trick: render as dots) */}
              <Scatter name="Frontier" data={frontierLine} line={{stroke:'var(--cyan)',strokeWidth:2}} fill="transparent" lineJointType="monotoneX"/>

              {/* Individual funds */}
              {fundPoints.map((fp,i)=>(
                <Scatter key={fp.name} name={fp.name} data={[fp]} fill={fp.color} r={6}>
                  <Cell fill={fp.color}/>
                </Scatter>
              ))}

              {/* GMVP */}
              <Scatter name="GMVP" data={gmvpPoint} fill="#fff" r={10} shape="star">
                <Cell fill="var(--gold)"/>
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          {/* Fund legend */}
          <div style={{display:'flex',flexWrap:'wrap',gap:'6px 14px',marginTop:8,paddingTop:12,borderTop:'1px solid var(--border)'}}>
            {fundPoints.map((fp,i)=>(
              <div key={fp.name} style={{display:'flex',alignItems:'center',gap:5,fontSize:'.68rem',color:'var(--text-muted)'}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:fp.color,flexShrink:0}}/>
                {fp.name}
              </div>
            ))}
            <div style={{display:'flex',alignItems:'center',gap:5,fontSize:'.68rem',color:'var(--gold)'}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:'var(--gold)',flexShrink:0}}/>
              GMVP
            </div>
          </div>
        </div>

        {/* GMVP Stats panel */}
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div className="card">
            <div className="card-title">GMVP</div>
            {[
              {label:'Expected Return', value:`${(activeGmvp.return*100).toFixed(3)}%`},
              {label:'Std Deviation',   value:`${(activeGmvp.std*100).toFixed(3)}%`},
              {label:'Sharpe Ratio',    value:activeGmvp.sharpe.toFixed(4)},
            ].map(s=>(
              <div key={s.label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
                <span style={{fontSize:'.75rem',color:'var(--text-muted)'}}>{s.label}</span>
                <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:'.82rem',color:'var(--gold)'}}>{s.value}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-title">GMVP Weights</div>
            <WeightsChart weights={activeGmvp.weights} labels={fund_names}/>
          </div>
        </div>
      </div>

      {/* ── Average Returns + Std Devs table ── */}
      <div className="card" style={{marginBottom:24}}>
        <div className="card-title"><BarChart2 size={14}/> Fund Statistics</div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.8rem'}}>
            <thead>
              <tr style={{borderBottom:'1px solid var(--border)'}}>
                {['Fund','Avg Return (ann.)','Std Dev (ann.)','Sharpe (approx.)'].map(h=>(
                  <th key={h} style={{textAlign:'left',padding:'8px 12px',color:'var(--text-muted)',fontSize:'.7rem',textTransform:'uppercase',letterSpacing:'.08em',fontWeight:500}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fund_names.map((name,i)=>{
                const r  = returns[i]
                const s  = std_devs[i]
                const sh = s > 0 ? r/s : 0
                return (
                  <tr key={name} style={{borderBottom:'1px solid var(--border)',transition:'background .15s'}}>
                    <td style={{padding:'10px 12px',display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:8,height:8,borderRadius:'50%',background:FUND_COLORS[i%FUND_COLORS.length],flexShrink:0}}/>
                      <span style={{fontWeight:500}}>{name}</span>
                    </td>
                    <td style={{padding:'10px 12px',fontFamily:"'IBM Plex Mono',monospace",color: r>=0?'var(--green)':'var(--red)'}}>
                      {r>=0?'+':''}{(r*100).toFixed(3)}%
                    </td>
                    <td style={{padding:'10px 12px',fontFamily:"'IBM Plex Mono',monospace",color:'var(--text-muted)'}}>
                      {(s*100).toFixed(3)}%
                    </td>
                    <td style={{padding:'10px 12px',fontFamily:"'IBM Plex Mono',monospace",color:'var(--text-muted)'}}>
                      {sh.toFixed(3)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Correlation Heatmap ── */}
      <div className="card" style={{marginBottom:24}}>
        <div className="card-title"><Grid size={14}/> Correlation Matrix</div>
        <CorrelationHeatmap matrix={correlation} labels={fund_names}/>
      </div>

      {/* ── Frontier Comparison overlay ── */}
      <div className="card">
        <div className="card-title"><TrendingUp size={14}/> Frontier Comparison — Both Modes</div>
        <div style={{fontSize:'.8rem',color:'var(--text-muted)',marginBottom:16}}>
          The unconstrained frontier (short sales) is always at least as efficient as the constrained one.
        </div>
        <ResponsiveContainer width="100%" height={340}>
          <ScatterChart margin={{top:10,right:20,bottom:20,left:10}}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" strokeOpacity={.4}/>
            <XAxis dataKey="x" name="Risk (σ%)" type="number" domain={['auto','auto']}
              label={{value:'σ (%)',position:'insideBottom',offset:-8,fill:'var(--text-muted)',fontSize:11}}
              tick={{fill:'var(--text-muted)',fontSize:10,fontFamily:'IBM Plex Mono'}}/>
            <YAxis dataKey="y" name="Return (%)" type="number" domain={['auto','auto']}
              label={{value:'Return (%)',angle:-90,position:'insideLeft',offset:12,fill:'var(--text-muted)',fontSize:11}}
              tick={{fill:'var(--text-muted)',fontSize:10,fontFamily:'IBM Plex Mono'}}/>
            <Tooltip content={<ScatterTooltip/>}/>
            <Legend wrapperStyle={{fontSize:'.78rem',color:'var(--text-muted)',paddingTop:8}}/>
            <Scatter name="No Short Sales" data={frontier_no_short.std.map((s,i)=>({x:+(s*100).toFixed(3),y:+(frontier_no_short.ret[i]*100).toFixed(3)}))} line={{stroke:'var(--cyan)',strokeWidth:2}} fill="transparent"/>
            <Scatter name="Short Sales Allowed" data={frontier_short.std.map((s,i)=>({x:+(s*100).toFixed(3),y:+(frontier_short.ret[i]*100).toFixed(3)}))} line={{stroke:'var(--gold)',strokeWidth:2,strokeDasharray:'5 3'}} fill="transparent"/>
            <Scatter name="GMVP (No Short)" data={[{x:+(gmvp_no_short.std*100).toFixed(3),y:+(gmvp_no_short.return*100).toFixed(3),name:'GMVP (No Short)'}]} fill="var(--cyan)" r={8}/>
            <Scatter name="GMVP (Short)" data={[{x:+(gmvp_short.std*100).toFixed(3),y:+(gmvp_short.return*100).toFixed(3),name:'GMVP (Short)'}]} fill="var(--gold)" r={8}/>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
