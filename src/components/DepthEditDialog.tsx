import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box
} from '@mui/material';

interface DepthEditDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (newDepth: number) => void;
  currentDepth: number;
  type: 'from' | 'to';
  minDepth?: number;
  maxDepth?: number;
}

const DepthEditDialog: React.FC<DepthEditDialogProps> = ({
  open,
  onClose,
  onConfirm,
  currentDepth,
  type,
  minDepth,
  maxDepth
}) => {
  const [depth, setDepth] = useState<string>(currentDepth.toString());
  const [error, setError] = useState<string>('');

  useEffect(() => {
    setDepth(currentDepth.toString());
    setError('');
  }, [currentDepth, open]);

  const handleDepthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDepth(event.target.value);
    setError('');
  };

  const validateAndConfirm = () => {
    const newDepth = parseFloat(depth);
    
    if (isNaN(newDepth)) {
      setError('Please enter a valid number');
      return;
    }

    onConfirm(newDepth);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      PaperProps={{
        sx: { minWidth: '300px' }
      }}
    >
      <DialogTitle>
        Edit {type === 'from' ? 'From' : 'To'} Depth
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <TextField
            autoFocus
            label="Depth"
            type="text"
            value={depth}
            onChange={handleDepthChange}
            onKeyDown={(e) => e.key === 'Enter' && validateAndConfirm()}
            error={!!error}
            helperText={error}
            fullWidth
            inputProps={{
              inputMode: 'decimal',
              pattern: '[0-9]*\\.?[0-9]*'
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={validateAndConfirm} variant="contained">
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DepthEditDialog;
