import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingState from './LoadingState';
import SetupNotice from './SetupNotice';

export default function ProtectedRoute({ children, requireApproved = false, requireAdmin = false }) {
  const { authLoading, currentMember, firebaseConfigured, isAdmin } = useAuth();

  if (!firebaseConfigured) {
    return <SetupNotice />;
  }

  if (authLoading) {
    return <LoadingState />;
  }

  if (!currentMember) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/admin-login" replace />;
  }

  if (requireApproved && currentMember.status !== 'approved') {
    return <Navigate to="/pending" replace />;
  }

  return children;
}
