'use client';

import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, ReactNode } from 'react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/dashboard/automations', label: 'Automations', icon: '⚡' },
  { href: '/dashboard/flows', label: 'Flow Builder', icon: '🔧' },
  { href: '/dashboard/inbox', label: 'Inbox', icon: '💬' },
  { href: '/dashboard/contacts', label: 'Contacts', icon: '👥' },
  { href: '/dashboard/analytics', label: 'Analytics', icon: '📈' },
  { href: '/dashboard/ai', label: 'AI Agent', icon: '🤖' },
  { href: '/dashboard/instagram', label: 'Instagram', icon: '📸' },
  { href: '/dashboard/billing', label: 'Billing', icon: '💳' },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, workspace, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f17]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0f0f17] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1e1e2e] border-r border-[#2d2d4a] flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-[#2d2d4a]">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-primary-500 via-pink-500 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
              RS
            </div>
            <div>
              <h1 className="text-white font-bold">RsuShop</h1>
              <p className="text-xs text-gray-500">{workspace?.plan || 'Free'} Plan</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-colors
                  ${isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-[#2d2d4a]'
                  }
                `}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Usage Bar */}
        {workspace?.usage && workspace?.limits && (
          <div className="p-4 border-t border-[#2d2d4a]">
            <div className="text-xs text-gray-500 mb-2">Monthly Usage</div>
            <div className="space-y-2">
              <UsageBar
                label="Messages"
                used={workspace.usage.monthlyMessages}
                limit={workspace.limits.monthlyMessages}
              />
              <UsageBar
                label="AI Credits"
                used={workspace.usage.aiCredits}
                limit={workspace.limits.aiCredits}
              />
            </div>
          </div>
        )}

        {/* User */}
        <div className="p-4 border-t border-[#2d2d4a]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium text-sm">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm truncate">{user.firstName} {user.lastName}</p>
              <p className="text-gray-500 text-xs truncate">{user.email}</p>
            </div>
            <button
              onClick={logout}
              className="text-gray-500 hover:text-white transition-colors"
              title="Logout"
            >
              🚪
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const percent = limit === Infinity ? 0 : Math.min(100, (used / limit) * 100);
  const color = percent > 90 ? 'bg-red-500' : percent > 70 ? 'bg-yellow-500' : 'bg-primary-500';

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-500">
          {used.toLocaleString()} / {limit === Infinity ? '∞' : limit.toLocaleString()}
        </span>
      </div>
      <div className="h-1.5 bg-[#2d2d4a] rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all rounded-full`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
