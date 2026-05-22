import { pgTable, serial, integer, numeric, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const stepLogsTable = pgTable("step_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  steps: integer("steps").notNull(),
  date: text("date").notNull(),
  distanceKm: numeric("distance_km", { precision: 6, scale: 2 }),
  caloriesBurned: integer("calories_burned"),
  loggedAt: timestamp("logged_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStepLogSchema = createInsertSchema(stepLogsTable).omit({ id: true });
export type InsertStepLog = z.infer<typeof insertStepLogSchema>;
export type StepLog = typeof stepLogsTable.$inferSelect;
