import { useState, useEffect, Component } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { BarChart2, ClipboardList, Home, TrendingUp, Sun, Moon, Briefcase } from 'lucide-react'
import HomePage from './pages/HomePage'
import QuestionnairePage from './pages/QuestionnairePage'
import PortfolioPage from './pages/PortfolioPage'
import FundOverviewPage from './pages/FundOverviewPage'
import MyPortfolioPage from './pages/MyPortfolioPage'
import './App.css'

class PageErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) return (
      <div className="page">
        <div className="card" style={{textAlign:'center',padding:'56px 36px'}}>
          <div style={{fontSize:'2.5rem',marginBottom:16}}>⚠</div>
          <div style={{fontFamily:"'Lora',serif",fontSize:'1.3rem',color:'var(--text)',marginBottom:10}}>Something went wrong</div>
          <div style={{color:'var(--text-muted)',fontSize:'.93rem',marginBottom:24}}>{this.state.error.message}</div>
          <button onClick={()=>this.setState({error:null})}
            style={{padding:'10px 24px',borderRadius:99,background:'var(--gold)',color:'var(--btn-text-on-gold)',border:'none',cursor:'pointer',fontWeight:600}}>
            Try again
          </button>
        </div>
      </div>
    )
    return this.props.children
  }
}

function useTheme() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('theme') || 'dark'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark')
  return { theme, toggle }
}

function ThemeToggle({ theme, toggle, compact }) {
  return (
    <button onClick={toggle} className={`theme-toggle${compact ? ' theme-toggle--compact' : ''}`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
      {theme === 'dark' ? <Sun size={compact ? 18 : 16}/> : <Moon size={compact ? 18 : 16}/>}
      {!compact && <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
    </button>
  )
}

function Nav({ theme, toggle }) {
  return (
    <nav className="sidenav">
      <div className="nav-brand">
        <span className="brand-icon">◈</span>
        <div>
          <div className="brand-title">RoboAdvisor</div>
          <div className="brand-sub">Portfolio Advisor</div>
        </div>
      </div>
      <div className="nav-links">
        <NavLink to="/" end className={({isActive})=>`nav-item${isActive?' active':''}`}>
          <Home size={16}/> <span>Overview</span>
        </NavLink>
        <NavLink to="/questionnaire" className={({isActive})=>`nav-item${isActive?' active':''}`}>
          <ClipboardList size={16}/> <span>Risk Profile</span>
        </NavLink>
        <NavLink to="/my-portfolio" className={({isActive})=>`nav-item${isActive?' active':''}`}>
          <Briefcase size={16}/> <span>My Portfolio</span>
        </NavLink>
        <NavLink to="/portfolio" className={({isActive})=>`nav-item${isActive?' active':''}`}>
          <TrendingUp size={16}/> <span>Frontier &amp; Analytics</span>
        </NavLink>
        <NavLink to="/funds" className={({isActive})=>`nav-item${isActive?' active':''}`}>
          <BarChart2 size={16}/> <span>Fund Overview</span>
        </NavLink>
      </div>
      <div className="nav-footer">
        <ThemeToggle theme={theme} toggle={toggle}/>
        <span className="mono dim" style={{marginTop:10,display:'block'}}>Mean-Variance Optimisation</span>
      </div>
    </nav>
  )
}

function MobileNav({ theme, toggle }) {
  return (
    <nav className="mobile-nav">
      <div className="mobile-nav-inner">
        <NavLink to="/" end className={({isActive})=>`mobile-nav-item${isActive?' active':''}`}>
          <Home size={20}/><span>Home</span>
        </NavLink>
        <NavLink to="/questionnaire" className={({isActive})=>`mobile-nav-item${isActive?' active':''}`}>
          <ClipboardList size={20}/><span>Profile</span>
        </NavLink>
        <NavLink to="/my-portfolio" className={({isActive})=>`mobile-nav-item${isActive?' active':''}`}>
          <Briefcase size={20}/><span>Portfolio</span>
        </NavLink>
        <NavLink to="/portfolio" className={({isActive})=>`mobile-nav-item${isActive?' active':''}`}>
          <TrendingUp size={20}/><span>Frontier</span>
        </NavLink>
        <NavLink to="/funds" className={({isActive})=>`mobile-nav-item${isActive?' active':''}`}>
          <BarChart2 size={20}/><span>Funds</span>
        </NavLink>
        <ThemeToggle theme={theme} toggle={toggle} compact/>
      </div>
    </nav>
  )
}

export default function App() {
  const { theme, toggle } = useTheme()

  return (
    <BrowserRouter>
      <div className="layout">
        <Nav theme={theme} toggle={toggle}/>
        <main className="main-content">
          <PageErrorBoundary>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/questionnaire" element={<QuestionnairePage />} />
              <Route path="/my-portfolio" element={<MyPortfolioPage />} />
              <Route path="/portfolio" element={<PortfolioPage />} />
              <Route path="/funds" element={<FundOverviewPage />} />
            </Routes>
          </PageErrorBoundary>
        </main>
        <MobileNav theme={theme} toggle={toggle}/>
      </div>
    </BrowserRouter>
  )
}
