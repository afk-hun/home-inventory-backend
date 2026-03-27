import { Router } from "express";
import { validateCsrf } from "../middleware/csrf";
import { isAuth } from "../middleware/isAuth";
import { getRecipeTypes, createRecipeType, renameRecipeType, deleteRecipeType } from "../controller/recipeTypeController";

const router = Router();

router.get("/recipe-type", isAuth, validateCsrf, getRecipeTypes);
router.post("/recipe-type", isAuth, validateCsrf, createRecipeType);
router.patch("/recipe-type", isAuth, validateCsrf, renameRecipeType);
router.delete("/recipe-type", isAuth, validateCsrf, deleteRecipeType);

export default router;
