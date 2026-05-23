import { Router, type IRouter } from "express";
import {
  ListCalorieLogsQueryParams,
  ListCalorieLogsResponse,
  CreateCalorieLogBody,
  GetCalorieLogParams,
  GetCalorieLogResponse,
  UpdateCalorieLogParams,
  UpdateCalorieLogBody,
  UpdateCalorieLogResponse,
  DeleteCalorieLogParams,
} from "@workspace/api-zod";
import { requireAuth, getUserId } from "../middlewares/requireAuth";
import {
  CalorieLogModel,
  nextSequenceValue,
  type CalorieLogDocument,
} from "../models";

const router: IRouter = Router();

function getDateRange(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const start = new Date(year, month - 1, day);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

router.get("/calories", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const query = ListCalorieLogsQueryParams.safeParse(req.query);
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

  const logs = await CalorieLogModel.find(conditions).sort({ loggedAt: -1 });

  res.json(ListCalorieLogsResponse.parse(logs.map(mapCalorieLog)));
});

router.post("/calories", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const parsed = CreateCalorieLogBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid calorie log body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { loggedAt, ...rest } = parsed.data;
  const log = await CalorieLogModel.create({
    id: await nextSequenceValue("calorie_logs"),
    ...rest,
    userId,
    loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
  });

  res.status(201).json(GetCalorieLogResponse.parse(mapCalorieLog(log)));
});

router.get("/calories/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = GetCalorieLogParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const log = await CalorieLogModel.findOne({
    id: params.data.id,
    userId,
  });

  if (!log) {
    res.status(404).json({ error: "Calorie log not found" });
    return;
  }

  res.json(GetCalorieLogResponse.parse(mapCalorieLog(log)));
});

router.patch("/calories/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = UpdateCalorieLogParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCalorieLogBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const log = await CalorieLogModel.findOneAndUpdate(
    { id: params.data.id, userId },
    parsed.data,
    { new: true },
  );

  if (!log) {
    res.status(404).json({ error: "Calorie log not found" });
    return;
  }

  res.json(UpdateCalorieLogResponse.parse(mapCalorieLog(log)));
});

router.delete("/calories/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = DeleteCalorieLogParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const log = await CalorieLogModel.findOneAndDelete({
    id: params.data.id,
    userId,
  });

  if (!log) {
    res.status(404).json({ error: "Calorie log not found" });
    return;
  }

  res.sendStatus(204);
});

function mapCalorieLog(log: CalorieLogDocument) {
  return {
    id: log.id,
    foodName: log.foodName,
    calories: log.calories,
    protein: log.protein ?? null,
    carbs: log.carbs ?? null,
    fat: log.fat ?? null,
    mealType: log.mealType,
    loggedAt: log.loggedAt.toISOString(),
  };
}

export default router;
