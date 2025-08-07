// Production startup script to verify file paths
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Production startup check:');
console.log('__dirname:', __dirname);
console.log('Current working directory:', process.cwd());

const distPath = resolve(__dirname, '..', 'dist', 'public');
console.log('Looking for dist path:', distPath);
console.log('Dist path exists:', existsSync(distPath));

const altDistPath = resolve(__dirname, 'public');
console.log('Alternative dist path:', altDistPath);
console.log('Alt dist path exists:', existsSync(altDistPath));

// List available files
const rootFiles = require('fs').readdirSync('.');
console.log('Root directory files:', rootFiles);

if (existsSync('dist')) {
  const distFiles = require('fs').readdirSync('dist');
  console.log('Dist directory files:', distFiles);
}