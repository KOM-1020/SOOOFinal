#!/usr/bin/env python3

# Secure SSL context configuration
import ssl
# Use secure default SSL context with certificate verification
ssl._create_default_https_context = ssl.create_default_context

"""
TRAVEL-OPTIMIZED CLEANING SCHEDULER FOR FRANCHISE 372
====================================================
Complete system to optimize cleaning schedules by minimizing travel time between jobs.
Implements WEEKLY RE-OPTIMIZATION with TRUE TRAVEL TIME MINIMIZATION.

Uses real geocoding and routing to create efficient team routes.
Respects customer availability, team composition, and operational constraints.

Dependencies: pip install pandas geopy routingpy numpy python-dateutil ortools
"""

# ============================================================================
# OPTIMIZATION CONFIGURATION - CHANGE THESE VALUES
# ============================================================================

# Franchise Selection
TARGET_FRANCHISE_ID = 372          # Mount Prospect
# Available options: 372 (Mount Prospect), 4 (Columbia), 32 (Greater Portland), etc.

# Week Selection (Monday to Sunday)
TARGET_WEEK_START = "2025-07-07"   # Monday of target week (YYYY-MM-DD)
TARGET_WEEK_END = "2025-07-13"     # Sunday of target week (YYYY-MM-DD)

# System Configuration
USE_PRECOMPUTED_MATRICES = True  # Set to False to build matrices from API calls
CLEAN_RAW_DATA = True  # Set to True to clean raw CSV files first
RAW_DATA_FOLDER = "data files"  # Folder containing raw CSV files

# OR-Tools Configuration
USE_ORTOOLS = True  # Set to True to enable OR-Tools, False to use original methods
ORTOOLS_TIME_LIMIT = 300  # 5 minutes timeout for OR-Tools solver

import pandas as pd
import numpy as np
from datetime import datetime, timedelta, time
import os
import sys
from collections import defaultdict
import time as time_module
import traceback
import shutil
import math

# Geocoding and routing - ENABLED based on successful network tests!
from geopy.geocoders import Nominatim, ArcGIS
from geopy.extra.rate_limiter import RateLimiter
import routingpy as rp

# Matrix building imports - ENABLED for live API access
import concurrent.futures
import json
import math
from threading import Lock

# ortools VRP solver
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp
from ortools.sat.python import cp_model

# TCA Data Cleaning Integration
from tca_data_cleaning_csv import clean_tca_data_csv

class OptimizationLogger:
    """Enhanced logging with emojis and colors for terminal output"""
    
    def __init__(self, verbose=True):
        self.verbose = verbose
        self.start_time = time_module.time()
        
    def header(self, message):
        print(f"\n{'='*80}")
        print(f"🚀 {message}")
        print(f"{'='*80}")
        
    def section(self, message):
        print(f"\n📋 {message}")
        print("-" * 60)
        
    def debug(self, message):
        if self.verbose:
            print(f"🔍 DEBUG: {message}")
    
    def info(self, message):
        print(f"📊 INFO: {message}")
        
    def success(self, message):
        print(f"✅ SUCCESS: {message}")
        
    def warning(self, message):
        print(f"⚠️  WARNING: {message}")
        
    def error(self, message):
        print(f"❌ ERROR: {message}")
        
    def progress(self, current, total, message="Processing"):
        if total > 0:
            pct = (current / total) * 100
            bar_length = 40
            filled = int(bar_length * current / total)
            bar = '█' * filled + '░' * (bar_length - filled)
            print(f"\r🔄 {message}: [{bar}] {pct:.1f}% ({current}/{total})", end='', flush=True)
            if current == total:
                print()  # New line when complete

