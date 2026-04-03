'use client';

import { useState } from 'react';
import { api } from '@/lib/authContext';
import toast from 'react-hot-toast';
import { Sparkles, Play, Zap, MessageSquare } from 'lucide-react';

const NICHES = [
  { id: 'fitness', label: 'Fitness Coach', icon: '💪', description: 'Goals, programs, nutrition' },
  { id: 'coaching', label: 'Life Coach', icon: '🎯', description: 'Transformation, clarity, strategy' },
  { id: 'ecommerce', label: 'E-Commerce', icon: '🛒', description: 'Products, sizing, checkout' },
  { id: 'default', label: 'Default', icon: '🤖', description: 'General purpose assistant' },
];

export default function AIPage() {
  const [selectedNiche, setSelectedNiche] = useState('default');
  const [testMessage, setTestMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [brandName, setBrandName] = useState('RsuShop');

  const handleTest = async () => {
    if (!testMessage.trim()) {
      toast.error('Please enter a test message');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/ai/generate-reply', {
        message: testMessage,
        niche: selectedNiche,
        brandName,
      });

      setResponse(res.data.data.text);
    } catch (error) {
      toast.error('Failed to generate response');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">AI Agent</h1>
        <p className="text-gray-400 mt-1">Configure and test your AI-powered conversation agent</p>
      </div>

      {/* Niche Selection */}
      <div className="bg-[#1e1e2e] rounded-xl p-6 border border-[#2d2d4a]">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary-400" />
          Select AI Persona
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {NICHES.map((niche) => (
            <button
              key={niche.id}
              onClick={() => setSelectedNiche(niche.id)}
              className={`p-4 rounded-xl border text-left transition-all ${
                selectedNiche === niche.id
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-[#2d2d4a] hover:border-primary-500/30'
              }`}
            >
              <span className="text-3xl mb-2 block">{niche.icon}</span>
              <h3 className="text-white font-medium text-sm">{niche.label}</h3>
              <p className="text-gray-500 text-xs mt-1">{niche.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Test Environment */}
      <div className="bg-[#1e1e2e] rounded-xl p-6 border border-[#2d2d4a]">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary-400" />
          Test Your Agent
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Brand Name</label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="w-full px-4 py-2 bg-[#0f0f17] border border-[#2d2d4a] rounded-lg text-white
                focus:outline-none focus:border-primary-500"
              placeholder="Your brand name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Test Message</label>
            <textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 bg-[#0f0f17] border border-[#2d2d4a] rounded-lg text-white
                focus:outline-none focus:border-primary-500 resize-none"
              placeholder="Type a message as if you were a customer..."
            />
          </div>

          <button
            onClick={handleTest}
            disabled={loading}
            className="px-6 py-2 bg-gradient-to-r from-primary-500 to-pink-500 text-white rounded-lg font-medium
              hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Generating...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Generate Response
              </>
            )}
          </button>

          {response && (
            <div className="mt-6 p-4 bg-[#0f0f17] rounded-xl border border-[#2d2d4a]">
              <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                AI Response
              </h3>
              <p className="text-white whitespace-pre-wrap">{response}</p>
            </div>
          )}
        </div>
      </div>

      {/* Capabilities */}
      <div className="bg-[#1e1e2e] rounded-xl p-6 border border-[#2d2d4a]">
        <h2 className="text-lg font-semibold text-white mb-4">AI Agent Capabilities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: 'Intent Detection', desc: 'Understands what users want to achieve' },
            { title: 'Lead Capture', desc: 'Extracts emails, names, phone numbers automatically' },
            { title: 'Sentiment Analysis', desc: 'Detects frustration and escalates to humans' },
            { title: 'Natural Responses', desc: 'Conversational, not robotic or spammy' },
            { title: 'Product Suggestions', desc: 'Recommends relevant products or services' },
            { title: 'Multi-language', desc: 'Responds in the user\'s language' },
          ].map((cap, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-[#0f0f17] rounded-lg">
              <div className="w-2 h-2 rounded-full bg-primary-500 mt-2"></div>
              <div>
                <h3 className="text-white text-sm font-medium">{cap.title}</h3>
                <p className="text-gray-500 text-xs">{cap.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
