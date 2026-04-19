import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { BarChart2, ClipboardList, Home, TrendingUp } from 'lucide-react'
import HomePage from './pages/HomePage'
import QuestionnairePage from './pages/QuestionnairePage'
import PortfolioPage from './pages/PortfolioPage'
import FundOverviewPage from './pages/FundOverviewPage'
import './App.css'

function Nav() {
  return (
    <nav className="sidenav">
      <div className="nav-brand">
        <span className="brand-icon">◈</span>
        <div>
          <div className="brand-title">RoboAdvisor</div>
          <div className="brand-sub">BMD5302</div>
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
        <span className="mono dim">AY 2025/26 · Sem 2</span>
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="layout">
        <Nav />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/questionnaire" element={<QuestionnairePage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/funds" element={<FundOverviewPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
