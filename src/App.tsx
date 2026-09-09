import { Navigate, Route, Routes } from 'react-router-dom'
import { Header } from './components/Header'
import { CalendarPage } from './pages/CalendarPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { NotesPage } from './pages/NotesPage'
import { NoteEditorPage } from './pages/NoteEditorPage'
import { NoteDetailPage } from './pages/NoteDetailPage'
import { NoteEditPage } from './pages/NoteEditPage'

export default function App() {
  return (
    <div className="app-shell">
      <Header />
      <Routes>
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/notes/new" element={<NoteEditorPage />} />
        <Route path="/notes/:id/edit" element={<NoteEditPage />} />
        <Route path="/notes/:id" element={<NoteDetailPage />} />
        <Route path="/" element={<PlaceholderPage page="home" />} />
        <Route path="/stats" element={<PlaceholderPage page="growth" />} />
        <Route path="/about" element={<PlaceholderPage page="about" />} />
        <Route path="*" element={<Navigate to="/calendar" replace />} />
      </Routes>
    </div>
  )
}
