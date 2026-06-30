import React from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { Link, useNavigate } from 'react-router-dom';
import { Building, LogOut, Settings } from 'lucide-react';
import { Button } from '../ui/Button';
import { NotificationDropdown } from './NotificationDropdown';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const homePath = user?.role === 'admin' ? '/admin' : '/';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200/60 bg-white/80 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to={homePath} className="flex items-center gap-2">
          <Building className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold tracking-tight text-gray-900">CivicPulse AI</span>
        </Link>

        {user && (
          <div className="flex items-center gap-4">
            <NotificationDropdown />
            <Link to="/settings" className="text-gray-500 hover:text-gray-900">
              <Settings className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
              {user.photoURL
                ? <img src={user.photoURL} alt={user.displayName} className="h-8 w-8 rounded-full" />
                : <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold select-none">
                  {user.displayName?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
              }
              <div className="hidden flex-col md:flex">
                <span className="text-sm font-medium leading-none text-gray-900">{user.displayName}</span>
                <span className="text-xs text-gray-500">{user.role}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="ml-2">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
