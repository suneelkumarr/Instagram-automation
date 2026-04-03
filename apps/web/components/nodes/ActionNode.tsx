'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

export const ActionNode = memo(({ data, selected }: NodeProps) => {
  const actionType = (data.actionType as string) || 'update_contact';
  const field = (data.field as string) || 'tag';

  return (
    <div className={`
      px-4 py-3 rounded-lg min-w-[180px]
      bg-gradient-to-r from-pink-500 to-pink-600
      border-2 ${selected ? 'border-white shadow-lg shadow-pink-500/30' : 'border-pink-400'}
      shadow-lg
    `}>
      <Handle type="target" position={Position.Top} className="!bg-white !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} className="!bg-white !w-3 !h-3" />

      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">📝</span>
        <div className="text-white font-semibold text-sm">
          {data.label || 'Update Contact'}
        </div>
      </div>

      <div className="bg-black/20 rounded p-2">
        <p className="text-white/80 text-xs">
          Field: <span className="font-mono">{field}</span>
        </p>
        <p className="text-white/60 text-xs mt-1">
          Value: {(data.value as string) || '—'}
        </p>
      </div>
    </div>
  );
});

ActionNode.displayName = 'ActionNode';
