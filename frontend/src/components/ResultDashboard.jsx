import { useState, useRef, useEffect } from 'react'
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, ReferenceLine
} from 'recharts'
import {
  RotateCcw, Download, AlertTriangle, Info, TrendingUp,
  CheckCircle, AlertCircle, XCircle, ChevronDown, ChevronUp, BarChart2, Grid
} from 'lucide-react'

/* ─────────────────────────── CONSTANTS ─────────────────────────── */
const API = 'http://localhost:5001'

const FUND_COLORS = [
  '#c9a84c','#38bdf8','#4ade80','#f87171','#a78bfa',
  '#fb923c','#34d399','#f472b6','#60a5fa','#facc15'
]

const DONUT_COLORS = {
  Equity:       '#c9a84c',
  'Fixed Income':'#38bdf8',
  Alternatives: '#a78bfa',
  Cash:         '#4ade80',
}

const PROFILE_ALLOCATIONS = {
  Aggressive:             { Equity:80, 'Fixed Income':10, Alternatives:8,  Cash:2  },
  'Moderately Aggressive':{ Equity:65, 'Fixed Income':20, Alternatives:10, Cash:5  },
  Balanced:               { Equity:50, 'Fixed Income':30, Alternatives:12, Cash:8  },
  'Moderately Conservative':{ Equity:30,'Fixed Income':45,Alternatives:12, Cash:13 },
  Conservative:           { Equity:15, 'Fixed Income':55, Alternatives:10, Cash:20 },
}

const PROFILE_EXPECTED_RETURN = {
  Aggressive:0.12, 'Moderately Aggressive':0.09,
  Balanced:0.07, 'Moderately Conservative':0.055, Conservative:0.04,
}


/* ─────────────────────────── HELPERS ───────────────────────────── */
function rrColor(rr) {
  if (rr > 20) return { bg:'rgba(239,68,68,.12)', border:'#ef4444', text:'#f87171', label:'Unrealistic', icon:'⚠', urgent:true }
  if (rr > 10) return { bg:'rgba(239,68,68,.08)', border:'#f87171', text:'#f87171', label:'High — Review Assumptions', icon:'🔴' }
  if (rr > 6)  return { bg:'rgba(234,179,8,.1)',  border:'#eab308', text:'#fbbf24', label:'Challenging', icon:'🟡' }
  return             { bg:'rgba(74,222,128,.08)', border:'#4ade80', text:'#4ade80', label:'Achievable',  icon:'🟢' }
}

function buildAlert(message, explanation) {
  if (message === 'Risk Alert')
    return { icon:<AlertCircle size={14}/>, color:'#fbbf24', bg:'rgba(234,179,8,.1)',       border:'#eab308', msg:`${message}: ${explanation}` }
  if (message === 'Educational Insight')
    return { icon:<Info size={14}/>,        color:'#38bdf8', bg:'rgba(56,189,248,.08)',      border:'#38bdf8', msg:`${message}: ${explanation}` }
  return   { icon:<CheckCircle size={14}/>, color:'#4ade80', bg:'rgba(74,222,128,.08)',      border:'#4ade80', msg:`${message}: ${explanation}` }
}

/* ─────────────────────────── SUB-COMPONENTS ────────────────────── */

function RiskGauge({ A }) {
  const pct = ((A - 1) / 9) * 100
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:'.81rem',color:'var(--text-muted)',letterSpacing:'.06em',textTransform:'uppercase',marginBottom:8}}>
        <span>Aggressive (A=1)</span><span>Conservative (A=10)</span>
      </div>
      <div style={{height:10,borderRadius:99,background:'linear-gradient(90deg,#ef4444 0%,#f97316 25%,#eab308 50%,#22c55e 75%,#3b82f6 100%)',position:'relative'}}>
        <div style={{position:'absolute',top:'50%',left:`${pct}%`,transform:'translate(-50%,-50%)',width:20,height:20,borderRadius:'50%',background:'var(--text)',border:'3px solid var(--bg)',boxShadow:'0 0 0 3px var(--gold)',transition:'left 1s cubic-bezier(.34,1.56,.64,1)'}}/>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginTop:8,fontSize:'.85rem',fontFamily:"'IBM Plex Mono',monospace",color:'var(--text-muted)'}}>
        {[1,2,3,4,5,6,7,8,9,10].map(n=><span key={n} style={{color:Math.abs(A-n)<0.5?'var(--gold)':'var(--text-dim)'}}>{n}</span>)}
      </div>
    </div>
  )
}

