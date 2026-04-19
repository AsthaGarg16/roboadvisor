import { useState, useEffect } from 'react'
import { CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import ResultDashboard from '../components/ResultDashboard'

const API = 'http://localhost:5001'

export default function QuestionnairePage() {
  const [questions,     setQuestions]     = useState([])
  const [current,       setCurrent]       = useState(0)
  const [answers,       setAnswers]       = useState({})
  const [loading,       setLoading]       = useState(false)
  const [result,        setResult]        = useState(null)
  const [portfolioData, setPortfolioData] = useState(null)
  const [error,         setError]         = useState('')

  useEffect(() => {
    fetch(`${API}/api/questions`)
      .then(r => r.json())
      .then(d => setQuestions(d.questions))
      .catch(() => setError('Could not connect to Flask server. Is it running on port 5000?'))

    // Pre-fetch portfolio data so it's ready when the result loads
    fetch(`${API}/api/portfolio`)
      .then(r => r.json())
      .then(d => setPortfolioData(d))
      .catch(() => { /* silently fail — dashboard handles missing data */ })
  }, [])

  const q        = questions[current]
  const total    = questions.length
  const pct      = total ? Math.round((current / total) * 100) : 0
  const selected = q ? answers[q.id] : undefined

  function pick(idx) { if (q) setAnswers(prev => ({ ...prev, [q.id]: idx })) }

  async function submit() {
    setLoading(true)
    try {
      const res  = await fetch(`${API}/api/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setError('Submission failed. Check that Flask is running.')
    }
    setLoading(false)
  }

  function retake() { setResult(null); setAnswers({}); setCurrent(0) }

  /* ── RESULT VIEW ─────────────────────────────────────────── */
  if (result) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="page-eyebrow">Part 2 · Results</div>
          <h1 className="page-title">Your Investment<br/><em style={{color:'var(--gold)'}}>Dashboard</em></h1>
        </div>
        <ResultDashboard data={result} portfolioData={portfolioData} onRetake={retake}/>
      </div>
    )
  }

  /* ── QUESTIONNAIRE VIEW ───────────────────────────────────── */
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-eyebrow">Part 2 · Risk Assessment</div>
        <h1 className="page-title">Investor<br/><em style={{color:'var(--gold)'}}>Risk Profile</em></h1>
        <p className="page-sub">
          Answer 10 questions honestly. Your responses determine your risk aversion coefficient&nbsp;A,
          which personalises your optimal portfolio.
        </p>
      </div>

      {error && (
        <div style={{background:'rgba(248,113,113,.1)',border:'1px solid #f87171',borderRadius:'var(--radius)',padding:'14px 18px',color:'#f87171',fontSize:'.98rem',marginBottom:24}}>
          {error}
        </div>
      )}

      {/* ── Progress bar ── */}
      {total > 0 && (
        <div style={{marginBottom:32}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:'.85rem',color:'var(--text-muted)',letterSpacing:'.06em',textTransform:'uppercase',marginBottom:8}}>
            <span>Question {current + 1} of {total}</span>
            <span>{pct}% complete</span>
          </div>
          <div style={{height:3,background:'var(--border)',borderRadius:99,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,var(--gold-dim),var(--gold))',borderRadius:99,transition:'width .4s ease'}}/>
          </div>
        </div>
      )}

      {/* ── Question card ── */}
      {q ? (
        <div className="card" key={q.id} style={{animation:'fadeUp .35s ease'}}>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:'.83rem',letterSpacing:'.14em',textTransform:'uppercase',color:'var(--gold)',marginBottom:10}}>
            Question {current + 1}
          </div>
          <div style={{fontFamily:"'Lora',serif",fontSize:'1.48rem',lineHeight:1.45,color:'var(--text)',marginBottom:28}}>
            {q.text}
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {q.options.map((label, idx) => (
              <button key={idx} onClick={() => pick(idx)} style={optStyle(selected === idx)}>
                <div style={bulletStyle(selected === idx)}>
                  {selected === idx && <CheckCircle size={12} style={{color:'#000'}}/>}
                </div>
                <span style={{fontFamily:"Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",fontSize:'.9rem',lineHeight:1.5,textAlign:'left'}}>{label}</span>
                <span style={{marginLeft:'auto',fontFamily:"'IBM Plex Mono',monospace",fontSize:'.83rem',
                  color:selected===idx?'var(--gold)':'var(--text-dim)',minWidth:16}}>{idx + 1}</span>
              </button>
            ))}
          </div>

          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:28}}>
            <button onClick={() => setCurrent(c => c - 1)} disabled={current === 0} style={navBtn(false)}>
              <ChevronLeft size={16}/> Back
            </button>
            {current < total - 1
              ? <button onClick={() => setCurrent(c => c + 1)} disabled={selected === undefined} style={navBtn(true)}>
                  Next <ChevronRight size={16}/>
                </button>
              : <button onClick={submit} disabled={selected === undefined || loading} style={navBtn(true)}>
                  {loading ? 'Calculating…' : 'Submit →'}
                </button>
            }
          </div>
        </div>
      ) : !error && (
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:200,color:'var(--text-muted)'}}>
          Loading questions…
        </div>
      )}

      {/* ── Keyboard hint ── */}
      {q && (
        <div style={{textAlign:'center',marginTop:16,fontSize:'.85rem',color:'var(--text-dim)',letterSpacing:'.06em'}}>
          Press 1–{q.options.length} to select · Enter to advance · ← → to navigate
        </div>
      )}

      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}

function optStyle(sel) {
  return {
    display:'flex',alignItems:'center',gap:14,padding:'14px 18px',
    borderRadius:'var(--radius)',border:`1.5px solid ${sel?'var(--gold)':'var(--border)'}`,
    background:sel?'var(--gold-glow)':'transparent',cursor:'pointer',
    color:'var(--text)',transition:'border-color .15s,background .15s,transform .15s',
    fontFamily:"'DM Sans',sans-serif",
    transform:sel?'translateX(4px)':'none',
  }
}
function bulletStyle(sel) {
  return {
    width:20,height:20,minWidth:20,borderRadius:'50%',
    border:`2px solid ${sel?'var(--gold)':'var(--border2)'}`,
    background:sel?'var(--gold)':'transparent',
    display:'flex',alignItems:'center',justifyContent:'center',
    transition:'all .15s',
  }
}
function navBtn(primary) {
  return {
    display:'inline-flex',alignItems:'center',gap:6,
    fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:'.95rem',
    letterSpacing:'.06em',textTransform:'uppercase',
    padding:'11px 22px',borderRadius:99,cursor:'pointer',
    background:primary?'var(--gold)':'transparent',
    color:primary?'#000':'var(--text-muted)',
    border:primary?'none':'1px solid var(--border2)',
    transition:'opacity .2s',
  }
}
