import React, { useEffect, useRef, useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { LogEntry, LogEntryField } from '../models/LogEntry';

interface StriplogVisualizationProps {
  entries: LogEntry[];
  fields: LogEntryField[];
  selectedEntry?: string;
  onEntrySelect?: (entryId: string) => void;
  width?: number;
  height?: number;
}

interface ColorMap {
  [key: string]: string;
}

export const StriplogVisualization: React.FC<StriplogVisualizationProps> = ({
  entries,
  fields,
  selectedEntry,
  onEntrySelect,
  width = 200,
  height = 600,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState<number>(1);
  const [colorMaps, setColorMaps] = useState<{ [fieldName: string]: ColorMap }>({});

  // Generate color maps for domain fields
  useEffect(() => {
    const newColorMaps: { [fieldName: string]: ColorMap } = {};
    
    fields.forEach(field => {
      if (field.type === 'domain' && field.domain) {
        const colorMap: ColorMap = {};
        field.domain.forEach((value, index) => {
          // Generate HSL colors with good contrast
          const hue = (index * 137.508) % 360; // Golden angle in degrees
          colorMap[value] = `hsl(${hue}, 70%, 60%)`;
        });
        newColorMaps[field.name] = colorMap;
      }
    });

    setColorMaps(newColorMaps);
  }, [fields]);

  // Calculate scale based on total depth
  useEffect(() => {
    if (entries.length > 0) {
      const maxDepth = Math.max(...entries.map(e => e.to));
      setScale(height / maxDepth);
    }
  }, [entries, height]);

  // Draw the striplog
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw depth scale
    ctx.fillStyle = '#000';
    ctx.textAlign = 'right';
    ctx.font = '12px Arial';

    const depthInterval = 10; // Meters between depth labels
    const maxDepth = Math.max(...entries.map(e => e.to));
    
    for (let depth = 0; depth <= maxDepth; depth += depthInterval) {
      const y = depth * scale;
      ctx.fillText(`${depth}m`, 45, y + 4);
      ctx.beginPath();
      ctx.moveTo(50, y);
      ctx.lineTo(55, y);
      ctx.stroke();
    }

    // Draw entries
    entries.forEach((entry, index) => {
      const y1 = entry.from * scale;
      const y2 = entry.to * scale;
      const height = y2 - y1;

      // Draw interval box
      ctx.beginPath();
      ctx.rect(60, y1, width - 70, height);

      // Color based on first domain field found
      const domainField = fields.find(f => f.type === 'domain');
      if (domainField) {
        const value = entry.fields[domainField.name] as string;
        const colorMap = colorMaps[domainField.name];
        ctx.fillStyle = value && colorMap ? colorMap[value] : '#eee';
      } else {
        ctx.fillStyle = '#eee';
      }

      ctx.fill();
      ctx.strokeStyle = selectedEntry === entry.id ? '#2196f3' : '#000';
      ctx.lineWidth = selectedEntry === entry.id ? 2 : 1;
      ctx.stroke();

      // Draw text labels for important fields
      let textY = y1 + 15;
      fields.forEach(field => {
        const value = entry.fields[field.name];
        if (value && height > 20) { // Only draw if there's enough space
          ctx.fillStyle = '#000';
          ctx.font = '12px Arial';
          ctx.textAlign = 'left';
          ctx.fillText(
            `${field.name}: ${value}`,
            65,
            textY
          );
          textY += 15;
        }
      });
    });
  }, [entries, fields, scale, selectedEntry, width, colorMaps]);

  // Handle click events
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onEntrySelect) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const y = (event.clientY - rect.top) / scale;

    // Find clicked entry
    const clickedEntry = entries.find(entry => y >= entry.from && y <= entry.to);
    if (clickedEntry) {
      onEntrySelect(clickedEntry.id);
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Striplog Visualization
      </Typography>
      <Box sx={{ overflowY: 'auto', maxHeight: '80vh' }}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onClick={handleCanvasClick}
          style={{ cursor: onEntrySelect ? 'pointer' : 'default' }}
        />
      </Box>
      <Box mt={2}>
        <Typography variant="caption" color="textSecondary">
          Click on an interval to select it
        </Typography>
      </Box>
    </Paper>
  );
};
