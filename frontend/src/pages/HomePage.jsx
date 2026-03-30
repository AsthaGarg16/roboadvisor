import { Link } from 'react-router-dom'
import { ArrowRight, Shield, Zap, Target, ClipboardList, TrendingUp } from 'lucide-react'

export default function HomePage() {
  const stats = [
    { value:'10', label:'Funds Analysed' },
    { value:'8',  label:'Risk Questions' },
    { value:'252×', label:'Annualisation' },
    { value:'2',  label:'Frontier Modes' },
  ]
  const features = [
    {
      icon: <ClipboardList size={20}/>, title:'Risk Profiling',
      desc:'8-question psychometric assessment computing a personalised risk aversion coefficient A ∈ [1, 10].',
      path:'/questionnaire', tag:'Part 2',
    },
    {
      icon: <TrendingUp size={20}/>, title:'Efficient Frontier & Analytics',
      desc:'Live mean-variance frontier, GMVP, correlation heatmap, and fund scatter — with and without short sales.',
      path:'/portfolio', tag:'Part 1',
    },
  ]
  const method = [
    { icon:<Shield size={18}/>, title:'Risk Formula', body:'Weighted questionnaire scores mapped linearly to A ∈ [1,10]. Heavier weights on loss-reaction and investment-horizon questions.' },
    { icon:<Zap size={18}/>, title:'Portfolio Optimisation', body:'Minimise σ² subject to a target return. GMVP via Σ⁻¹1/(1ᵀΣ⁻¹1). Scipy SLSQP for constrained (no-short) frontier.' },
    { icon:<Target size={18}/>, title:'Utility Framework', body:'Optimal portfolio maximises U = r − (σ²·A)/2. Investor-specific A personalises the tangency point on the frontier.' },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-eyebrow">BMD5302 · Group Project · AY 2025/26</div>
        <h1 className="page-title">
          Intelligent<br/>
          <em style={{color:'var(--gold)'}}>Robot Adviser</em>
        </h1>
        <p className="page-sub">
          A web-based robo-advisory platform that profiles investor risk tolerance and constructs
          mean-variance optimal portfolios from 10 FSMOne funds.
        </p>
        <div style={{display:'flex',gap:12,marginTop:24,flexWrap:'wrap'}}>
          <Link to="/questionnaire" style={btnPrimary}>Start Assessment <ArrowRight size={14}/></Link>
          <Link to="/portfolio"     style={btnGhost}>View Analytics</Link>
        </div>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:32}}>
        {stats.map(s=>(
          <div key={s.label} className="card" style={{textAlign:'center',padding:'20px 16px'}}>
            <div style={{fontFamily:"'Lora',serif",fontSize:'2rem',fontStyle:'italic',color:'var(--text)'}}>{s.value}</div>
            <div style={{fontSize:'.7rem',textTransform:'uppercase',letterSpacing:'.12em',color:'var(--text-muted)',marginTop:4}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Features */}
      <div className="grid-2" style={{marginBottom:32}}>
        {features.map(f=>(
          <Link key={f.title} to={f.path} style={featureCard} className="feature-card-hover">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <div style={{color:'var(--gold)'}}>{f.icon}</div>
              <span className="tag tag-gold">{f.tag}</span>
            </div>
            <div style={{fontWeight:700,fontSize:'1.05rem',marginBottom:8,color:'var(--text)'}}>{f.title}</div>
            <div style={{fontSize:'.83rem',color:'var(--text-muted)',lineHeight:1.65}}>{f.desc}</div>
            <div style={{marginTop:20,display:'flex',alignItems:'center',gap:6,fontSize:'.78rem',color:'var(--gold)'}}>Open <ArrowRight size={12}/></div>
          </Link>
        ))}
      </div>

      {/* Methodology */}
      <div className="card">
        <div className="card-title">Methodology</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:28}}>
          {method.map(m=>(
            <div key={m.title}>
              <div style={{color:'var(--gold)',marginBottom:10}}>{m.icon}</div>
              <div style={{fontWeight:600,fontSize:'.9rem',marginBottom:8}}>{m.title}</div>
              <div style={{fontSize:'.8rem',color:'var(--text-muted)',lineHeight:1.65}}>{m.body}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .feature-card-hover { transition: border-color .2s, transform .2s !important; }
        .feature-card-hover:hover { border-color: var(--gold-dim) !important; transform: translateY(-2px); }
      `}</style>
    </div>
  )
}

const btnPrimary = {
  display:'inline-flex',alignItems:'center',gap:8,
  background:'var(--gold)',color:'#000',fontWeight:700,
  fontSize:'.82rem',letterSpacing:'.06em',textTransform:'uppercase',
  padding:'12px 24px',borderRadius:99,textDecoration:'none',
}
const featureCard = {
  display:'block',textDecoration:'none',
  background:'var(--surface)',border:'1px solid var(--border)',
  borderRadius:'var(--radius-lg)',padding:'28px 32px',
}
const btnGhost = {
  display:'inline-flex',alignItems:'center',gap:8,
  background:'transparent',color:'var(--text-muted)',fontWeight:600,
  fontSize:'.82rem',letterSpacing:'.06em',textTransform:'uppercase',
  padding:'12px 24px',borderRadius:99,textDecoration:'none',
  border:'1px solid var(--border2)',
}
