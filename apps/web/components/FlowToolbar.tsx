'use client';

import { useState } from 'react';

interface FlowToolbarProps {
  onSave: () => void;
  onClear: () => void;
}

export function FlowToolbar({ onSave, onClear }: FlowToolbarProps) {
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      onSave();
      setLastSaved(new Date());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2 bg-[#1e1e2e] rounded-lg p-2 border border-[#2d2d4a]">
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md text-sm
          hover:bg-primary-700 disabled:opacity-50 transition-colors"
      >
        {saving ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Saving...
          </>
        ) : (
          <>
            💾 Save Flow
          </>
        )}
      </button>

      <button
        onClick={onClear}
        className="px-3 py-2 bg-[#2d2d4a] text-gray-300 rounded-md text-sm
          hover:bg-[#3d3d5c] transition-colors"
      >
        🗑️ Clear
      </button>

      {lastSaved && (
        <span className="text-gray-500 text-xs ml-2">
          Saved {lastSaved.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
