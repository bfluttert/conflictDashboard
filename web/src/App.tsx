import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import { ErrorBoundary } from './components/ErrorBoundary'

function App() {
  return (
    <div className="min-h-screen bg-white text-black">
      <header className="p-3 border-b text-sm flex items-center gap-4 bg-white">
        <Link to="/" className="font-semibold">Conflict Dashboard</Link>
        <nav className="text-gray-500">
          <Link to="/" className="hover:text-gray-700">Home</Link>
        </nav>
      </header>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard/:conflictId" element={<Dashboard />} />
        </Routes>
      </ErrorBoundary>
    </div>
  )
}

export default App
