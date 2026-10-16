import { Router, type IRouter } from "express";
import healthRouter from "./health";
import accessRouter from "./access";
import emailRouter from "./email";
import goldRouter from "./gold";
import { requireAccess } from "../lib/access-control";

const router: IRouter = Router();

router.use(healthRouter);
router.use(accessRouter);
router.use(requireAccess);
router.use(emailRouter);
router.use(goldRouter);

export default router;
