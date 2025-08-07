import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

// Create a file to stream archive data to
const output = fs.createWriteStream('TCA-Essential-Files.zip');
const archive = archiver('zip', {
  zlib: { level: 9 } // Sets the compression level
});

// Listen for all archive data to be written
output.on('close', function() {
  console.log(`TCA-Essential-Files.zip created successfully!`);
  console.log(`Total size: ${archive.pointer()} bytes`);
});

// Good practice to catch warnings
archive.on('warning', function(err) {
  if (err.code === 'ENOENT') {
    console.warn('Warning:', err);
  } else {
    throw err;
  }
});

// Good practice to catch this error explicitly
archive.on('error', function(err) {
  throw err;
});

// Pipe archive data to the file
archive.pipe(output);

// Essential files to include
const essentialFiles = [
  'package.json',
  'tsconfig.json',
  'vite.config.ts',
  'components.json',
  'postcss.config.js',
  'tailwind.config.ts',
  'vercel.json',
  'replit.md',
  'nixpacks.toml',
  'drizzle.config.ts'
];

// Essential directories to include completely
const essentialDirs = [
  'client',
  'server', 
  'shared'
];

// Essential data files
const essentialDataFiles = [
  'attached_assets/Clean_FranchiseId_372_with_Address_Duration_1754221532976.csv',
  'attached_assets/customer_profiles_1754206598816.csv',
  'attached_assets/franchise_info_1754206598816.csv',
  'attached_assets/master_cleans_1754206598817.csv',
  'attached_assets/team_availability_1754206598817.csv',
  'attached_assets/travel_optimized_schedule_franchise_372_20250801_210849_1754356377288.csv',
  'attached_assets/schedule_with_travel_times_1754356476386.csv',
  'attached_assets/original_with_travel_times_1754356476386.csv',
  'attached_assets/date_shift_authentic.csv'
];

console.log('Creating minimal ZIP with essential files only...');

// Add essential individual files
essentialFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`Adding: ${file}`);
    archive.file(file, { name: file });
  }
});

// Add essential data files
essentialDataFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`Adding: ${file}`);
    archive.file(file, { name: file });
  }
});

// Function to add directory recursively
function addDirectory(dirPath, archivePath = dirPath) {
  if (!fs.existsSync(dirPath)) return;
  
  const items = fs.readdirSync(dirPath);
  
  items.forEach(item => {
    const fullPath = path.join(dirPath, item);
    const archiveItemPath = path.join(archivePath, item);
    
    const stats = fs.statSync(fullPath);
    
    if (stats.isDirectory()) {
      addDirectory(fullPath, archiveItemPath);
    } else {
      console.log(`Adding: ${fullPath}`);
      archive.file(fullPath, { name: archiveItemPath });
    }
  });
}

// Add essential directories
essentialDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    addDirectory(dir);
  }
});

// Finalize the archive
archive.finalize();