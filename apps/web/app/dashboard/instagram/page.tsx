'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/authContext';
import { Instagram, Plus, RefreshCw, Trash2, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function InstagramPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await api.get('/instagram-accounts');
        setAccounts(response.data.data);
      } catch (error) {
        console.error('Failed to fetch accounts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      // Redirect to Meta OAuth
      const redirectUri = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/auth/instagram`;
      const clientId = process.env.NEXT_PUBLIC_META_APP_ID || 'your-app-id';
      const state = Math.random().toString(36).substring(7);

      window.location.href = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=instagram_basic,instagram_manage_messages,instagram_manage_comments,pages_read_engagement&state=${state}`;
    } catch (error) {
      toast.error('Failed to start connection');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) return;

    try {
      await api.delete(`/instagram-accounts/${id}`);
      setAccounts(accounts.filter(a => a.id !== id));
      toast.success('Account disconnected');
    } catch (error) {
      toast.error('Failed to disconnect account');
    }
  };

  const handleSync = async (id: string) => {
    try {
      await api.post(`/instagram-accounts/${id}/sync`);
      toast.success('Account synced!');
    } catch (error) {
      toast.error('Failed to sync account');
    }
  };

  const statusConfig = {
    active: { icon: CheckCircle, color: 'text-green-400 bg-green-400/10', label: 'Connected' },
    pending: { icon: Clock, color: 'text-yellow-400 bg-yellow-400/10', label: 'Pending' },
    expired: { icon: AlertCircle, color: 'text-red-400 bg-red-400/10', label: 'Expired' },
    disconnected: { icon: Trash2, color: 'text-gray-400 bg-gray-400/10', label: 'Disconnected' },
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Instagram Accounts</h1>
          <p className="text-gray-400 mt-1">Connect and manage your Instagram accounts</p>
        </div>
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="px-4 py-2 bg-gradient-to-r from-primary-500 via-pink-500 to-orange-500 text-white rounded-lg font-medium text-sm
            hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {connecting ? 'Connecting...' : 'Connect Instagram'}
        </button>
      </div>

      {/* Connection Steps */}
      {accounts.length === 0 && !loading && (
        <div className="bg-[#1e1e2e] rounded-xl p-8 border border-[#2d2d4a]">
          <h2 className="text-lg font-semibold text-white mb-6 text-center">How to Connect</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-[#0f0f17] rounded-xl">
              <div className="w-12 h-12 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-2xl font-bold mx-auto mb-4">1</div>
              <h3 className="text-white font-medium mb-2">Create Meta App</h3>
              <p className="text-gray-400 text-sm">Create a Meta app with Instagram Graph API and configure permissions</p>
            </div>
            <div className="text-center p-6 bg-[#0f0f17] rounded-xl">
              <div className="w-12 h-12 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-2xl font-bold mx-auto mb-4">2</div>
              <h3 className="text-white font-medium mb-2">Connect Account</h3>
              <p className="text-gray-400 text-sm">Click "Connect Instagram" and authorize your account</p>
            </div>
            <div className="text-center p-6 bg-[#0f0f17] rounded-xl">
              <div className="w-12 h-12 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-2xl font-bold mx-auto mb-4">3</div>
              <h3 className="text-white font-medium mb-2">Start Automating</h3>
              <p className="text-gray-400 text-sm">Create automations and start engaging with your audience</p>
            </div>
          </div>
        </div>
      )}

      {/* Account Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-[#1e1e2e] rounded-xl p-6 border border-[#2d2d4a] animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[#2d2d4a]"></div>
                <div className="flex-1">
                  <div className="h-5 bg-[#2d2d4a] rounded w-1/3 mb-2"></div>
                  <div className="h-4 bg-[#2d2d4a] rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : accounts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((account) => {
            const status = statusConfig[account.status as keyof typeof statusConfig] || statusConfig.pending;
            const StatusIcon = status.icon;

            return (
              <div key={account.id} className="bg-[#1e1e2e] rounded-xl p-6 border border-[#2d2d4a]">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center overflow-hidden">
                    {account.profilePicture ? (
                      <img src={account.profilePicture} alt={account.username} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-2xl font-bold">{account.username[0].toUpperCase()}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-semibold">@{account.username}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${status.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm truncate">{account.displayName || 'No display name'}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      {account.followersCount?.toLocaleString() || 0} followers
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-[#2d2d4a] flex items-center gap-2">
                  <button
                    onClick={() => handleSync(account.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#0f0f17] text-gray-300 rounded-lg text-sm hover:bg-[#2d2d4a] transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Sync
                  </button>
                  <button
                    onClick={() => handleDisconnect(account.id)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 text-red-400 rounded-lg text-sm hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Disconnect
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Permissions Info */}
      <div className="bg-[#1e1e2e] rounded-xl p-6 border border-[#2d2d4a]">
        <h2 className="text-lg font-semibold text-white mb-4">Required Permissions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'instagram_basic', desc: 'Read profile data' },
            { name: 'instagram_manage_messages', desc: 'Send/receive DMs' },
            { name: 'instagram_manage_comments', desc: 'Moderate comments' },
            { name: 'pages_read_engagement', desc: 'Access page data' },
          ].map((perm) => (
            <div key={perm.name} className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white text-sm font-medium">{perm.name}</p>
                <p className="text-gray-500 text-xs">{perm.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
