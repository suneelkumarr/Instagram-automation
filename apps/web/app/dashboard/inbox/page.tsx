'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/authContext';
import type { Conversation } from '@/lib/types';
import { MessageSquare, Search, Filter, ChevronRight, Send, AlertCircle } from 'lucide-react';

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'pending' | 'closed'>('all');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const params = filter === 'all' ? '' : `?status=${filter}`;
        const response = await api.get(`/conversations${params}`);
        setConversations(response.data.data);
      } catch (error) {
        console.error('Failed to fetch conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [filter]);

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedConversation) return;

    setSending(true);
    try {
      await api.post(`/conversations/${selectedConversation}/messages`, {
        text: replyText,
        recipientId: '', // Will be looked up from conversation
      });
      setReplyText('');
    } catch (error) {
      console.error('Failed to send reply:', error);
    } finally {
      setSending(false);
    }
  };

  const priorityColors = {
    high: 'text-red-400 bg-red-400/10',
    normal: 'text-yellow-400 bg-yellow-400/10',
    low: 'text-gray-400 bg-gray-400/10',
  };

  return (
    <div className="h-screen flex">
      {/* Conversations List */}
      <div className="w-80 bg-[#1e1e2e] border-r border-[#2d2d4a] flex flex-col">
        <div className="p-4 border-b border-[#2d2d4a]">
          <h1 className="text-lg font-bold text-white mb-3">Inbox</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-9 pr-4 py-2 bg-[#0f0f17] border border-[#2d2d4a] rounded-lg text-white text-sm
                placeholder-gray-500 focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="p-2 border-b border-[#2d2d4a] flex gap-1">
          {(['all', 'open', 'pending', 'closed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-[#2d2d4a]'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-[#2d2d4a]"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-[#2d2d4a] rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-[#2d2d4a] rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No conversations yet</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv.id)}
                className={`w-full p-4 border-b border-[#2d2d4a] text-left hover:bg-[#0f0f17] transition-colors ${
                  selectedConversation === conv.id ? 'bg-[#0f0f17]' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-500 to-pink-500 flex items-center justify-center text-white font-medium text-sm">
                    {conv.contact?.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm truncate">
                        {conv.contact?.displayName || conv.contact?.username || 'Unknown'}
                      </span>
                      {conv.priority === 'high' && (
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-gray-500 text-xs truncate">
                      {conv.contact?.username ? `@${conv.contact.username}` : ''}
                    </p>
                  </div>
                  {conv.lastMessageAt && (
                    <span className="text-gray-500 text-xs flex-shrink-0">
                      {new Date(conv.lastMessageAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Conversation Detail */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-[#2d2d4a] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-500 to-pink-500 flex items-center justify-center text-white font-medium">
                  ?
                </div>
                <div>
                  <h2 className="text-white font-medium">Conversation</h2>
                  <p className="text-gray-500 text-sm">Active</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors.normal}`}>
                  Normal
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {/* Placeholder for actual messages */}
              <p className="text-gray-500 text-center text-sm">Select a conversation to view messages</p>
            </div>

            {/* Reply */}
            <div className="p-4 border-t border-[#2d2d4a]">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type a reply..."
                    rows={2}
                    className="w-full px-4 py-2 bg-[#1e1e2e] border border-[#2d2d4a] rounded-lg text-white
                      placeholder-gray-500 focus:outline-none focus:border-primary-500 resize-none"
                  />
                </div>
                <button
                  onClick={handleSendReply}
                  disabled={sending || !replyText.trim()}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700
                    disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Select a conversation</h2>
              <p className="text-gray-500">Choose a conversation from the list to view and respond</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
