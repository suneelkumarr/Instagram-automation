'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

export const AINode = memo(({ data, selected }: NodeProps) => {
  const niche = (data.niche as string) || 'default';
  const nicheIcons: Record<string, string> = {
    fitness: '💪',
    coaching: '🎯',
    ecommerce: '🛒',
    default: '🤖',
  };
  const icon = nicheIcons[niche] || '🤖';

  return (
    <div className={`
      px-4 py-3 rounded-lg min-w-[200px]
      bg-gradient-to-r from-purple-500 to-purple-600
      border-2 ${selected ? 'border-white shadow-lg shadow-purple-500/30' : 'border-purple-400'}
      shadow-lg
    `}>
      <Handle type="target" position={Position.Top} className="!bg-white !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} className="!bg-white !w-3 !h-3" />

      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">{icon}</span>
        <div className="text-white font-semibold text-sm">
          {data.label || 'AI Agent'}
        </div>
      </div>

      <div className="bg-black/20 rounded p-2">
        <p className="text-white/80 text-xs capitalize">
          Niche: {niche}
        </p>
        <p className="text-white/60 text-xs mt-1">
          Temp: {(data.temperature as number) || 0.7}
        </p>
      </div>
    </div>
  );
});

AINode.displayName = 'AINode';
