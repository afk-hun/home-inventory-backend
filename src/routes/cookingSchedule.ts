import { Router } from "express";
import { validateCsrf } from "../middleware/csrf";
import { isAuth } from "../middleware/isAuth";
import {
	getSchedules,
	getSchedule,
	createSchedule,
	updateSchedule,
	deleteSchedule,
} from "../controller/monthlyCookingScheduleController";

const router = Router();

router.get("/", isAuth, validateCsrf, getSchedules);
router.get("/:id", isAuth, validateCsrf, getSchedule);
router.post("/", isAuth, validateCsrf, createSchedule);
router.patch("/", isAuth, validateCsrf, updateSchedule);
router.delete("/", isAuth, validateCsrf, deleteSchedule);

export default router;
