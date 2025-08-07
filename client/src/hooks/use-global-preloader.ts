import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { normalizeAddress } from '../utils/address-normalizer';

// Global cache for all geocoded addresses - persists across all components
const GLOBAL_GEOCODE_CACHE = new Map<string, { lat: number; lon: number }>();
const PRELOAD_COMPLETED = { value: false };

// Batch geocoding function with proper error handling
async function batchGeocodeAll(addresses: string[]): Promise<void> {
  const uncachedAddresses = addresses.filter(addr => !GLOBAL_GEOCODE_CACHE.has(addr));
  
  if (uncachedAddresses.length === 0) {
    PRELOAD_COMPLETED.value = true;
    return;
  }

  try {
    // Process in smaller chunks to avoid overwhelming the API
    const chunkSize = 3; // Small chunks for stability
    
    for (let i = 0; i < uncachedAddresses.length; i += chunkSize) {
      const chunk = uncachedAddresses.slice(i, i + chunkSize);
      
      // Process chunk with proper error handling
      const promises = chunk.map(async (address) => {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=us&addressdetails=1`,
            {
              headers: { 'User-Agent': 'TCA-Schedule-Optimizer' }
            }
          );
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          const data = await response.json();
          
          if (data && data.length > 0) {
            const result = {
              lat: parseFloat(data[0].lat),
              lon: parseFloat(data[0].lon)
            };
            
            GLOBAL_GEOCODE_CACHE.set(address, result);
            return { address, result };
          }
        } catch (error) {
          // Silent fail for individual addresses
          return { address, result: null };
        }
        
        return { address, result: null };
      });
      
      await Promise.allSettled(promises); // Use allSettled to prevent one failure from stopping others
      
      // Add delay between chunks to respect rate limits
      if (i + chunkSize < uncachedAddresses.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    PRELOAD_COMPLETED.value = true;
  } catch (error) {
    console.warn('Batch geocoding completed with some issues:', error);
    PRELOAD_COMPLETED.value = true; // Mark as complete even with errors
  }
}

export function useGlobalPreloader() {
  const [preloadStatus, setPreloadStatus] = useState({
    isLoading: !PRELOAD_COMPLETED.value,
    totalAddresses: 0,
    cachedAddresses: GLOBAL_GEOCODE_CACHE.size
  });

  // Get teams data for preloading
  const { data: mondayTeams } = useQuery({
    queryKey: ['/api/teams-by-day', 'monday'],
    staleTime: 15 * 60 * 1000, // Cache for 15 minutes
  });

  useEffect(() => {
    if (!mondayTeams || PRELOAD_COMPLETED.value) return;

    const initializePreloading = async () => {
      try {
        // Get all team numbers with data
        const teamsWithData = mondayTeams?.teams?.filter((team: any) => team.customerCount > 0) || [];
        
        if (teamsWithData.length === 0) {
          PRELOAD_COMPLETED.value = true;
          return;
        }

        // Fetch all team schedules in parallel
        const teamDataPromises = teamsWithData.map((team: any) =>
          fetch(`/api/team-schedule/monday/${team.teamNumber}`)
            .then(response => response.json())
            .catch(error => {
              console.warn(`Failed to fetch team ${team.teamNumber}:`, error);
              return null;
            })
        );

        const teamDataResults = await Promise.all(teamDataPromises);
        const validTeamData = teamDataResults.filter(Boolean);

        // Collect all unique addresses
        const allAddresses = new Set<string>();
        
        validTeamData.forEach((teamData: any) => {
          [teamData?.optimizedSchedule, teamData?.originalSchedule].forEach(schedule => {
            if (schedule) {
              schedule.forEach((customer: any) => {
                const cleanAddress = customer.address?.replace(/\r/g, '').trim();
                const cleanCity = customer.city?.replace(/\r/g, '').trim();
                
                // Use comprehensive address normalization
                const addressFormats = normalizeAddress(cleanAddress, cleanCity);
                
                addressFormats.forEach(addr => allAddresses.add(addr));
              });
            }
          });
        });

        const addressList = Array.from(allAddresses);
        
        setPreloadStatus({
          isLoading: true,
          totalAddresses: addressList.length,
          cachedAddresses: GLOBAL_GEOCODE_CACHE.size
        });

        // Start batch geocoding
        await batchGeocodeAll(addressList);
        
        setPreloadStatus({
          isLoading: false,
          totalAddresses: addressList.length,
          cachedAddresses: GLOBAL_GEOCODE_CACHE.size
        });

      } catch (error) {
        console.warn('Preloading had issues but continuing:', error);
        setPreloadStatus(prev => ({ 
          ...prev, 
          isLoading: false,
          cachedAddresses: GLOBAL_GEOCODE_CACHE.size 
        }));
      }
    };

    initializePreloading();
  }, [mondayTeams]);

  return {
    ...preloadStatus,
    getCoordinates: (address: string) => GLOBAL_GEOCODE_CACHE.get(address),
    isComplete: PRELOAD_COMPLETED.value
  };
}