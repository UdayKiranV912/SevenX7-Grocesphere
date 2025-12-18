
import React from 'react';
import { useStore } from '../contexts/StoreContext';
import { UserProfile } from '../components/UserProfile';

interface ProfilePageProps {
  onBack?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onBack }) => {
  const { user, setUser } = useStore();
  
  return (
    <UserProfile 
        user={user} 
        onLogout={() => window.location.reload()} // Simple reload to clear state for MVP
        onUpdateUser={(updates) => setUser(prev => ({ ...prev, ...updates }))} 
        onBack={onBack}
    />
  );
};