function DonutChart({ profile }) {
  const alloc = PROFILE_ALLOCATIONS[profile] || PROFILE_ALLOCATIONS['Balanced']
  const data = Object.entries(alloc).map(([name,value])=>({ name, value }))
  return (
    <div style={{display:'flex',alignItems:'center',gap:24,flexWrap:'wrap'}}>
      <ResponsiveContainer width={180} height={180}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={54} outerRadius={80}
            dataKey="value" paddingAngle={2} stroke="none">
            {data.map((d,i)=><Cell key={d.name} fill={DONUT_COLORS[d.name]||FUND_COLORS[i]}/>)}
          </Pie>
          <RTooltip
            contentStyle={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,fontSize:'.9rem'}}
            formatter={(v,n)=>[`${v}%`,n]}/>
        </PieChart>
      </ResponsiveContainer>
      <div style={{display:'flex',flexDirection:'column',gap:10,flex:1}}>
        {data.map(d=>(
          <div key={d.name} style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:10,height:10,borderRadius:'50%',background:DONUT_COLORS[d.name],flexShrink:0}}/>
            <span style={{fontSize:'.93rem',flex:1}}>{d.name}</span>
            <div style={{height:6,width:80,background:'var(--border)',borderRadius:99,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${d.value}%`,background:DONUT_COLORS[d.name],borderRadius:99}}/>
            </div>
            <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:'.9rem',color:'var(--text-muted)',minWidth:32,textAlign:'right'}}>{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function FundTable({ data, optimalData }) {
  const [tooltip, setTooltip] = useState(null)
  if (!data) return <div style={{color:'var(--text-muted)',fontSize:'.98rem'}}>Portfolio data not loaded.</div>
  const { fund_names } = data
  const weights  = optimalData?.weights || []
  const returns  = data.returns || []

  return (
    <div style={{overflowX:'auto',position:'relative'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.93rem'}}>
        <thead>
          <tr style={{borderBottom:'1px solid var(--border)'}}>
            {['#','Fund','Exp. Return','Weight','Allocation','Position'].map(h=>(
              <th key={h} style={{textAlign:'left',padding:'8px 12px',color:'var(--text-muted)',fontSize:'.81rem',textTransform:'uppercase',letterSpacing:'.08em',fontWeight:500}}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fund_names.map((name,i)=>{
            const w = weights[i] ?? 0
            const r = returns[i] ?? 0
            const isShort = w < 0
            const pct = Math.abs(w)*100
            return (
              <tr key={name} style={{borderBottom:'1px solid var(--border)'}}>
                <td style={{padding:'10px 12px',color:'var(--text-dim)',fontFamily:"'IBM Plex Mono',monospace"}}>{String(i+1).padStart(2,'0')}</td>
                <td style={{padding:'10px 12px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:FUND_COLORS[i%FUND_COLORS.length],flexShrink:0}}/>
                    <span style={{fontWeight:500}}>{name}</span>
                  </div>
                </td>
                <td style={{padding:'10px 12px',fontFamily:"'IBM Plex Mono',monospace",color:r>=0?'var(--green)':'var(--red)'}}>
                  {r>=0?'+':''}{(r*100).toFixed(2)}%
                </td>
                <td style={{padding:'10px 12px',fontFamily:"'IBM Plex Mono',monospace",color:isShort?'var(--red)':'var(--text)'}}>
                  {isShort?'-':''}{pct.toFixed(2)}%
                </td>
                <td style={{padding:'10px 12px',width:120}}>
                  <div style={{height:8,background:'var(--surface2)',borderRadius:99,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${Math.min(pct,100)}%`,background:isShort?'var(--red)':'var(--green)',borderRadius:99,opacity:.85}}/>
                  </div>
                </td>
                <td style={{padding:'10px 12px'}}>
                  <div style={{position:'relative',display:'inline-block'}}>
                    <span style={{
                      fontSize:'.81rem',fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase',
                      padding:'2px 8px',borderRadius:99,border:'1px solid',cursor: isShort?'help':'default',
                      color:isShort?'var(--red)':'var(--green)',
                      borderColor:isShort?'var(--red)':'var(--green)',
                      background:isShort?'var(--red-glow)':'var(--green-glow)',
                    }}
                    onMouseEnter={()=>isShort&&setTooltip(i)}
                    onMouseLeave={()=>setTooltip(null)}>
                      {isShort?'Short':'Long'}
                    </span>
                    {tooltip===i&&(
                      <div style={{position:'absolute',bottom:'130%',left:'50%',transform:'translateX(-50%)',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,padding:'10px 14px',width:220,fontSize:'.88rem',lineHeight:1.6,color:'var(--text-muted)',zIndex:99,boxShadow:'0 8px 24px rgba(0,0,0,.4)'}}>
                        <div style={{color:'var(--text)',fontWeight:600,marginBottom:4}}>Short Selling</div>
                        Borrowing and selling this fund expecting its price to fall. Profits if it declines; losses if it rises. Requires margin and carries higher risk.
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function FrontierChart({ portfolioData, riskAversion, profile, optimalData }) {
  const [fitView, setFitView] = useState(true)
  if (!portfolioData) return null
  const { frontier_no_short, frontier_short, gmvp_no_short, gmvp_short, fund_names, returns, std_devs } = portfolioData

  const frontierNS = frontier_no_short.std.map((s,i)=>({ x:+(s*100).toFixed(2), y:+(frontier_no_short.ret[i]*100).toFixed(2) }))
  const frontierS  = frontier_short.std.map((s,i)=>({ x:+(s*100).toFixed(2),    y:+(frontier_short.ret[i]*100).toFixed(2)    }))
  const fundPoints = fund_names.map((name,i)=>({ x:+(std_devs[i]*100).toFixed(2), y:+(returns[i]*100).toFixed(2), name, color:FUND_COLORS[i%FUND_COLORS.length] }))
  const gmvpNS     = [{ x:+(gmvp_no_short.std*100).toFixed(2), y:+(gmvp_no_short.return*100).toFixed(2), name:'GMVP (No Short)', sharpe:gmvp_no_short.sharpe }]
  const gmvpS      = [{ x:+(gmvp_short.std*100).toFixed(2),    y:+(gmvp_short.return*100).toFixed(2),    name:'GMVP (Short)',    sharpe:gmvp_short.sharpe    }]

  const optimalPt = optimalData
    ? [{ x:+(optimalData.std*100).toFixed(2), y:+(optimalData.return*100).toFixed(2), name:`You — ${profile}`, sharpe:optimalData.sharpe }]
    : []

  // Compute tight domain from key points (funds + GMVPs + optimal)
  const keyPts = [...fundPoints, ...gmvpNS, ...gmvpS, ...optimalPt]
  const allX = keyPts.map(p=>p.x)
  const allY = keyPts.map(p=>p.y)
  const pad  = (arr, pct=0.15) => { const mn=Math.min(...arr), mx=Math.max(...arr), d=(mx-mn)||1; return [mn-d*pct, mx+d*pct] }
  const fitXDomain = pad(allX)
  const fitYDomain = pad(allY)

  const xDomain = fitView ? fitXDomain.map(v=>+v.toFixed(1)) : ['auto','auto']
  const yDomain = fitView ? fitYDomain.map(v=>+v.toFixed(1)) : ['auto','auto']

  // When in fit view, clip frontier lines to domain bounds so they don't distort scale
  const clipX = (pts) => fitView ? pts.filter(p=>p.x>=xDomain[0] && p.x<=xDomain[1] && p.y>=yDomain[0] && p.y<=yDomain[1]) : pts

  const CustomTip = ({ active, payload }) => {
    if (!active||!payload?.length) return null
    const d = payload[0]?.payload
    return (
      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,padding:'10px 14px',fontSize:'.88rem',fontFamily:"'IBM Plex Mono',monospace"}}>
        {d.name&&<div style={{color:'var(--gold)',marginBottom:4,fontFamily:"'DM Sans',sans-serif",fontWeight:600}}>{d.name}</div>}
        <div style={{color:'var(--text-muted)'}}>σ <span style={{color:'var(--text)'}}>{(+d.x).toFixed(2)}%</span></div>
        <div style={{color:'var(--text-muted)'}}>r <span style={{color:'var(--text)'}}>{(+d.y).toFixed(2)}%</span></div>
        {d.sharpe!==undefined&&<div style={{color:'var(--text-muted)'}}>Sharpe <span style={{color:'var(--gold)'}}>{(+d.sharpe).toFixed(3)}</span></div>}
      </div>
    )
  }

  const btnStyle = (active) => ({
    fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:'.8rem',
    letterSpacing:'.06em', textTransform:'uppercase', padding:'5px 14px',
    borderRadius:99, border:'1.5px solid', cursor:'pointer', transition:'all .2s',
    background: active ? 'var(--gold)' : 'transparent',
    color: active ? 'var(--btn-text-on-gold)' : 'var(--text-muted)',
    borderColor: active ? 'var(--gold)' : 'var(--border2)',
  })

  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:12,justifyContent:'flex-end'}}>
        <button style={btnStyle(fitView)}  onClick={()=>setFitView(true)}>Fit to data</button>
        <button style={btnStyle(!fitView)} onClick={()=>setFitView(false)}>Full range</button>
      </div>
      <ResponsiveContainer width="100%" height={500}>
        <ScatterChart margin={{top:10,right:20,bottom:20,left:10}}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" strokeOpacity={.4}/>
          <XAxis dataKey="x" type="number" domain={xDomain} name="σ%"
            label={{value:'Annualised σ (%)',position:'insideBottom',offset:-8,fill:'var(--text-muted)',fontSize:10}}
            tick={{fill:'var(--text-muted)',fontSize:10,fontFamily:'IBM Plex Mono'}}/>
          <YAxis dataKey="y" type="number" domain={yDomain} name="r%"
            label={{value:'Return (%)',angle:-90,position:'insideLeft',offset:12,fill:'var(--text-muted)',fontSize:10}}
            tick={{fill:'var(--text-muted)',fontSize:10,fontFamily:'IBM Plex Mono'}}/>
          <Tooltip content={<CustomTip/>}/>

          <Scatter name="No Short Sales"      data={clipX(frontierNS)} line={{stroke:'#38bdf8',strokeWidth:2}} fill="transparent"/>
          <Scatter name="Short Sales Allowed" data={clipX(frontierS)}  line={{stroke:'#a78bfa',strokeWidth:2,strokeDasharray:'5 3'}} fill="transparent"/>

          {fundPoints.map((fp)=>(
            <Scatter key={fp.name} name={fp.name} data={[fp]} fill={fp.color} r={6} legendType="none"/>
          ))}

          <Scatter name="GMVP (No Short)" data={gmvpNS} fill="#38bdf8" r={9} shape="diamond"/>
          <Scatter name="GMVP (Short)"    data={gmvpS}  fill="#a78bfa" r={9} shape="diamond"/>

          {optimalPt.length>0&&(
            <Scatter name={`You — ${profile}`} data={optimalPt} fill="var(--gold)" r={13} legendType="none"
              shape={props=>{
                const {cx,cy}=props
                return <g><circle cx={cx} cy={cy} r={16} fill="var(--gold)" opacity={.25}/><circle cx={cx} cy={cy} r={9} fill="var(--gold)" stroke="var(--bg)" strokeWidth={2}/></g>
              }}/>
          )}

          <Legend wrapperStyle={{fontSize:'.85rem',color:'var(--text-muted)',paddingTop:12}}/>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ─────────────────────────── GOAL PLANNER MODAL ────────────────── */
const DEFAULT_GOALS = [
  { id:1, name:'Retirement', horizon:20, fv:500000, planned:true },
  { id:2, name:'Child Education', horizon:10, fv:150000, planned:true },
  { id:3, name:'Home Purchase', horizon:5, fv:200000, planned:false },
]

function GoalPlanner({ investablePV, profileReturn, onClose, onConfirm }) {
  const [goals, setGoals] = useState(DEFAULT_GOALS)

  function updateGoal(id, field, value) {
    setGoals(g=>g.map(gl=>gl.id===id?{...gl,[field]:value}:gl))
  }
  function addGoal() {
    setGoals(g=>[...g,{id:Date.now(),name:'New Goal',horizon:10,fv:100000,planned:true}])
  }
  function removeGoal(id) { setGoals(g=>g.filter(gl=>gl.id!==id)) }

  // Required return for each goal: FV = PV × (1+r)^n  → r = (FV/PV)^(1/n) - 1
  const pvPerGoal = investablePV / goals.filter(g=>g.planned).length || 1
  const goalsWithRR = goals.map(g=>{
    const pv = g.planned ? pvPerGoal : 0
    const rr = pv > 0 ? (Math.pow(g.fv/pv, 1/g.horizon)-1)*100 : null
    return {...g, pv, rr}
  })
  const plannedGoals  = goalsWithRR.filter(g=>g.planned && g.rr !== null)
  const totalFVWeight = plannedGoals.reduce((s,g)=>s+g.fv,0)
  const wrr = totalFVWeight > 0
    ? plannedGoals.reduce((s,g)=>s+(g.rr*(g.fv/totalFVWeight)),0)
    : 0

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:24}} onClick={onClose}>
      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',width:'min(720px,100%)',maxHeight:'85vh',overflowY:'auto',padding:'32px'}} onClick={e=>e.stopPropagation()}>
        <div style={{fontFamily:"'Lora',serif",fontSize:'1.53rem',marginBottom:6}}>Financial Goal Planner</div>
        <div style={{fontSize:'.95rem',color:'var(--text-muted)',marginBottom:24}}>Define your goals. Planned goals share your investable capital equally for the required-return calculation.</div>

        {/* Investable PV */}
        <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:24,padding:'14px 18px',background:'var(--surface2)',borderRadius:'var(--radius)',border:'1px solid var(--border)'}}>
          <div style={{flex:1}}>
            <div style={{fontSize:'.85rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:4}}>Investable Capital (PV)</div>
            <input type="number" value={investablePV} readOnly
              style={{background:'transparent',border:'none',color:'var(--gold)',fontFamily:"'IBM Plex Mono',monospace",fontSize:'1.23rem',width:'100%',outline:'none'}}/>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:'.85rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:4}}>Profile Exp. Return</div>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",color:'#4ade80'}}>{(profileReturn*100).toFixed(1)}% p.a.</div>
          </div>
        </div>

        {/* Goals table */}
        <table style={{width:'100%',borderCollapse:'collapse',marginBottom:16,fontSize:'.93rem'}}>
          <thead>
            <tr style={{borderBottom:'1px solid var(--border)'}}>
              {['Goal','Horizon (yrs)','Target FV ($)','Planned?','Req. Return',''].map(h=>(
                <th key={h} style={{textAlign:'left',padding:'6px 10px',color:'var(--text-muted)',fontSize:'.81rem',textTransform:'uppercase',letterSpacing:'.08em'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {goalsWithRR.map(g=>{
              const rrc = g.rr !== null ? rrColor(g.rr) : null
              return (
                <tr key={g.id} style={{borderBottom:'1px solid var(--border)'}}>
                  <td style={{padding:'8px 10px'}}><input value={g.name} onChange={e=>updateGoal(g.id,'name',e.target.value)} style={inputStyle}/></td>
                  <td style={{padding:'8px 10px'}}><input type="number" value={g.horizon} onChange={e=>updateGoal(g.id,'horizon',+e.target.value)} style={{...inputStyle,width:70}}/></td>
                  <td style={{padding:'8px 10px'}}><input type="number" value={g.fv} onChange={e=>updateGoal(g.id,'fv',+e.target.value)} style={{...inputStyle,width:110}}/></td>
                  <td style={{padding:'8px 10px',textAlign:'center'}}>
                    <input type="checkbox" checked={g.planned} onChange={e=>updateGoal(g.id,'planned',e.target.checked)}
                      style={{accentColor:'var(--gold)',width:16,height:16,cursor:'pointer'}}/>
                  </td>
                  <td style={{padding:'8px 10px'}}>
                    {g.planned && rrc ? (
                      <span style={{color:rrc.text,fontFamily:"'IBM Plex Mono',monospace",fontSize:'.93rem',display:'flex',alignItems:'center',gap:4}}>
                        {g.rr.toFixed(1)}% {rrc.urgent&&<AlertTriangle size={12}/>}
                        <span style={{fontSize:'.81rem',marginLeft:4,opacity:.8}}>{rrc.label}</span>
                      </span>
                    ) : <span style={{color:'var(--text-dim)',fontSize:'.88rem'}}>Unplanned</span>}
                  </td>
                  <td style={{padding:'8px 10px'}}>
                    <button onClick={()=>removeGoal(g.id)} style={{background:'none',border:'none',color:'var(--text-dim)',cursor:'pointer',fontSize:'1.13rem',lineHeight:1}}>×</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <button onClick={addGoal} style={{...ghostBtn,marginBottom:24,fontSize:'.9rem'}}>+ Add Goal</button>

        {/* WRR summary */}
        <div style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'16px 20px',marginBottom:20}}>
          <div style={{fontSize:'.85rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:8}}>Weighted Required Return (WRR)</div>
          <div style={{display:'flex',alignItems:'baseline',gap:12}}>
            <div style={{fontFamily:"'Lora',serif",fontStyle:'italic',fontSize:'2.33rem',color:rrColor(wrr).text}}>{wrr.toFixed(2)}%</div>
            <div>
              <span style={{fontSize:'.95rem',fontWeight:600,color:rrColor(wrr).text}}>{rrColor(wrr).icon} {rrColor(wrr).label}</span>
              {wrr>10&&<div style={{fontSize:'.88rem',color:'var(--text-muted)',marginTop:2}}>Profile expected return: {(profileReturn*100).toFixed(1)}%. Gap: {(wrr-profileReturn*100).toFixed(1)}pp</div>}
            </div>
          </div>
        </div>

        <div style={{display:'flex',gap:12,justifyContent:'flex-end'}}>
          <button onClick={onClose} style={ghostBtn}>Cancel</button>
          <button onClick={()=>onConfirm({goals:goalsWithRR,wrr})} style={primaryBtn}>Confirm Goals →</button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────── PDF DOWNLOAD ──────────────────────── */
async function downloadPDF(data, goalData, profile) {
  // Build a printable HTML page and trigger window.print via a new window
  const allocRows = Object.entries(PROFILE_ALLOCATIONS[profile]||{}).map(([k,v])=>`<tr><td>${k}</td><td>${v}%</td></tr>`).join('')
  const goalRows  = goalData?.goals?.filter(g=>g.planned).map(g=>`<tr><td>${g.name}</td><td>${g.horizon} yrs</td><td>$${g.fv.toLocaleString()}</td><td>${g.rr?.toFixed(2)||'—'}%</td></tr>`).join('') || ''
  const html = `<!DOCTYPE html><html><head><title>RoboAdvisor Report</title>
  <style>body{font-family:Georgia,serif;padding:40px;color:#111;max-width:800px;margin:auto}
  h1{font-size:2rem;margin-bottom:4px}h2{font-size:1.2rem;border-bottom:2px solid #c9a84c;padding-bottom:6px;margin-top:32px}
  table{width:100%;border-collapse:collapse;margin-top:12px}th,td{padding:8px 12px;text-align:left;border-bottom:1px solid #ddd}
  th{font-size:.88rem;text-transform:uppercase;letter-spacing:.06em;color:#666}
  .badge{display:inline-block;padding:4px 12px;border-radius:99px;font-size:.8rem;font-weight:600;background:#c9a84c;color:#000}
  .disclaimer{font-size:.72rem;color:#999;margin-top:48px;border-top:1px solid #eee;padding-top:16px;line-height:1.6}
  @media print{body{padding:20px}}</style></head><body>
  <h1>RoboAdvisor Summary</h1>
  <p style="color:#666;margin-bottom:8px">Generated ${new Date().toLocaleDateString('en-GB',{year:'numeric',month:'long',day:'numeric'})}</p>
  <span class="badge">${profile}</span> &nbsp; <span class="badge" style="background:#0f1520;color:#c9a84c;border:1px solid #c9a84c">A = ${data.risk_aversion}</span>
  <h2>Risk Profile</h2>
  <table><tr><th>Metric</th><th>Value</th></tr>
  <tr><td>Risk Aversion (A)</td><td>${data.risk_aversion}</td></tr>
  <tr><td>Profile</td><td>${data.profile}</td></tr>
  <tr><td>Utility Function</td><td>${data.utility_formula}</td></tr>
  <tr><td>Raw Weighted Score</td><td>${data.raw_weighted_sum}</td></tr></table>
  <h2>Asset Allocation</h2>
  <table><tr><th>Asset Class</th><th>Weight</th></tr>${allocRows}</table>
  ${goalRows?`<h2>Financial Goals</h2><table><tr><th>Goal</th><th>Horizon</th><th>Target FV</th><th>Required Return</th></tr>${goalRows}</table>`:''}
  ${goalData?.wrr!==undefined?`<p><strong>Weighted Required Return (WRR): ${goalData.wrr.toFixed(2)}%</strong></p>`:''}
  <div class="disclaimer">
  <strong>Disclaimer:</strong> This report is generated by an automated robo-advisory tool and does not constitute financial advice.
  Past performance is not indicative of future results. All investment involves risk, including the possible loss of principal. 
  Please consult a licensed financial adviser before making any investment decisions. 
  This document is for academic purposes only.
  </div></body></html>`

  const w = window.open('','_blank','width=900,height=700')
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(()=>w.print(),500)
}

/* ─────────────────────────── COVARIANCE HEATMAP ────────────────── */
function CovarianceHeatmap({ matrix, labels }) {
  const [hovered, setHovered] = useState(null)
  if (!matrix || !labels) return null
  const n        = labels.length
  const cellSize = Math.min(52, Math.floor(560 / n))
  const absMax   = Math.max(...matrix.flat().map(Math.abs))

  function getColor(v) {
    const t = Math.abs(v) / absMax
    return v >= 0
      ? `rgba(201,168,76,${0.12 + 0.75 * t})`
      : `rgba(248,113,113,${0.1 + 0.75 * t})`
  }

  const isHov = (i, j) =>
    hovered && (hovered.i === i || hovered.j === j)

  return (
    <div>
      <div style={{minHeight:24,marginBottom:8,fontSize:'.88rem',fontFamily:"'IBM Plex Mono',monospace",color:hovered?'var(--text)':'var(--text-muted)'}}>
        {hovered
          ? <><span style={{color:'var(--gold)'}}>{labels[hovered.i]}</span> × <span style={{color:'var(--gold)'}}>{labels[hovered.j]}</span>  →  {matrix[hovered.i][hovered.j].toFixed(6)}</>
          : 'Hover a cell for exact value'}
      </div>
      <div style={{overflowX:'auto'}}>
        <div style={{display:'inline-block',minWidth:(n+1)*cellSize}} onMouseLeave={()=>setHovered(null)}>
          <div style={{display:'flex',marginLeft:cellSize}}>
            {labels.map(l=>(
              <div key={l} style={{width:cellSize,minWidth:cellSize,fontSize:8,color:'var(--text-muted)',textAlign:'center',fontFamily:"'IBM Plex Mono',monospace",overflow:'hidden',whiteSpace:'nowrap'}}>
                {l.slice(0,6)}
              </div>
            ))}
          </div>
          {matrix.map((row,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center'}}>
              <div style={{width:cellSize,minWidth:cellSize,fontSize:8,color:'var(--text-muted)',textAlign:'right',paddingRight:5,fontFamily:"'IBM Plex Mono',monospace",overflow:'hidden',whiteSpace:'nowrap'}}>
                {labels[i].slice(0,6)}
              </div>
              {row.map((v,j)=>(
                <div key={j}
                  onMouseEnter={()=>setHovered({i,j})}
                  style={{
                    width:cellSize,height:cellSize,minWidth:cellSize,
                    background:getColor(v),
                    border: hovered && hovered.i===i && hovered.j===j
                      ? '1.5px solid var(--gold)'
                      : isHov(i,j)
                        ? '1px solid rgba(201,168,76,0.45)'
                        : '1px solid var(--surface)',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:7,color:'var(--text-muted)',
                    fontFamily:"'IBM Plex Mono',monospace",cursor:'crosshair',
                    opacity: hovered && !isHov(i,j) ? 0.45 : 1,
                    transition:'opacity .12s,border .08s',
                    boxSizing:'border-box',
                  }}>
                  {cellSize>40?v.toFixed(4):''}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:8,marginTop:10,fontSize:'.83rem',color:'var(--text-muted)'}}>
        <div style={{width:70,height:7,borderRadius:4,background:'linear-gradient(90deg,rgba(248,113,113,.8),var(--surface2),rgba(201,168,76,.85))'}}/>
        <span>Negative covariance</span><span style={{marginLeft:'auto'}}>Positive covariance</span>
      </div>
    </div>
  )
}

/* ─────────────────────────── MAIN DASHBOARD ─────────────────────── */
export default function ResultDashboard({ data, portfolioData, onRetake }) {
  const [investablePV, setInvestablePV] = useState(100000)
  const [showGoalPlanner, setShowGoalPlanner] = useState(false)
  const [goalData, setGoalData] = useState(null)
  const [expandedSection, setExpandedSection] = useState({ A:true, B:true, C:true, E:false, D:true })
  const [optimalPortfolio, setOptimalPortfolio]           = useState(null)
  const [optimalPortfolioShort, setOptimalPortfolioShort] = useState(null)
  const [shortTab, setShortTab]                           = useState('no-short')
  const [fundOverview, setFundOverview]                   = useState(null)

  const profile      = data.profile
  const A            = data.risk_aversion

  useEffect(() => {
    if (!portfolioData || !A) return
    fetch(`${API}/api/optimal?A=${A}`)
      .then(r => r.json())
      .then(d => setOptimalPortfolio(d))
      .catch(() => {})
    fetch(`${API}/api/optimal?A=${A}&short=true`)
      .then(r => r.json())
      .then(d => setOptimalPortfolioShort(d))
      .catch(() => {})
  }, [portfolioData, A])

  useEffect(() => {
    fetch(`${API}/api/fund-overview`)
      .then(r => r.json())
      .then(d => setFundOverview(d))
      .catch(() => {})
  }, [])
  const profileRet   = PROFILE_ALLOCATIONS[profile] ? PROFILE_EXPECTED_RETURN[profile] || 0.07 : 0.07
  const alloc        = PROFILE_ALLOCATIONS[profile] || {}

  const alert        = buildAlert(data.assessment, data.explanation)

  function toggle(key) { setExpandedSection(s=>({...s,[key]:!s[key]})) }

  const sectionHeader = (label, key) => (
    <button onClick={()=>toggle(key)} style={{width:'100%',background:'none',border:'none',cursor:'pointer',textAlign:'left',padding:0,marginBottom:expandedSection[key]?20:0}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 0',borderBottom:'1px solid var(--border)'}}>
        <div style={{fontFamily:"'Lora',serif",fontSize:'1.38rem',color:'var(--text)'}}>{label}</div>
        {expandedSection[key]?<ChevronUp size={18} color="var(--text-muted)"/>:<ChevronDown size={18} color="var(--text-muted)"/>}
      </div>
    </button>
  )

  return (
    <div style={{animation:'fadeUp .5s ease'}}>

      {/* ══ PROFILE BANNER ══════════════════════════════════════════ */}
      <div style={{background:`linear-gradient(135deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.28) 100%), ${data.colour}`,borderRadius:'var(--radius-lg)',padding:'32px 36px',position:'relative',overflow:'hidden',marginBottom:24}}>
        <div style={{position:'absolute',right:36,top:'50%',transform:'translateY(-50%)',fontFamily:"'Lora',serif",fontSize:'6rem',fontStyle:'italic',opacity:.18,color:'#fff',lineHeight:1,pointerEvents:'none'}}>A={A}</div>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:6}}>
          <div style={{fontSize:'.85rem',letterSpacing:'.16em',textTransform:'uppercase',color:'rgba(255,255,255,.9)',textShadow:'0 1px 3px rgba(0,0,0,0.4)'}}>Your Risk Profile</div>
          <span style={{fontSize:'.81rem',background:'rgba(0,0,0,.25)',color:'#fff',padding:'2px 10px',borderRadius:99,letterSpacing:'.08em'}}>A = {A.toFixed(2)}</span>
        </div>
        <div style={{fontFamily:"'Lora',serif",fontSize:'2.33rem',color:'#fff',fontWeight:600,textShadow:'0 1px 4px rgba(0,0,0,0.35)'}}>{profile}</div>
        <div style={{fontSize:'.98rem',color:'rgba(255,255,255,.92)',marginTop:8,maxWidth:480,lineHeight:1.6,textShadow:'0 1px 3px rgba(0,0,0,0.3)'}}>{data.description}</div>
      </div>

      {/* ══ BAND A — RISK ASSESSMENT ════════════════════════════════ */}
      <div style={{marginBottom:24}}>
        {sectionHeader('Risk Assessment Results','A')}
        {expandedSection.A && (
          <div style={{display:'flex',flexDirection:'column',gap:16}}>

            {/* Gauge */}
            <div className="card"><div className="card-title">Risk Aversion Gauge</div><RiskGauge A={A}/></div>

            {/* Metrics row */}
            <div className="grid-3">
              {[
                { label:'Risk Aversion (A)', value:A.toFixed(2), sub:'Scale 1–10' },
                { label:'Avg Score',         value:((11 - A)).toFixed(2), sub:'Out of 10' },
                { label:'Exp. Return',       value:`${(profileRet*100).toFixed(1)}%`, sub:'Profile benchmark' },
              ].map(m=>(
                <div key={m.label} className="card" style={{textAlign:'center',padding:'20px 16px'}}>
                  <div style={{fontFamily:"'Lora',serif",fontStyle:'italic',fontSize:'2.03rem',color:'var(--text)'}}>{m.value}</div>
                  <div style={{fontSize:'.81rem',textTransform:'uppercase',letterSpacing:'.1em',color:'var(--text-muted)',marginTop:4}}>{m.label}</div>
                  <div style={{fontSize:'.83rem',color:'var(--text-dim)',marginTop:2}}>{m.sub}</div>
                </div>
              ))}
            </div>

            {/* Utility formula */}
            <div style={{textAlign:'center',padding:'14px',border:'1px dashed var(--gold-dim)',borderRadius:'var(--radius)',fontFamily:"'Lora',serif",fontStyle:'italic',fontSize:'1.23rem',color:'var(--gold)'}}>
              {data.utility_formula}
            </div>

            {/* Evaluation alert */}
            <div style={{display:'flex',alignItems:'flex-start',gap:12,padding:'14px 18px',borderRadius:'var(--radius)',background:alert.bg,border:`1px solid ${alert.border}`}}>
              <div style={{color:alert.color,marginTop:2,flexShrink:0}}>{alert.icon}</div>
              <div style={{fontSize:'.98rem',color:alert.color,lineHeight:1.55}}>{alert.msg}</div>
            </div>

            {/* Answer breakdown */}
            <details className="card" style={{padding:'20px 28px'}}>
              <summary style={{cursor:'pointer',fontSize:'.9rem',color:'var(--text-muted)',letterSpacing:'.08em',textTransform:'uppercase',userSelect:'none',fontFamily:"'IBM Plex Mono',monospace",listStyle:'none'}}>
                <span style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  Answer Breakdown
                  <span className="breakdown-chevron" style={{fontSize:'.8rem',transition:'transform .2s'}}>▶</span>
                </span>
                <style>{`
                  details > summary::-webkit-details-marker { display: none; }
                  details[open] .breakdown-chevron { transform: rotate(90deg); }
                `}</style>
              </summary>
              <div style={{display:'flex',flexDirection:'column',gap:10,marginTop:14}}>
                {(data.breakdown || []).map((row,i)=>(
                  <div key={i} style={{borderBottom:'1px solid var(--border)',paddingBottom:10}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',gap:8,marginBottom:4}}>
                      <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:'.78rem',color:'var(--gold)',flexShrink:0}}>{row.question.toUpperCase()}</span>
                      <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:'.83rem',color:'var(--text-muted)'}}>score: {row.score}</span>
                    </div>
                    <div style={{fontSize:'.9rem',color:'var(--text)',marginBottom:3}}>{row.question_text}</div>
                    <div style={{fontSize:'.85rem',color:'var(--text-muted)',fontStyle:'italic'}}>→ {row.answer_label}</div>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </div>

      {/* ══ BAND C — PORTFOLIO RECOMMENDATION ══════════════════════ */}
      <div style={{marginBottom:24}}>
        {sectionHeader('Portfolio Recommendation','C')}
        {expandedSection.C && (
          <div style={{display:'flex',flexDirection:'column',gap:20}}>

            {/* Asset class donut */}
            <div className="card">
              <div className="card-title">Asset Class Allocation</div>
              <DonutChart profile={profile}/>
            </div>

            {/* Short/no-short toggle */}
            <div style={{display:'flex',gap:8}}>
              {[
                { id:'no-short', label:'No Short Sales' },
                { id:'short',    label:'Short Sales Allowed' },
              ].map(t=>(
                <button key={t.id} onClick={()=>setShortTab(t.id)}
                  style={{fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:'.93rem',letterSpacing:'.06em',textTransform:'uppercase',padding:'9px 20px',borderRadius:99,border:'1.5px solid',cursor:'pointer',transition:'all .2s',
                    background:shortTab===t.id?'var(--gold)':'transparent',
                    color:shortTab===t.id?'var(--btn-text-on-gold)':'var(--text-muted)',
                    borderColor:shortTab===t.id?'var(--gold)':'var(--border2)',
                  }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Fund table */}
            <div className="card">
              <div className="card-title">Fund Allocation (Optimal Weights, A = {A.toFixed(2)})</div>
              {portfolioData
                ? <FundTable data={portfolioData} optimalData={shortTab==='short'?optimalPortfolioShort:optimalPortfolio}/>
                : <div style={{color:'var(--text-muted)',fontSize:'.98rem',padding:'16px 0'}}>Portfolio data not available. Ensure Flask is running with your Excel files in ./data/.</div>}
            </div>

            {/* Frontier */}
            <div className="card">
              <div className="card-title">Efficient Frontier</div>
              <div style={{fontSize:'.9rem',color:'var(--text-muted)',marginBottom:16}}>Your optimal portfolio (A = {A.toFixed(2)}) is highlighted in gold on the efficient frontier.</div>
              {portfolioData
                ? <FrontierChart portfolioData={portfolioData} riskAversion={A} profile={profile} optimalData={shortTab==='short'?optimalPortfolioShort:optimalPortfolio}/>
                : <div style={{color:'var(--text-muted)',fontSize:'.98rem',padding:'24px 0',textAlign:'center'}}>Connect Flask backend with fund data to render the frontier.</div>}
            </div>
          </div>
        )}
      </div>

      {/* ══ BAND B — GOAL SUMMARY ═══════════════════════════════════ */}
      <div style={{marginBottom:24}}>
        {sectionHeader('Goal Planner','B')}
        {expandedSection.B && (
          <div style={{display:'flex',flexDirection:'column',gap:16}}>

            {/* Investable PV input */}
            <div className="card">
              <div className="card-title">Investable Capital</div>
              <div style={{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
                <div>
                  <div style={{fontSize:'.85rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:6}}>Current Investable PV ($)</div>
                  <input type="number" value={investablePV}
                    onChange={e=>setInvestablePV(Math.max(1,+e.target.value))}
                    style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',color:'var(--gold)',fontFamily:"'IBM Plex Mono',monospace",fontSize:'1.23rem',padding:'10px 16px',outline:'none',width:200}}/>
                </div>
                <button onClick={()=>setShowGoalPlanner(true)} style={primaryBtn}>Open Goal Planner →</button>
              </div>
            </div>

            {/* Goal summary table */}
            {goalData ? (
              <div className="card">
                <div className="card-title">Goal Summary</div>

                {/* WRR strip */}
                <div style={{display:'flex',alignItems:'center',gap:16,padding:'14px 18px',marginBottom:20,borderRadius:'var(--radius)',background:rrColor(goalData.wrr).bg,border:`1px solid ${rrColor(goalData.wrr).border}`}}>
                  <div>
                    <div style={{fontSize:'.83rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:4}}>Weighted Required Return (WRR)</div>
                    <div style={{display:'flex',alignItems:'baseline',gap:10}}>
                      <div style={{fontFamily:"'Lora',serif",fontStyle:'italic',fontSize:'2.13rem',color:rrColor(goalData.wrr).text}}>{goalData.wrr.toFixed(2)}%</div>
                      <div style={{fontSize:'.95rem',fontWeight:600,color:rrColor(goalData.wrr).text,display:'flex',alignItems:'center',gap:4}}>
                        {rrColor(goalData.wrr).urgent&&<AlertTriangle size={14}/>} {rrColor(goalData.wrr).label}
                      </div>
                    </div>
                  </div>
                  <div style={{marginLeft:'auto',textAlign:'right'}}>
                    <div style={{fontSize:'.83rem',color:'var(--text-muted)',marginBottom:4}}>Profile Exp. Return</div>
                    <div style={{fontFamily:"'IBM Plex Mono',monospace",color:'var(--green)',fontSize:'.9rem'}}>{(profileRet*100).toFixed(1)}%</div>
                  </div>
                </div>

                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.93rem'}}>
                  <thead><tr style={{borderBottom:'1px solid var(--border)'}}>
                    {['Goal','Horizon','Target FV','PV Allocated','Req. Return','Status','Planned'].map(h=>(
                      <th key={h} style={{textAlign:'left',padding:'8px 10px',color:'var(--text-muted)',fontSize:'.81rem',textTransform:'uppercase',letterSpacing:'.08em'}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {goalData.goals.map((g,i)=>{
                      const rrc = g.planned && g.rr!==null ? rrColor(g.rr) : null
                      const fvWeight = g.planned && goalData.goals.filter(x=>x.planned).reduce((s,x)=>s+x.fv,0)
                      const wt = g.planned && fvWeight > 0 ? (g.fv/fvWeight*100).toFixed(1)+'%' : '—'
                      return (
                        <tr key={i} style={{borderBottom:'1px solid var(--border)'}}>
                          <td style={{padding:'10px 10px',fontWeight:500}}>{g.name}</td>
                          <td style={{padding:'10px 10px',fontFamily:"'IBM Plex Mono',monospace",color:'var(--text-muted)'}}>{g.horizon} yrs</td>
                          <td style={{padding:'10px 10px',fontFamily:"'IBM Plex Mono',monospace"}}>${g.fv.toLocaleString()}</td>
                          <td style={{padding:'10px 10px',fontFamily:"'IBM Plex Mono',monospace",color:'var(--text-muted)'}}>{g.planned?`$${Math.round(g.pv).toLocaleString()}`:'—'}</td>
                          <td style={{padding:'10px 10px'}}>
                            {rrc ? (
                              <span style={{color:rrc.text,fontFamily:"'IBM Plex Mono',monospace",fontSize:'.93rem',display:'flex',alignItems:'center',gap:4}}>
                                {g.rr.toFixed(2)}% {rrc.urgent&&<AlertTriangle size={11}/>}
                              </span>
                            ) : <span style={{color:'var(--text-dim)'}}>—</span>}
                          </td>
                          <td style={{padding:'10px 10px'}}>
                            {rrc ? <span style={{fontSize:'.83rem',color:rrc.text}}>{rrc.label}</span> : <span style={{fontSize:'.83rem',color:'var(--text-dim)'}}>Excluded</span>}
                          </td>
                          <td style={{padding:'10px 10px'}}>
                            <span style={{fontSize:'.83rem',color:g.planned?'var(--green)':'var(--text-dim)'}}>{g.planned?`✓ ${wt}`:'Unplanned'}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* ══ BAND E — FUND ANALYTICS ════════════════════════════════ */}
      <div style={{marginBottom:24}}>
        {sectionHeader('Fund Analytics Overview','E')}
        {expandedSection.E && (
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            {!fundOverview ? (
              <div style={{color:'var(--text-muted)',fontSize:'.98rem',padding:'24px 0',textAlign:'center'}}>
                Connect Flask backend with fund data to render fund analytics.
              </div>
            ) : (
              <>
                {/* E1 — Avg Annual Returns bar chart */}
                <div className="card">
                  <div className="card-title"><BarChart2 size={14}/> Average Annual Return by Fund</div>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={fundOverview.fund_names.map((name,i)=>({ name, value: +(fundOverview.returns[i]*100).toFixed(2) }))}
                      margin={{top:8,right:16,bottom:16,left:8}}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" strokeOpacity={.5} vertical={false}/>
                      <XAxis dataKey="name" tick={{fill:'var(--text-muted)',fontSize:10,fontFamily:'IBM Plex Mono'}}/>
                      <YAxis tickFormatter={v=>`${v}%`} tick={{fill:'var(--text-muted)',fontSize:9,fontFamily:'IBM Plex Mono'}}/>
                      <Tooltip
                        cursor={false}
                        contentStyle={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,fontSize:'.9rem',fontFamily:"'IBM Plex Mono',monospace"}}
                        labelStyle={{color:'var(--text)'}}
                        itemStyle={{color:'var(--text)'}}
                        formatter={(v)=>[`${v>=0?'+':''}${v.toFixed(2)}%`,'Ann. Return']}/>
                      <ReferenceLine y={0} stroke="var(--border2)" strokeWidth={1}/>
                      <Bar dataKey="value" radius={[4,4,0,0]} maxBarSize={44}>
                        {fundOverview.fund_names.map((name,i)=>(
                          <Cell key={name} fill={fundOverview.returns[i]>=0 ? FUND_COLORS[i%FUND_COLORS.length] : '#f87171'}/>
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* E2 — Variance-Covariance Heatmap */}
                <div className="card">
                  <div className="card-title"><Grid size={14}/> Variance-Covariance Matrix</div>
                  <div style={{fontSize:'.88rem',color:'var(--text-muted)',marginBottom:12}}>
                    Hover any cell to see the exact covariance value between two funds.
                  </div>
                  <CovarianceHeatmap matrix={fundOverview.covariance} labels={fundOverview.fund_names}/>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ══ BAND D — ACTIONS ════════════════════════════════════════ */}
      <div style={{marginBottom:24}}>
        {sectionHeader('Actions','D')}
        {expandedSection.D && (
          <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
              <button onClick={()=>downloadPDF(data,goalData,profile)} style={primaryBtn}>
                <Download size={14}/> Download Summary (PDF)
              </button>
              <button onClick={onRetake} style={ghostBtn}>
                <RotateCcw size={14}/> Restart Assessment
              </button>
            </div>
        )}
      </div>

      {/* ══ DISCLAIMER — always visible ════════════════════════════ */}
      <div style={{padding:'16px 20px',background:'var(--surface2)',borderRadius:'var(--radius)',border:'1px solid var(--border)',borderLeft:'3px solid var(--text-dim)',marginBottom:24}}>
        <div style={{fontSize:'.85rem',fontWeight:600,textTransform:'uppercase',letterSpacing:'.1em',color:'var(--text-dim)',marginBottom:6}}>Disclaimer</div>
        <div style={{fontSize:'.88rem',color:'var(--text-dim)',lineHeight:1.7}}>
          This platform is an automated robo-advisory tool and does not constitute financial advice.
          All portfolio optimisation results are based on historical price data; past performance is not indicative of future results.
          Investment involves risk, including the possible loss of principal. Consult a licensed financial adviser before making investment decisions.
          Short selling involves additional risks including unlimited loss potential and margin requirements.
        </div>
      </div>

      {showGoalPlanner && (
        <GoalPlanner
          investablePV={investablePV}
          profileReturn={profileRet}
          onClose={()=>setShowGoalPlanner(false)}
          onConfirm={gd=>{ setGoalData(gd); setShowGoalPlanner(false) }}/>
      )}
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}

const inputStyle = { background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',color:'var(--text)',fontFamily:"'DM Sans',sans-serif",fontSize:'.98rem',padding:'6px 10px',outline:'none',width:'100%' }
const primaryBtn = { fontFamily:"'DM Sans',sans-serif",display:'inline-flex',alignItems:'center',gap:8,background:'var(--gold)',color:'var(--btn-text-on-gold)',fontWeight:700,fontSize:'.95rem',letterSpacing:'.03em',textTransform:'uppercase',padding:'12px 22px',borderRadius:99,border:'none',cursor:'pointer' }
const ghostBtn   = { fontFamily:"'DM Sans',sans-serif",display:'inline-flex',alignItems:'center',gap:8,background:'transparent',color:'var(--text-muted)',fontWeight:600,fontSize:'.95rem',letterSpacing:'.03em',textTransform:'uppercase',padding:'12px 22px',borderRadius:99,border:'1px solid var(--border2)',cursor:'pointer' }
