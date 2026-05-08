import { Router, type IRouter } from "express";
import healthRouter from "./health";
import communityRouter from "./community";
import adminRouter from "./admin";
import snippetsRouter from "./snippets";
import profilesRouter from "./profiles";
import forumRouter from "./forum";
import schematicsRouter from "./schematics";
import modsRouter from "./mods";
import badgesRouter from "./badges";

const router: IRouter = Router();

router.use(healthRouter);
router.use(communityRouter);
router.use(adminRouter);
router.use(snippetsRouter);
router.use(profilesRouter);
router.use(forumRouter);
router.use(schematicsRouter);
router.use(modsRouter);
router.use(badgesRouter);

export default router;
