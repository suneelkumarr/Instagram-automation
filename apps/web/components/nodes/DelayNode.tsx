'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

export const DelayNode = memo(({ data, selected }: NodeProps) => {
  const delayMs = (data.delayMs as number) || 5000;
  const seconds = Math.floor(delayMs / 1000);
  const minutes = Math.floor(seconds / 60);

  const formatDelay = () => {
    if (minutes >= 1) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className={`
      px-4 py-3 rounded-lg min-w-[160px]
      bg-gradient-to-r from-indigo-500 to-indigo-600
      border-2 ${selected ? 'border-white shadow-lg shadow-indigo-500/30' : 'border-indigo-400'}
      shadow-lg
    `}>
      <Handle type="target" position={Position.Top} className="!bg-white !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} className="!bg-white !w-3 !h-3" />

      <div className="flex items-center gap-2">
        <span className="text-2xl">⏱️</span>
        <div>
          <div className="text-white font-semibold text-sm">
            {data.label || 'Delay'}
          </div>
          <div className="text-white/80 text-sm font-mono">
            {formatDelay()}
          </div>
        </div>
      </div>
    </div>
  );
});

DelayNode.displayName = 'DelayNode';
