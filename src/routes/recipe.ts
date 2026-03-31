import { Router } from "express";
import { validateCsrf } from "../middleware/csrf";
import { isAuth } from "../middleware/isAuth";
import {
	getRecipes,
	getRecipe,
	getMissingIngredients,
	createRecipe,
	updateRecipe,
	deleteRecipe,
} from "../controller/recipeController";

const router = Router();

router.get("/", isAuth, validateCsrf, getRecipes);
router.get("/:id/missing-ingredients", isAuth, validateCsrf, getMissingIngredients);
router.get("/:id", isAuth, validateCsrf, getRecipe);
router.post("/", isAuth, validateCsrf, createRecipe);
router.patch("/", isAuth, validateCsrf, updateRecipe);
router.delete("/", isAuth, validateCsrf, deleteRecipe);

export default router;
