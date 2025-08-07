// Comprehensive address normalization and geocoding utility

export function normalizeAddress(address: string, city: string): string[] {
  // Clean up the inputs
  const cleanAddress = address?.replace(/\r/g, '').trim();
  let cleanCity = city?.replace(/\r/g, '').trim();
  
  // Handle different city formats (some have state already)
  if (cleanCity.includes(',')) {
    cleanCity = cleanCity.split(',')[0].trim();
  }
  if (cleanCity.includes(' IL')) {
    cleanCity = cleanCity.replace(' IL', '').trim();
  }
  
  // Handle specific city name variations
  const cityVariations = getCityVariations(cleanCity);
  
  // Generate all possible address formats for each city variation
  const allFormats = new Set<string>();
  
  cityVariations.forEach(cityVar => {
    // Basic formats
    allFormats.add(`${cleanAddress}, ${cityVar}, Illinois, USA`);
    allFormats.add(`${cleanAddress}, ${cityVar}, IL, USA`);
    allFormats.add(`${cleanAddress}, ${cityVar}, IL`);
    allFormats.add(`${cleanAddress}, ${cityVar}`);
    
    // Address abbreviation expansions
    const addressVariations = getAddressVariations(cleanAddress);
    addressVariations.forEach(addrVar => {
      allFormats.add(`${addrVar}, ${cityVar}, IL`);
      allFormats.add(`${addrVar}, ${cityVar}, Illinois`);
    });
  });
  
  return Array.from(allFormats);
}

function getCityVariations(city: string): string[] {
  const variations = [city];
  
  // Common city name variations
  const cityMappings: Record<string, string[]> = {
    'Mount Prospect': ['Mt Prospect', 'Mt. Prospect'],
    'Mt Prospect': ['Mount Prospect', 'Mt. Prospect'],
    'Glenview Nas': ['Glenview', 'Glenview NAS'],
    'Des Plaines': ['Des Plaines', 'DesPlaines'],
    'Prospect Heights': ['Prospect Hts', 'Prospect Heights'],
    'Buffalo Grove': ['Buffalo Grv', 'Buffalo Grove'],
    'Arlington Heights': ['Arlington Hts', 'Arlington Heights'],
    'Elk Grove Village': ['Elk Grove Vlg', 'Elk Grove Village'],
    'Elk Grove': ['Elk Grove Village', 'Elk Grove Vlg'],
    'Hanover Park': ['Hanover Pk', 'Hanover Park'],
    'Park Ridge': ['Park Ridge', 'Pk Ridge'],
    'Schaumburg': ['Schaumburg', 'Schaumburg IL']
  };
  
  if (cityMappings[city]) {
    variations.push(...cityMappings[city]);
  }
  
  return variations;
}

function getAddressVariations(address: string): string[] {
  const variations = [address];
  
  // Handle apartment numbers
  if (address.includes('Apt')) {
    const baseAddress = address.split('Apt')[0].trim();
    variations.push(baseAddress);
    // Try different apartment formats
    const aptMatch = address.match(/Apt\s*(\d+)/i);
    if (aptMatch) {
      variations.push(`${baseAddress} Apartment ${aptMatch[1]}`);
      variations.push(`${baseAddress} #${aptMatch[1]}`);
      variations.push(`${baseAddress} Unit ${aptMatch[1]}`);
    }
  }
  
  // Street type abbreviations and expansions
  const streetMappings: Record<string, string[]> = {
    'Rd': ['Road', 'Rd'],
    'Road': ['Rd', 'Road'],
    'St': ['Street', 'St'],
    'Street': ['St', 'Street'],
    'Ave': ['Avenue', 'Ave'],
    'Avenue': ['Ave', 'Avenue'],
    'Ln': ['Lane', 'Ln'],
    'Lane': ['Ln', 'Lane'],
    'Dr': ['Drive', 'Dr'],
    'Drive': ['Dr', 'Drive'],
    'Ct': ['Court', 'Ct'],
    'Court': ['Ct', 'Court'],
    'Blvd': ['Boulevard', 'Blvd'],
    'Boulevard': ['Blvd', 'Boulevard'],
    'Trl': ['Trail', 'Trl'],
    'Trail': ['Trl', 'Trail'],
    'Ter': ['Terrace', 'Ter'],
    'Terrace': ['Ter', 'Terrace'],
    'Cir': ['Circle', 'Cir'],
    'Circle': ['Cir', 'Circle']
  };
  
  for (const [abbrev, expansions] of Object.entries(streetMappings)) {
    if (address.includes(abbrev)) {
      expansions.forEach(expansion => {
        if (expansion !== abbrev) {
          variations.push(address.replace(abbrev, expansion));
        }
      });
    }
  }
  
  // Handle directional abbreviations
  const directionalMappings: Record<string, string[]> = {
    'N ': ['North ', 'N '],
    'North ': ['N ', 'North '],
    'S ': ['South ', 'S '],
    'South ': ['S ', 'South '],
    'E ': ['East ', 'E '],
    'East ': ['E ', 'East '],
    'W ': ['West ', 'W '],
    'West ': ['W ', 'West ']
  };
  
  for (const [abbrev, expansions] of Object.entries(directionalMappings)) {
    if (address.includes(abbrev)) {
      expansions.forEach(expansion => {
        if (expansion !== abbrev) {
          variations.push(address.replace(abbrev, expansion));
        }
      });
    }
  }
  
  // Handle common address format issues
  // Remove extra spaces
  variations.push(address.replace(/\s+/g, ' '));
  
  // Handle lowercase issues
  variations.push(address.toUpperCase());
  variations.push(toTitleCase(address));
  
  return [...new Set(variations)];
}

function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

export function createFallbackPosition(index: number): { lat: number; lon: number } {
  // Create a grid of fallback positions around Chicago area
  const baseLatitude = 42.0811751;
  const baseLongitude = -87.941361;
  
  const gridSize = 5;
  const spacing = 0.05; // ~3 miles apart
  
  const row = Math.floor(index / gridSize);
  const col = index % gridSize;
  
  return {
    lat: baseLatitude + (row - gridSize/2) * spacing,
    lon: baseLongitude + (col - gridSize/2) * spacing
  };
}