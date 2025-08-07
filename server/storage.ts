import { type User, type InsertUser, type TeamAvailability, type OptimizedSchedule, type InsertTeamAvailability, type InsertOptimizedSchedule, type ScheduleData, type TeamData } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Team availability methods
  getTeamAvailability(): Promise<TeamAvailability[]>;
  createTeamAvailability(data: InsertTeamAvailability): Promise<TeamAvailability>;
  
  // Optimized schedule methods
  getOptimizedSchedule(): Promise<OptimizedSchedule[]>;
  createOptimizedSchedule(data: InsertOptimizedSchedule): Promise<OptimizedSchedule>;
  
  // Bulk operations for CSV import (replace existing data)
  bulkCreateTeamAvailability(data: InsertTeamAvailability[]): Promise<TeamAvailability[]>;
  bulkCreateOptimizedSchedule(data: InsertOptimizedSchedule[]): Promise<OptimizedSchedule[]>;
  
  // Clear methods to reset data
  clearTeamAvailability(): Promise<void>;
  clearOptimizedSchedule(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private teamAvailability: Map<string, TeamAvailability>;
  private optimizedSchedule: Map<string, OptimizedSchedule>;

  constructor() {
    this.users = new Map();
    this.teamAvailability = new Map();
    this.optimizedSchedule = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getTeamAvailability(): Promise<TeamAvailability[]> {
    return Array.from(this.teamAvailability.values());
  }

  async createTeamAvailability(data: InsertTeamAvailability): Promise<TeamAvailability> {
    const id = randomUUID();
    const team: TeamAvailability = { ...data, id };
    this.teamAvailability.set(id, team);
    return team;
  }

  async getOptimizedSchedule(): Promise<OptimizedSchedule[]> {
    return Array.from(this.optimizedSchedule.values());
  }

  async createOptimizedSchedule(data: InsertOptimizedSchedule): Promise<OptimizedSchedule> {
    const id = randomUUID();
    const schedule: OptimizedSchedule = { ...data, id };
    this.optimizedSchedule.set(id, schedule);
    return schedule;
  }

  async clearTeamAvailability(): Promise<void> {
    this.teamAvailability.clear();
  }

  async clearOptimizedSchedule(): Promise<void> {
    this.optimizedSchedule.clear();
  }

  async bulkCreateTeamAvailability(data: InsertTeamAvailability[]): Promise<TeamAvailability[]> {
    // Clear existing data first to avoid duplicates
    await this.clearTeamAvailability();
    
    const results: TeamAvailability[] = [];
    for (const item of data) {
      const result = await this.createTeamAvailability(item);
      results.push(result);
    }
    return results;
  }

  async bulkCreateOptimizedSchedule(data: InsertOptimizedSchedule[]): Promise<OptimizedSchedule[]> {
    // Clear existing data first to avoid duplicates
    await this.clearOptimizedSchedule();
    
    const results: OptimizedSchedule[] = [];
    for (const item of data) {
      const result = await this.createOptimizedSchedule(item);
      results.push(result);
    }
    return results;
  }
}

export const storage = new MemStorage();
