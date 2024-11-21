import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import DatabaseService from '../services/DatabaseService';
import { LogEntry } from '../types';

interface DrillholeSelectorProps {
  onDrillholeSelect: (drillholeId: string) => void;
}

const DrillholeSelector: React.FC<DrillholeSelectorProps> = ({ onDrillholeSelect }) => {
  const [drillholes, setDrillholes] = useState<string[]>([]);
  const [newDrillholeDialogOpen, setNewDrillholeDialogOpen] = useState(false);
  const [newDrillholeId, setNewDrillholeId] = useState('');

  useEffect(() => {
    loadDrillholes();
  }, []);

  const loadDrillholes = async () => {
    try {
      const dbService = DatabaseService.getInstance();
      const entries = await dbService.getAllEntries();
      const uniqueDrillholes = [...new Set(entries.map(entry => entry.drillhole_id))];
      setDrillholes(uniqueDrillholes);
    } catch (error) {
      console.error('Error loading drillholes:', error);
    }
  };

  const handleCreateNewDrillhole = () => {
    if (!newDrillholeId.trim()) return;
    onDrillholeSelect(newDrillholeId.trim());
    setNewDrillholeDialogOpen(false);
    setNewDrillholeId('');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Drillhole Selection
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setNewDrillholeDialogOpen(true)}
        >
          Create New Drillhole
        </Button>
      </Box>

      <Grid container spacing={3}>
        {drillholes.map((drillholeId) => (
          <Grid item xs={12} sm={6} md={4} key={drillholeId}>
            <Card
              sx={{
                cursor: 'pointer',
                '&:hover': {
                  boxShadow: 6,
                },
              }}
              onClick={() => onDrillholeSelect(drillholeId)}
            >
              <CardContent>
                <Typography variant="h6" component="div">
                  {drillholeId}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={newDrillholeDialogOpen} onClose={() => setNewDrillholeDialogOpen(false)}>
        <DialogTitle>Create New Drillhole</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Drillhole ID"
            type="text"
            fullWidth
            value={newDrillholeId}
            onChange={(e) => setNewDrillholeId(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewDrillholeDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateNewDrillhole} variant="contained" color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DrillholeSelector;
