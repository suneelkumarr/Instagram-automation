'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const TRIGGER_ICONS: Record<string, string> = {
  keyword: '🔑',
  comment: '💬',
  new_follower: '👋',
  story_mention: '📖',
  direct_message: '✉️',
  scheduled: '⏰',
};

export const TriggerNode = memo(({ data, selected }: NodeProps) => {
  const triggerType = (data.triggerType as string) || 'keyword';
  const icon = TRIGGER_ICONS[triggerType] || '⚡';

  return (
    <div className={`
      px-4 py-3 rounded-lg min-w-[180px]
      bg-gradient-to-r from-yellow-500 to-orange-500
      border-2 ${selected ? 'border-white shadow-lg shadow-yellow-500/30' : 'border-yellow-400'}
      shadow-lg
    `}>
      <Handle type="source" position={Position.Bottom} className="!bg-white !w-3 !h-3" />

      <div className="flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className="text-white font-semibold text-sm">
            {data.label || 'Trigger'}
          </div>
          <div className="text-white/80 text-xs capitalize">
            {triggerType.replace('_', ' ')}
          </div>
        </div>
      </div>
    </div>
  );
});

TriggerNode.displayName = 'TriggerNode';
