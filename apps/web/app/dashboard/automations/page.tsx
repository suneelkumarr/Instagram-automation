'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/authContext';
import Link from 'next/link';
import type { Automation } from '@/lib/types';
import { Zap, Play, Pause, Copy, Trash2, Clock, MessageSquare } from 'lucide-react';

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'draft'>('all');

  useEffect(() => {
    const fetchAutomations = async () => {
      try {
        const params = filter === 'all' ? '' : `?status=${filter}`;
        const response = await api.get(`/automations${params}`);
        setAutomations(response.data.data);
      } catch (error) {
        console.error('Failed to fetch automations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAutomations();
  }, [filter]);

  const handleStatusChange = async (id: string, newStatus: 'active' | 'paused') => {
    try {
      const endpoint = newStatus === 'active' ? '/activate' : '/pause';
      await api.post(`/automations/${id}${endpoint}`);

      setAutomations(automations.map(a =>
        a.id === id ? { ...a, status: newStatus } : a
      ));
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this automation?')) return;

    try {
      await api.delete(`/automations/${id}`);
      setAutomations(automations.filter(a => a.id !== id));
    } catch (error) {
      console.error('Failed to delete automation:', error);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await api.post(`/automations/${id}/duplicate`);
      // Refresh list
      const response = await api.get('/automations');
      setAutomations(response.data.data);
    } catch (error) {
      console.error('Failed to duplicate automation:', error);
    }
  };

  const statusColors = {
    active: 'bg-green-500/10 text-green-400 border-green-500/20',
    paused: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    draft: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    archived: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Automations</h1>
          <p className="text-gray-400 mt-1">Manage your Instagram automation flows</p>
        </div>
        <Link
          href="/dashboard/flows"
          className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium text-sm
            hover:bg-primary-700 transition-colors flex items-center gap-2"
        >
          <Zap className="w-4 h-4" />
          Create Flow
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {(['all', 'active', 'paused', 'draft'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-primary-600 text-white'
                : 'bg-[#1e1e2e] text-gray-400 hover:text-white border border-[#2d2d4a]'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Automations Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-[#1e1e2e] rounded-xl p-6 border border-[#2d2d4a] animate-pulse">
              <div className="h-4 bg-[#2d2d4a] rounded w-3/4 mb-4"></div>
              <div className="h-3 bg-[#2d2d4a] rounded w-1/2 mb-6"></div>
              <div className="h-8 bg-[#2d2d4a] rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : automations.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">⚡</div>
          <h3 className="text-xl font-semibold text-white mb-2">No automations yet</h3>
          <p className="text-gray-400 mb-6">Create your first automation to start engaging with your audience</p>
          <Link
            href="/dashboard/flows"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-medium
              hover:bg-primary-700 transition-colors"
          >
            <Zap className="w-4 h-4" />
            Create Your First Flow
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {automations.map((automation) => (
            <div
              key={automation.id}
              className="bg-[#1e1e2e] rounded-xl p-6 border border-[#2d2d4a] hover:border-primary-500/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold truncate">{automation.name}</h3>
                  <p className="text-gray-500 text-sm truncate">
                    {automation.instagramAccount?.username || 'No account'}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors[automation.status as keyof typeof statusColors]}`}>
                  {automation.status}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center p-2 bg-[#0f0f17] rounded-lg">
                  <div className="text-white font-semibold text-sm">{automation.stats.triggered}</div>
                  <div className="text-gray-500 text-xs">Triggered</div>
                </div>
                <div className="text-center p-2 bg-[#0f0f17] rounded-lg">
                  <div className="text-green-400 font-semibold text-sm">{automation.stats.completed}</div>
                  <div className="text-gray-500 text-xs">Completed</div>
                </div>
                <div className="text-center p-2 bg-[#0f0f17] rounded-lg">
                  <div className="text-red-400 font-semibold text-sm">{automation.stats.failed}</div>
                  <div className="text-gray-500 text-xs">Failed</div>
                </div>
              </div>

              {/* Trigger Info */}
              <div className="flex items-center gap-2 mb-4 text-sm text-gray-400">
                <Zap className="w-4 h-4" />
                <span className="capitalize">{automation.trigger.type.replace('_', ' ')}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-[#2d2d4a]">
                {automation.status === 'active' ? (
                  <button
                    onClick={() => handleStatusChange(automation.id, 'paused')}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-yellow-500/10 text-yellow-400
                      rounded-lg text-sm hover:bg-yellow-500/20 transition-colors"
                  >
                    <Pause className="w-4 h-4" />
                    Pause
                  </button>
                ) : (
                  <button
                    onClick={() => handleStatusChange(automation.id, 'active')}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-500/10 text-green-400
                      rounded-lg text-sm hover:bg-green-500/20 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Activate
                  </button>
                )}

                <button
                  onClick={() => handleDuplicate(automation.id)}
                  className="p-2 bg-[#0f0f17] text-gray-400 rounded-lg hover:text-white transition-colors"
                  title="Duplicate"
                >
                  <Copy className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDelete(automation.id)}
                  className="p-2 bg-[#0f0f17] text-gray-400 rounded-lg hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
