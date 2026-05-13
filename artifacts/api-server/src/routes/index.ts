import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sequencesRouter from "./sequences";
import copilotRouter from "./copilot";
import stakingRouter from "./staking";
import apiKeysRouter from "./apikeys";
import rpcRouter from "./rpc";
import governanceRouter from "./governance";
import searchRouter from "./search";
import profileRouter from "./profile";
import eventsRouter from "./events";
import alphafoldRouter from "./alphafold";
import benchlingRouter from "./benchling";
import ipnftRouter from "./ipnft";
import citationsRouter from "./citations";
import teamsRouter from "./teams";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sequencesRouter);
router.use(copilotRouter);
router.use(stakingRouter);
router.use(apiKeysRouter);
router.use(rpcRouter);
router.use(governanceRouter);
router.use(searchRouter);
router.use(profileRouter);
router.use(eventsRouter);
router.use(alphafoldRouter);
router.use(benchlingRouter);
router.use(ipnftRouter);
router.use(citationsRouter);
router.use(teamsRouter);

export default router;
