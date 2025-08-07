// Static coordinate mapping for Chicago area customer locations
// This provides immediate map functionality with real geographic distribution

const CHICAGO_COORDINATES: Record<string, { lat: number; lon: number }> = {
  // Arlington Heights area
  'Arlington Heights': { lat: 42.0883, lon: -87.9806 },
  'Mount Prospect': { lat: 42.0811751, lon: -87.941361 },
  'Mt Prospect': { lat: 42.0811751, lon: -87.941361 },
  'Prospect Heights': { lat: 42.0953, lon: -87.9373 },
  
  // Northwest suburbs
  'Buffalo Grove': { lat: 42.1487, lon: -87.9595 },
  'Elk Grove Village': { lat: 42.0039, lon: -87.9706 },
  'Elk Grove': { lat: 42.0039, lon: -87.9706 },
  'Schaumburg': { lat: 42.0334, lon: -88.0834 },
  'Rolling Meadows': { lat: 42.0842, lon: -88.0134 },
  'Palatine': { lat: 42.1103, lon: -88.0343 },
  'Wheeling': { lat: 42.1392, lon: -87.9289 },
  'Streamwood': { lat: 42.0256, lon: -88.1784 },
  'Hanover Park': { lat: 41.9994, lon: -88.1451 },
  'Roselle': { lat: 41.9848, lon: -88.0798 },
  
  // North shore
  'Northbrook': { lat: 42.1276, lon: -87.8289 },
  'Glenview': { lat: 42.0698, lon: -87.7878 },
  'Glenview Nas': { lat: 42.0698, lon: -87.7878 },
  'Skokie': { lat: 42.0334, lon: -87.7334 },
  'Lincolnwood': { lat: 41.9729, lon: -87.7295 },
  'Morton Grove': { lat: 42.0408, lon: -87.7826 },
  
  // West suburbs  
  'Des Plaines': { lat: 42.0334, lon: -87.8834 },
  'Park Ridge': { lat: 42.0112, lon: -87.8406 },
  
  // Default Mount Prospect area  
  'Chicago': { lat: 42.0811751, lon: -87.941361 }
};

export function getStaticCoordinates(address: string, city: string): { lat: number; lon: number } | null {
  // Clean up city name
  const cleanCity = city?.replace(/\r/g, '').trim().replace(/ IL$/, '').replace(/,.*$/, '');
  
  // Look up city coordinates
  if (CHICAGO_COORDINATES[cleanCity]) {
    const baseCoords = CHICAGO_COORDINATES[cleanCity];
    
    // Add slight random offset based on address to spread out customers within city
    const addressHash = address.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const offsetLat = (addressHash % 100) / 10000; // ±0.01 degree offset (~1 mile)
    const offsetLon = ((addressHash * 7) % 100) / 10000;
    
    return {
      lat: baseCoords.lat + offsetLat,
      lon: baseCoords.lon + offsetLon
    };
  }
  
  return null;
}

export function getAllStaticCoordinates(): typeof CHICAGO_COORDINATES {
  return CHICAGO_COORDINATES;
}