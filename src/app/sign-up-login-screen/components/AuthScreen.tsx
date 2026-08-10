'use client';

import React, { useState } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import AuthBrandPanel from './AuthBrandPanel';

export default function AuthScreen() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Brand Panel */}
      <AuthBrandPanel />

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16 min-h-screen">
        <div className="w-full max-w-md">
          {/* Logo for mobile */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="font-semibold text-lg text-foreground">CodeMind</span>
          </div>

          {/* Tab Switch */}
          <div className="flex bg-muted rounded-xl p-1 mb-8">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === 'login' ?'bg-card text-foreground shadow-sm' :'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveTab('register')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === 'register' ?'bg-card text-foreground shadow-sm' :'text-muted-foreground hover:text-foreground'
              }`}
            >
              Create Account
            </button>
          </div>

          {activeTab === 'login' ? (
            <LoginForm onSwitchToRegister={() => setActiveTab('register')} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setActiveTab('login')} />
          )}
        </div>
      </div>
    </div>
  );
}