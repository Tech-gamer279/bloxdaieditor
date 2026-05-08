import { Router, type IRouter } from "express";
import healthRouter from "./health";
import communityRouter from "./community";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(communityRouter);
router.use(adminRouter);

export default router;
