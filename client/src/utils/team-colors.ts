// 17 distinct colors for teams 0-16 (consistent across optimized and original)
export const TEAM_COLORS = [
  '#FF6B6B', // Team 0 - Red
  '#4ECDC4', // Team 1 - Teal
  '#45B7D1', // Team 2 - Blue
  '#96CEB4', // Team 3 - Mint Green
  '#FFEAA7', // Team 4 - Yellow
  '#DDA0DD', // Team 5 - Plum
  '#98D8C8', // Team 6 - Seafoam
  '#F7DC6F', // Team 7 - Gold
  '#BB8FCE', // Team 8 - Lavender
  '#85C1E9', // Team 9 - Sky Blue
  '#F8C471', // Team 10 - Orange
  '#82E0AA', // Team 11 - Light Green
  '#F1948A', // Team 12 - Salmon
  '#AED6F1', // Team 13 - Light Blue
  '#D2B4DE', // Team 14 - Light Purple
  '#A9DFBF', // Team 15 - Pale Green
  '#F9E79F'  // Team 16 - Pale Yellow
];

export function getTeamColor(teamNumber: number): string {
  return TEAM_COLORS[teamNumber] || '#808080'; // Default gray for invalid team numbers
}