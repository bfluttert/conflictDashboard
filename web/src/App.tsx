import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import { ErrorBoundary } from './components/ErrorBoundary'
import AuthPage from './pages/Auth'
import { useAuth } from './context/AuthContext'
import Country from './pages/Country'
import Sidebar from './components/Sidebar'
import { useDashboard } from './context/DashboardContext'

function App() {
  const { user, loading, signOut } = useAuth()
  const { activeTileIds, toggleTile, availableTiles, isSidebarCollapsed, toggleSidebar } = useDashboard()

  return (
    <div className="h-screen flex flex-col bg-transparent text-white overflow-hidden font-sans relative">
      {/* Background blobs for glassmorphism visibility */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full -z-10" />
      <div className="absolute bottom-[20%] right-[-5%] w-[30%] h-[30%] bg-indigo-500/10 blur-[100px] rounded-full -z-10" />
      <div className="absolute top-[30%] left-[20%] w-[20%] h-[20%] bg-white/5 blur-[80px] rounded-full -z-10" />

      <header className="h-14 border-b border-white/10 text-sm flex items-center px-6 gap-4 bg-black/40 backdrop-blur-md flex-none shrink-0 z-50 shadow-lg">
        <Link to="/" className="font-bold text-lg tracking-tighter text-white hover:opacity-80 transition-opacity">
          CONFLICT<span className="text-white/40">DASHBOARD</span>
        </Link>
        <nav className="text-white/60 flex-1 flex items-center gap-6 ml-10">
          <Link to="/" className="hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">Global Map</Link>
        </nav>
        <div className="ml-auto">
          {loading ? (
            <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-white/40 animate-spin" />
          ) : user ? (
            <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-sm">
              <span className="text-white/60 text-[11px] font-mono tracking-tight">{user.email}</span>
              <button
                onClick={signOut}
                className="text-white/90 hover:text-white text-[11px] font-bold border-l border-white/10 pl-4 uppercase tracking-tighter"
              >
                Log out
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="bg-white text-black px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-white/90 transition-all shadow-xl shadow-white/5"
            >
              Log in
            </Link>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          availableTiles={availableTiles}
          activeTileIds={activeTileIds}
          onToggleTile={toggleTile}
          isCollapsed={isSidebarCollapsed}
          onToggleSidebar={toggleSidebar}
        />

        <main className="flex-1 overflow-y-auto bg-transparent relative z-10 scroll-smooth">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/country/:countryId" element={<Country />} />
              <Route path="/dashboard/:conflictId" element={<Dashboard />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

export default App
