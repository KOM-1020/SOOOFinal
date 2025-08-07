import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const teamAvailability = pgTable("team_availability", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  franchiseId: integer("franchise_id").notNull(),
  teamNumber: integer("team_number").notNull(),
  teamSize: integer("team_size").notNull(),
  driversCount: integer("drivers_count").notNull(),
  avgAvailMon: real("avg_avail_mon").notNull(),
  avgAvailTue: real("avg_avail_tue").notNull(),
  avgAvailWed: real("avg_avail_wed").notNull(),
  avgAvailThu: real("avg_avail_thu").notNull(),
  avgAvailFri: real("avg_avail_fri").notNull(),
  avgAvailSat: real("avg_avail_sat").notNull(),
  avgAvailSun: real("avg_avail_sun").notNull(),
  avgTotalAvailDays: real("avg_total_avail_days").notNull(),
});

export const optimizedSchedule = pgTable("optimized_schedule", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dayName: text("day_name").notNull(),
  customerId: integer("customer_id").notNull(),
  teamNumber: integer("team_number").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  serviceDurationMinutes: integer("service_duration_minutes").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertTeamAvailabilitySchema = createInsertSchema(teamAvailability);
export const insertOptimizedScheduleSchema = createInsertSchema(optimizedSchedule);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type TeamAvailability = typeof teamAvailability.$inferSelect;
export type OptimizedSchedule = typeof optimizedSchedule.$inferSelect;
export type InsertTeamAvailability = z.infer<typeof insertTeamAvailabilitySchema>;
export type InsertOptimizedSchedule = z.infer<typeof insertOptimizedScheduleSchema>;

// Data processing types
export interface ScheduleData {
  dayName: string;
  customerId: number;
  teamNumber: number;
  startTime: string;
  endTime: string;
  serviceDurationMinutes: number;
  address: string;
  city: string;
}

export interface TeamData {
  franchiseId: number;
  teamNumber: number;
  teamSize: number;
  driversCount: number;
  avgAvailMon: number;
  avgAvailTue: number;
  avgAvailWed: number;
  avgAvailThu: number;
  avgAvailFri: number;
  avgAvailSat: number;
  avgAvailSun: number;
  avgTotalAvailDays: number;
}

export interface DailyStats {
  day: string;
  optimizedTravelTime: number;
  originalTravelTime: number;
  optimizedSlots: number;
  originalSlots: number;
  customerCount: number;
}

export interface TimeShiftData {
  timeShift: number;
  customerCount: number;
}

export interface OriginalScheduleData {
  customerId: number;
  dayOfWeek: number;
  teamNumber: number;
  slot: number;
  timeInHour: number;
  timeInMinute: number;
  timeOutHour: number;
  timeOutMinute: number;
  durationMinute: number;
  cleanDateOnly: string;
  address?: string;
  city?: string;
}

export interface TeamScheduleView {
  teamNumber: number;
  optimizedSchedule: ScheduleData[];
  originalSchedule: OriginalScheduleData[];
  totalCustomers: number;
  startTime: string;
  endTime: string;
}
