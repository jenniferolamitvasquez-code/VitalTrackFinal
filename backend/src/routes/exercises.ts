import { Router, type IRouter } from "express";
import {
  ListExercisesQueryParams,
  ListExercisesResponse,
  CreateExerciseBody,
  UpdateExerciseParams,
  UpdateExerciseBody,
  UpdateExerciseResponse,
  DeleteExerciseParams,
} from "@workspace/api-zod";
import { requireAuth, getUserId } from "../middlewares/requireAuth";
import {
  ExerciseModel,
  nextSequenceValue,
  type ExerciseDocument,
} from "../models";

const router: IRouter = Router();

function getDateRange(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const start = new Date(year, month - 1, day);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

router.get("/exercises", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const query = ListExercisesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions: Record<string, unknown> = { userId };
  if (query.data.date) {
    const dateStr = query.data.date;
    const { start, end } = getDateRange(dateStr);
    conditions.loggedAt = { $gte: start, $lt: end };
  }

  const logs = await ExerciseModel.find(conditions).sort({ loggedAt: -1 });

  res.json(ListExercisesResponse.parse(logs.map(mapExercise)));
});

router.post("/exercises", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const parsed = CreateExerciseBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid exercise body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { loggedAt, ...rest } = parsed.data;
  const exercise = await ExerciseModel.create({
    id: await nextSequenceValue("exercises"),
    ...rest,
    userId,
    loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
  });

  res.status(201).json(mapExercise(exercise));
});

router.patch("/exercises/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = UpdateExerciseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateExerciseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const exercise = await ExerciseModel.findOneAndUpdate(
    { id: params.data.id, userId },
    parsed.data,
    { new: true },
  );

  if (!exercise) {
    res.status(404).json({ error: "Exercise not found" });
    return;
  }

  res.json(UpdateExerciseResponse.parse(mapExercise(exercise)));
});

router.delete("/exercises/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = DeleteExerciseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const exercise = await ExerciseModel.findOneAndDelete({
    id: params.data.id,
    userId,
  });

  if (!exercise) {
    res.status(404).json({ error: "Exercise not found" });
    return;
  }

  res.sendStatus(204);
});

function mapExercise(e: ExerciseDocument) {
  return {
    id: e.id,
    name: e.name,
    category: e.category,
    durationMinutes: e.durationMinutes,
    caloriesBurned: e.caloriesBurned ?? null,
    sets: e.sets ?? null,
    reps: e.reps ?? null,
    weightKg: e.weightKg ?? null,
    notes: e.notes ?? null,
    loggedAt: e.loggedAt.toISOString(),
  };
}

export default router;
