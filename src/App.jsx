import { HashRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import About from './pages/About';
import Activities from './pages/Activities';
import Documentation from './pages/Documentation';
import Gallery from './pages/Gallery';
import Login from './pages/Login';
import Register from './pages/Register';
import PendingApproval from './pages/PendingApproval';
import Dashboard from './pages/Dashboard';
import LearningMap from './pages/LearningMap';
import Course from './pages/Course';
import Quiz from './pages/Quiz';
import Rewards from './pages/Rewards';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import FinalQuest from './pages/FinalQuest';
import Certificate from './pages/Certificate';
import AdminLogin from './pages/AdminLogin';
import AdminPanel from './pages/AdminPanel';

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <ToastProvider>
          <div className="app-shell">
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/activities" element={<Activities />} />
              <Route path="/documentation" element={<Documentation />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/admin-login" element={<AdminLogin />} />
              <Route path="/pending" element={<ProtectedRoute><PendingApproval /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute requireApproved><Dashboard /></ProtectedRoute>} />
              <Route path="/map" element={<ProtectedRoute requireApproved><LearningMap /></ProtectedRoute>} />
              <Route path="/course/:stageId" element={<ProtectedRoute requireApproved><Course /></ProtectedRoute>} />
              <Route path="/quiz/:stageId" element={<ProtectedRoute requireApproved><Quiz /></ProtectedRoute>} />
              <Route path="/rewards" element={<ProtectedRoute requireApproved><Rewards /></ProtectedRoute>} />
              <Route path="/leaderboard" element={<ProtectedRoute requireApproved><Leaderboard /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute requireApproved><Profile /></ProtectedRoute>} />
              <Route path="/final-quest" element={<ProtectedRoute requireApproved><FinalQuest /></ProtectedRoute>} />
              <Route path="/certificate" element={<ProtectedRoute requireApproved><Certificate /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminPanel /></ProtectedRoute>} />
            </Routes>
            <Footer />
          </div>
        </ToastProvider>
      </AuthProvider>
    </HashRouter>
  );
}
