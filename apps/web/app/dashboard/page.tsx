'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/authContext';
import type { AnalyticsOverview } from '@/lib/types';
import {
  Users, MessageSquare, Zap, TrendingUp, Clock, Activity
} from 'lucide-react';

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await api.get('/analytics/overview?days=30');
        setAnalytics(response.data.data);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#1e1e2e] rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-[#2d2d4a] rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-[#2d2d4a] rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const stats = analytics?.overview || {
    totalContacts: 0,
    newContacts: 0,
    totalMessages: 0,
    messagesThisWeek: 0,
    activeAutomations: 0,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Welcome back! Here's what's happening.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Total Contacts"
          value={stats.totalContacts.toLocaleString()}
          change={`+${stats.newContacts} this month`}
          color="blue"
        />
        <StatCard
          icon={<MessageSquare className="w-5 h-5" />}
          label="Messages Sent"
          value={stats.totalMessages.toLocaleString()}
          change={`${stats.messagesThisWeek} this week`}
          color="purple"
        />
        <StatCard
          icon={<Zap className="w-5 h-5" />}
          label="Active Automations"
          value={stats.activeAutomations}
          change="Running 24/7"
          color="yellow"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Growth Rate"
          value="—"
          change="Track your progress"
          color="green"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversation Status */}
        <div className="bg-[#1e1e2e] rounded-xl p-6 border border-[#2d2d4a]">
          <h2 className="text-lg font-semibold text-white mb-4">Conversation Status</h2>
          <div className="space-y-4">
            {Object.entries(analytics?.conversations || {}).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    status === 'open' ? 'bg-green-500' :
                    status === 'pending' ? 'bg-yellow-500' :
                    status === 'bot' ? 'bg-blue-500' :
                    'bg-gray-500'
                  }`} />
                  <span className="text-gray-300 capitalize">{status}</span>
                </div>
                <span className="text-white font-medium">{count as number}</span>
              </div>
            ))}
            {Object.keys(analytics?.conversations || {}).length === 0 && (
              <p className="text-gray-500 text-center py-8">No conversations yet</p>
            )}
          </div>
        </div>

        {/* Event Tracking */}
        <div className="bg-[#1e1e2e] rounded-xl p-6 border border-[#2d2d4a]">
          <h2 className="text-lg font-semibold text-white mb-4">Event Tracking</h2>
          <div className="space-y-4">
            {Object.entries(analytics?.events || {}).slice(0, 6).map(([event, count]) => (
              <div key={event} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Activity className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-300 text-sm">{event.replace(/_/g, ' ')}</span>
                </div>
                <span className="text-white font-medium">{count as number}</span>
              </div>
            ))}
            {Object.keys(analytics?.events || {}).length === 0 && (
              <p className="text-gray-500 text-center py-8">No events tracked yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-[#1e1e2e] rounded-xl p-6 border border-[#2d2d4a]">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickAction
            icon="⚡"
            label="Create Automation"
            href="/dashboard/flows/new"
          />
          <QuickAction
            icon="📸"
            label="Connect Instagram"
            href="/dashboard/instagram"
          />
          <QuickAction
            icon="🤖"
            label="Test AI Agent"
            href="/dashboard/ai"
          />
          <QuickAction
            icon="📊"
            label="View Analytics"
            href="/dashboard/analytics"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, change, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  change: string;
  color: 'blue' | 'purple' | 'yellow' | 'green';
}) {
  const colorClasses = {
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    green: 'bg-green-500/10 border-green-500/20 text-green-400',
  };

  return (
    <div className="bg-[#1e1e2e] rounded-xl p-6 border border-[#2d2d4a]">
      <div className={`inline-flex p-2 rounded-lg mb-3 ${colorClasses[color]}`}>
        {icon}
      </div>
      <p className="text-gray-400 text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-gray-500 text-xs mt-1">{change}</p>
    </div>
  );
}

function QuickAction({ icon, label, href }: { icon: string; label: string; href: string }) {
  return (
    <a
      href={href}
      className="flex flex-col items-center gap-2 p-4 bg-[#0f0f17] rounded-lg border border-[#2d2d4a]
        hover:border-primary-500/50 hover:bg-[#1e1e2e] transition-all group"
    >
      <span className="text-3xl group-hover:scale-110 transition-transform">{icon}</span>
      <span className="text-gray-400 text-sm group-hover:text-white transition-colors">{label}</span>
    </a>
  );
}
