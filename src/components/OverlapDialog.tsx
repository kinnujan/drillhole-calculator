import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box
} from '@mui/material';
import { LogEntry, OverlapResult } from '../types';

interface OverlapDialogProps {
  open: boolean;
  onClose: () => void;
  newEntry: LogEntry | null;
  overlapResult: OverlapResult | null;
  onConfirm: (action: 'split' | 'replace' | 'adjust' | 'cancel') => void;
}

const OverlapDialog: React.FC<OverlapDialogProps> = ({
  open,
  onClose,
  newEntry,
  overlapResult,
  onConfirm
}) => {
  const getOverlapDetails = () => {
    if (!newEntry || !overlapResult || !overlapResult.overlappingEntries.length) {
      return { message: '', canSplit: false, actionText: '', options: [] };
    }

    const existingEntry = overlapResult.overlappingEntries[0];
    switch (overlapResult.type) {
      case 'contains':
        return {
          message: `The existing interval (${existingEntry.from} to ${existingEntry.to}) completely contains your new interval (${newEntry.from} to ${newEntry.to}).`,
          canSplit: true,
          actionText: 'Would you like to:',
          options: [
            'Split the existing interval'
          ]
        };
      case 'contained':
        return {
          message: `Your new interval (${newEntry.from} to ${newEntry.to}) completely contains the existing interval (${existingEntry.from} to ${existingEntry.to}).`,
          canSplit: false,
          actionText: 'Do you want to:',
          options: [
            'Replace the existing interval with the new one',
            'Keep the existing interval and adjust the new one'
          ]
        };
      case 'partial':
        const isStartOverlap = newEntry.from < existingEntry.from;
        const newAdjustedRange = isStartOverlap 
          ? `${newEntry.from} to ${existingEntry.from}` 
          : `${existingEntry.to} to ${newEntry.to}`;
        
        return {
          message: `Your new interval (${newEntry.from} to ${newEntry.to}) ${isStartOverlap ? 'overlaps the start' : 'overlaps the end'} of the existing interval (${existingEntry.from} to ${existingEntry.to}).`,
          canSplit: false,
          actionText: 'Choose an option:',
          options: [
            'Replace the overlapping portion',
            `Adjust the new interval to ${newAdjustedRange}`
          ]
        };
      default:
        return {
          message: 'An overlap was detected with existing intervals.',
          canSplit: false,
          actionText: '',
          options: []
        };
    }
  };

  const handleClose = () => {
    onConfirm('cancel');
    onClose();
  };

  const handleAction = (index: number) => {
    if (!overlapResult) return;
    
    switch (overlapResult.type) {
      case 'contains':
        if (index === 0) onConfirm('split');
        break;
      case 'contained':
        if (index === 0) onConfirm('replace');
        else onConfirm('adjust');
        break;
      case 'partial':
        if (index === 0) onConfirm('replace');
        else onConfirm('adjust');
        break;
    }
    onClose();
  };

  // Don't render dialog content if required props are null
  const showContent = newEntry && overlapResult && overlapResult.overlappingEntries.length > 0;
  const overlapDetails = getOverlapDetails();

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        Interval Overlap Detected
      </DialogTitle>
      {showContent ? (
        <>
          <DialogContent>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {overlapDetails.message}
              </Typography>
              {overlapDetails.actionText && (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {overlapDetails.actionText}
                  </Typography>
                  <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                    {overlapDetails.options.map((option, index) => (
                      <Typography
                        key={index}
                        component="li"
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 0.5 }}
                      >
                        {option}
                      </Typography>
                    ))}
                  </Box>
                </>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleClose} color="inherit">
              Cancel
            </Button>
            {overlapDetails.options.map((option, index) => (
              <Button
                key={index}
                onClick={() => handleAction(index)}
                variant="contained"
                color="primary"
                sx={{ ml: 1 }}
              >
                {index === 0 ? "Split" : index === 1 ? "Replace" : "Adjust"}
              </Button>
            ))}
          </DialogActions>
        </>
      ) : (
        <DialogContent>
          <Typography variant="body1" color="error">
            Error: Invalid overlap data. Please try again.
          </Typography>
          <DialogActions sx={{ px: 3, pb: 2, mt: 2 }}>
            <Button onClick={handleClose} color="primary">
              Close
            </Button>
          </DialogActions>
        </DialogContent>
      )}
    </Dialog>
  );
};

export default OverlapDialog;
