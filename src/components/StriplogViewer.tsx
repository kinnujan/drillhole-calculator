import React, { useEffect, useRef, useState } from 'react';
import { Paper } from '@mui/material';
import { LogEntry } from '../models/LogEntry';
import { ConfigService } from '../services/ConfigService';

interface StriplogViewerProps {
  entries: LogEntry[];
  onIntervalClick?: (entry: LogEntry) => void;
  width?: number;
  height?: number;
}

interface DrawingContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  scale: number;
  minDepth: number;
  maxDepth: number;
}

export const StriplogViewer: React.FC<StriplogViewerProps> = ({
  entries,
  onIntervalClick,
  width = 200,
  height = 600,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [context, setContext] = useState<DrawingContext | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with device pixel ratio for sharp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Calculate depth range
    const depths = entries.flatMap(entry => [entry.from, entry.to]);
    const minDepth = Math.min(...depths, 0);
    const maxDepth = Math.max(...depths, 100);
    const scale = (height - 40) / (maxDepth - minDepth); // Leave margin for labels

    setContext({
      canvas,
      ctx,
      width,
      height,
      scale,
      minDepth,
      maxDepth,
    });
  }, [width, height, entries]);

  useEffect(() => {
    if (!context) return;
    const { ctx, width, height, scale, minDepth } = context;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw depth scale
    ctx.fillStyle = '#000';
    ctx.textAlign = 'right';
    ctx.font = '12px Arial';

    const depthInterval = calculateDepthInterval(context.maxDepth - context.minDepth);
    for (let depth = Math.ceil(minDepth); depth <= context.maxDepth; depth += depthInterval) {
      const y = 20 + (depth - minDepth) * scale;
      ctx.fillText(depth.toString(), 30, y);
      ctx.beginPath();
      ctx.moveTo(35, y);
      ctx.lineTo(40, y);
      ctx.stroke();
    }

    // Draw intervals
    const columnWidth = width - 50;
    entries.forEach((entry, index) => {
      const y1 = 20 + (entry.from - minDepth) * scale;
      const y2 = 20 + (entry.to - minDepth) * scale;
      
      // Generate a color based on the entry's properties
      const color = generateIntervalColor(entry);
      
      ctx.fillStyle = color;
      ctx.fillRect(50, y1, columnWidth, y2 - y1);
      
      // Draw border
      ctx.strokeStyle = '#000';
      ctx.strokeRect(50, y1, columnWidth, y2 - y1);
    });

  }, [entries, context]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!context || !onIntervalClick) return;

    const rect = context.canvas.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const clickDepth = (y - 20) / context.scale + context.minDepth;

    const clickedEntry = entries.find(
      entry => clickDepth >= entry.from && clickDepth <= entry.to
    );

    if (clickedEntry) {
      onIntervalClick(clickedEntry);
    }
  };

  const calculateDepthInterval = (depthRange: number): number => {
    const targetIntervals = 10;
    const rawInterval = depthRange / targetIntervals;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawInterval)));
    const normalized = rawInterval / magnitude;
    
    if (normalized < 2) return magnitude;
    if (normalized < 5) return 2 * magnitude;
    return 5 * magnitude;
  };

  const generateIntervalColor = (entry: LogEntry): string => {
    const configService = ConfigService.getInstance();
    const fields = configService.getFields();
    
    // Try to find a domain field to use for coloring
    const domainField = fields.find(f => f.type === 'domain' && entry.fields[f.name]);
    if (domainField && domainField.domain) {
      const value = entry.fields[domainField.name];
      const index = domainField.domain.indexOf(value);
      const hue = (index * 137.5) % 360; // Golden angle for good color distribution
      return `hsl(${hue}, 70%, 85%)`;
    }
    
    // Fallback color
    return '#f0f0f0';
  };

  return (
    <Paper
      elevation={2}
      className="p-2"
      style={{ width: width + 4, height: height + 4 }}
    >
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{ cursor: onIntervalClick ? 'pointer' : 'default' }}
      />
    </Paper>
  );
};
