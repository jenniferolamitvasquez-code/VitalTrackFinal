import { Router, type IRouter } from "express";
import {
  GetTodaySummaryResponse,
  GetWeeklySummaryResponse,
} from "@workspace/api-zod";
import { requireAuth, getUserId } from "../middlewares/requireAuth";
import { CalorieLogModel, ExerciseModel, StepLogModel } from "../models";

const router: IRouter = Router();

const CALORIE_GOAL = 2000;
const STEP_GOAL = 10000;

function getDateRange(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const start = new Date(year, month - 1, day);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function getLocalDateStr(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

router.get("/summary/today", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const todayStr = getLocalDateStr();
  const { start, end } = getDateRange(todayStr);

  const [calRows, stepRows, exRows] = await Promise.all([
    CalorieLogModel.find({
      userId,
      loggedAt: { $gte: start, $lt: end },
    }),
    StepLogModel.find({ userId, date: todayStr }),
    ExerciseModel.find({
      userId,
      loggedAt: { $gte: start, $lt: end },
    }),
  ]);

  const totalCaloriesIn = calRows.reduce((acc, r) => acc + (r.calories ?? 0), 0);
  const mealBreakdown = {
    breakfast: calRows.filter(r => r.mealType === "breakfast").reduce((a, r) => a + r.calories, 0),
    lunch: calRows.filter(r => r.mealType === "lunch").reduce((a, r) => a + r.calories, 0),
    dinner: calRows.filter(r => r.mealType === "dinner").reduce((a, r) => a + r.calories, 0),
    snack: calRows.filter(r => r.mealType === "snack").reduce((a, r) => a + r.calories, 0),
  };

  const totalSteps = stepRows.reduce((acc, r) => acc + (r.steps ?? 0), 0);
  const totalStepCaloriesBurned = stepRows.reduce((acc, r) => acc + (r.caloriesBurned ?? 0), 0);
  const totalDistanceKm = stepRows.reduce((acc, r) => acc + (r.distanceKm ?? 0), 0);
  const totalExerciseMinutes = exRows.reduce((acc, r) => acc + (r.durationMinutes ?? 0), 0);
  const totalExerciseCaloriesBurned = exRows.reduce((acc, r) => acc + (r.caloriesBurned ?? 0), 0);
  const totalCaloriesBurned = totalStepCaloriesBurned + totalExerciseCaloriesBurned;

  const summary = {
    date: todayStr,
    totalCaloriesIn,
    totalCaloriesBurned,
    totalSteps,
    totalDistanceKm,
    totalExerciseMinutes,
    calorieGoal: CALORIE_GOAL,
    stepGoal: STEP_GOAL,
    netCalories: totalCaloriesIn - totalCaloriesBurned,
    mealBreakdown,
  };

  res.json(GetTodaySummaryResponse.parse(summary));
});

router.get("/summary/weekly", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(getLocalDateStr(d));
  }

  const { start: weekStart } = getDateRange(days[0]);
  const { end: weekEnd } = getDateRange(days[6]);

  const [allCals, allSteps, allEx] = await Promise.all([
    CalorieLogModel.find({
      userId,
      loggedAt: { $gte: weekStart, $lt: weekEnd },
    }),
    StepLogModel.find({
      userId,
      date: { $gte: days[0], $lte: days[6] },
    }),
    ExerciseModel.find({
      userId,
      loggedAt: { $gte: weekStart, $lt: weekEnd },
    }),
  ]);

  const stats = days.map(date => {
    const { start, end } = getDateRange(date);
    const cals = allCals.filter(r => r.loggedAt >= start && r.loggedAt < end);
    const steps = allSteps.filter(r => r.date === date);
    const exs = allEx.filter(r => r.loggedAt >= start && r.loggedAt < end);

    return {
      date,
      caloriesIn: cals.reduce((a, r) => a + (r.calories ?? 0), 0),
      caloriesBurned:
        steps.reduce((a, r) => a + (r.caloriesBurned ?? 0), 0) +
        exs.reduce((a, r) => a + (r.caloriesBurned ?? 0), 0),
      steps: steps.reduce((a, r) => a + (r.steps ?? 0), 0),
      distanceKm: steps.reduce((a, r) => a + (r.distanceKm ?? 0), 0),
      exerciseMinutes: exs.reduce((a, r) => a + (r.durationMinutes ?? 0), 0),
    };
  });

  res.json(GetWeeklySummaryResponse.parse(stats));
});

export default router;
