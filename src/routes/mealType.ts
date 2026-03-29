import { Router } from "express";
import { validateCsrf } from "../middleware/csrf";
import { isAuth } from "../middleware/isAuth";
import {
	getMealTypes,
	createMealType,
	renameMealType,
	deleteMealType,
} from "../controller/mealTypeController";

const router = Router();

router.get("/meal-type", isAuth, validateCsrf, getMealTypes);
router.post("/meal-type", isAuth, validateCsrf, createMealType);
router.patch("/meal-type", isAuth, validateCsrf, renameMealType);
router.delete("/meal-type", isAuth, validateCsrf, deleteMealType);

export default router;
