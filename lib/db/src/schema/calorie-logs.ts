import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const calorieLogsTable = pgTable("calorie_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  foodName: text("food_name").notNull(),
  calories: integer("calories").notNull(),
  protein: numeric("protein", { precision: 6, scale: 2 }),
  carbs: numeric("carbs", { precision: 6, scale: 2 }),
  fat: numeric("fat", { precision: 6, scale: 2 }),
  mealType: text("meal_type").notNull(),
  loggedAt: timestamp("logged_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCalorieLogSchema = createInsertSchema(calorieLogsTable).omit({ id: true });
export type InsertCalorieLog = z.infer<typeof insertCalorieLogSchema>;
export type CalorieLog = typeof calorieLogsTable.$inferSelect;