class TravelOptimizedScheduler:
    """Main scheduler class for weekly re-optimization"""
    
    def __init__(self, franchise_id=372, verbose=True):
        self.franchise_id = franchise_id
        self.logger = OptimizationLogger(verbose)
        self.data_folder = "data files"
        
        # Data storage
        self.franchise_info = {}
        self.customers = {}
        self.cleanings = []
        self.teams = {}
        self.time_matrix_df = None
        self.distance_matrix_df = None
        self.time_matrix = None
        self.matrix_customer_ids = []
        
        # Results
        self.optimized_schedule = {}
        self.optimization_stats = {}
        
    def run_complete_optimization(self, target_week_start=None):
        """Run complete weekly re-optimization pipeline"""
        try:
            self.logger.header("TRAVEL-OPTIMIZED WEEKLY SCHEDULER")
            self.logger.info(f"🔧 Configuration: USE_PRECOMPUTED_MATRICES = {USE_PRECOMPUTED_MATRICES}")
            self.logger.info(f"🔧 Configuration: CLEAN_RAW_DATA = {CLEAN_RAW_DATA}")
            self.logger.info(f"🔧 Configuration: USE_ORTOOLS = {USE_ORTOOLS}")
            
            # Step 0: Clean raw data if enabled
            if CLEAN_RAW_DATA:
                self.clean_raw_data()
            
            # Step 1: Load franchise configuration
            self.load_franchise_data()
            
            # Step 2: Set target week
            if target_week_start is None:
                target_week_start = self.get_target_week()
            
            # Step 3: Load customer pool from matrix
            self.load_scheduled_cleanings(target_week_start)
            
            # Step 4: Load customer availability
            self.load_customer_data()
            
            # Step 5: Load team data with operational constraints
            self.load_team_data(target_week_start)
            
            # Step 6: Load travel matrices (precomputed or build from APIs)
            self.load_travel_matrices(target_week_start)
            
            # Step 7: Build availability matrix
            self.build_availability_matrix()
            
            # Step 8: Run TRUE travel optimization
            self.optimize_weekly_schedule_with_travel_optimization()
            
            # Step 9: Generate results and analysis
            self.generate_results_analysis()
            
            # Step 10: Save results
            self.save_results()
            
            # Log completion mode
            if USE_ORTOOLS:
                self.logger.info("🔄 Completed optimization using OR-Tools with fallbacks")
            else:
                self.logger.info("🔄 Completed optimization using original heuristic methods")
            
            self.logger.success("TRAVEL-OPTIMIZED WEEKLY SCHEDULING COMPLETED SUCCESSFULLY!")
            return True
            
        except Exception as e:
            self.logger.error(f"Optimization failed: {str(e)}")
            self.logger.debug(f"Full traceback:\n{traceback.format_exc()}")
            return False
    
    def load_franchise_data(self):
        """Load pre-filtered franchise configuration (already filtered by TCA cleaning)"""
        self.logger.section(f"Loading Franchise {self.franchise_id} Configuration")
        
        try:
            franchises_path = os.path.join(self.data_folder, "franchise_info.csv")
            franchises_df = pd.read_csv(franchises_path)
            
            # Since TCA cleaning already filtered for Franchise 372, just take the first (and only) row
            if franchises_df.empty:
                raise ValueError(f"No franchise data found - TCA cleaning may have failed")
            
            franchise = franchises_df.iloc[0]  # Take first row since it's already filtered
            
            # STANDARDIZED HOURS: 8:30 AM - 6:30 PM (10 hours, 600 minutes)
            starting_time_hours = 8.5   # 8:30 AM
            ending_time_hours = 18.5    # 6:30 PM
            
            self.franchise_info = {
                'franchise_id': int(franchise.get('FranchiseId', self.franchise_id)),
                'name': franchise.get('FranchiseName', 'Unknown'),
                'city': franchise.get('City', ''),
                'state': franchise.get('State', ''),
                'start_time_hours': starting_time_hours,
                'working_minutes_start': int(starting_time_hours * 60),  # 8:00 AM
                'working_minutes_end': int(ending_time_hours * 60),      # 8:00 PM
                'operating_minutes': (ending_time_hours - starting_time_hours) * 60  # 12 hours
            }
            
            self.logger.success(f"Franchise loaded: {self.franchise_info['name']}")
            self.logger.info(f"🕒 STANDARD HOURS: {starting_time_hours:.1f}:00 - {ending_time_hours:.1f}:00 ({self.franchise_info['operating_minutes']} minutes)")
            self.logger.info(f"📍 Location: {self.franchise_info['city']}, {self.franchise_info['state']}")
            
        except Exception as e:
            self.logger.error(f"Failed to load franchise data: {e}")
            raise
    
    def get_target_week(self):
        """Load configured target week from settings"""
        target_week_start = datetime.strptime(TARGET_WEEK_START, '%Y-%m-%d').date()
        target_week_end = datetime.strptime(TARGET_WEEK_END, '%Y-%m-%d').date()
        self.logger.info(f"📅 Target week: {target_week_start} ({TARGET_WEEK_START} to {TARGET_WEEK_END})")
        return target_week_start
    
    def load_scheduled_cleanings(self, target_week_start):
        """Load customers from matrix (use matrix as source of truth for customer list)"""
        self.logger.section(f"Loading Customer Pool from Travel Matrix")
        
        try:
            # Load matrix to get the actual customer list (183 customers)
            time_matrix_path = os.path.join(self.data_folder, "complete_real_driving_time_matrix_final.csv")
            matrix_df = pd.read_csv(time_matrix_path, index_col=0, nrows=1)
            
            # Extract customer IDs from matrix (excluding franchise office)
            matrix_customers = [col for col in matrix_df.columns if col != 'Franchise_Office']
            self.logger.info(f"📊 Matrix contains {len(matrix_customers)} customers")
            
            # Try to load actual cleaning data for service durations
            cleans_path = os.path.join(self.data_folder, "master_cleans.csv")
            cleans_df = pd.read_csv(cleans_path, low_memory=False)
            
            # Create customer pool using matrix customers
            self.cleanings = []
            for matrix_customer_id in matrix_customers:
                # Extract numeric ID from matrix format "Customer_XXXXXXX"
                numeric_id = int(matrix_customer_id.replace('Customer_', ''))
                
                # Find service duration from cleans data - USE ONLY ACTUAL PERFORMANCE DATA
                customer_cleans = cleans_df[cleans_df['CustomerId'] == numeric_id]
                if not customer_cleans.empty:
                    # Use ONLY actual service duration from DurationMinute (real performance data)
                    if 'DurationMinute' in customer_cleans.columns and pd.notna(customer_cleans['DurationMinute'].iloc[0]):
                        service_duration = int(customer_cleans['DurationMinute'].iloc[0])
                        # Validate duration (reasonable range)
                        if service_duration <= 0 or service_duration > 480:  # 0-8 hours reasonable range
                            service_duration = 90  # Only fallback if clearly invalid
                    else:
                        service_duration = 90  # Default if no DurationMinute data
                else:
                    # Default service duration
                    service_duration = 90
                
                clean_data = {
                    'customer_id': matrix_customer_id,  # Use matrix format "Customer_XXXXXXX"
                    'service_duration_minutes': service_duration,
                    'numeric_id': numeric_id  # Keep for reference
                }
                self.cleanings.append(clean_data)
            
            self.logger.success(f"Loaded {len(self.cleanings)} customers from matrix")
            self.logger.info(f"🔄 Using matrix customer list as ground truth")
            
            # Service duration analysis
            durations = [c['service_duration_minutes'] for c in self.cleanings]
            avg_duration = np.mean(durations)
            self.logger.info(f"📊 Average service time: {avg_duration:.1f} minutes")
            
        except Exception as e:
            self.logger.error(f"Failed to load customer pool: {e}")
            raise
    
    def load_customer_data(self):
        """Load customer availability constraints"""
        self.logger.section("Loading Customer Availability Constraints")
        
        try:
            customers_path = os.path.join(self.data_folder, "customer_profiles.csv")
            customers_df = pd.read_csv(customers_path, low_memory=False)
            
            # Get numeric customer IDs from our matrix customers
            numeric_customer_ids = [c['numeric_id'] for c in self.cleanings]
            
            # Find customers by joining on CustomerId
            franchise_customers = customers_df[customers_df['CustomerId'].isin(numeric_customer_ids)]
            
            self.customers = {}
            found_customers = 0
            
            for _, customer in franchise_customers.iterrows():
                numeric_customer_id = customer['CustomerId']
                
                # Find corresponding matrix customer ID
                matrix_customer_id = f"Customer_{numeric_customer_id}"
                
                # Day availability using REAL CONSTRAINT columns (0 = available, 1 = constrained)
                availability = {
                    'monday': not bool(customer.get('IsContraintMonday', 0)),       # 0 = available
                    'tuesday': not bool(customer.get('IsContraintTuesday', 0)),     # 1 = constrained
                    'wednesday': not bool(customer.get('IsContraintWednesday', 0)),
                    'thursday': not bool(customer.get('IsContraintThursday', 0)),
                    'friday': not bool(customer.get('IsContraintFriday', 0)),
                    'saturday': not bool(customer.get('IsContraintSaturday', 1)),   # Default Saturday constrained
                    'sunday': not bool(customer.get('IsContraintSunday', 1))        # Default Sunday constrained
                }
                
                available_days = [day for day, avail in availability.items() if avail]
                
                # Store using matrix customer ID format
                self.customers[matrix_customer_id] = {
                    'customer_id': matrix_customer_id,
                    'numeric_id': numeric_customer_id,
                    'availability': availability,
                    'available_days': available_days,
                    'address': customer.get('Address1', ''),
                    'city': customer.get('City', ''),
                    'franchise_id': customer.get('FranchiseId', 'Unknown')
                }
                found_customers += 1
            
            # For customers not found in profiles, create reasonable defaults
            for cleaning in self.cleanings:
                matrix_customer_id = cleaning['customer_id']
                
                if matrix_customer_id not in self.customers:
                    # Customer not found - default Monday-Friday available
                    default_availability = {
                        'monday': True, 'tuesday': True, 'wednesday': True,
                        'thursday': True, 'friday': True, 'saturday': False, 'sunday': False
                    }
                    
                    self.customers[matrix_customer_id] = {
                        'customer_id': matrix_customer_id,
                        'numeric_id': cleaning['numeric_id'],
                        'availability': default_availability,
                        'available_days': ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
                        'address': '', 'city': '', 'franchise_id': 'Unknown'
                    }
            
            self.logger.success(f"Loaded availability for {len(self.customers)} customers")
            self.logger.info(f"📊 Found profiles for {found_customers} customers, created defaults for {len(self.customers) - found_customers}")
            
            # Availability analysis
            availability_stats = defaultdict(int)
            for customer in self.customers.values():
                for day in customer['available_days']:
                    availability_stats[day] += 1
            
            self.logger.info("📅 Customer availability by day:")
            for day, count in availability_stats.items():
                self.logger.info(f"   {day.capitalize()}: {count} customers available")
            
        except Exception as e:
            self.logger.error(f"Failed to load customer data: {e}")
            raise
    
    def load_team_data(self, target_week_start):
        """Load ALL available teams with drivers - maximum deployment"""
        self.logger.section("Loading ALL Available Teams (Maximum Deployment)")
        
        try:
            teams_path = os.path.join(self.data_folder, "team_availability.csv")
            teams_df = pd.read_csv(teams_path)
            
            # Filter for franchise
            franchise_teams = teams_df[teams_df['FranchiseId'] == self.franchise_id]
            
            if franchise_teams.empty:
                raise ValueError(f"No teams found for Franchise {self.franchise_id}")
            
            self.teams = {}
            day_names = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
            
            for day_name in day_names:
                self.teams[day_name] = {}
                avail_col = f'AvgAvail{day_name.capitalize()[:3]}'  # AvgAvailMon, etc.
                
                for _, team in franchise_teams.iterrows():
                    team_number = team['TeamNumber']
                    availability_proportion = team.get(avail_col, 0.0)
                    drivers_count = team.get('DriversCount', 0)
                    
                    # USE ALL TEAMS - drivers OR no drivers, as long as they have availability
                    if availability_proportion > 0.1:  # Just need minimal availability
                        team_capacity_minutes = int(availability_proportion * self.franchise_info['operating_minutes'])
                        
                        self.teams[day_name][team_number] = {
                            'team_number': team_number,
                            'availability_proportion': availability_proportion,
                            'drivers_count': drivers_count,
                            'capacity_minutes': team_capacity_minutes,
                            'is_operational': True,
                            'synthetic': False
                        }
                
                # Log what we're deploying
                teams_with_drivers = sum(1 for team in self.teams[day_name].values() if team['drivers_count'] > 0)
                teams_without_drivers = len(self.teams[day_name]) - teams_with_drivers
                
                self.logger.info(f"   {day_name.capitalize()}: {len(self.teams[day_name])} teams total ({teams_with_drivers} with drivers, {teams_without_drivers} without)")
            
            # Summary
            total_teams = sum(len(day_teams) for day_teams in self.teams.values()) // 7  # Average
            teams_with_drivers = sum(1 for day_teams in self.teams.values() 
                                for team in day_teams.values() if team['drivers_count'] > 0) // 7
            
            self.logger.success("ALL AVAILABLE TEAMS DEPLOYED")
            self.logger.info(f"👥 Average teams per day: {total_teams} ({teams_with_drivers} with drivers)")
            self.logger.info(f"🚀 Maximum deployment strategy - let optimization handle capacity")
                
        except Exception as e:
            self.logger.error(f"Failed to load team data: {e}")
            raise
    
    def load_travel_matrices(self, target_week_start):
        """Load travel matrices - either precomputed or build from APIs"""
        if USE_PRECOMPUTED_MATRICES:
            self.logger.info("🔄 Using precomputed travel matrices")
            self.load_precomputed_matrices()
        else:
            self.logger.info("🔄 Building travel matrices from APIs")
            self.build_matrices_from_apis(target_week_start)
    
    def load_precomputed_matrices(self):
        """Load pre-computed travel matrices"""
        self.logger.section("Loading Pre-computed Travel Matrices")
        
        try:
            # Load time matrix
            time_matrix_path = os.path.join(self.data_folder, "complete_real_driving_time_matrix_final.csv")
            self.time_matrix_df = pd.read_csv(time_matrix_path, index_col=0)
            
            # Load distance matrix
            distance_matrix_path = os.path.join(self.data_folder, "complete_real_driving_distance_matrix_final.csv")
            self.distance_matrix_df = pd.read_csv(distance_matrix_path, index_col=0)
            
            # Convert to integer matrices for ortools
            self.time_matrix = self.time_matrix_df.values.astype(int)
            
            # Extract customer IDs from matrix columns
            matrix_locations = list(self.time_matrix_df.columns)
            self.matrix_customer_ids = [col for col in matrix_locations if col != 'Franchise_Office']
            
            self.logger.success("Travel matrices loaded successfully!")
            self.logger.info(f"📈 Matrix dimensions: {self.time_matrix.shape}")
            self.logger.info(f"📊 Available customers in matrix: {len(self.matrix_customer_ids)}")
            
            # Sample travel times
            if self.time_matrix.shape[1] > 1:
                franchise_to_first = self.time_matrix[0][1]
                self.logger.info(f"🚗 Sample: Franchise → first customer = {franchise_to_first} minutes")
            
        except Exception as e:
            self.logger.error(f"Failed to load matrices: {e}")
            raise
    
    def build_matrices_from_apis(self, target_week_start):
        """Build travel matrices from APIs using ArcGIS + OSRM with smart fallback"""
        self.logger.section("Building Travel Matrices from APIs")
        
        try:
            # Step 1: Prepare customer list and franchise location
            franchise_location = self._get_franchise_location()
            customer_locations = self._geocode_all_locations(franchise_location)
            
            # Step 2: Build time and distance matrices
            time_matrix, distance_matrix, location_names = self._build_routing_matrices(customer_locations)
            
            # Step 3: Convert to DataFrames and save
            self._save_matrices_to_files(time_matrix, distance_matrix, location_names, target_week_start)
            
            # Step 4: Load the newly created matrices into memory
            self.load_precomputed_matrices()
            
            self.logger.success("API matrix building completed successfully!")
            
        except Exception as e:
            self.logger.error(f"API matrix building failed: {e}")
            self.logger.warning("Falling back to precomputed matrices if available")
            try:
                self.load_precomputed_matrices()
            except:
                raise Exception("No fallback matrices available - API build failed")

    def _get_franchise_location(self):
        """Get franchise office location for matrix building"""
        franchise_address = f"{self.franchise_info['city']}, {self.franchise_info['state']}"
        
        # You can make this more specific if you have the actual franchise address
        if hasattr(self, 'franchise_address'):
            franchise_address = self.franchise_address
        else:
            # Default to city center - you can customize this
            franchise_address = f"Mount Prospect, IL"  # Franchise 372 location
        
        return {
            'id': 'Franchise_Office',
            'address': franchise_address,
            'coords': None  # Will be geocoded
        }

    def _geocode_all_locations(self, franchise_location):
        """Geocode all customer and franchise locations with smart fallback"""
        self.logger.info("🗺️ Geocoding all locations (ArcGIS + Nominatim fallback)...")
        
        # Initialize geocoders with rate limiting
        arcgis_geocoder = ArcGIS(timeout=10)
        nominatim_geocoder = Nominatim(user_agent="franchise_optimizer_v1", timeout=10)
        
        # Apply rate limiting
        arcgis_rate_limited = RateLimiter(arcgis_geocoder.geocode, min_delay_seconds=0.1)
        nominatim_rate_limited = RateLimiter(nominatim_geocoder.geocode, min_delay_seconds=1.0)
        
        locations_to_geocode = [franchise_location]
        
        # Add all customers to geocode list
        for customer_id, customer_data in self.customers.items():
            if customer_data.get('address') and customer_data.get('city'):
                full_address = f"{customer_data['address']}, {customer_data['city']}, IL"
                locations_to_geocode.append({
                    'id': customer_id,
                    'address': full_address,
                    'coords': None
                })
        
        self.logger.info(f"📍 Geocoding {len(locations_to_geocode)} locations...")
        
        geocoded_locations = []
        successful_geocoding = 0
        
        for i, location in enumerate(locations_to_geocode):
            self.logger.progress(i + 1, len(locations_to_geocode), "Geocoding")
            
            coords = self._geocode_with_fallback(
                location['address'], 
                arcgis_rate_limited, 
                nominatim_rate_limited
            )
            
            if coords:
                location['coords'] = coords
                geocoded_locations.append(location)
                successful_geocoding += 1
            else:
                self.logger.warning(f"⚠️ Failed to geocode: {location['id']} - {location['address']}")
        
        success_rate = (successful_geocoding / len(locations_to_geocode)) * 100
        self.logger.success(f"Geocoding complete: {successful_geocoding}/{len(locations_to_geocode)} ({success_rate:.1f}%)")
        
        if success_rate < 80:
            self.logger.warning("⚠️ Low geocoding success rate - matrix quality may be reduced")
        
        return geocoded_locations

    def _geocode_with_fallback(self, address, arcgis_geocoder, nominatim_geocoder):
        """Geocode address with ArcGIS primary, Nominatim fallback"""
        
        # Try ArcGIS first (more accurate)
        try:
            location = arcgis_geocoder(address)
            if location:
                return (location.latitude, location.longitude)
        except Exception as e:
            self.logger.debug(f"ArcGIS geocoding failed for {address}: {e}")
        
        # Fallback to Nominatim
        try:
            location = nominatim_geocoder(address)
            if location:
                return (location.latitude, location.longitude)
        except Exception as e:
            self.logger.debug(f"Nominatim geocoding failed for {address}: {e}")
        
        return None

    def _build_routing_matrices(self, locations):
        """Build time and distance matrices using OSRM with fallback"""
        self.logger.info("🚗 Building routing matrices (OSRM + distance fallback)...")
        
        n_locations = len(locations)
        time_matrix = np.zeros((n_locations, n_locations), dtype=int)
        distance_matrix = np.zeros((n_locations, n_locations), dtype=float)
        location_names = [loc['id'] for loc in locations]
        
        # Initialize OSRM client
        osrm_client = rp.OSRM(base_url='http://router.project-osrm.org')
        
        total_pairs = n_locations * n_locations
        current_pair = 0
        
        for i, origin in enumerate(locations):
            for j, destination in enumerate(locations):
                current_pair += 1
                
                if i % 5 == 0:  # Progress every 5 origins
                    self.logger.progress(current_pair, total_pairs, "Building matrix")
                
                if i == j:
                    # Same location
                    time_matrix[i][j] = 0
                    distance_matrix[i][j] = 0.0
                    continue
                
                # Get routing information
                travel_time, travel_distance = self._get_route_with_fallback(
                    origin['coords'], destination['coords'], osrm_client
                )
                
                time_matrix[i][j] = travel_time
                distance_matrix[i][j] = travel_distance
        
        self.logger.success(f"Routing matrix complete: {n_locations}x{n_locations}")
        return time_matrix, distance_matrix, location_names

    def _get_route_with_fallback(self, origin_coords, dest_coords, osrm_client):
        """Get route with OSRM primary, distance-based fallback"""
        
        if not origin_coords or not dest_coords:
            return self._estimate_travel_from_distance(origin_coords, dest_coords)
        
        # Try OSRM routing first
        try:
            route_result = osrm_client.directions(
                coordinates=[origin_coords[::-1], dest_coords[::-1]],  # OSRM uses [lon, lat]
                profile='driving',
                geometries='geojson',
                overview='false'
            )
            
            if route_result and route_result.routes:
                # Extract duration (seconds) and distance (meters)
                duration_seconds = route_result.routes[0].duration
                distance_meters = route_result.routes[0].distance
                
                # Convert to minutes and kilometers
                travel_time = max(1, int(duration_seconds / 60))  # At least 1 minute
                travel_distance = distance_meters / 1000.0  # Convert to km
                
                return travel_time, travel_distance
        
        except Exception as e:
            self.logger.debug(f"OSRM routing failed: {e}")
        
        # Fallback to distance-based estimation
        return self._estimate_travel_from_distance(origin_coords, dest_coords)

    def _estimate_travel_from_distance(self, origin_coords, dest_coords):
        """Estimate travel time from straight-line distance"""
        
        if not origin_coords or not dest_coords:
            # Ultimate fallback for failed geocoding
            return 30, 25.0  # 30 minutes, 25 km default
        
        # Calculate straight-line distance using Haversine formula
        lat1, lon1 = origin_coords
        lat2, lon2 = dest_coords
        
        # Haversine formula
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat/2)**2 + 
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * 
             math.sin(dlon/2)**2)
        c = 2 * math.asin(math.sqrt(a))
        
        # Earth radius in kilometers
        earth_radius_km = 6371
        straight_distance = earth_radius_km * c
        
        # Estimate driving distance (typically 1.3x straight-line in urban areas)
        driving_distance = straight_distance * 1.3
        
        # Estimate driving time (assume 40 km/h average in Chicago metro)
        driving_time = max(1, int((driving_distance / 40.0) * 60))  # Convert to minutes
        
        return driving_time, driving_distance

    def _save_matrices_to_files(self, time_matrix, distance_matrix, location_names, target_week_start):
        """Save matrices to CSV files for future use"""
        self.logger.info("💾 Saving matrices to CSV files...")
        
        # Create DataFrames
        time_df = pd.DataFrame(time_matrix, index=location_names, columns=location_names)
        distance_df = pd.DataFrame(distance_matrix, index=location_names, columns=location_names)
        
        # Generate filenames with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        week_str = target_week_start.strftime("%Y%m%d")
        
        time_filename = f"driving_time_matrix_franchise_{self.franchise_id}_week_{week_str}_{timestamp}.csv"
        distance_filename = f"driving_distance_matrix_franchise_{self.franchise_id}_week_{week_str}_{timestamp}.csv"
        
        # Save to data folder
        time_path = os.path.join(self.data_folder, time_filename)
        distance_path = os.path.join(self.data_folder, distance_filename)
        
        time_df.to_csv(time_path)
        distance_df.to_csv(distance_path)
        
        self.logger.success(f"Time matrix saved: {time_filename}")
        self.logger.success(f"Distance matrix saved: {distance_filename}")
        
        # Also create/update the standard filenames for easy loading
        standard_time_path = os.path.join(self.data_folder, "complete_real_driving_time_matrix_final.csv")
        standard_distance_path = os.path.join(self.data_folder, "complete_real_driving_distance_matrix_final.csv")
        
        time_df.to_csv(standard_time_path)
        distance_df.to_csv(standard_distance_path)
        
        self.logger.info("📋 Updated standard matrix files for immediate use")
        
        # Matrix quality report
        avg_time = np.mean(time_matrix[time_matrix > 0])
        max_time = np.max(time_matrix)
        
        self.logger.info(f"📊 Matrix Quality Report:")
        self.logger.info(f"   Average travel time: {avg_time:.1f} minutes")
        self.logger.info(f"   Maximum travel time: {max_time} minutes")
        self.logger.info(f"   Matrix size: {len(location_names)}x{len(location_names)}")
    
    def build_availability_matrix(self):
        """Build customer-day-team availability matrix"""
        self.logger.section("Building Customer-Day-Team Availability Matrix")
        
        # Create availability combinations
        self.availability_matrix = []
        
        for cleaning in self.cleanings:
            customer_id = cleaning['customer_id']
            service_duration = cleaning['service_duration_minutes']
            
            if customer_id not in self.customers:
                continue
            
            customer_data = self.customers[customer_id]
            
            # For each day customer is available
            for day_name in customer_data['available_days']:
                # For each operational team on that day
                for team_number, team_data in self.teams[day_name].items():
                    
                    availability_record = {
                        'customer_id': customer_id,
                        'day_name': day_name,
                        'team_number': team_number,
                        'service_duration': service_duration,
                        'team_capacity': team_data['capacity_minutes']
                    }
                    self.availability_matrix.append(availability_record)
        
        total_combinations = len(self.availability_matrix)
        unique_customers = len(set(r['customer_id'] for r in self.availability_matrix))
        
        self.logger.success(f"Availability matrix built")
        self.logger.info(f"📊 {total_combinations} valid customer-day-team combinations")
        self.logger.info(f"👥 {unique_customers} customers with availability")
        
        # Breakdown by day
        day_breakdown = defaultdict(int)
        for record in self.availability_matrix:
            day_breakdown[record['day_name']] += 1
        
        self.logger.info("📅 Combinations by day:")
        for day, count in day_breakdown.items():
            self.logger.info(f"   {day.capitalize()}: {count} combinations")
    
    def optimize_weekly_schedule_with_travel_optimization(self):
        """Run TRUE TRAVEL OPTIMIZATION (replaces VRP approach)"""
        self.logger.section("Running TRUE Travel Time Optimization")
        
        if not self.availability_matrix:
            self.logger.error("No availability matrix built!")
            return
        
        self.logger.info("🔧 NEW: True travel time minimization with geographic clustering")
        
        # Step 1: Create weekly assignment using TRUE travel optimization
        self.optimized_schedule = self.assign_customers_weekly()
        
        # Step 2: For each day, optimize team routes
        for day_name in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']:
            if day_name in self.optimized_schedule and len(self.optimized_schedule[day_name]) > 0:
                self.logger.info(f"📅 Optimizing routes for {day_name}: {len(self.optimized_schedule[day_name])} customers")
                self.optimized_schedule[day_name] = self.optimize_daily_routes(day_name, self.optimized_schedule[day_name])
        
        # Statistics
        total_assignments = sum(len(schedule) for schedule in self.optimized_schedule.values())
        unique_customers = len(set(
            assignment['customer_id'] 
            for daily_schedule in self.optimized_schedule.values() 
            for assignment in daily_schedule
        ))
        
        self.logger.success(f"Travel optimization complete!")
        self.logger.info(f"📊 {total_assignments} total assignments")
        self.logger.info(f"👥 {unique_customers} unique customers scheduled")
    
    def assign_customers_weekly(self):
        """Weekly assignment using improved clustering + heuristic optimization"""
        
        self.logger.info("🚀 Running Improved Clustering + Heuristic Assignment")
        return self.assign_customers_weekly_original()
    
    def assign_customers_weekly_original(self):
        """Original clustering + assignment logic (fallback)"""
        
        self.logger.section("🌍 TRUE TRAVEL-OPTIMIZED ASSIGNMENT")
        
        # Initialize weekly schedule
        weekly_schedule = {
            'monday': [], 'tuesday': [], 'wednesday': [], 'thursday': [], 
            'friday': [], 'saturday': [], 'sunday': []
        }
        
        # Phase 1: Create geographic clusters
        self.logger.info("🗺️ Creating geographic clusters using travel matrix...")
        geographic_clusters = self.create_improved_geographic_clusters()
        
        # Phase 2: Assign clusters to day/team combinations with constraints
        self.logger.info("📅 Assigning clusters with availability and time constraints...")
        weekly_schedule = self.assign_clusters_with_constraints(geographic_clusters, weekly_schedule)
        
        # Phase 3: Handle unassigned customers individually
        weekly_schedule = self.assign_remaining_customers(weekly_schedule)
        
        # Phase 4: Time validation and redistribution
        weekly_schedule = self.validate_and_redistribute(weekly_schedule)
        
        # FORCE 100% COVERAGE
        weekly_schedule = self.ensure_100_percent_coverage(weekly_schedule)

        # Phase 5: Calculate and report travel time
        total_travel_time = self.calculate_total_weekly_travel(weekly_schedule)
        self.logger.success(f"🚗 Total optimized weekly travel time: {total_travel_time} minutes ({total_travel_time/60:.1f} hours)")
        
        return weekly_schedule
    
    def create_improved_geographic_clusters(self):
        """Create geographically coherent clusters using centroid-based approach with strategic seeds"""
        
        self.logger.section("🌍 IMPROVED GEOGRAPHIC CLUSTERING")
        
        all_customers = list(self.customers.keys())
        
        # Step 1: Determine optimal number of clusters
        num_clusters = self._estimate_optimal_cluster_count(all_customers)
        self.logger.info(f"📊 Target clusters: {num_clusters}")
        
        # Step 2: Select strategic seeds using farthest-first
        seeds = self._select_optimal_seeds(all_customers, num_clusters)
        self.logger.info(f"🎯 Selected {len(seeds)} strategic seed customers")
        
        # Step 3: Initialize clusters with seeds
        clusters = []
        for i, seed in enumerate(seeds):
            clusters.append({
                'id': i,
                'customers': [seed],
                'capacity_used': self._get_service_time(seed) + 35  # Service + travel overhead
            })
        
        unassigned = [c for c in all_customers if c not in seeds]
        self.logger.info(f"📋 Assigning {len(unassigned)} remaining customers to clusters...")
        
        # Step 4: Iterative assignment with capacity constraints
        max_iterations = 10
        for iteration in range(max_iterations):
            assignments_changed = False
            
            for customer in unassigned[:]:  # Copy list to modify during iteration
                best_cluster = self._find_best_cluster_for_customer(customer, clusters)
                
                if best_cluster is not None:
                    customer_workload = self._get_service_time(customer) + 35  # Service + travel
                    
                    # Check capacity constraint (INCREASED: More customers per cluster)
                    if (best_cluster['capacity_used'] + customer_workload) <= 300:  # Increased from 200 to 300
                        best_cluster['customers'].append(customer)
                        best_cluster['capacity_used'] += customer_workload
                        unassigned.remove(customer)
                        assignments_changed = True
            
            if not assignments_changed:
                break
        
        # Step 5: Handle remaining unassigned customers
        for customer in unassigned:
            # Find cluster with minimum capacity to add this customer
            min_capacity_cluster = min(clusters, key=lambda c: len(c['customers']))
            min_capacity_cluster['customers'].append(customer)
            min_capacity_cluster['capacity_used'] += self._get_service_time(customer) + 35
        
        # Step 6: Calculate comprehensive cluster metrics
        enhanced_clusters = self._enhance_clusters_with_full_metrics(clusters)
        
        # Log results
        avg_size = np.mean([c['size'] for c in enhanced_clusters])
        avg_efficiency = np.mean([c['efficiency_pct'] for c in enhanced_clusters])
        
        self.logger.success(f"✅ Created {len(enhanced_clusters)} improved geographic clusters")
        self.logger.info(f"📊 Average cluster size: {avg_size:.1f} customers")
        self.logger.info(f"📈 Average efficiency: {avg_efficiency:.1f}%")
        
        # Show top 5 most efficient clusters
        top_clusters = sorted(enhanced_clusters, key=lambda x: x['avg_travel_per_customer'])[:5]
        for i, cluster in enumerate(top_clusters):
            cities_str = ', '.join(cluster['cities'][:2])
            self.logger.info(f"   Cluster {cluster['id']}: {cluster['size']} customers in {cities_str}, {cluster['avg_travel_per_customer']:.0f} min/customer, {cluster['efficiency_pct']:.1f}% efficient")
        
        return enhanced_clusters
    
    def _estimate_optimal_cluster_count(self, customers):
        """Estimate optimal number of clusters based on service area and capacity"""
        
        total_service_time = sum(self._get_service_time(c) for c in customers)
        avg_service_time = total_service_time / len(customers) if customers else 90
        
        # Estimate customers per cluster based on team capacity
        travel_overhead_per_customer = 35  # Minutes
        team_capacity = 570  # Minutes per day
        
        customers_per_cluster = int(team_capacity / (avg_service_time + travel_overhead_per_customer))
        customers_per_cluster = max(2, min(4, customers_per_cluster))  # FIXED: Much smaller clusters
        
        optimal_clusters = math.ceil(len(customers) / customers_per_cluster)
        
        return max(35, min(60, optimal_clusters))  # FIXED: More clusters needed

    def _select_optimal_seeds(self, customers, num_seeds):
        """Select geographically dispersed seeds using farthest-first strategy"""
        
        seeds = []
        remaining = customers.copy()
        
        # Start with customer farthest from franchise
        franchise_distances = []
        for customer in remaining:
            dist = self._get_travel_time_between_customers('Franchise_Office', customer)
            franchise_distances.append((customer, dist))
        
        # Pick customer farthest from franchise as first seed
        first_seed = max(franchise_distances, key=lambda x: x[1])[0]
        seeds.append(first_seed)
        remaining.remove(first_seed)
        
        # For remaining seeds, pick customers farthest from existing seeds
        while len(seeds) < num_seeds and remaining:
            max_min_distance = 0
            best_candidate = None
            
            for candidate in remaining:
                # Find minimum distance to any existing seed
                min_dist_to_seeds = min(
                    self._get_travel_time_between_customers(candidate, seed) 
                    for seed in seeds
                )
                
                # Pick candidate with maximum "minimum distance to seeds"
                if min_dist_to_seeds > max_min_distance:
                    max_min_distance = min_dist_to_seeds
                    best_candidate = candidate
            
            if best_candidate:
                seeds.append(best_candidate)
                remaining.remove(best_candidate)
            else:
                break
        
        return seeds

    def _find_best_cluster_for_customer(self, customer, clusters):
        """Find best cluster for customer based on minimum travel time to cluster"""
        
        best_cluster = None
        min_distance = float('inf')
        
        for cluster in clusters:
            # Find minimum travel time to any customer in this cluster
            min_travel_to_cluster = min(
                self._get_travel_time_between_customers(customer, cluster_customer)
                for cluster_customer in cluster['customers']
            )
            
            # Penalize distance if cluster is getting full
            capacity_penalty = 1.0
            if cluster['capacity_used'] > 250:  # Getting full
                capacity_penalty = 1.3
            
            adjusted_distance = min_travel_to_cluster * capacity_penalty
            
            if adjusted_distance < min_distance:
                min_distance = adjusted_distance
                best_cluster = cluster
        
        return best_cluster

    def _enhance_clusters_with_full_metrics(self, clusters):
        """Calculate comprehensive metrics for each cluster"""
        
        enhanced_clusters = []
        
        for cluster in clusters:
            customers = cluster['customers']
            
            # Get optimal route using existing nearest neighbor
            optimal_route = self._nearest_neighbor_route(customers)
            
            # Calculate exact travel times
            total_travel = 0
            current_location = 'Franchise_Office'
            
            for customer in optimal_route:
                travel_time = self._get_travel_time_between_customers(current_location, customer)
                total_travel += travel_time
                current_location = customer
            
            # Return to franchise
            return_travel = self._get_travel_time_between_customers(current_location, 'Franchise_Office')
            total_travel += return_travel
            
            # Calculate service metrics
            total_service_time = sum(self._get_service_time(c) for c in customers)
            total_time = total_travel + total_service_time
            
            # Calculate efficiency metrics
            efficiency = (total_service_time / total_time) * 100 if total_time > 0 else 0
            avg_travel_per_customer = total_travel / len(customers) if customers else 0
            
            # Geographic metrics
            cities = list(set(self.customers[c]['city'] for c in customers if c in self.customers))
            
            # Availability analysis - find days when ALL customers available
            common_days = self._get_cluster_common_available_days(customers)
            
            enhanced_cluster = {
                'id': cluster['id'],
                'customers': customers,
                'optimal_route': optimal_route,
                'size': len(customers),
                
                # Time metrics (minutes)
                'total_service_time': total_service_time,
                'total_travel_time': total_travel,
                'total_time': total_time,
                'return_travel_time': return_travel,
                
                # Efficiency metrics
                'efficiency_pct': efficiency,
                'avg_travel_per_customer': avg_travel_per_customer,
                'travel_service_ratio': total_travel / total_service_time if total_service_time > 0 else 0,
                
                # Geographic metrics
                'cities': cities,
                
                # Availability
                'common_available_days': common_days,
                'availability_flexibility': len(common_days),
                
                # Capacity check
                'fits_in_single_day': total_time <= 570,
                'capacity_utilization_pct': (total_time / 570) * 100 if total_time <= 570 else 100
            }
            
            enhanced_clusters.append(enhanced_cluster)
        
        # Sort by efficiency (travel time per customer)
        enhanced_clusters.sort(key=lambda x: x['avg_travel_per_customer'])
        
        return enhanced_clusters

    def _get_cluster_common_available_days(self, customer_list):
        """Find days when ALL customers in cluster are available"""
        
        if not customer_list:
            return []
        
        # Start with first customer's available days
        common_days = set(self.customers[customer_list[0]]['available_days'])
        
        # Find intersection with all other customers
        for customer_id in customer_list[1:]:
            if customer_id in self.customers:
                customer_days = set(self.customers[customer_id]['available_days'])
                common_days = common_days.intersection(customer_days)
        
        return list(common_days)
    
    def _calculate_cluster_total_travel(self, customer_list):
        """Calculate total round-trip travel time for cluster"""
        if len(customer_list) <= 1:
            return 0
        
        # Find optimal route order using nearest neighbor
        route_order = self._nearest_neighbor_route(customer_list)
        
        total_travel = 0
        franchise_idx = list(self.time_matrix_df.columns).index('Franchise_Office')
        
        try:
            # Franchise to first customer
            if route_order[0] in self.time_matrix_df.columns:
                first_idx = list(self.time_matrix_df.columns).index(route_order[0])
                total_travel += self.time_matrix[franchise_idx][first_idx]
            
            # Between customers in optimal order
            for i in range(len(route_order) - 1):
                curr = route_order[i]
                next_cust = route_order[i + 1]
                
                if curr in self.time_matrix_df.columns and next_cust in self.time_matrix_df.columns:
                    curr_idx = list(self.time_matrix_df.columns).index(curr)
                    next_idx = list(self.time_matrix_df.columns).index(next_cust)
                    total_travel += self.time_matrix[curr_idx][next_idx]
            
            # Last customer back to franchise
            if route_order[-1] in self.time_matrix_df.columns:
                last_idx = list(self.time_matrix_df.columns).index(route_order[-1])
                total_travel += self.time_matrix[last_idx][franchise_idx]
                
        except Exception as e:
            # Fallback calculation if matrix lookup fails
            total_travel = len(customer_list) * 25  # Estimated 25 min per customer
        
        return total_travel
    
    def _nearest_neighbor_route(self, customer_list):
        """Simple nearest neighbor TSP for route ordering"""
        if len(customer_list) <= 1:
            return customer_list
        
        route = []
        remaining = customer_list.copy()
        current_location = 'Franchise_Office'
        
        while remaining:
            nearest_customer = None
            min_travel = float('inf')
            
            for customer in remaining:
                travel_time = self._get_travel_time_between_customers(current_location, customer)
                if travel_time < min_travel:
                    min_travel = travel_time
                    nearest_customer = customer
            
            if nearest_customer:
                route.append(nearest_customer)
                remaining.remove(nearest_customer)
                current_location = nearest_customer
            else:
                # Fallback: just take first remaining
                route.append(remaining.pop(0))
        
        return route
    
    def assign_clusters_with_constraints(self, clusters, weekly_schedule):
        """Assign clusters to day/team combinations respecting ALL constraints"""
        
        # Track team workloads for time constraint enforcement
        team_workloads = defaultdict(lambda: defaultdict(int))  # [day][team] = minutes
        assigned_clusters = set()
        
        for i, cluster in enumerate(clusters):
            if i in assigned_clusters:
                continue
            
            # Find best day/team assignment for this cluster
            best_assignment = self._find_best_assignment_for_cluster(
                cluster, weekly_schedule, team_workloads
            )
            
            if best_assignment:
                day_name = best_assignment['day']
                team_number = best_assignment['team']
                
                # Assign all customers in cluster to this day/team
                for customer_id in cluster['customers']:
                    # Double-check customer availability for this day
                    if day_name not in self.customers[customer_id]['available_days']:
                        self.logger.warning(f"⚠️ Customer {customer_id} not available on {day_name}, skipping")
                        continue
                    
                    service_time = self._get_service_time(customer_id)
                    
                    assignment = {
                        'customer_id': customer_id,
                        'team_number': team_number,
                        'service_duration': service_time,
                        'start_time_str': '08:00',  # Will be optimized in route phase
                        'end_time_str': '09:30',   # Will be optimized in route phase
                        'start_time_minutes': 480  # Will be optimized in route phase
                    }
                    
                    weekly_schedule[day_name].append(assignment)
                
                # Update workload tracking
                cluster_workload = cluster['total_service_time'] + cluster['total_travel_time']
                team_workloads[day_name][team_number] += cluster_workload
                assigned_clusters.add(i)
                
                self.logger.debug(f"✅ Assigned cluster {i} ({cluster['size']} customers) to {day_name} Team {team_number}")
            else:
                self.logger.debug(f"❌ Could not assign cluster {i} ({cluster['size']} customers) - will handle individually")
        
        return weekly_schedule
    
    def _find_best_assignment_for_cluster(self, cluster, current_schedule, team_workloads):
        """Find best assignment - avoid overtime, ensure capacity exists"""
        
        # Step 1: Find days when ALL customers in cluster are available
        available_days = self._get_cluster_available_days(cluster['customers'])
        
        if not available_days:
            return None
        
        # Step 2: Calculate cluster workload
        cluster_workload = cluster['total_service_time'] + cluster['total_travel_time']
        max_team_workload = 600  # CONSERVATIVE: 10 hours to prevent overtime (was 720)
        
        # Step 3: Find assignment that minimizes travel while ensuring capacity
        best_option = None
        min_travel_impact = float('inf')
        
        for day_name in available_days:
            if day_name not in self.teams or not self.teams[day_name]:
                continue
            
            available_teams = list(self.teams[day_name].keys())
            
            for team_number in available_teams:
                # STRICT CAPACITY CHECK - prevent overtime
                current_workload = team_workloads[day_name][team_number]
                if current_workload + cluster_workload > max_team_workload:
                    continue  # Skip overloaded teams
                
                # Calculate travel impact only for valid assignments
                travel_impact = self._calculate_weekly_travel_impact(
                    day_name, team_number, cluster, current_schedule
                )
                
                if travel_impact < min_travel_impact:
                    min_travel_impact = travel_impact
                    best_option = {
                        'day': day_name,
                        'team': team_number,
                        'travel_impact': travel_impact
                    }
        
        return best_option
    
    def _get_cluster_available_days(self, customer_ids):
        """Find days when ALL customers in cluster are available"""
        if not customer_ids:
            return []
        
        # Start with first customer's available days
        common_days = set(self.customers[customer_ids[0]]['available_days'])
        
        # Find intersection with all other customers
        for customer_id in customer_ids[1:]:
            if customer_id in self.customers:
                customer_days = set(self.customers[customer_id]['available_days'])
                common_days = common_days.intersection(customer_days)
        
        return list(common_days)
    
    def _calculate_weekly_travel_impact(self, day_name, team_number, cluster, current_schedule):
        """Calculate impact on total weekly travel if we assign cluster to this team"""
        
        # Get existing customers on this team
        existing_customers = [
            assignment['customer_id'] 
            for assignment in current_schedule[day_name] 
            if assignment['team_number'] == team_number
        ]
        
        # Calculate current travel time for this team
        current_travel = self._calculate_cluster_total_travel(existing_customers) if existing_customers else 0
        
        # Calculate new travel time with cluster added
        combined_customers = existing_customers + cluster['customers']
        new_travel = self._calculate_cluster_total_travel(combined_customers)
        
        # Return the increase in travel time
        return new_travel - current_travel
    
    def assign_remaining_customers(self, weekly_schedule):
        """Assign customers that didn't fit in clusters"""
        
        # Find unassigned customers
        assigned_customers = set()
        for daily_schedule in weekly_schedule.values():
            for assignment in daily_schedule:
                assigned_customers.add(assignment['customer_id'])
        
        unassigned_customers = [
            customer_id for customer_id in self.customers.keys() 
            if customer_id not in assigned_customers
        ]
        
        if unassigned_customers:
            self.logger.info(f"📋 Assigning {len(unassigned_customers)} remaining customers individually...")
            
            for customer_id in unassigned_customers:
                best_assignment = self._find_best_individual_assignment(customer_id, weekly_schedule)
                
                if best_assignment:
                    weekly_schedule[best_assignment['day']].append(best_assignment['assignment'])
                    self.logger.debug(f"✅ Assigned {customer_id} to {best_assignment['day']} Team {best_assignment['team']}")
                else:
                    self.logger.warning(f"⚠️ Could not assign {customer_id} - no available slots")
        
        return weekly_schedule
    
    def _find_best_individual_assignment(self, customer_id, weekly_schedule):
        """Find assignment for individual customer - prioritize available capacity"""
        
        if customer_id not in self.customers:
            return None
        
        customer_data = self.customers[customer_id]
        service_time = self._get_service_time(customer_id)
        
        best_option = None
        min_travel_increase = float('inf')
        
        # Try each available day
        for day_name in customer_data['available_days']:
            if day_name not in self.teams:
                continue
            
            # Try each team on this day
            for team_number in self.teams[day_name].keys():
                # CONSERVATIVE capacity check to prevent overtime
                current_workload = self._calculate_team_current_workload(day_name, team_number, weekly_schedule)
                if current_workload + service_time + 25 > 600:  # Conservative 10-hour limit
                    continue
                
                # Calculate travel increase
                travel_increase = self._calculate_individual_travel_increase(
                    customer_id, day_name, team_number, weekly_schedule
                )
                
                if travel_increase < min_travel_increase:
                    min_travel_increase = travel_increase
                    best_option = {
                        'day': day_name,
                        'team': team_number,
                        'assignment': {
                            'customer_id': customer_id,
                            'team_number': team_number,
                            'service_duration': service_time,
                            'start_time_str': '08:00',
                            'end_time_str': '09:30',
                            'start_time_minutes': 480
                        }
                    }
        
        return best_option
    
    def _calculate_team_current_workload(self, day_name, team_number, weekly_schedule):
        """Calculate current workload for specific team"""
        total_workload = 0
        
        for assignment in weekly_schedule[day_name]:
            if assignment['team_number'] == team_number:
                total_workload += assignment['service_duration']
        
        return total_workload
    
    def _calculate_individual_travel_increase(self, customer_id, day_name, team_number, weekly_schedule):
        """Calculate how much travel time increases if we add this customer to this team"""
        
        # Get existing customers on this team
        existing_customers = [
            assignment['customer_id'] 
            for assignment in weekly_schedule[day_name] 
            if assignment['team_number'] == team_number
        ]
        
        # Calculate current and new travel times
        current_travel = self._calculate_cluster_total_travel(existing_customers) if existing_customers else 0
        new_travel = self._calculate_cluster_total_travel(existing_customers + [customer_id])
        
        return new_travel - current_travel
    
    def validate_and_redistribute(self, weekly_schedule):
        """Ensure no team works past 6 PM, redistribute if needed"""
        self.logger.info("⏰ Validating time constraints...")
        
        max_iterations = 3  # Prevent infinite loops
        iteration = 0
        
        while iteration < max_iterations:
            violations_found = False
            iteration += 1
            
            for day_name, daily_schedule in weekly_schedule.items():
                # Calculate team workloads
                team_workloads = defaultdict(int)
                team_customers = defaultdict(list)
                
                for assignment in daily_schedule:
                    team_num = assignment['team_number']
                    workload = assignment['service_duration'] + 25  # +25 for travel
                    team_workloads[team_num] += workload
                    team_customers[team_num].append(assignment)
                
                # Find teams that would work past 6:30 PM (600 minutes = 10 hour limit)  
                overloaded_teams = [
                    team_num for team_num, workload in team_workloads.items() 
                    if workload > 600  # Standardized to 600 minutes (10 hours)
                ]
                
                if overloaded_teams:
                    violations_found = True
                    self.logger.warning(f"⚠️ {day_name}: {len(overloaded_teams)} teams exceed time limits")
                    
                    # Redistribute customers from overloaded teams
                    for team_num in overloaded_teams:
                        customers_to_move = self._select_customers_to_redistribute(team_customers[team_num])
                        
                        for customer_assignment in customers_to_move:
                            # Remove from current team
                            weekly_schedule[day_name].remove(customer_assignment)
                            
                            # Try to find new assignment
                            new_assignment = self._find_alternative_assignment(
                                customer_assignment, weekly_schedule, exclude_day=day_name
                            )
                            
                            if new_assignment:
                                weekly_schedule[new_assignment['day']].append(new_assignment['assignment'])
                                self.logger.debug(f"Moved {customer_assignment['customer_id']} from {day_name} to {new_assignment['day']}")
                            else:
                                # Try different team same day
                                alternative_team = self._find_alternative_team_same_day(
                                    customer_assignment, day_name, team_workloads
                                )
                                if alternative_team:
                                    customer_assignment['team_number'] = alternative_team
                                    weekly_schedule[day_name].append(customer_assignment)
                                else:
                                    # Last resort: keep on overloaded team
                                    weekly_schedule[day_name].append(customer_assignment)
                                    self.logger.warning(f"⚠️ Could not redistribute {customer_assignment['customer_id']}")
            
            if not violations_found:
                break
        
        self.logger.info(f"✅ Time validation complete after {iteration} iterations")
        return weekly_schedule
    
    def _select_customers_to_redistribute(self, team_customers):
        """Select which customers to move from overloaded team"""
        # Sort by service duration (move longest services first)
        sorted_customers = sorted(team_customers, key=lambda x: x['service_duration'], reverse=True)
        
        # Move customers until team is under limit
        to_move = []
        remaining_workload = sum(c['service_duration'] + 25 for c in team_customers)
        
        for customer in sorted_customers:
            if remaining_workload <= 550:  # Under safe limit (600 - 50 buffer)
                break
            to_move.append(customer)
            remaining_workload -= (customer['service_duration'] + 25)
        
        return to_move[:2]  # Max 2 customers to move per iteration
    
    def _find_alternative_assignment(self, customer_assignment, weekly_schedule, exclude_day=None):
        """Find alternative day/team for customer"""
        customer_id = customer_assignment['customer_id']
        
        if customer_id not in self.customers:
            return None
        
        available_days = self.customers[customer_id]['available_days']
        if exclude_day:
            available_days = [d for d in available_days if d != exclude_day]
        
        for day_name in available_days:
            for team_number in self.teams[day_name].keys():
                current_workload = self._calculate_team_current_workload(day_name, team_number, weekly_schedule)
                if current_workload + customer_assignment['service_duration'] + 25 <= 600:
                    return {
                        'day': day_name,
                        'assignment': {
                            'customer_id': customer_id,
                            'team_number': team_number,
                            'service_duration': customer_assignment['service_duration'],
                            'start_time_str': '08:00',
                            'end_time_str': '09:30',
                            'start_time_minutes': 480
                        }
                    }
        
        return None
    
    def _find_alternative_team_same_day(self, customer_assignment, day_name, team_workloads):
        """Find alternative team on same day"""
        min_workload = float('inf')
        best_team = None
        
        for team_number in self.teams[day_name].keys():
            workload = team_workloads.get(team_number, 0)
            if workload + customer_assignment['service_duration'] + 25 <= 550 and workload < min_workload:
                min_workload = workload
                best_team = team_number
        
        return best_team
    
    def ensure_100_percent_coverage(self, weekly_schedule):
        """Automatically use available capacity to ensure 100% coverage"""
        
        # Find unassigned customers
        assigned_customers = set()
        for daily_schedule in weekly_schedule.values():
            for assignment in daily_schedule:
                assigned_customers.add(assignment['customer_id'])
        
        unassigned_customers = [
            customer_id for customer_id in self.customers.keys() 
            if customer_id not in assigned_customers
        ]
        
        if not unassigned_customers:
            self.logger.success("🎯 100% COVERAGE ACHIEVED!")
            return weekly_schedule
        
        self.logger.warning(f"⚠️ {len(unassigned_customers)} customers unassigned - using available capacity...")
        
        # Find teams with available capacity (avoid hardcoding specific days)
        available_capacity = []
        for day_name in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']:
            for team_number in self.teams.get(day_name, {}).keys():
                current_workload = self._calculate_team_current_workload(day_name, team_number, weekly_schedule)
                available_minutes = 600 - current_workload  # Conservative 10-hour limit
                
                if available_minutes > 100:  # Team has meaningful capacity left
                    available_capacity.append({
                        'day': day_name,
                        'team': team_number,
                        'available_minutes': available_minutes,
                        'current_workload': current_workload
                    })
        
        # Sort by most available capacity first
        available_capacity.sort(key=lambda x: x['available_minutes'], reverse=True)
        
        self.logger.info(f"📊 Found {len(available_capacity)} teams with available capacity")
        
        # Assign unassigned customers to teams with most capacity
        for customer_id in unassigned_customers:
            assigned = False
            
            for capacity_option in available_capacity:
                day_name = capacity_option['day']
                team_number = capacity_option['team']
                
                # Check if customer is available on this day
                if day_name not in self.customers[customer_id]['available_days']:
                    continue
                
                # Check if team still has capacity
                service_time = self._get_service_time(customer_id)
                if capacity_option['available_minutes'] >= service_time + 25:  # +25 for travel
                    
                    # Assign customer
                    assignment = {
                        'customer_id': customer_id,
                        'team_number': team_number,
                        'service_duration': service_time,
                        'start_time_str': '08:00',
                        'end_time_str': '09:30',
                        'start_time_minutes': 480
                    }
                    weekly_schedule[day_name].append(assignment)
                    
                    # Update available capacity
                    capacity_option['available_minutes'] -= (service_time + 25)
                    assigned = True
                    
                    self.logger.info(f"✅ AUTO-ASSIGNED: {customer_id} → {day_name} Team {team_number} (using available capacity)")
                    break
            
            if not assigned:
                self.logger.error(f"❌ Could not find capacity for {customer_id}")
        
        # Final coverage check
        total_assigned = sum(len(daily_schedule) for daily_schedule in weekly_schedule.values())
        coverage_pct = (total_assigned / len(self.customers)) * 100
        
        if coverage_pct >= 99.5:
            self.logger.success(f"🎯 100% COVERAGE ACHIEVED! ({coverage_pct:.1f}%)")
        else:
            self.logger.error(f"❌ Only {coverage_pct:.1f}% coverage - insufficient capacity")
        
        return weekly_schedule
    
    def calculate_total_weekly_travel(self, weekly_schedule):
        """Calculate total travel time for entire week"""
        total_travel = 0
        
        for day_name, daily_schedule in weekly_schedule.items():
            # Group by team
            teams = defaultdict(list)
            for assignment in daily_schedule:
                teams[assignment['team_number']].append(assignment['customer_id'])
            
            # Calculate travel for each team
            for team_customers in teams.values():
                if team_customers:
                    team_travel = self._calculate_cluster_total_travel(team_customers)
                    total_travel += team_travel
        
        return total_travel
    
    def optimize_daily_routes(self, day_name, daily_assignments):
        """Daily route optimization with OR-Tools option and fallback"""
        
        if not USE_ORTOOLS:
            return self.optimize_daily_routes_original(day_name, daily_assignments)
        
        try:
            self.logger.info(f"🚀 Attempting OR-Tools VRP for {day_name}...")
            return self.optimize_daily_routes_with_vrp(day_name, daily_assignments)
            
        except Exception as e:
            self.logger.warning(f"⚠️ OR-Tools VRP failed for {day_name}: {str(e)[:100]}...")
            self.logger.info("🔄 Falling back to original route optimization")
            return self.optimize_daily_routes_original(day_name, daily_assignments)
    
    def optimize_daily_routes_original(self, day_name, daily_assignments):
        """Original nearest neighbor route optimization (fallback)"""
        
        if not daily_assignments:
            return []
        
        # Group assignments by team
        team_assignments = defaultdict(list)
        for assignment in daily_assignments:
            team_assignments[assignment['team_number']].append(assignment)
        
        self.logger.info(f"   Optimizing {len(team_assignments)} teams separately")
        
        optimized_results = []
        
        # Optimize each team's route separately
        for team_number, team_customers in team_assignments.items():
            if not team_customers:
                continue
            
            # Use simple sequential scheduling
            team_schedule = self._create_simple_team_schedule(team_number, team_customers)
            optimized_results.extend(team_schedule)
        
        # Sort by team and start time
        optimized_results.sort(key=lambda x: (x['team_number'], x['start_time_minutes']))
        
        return optimized_results
    
    def _create_simple_team_schedule(self, team_number, team_customers):
        """Create simple sequential schedule for team"""
        
        # Find optimal route order
        customer_ids = [c['customer_id'] for c in team_customers]
        route_order = self._nearest_neighbor_route(customer_ids)
        
        # Create sequential schedule
        current_time = self.franchise_info['working_minutes_start']  # 8:30 AM
        schedule = []

        for i, customer_id in enumerate(route_order):
            # Find customer data
            customer_data = next(c for c in team_customers if c['customer_id'] == customer_id)
            service_duration = customer_data['service_duration']
            
            # ADD TRAVEL TIME FROM FRANCHISE TO FIRST CUSTOMER
            if i == 0:
                # First customer: add travel time from franchise
                travel_from_franchise = self._get_travel_time_between_customers('Franchise_Office', customer_id)
                current_time += travel_from_franchise
            
            start_time = current_time
            end_time = start_time + service_duration
            
            # UPDATED TIME CHECK for 6:30 PM limit
            if end_time > 18.5 * 60:  # Past 6:30 PM
                self.logger.warning(f"⚠️ {customer_id} cannot fit before 6:30 PM (would end at {end_time//60}:{end_time%60:02d}), stopping team schedule")
                break  # Stop scheduling more customers for this team
            
            # Format times
            start_hours = int(start_time // 60)
            start_mins = int(start_time % 60)
            end_hours = int(end_time // 60)
            end_mins = int(end_time % 60)
            
            assignment = {
                'customer_id': customer_id,
                'team_number': team_number,
                'start_time_str': f"{start_hours:02d}:{start_mins:02d}",
                'end_time_str': f"{end_hours:02d}:{end_mins:02d}",
                'service_duration': service_duration,
                'start_time_minutes': start_time
            }
            
            schedule.append(assignment)
            
            # Next customer starts after service + travel time
            if len(route_order) > 1:
                next_customer_idx = route_order.index(customer_id) + 1
                if next_customer_idx < len(route_order):
                    next_customer = route_order[next_customer_idx]
                    travel_time = self._get_travel_time_between_customers(customer_id, next_customer)
                    current_time = end_time + travel_time
                else:
                    current_time = end_time + 30  # Default travel time
            else:
                current_time = end_time + 30
        
        return schedule
    
    # Helper functions
    def _get_travel_time_between_customers(self, customer1, customer2):
        """Get travel time between two customers from matrix"""
        try:
            if customer1 in self.time_matrix_df.columns and customer2 in self.time_matrix_df.columns:
                idx1 = list(self.time_matrix_df.columns).index(customer1)
                idx2 = list(self.time_matrix_df.columns).index(customer2)
                return int(self.time_matrix[idx1][idx2])
        except:
            pass
        return 25  # Default travel time
    
    def _get_service_time(self, customer_id):
        """Get service time for customer"""
        for cleaning in self.cleanings:
            if cleaning['customer_id'] == customer_id:
                return cleaning['service_duration_minutes']
        return 90  # Default
    
    # OR-Tools placeholder methods
    def _check_assignment_feasibility(self):
        """Quick feasibility check before trying OR-Tools"""
        
        total_service_time = sum(self._get_service_time(c) for c in self.customers.keys())
        total_team_capacity = 0
        
        for day_name, teams in self.teams.items():
            for team_number, team_data in teams.items():
                total_team_capacity += team_data['capacity_minutes']
        
        # Need at least 1.5x capacity for travel time
        required_capacity = total_service_time * 1.5
        
        if required_capacity > total_team_capacity:
            self.logger.error(f"❌ INFEASIBLE: Need {required_capacity:.0f} min capacity, have {total_team_capacity:.0f}")
            return False
        
        self.logger.info(f"✅ Feasibility check passed: {len(self.customers)} customers, {total_team_capacity:.0f} min capacity")
        return True

    def assign_customers_weekly_with_cpsat(self):
        """Option 1: PURE 100% Coverage with Real Travel Times"""
        
        self.logger.info("🚀 Running Option 1: PURE Travel-Aware CP-SAT (No Artificial Limits)")
        
        try:
            model = cp_model.CpModel()
            
            customers = list(self.customers.keys())
            self.logger.info(f"📊 Assigning ALL {len(customers)} customers with REAL travel times")
            
            # DECISION VARIABLES: x[customer][day][team] = 1 if assigned
            assignment_vars = {}
            valid_assignments = []
            
            for customer_id in customers:
                available_days = self.customers[customer_id]['available_days']
                for day_name in available_days:
                    if day_name in self.teams:
                        for team_number in self.teams[day_name].keys():
                            key = (customer_id, day_name, team_number)
                            assignment_vars[key] = model.NewBoolVar(f"assign_{customer_id}_{day_name}_{team_number}")
                            
                            # PRE-CALCULATE real travel time for this customer
                            real_travel_time = self._get_travel_time_between_customers('Franchise_Office', customer_id)
                            service_time = self._get_service_time(customer_id)
                            
                            valid_assignments.append({
                                'customer': customer_id,
                                'day': day_name, 
                                'team': team_number,
                                'service_time': service_time,
                                'real_travel_time': real_travel_time,
                                'total_workload': service_time + real_travel_time  # REAL calculation
                            })
            
            self.logger.info(f"📊 Generated {len(assignment_vars)} assignment variables with REAL travel data")
            
            # CONSTRAINT 1: Each customer assigned EXACTLY once (100% coverage)
            for customer_id in customers:
                customer_vars = [assignment_vars[key] for key in assignment_vars.keys() if key[0] == customer_id]
                if customer_vars:
                    model.Add(sum(customer_vars) == 1)  # EXACTLY one assignment
            
            # CONSTRAINT 2: Team capacity with REAL travel times (NO artificial limits)
            for day_name in self.teams:
                for team_number in self.teams[day_name]:
                    team_workload = []
                    
                    for assignment in valid_assignments:
                        if assignment['day'] == day_name and assignment['team'] == team_number:
                            key = (assignment['customer'], assignment['day'], assignment['team'])
                            # USE REAL PRE-CALCULATED WORKLOAD
                            team_workload.append(assignment_vars[key] * assignment['total_workload'])
                    
                    if team_workload:
                        # Extended capacity: 12 hours = 720 minutes
                        model.Add(sum(team_workload) <= 720)
            
            # NO DAILY DISTRIBUTION LIMITS - Let CP-SAT optimize naturally!
            
            # OBJECTIVE: Minimize total travel time (coverage guaranteed by constraints)
            travel_terms = []
            
            for assignment in valid_assignments:
                key = (assignment['customer'], assignment['day'], assignment['team'])
                var = assignment_vars[key]
                
                # Use REAL travel time in objective
                travel_terms.append(var * assignment['real_travel_time'])
            
            model.Minimize(sum(travel_terms))  # Pure travel time minimization
            
            # SOLVER CONFIGURATION
            solver = cp_model.CpSolver()
            solver.parameters.max_time_in_seconds = 300  # 5 minutes for complex problem
            solver.parameters.num_search_workers = 8
            solver.parameters.log_search_progress = False
            
            # SOLVE
            self.logger.info("🔄 Solving PURE CP-SAT with real travel times...")
            status = solver.Solve(model)
            
            if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
                # Extract solution
                weekly_schedule = {
                    'monday': [], 'tuesday': [], 'wednesday': [], 'thursday': [], 
                    'friday': [], 'saturday': [], 'sunday': []
                }
                
                total_assigned = 0
                total_travel_time = 0
                
                for key, var in assignment_vars.items():
                    if solver.Value(var) == 1:
                        customer_id, day_name, team_number = key
                        
                        # Find the assignment data
                        assignment_data = next(a for a in valid_assignments 
                                             if a['customer'] == customer_id and 
                                                a['day'] == day_name and 
                                                a['team'] == team_number)
                        
                        assignment = {
                            'customer_id': customer_id,
                            'team_number': team_number,
                            'service_duration': assignment_data['service_time'],
                            'travel_time': assignment_data['real_travel_time'],  # Store real travel time
                            'start_time_str': '08:00',
                            'end_time_str': '09:30', 
                            'start_time_minutes': 480
                        }
                        weekly_schedule[day_name].append(assignment)
                        total_assigned += 1
                        total_travel_time += assignment_data['real_travel_time']
                
                # Log results with REAL metrics
                coverage_pct = (total_assigned / len(customers)) * 100
                solve_time = solver.WallTime()
                avg_travel_per_customer = total_travel_time / total_assigned if total_assigned > 0 else 0
                
                # Daily distribution analysis
                daily_counts = {day: len(schedule) for day, schedule in weekly_schedule.items()}
                
                self.logger.success(f"✅ PURE CP-SAT Results:")
                self.logger.info(f"   📊 Assigned {total_assigned}/{len(customers)} customers ({coverage_pct:.1f}% coverage)")
                self.logger.info(f"   🚗 Total travel time: {total_travel_time} minutes ({total_travel_time/60:.1f} hours)")
                self.logger.info(f"   🎯 Average travel per customer: {avg_travel_per_customer:.1f} minutes")
                self.logger.info(f"   ⏱️ Solve time: {solve_time:.2f} seconds")
                self.logger.info(f"   📅 Daily distribution: {daily_counts}")
                
                return weekly_schedule
            
            else:
                raise Exception(f"CP-SAT failed with status: {solver.StatusName(status)}")
        
        except Exception as e:
            self.logger.error(f"PURE CP-SAT failed: {e}")
            raise

    def _assign_clusters_with_cpsat(self, enhanced_clusters):
        """Use CP-SAT to optimally assign clusters to day-team combinations"""
        
        self.logger.section("🧠 CP-SAT Cluster Assignment Optimization")
        
        model = cp_model.CpModel()
        
        # Decision variables: cluster_assigned[cluster_id][day][team] = 1 if assigned
        cluster_vars = {}
        
        # Build valid assignments (only for days when all customers available)
        for cluster in enhanced_clusters:
            cluster_id = cluster['id']
            available_days = cluster['common_available_days']
            
            for day_name in available_days:
                if day_name in self.teams:
                    for team_number in self.teams[day_name]:
                        # Check if cluster can fit in team's daily capacity
                        if cluster['total_time'] <= 570:  # Team daily limit
                            key = (cluster_id, day_name, team_number)
                            cluster_vars[key] = model.NewBoolVar(f"cluster_{cluster_id}_{day_name}_{team_number}")
        
        self.logger.info(f"📊 Generated {len(cluster_vars)} valid cluster assignment combinations")
        self.logger.info(f"🔄 Variable reduction: {len(cluster_vars)} vs ~6400 in individual assignment")
        
        # CONSTRAINT 1: Each cluster assigned to at most one day-team
        for cluster in enhanced_clusters:
            cluster_id = cluster['id']
            cluster_assignments = [cluster_vars[key] for key in cluster_vars.keys() 
                                 if key[0] == cluster_id]
            
            if cluster_assignments:  # Only if cluster has valid assignments
                model.Add(sum(cluster_assignments) <= 1)  # At most one assignment
        
        # CONSTRAINT 2: Team daily capacity limits
        for day_name in self.teams:
            for team_number in self.teams[day_name]:
                team_workload = []
                
                for cluster in enhanced_clusters:
                    cluster_id = cluster['id']
                    key = (cluster_id, day_name, team_number)
                    
                    if key in cluster_vars:
                        # Use precise pre-calculated cluster total time
                        team_workload.append(cluster_vars[key] * cluster['total_time'])
                
                if team_workload:
                    # FIXED: More realistic limit to allow proper cluster assignment
                    model.Add(sum(team_workload) <= 600)  # 600 minutes = realistic for 10-hour operations
        
        # CONSTRAINT 3: Prevent team overloading (max 2 clusters per team per day)
        for day_name in self.teams:
            for team_number in self.teams[day_name]:
                clusters_per_team = []
                
                for cluster in enhanced_clusters:
                    cluster_id = cluster['id']
                    key = (cluster_id, day_name, team_number)
                    
                    if key in cluster_vars:
                        clusters_per_team.append(cluster_vars[key])
                
                if len(clusters_per_team) > 2:  # Only add constraint if more than 2 clusters possible
                    model.Add(sum(clusters_per_team) <= 2)  # Max 2 clusters per team
        
        # OBJECTIVE: Multi-criteria optimization
        coverage_weight = 1000   # Very high weight for customer coverage
        efficiency_weight = 10   # Medium weight for efficiency
        travel_weight = 1        # Lower weight for raw travel time
        
        objective_terms = []
        
        for cluster in enhanced_clusters:
            cluster_id = cluster['id']
            
            for key in cluster_vars.keys():
                if key[0] == cluster_id:
                    var = cluster_vars[key]
                    
                    # Coverage benefit (customers scheduled)
                    coverage_benefit = var * cluster['size'] * coverage_weight
                    objective_terms.append(coverage_benefit)
                    
                    # Efficiency benefit (higher efficiency = lower penalty)
                    efficiency_penalty = var * (100 - cluster['efficiency_pct']) * efficiency_weight
                    objective_terms.append(-efficiency_penalty)  # Negative because we minimize
                    
                    # Travel cost (lower travel time preferred)
                    travel_cost = var * cluster['total_travel_time'] * travel_weight
                    objective_terms.append(-travel_cost)  # Negative because we minimize
        
        # Maximize coverage and efficiency, minimize travel
        model.Maximize(sum(objective_terms))
        
        # SOLVER CONFIGURATION
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 60  # 1 minute limit (vs 300 before)
        solver.parameters.num_search_workers = 4    # Parallel search
        solver.parameters.log_search_progress = False
        
        # SOLVE
        self.logger.info("🔄 Solving CP-SAT cluster assignment model...")
        status = solver.Solve(model)
        
        # EXTRACT SOLUTION
        if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            cluster_assignments = {}
            total_customers_assigned = 0
            total_clusters_assigned = 0
            
            for key, var in cluster_vars.items():
                if solver.Value(var) == 1:
                    cluster_id, day_name, team_number = key
                    cluster = enhanced_clusters[cluster_id]
                    
                    cluster_assignments[key] = cluster
                    total_customers_assigned += cluster['size']
                    total_clusters_assigned += 1
            
            # Log results
            coverage_pct = (total_customers_assigned / len(self.customers)) * 100
            objective_value = solver.ObjectiveValue()
            solve_time = solver.WallTime()
            
            self.logger.success(f"✅ CP-SAT Cluster Assignment Results:")
            self.logger.info(f"   📊 Assigned {total_clusters_assigned} clusters covering {total_customers_assigned} customers ({coverage_pct:.1f}%)")
            self.logger.info(f"   🎯 Objective value: {objective_value}")
            self.logger.info(f"   ⏱️ Solve time: {solve_time:.2f} seconds")
            
            return cluster_assignments
            
        else:
            self.logger.error(f"❌ CP-SAT failed with status: {solver.StatusName(status)}")
            raise Exception("CP-SAT cluster assignment failed")

    def _optimize_assigned_cluster_routes(self, cluster_assignments):
        """Final route optimization for assigned clusters"""
        
        self.logger.section("🛣️ Optimizing Routes for Assigned Clusters")
        
        weekly_schedule = {
            'monday': [], 'tuesday': [], 'wednesday': [], 'thursday': [], 
            'friday': [], 'saturday': [], 'sunday': []
        }
        
        for day_name in weekly_schedule.keys():
            # Group clusters by team for this day
            day_teams = defaultdict(list)
            for (cluster_id, assigned_day, team_number), cluster in cluster_assignments.items():
                if assigned_day == day_name:
                    day_teams[team_number].append(cluster)
            
            if day_teams:
                self.logger.info(f"📅 {day_name.capitalize()}: {len(day_teams)} teams with assigned clusters")
            
            # Optimize each team's route
            for team_number, team_clusters in day_teams.items():
                team_schedule = self._optimize_multi_cluster_team_route(team_number, team_clusters, day_name)
                weekly_schedule[day_name].extend(team_schedule)
        
        return weekly_schedule

    def _optimize_multi_cluster_team_route(self, team_number, team_clusters, day_name):
        """Optimize route for team with assigned clusters"""
        
        if not team_clusters:
            return []
        
        if len(team_clusters) == 1:
            # Single cluster - use pre-calculated optimal route
            cluster = team_clusters[0]
            self.logger.info(f"   👥 Team {team_number}: 1 cluster, {cluster['size']} customers")
            return self._create_schedule_from_route(team_number, cluster['optimal_route'])
        
        else:
            # Multiple clusters - re-optimize combined route
            all_customers = []
            for cluster in team_clusters:
                all_customers.extend(cluster['customers'])
            
            self.logger.info(f"   👥 Team {team_number}: {len(team_clusters)} clusters combined, {len(all_customers)} customers")
            
            # Re-optimize combined route (may be better than separate cluster routes)
            optimal_route = self._nearest_neighbor_route(all_customers)
            return self._create_schedule_from_route(team_number, optimal_route)

    def _create_schedule_from_route(self, team_number, route_order):
        """Create time-based schedule from route order"""
        
        current_time = self.franchise_info['working_minutes_start']  # 8:30 AM
        schedule = []
        
        for i, customer_id in enumerate(route_order):
            # Add travel time
            if i == 0:
                # Travel from franchise to first customer
                travel_time = self._get_travel_time_between_customers('Franchise_Office', customer_id)
            else:
                # Travel from previous customer
                prev_customer = route_order[i-1]
                travel_time = self._get_travel_time_between_customers(prev_customer, customer_id)
            
            current_time += travel_time
            start_time = current_time
            
            # Add service time
            service_duration = self._get_service_time(customer_id)
            end_time = start_time + service_duration
            
            # Check if we exceed working hours
            if end_time > 18.5 * 60:  # Past 6:30 PM
                self.logger.warning(f"      ⚠️ {customer_id} would finish after 6:30 PM, stopping team schedule")
                break
            
            # Create assignment
            assignment = {
                'customer_id': customer_id,
                'team_number': team_number,
                'start_time_str': f"{start_time//60:02d}:{start_time%60:02d}",
                'end_time_str': f"{end_time//60:02d}:{end_time%60:02d}",
                'service_duration': service_duration,
                'start_time_minutes': start_time
            }
            
            schedule.append(assignment)
            current_time = end_time
        
        return schedule

    def optimize_daily_routes_with_vrp(self, day_name, daily_assignments):
        """VRP optimal route optimization with dropped customer recovery"""
        
        if not daily_assignments:
            return []
        
        self.logger.info(f"🚛 Running VRP optimization for {day_name}...")
        
        # Track customers before VRP to detect drops
        customers_before = set(assignment['customer_id'] for assignment in daily_assignments)
        
        # Group assignments by team
        team_assignments = defaultdict(list)
        for assignment in daily_assignments:
            team_assignments[assignment['team_number']].append(assignment)
        
        optimized_results = []
        
        for team_number, team_customers in team_assignments.items():
            if len(team_customers) <= 1:
                # Single customer - use simple scheduling
                optimized_results.extend(self._schedule_single_customer_vrp(team_number, team_customers))
                continue
            
            self.logger.info(f"   🔧 VRP optimizing Team {team_number}: {len(team_customers)} customers")
            
            # Run VRP for this team
            try:
                vrp_result = self._solve_team_vrp(team_number, team_customers, day_name)
                if vrp_result:
                    optimized_results.extend(vrp_result)
                else:
                    # Fallback to simple scheduling
                    self.logger.warning(f"   ⚠️ VRP failed for Team {team_number}, using simple scheduling")
                    optimized_results.extend(self._schedule_team_simple_vrp(team_number, team_customers))
            
            except Exception as e:
                self.logger.warning(f"   ⚠️ VRP error for Team {team_number}: {e}")
                optimized_results.extend(self._schedule_team_simple_vrp(team_number, team_customers))
        
        # CHECK FOR DROPPED CUSTOMERS AND AUTO-REASSIGN
        customers_after = set(assignment['customer_id'] for assignment in optimized_results)
        dropped_customers = customers_before - customers_after
        
        if dropped_customers:
            self.logger.warning(f"⚠️ VRP dropped {len(dropped_customers)} customers due to time constraints")
            
            # Auto-reassign dropped customers
            for dropped_customer in dropped_customers:
                # Find the original assignment data
                original_assignment = next(a for a in daily_assignments if a['customer_id'] == dropped_customer)
                
                # Try to reassign to a different team with capacity
                reassigned = self._reassign_dropped_customer(dropped_customer, original_assignment, day_name)
                
                if reassigned:
                    optimized_results.append(reassigned)
                    self.logger.info(f"✅ AUTO-REASSIGNED dropped customer: {dropped_customer} → {day_name} Team {reassigned['team_number']}")
                else:
                    # Try to reassign to different day
                    cross_day_reassigned = self._reassign_dropped_customer_cross_day(dropped_customer, original_assignment)
                    if cross_day_reassigned:
                        # Add to different day's schedule (will be processed later)
                        target_day = cross_day_reassigned['target_day']
                        if target_day not in self.optimized_schedule:
                            self.optimized_schedule[target_day] = []
                        self.optimized_schedule[target_day].append(cross_day_reassigned['assignment'])
                        self.logger.info(f"✅ CROSS-DAY REASSIGNED: {dropped_customer} → {target_day}")
                    else:
                        self.logger.error(f"❌ Could not reassign dropped customer: {dropped_customer}")
        
        return optimized_results

    def _solve_team_vrp(self, team_number, team_customers, day_name):
        """Solve VRP for single team using OR-Tools"""
        
        try:
            # Prepare VRP data
            customer_ids = [c['customer_id'] for c in team_customers]
            locations = ['Franchise_Office'] + customer_ids
            num_locations = len(locations)
            
            # Build time matrix from existing matrix data
            time_matrix = []
            for from_loc in locations:
                row = []
                for to_loc in locations:
                    if from_loc == to_loc:
                        row.append(0)
                    else:
                        travel_time = self._get_travel_time_between_customers(from_loc, to_loc)
                        row.append(max(1, travel_time))  # Ensure positive times
                time_matrix.append(row)
            
            # Service times (0 for depot, actual times for customers)
            service_times = [0]  # Franchise office has no service time
            for customer in team_customers:
                service_times.append(customer['service_duration'])
            
            # Create VRP model
            manager = pywrapcp.RoutingIndexManager(num_locations, 1, 0)  # 1 vehicle, depot at index 0
            routing = pywrapcp.RoutingModel(manager)
            
            # Travel time callback
            def time_callback(from_index, to_index):
                from_node = manager.IndexToNode(from_index)
                to_node = manager.IndexToNode(to_index)
                return time_matrix[from_node][to_node]
            
            time_callback_index = routing.RegisterTransitCallback(time_callback)
            routing.SetArcCostEvaluatorOfAllVehicles(time_callback_index)
            
            # Service time callback
            def service_callback(from_index):
                node = manager.IndexToNode(from_index)
                return service_times[node]
            
            service_callback_index = routing.RegisterUnaryTransitCallback(service_callback)
            
            # Add capacity constraint (total work time including service and travel)
            routing.AddDimensionWithVehicleCapacity(
                service_callback_index,
                0,  # No slack
                [600],  # Max 600 minutes per team (10 hours)
                True,  # Start cumul to zero
                'Capacity'
            )
            
            # Add time windows (8:30 AM to 6:30 PM)
            routing.AddDimension(
                time_callback_index,
                60,  # 60 minutes slack for scheduling flexibility
                int(18.5 * 60),  # 6:30 PM end time (1110 minutes)
                False,  # Don't start cumul to zero
                'Time'
            )
            
            time_dimension = routing.GetDimensionOrDie('Time')
            
            # Set time windows for all locations
            for location_idx in range(num_locations):
                index = manager.NodeToIndex(location_idx)
                time_dimension.CumulVar(index).SetRange(
                    self.franchise_info['working_minutes_start'],  # 8:30 AM
                    int(18.5 * 60)  # 6:30 PM (1110 minutes)
                )
            
            # Search parameters
            search_parameters = pywrapcp.DefaultRoutingSearchParameters()
            search_parameters.first_solution_strategy = (
                routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
            )
            search_parameters.local_search_metaheuristic = (
                routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
            )
            search_parameters.time_limit.FromSeconds(30)  # 30 second limit per team
            
            # Solve
            solution = routing.SolveWithParameters(search_parameters)
            
            if solution:
                return self._extract_vrp_schedule(routing, manager, solution, locations, team_customers, team_number)
            else:
                return None
                
        except Exception as e:
            self.logger.debug(f"VRP solver error: {e}")
            return None

    def _extract_vrp_schedule(self, routing, manager, solution, locations, team_customers, team_number):
        """Extract VRP solution to schedule format"""
        
        # Get optimal route order
        route_order = []
        index = routing.Start(0)
        
        while not routing.IsEnd(index):
            node_index = manager.IndexToNode(index)
            if node_index != 0:  # Skip depot
                customer_id = locations[node_index]
                route_order.append(customer_id)
            index = solution.Value(routing.NextVar(index))
        
        # Create schedule with optimal timing
        schedule = []
        current_time = self.franchise_info['working_minutes_start']
        
        for i, customer_id in enumerate(route_order):
            # Find customer data
            customer_data = next(c for c in team_customers if c['customer_id'] == customer_id)
            
            # Add travel time
            if i == 0:
                travel_time = self._get_travel_time_between_customers('Franchise_Office', customer_id)
            else:
                prev_customer = route_order[i-1]
                travel_time = self._get_travel_time_between_customers(prev_customer, customer_id)
            
            current_time += travel_time
            start_time = current_time
            end_time = start_time + customer_data['service_duration']
            
            # Time validation
            if end_time > 18.5 * 60:  # Past 6:30 PM
                self.logger.warning(f"   ⚠️ VRP: {customer_id} would finish after 6:30 PM, stopping")
                break
            
            assignment = {
                'customer_id': customer_id,
                'team_number': team_number,
                'start_time_str': f"{start_time//60:02d}:{start_time%60:02d}",
                'end_time_str': f"{end_time//60:02d}:{end_time%60:02d}",
                'service_duration': customer_data['service_duration'],
                'start_time_minutes': start_time
            }
            
            schedule.append(assignment)
            current_time = end_time
        
        # Log VRP results
        total_travel_time = sum(
            self._get_travel_time_between_customers(route_order[i-1] if i > 0 else 'Franchise_Office', route_order[i])
            for i in range(len(route_order))
        ) + (self._get_travel_time_between_customers(route_order[-1], 'Franchise_Office') if route_order else 0)
        
        total_service_time = sum(c['service_duration'] for c in team_customers)
        efficiency = (total_service_time / (total_service_time + total_travel_time)) * 100 if total_travel_time > 0 else 100
        
        self.logger.info(f"   ✅ VRP Team {team_number}: {len(schedule)} customers scheduled, "
                        f"{total_travel_time} min travel, {efficiency:.1f}% efficiency")
        
        return schedule

    def _schedule_single_customer_vrp(self, team_number, team_customers):
        """Simple scheduling for single customer"""
        if not team_customers:
            return []
        
        customer = team_customers[0]
        travel_time = self._get_travel_time_between_customers('Franchise_Office', customer['customer_id'])
        start_time = self.franchise_info['working_minutes_start'] + travel_time
        end_time = start_time + customer['service_duration']
        
        return [{
            'customer_id': customer['customer_id'],
            'team_number': team_number,
            'start_time_str': f"{start_time//60:02d}:{start_time%60:02d}",
            'end_time_str': f"{end_time//60:02d}:{end_time%60:02d}",
            'service_duration': customer['service_duration'],
            'start_time_minutes': start_time
        }]

    def _reassign_dropped_customer(self, customer_id, original_assignment, day_name):
        """Reassign dropped customer to team with MINIMUM travel impact"""
        
        service_time = original_assignment['service_duration']
        
        # Find ALL teams with capacity, calculate travel impact for each
        candidate_teams = []
        
        for team_number in self.teams[day_name].keys():
            if team_number == original_assignment['team_number']:
                continue  # Skip the team that dropped this customer
            
            # Get current team customers
            team_current_customers = [
                r['customer_id'] for r in self.optimized_schedule.get(day_name, []) 
                if r['team_number'] == team_number
            ]
            
            # Conservative capacity check
            if len(team_current_customers) <= 2:  # Team has capacity
                
                # Calculate travel impact of adding this customer
                current_travel = self._calculate_cluster_total_travel(team_current_customers) if team_current_customers else 0
                new_travel = self._calculate_cluster_total_travel(team_current_customers + [customer_id])
                travel_impact = new_travel - current_travel
                
                # Time feasibility check
                estimated_total_time = sum(self._get_service_time(c) for c in team_current_customers) + service_time + new_travel
                
                if estimated_total_time <= 600:  # 10 hours max
                    candidate_teams.append({
                        'team_number': team_number,
                        'travel_impact': travel_impact,
                        'current_customers': len(team_current_customers)
                    })
        
        # Pick team with MINIMUM travel impact
        if candidate_teams:
            best_team = min(candidate_teams, key=lambda x: x['travel_impact'])
            
            # Create optimized assignment
            travel_time = self._get_travel_time_between_customers('Franchise_Office', customer_id)
            start_time = self.franchise_info['working_minutes_start'] + travel_time + (best_team['current_customers'] * 120)
            end_time = start_time + service_time
            
            return {
                'customer_id': customer_id,
                'team_number': best_team['team_number'],
                'start_time_str': f"{start_time//60:02d}:{start_time%60:02d}",
                'end_time_str': f"{end_time//60:02d}:{end_time%60:02d}",
                'service_duration': service_time,
                'start_time_minutes': start_time
            }
        
        return None

    def _reassign_dropped_customer_cross_day(self, customer_id, original_assignment):
        """Try to reassign dropped customer to a different day with capacity"""
        
        if customer_id not in self.customers:
            return None
        
        available_days = self.customers[customer_id]['available_days']
        service_time = original_assignment['service_duration']
        
        # Try each available day
        for target_day in available_days:
            if target_day == original_assignment.get('current_day', ''):
                continue  # Skip current day
            
            # Find team with least customers on target day
            min_customers = float('inf')
            best_team = None
            
            for team_number in self.teams[target_day].keys():
                team_current_customers = [
                    r['customer_id'] for r in self.optimized_schedule.get(target_day, []) 
                    if r['team_number'] == team_number
                ]
                
                if len(team_current_customers) < min_customers and len(team_current_customers) <= 3:
                    min_customers = len(team_current_customers)
                    best_team = team_number
            
            if best_team is not None:
                # Create assignment for target day
                travel_time = self._get_travel_time_between_customers('Franchise_Office', customer_id)
                start_time = self.franchise_info['working_minutes_start'] + travel_time + (min_customers * 120)
                end_time = start_time + service_time
                
                if end_time <= 18.5 * 60:  # Must finish by 6:30 PM
                    return {
                        'target_day': target_day,
                        'assignment': {
                            'customer_id': customer_id,
                            'team_number': best_team,
                            'start_time_str': f"{start_time//60:02d}:{start_time%60:02d}",
                            'end_time_str': f"{end_time//60:02d}:{end_time%60:02d}",
                            'service_duration': service_time,
                            'start_time_minutes': start_time
                        }
                    }
        
        return None

    def _schedule_team_simple_vrp(self, team_number, team_customers):
        """Fallback simple scheduling when VRP fails"""
        # Use existing simple scheduling method
        return self._create_simple_team_schedule(team_number, team_customers)
    
    def generate_results_analysis(self):
        """Generate detailed analysis with REAL travel metrics"""
        self.logger.section("Generating Weekly Optimization Analysis")
        
        total_customers = 0
        scheduled_customers = 0
        daily_travel_times = {}
        daily_team_counts = {}
        
        # Calculate real travel metrics for each day
        for day_name, daily_schedule in self.optimized_schedule.items():
            day_customers = len(daily_schedule)
            total_customers += day_customers
            scheduled_customers += day_customers
            
            if day_customers > 0:
                # Group by team for travel calculation
                teams = defaultdict(list)
                for assignment in daily_schedule:
                    teams[assignment['team_number']].append(assignment['customer_id'])
                
                # Calculate real travel time for this day
                day_travel_time = 0
                for team_customers in teams.values():
                    if team_customers:
                        team_travel = self._calculate_cluster_total_travel(team_customers)
                        day_travel_time += team_travel
                
                daily_travel_times[day_name] = day_travel_time
                daily_team_counts[day_name] = len(teams)
                
                self.logger.info(f"📅 {day_name.capitalize()}: {day_customers} customers across {len(teams)} teams")
            else:
                daily_travel_times[day_name] = 0
                daily_team_counts[day_name] = 0
        
        # Calculate totals and averages
        total_travel_time = sum(daily_travel_times.values())
        total_teams_used = sum(daily_team_counts.values())
        working_days = sum(1 for count in daily_team_counts.values() if count > 0)
        
        original_customers = len(self.cleanings)
        coverage_pct = (scheduled_customers / original_customers) * 100 if original_customers > 0 else 0
        
        # Basic summary
        self.logger.success("📊 WEEKLY OPTIMIZATION SUMMARY")
        self.logger.info(f"🎯 Original customers: {original_customers}")
        self.logger.info(f"✅ Scheduled customers: {scheduled_customers}")
        self.logger.info(f"📈 Coverage: {coverage_pct:.1f}%")
        self.logger.info(f"📅 Working days: {working_days}")
        
        # DETAILED TRAVEL ANALYSIS
        self.logger.section("🚗 DETAILED TRAVEL TIME ANALYSIS")
        
        self.logger.info("Daily Travel Time Breakdown:")
        for day_name in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']:
            travel_time = daily_travel_times.get(day_name, 0)
            team_count = daily_team_counts.get(day_name, 0)
            customer_count = len(self.optimized_schedule.get(day_name, []))
            
            if travel_time > 0:
                avg_per_team = travel_time / team_count if team_count > 0 else 0
                avg_per_customer = travel_time / customer_count if customer_count > 0 else 0
                self.logger.info(f"   🗓️  {day_name.capitalize():>9}: {travel_time:>4} min ({travel_time/60:>4.1f}h) | {team_count:>2} teams | {avg_per_team:>4.0f} min/team | {avg_per_customer:>4.0f} min/customer")
            else:
                self.logger.info(f"   🗓️  {day_name.capitalize():>9}: {travel_time:>4} min ({travel_time/60:>4.1f}h) | No operations")
        
        if total_travel_time > 0:
            self.logger.success(f"\n📊 WEEKLY TOTALS:")
            self.logger.success(f"   🚗 Total travel time: {total_travel_time} minutes ({total_travel_time/60:.1f} hours)")
            self.logger.success(f"   👥 Total teams used: {total_teams_used}")
            self.logger.success(f"   📈 Average per day: {total_travel_time/working_days:.0f} minutes ({total_travel_time/working_days/60:.1f} hours)")
            self.logger.success(f"   🎯 Average per team: {total_travel_time/total_teams_used:.0f} minutes")
            self.logger.success(f"   👤 Average per customer: {total_travel_time/scheduled_customers:.0f} minutes")
        
        if coverage_pct < 100:
            unscheduled = original_customers - scheduled_customers
            self.logger.warning(f"\n⚠️ {unscheduled} customers could not be scheduled (constraints)")
    
    def save_results(self):
        """Save optimized weekly schedule"""
        self.logger.section("Saving Travel-Optimized Weekly Schedule")
        
        schedule_records = []
        for day_name, daily_schedule in self.optimized_schedule.items():
            for assignment in daily_schedule:
                customer_id = assignment['customer_id']
                customer_data = self.customers.get(customer_id, {})
                
                record = {
                    'day_name': day_name,
                    'customer_id': customer_id,
                    'team_number': assignment['team_number'],
                    'start_time': assignment['start_time_str'],
                    'end_time': assignment['end_time_str'],
                    'service_duration_minutes': assignment['service_duration'],
                    'customer_address': customer_data.get('address', ''),
                    'customer_city': customer_data.get('city', '')
                }
                schedule_records.append(record)
        
        if schedule_records:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"travel_optimized_schedule_franchise_{self.franchise_id}_{timestamp}.csv"
            
            schedule_df = pd.DataFrame(schedule_records)
            schedule_df.to_csv(filename, index=False)
            
            self.logger.success(f"Travel-optimized schedule saved: {filename}")
            
            # Sample output
            self.logger.info("\n📋 SAMPLE TRAVEL-OPTIMIZED WEEKLY SCHEDULE:")
            for _, row in schedule_df.head(8).iterrows():
                self.logger.info(f"   {row['day_name']} Team {row['team_number']}: {row['start_time']}-{row['end_time']} | {row['customer_city']}")
        
        else:
            self.logger.warning("No schedule data to save")
    
    def clean_raw_data(self):
        """Clean raw CSV files using TCA data cleaning functionality"""
        self.logger.header("TCA DATA CLEANING WITH FRANCHISE & DATE FILTERS")
        
        try:
            self.logger.section("Setting up TCA Data Cleaning Integration")
            
            # Create temporary input folder structure for TCA cleaning script
            temp_input_folder = os.path.join(self.data_folder, "temp_input")
            if not os.path.exists(temp_input_folder):
                os.makedirs(temp_input_folder)
            
            # Map existing files to expected TCA cleaning script input names
            file_mapping = {
                "cleans.csv": "Cleans.csv",
                "customers.csv": "Customers.csv", 
                "teams.csv": "DailyTeamAssignment.csv",
                "franchises.csv": "Franchises.csv",
                "rooms.csv": "RequestRooms.csv"
            }
            
            self.logger.info("📋 Mapping files for TCA cleaning script:")
            for existing_file, expected_file in file_mapping.items():
                src_path = os.path.join(self.data_folder, existing_file)
                dst_path = os.path.join(temp_input_folder, expected_file)
                
                if os.path.exists(src_path):
                    shutil.copy2(src_path, dst_path)
                    self.logger.info(f"   ✅ {existing_file} → {expected_file}")
                else:
                    raise FileNotFoundError(f"Required input file not found: {src_path}")
            
            # Configure TCA cleaning parameters
            self.logger.section("Running TCA Data Cleaning with Filters")
            self.logger.info(f"🎯 Franchise Filter: {TARGET_FRANCHISE_ID}")
            self.logger.info(f"📅 Date Filter: {TARGET_WEEK_START} to {TARGET_WEEK_END}")
            
            # Call TCA cleaning function with configurable filters
            cleaned_data = clean_tca_data_csv(
                input_folder=temp_input_folder,
                output_folder=self.data_folder,  # Output directly to data files folder
                franchise_id=str(TARGET_FRANCHISE_ID),  # Use configured franchise
                start_date=TARGET_WEEK_START,           # Use configured start date
                end_date=TARGET_WEEK_END                # Use configured end date
            )
            
            # Verify cleaning completed successfully
            if cleaned_data and all(key in cleaned_data for key in ['master_cleans', 'customer_profiles', 'team_availability', 'franchise_info']):
                self.logger.success("✅ TCA Data Cleaning completed successfully!")
                
                # Report on cleaned data
                self.logger.section("📊 Cleaned Data Summary")
                self.logger.info(f"   Master Cleans: {len(cleaned_data['master_cleans'])} records")
                self.logger.info(f"   Customer Profiles: {len(cleaned_data['customer_profiles'])} records") 
                self.logger.info(f"   Team Availability: {len(cleaned_data['team_availability'])} records")
                self.logger.info(f"   Franchise Info: {len(cleaned_data['franchise_info'])} records")
            else:
                raise Exception("TCA cleaning function did not return expected data structure")
            
            # Clean up temporary input folder
            if os.path.exists(temp_input_folder):
                shutil.rmtree(temp_input_folder)
                self.logger.info("🧹 Cleaned up temporary files")
            
            self.logger.success("🎊 TCA DATA CLEANING INTEGRATION COMPLETED SUCCESSFULLY!")
            
        except Exception as e:
            self.logger.error(f"TCA data cleaning failed: {e}")
            self.logger.debug(f"Full traceback:\n{traceback.format_exc()}")
            
            # Clean up temporary folder on error
            temp_input_folder = os.path.join(self.data_folder, "temp_input")
            if os.path.exists(temp_input_folder):
                shutil.rmtree(temp_input_folder)
            
            raise


def main():
    """Main execution function"""
    print("TRAVEL-OPTIMIZED CLEANING SCHEDULER")
    print("=" * 50)
    
    data_folder = "data files"
    
    # Check for files based on whether we're cleaning raw data
    if CLEAN_RAW_DATA:
        # Check for raw CSV files
        required_raw_files = ["cleans.csv", "customers.csv", "teams.csv", "franchises.csv", "rooms.csv"]
        print(f"🔧 RAW DATA MODE: Checking for raw CSV files...")
        
        missing_raw_files = []
        for filename in required_raw_files:
            filepath = os.path.join(data_folder, filename)
            if not os.path.exists(filepath):
                missing_raw_files.append(filename)
        
        if missing_raw_files:
            print(f"❌ Missing raw files: {', '.join(missing_raw_files)}")
            print(f"📁 Please ensure raw CSV files are in the '{data_folder}' folder")
            return False
        
        print("✅ All raw CSV files found!")
    else:
        # Check for cleaned files
        required_files = ["franchise_info.csv", "master_cleans.csv", "customer_profiles.csv", "team_availability.csv"]
        print(f"🔧 CLEANED DATA MODE: Checking for processed CSV files...")
        
        missing_files = []
        for filename in required_files:
            filepath = os.path.join(data_folder, filename)
            if not os.path.exists(filepath):
                missing_files.append(filename)
        
        if missing_files:
            print(f"❌ Missing required files: {', '.join(missing_files)}")
            print(f"📁 Please ensure all files are in the '{data_folder}' folder")
            return False
        
        print("✅ All cleaned CSV files found!")
    
    # Check for matrix files only if using precomputed
    if USE_PRECOMPUTED_MATRICES:
        matrix_files = [
            "complete_real_driving_time_matrix_final.csv",
            "complete_real_driving_distance_matrix_final.csv"
        ]
        
        missing_matrix_files = []
        for filename in matrix_files:
            filepath = os.path.join(data_folder, filename)
            if not os.path.exists(filepath):
                missing_matrix_files.append(filename)
        
        if missing_matrix_files:
            print(f"❌ Missing matrix files: {', '.join(missing_matrix_files)}")
            print(f"📁 Please ensure matrix files are in the '{data_folder}' folder")
            print(f"💡 Or set USE_PRECOMPUTED_MATRICES = False to build from APIs")
            return False
        
        print("✅ All matrix files found!")
    else:
        print("🔄 API mode: Will build matrices from geocoding and routing APIs")
    
    try:
        # Create scheduler and run optimization
        scheduler = TravelOptimizedScheduler(franchise_id=TARGET_FRANCHISE_ID, verbose=True)
        
        # Run complete travel optimization
        success = scheduler.run_complete_optimization()
        
        if success:
            print("\n🎊 TRAVEL-OPTIMIZED WEEKLY SCHEDULING COMPLETED SUCCESSFULLY!")
            print("📄 Check the generated CSV file for detailed results")
            return True
        else:
            print("\n💥 OPTIMIZATION FAILED - see error messages above")
            return False
            
    except KeyboardInterrupt:
        print("\n⏹️ Optimization interrupted by user")
        return False
    except Exception as e:
        print(f"\n💥 Unexpected error: {str(e)}")
        traceback.print_exc()
        return False


if __name__ == "__main__":
    main()
