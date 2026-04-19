"use client";

import { useEffect, useState } from 'react';
import { ReactFlow, ReactFlowProvider, Background, Controls, Node, Edge, Position, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const nodeStyle = {
  background: '#0f172a',
  color: '#e2e8f0',
  border: '1px solid #1e293b',
  borderRadius: '8px',
  padding: '12px 16px',
  fontSize: '12px',
  fontFamily: 'monospace',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
  width: 180,
  textAlign: 'center' as const,
};

const initialNodes: Node[] = [
  {
    id: 'supplier',
    data: { label: '🧊 Port Klang\n(Cold Storage)' },
    position: { x: 50, y: 150 },
    style: { ...nodeStyle, borderLeft: '4px solid #3b82f6' }, // blue
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },
  {
    id: 'carrier',
    data: { label: '🚛 Delivery Van 2\n(In Transit)' },
    position: { x: 350, y: 150 },
    style: { ...nodeStyle, borderLeft: '4px solid #3b82f6' },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },
  {
    id: 'warehouse',
    data: { label: '🏪 FSKTM Cafe\n(Destination)' },
    position: { x: 650, y: 150 },
    style: { ...nodeStyle, borderLeft: '4px solid #10b981' }, // green
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e-supp-carr',
    source: 'supplier',
    target: 'carrier',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#3b82f6', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
  },
  {
    id: 'e-carr-ware',
    source: 'carrier',
    target: 'warehouse',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#3b82f6', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
  },
];

interface LogisticsMapProps {
  insight: any | null;
  executedOption: string | null;
}

function MapLogic({ insight, executedOption }: LogisticsMapProps) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  useEffect(() => {
    if (executedOption) {
      if (executedOption === "B") {
        // Option B: Secondary Chiller Truck
        setNodes((nds) => [...nds.map(n => 
          n.id === 'carrier' 
            ? { ...n, style: { ...nodeStyle, opacity: 0.5, borderLeft: '4px solid #ef4444' } } 
            : n
        ), {
          id: 'truck-2',
          data: { label: '🚨 Rescue Chiller Truck\n(Expedited)' },
          position: { x: 350, y: 20 },
          style: { ...nodeStyle, borderLeft: '4px solid #f59e0b', background: '#381c00' }, // Amber
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        }]);

        setEdges([
          {
            id: 'e-supp-rescue',
            source: 'supplier',
            target: 'truck-2',
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#f59e0b', strokeWidth: 3, strokeDasharray: '5 5' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
          },
          {
            id: 'e-rescue-ware',
            source: 'truck-2',
            target: 'warehouse',
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#f59e0b', strokeWidth: 3, strokeDasharray: '5 5' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
          },
          {
            id: 'e-supp-carr', source: 'supplier', target: 'carrier', type: 'smoothstep', animated: false,
            style: { stroke: '#ef4444', strokeWidth: 2, opacity: 0.3 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
          },
          {
            id: 'e-carr-ware', source: 'carrier', target: 'warehouse', type: 'smoothstep', animated: false,
            style: { stroke: '#ef4444', strokeWidth: 2, opacity: 0.3 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
          }
        ]);
        
      } else if (executedOption === "C") {
          // Option C: Flash Sale to Subang Grocer
          setNodes((nds) => [...nds, {
            id: 'grocer',
            data: { label: '🛒 Subang Grocer\n(Flash Sale)' },
            position: { x: 650, y: 280 },
            style: { ...nodeStyle, borderLeft: '4px solid #8b5cf6', background: '#1e1b4b' }, // Violet
            targetPosition: Position.Left,
          }].map(n => {
             if (n.id === 'warehouse') return { ...n, style: { ...nodeStyle, opacity: 0.4 }, data: { label: '🏪 FSKTM Cafe\n(DROPPED)' } };
             if (n.id === 'carrier') return { ...n, style: { ...nodeStyle, borderLeft: '4px solid #8b5cf6' }};
             return n;
          }));

          setEdges([
            {
              id: 'e-supp-carr', source: 'supplier', target: 'carrier', type: 'smoothstep', animated: false, style: { stroke: '#3b82f6', strokeWidth: 2 }
            },
            {
              id: 'e-carr-grocer', source: 'carrier', target: 'grocer', type: 'smoothstep', animated: true,
              style: { stroke: '#8b5cf6', strokeWidth: 3 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
            },
            {
              id: 'e-carr-ware', source: 'carrier', target: 'warehouse', type: 'smoothstep', animated: false,
              style: { stroke: '#ef4444', strokeWidth: 2, opacity: 0.3 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
            }
          ]);
      }

    } else if (insight) {
      setEdges((eds) =>
        eds.map((e) => {
          if (e.id === 'e-carr-ware') {
            return {
              ...e, animated: false, style: { stroke: '#ef4444', strokeWidth: 3 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
            };
          }
          if (e.id === 'e-supp-carr') {
            return { ...e, animated: false, style: { stroke: '#ef4444', strokeWidth: 3 } };
          }
          return e;
        })
      );
      
      setNodes((nds) => 
        nds.map((n) => {
          if (n.id === 'carrier') {
            return { 
              ...n, 
              style: { ...nodeStyle, borderLeft: '4px solid #ef4444', background: '#450a0a' },
              data: { label: '🌡️ Delivery Van 2\n(A/C BROKEN + FLOOD)' }
            };
          }
          if (n.id === 'warehouse') {
             return { ...n, style: { ...nodeStyle, borderLeft: '4px solid #ef4444' }, data: { label: '⚠️ FSKTM Cafe\n(AT RISK)' } };
          }
          return n;
        })
      );
    } else {
       setNodes(initialNodes);
       setEdges(initialEdges);
    }
  }, [insight, executedOption]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      className="bg-[#0a0a0f]"
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#1e293b" gap={16} size={1} />
      <Controls className="bg-slate-900 border-slate-700 fill-slate-300 shadow-lg" showInteractive={false} />
    </ReactFlow>
  );
}

export default function LogisticsMap(props: LogisticsMapProps) {
  return (
    <ReactFlowProvider>
      <MapLogic {...props} />
    </ReactFlowProvider>
  );
}
