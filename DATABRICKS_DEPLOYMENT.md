# TCA Schedule Optimizer - Databricks App Deployment Guide

## Overview
Deploy your TCA Schedule Optimizer as a Databricks App to run securely within your Databricks environment with built-in authentication and scaling.

## Prerequisites

### Databricks Workspace Requirements
- **Workspace Tier**: Premium or Plus (Standard not supported)
- **Databricks Runtime**: 13.0 or higher
- **Permissions**: Admin or Can Manage Apps permission
- **Databricks CLI**: Installed and configured

### Local Development Requirements
- Node.js 18+
- Databricks CLI installed
- Access to your Databricks workspace

## Step-by-Step Deployment

### 1. Prepare Your Application

First, extract and prepare your application:

```bash
# Extract the application
tar -xzf tca-schedule-optimizer.tar.gz
cd tca-schedule-optimizer

# Install dependencies
npm install

# Create production build
npm run build
```

### 2. Install Databricks CLI

```bash
# Install Databricks CLI
pip install databricks-cli

# Configure authentication
databricks configure --token
# Enter your workspace URL and personal access token
```

### 3. Modify package.json for Databricks

Update your `package.json` to include a production start script:

```json
{
  "scripts": {
    "start": "node server/index.js",
    "build": "cd client && npm run build",
    "dev": "NODE_ENV=development tsx server/index.ts"
  }
}
```

### 4. Create Databricks App Configuration

The `app.yaml` file is already configured for your application with:
- Node.js environment setup
- Production port configuration (8080)
- SQL warehouse resource access
- Application metadata

### 5. Deploy to Databricks

#### Option A: Using Databricks CLI

```bash
# Deploy the application
databricks apps create tca-schedule-optimizer

# Upload application files
databricks workspace upload-dir . /Workspace/Apps/tca-schedule-optimizer

# Deploy the app
databricks apps deploy tca-schedule-optimizer --source-path .
```

#### Option B: Using Databricks Workspace UI

1. **Access Databricks Workspace**
   - Log into your Databricks workspace
   - Navigate to "Compute" → "Apps"

2. **Create New App**
   - Click "Create App"
   - Choose "Upload from local files"
   - Upload your application folder

3. **Configure App Settings**
   - App Name: `tca-schedule-optimizer`
   - Display Name: `TCA Schedule Optimizer`
   - Description: `Schedule optimization dashboard for franchise operations`

4. **Set Environment Variables**
   - NODE_ENV: `production`
   - PORT: `8080`

5. **Deploy**
   - Click "Deploy App"
   - Wait for deployment completion

### 6. Access Your Deployed App

Once deployed, your app will be available at:
```
https://<your-workspace-url>/apps/tca-schedule-optimizer
```

## Application Architecture in Databricks

### Frontend-Backend Structure
```
Databricks App Environment
├── Static React Files (served by Express)
├── Express.js API Server
├── In-Memory Data Storage
└── Built-in Databricks Authentication
```

### Security Features
- **Built-in SSO**: Automatic integration with your Databricks workspace authentication
- **Unity Catalog Integration**: Secure data access using existing permissions
- **Network Isolation**: Apps run within your Databricks environment
- **Audit Logging**: Built-in logging for compliance and monitoring

## Integrating with Databricks Data Sources

### Connect to Databricks SQL Warehouses

To connect your app to Databricks data sources, modify `server/index.ts`:

```typescript
// Add Databricks SQL Driver
import { DBSQLClient } from '@databricks/sql';

// Initialize Databricks connection
const client = new DBSQLClient();
const connectionParams = {
  host: process.env.DATABRICKS_SERVER_HOSTNAME,
  path: process.env.DATABRICKS_HTTP_PATH,
  token: process.env.DATABRICKS_TOKEN
};

// Add API endpoint for Databricks data
app.get('/api/databricks/query', async (req, res) => {
  try {
    await client.connect(connectionParams);
    const session = await client.openSession();
    const queryOperation = await session.executeStatement(req.query.sql);
    const result = await queryOperation.fetchAll();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Environment Variables Available
Databricks automatically provides these environment variables:
- `DATABRICKS_HOST`: Your workspace URL
- `DATABRICKS_TOKEN`: Authentication token
- `DATABRICKS_SERVER_HOSTNAME`: SQL warehouse hostname
- `DATABRICKS_HTTP_PATH`: SQL warehouse HTTP path

## Production Considerations

### Performance Optimization
- **Static File Serving**: React build files served efficiently by Express
- **Auto-scaling**: Databricks Apps automatically scale based on demand
- **Caching**: Implement Redis or in-memory caching for frequently accessed data
- **CDN**: Databricks provides CDN for static assets

### Monitoring and Logging
```typescript
// Add logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Application error:', error);
  res.status(500).json({ error: 'Internal server error' });
});
```

### Data Security
- Use environment variables for sensitive data
- Implement proper error handling to avoid data leaks
- Leverage Unity Catalog for data governance
- Regular security updates for dependencies

## Troubleshooting

### Common Issues

**1. App Won't Start**
```bash
# Check logs
databricks apps logs tca-schedule-optimizer

# Verify package.json start script
npm start
```

**2. Static Files Not Loading**
- Ensure React build is created: `npm run build`
- Check Express static file serving configuration
- Verify file paths in `server/index.ts`

**3. Authentication Issues**
- Verify workspace permissions
- Check if user has "Can Manage Apps" permission
- Ensure workspace is Premium/Plus tier

**4. Performance Issues**
- Monitor app logs for errors
- Check SQL warehouse performance
- Optimize database queries
- Implement caching strategies

### Support Resources
- **Databricks Documentation**: [docs.databricks.com/apps](https://docs.databricks.com/apps)
- **Community Forum**: [community.databricks.com](https://community.databricks.com)
- **Databricks SQL Driver**: [docs.databricks.com/dev-tools/nodejs-sql-driver](https://docs.databricks.com/dev-tools/nodejs-sql-driver)

## App Features in Databricks Environment

Your TCA Schedule Optimizer will have these features when deployed:

### Statistics & Analysis
- Real-time travel time comparisons
- Time shift distribution analysis
- Daily slots performance metrics
- Interactive chart visualizations

### Schedule Comparison
- Dual calendar views (optimized vs unoptimized)
- Team-based schedule grouping
- Day selection and filtering
- Route optimization visualization

### Data Integration
- CSV data processing capabilities
- Statistical calculations and analysis
- Route mapping with Leaflet.js
- Real-time updates and refresh

### Built-in Security
- Automatic user authentication via Databricks SSO
- Secure data access through Unity Catalog
- Network isolation within Databricks environment
- Comprehensive audit logging

## Next Steps

1. **Deploy the app** using the steps above
2. **Test functionality** in the Databricks environment
3. **Configure data sources** if needed
4. **Set up monitoring** and logging
5. **Train users** on accessing the app
6. **Plan maintenance** and updates

Your TCA Schedule Optimizer is now ready for enterprise deployment in Databricks with full security, scalability, and integration capabilities.