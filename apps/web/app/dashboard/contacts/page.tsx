'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/authContext';
import type { Contact } from '@/lib/types';
import { Search, Filter, Download, Tag, ChevronRight } from 'lucide-react';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const response = await api.get(`/contacts?page=${page}&limit=20${search ? `&search=${search}` : ''}`);
        setContacts(response.data.data);
        setTotal(response.data.pagination?.total || 0);
      } catch (error) {
        console.error('Failed to fetch contacts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [page, search]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-gray-400';
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'customer': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'action': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'decision': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'interested': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Contacts</h1>
          <p className="text-gray-400 mt-1">{total.toLocaleString()} total contacts</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-[#1e1e2e] text-gray-300 rounded-lg text-sm hover:bg-[#2d2d4a] transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#1e1e2e] border border-[#2d2d4a] rounded-lg text-white
              placeholder-gray-500 focus:outline-none focus:border-primary-500"
          />
        </div>
        <button className="px-4 py-2 bg-[#1e1e2e] text-gray-300 rounded-lg text-sm hover:bg-[#2d2d4a] transition-colors flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Contacts Table */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="bg-[#1e1e2e] rounded-lg p-4 border border-[#2d2d4a] animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#2d2d4a]"></div>
                <div className="flex-1">
                  <div className="h-4 bg-[#2d2d4a] rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-[#2d2d4a] rounded w-1/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-xl font-semibold text-white mb-2">No contacts yet</h3>
          <p className="text-gray-400">Contacts will appear here when you receive messages or create automations</p>
        </div>
      ) : (
        <div className="bg-[#1e1e2e] rounded-xl border border-[#2d2d4a] overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#0f0f17] border-b border-[#2d2d4a]">
              <tr>
                <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Contact</th>
                <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Score</th>
                <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Stage</th>
                <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Tags</th>
                <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Last Active</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d2d4a]">
              {contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-[#0f0f17]/50 transition-colors cursor-pointer">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-500 to-pink-500 flex items-center justify-center text-white font-medium text-sm">
                        {contact.username[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-medium">{contact.displayName || contact.username}</p>
                        <p className="text-gray-500 text-sm">@{contact.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`font-mono font-semibold ${getScoreColor(contact.leadScore)}`}>
                      {contact.leadScore}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border capitalize ${getStageColor(contact.conversationStage)}`}>
                      {contact.conversationStage}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1 flex-wrap">
                      {contact.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="px-2 py-0.5 bg-[#0f0f17] text-gray-400 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                      {contact.tags.length > 2 && (
                        <span className="text-gray-500 text-xs">+{contact.tags.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-400 text-sm">
                    {contact.lastInteractionAt
                      ? new Date(contact.lastInteractionAt).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="px-4 py-4">
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-gray-500 text-sm">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 bg-[#1e1e2e] text-gray-400 rounded-lg text-sm hover:bg-[#2d2d4a] disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(Math.ceil(total / 20), p + 1))}
              disabled={page >= Math.ceil(total / 20)}
              className="px-3 py-1 bg-[#1e1e2e] text-gray-400 rounded-lg text-sm hover:bg-[#2d2d4a] disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
