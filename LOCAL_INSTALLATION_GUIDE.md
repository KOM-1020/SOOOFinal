# TCA Schedule Optimizer - Local Installation Package

## Download & Setup

### 1. Download Package
- Download `tca-schedule-optimizer-local.tar.gz` from this Replit
- This contains the complete application with all 183 customer records

### 2. Extract & Install

**Windows:**
1. Extract the tar.gz file (use 7-Zip or similar)
2. Double-click `start.bat` to automatically setup and run

**Mac/Linux:**
```bash
tar -xzf tca-schedule-optimizer-local.tar.gz
cd tca-schedule-optimizer-local
./start.sh
```

**Manual Setup (all platforms):**
```bash
tar -xzf tca-schedule-optimizer-local.tar.gz
cd tca-schedule-optimizer-local
npm run setup
npm start
```

### 3. Access Application
- Open your web browser
- Go to: **http://localhost:5000**
- Your TCA Schedule Optimizer is now running locally

## What's Included

### Complete Application
- Full React frontend with professional UI
- Express.js backend with all optimization logic
- All 183 authentic customer records from franchise 372
- Interactive Leaflet maps with route visualization
- Statistical analysis charts showing 19.8% efficiency gains

### Features Available
- **Statistics Dashboard**: Travel time analysis, time shift distribution, daily slots comparison
- **Schedule Visualization**: Interactive maps, team schedules, customer locations
- **Team Management**: All 17 teams with workload distribution
- **Data Analysis**: July 7-13, 2025 franchise operations

### Technical Components
- Node.js backend serving on port 5000
- React frontend with Tailwind CSS styling
- CSV data processing for authentic franchise data
- Recharts for statistical visualizations
- Leaflet.js for interactive mapping

## Requirements
- **Node.js 18+** (required)
- **8GB RAM** (recommended)
- **Modern web browser** (Chrome, Firefox, Safari, Edge)

## Troubleshooting

### Port Issues
If port 5000 is busy, the app will automatically try 5001, 5002, etc.

### Installation Problems
```bash
npm run clean
npm run setup
```

### Performance
The application includes all optimization algorithms and runs completely offline after setup.

Your TCA Schedule Optimizer is now ready for local presentation and analysis with full franchise data and professional visualizations.