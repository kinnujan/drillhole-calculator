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
  CircularProgress,
} from '@mui/material';
import databaseService from '../services/DatabaseService';
import { LogEntry } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface DrillholeSelectorProps {
  onDrillholeSelect: (drillholeId: string) => void;
}

const DrillholeSelector: React.FC<DrillholeSelectorProps> = ({ onDrillholeSelect }) => {
  const [drillholes, setDrillholes] = useState<string[]>([]);
  const [newDrillholeDialogOpen, setNewDrillholeDialogOpen] = useState(false);
  const [newDrillholeId, setNewDrillholeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDrillholes();
  }, []);

  const loadDrillholes = async () => {
    try {
      setLoading(true);
      setError(null);
      const entries = await databaseService.getAllEntries();
      const uniqueDrillholes = [...new Set(entries.map(entry => entry.drillhole_id))];
      setDrillholes(uniqueDrillholes);
    } catch (error) {
      console.error('Error loading drillholes:', error);
      setError('Failed to load drillholes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewDrillhole = async () => {
    if (!newDrillholeId.trim()) return;
    
    try {
      // Create an initial entry for the new drillhole with a valid interval
      await databaseService.addEntry({
        id: uuidv4(),
        drillhole_id: newDrillholeId.trim(),
        from: 0,
        to: 1,  
        lithology: '',  
        color: '',
        texture: '',
        minerals: '',
        mineralized: false,
        structures: '',
        notes: '',
        fields: {},
        created: new Date(),
        modified: new Date(),
        synced: false
      });
      
      await loadDrillholes(); // Reload the list
      onDrillholeSelect(newDrillholeId.trim());
      setNewDrillholeDialogOpen(false);
      setNewDrillholeId('');
    } catch (error) {
      console.error('Error creating new drillhole:', error);
      setError('Failed to create new drillhole. Please try again.');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

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

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {drillholes.length === 0 ? (
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', my: 4 }}>
          No drillholes found. Create a new one to get started.
        </Typography>
      ) : (
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
      )}

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
