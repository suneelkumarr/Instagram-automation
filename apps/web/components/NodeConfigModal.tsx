'use client';

import { useState } from 'react';
import type { FlowNode } from '@/lib/types';

interface NodeConfigModalProps {
  node: FlowNode;
  onClose: () => void;
  onSave: (node: FlowNode) => void;
  onDelete: () => void;
}

export function NodeConfigModal({ node, onClose, onSave, onDelete }: NodeConfigModalProps) {
  const [data, setData] = useState<Record<string, unknown>>(node.data || {});

  const handleSave = () => {
    onSave({ ...node, data });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#1e1e2e] rounded-xl w-full max-w-lg mx-4 shadow-2xl border border-[#2d2d4a] animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2d2d4a]">
          <h2 className="text-lg font-semibold text-white">
            Configure {node.type.replace('_', ' ')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Label */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Node Label
            </label>
            <input
              type="text"
              value={(data.label as string) || ''}
              onChange={(e) => setData({ ...data, label: e.target.value })}
              className="w-full px-3 py-2 bg-[#0f0f17] border border-[#2d2d4a] rounded-lg text-white text-sm
                focus:outline-none focus:border-primary-500"
              placeholder="Enter label..."
            />
          </div>

          {/* Type-specific fields */}
          {node.type === 'trigger' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Trigger Type
                </label>
                <select
                  value={(data.triggerType as string) || 'keyword'}
                  onChange={(e) => setData({ ...data, triggerType: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0f0f17] border border-[#2d2d4a] rounded-lg text-white text-sm
                    focus:outline-none focus:border-primary-500"
                >
                  <option value="keyword">Keyword</option>
                  <option value="comment">Comment</option>
                  <option value="new_follower">New Follower</option>
                  <option value="story_mention">Story Mention</option>
                  <option value="direct_message">Direct Message</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>

              {(data.triggerType === 'keyword' || data.triggerType === 'comment') && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Keywords (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={((data.keywords as string[]) || []).join(', ')}
                    onChange={(e) => setData({
                      ...data,
                      keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean)
                    })}
                    className="w-full px-3 py-2 bg-[#0f0f17] border border-[#2d2d4a] rounded-lg text-white text-sm
                      focus:outline-none focus:border-primary-500"
                    placeholder="info, details, help"
                  />
                </div>
              )}
            </>
          )}

          {node.type === 'message' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Message Content
                </label>
                <textarea
                  value={(data.content as string) || ''}
                  onChange={(e) => setData({ ...data, content: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 bg-[#0f0f17] border border-[#2d2d4a] rounded-lg text-white text-sm
                    focus:outline-none focus:border-primary-500 resize-none"
                  placeholder="Enter your message..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Media URL (optional)
                </label>
                <input
                  type="url"
                  value={(data.mediaUrl as string) || ''}
                  onChange={(e) => setData({ ...data, mediaUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0f0f17] border border-[#2d2d4a] rounded-lg text-white text-sm
                    focus:outline-none focus:border-primary-500"
                  placeholder="https://..."
                />
              </div>
            </>
          )}

          {node.type === 'ai_agent' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Niche / Persona
                </label>
                <select
                  value={(data.niche as string) || 'default'}
                  onChange={(e) => setData({ ...data, niche: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0f0f17] border border-[#2d2d4a] rounded-lg text-white text-sm
                    focus:outline-none focus:border-primary-500"
                >
                  <option value="default">Default</option>
                  <option value="fitness">Fitness</option>
                  <option value="coaching">Coaching</option>
                  <option value="ecommerce">E-Commerce</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Custom System Prompt
                </label>
                <textarea
                  value={(data.prompt as string) || ''}
                  onChange={(e) => setData({ ...data, prompt: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 bg-[#0f0f17] border border-[#2d2d4a] rounded-lg text-white text-sm
                    focus:outline-none focus:border-primary-500 resize-none"
                  placeholder="Optional: Override the default AI behavior..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Temperature: {(data.temperature as number) || 0.7}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={(data.temperature as number) || 0.7}
                  onChange={(e) => setData({ ...data, temperature: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Lower = more focused, Higher = more creative
                </p>
              </div>
            </>
          )}

          {node.type === 'condition' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Condition Logic
                </label>
                <select
                  value={(data.logic as string) || 'all'}
                  onChange={(e) => setData({ ...data, logic: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0f0f17] border border-[#2d2d4a] rounded-lg text-white text-sm
                    focus:outline-none focus:border-primary-500"
                >
                  <option value="all">Match ALL conditions</option>
                  <option value="any">Match ANY condition</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Conditions
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Add conditions to branch the flow based on contact data or message content.
                </p>

                {/* Existing conditions list */}
                <div className="bg-[#0f0f17] rounded-lg p-3 text-center text-gray-400 text-sm mb-2">
                  {((data.conditions as unknown[]) || []).length} condition(s) configured
                </div>

                {/* Follow Status Quick Add */}
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                  <p className="text-green-300 text-xs mb-2">
                    <strong>Follow Status Quick Add:</strong>
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const existing = (data.conditions as unknown[]) || [];
                        const alreadyHas = existing.some(
                          (c: any) => c.field === 'followStatus' && c.operator === 'is_following'
                        );
                        if (!alreadyHas) {
                          setData({
                            ...data,
                            conditions: [
                              ...existing,
                              { field: 'followStatus', operator: 'is_following', value: 'following' }
                            ]
                          });
                        }
                      }}
                      className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                    >
                      + is following
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const existing = (data.conditions as unknown[]) || [];
                        const alreadyHas = existing.some(
                          (c: any) => c.field === 'followStatus' && c.operator === 'not_following'
                        );
                        if (!alreadyHas) {
                          setData({
                            ...data,
                            conditions: [
                              ...existing,
                              { field: 'followStatus', operator: 'not_following', value: 'not_following' }
                            ]
                          });
                        }
                      }}
                      className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                    >
                      + not following
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {node.type === 'delay' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Delay Duration
              </label>
              <select
                value={(data.delayMs as number) || 5000}
                onChange={(e) => setData({ ...data, delayMs: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-[#0f0f17] border border-[#2d2d4a] rounded-lg text-white text-sm
                  focus:outline-none focus:border-primary-500"
              >
                <option value={5000}>5 seconds</option>
                <option value={10000}>10 seconds</option>
                <option value={30000}>30 seconds</option>
                <option value={60000}>1 minute</option>
                <option value={300000}>5 minutes</option>
                <option value={900000}>15 minutes</option>
                <option value={3600000}>1 hour</option>
              </select>
            </div>
          )}

          {node.type === 'action' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Action Type
                </label>
                <select
                  value={(data.actionType as string) || 'add_tag'}
                  onChange={(e) => setData({ ...data, actionType: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0f0f17] border border-[#2d2d4a] rounded-lg text-white text-sm
                    focus:outline-none focus:border-primary-500"
                >
                  <option value="add_tag">Add Tag</option>
                  <option value="remove_tag">Remove Tag</option>
                  <option value="add_to_list">Add to List</option>
                  <option value="remove_from_list">Remove from List</option>
                  <option value="update_field">Update Field</option>
                  <option value="update_score">Update Lead Score</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Value
                </label>
                <input
                  type="text"
                  value={(data.value as string) || ''}
                  onChange={(e) => setData({ ...data, value: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0f0f17] border border-[#2d2d4a] rounded-lg text-white text-sm
                    focus:outline-none focus:border-primary-500"
                  placeholder="e.g., hot-lead, vip"
                />
              </div>
            </>
          )}

          {node.type === 'check_follow_status' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Node Label
                </label>
                <input
                  type="text"
                  value={(data.label as string) || 'Check Follow Status'}
                  onChange={(e) => setData({ ...data, label: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0f0f17] border border-[#2d2d4a] rounded-lg text-white text-sm
                    focus:outline-none focus:border-primary-500"
                  placeholder="Check Follow Status"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  🔕 Message if NOT Following
                </label>
                <textarea
                  value={(data.followMessage as string) || ''}
                  onChange={(e) => setData({ ...data, followMessage: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-[#0f0f17] border border-[#2d2d4a] rounded-lg text-white text-sm
                    focus:outline-none focus:border-primary-500 resize-none"
                  placeholder="Hey! Thanks for your interest! Please follow us first to get access to the video 🎥"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  ✅ Message if Following (with link)
                </label>
                <textarea
                  value={(data.videoMessage as string) || ''}
                  onChange={(e) => setData({ ...data, videoMessage: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-[#0f0f17] border border-[#2d2d4a] rounded-lg text-white text-sm
                    focus:outline-none focus:border-primary-500 resize-none"
                  placeholder="Thanks for following! Here is your exclusive video link 🎉"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  🔗 Video / Content Link
                </label>
                <input
                  type="url"
                  value={(data.videoLink as string) || ''}
                  onChange={(e) => setData({ ...data, videoLink: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0f0f17] border border-[#2d2d4a] rounded-lg text-white text-sm
                    focus:outline-none focus:border-primary-500"
                  placeholder="https://your-site.com/video or https://streamable.com/..."
                />
              </div>

              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                <p className="text-purple-300 text-xs">
                  <strong>How it works:</strong> This node checks if the user follows your account via the Instagram API.
                  Connect the <span className="text-green-400">Following</span> handle to a message that sends the video link,
                  and the <span className="text-red-400">Not Following</span> handle to a message asking them to follow first.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[#2d2d4a]">
          <button
            onClick={onDelete}
            className="px-4 py-2 text-red-400 hover:text-red-300 text-sm transition-colors"
          >
            Delete Node
          </button>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#2d2d4a] text-white rounded-lg text-sm hover:bg-[#3d3d5c] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
