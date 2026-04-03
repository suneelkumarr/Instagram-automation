'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

export const EndNode = memo(({ data, selected }: NodeProps) => {
  return (
    <div className={`
      px-4 py-3 rounded-lg min-w-[120px]
      bg-gradient-to-r from-gray-500 to-gray-600
      border-2 ${selected ? 'border-white shadow-lg shadow-gray-500/30' : 'border-gray-400'}
      shadow-lg
    `}>
      <Handle type="target" position={Position.Top} className="!bg-white !w-3 !h-3" />

      <div className="flex items-center gap-2">
        <span className="text-2xl">🛑</span>
        <div className="text-white font-semibold text-sm">
          {data.label || 'End'}
        </div>
      </div>
    </div>
  );
});

EndNode.displayName = 'EndNode';
