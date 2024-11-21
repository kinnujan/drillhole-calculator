import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { DatabaseService } from '../services/DatabaseService';
import { HoleView } from '../components/HoleView';

export const MainPage: React.FC = () => {
  const [holes, setHoles] = useState<string[]>([]);
  const [selectedHole, setSelectedHole] = useState<string | null>(null);
  const [newHoleDialogOpen, setNewHoleDialogOpen] = useState(false);
  const [newHoleName, setNewHoleName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHoles();
  }, []);

  const loadHoles = async () => {
    try {
      const dbService = DatabaseService.getInstance();
      const entries = await dbService.getAllEntries();
      const uniqueHoles = [...new Set(entries.map((entry) => entry.holeid))];
      setHoles(uniqueHoles.sort());
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load holes');
    }
  };

  const handleNewHole = () => {
    if (!newHoleName.trim()) {
      setError('Hole name cannot be empty');
      return;
    }

    if (holes.includes(newHoleName)) {
      setError('Hole already exists');
      return;
    }

    setSelectedHole(newHoleName);
    setHoles((prev) => [...prev, newHoleName].sort());
    setNewHoleDialogOpen(false);
    setNewHoleName('');
    setError(null);
  };

  const handleDeleteHole = async (holeid: string) => {
    if (!window.confirm('Are you sure you want to delete this hole and all its entries?')) {
      return;
    }

    try {
      const dbService = DatabaseService.getInstance();
      const entries = await dbService.getEntriesByHole(holeid);
      
      // Delete all entries for the hole
      await Promise.all(entries.map((entry) => dbService.deleteEntry(entry.id)));
      
      setHoles((prev) => prev.filter((h) => h !== holeid));
      if (selectedHole === holeid) {
        setSelectedHole(null);
      }
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete hole');
    }
  };

  return (
    <Container maxWidth="lg" className="py-8">
      <div className="flex gap-8">
        <Paper className="w-64 p-4">
          <div className="flex justify-between items-center mb-4">
            <Typography variant="h6" component="h2">
              Holes
            </Typography>
            <IconButton
              size="small"
              onClick={() => setNewHoleDialogOpen(true)}
              title="Add Hole"
            >
              <Add />
            </IconButton>
          </div>

          {error && <Alert severity="error" className="mb-4">{error}</Alert>}

          <List>
            {holes.map((hole) => (
              <ListItem
                key={hole}
                button
                selected={selectedHole === hole}
                onClick={() => setSelectedHole(hole)}
              >
                <ListItemText primary={hole} />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => handleDeleteHole(hole)}
                  >
                    <Delete />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>

        <div className="flex-1">
          {selectedHole ? (
            <HoleView holeid={selectedHole} />
          ) : (
            <Paper className="p-8 text-center">
              <Typography variant="h6" color="textSecondary">
                Select a hole or create a new one to start logging
              </Typography>
            </Paper>
          )}
        </div>
      </div>

      <Dialog
        open={newHoleDialogOpen}
        onClose={() => setNewHoleDialogOpen(false)}
      >
        <DialogTitle>New Hole</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Hole Name"
            fullWidth
            value={newHoleName}
            onChange={(e) => setNewHoleName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleNewHole();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewHoleDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleNewHole} variant="contained" color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
