import express from 'express';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.text());
app.use(cors());

// Endpoint to save configuration
app.post('/api/save-configuration', async (req, res) => {
  try {
    const configPath = join(__dirname, 'src', 'assets', 'configuration.csv');
    await fs.writeFile(configPath, req.body, 'utf8');
    res.status(200).send('Configuration saved successfully');
  } catch (error) {
    console.error('Error saving configuration:', error);
    res.status(500).send('Failed to save configuration');
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
