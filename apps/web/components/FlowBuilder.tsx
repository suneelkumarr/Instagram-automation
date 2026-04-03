'use client';

import { useCallback, useState, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  NodeTypes,
  BackgroundVariant,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { TriggerNode } from './nodes/TriggerNode';
import { MessageNode } from './nodes/MessageNode';
import { AINode } from './nodes/AINode';
import { ConditionNode } from './nodes/ConditionNode';
import { DelayNode } from './nodes/DelayNode';
import { ActionNode } from './nodes/ActionNode';
import { EndNode } from './nodes/EndNode';
import { CheckFollowNode } from './nodes/CheckFollowNode';
import { NodePalette } from './NodePalette';
import { NodeConfigModal } from './NodeConfigModal';
import { FlowToolbar } from './FlowToolbar';
import type { FlowNode, FlowEdge } from '@/lib/types';

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  message: MessageNode,
  ai_agent: AINode,
  condition: ConditionNode,
  delay: DelayNode,
  action: ActionNode,
  end: EndNode,
  check_follow_status: CheckFollowNode,
};

interface FlowBuilderProps {
  initialNodes?: FlowNode[];
  initialEdges?: FlowEdge[];
  onSave?: (nodes: FlowNode[], edges: FlowEdge[]) => void;
  readOnly?: boolean;
}

export function FlowBuilder({ initialNodes = [], initialEdges = [], onSave, readOnly = false }: FlowBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges as Edge[]);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        id: `e-${params.source}-${params.target}-${Date.now()}`,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#8b5cf6', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = {
        x: event.clientX - 250,
        y: event.clientY - 50,
      };

      const newNode: FlowNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          label: getDefaultLabel(type),
          ...getDefaultData(type),
        },
      };

      setNodes((nds) => [...nds, newNode as Node]);
    },
    [setNodes]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (readOnly) return;
    setSelectedNode(node as FlowNode);
    setShowConfig(true);
  }, [readOnly]);

  const onNodeUpdate = useCallback((updatedNode: FlowNode) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === updatedNode.id ? { ...n, ...updatedNode } : n))
    );
    setShowConfig(false);
    setSelectedNode(null);
  }, [setNodes]);

  const onDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setShowConfig(false);
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  const handleSave = useCallback(() => {
    onSave?.(nodes as FlowNode[], edges as FlowEdge[]);
  }, [nodes, edges, onSave]);

  return (
    <div className="flex h-full" ref={reactFlowWrapper}>
      {/* Node Palette */}
      {!readOnly && (
        <div className="w-64 bg-[#1e1e2e] border-r border-[#2d2d4a] flex-shrink-0">
          <NodePalette />
        </div>
      )}

      {/* Flow Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          deleteKeyCode={readOnly ? null : 'Delete'}
          style={{ background: '#0f0f17' }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#2d2d4a"
          />
          <Controls
            style={{ background: '#1e1e2e', borderRadius: 8 }}
          />

          {/* Toolbar Panel */}
          {!readOnly && (
            <Panel position="top-right">
              <FlowToolbar
                onSave={handleSave}
                onClear={() => {
                  setNodes([]);
                  setEdges([]);
                }}
              />
            </Panel>
          )}
        </ReactFlow>

        {/* Empty State */}
        {nodes.length === 0 && !readOnly && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-6xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Start Building Your Flow
              </h3>
              <p className="text-gray-400 max-w-md">
                Drag nodes from the left panel and drop them here to create
                your automation flow.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Config Modal */}
      {showConfig && selectedNode && (
        <NodeConfigModal
          node={selectedNode}
          onClose={() => {
            setShowConfig(false);
            setSelectedNode(null);
          }}
          onSave={onNodeUpdate}
          onDelete={() => onDeleteNode(selectedNode.id)}
        />
      )}
    </div>
  );
}

function getDefaultLabel(type: string): string {
  const labels: Record<string, string> = {
    trigger: 'Trigger',
    message: 'Send Message',
    ai_agent: 'AI Agent',
    condition: 'Condition',
    delay: 'Delay',
    action: 'Update Contact',
    end: 'End',
    check_follow_status: 'Check Follow Status',
  };
  return labels[type] || type;
}

function getDefaultData(type: string): Record<string, unknown> {
  switch (type) {
    case 'trigger':
      return { triggerType: 'keyword', keywords: [], excludeWords: [] };
    case 'message':
      return { content: '', mediaUrl: '', quickReplies: [] };
    case 'ai_agent':
      return { niche: 'default', temperature: 0.7, maxTokens: 150 };
    case 'condition':
      return { conditions: [], logic: 'all' };
    case 'delay':
      return { delayMs: 5000 };
    case 'action':
      return { field: '', value: '' };
    case 'check_follow_status':
      return {
        followMessage: 'Hey! Thanks for your interest! Please follow us first to get access to the exclusive video 🎥',
        videoMessage: 'Thanks for following! Here is your exclusive video link 🎉',
        videoLink: '',
      };
    default:
      return {};
  }
}
