import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import { MatchProvider } from './context/MatchContext';
import { FriendsProvider } from './context/FriendsContext';
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PlayPage from './pages/PlayPage';
import RankingPage from './pages/RankingPage';
import HistoryPage from './pages/HistoryPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import MatchPage from './pages/MatchPage';
import ChatPage from './pages/ChatPage';
import LobbiesPage from './pages/LobbiesPage';
import LobbyPage from './pages/LobbyPage';
import FriendsPage from './pages/FriendsPage';
import HigherOrLowerPage from './pages/HigherOrLowerPage';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <MatchProvider>
            <FriendsProvider>
            <BrowserRouter>
              <Navbar />
              <main className="min-h-[calc(100vh-4rem)]">
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/" element={<ProtectedRoute><PlayPage /></ProtectedRoute>} />
                  <Route path="/ranking" element={<ProtectedRoute><RankingPage /></ProtectedRoute>} />
                  <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                  <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
                  <Route path="/match" element={<ProtectedRoute><MatchPage /></ProtectedRoute>} />
                  <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
                  <Route path="/lobbies" element={<ProtectedRoute><LobbiesPage /></ProtectedRoute>} />
                  <Route path="/lobby/:code" element={<ProtectedRoute><LobbyPage /></ProtectedRoute>} />
                  <Route path="/friends" element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
                  <Route path="/higher-lower" element={<ProtectedRoute><HigherOrLowerPage /></ProtectedRoute>} />
                </Routes>
              </main>
            </BrowserRouter>
            </FriendsProvider>
          </MatchProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
