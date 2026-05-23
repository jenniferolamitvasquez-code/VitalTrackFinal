import { Router, type IRouter } from "express";
import {
  ListStepLogsQueryParams,
  ListStepLogsResponse,
  CreateStepLogBody,
  UpdateStepLogParams,
  UpdateStepLogBody,
  UpdateStepLogResponse,
  DeleteStepLogParams,
} from "@workspace/api-zod";
import { requireAuth, getUserId } from "../middlewares/requireAuth";
import {
  nextSequenceValue,
  StepLogModel,
  type StepLogDocument,
} from "../models";

const router: IRouter = Router();

router.get("/steps", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const query = ListStepLogsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions: Record<string, unknown> = { userId };
  if (query.data.date) {
    conditions.date = query.data.date;
  }

  const logs = await StepLogModel.find(conditions).sort({ loggedAt: -1 });

  res.json(ListStepLogsResponse.parse(logs.map(mapStepLog)));
});

router.post("/steps", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const parsed = CreateStepLogBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid step log body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const log = await StepLogModel.create({
    id: await nextSequenceValue("step_logs"),
    ...parsed.data,
    userId,
  });
  res.status(201).json(mapStepLog(log));
});

router.patch("/steps/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = UpdateStepLogParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateStepLogBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const log = await StepLogModel.findOneAndUpdate(
    { id: params.data.id, userId },
    parsed.data,
    { new: true },
  );

  if (!log) {
    res.status(404).json({ error: "Step log not found" });
    return;
  }

  res.json(UpdateStepLogResponse.parse(mapStepLog(log)));
});

router.delete("/steps/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = DeleteStepLogParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const log = await StepLogModel.findOneAndDelete({
    id: params.data.id,
    userId,
  });

  if (!log) {
    res.status(404).json({ error: "Step log not found" });
    return;
  }

  res.sendStatus(204);
});

function mapStepLog(log: StepLogDocument) {
  return {
    id: log.id,
    steps: log.steps,
    date: log.date,
    distanceKm: log.distanceKm ?? null,
    caloriesBurned: log.caloriesBurned ?? null,
    loggedAt: log.loggedAt.toISOString(),
  };
}

export default router;
