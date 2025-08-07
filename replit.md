# TCA Schedule Optimizer Dashboard

## Overview

A comprehensive web application for visualizing and comparing optimized vs unoptimized cleaning schedules for franchise operations. The system displays statistical analysis, travel time comparisons, route visualization, and constraint compliance for franchise 372 during the week of July 7-13, 2025. Built as a full-stack TypeScript application with React frontend and Express backend, designed to present the results of a travel-optimized cleaning scheduler that uses geographic clustering and team capacity management.

**Status**: Fully functional with authentic CSV data integration, complete 6-column team grid (Teams 0-16), dual schedule comparison, detailed customer information display with real addresses and timing data, interactive individual team route maps with numbered stops and route visualization, left-side vertical navigation with fixed-height schedule blocks and proper scrolling behavior to prevent layout shifts. **Deployment**: Complete local installation package created (tca-schedule-optimizer-local.tar.gz) with automated setup scripts for Windows/Mac/Linux. Includes standalone HTML version and full Node.js application.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite for development and build tooling
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent design system
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Charts**: Recharts library for data visualization (travel time charts, time shift distributions, daily slots comparisons)
- **Component Structure**: Modular component architecture with left-side vertical navigation and fixed-height layout blocks
- **UI Components**: Comprehensive shadcn/ui component system including cards, tabs, badges, charts, calendars, and maps
- **Layout System**: Fixed-height containers (500px) with overflow scrolling to prevent block shifting and maintain consistent positioning

### Backend Architecture
- **Framework**: Express.js with TypeScript for REST API endpoints
- **Development Server**: Vite integration for hot module replacement in development
- **Storage Layer**: Abstract storage interface with in-memory implementation (MemStorage)
- **Route Structure**: RESTful API design with endpoints for team availability and optimized schedules
- **Middleware**: JSON parsing, URL encoding, request logging with timing metrics
- **Error Handling**: Centralized error handling with proper HTTP status codes

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Design**: Structured tables for users, team availability, and optimized schedules
- **Connection**: Neon serverless PostgreSQL for cloud database hosting
- **Migrations**: Drizzle Kit for database schema management and migrations
- **Type Safety**: Zod schemas for runtime validation and TypeScript integration

### Authentication and Authorization
- **Session Management**: PostgreSQL session storage with connect-pg-simple
- **User Schema**: Basic username/password authentication system
- **Security**: Password hashing and session-based authentication (infrastructure in place)

### Data Processing and Visualization
- **CSV Processing**: Client-side CSV parsing for team availability and schedule data
- **Statistics Calculation**: Real-time calculation of travel time savings, daily performance metrics
- **Chart Generation**: Interactive charts for travel time comparison, time shift distributions, and daily slot analysis
- **Calendar Integration**: Custom calendar components for schedule visualization
- **Map Integration**: Full Leaflet route visualization with individual team maps showing numbered customer stops, route lines, franchise office, and interactive popups with customer details

### Application Features
- **Dashboard Interface**: Tabbed interface separating statistics and schedule views
- **Statistics Tab**: Configuration settings, travel time comparisons, time shift analysis, daily slots comparison, constraints compliance
- **Schedule Tab**: Dual calendar view (optimized vs unoptimized), day selection, team-based schedule grouping, route maps
- **Data Import**: CSV file processing for franchise data, customer profiles, team availability, and optimized schedules
- **Real-time Updates**: Dynamic statistics calculation and chart updates based on loaded data

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18, React DOM, React Query for state management
- **TypeScript**: Full TypeScript support across frontend and backend
- **Vite**: Development server and build tool with React plugin
- **Express.js**: Backend web framework with TypeScript support

### UI and Styling
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Radix UI**: Headless UI components (@radix-ui/react-*) for accessibility
- **shadcn/ui**: Pre-built component library built on Radix UI
- **Lucide React**: Icon library for consistent iconography
- **class-variance-authority**: Type-safe variant handling for components

### Data Visualization
- **Recharts**: React charting library for statistical visualizations
- **date-fns**: Date manipulation and formatting utilities

### Database and ORM
- **PostgreSQL**: Primary database using Neon serverless hosting
- **Drizzle ORM**: Type-safe ORM with PostgreSQL dialect
- **Drizzle Kit**: Database migration and schema management tools
- **Zod**: Schema validation library integrated with Drizzle

### Development Tools
- **tsx**: TypeScript execution for development server
- **esbuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Autoprefixer
- **Replit Integration**: Development environment plugins and error handling

### Session and State Management
- **connect-pg-simple**: PostgreSQL session store for Express sessions
- **wouter**: Lightweight routing library for React
- **React Hook Form**: Form handling with validation (@hookform/resolvers)

### Utility Libraries
- **clsx**: Conditional className utility
- **nanoid**: Unique ID generation
- **cmdk**: Command palette component library