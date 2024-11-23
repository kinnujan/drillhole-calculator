import { writeFileSync } from 'fs';
import { join } from 'path';

export default function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const configPath = join(process.cwd(), 'src', 'assets', 'configuration.csv');
    writeFileSync(configPath, req.body, 'utf-8');
    res.status(200).json({ message: 'Configuration saved successfully' });
  } catch (error) {
    console.error('Error saving configuration:', error);
    res.status(500).json({ message: 'Error saving configuration' });
  }
}
