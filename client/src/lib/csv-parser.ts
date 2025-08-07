import { TeamData, ScheduleData } from "@shared/schema";

export function parseTeamAvailabilityCSV(csvText: string): TeamData[] {
  const lines = csvText.split('\n');
  const data: TeamData[] = [];
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const [
      franchiseId,
      teamNumber,
      teamSize,
      driversCount,
      avgAvailMon,
      avgAvailTue,
      avgAvailWed,
      avgAvailThu,
      avgAvailFri,
      avgAvailSat,
      avgAvailSun,
      avgTotalAvailDays
    ] = line.split(',');
    
    data.push({
      franchiseId: parseInt(franchiseId),
      teamNumber: parseInt(teamNumber),
      teamSize: parseInt(teamSize),
      driversCount: parseInt(driversCount),
      avgAvailMon: parseFloat(avgAvailMon),
      avgAvailTue: parseFloat(avgAvailTue),
      avgAvailWed: parseFloat(avgAvailWed),
      avgAvailThu: parseFloat(avgAvailThu),
      avgAvailFri: parseFloat(avgAvailFri),
      avgAvailSat: parseFloat(avgAvailSat),
      avgAvailSun: parseFloat(avgAvailSun),
      avgTotalAvailDays: parseFloat(avgTotalAvailDays),
    });
  }
  
  return data;
}

export function parseOptimizedScheduleCSV(csvText: string): ScheduleData[] {
  const lines = csvText.split('\n');
  const data: ScheduleData[] = [];
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const [
      dayName,
      customerId,
      teamNumber,
      startTime,
      endTime,
      serviceDurationMinutes,
      address,
      city
    ] = line.split(',');
    
    data.push({
      dayName,
      customerId: parseInt(customerId),
      teamNumber: parseInt(teamNumber),
      startTime,
      endTime,
      serviceDurationMinutes: parseInt(serviceDurationMinutes),
      address,
      city,
    });
  }
  
  return data;
}
