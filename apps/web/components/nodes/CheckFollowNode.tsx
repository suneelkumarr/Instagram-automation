'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

export const CheckFollowNode = memo(({ data, selected }: NodeProps) => {
  const followMessage = (data.followMessage as string) || 'Please follow us first!';
  const videoMessage = (data.videoMessage as string) || 'Thanks for following! Here is your link:';
  const videoLink = (data.videoLink as string) || '';

  const displayFollowMsg = followMessage.length > 40
    ? followMessage.substring(0, 40) + '...'
    : followMessage;
  const displayVideoMsg = videoMessage.length > 40
    ? videoMessage.substring(0, 40) + '...'
    : videoMessage;

  return (
    <div className={`
      px-4 py-3 rounded-lg min-w-[220px]
      bg-gradient-to-r from-purple-500 to-pink-500
      border-2 ${selected ? 'border-white shadow-lg shadow-purple-500/30' : 'border-purple-400'}
      shadow-lg
    `}>
      <Handle type="target" position={Position.Top} className="!bg-white !w-3 !h-3" />

      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">👤</span>
        <div className="text-white font-semibold text-sm">
          {data.label || 'Check Follow Status'}
        </div>
      </div>

      <div className="space-y-2">
        {/* Not Following Branch */}
        <div className="bg-black/20 rounded p-2">
          <div className="text-white/60 text-xs mb-1 font-medium">🔕 If NOT following:</div>
          <p className="text-white/90 text-xs line-clamp-2">{displayFollowMsg}</p>
        </div>

        {/* Following Branch */}
        <div className="bg-black/20 rounded p-2">
          <div className="text-white/60 text-xs mb-1 font-medium">✅ If following:</div>
          <p className="text-white/90 text-xs line-clamp-2">{displayVideoMsg}</p>
          {videoLink && (
            <p className="text-white/60 text-xs truncate mt-1">🔗 {videoLink}</p>
          )}
        </div>
      </div>

      {/* Yes/No branch handles */}
      <div className="flex justify-between mt-2">
        <div className="text-center">
          <Handle
            type="source"
            position={Position.Bottom}
            id="following"
            style={{ position: 'relative', left: '-25px', transform: 'none' }}
            className="!bg-green-400 !w-3 !h-3"
          />
          <span className="text-white/80 text-xs">Following</span>
        </div>
        <div className="text-center">
          <Handle
            type="source"
            position={Position.Bottom}
            id="not_following"
            style={{ position: 'relative', left: '25px', transform: 'none' }}
            className="!bg-red-400 !w-3 !h-3"
          />
          <span className="text-white/80 text-xs">Not Following</span>
        </div>
      </div>
    </div>
  );
});

CheckFollowNode.displayName = 'CheckFollowNode';
