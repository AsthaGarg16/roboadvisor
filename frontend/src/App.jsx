import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { BarChart2, ClipboardList, Home, TrendingUp, Sun, Moon } from 'lucide-react'
import HomePage from './pages/HomePage'
import QuestionnairePage from './pages/QuestionnairePage'
import PortfolioPage from './pages/PortfolioPage'
import FundOverviewPage from './pages/FundOverviewPage'
import './App.css'

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
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/questionnaire" element={<QuestionnairePage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/funds" element={<FundOverviewPage />} />
          </Routes>
        </main>
        <MobileNav theme={theme} toggle={toggle}/>
      </div>
    </BrowserRouter>
  )
}
