'use client';

import { useState } from 'react';

interface NodeTemplate {
  type: string;
  label: string;
  description: string;
  icon: string;
  color: string;
}

const NODE_TEMPLATES: NodeTemplate[] = [
  {
    type: 'trigger',
    label: 'Trigger',
    description: 'Start of automation',
    icon: '⚡',
    color: 'from-yellow-500 to-orange-500',
  },
  {
    type: 'message',
    label: 'Send Message',
    description: 'Send DM to user',
    icon: '💬',
    color: 'from-blue-500 to-blue-600',
  },
  {
    type: 'ai_agent',
    label: 'AI Agent',
    description: 'AI-powered response',
    icon: '🤖',
    color: 'from-purple-500 to-purple-600',
  },
  {
    type: 'condition',
    label: 'Condition',
    description: 'Branch based on logic',
    icon: '🔀',
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    type: 'delay',
    label: 'Delay',
    description: 'Wait before next step',
    icon: '⏱️',
    color: 'from-indigo-500 to-indigo-600',
  },
  {
    type: 'action',
    label: 'Update Contact',
    description: 'Add tag or field',
    icon: '📝',
    color: 'from-pink-500 to-pink-600',
  },
  {
    type: 'end',
    label: 'End',
    description: 'End of flow',
    icon: '🛑',
    color: 'from-gray-500 to-gray-600',
  },
  {
    type: 'check_follow_status',
    label: 'Check Follow',
    description: 'Verify if user follows you',
    icon: '👤',
    color: 'from-purple-500 to-pink-500',
  },
];

export function NodePalette() {
  const [search, setSearch] = useState('');

  const filteredNodes = NODE_TEMPLATES.filter(
    (node) =>
      node.label.toLowerCase().includes(search.toLowerCase()) ||
      node.description.toLowerCase().includes(search.toLowerCase())
  );

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-[#2d2d4a]">
        <h2 className="text-white font-semibold mb-3">Node Palette</h2>
        <input
          type="text"
          placeholder="Search nodes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 bg-[#0f0f17] border border-[#2d2d4a] rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredNodes.map((node) => (
          <div
            key={node.type}
            draggable
            onDragStart={(e) => onDragStart(e, node.type)}
            className={`
              p-3 rounded-lg border border-[#2d2d4a] cursor-grab active:cursor-grabbing
              bg-gradient-to-r ${node.color}
              hover:shadow-lg hover:shadow-black/20 transition-all
              hover:scale-[1.02] active:scale-[0.98]
            `}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{node.icon}</span>
              <div>
                <h3 className="text-white font-medium text-sm">{node.label}</h3>
                <p className="text-white/70 text-xs">{node.description}</p>
              </div>
            </div>
          </div>
        ))}

        {filteredNodes.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No nodes match your search
          </div>
        )}
      </div>

      <div className="p-4 border-t border-[#2d2d4a]">
        <div className="text-xs text-gray-500">
          <p className="mb-1">💡 Tip: Drag nodes onto the canvas</p>
          <p>Click a node to configure it</p>
        </div>
      </div>
    </div>
  );
}
