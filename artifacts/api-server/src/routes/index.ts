import { Router, type IRouter } from "express";
import healthRouter from "./health";
import emailRouter from "./email";
import goldRouter from "./gold";

const router: IRouter = Router();

router.use(healthRouter);
router.use(emailRouter);
router.use(goldRouter);

export default router;
