import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ResultDashboard from '../components/ResultDashboard'

export default function MyPortfolioPage() {
  const navigate   = useNavigate()
  const [result]   = useState(() => {
    const s = sessionStorage.getItem('lastAssessmentResult')
    return s ? JSON.parse(s) : null
  })
  const [portfolioData] = useState(() => {
    const s = sessionStorage.getItem('lastPortfolioData')
    return s ? JSON.parse(s) : null
  })

  if (!result) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="page-eyebrow">My Portfolio</div>
          <h1 className="page-title">Your Suggested<br/><em style={{color:'var(--gold)'}}>Portfolio</em></h1>
        </div>
        <div className="card" style={{textAlign:'center',padding:'56px 36px'}}>
          <div style={{fontSize:'2.5rem',marginBottom:16}}>◈</div>
          <div style={{fontFamily:"'Lora',serif",fontSize:'1.3rem',color:'var(--text)',marginBottom:10}}>
            No assessment on record
          </div>
          <div style={{color:'var(--text-muted)',fontSize:'.98rem',marginBottom:28}}>
            Complete the Risk Profile questionnaire to generate your personalised portfolio recommendation.
          </div>
          <button
            onClick={() => navigate('/questionnaire')}
            style={{display:'inline-flex',alignItems:'center',gap:8,padding:'12px 28px',borderRadius:99,background:'var(--gold)',color:'var(--btn-text-on-gold)',fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:'.95rem',border:'none',cursor:'pointer',letterSpacing:'.06em',textTransform:'uppercase'}}>
            Take Assessment →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-eyebrow">My Portfolio</div>
        <h1 className="page-title">Your Suggested<br/><em style={{color:'var(--gold)'}}>Portfolio</em></h1>
      </div>
      <ResultDashboard
        data={result}
        portfolioData={portfolioData}
        onRetake={() => navigate('/questionnaire')}
      />
    </div>
  )
}
