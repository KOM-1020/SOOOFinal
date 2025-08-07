# TCA Schedule Optimizer - Local Deployment Guide

## Overview
A comprehensive web application for visualizing and comparing optimized vs unoptimized cleaning schedules for franchise operations. The system displays statistical analysis, travel time comparisons, route visualization, and constraint compliance.

## Prerequisites
- Node.js 18+ 
- npm or yarn package manager
- PostgreSQL database (optional - uses in-memory storage by default)

## Quick Start

1. **Extract the project files**
   ```bash
   tar -xzf tca-schedule-optimizer.tar.gz
   cd tca-schedule-optimizer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the application**
   ```bash
   npm run dev
   ```

4. **Access the application**
   Open your browser and navigate to: `http://localhost:5000`

## Features
- **Statistics & Analysis** (Default landing page): Travel time comparisons, time shift distributions, daily slots analysis
- **Schedule Comparison**: Dual calendar view with optimized vs unoptimized schedules
- **Interactive Maps**: Individual team route visualization with customer details
- **Real-time Data**: Authentic CSV data processing and dynamic statistics

## Project Structure
```
├── client/          # React frontend application
├── server/          # Express.js backend API
├── shared/          # Shared TypeScript schemas
├── package.json     # Dependencies and scripts
└── README.md        # This file
```

## Data Loading
The application includes sample CSV data for franchise 372. To load your own data:
1. Navigate to the Statistics & Analysis tab
2. Use the CSV upload functionality
3. Data will be processed and visualized automatically

## Technical Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, Node.js
- **Charts**: Recharts for data visualization
- **Maps**: Leaflet.js for route visualization
- **Database**: PostgreSQL with Drizzle ORM (optional)

## Configuration
- Default port: 5000
- Environment: Development mode
- Storage: In-memory (no database setup required)

## Troubleshooting
- Ensure Node.js 18+ is installed
- Check that port 5000 is available
- Run `npm install` if dependencies are missing
- Contact support if data loading issues occur

## Color Scheme
- Primary: #00365b (Dark Blue)
- Secondary: #00abbd (Teal)
- Hover States: #BFBFBF (Light Gray)