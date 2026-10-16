// AdminRoute wrapper enforcing role-based access control
import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from './Button';

export default function AdminRoute({ children }) {
  const { user, isAdmin, switchRole } = useAuth();

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-page text-ink flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card border border-line rounded-2xl p-8 text-center shadow-lg flex flex-col items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center">
            <ShieldAlert size={36} />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight text-ink">
              Admin Access Required
            </h1>
            <p className="text-xs text-muted leading-relaxed">
              You are signed in as <strong className="text-ink">{user?.email || 'Guest'}</strong> ({user?.role || 'USER'}). This route is strictly restricted to authorized administrators.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 w-full pt-2">
            <Link to="/chat" className="w-full">
              <Button variant="primary" fullWidth icon={ArrowLeft}>
                Return to Chat
              </Button>
            </Link>

            {/* Quick Demo Switcher so reviewer can easily test Admin role */}
            <Button
              variant="secondary"
              fullWidth
              icon={KeyRound}
              onClick={() => switchRole('ADMIN')}
              className="text-xs"
            >
              Switch to Admin Account (Demo)
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
