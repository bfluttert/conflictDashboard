import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import { ErrorBoundary } from './components/ErrorBoundary'
import AuthPage from './pages/Auth'
import { useAuth } from './context/AuthContext'
import Country from './pages/Country'

function App() {
  const { user, loading, signOut } = useAuth()
  return (
    <div className="min-h-screen bg-white text-black">
      <header className="p-3 border-b text-sm flex items-center gap-4 bg-white">
        <Link to="/" className="font-semibold">Conflict Dashboard</Link>
        <nav className="text-gray-500 flex-1">
          <Link to="/" className="hover:text-gray-700">Home</Link>
        </nav>
        <div className="ml-auto">
          {loading ? (
            <span className="text-gray-500">…</span>
          ) : user ? (
            <div className="flex items-center gap-3">
              <span className="text-gray-700 text-xs">{user.email}</span>
              <button onClick={signOut} className="text-blue-600 underline text-sm">Log out</button>
            </div>
          ) : (
            <Link to="/auth" className="text-blue-600 underline text-sm">Log in</Link>
          )}
        </div>
      </header>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/country/:countryId" element={<Country />} />
          <Route path="/dashboard/:conflictId" element={<Dashboard />} />
        </Routes>
      </ErrorBoundary>
    </div>
  )
}

export default App
