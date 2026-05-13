import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Film, Trophy, LogOut } from 'lucide-react';

const links = [
  { to: '/', label: 'Gioca', icon: Film },
  { to: '/ranking', label: 'Classifica', icon: Trophy },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  return (
    <nav className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-primary">
            <Film className="w-6 h-6" /><span className="hidden sm:inline">FilmRatingGuessr</span>
          </Link>
          <div className="flex items-center gap-1">
            {links.map((l) => {
              const active = location.pathname === l.to;
              return (
                <Link key={l.to} to={l.to} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                  <l.icon className="w-4 h-4" />{l.label}
                </Link>
              );
            })}
            {user && (
              <button onClick={logout} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <LogOut className="w-4 h-4" />Esci
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}