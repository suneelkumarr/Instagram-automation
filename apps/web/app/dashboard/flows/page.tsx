'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/authContext';
import toast from 'react-hot-toast';
import type { FlowNode, FlowEdge, Automation } from '@/lib/types';

// Dynamically import FlowBuilder to avoid SSR issues with React Flow
const FlowBuilder = dynamic(() => import('@/components/FlowBuilder').then(mod => ({ default: mod.FlowBuilder })), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-[#0f0f17]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading Flow Builder...</p>
      </div>
    </div>
  ),
});

export default function FlowsPage() {
  const router = useRouter();
  const [flowName, setFlowName] = useState('My New Flow');
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedIGAccount, setSelectedIGAccount] = useState('');
  const [triggerType, setTriggerType] = useState('keyword');

  const handleSave = useCallback(async () => {
    if (!flowName.trim()) {
      toast.error('Please enter a flow name');
      return;
    }

    if (!selectedIGAccount) {
      toast.error('Please select an Instagram account');
      return;
    }

    if (nodes.length === 0) {
      toast.error('Please add at least one node to the flow');
      return;
    }

    setSaving(true);
    try {
      const response = await api.post('/automations', {
        instagramAccountId: selectedIGAccount,
        name: flowName,
        trigger: {
          type: triggerType,
          config: {},
        },
        flowData: { nodes, edges },
      });

      toast.success('Flow saved successfully!');
      router.push('/dashboard/automations');
    } catch (error: unknown) {
      toast.error((error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to save flow');
    } finally {
      setSaving(false);
    }
  }, [flowName, selectedIGAccount, triggerType, nodes, edges, router]);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-[#1e1e2e] border-b border-[#2d2d4a] px-4 py-3">
        <div className="flex items-center gap-4">
          <input
            type="text"
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            className="px-3 py-2 bg-[#0f0f17] border border-[#2d2d4a] rounded-lg text-white text-lg font-medium
              focus:outline-none focus:border-primary-500"
            placeholder="Flow name..."
          />

          <select
            value={selectedIGAccount}
            onChange={(e) => setSelectedIGAccount(e.target.value)}
            className="px-3 py-2 bg-[#0f0f17] border border-[#2d2d4a] rounded-lg text-white text-sm
              focus:outline-none focus:border-primary-500"
          >
            <option value="">Select IG Account</option>
            <option value="demo">@demo_account</option>
          </select>

          <select
            value={triggerType}
            onChange={(e) => setTriggerType(e.target.value)}
            className="px-3 py-2 bg-[#0f0f17] border border-[#2d2d4a] rounded-lg text-white text-sm
              focus:outline-none focus:border-primary-500"
          >
            <option value="keyword">Keyword Trigger</option>
            <option value="comment">Comment Trigger</option>
            <option value="new_follower">New Follower</option>
            <option value="direct_message">DM Received</option>
          </select>

          <div className="flex-1" />

          <button
            onClick={() => router.push('/dashboard/automations')}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium text-sm
              hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              '💾 Save Flow'
            )}
          </button>
        </div>
      </div>

      {/* Flow Builder */}
      <div className="flex-1">
        <FlowBuilder
          initialNodes={nodes}
          initialEdges={edges}
          onSave={(n, e) => {
            setNodes(n as FlowNode[]);
            setEdges(e as FlowEdge[]);
          }}
        />
      </div>
    </div>
  );
}
