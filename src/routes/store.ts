import { Router } from "express";
import { validateCsrf } from "../middleware/csrf";
import { isAuth } from "../middleware/isAuth";
import {
	getStore,
	getStores,
	createStore,
	updateStore,
	deleteStore,
} from "../controller/store";

const router = Router();

router.get("/store/:id", isAuth, validateCsrf, getStore);
router.get("/store", isAuth, validateCsrf, getStores);
router.post("/store", isAuth, validateCsrf, createStore);
router.patch("/store", isAuth, validateCsrf, updateStore);
router.delete("/store", isAuth, validateCsrf, deleteStore);

export default router;
