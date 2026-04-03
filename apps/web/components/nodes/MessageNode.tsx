'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

export const MessageNode = memo(({ data, selected }: NodeProps) => {
  const content = (data.content as string) || '';
  const displayText = content.length > 50 ? content.substring(0, 50) + '...' : content || 'Empty message';

  return (
    <div className={`
      px-4 py-3 rounded-lg min-w-[200px]
      bg-gradient-to-r from-blue-500 to-blue-600
      border-2 ${selected ? 'border-white shadow-lg shadow-blue-500/30' : 'border-blue-400'}
      shadow-lg
    `}>
      <Handle type="target" position={Position.Top} className="!bg-white !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} className="!bg-white !w-3 !h-3" />

      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">💬</span>
        <div className="text-white font-semibold text-sm">
          {data.label || 'Send Message'}
        </div>
      </div>

      <div className="bg-black/20 rounded p-2">
        <p className="text-white/90 text-xs line-clamp-2">{displayText}</p>
      </div>

      {data.mediaUrl && (
        <div className="mt-1 text-white/70 text-xs flex items-center gap-1">
          <span>📎</span> Media attached
        </div>
      )}
    </div>
  );
});

MessageNode.displayName = 'MessageNode';
