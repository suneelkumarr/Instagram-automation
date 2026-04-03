'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

export const ConditionNode = memo(({ data, selected }: NodeProps) => {
  const conditions = (data.conditions as Array<{ field: string; operator: string; value: string }>) || [];

  return (
    <div className={`
      px-4 py-3 rounded-lg min-w-[200px]
      bg-gradient-to-r from-emerald-500 to-emerald-600
      border-2 ${selected ? 'border-white shadow-lg shadow-emerald-500/30' : 'border-emerald-400'}
      shadow-lg
    `}>
      <Handle type="target" position={Position.Top} className="!bg-white !w-3 !h-3" />

      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">🔀</span>
        <div className="text-white font-semibold text-sm">
          {data.label || 'Condition'}
        </div>
      </div>

      <div className="space-y-1">
        {conditions.slice(0, 2).map((cond, i) => (
          <div key={i} className="bg-black/20 rounded p-1.5 text-xs">
            <span className="text-white/80">{cond.field}</span>
            <span className="text-white/60 mx-1">{cond.operator}</span>
            <span className="text-white/80">"{cond.value}"</span>
          </div>
        ))}
        {conditions.length > 2 && (
          <p className="text-white/60 text-xs">+{conditions.length - 2} more</p>
        )}
        {conditions.length === 0 && (
          <p className="text-white/60 text-xs">No conditions set</p>
        )}
      </div>

      {/* Branch handles */}
      <div className="flex justify-between mt-2">
        <div className="text-center">
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            style={{ position: 'relative', left: '-20px', transform: 'none' }}
            className="!bg-green-400 !w-3 !h-3"
          />
          <span className="text-white/80 text-xs">Yes</span>
        </div>
        <div className="text-center">
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            style={{ position: 'relative', left: '20px', transform: 'none' }}
            className="!bg-red-400 !w-3 !h-3"
          />
          <span className="text-white/80 text-xs">No</span>
        </div>
      </div>
    </div>
  );
});

ConditionNode.displayName = 'ConditionNode';
