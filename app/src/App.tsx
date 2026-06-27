import { Routes, Route, Navigate } from 'react-router'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Editor from './pages/Editor'
import Bibliography from './pages/Bibliography'
import Settings from './pages/Settings'
import NewProject from './pages/NewProject'
import Admin from './pages/Admin'
import LegalPages from './pages/LegalPages'
import ErrorBoundary from './components/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/cgu" element={<LegalPages />} />
        <Route path="/confidentialite" element={<LegalPages />} />
        <Route path="/contact" element={<LegalPages />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/editor/:id" element={<Editor />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/bibliography" element={<Bibliography />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/new-project" element={<NewProject />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        <Route path="/register" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}
