import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, useTheme } from '@mui/material';
import { LogEntry } from '../types';
import csvService from '../services/CSVService';

interface StripLogProps {
  entries: LogEntry[];
  height?: number;
  width?: number;
}

const StripLog: React.FC<StripLogProps> = ({ entries, height = 600, width = 120 }) => {
  const theme = useTheme();
  
  useEffect(() => {
    // Load configuration on mount
    const loadConfig = async () => {
      try {
        await csvService.loadConfiguration();
      } catch (error) {
        console.error('Error loading configuration:', error);
      }
    };
    loadConfig();
  }, []);

  // Sort entries by depth
  const sortedEntries = [...entries].sort((a, b) => a.from - b.from);
  
  // Find min and max depths
  const minDepth = Math.min(...entries.map(e => e.from));
  const maxDepth = Math.max(...entries.map(e => e.to));
  const totalDepth = maxDepth - minDepth;

  // Function to convert depth to Y position
  const depthToY = (depth: number) => {
    return ((depth - minDepth) / totalDepth) * height;
  };

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        width: width, 
        height: height,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: theme.palette.background.default,
        border: `1px solid ${theme.palette.divider}`
      }}
    >
      {/* Depth scale */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 40,
          borderRight: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper,
        }}
      >
        {Array.from({ length: 11 }, (_, i) => (
          <Typography
            key={i}
            variant="caption"
            sx={{
              position: 'absolute',
              left: 2,
              top: `${(i * 10)}%`,
              fontSize: '0.7rem',
            }}
          >
            {(minDepth + (totalDepth * i / 10)).toFixed(1)}
          </Typography>
        ))}
      </Box>

      {/* Intervals */}
      <Box sx={{ marginLeft: '40px', height: '100%', position: 'relative' }}>
        {sortedEntries.map((entry, index) => {
          const lithStyle = csvService.getFieldStyle('lithology', entry.lithology);
          const textureStyle = csvService.getFieldStyle('texture', entry.texture);
          const mineralizedStyle = csvService.getFieldStyle('mineralized', entry.mineralized);
          
          const top = depthToY(entry.from);
          const height = depthToY(entry.to) - depthToY(entry.from);

          return (
            <Box
              key={index}
              sx={{
                position: 'absolute',
                top: top,
                left: 0,
                right: 0,
                height: height,
                backgroundColor: lithStyle.color || theme.palette.grey[300],
                borderTop: `1px solid ${theme.palette.divider}`,
                borderBottom: `1px solid ${theme.palette.divider}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                '&:hover': {
                  outline: `2px solid ${theme.palette.primary.main}`,
                  zIndex: 1,
                }
              }}
            >
              {textureStyle.icon && (
                <Typography
                  sx={{
                    fontSize: '1rem',
                    color: theme.palette.text.primary,
                    opacity: 0.7,
                  }}
                >
                  {textureStyle.icon}
                </Typography>
              )}
              {mineralizedStyle.color && mineralizedStyle.color !== 'transparent' && (
                <Box
                  sx={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    backgroundColor: mineralizedStyle.color,
                  }}
                />
              )}
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
};

export default StripLog;
