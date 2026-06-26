import { Routes, Route } from 'react-router'
import { Routes, Route } from 'react-router'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Editor from './pages/Editor'
import Bibliography from './pages/Bibliography'
import Settings from './pages/Settings'
import NewProject from './pages/NewProject'
import Admin from './pages/Admin'
import Register from './pages/Register'
import Login from './pages/Login'
import LegalPages from './pages/LegalPages'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cgu" element={<LegalPages />} />
        <Route path="/confidentialite" element={<LegalPages />} />
        <Route path="/contact" element={<LegalPages />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/editor/:id" element={<ProtectedRoute><Editor /></ProtectedRoute>} />
        <Route path="/editor" element={<ProtectedRoute><Editor /></ProtectedRoute>} />
        <Route path="/bibliography" element={<ProtectedRoute><Bibliography /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/new-project" element={<ProtectedRoute><NewProject /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
      </Routes>
    </ErrorBoundary>
  )
}
