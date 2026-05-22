import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import caloriesRouter from "./calories";
import stepsRouter from "./steps";
import exercisesRouter from "./exercises";
import summaryRouter from "./summary";
import uploadsRouter from "./uploads";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(caloriesRouter);
router.use(stepsRouter);
router.use(exercisesRouter);
router.use(summaryRouter);
router.use(uploadsRouter);

export default router;
