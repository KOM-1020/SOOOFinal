import { useEffect, useState } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';

// Global cache for geocoded addresses - persists across component renders
const globalGeocodeCache = new Map<string, { lat: number; lon: number }>();

// Batch geocoding function to process multiple addresses simultaneously
async function batchGeocode(addresses: string[]): Promise<Map<string, { lat: number; lon: number }>> {
  const results = new Map<string, { lat: number; lon: number }>();
  
  // Process in chunks of 5 to respect rate limits but maximize parallelism
  const chunkSize = 5;
  for (let i = 0; i < addresses.length; i += chunkSize) {
    const chunk = addresses.slice(i, i + chunkSize);
    
    const promises = chunk.map(async (address) => {
      // Check cache first
      if (globalGeocodeCache.has(address)) {
        return { address, result: globalGeocodeCache.get(address)! };
      }
      
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=us&addressdetails=1`,
          {
            headers: { 'User-Agent': 'TCA-Schedule-Optimizer' }
          }
        );
        
        const data = await response.json();
        
        if (data && data.length > 0) {
          const result = {
            lat: parseFloat(data[0].lat),
            lon: parseFloat(data[0].lon)
          };
          
          // Cache the result
          globalGeocodeCache.set(address, result);
          return { address, result };
        }
      } catch (error) {
        console.warn(`Geocoding failed for ${address}:`, error);
      }
      
      return { address, result: null };
    });
    
    const chunkResults = await Promise.all(promises);
    
    chunkResults.forEach(({ address, result }) => {
      if (result) {
        results.set(address, result);
      }
    });
    
    // Small delay between chunks to respect rate limits
    if (i + chunkSize < addresses.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return results;
}

export function usePreloadedGeocoding(day: string) {
  const [geocodedAddresses, setGeocodedAddresses] = useState<Map<string, { lat: number; lon: number }>>(new Map());
  const [isPreloading, setIsPreloading] = useState(false);

  // Get all teams for the day
  const { data: teamsData } = useQuery({
    queryKey: ['/api/teams-by-day', day],
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  const teamsWithData = teamsData?.teams?.filter((team: any) => team.customerCount > 0) || [];

  // Preload all team schedules in parallel
  const teamQueries = useQueries({
    queries: teamsWithData.map((team: any) => ({
      queryKey: ['/api/team-schedule', day, team.teamNumber],
      staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    }))
  });

  const allTeamsLoaded = teamQueries.every(query => query.isSuccess);
  const teamSchedules = teamQueries.map(query => query.data).filter(Boolean);

  // Preload geocoding for all addresses
  useEffect(() => {
    if (!allTeamsLoaded || teamSchedules.length === 0) return;

    setIsPreloading(true);

    // Collect all unique addresses from all teams
    const allAddresses = new Set<string>();
    
    teamSchedules.forEach((teamData: any) => {
      if (teamData?.optimizedSchedule) {
        teamData.optimizedSchedule.forEach((customer: any) => {
          const cleanAddress = customer.address?.replace(/\r/g, '').trim();
          const cleanCity = customer.city?.replace(/\r/g, '').trim();
          
          // Generate multiple address formats for better geocoding success
          const addressFormats = [
            `${cleanAddress}, ${cleanCity}, Illinois, USA`,
            `${cleanAddress}, ${cleanCity}, IL, USA`,
            `${cleanAddress}, ${cleanCity}, IL`,
            `${cleanAddress}, ${cleanCity}`,
            cleanAddress.includes('Apt') ? `${cleanAddress.split('Apt')[0].trim()}, ${cleanCity}, IL` : null,
            cleanAddress.includes('Ct') ? `${cleanAddress.replace('Ct', 'Court')}, ${cleanCity}, IL` : null,
          ].filter(Boolean) as string[];
          
          addressFormats.forEach(addr => allAddresses.add(addr));
        });
      }
      
      if (teamData?.originalSchedule) {
        teamData.originalSchedule.forEach((customer: any) => {
          const cleanAddress = customer.address?.replace(/\r/g, '').trim();
          const cleanCity = customer.city?.replace(/\r/g, '').trim();
          
          const addressFormats = [
            `${cleanAddress}, ${cleanCity}, Illinois, USA`,
            `${cleanAddress}, ${cleanCity}, IL, USA`,
            `${cleanAddress}, ${cleanCity}, IL`,
            `${cleanAddress}, ${cleanCity}`,
            cleanAddress.includes('Apt') ? `${cleanAddress.split('Apt')[0].trim()}, ${cleanCity}, IL` : null,
            cleanAddress.includes('Ct') ? `${cleanAddress.replace('Ct', 'Court')}, ${cleanCity}, IL` : null,
          ].filter(Boolean) as string[];
          
          addressFormats.forEach(addr => allAddresses.add(addr));
        });
      }
    });

    // Batch geocode all addresses
    batchGeocode(Array.from(allAddresses))
      .then((results) => {
        setGeocodedAddresses(results);
        setIsPreloading(false);
      })
      .catch((error) => {
        console.error('Batch geocoding failed:', error);
        setIsPreloading(false);
      });

  }, [allTeamsLoaded, teamSchedules]);

  return {
    geocodedAddresses,
    teamSchedules,
    teamsWithData,
    isPreloading,
    allTeamsLoaded,
    getCoordinates: (address: string) => geocodedAddresses.get(address) || globalGeocodeCache.get(address)
  };
}