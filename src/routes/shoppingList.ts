import { Router } from "express";
import { validateCsrf } from "../middleware/csrf";
import { isAuth } from "../middleware/isAuth";
import {
	getShoppingLists,
	getShoppingList,
	createShoppingList,
	updateShoppingList,
	deleteShoppingList,
} from "../controller/shoppingList";

const router = Router();

router.get("/shopping-list", isAuth, validateCsrf, getShoppingLists);
router.get("/shopping-list/:shoppingListId", isAuth, validateCsrf, getShoppingList);
router.post("/shopping-list", isAuth, validateCsrf, createShoppingList);
router.patch("/shopping-list", isAuth, validateCsrf, updateShoppingList);
router.delete("/shopping-list", isAuth, validateCsrf, deleteShoppingList);

export default router;
