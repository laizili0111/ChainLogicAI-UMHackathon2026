import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, EdgeProps } from '@xyflow/react';

export default function AnimatedTruckEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      
      {data?.showTruck && (
        <text fontSize="22" y="6" x="-10" style={{ pointerEvents: 'none' }}>
          {data?.truckIcon || "🚛"}
          <animateMotion 
             dur={data?.truckDuration as string || "8s"} 
             repeatCount="indefinite" 
             path={edgePath} 
             rotate="auto" // Optional: makes emoji tilt if path bends, usually fine
          />
        </text>
      )}

      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'none',
              background: (data?.labelBg as string) || '#1e293b',
              padding: '6px 8px',
              borderRadius: '4px',
              border: `1px solid ${(data?.labelBorder as string) || '#334155'}`,
              color: (data?.labelColor as string) || '#cbd5e1',
              fontSize: 10,
              fontWeight: 800,
              fontFamily: 'monospace',
              zIndex: 20
            }}
          >
            {data.label as React.ReactNode}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
