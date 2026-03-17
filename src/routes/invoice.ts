import { Router } from "express";
import { validateCsrf } from "../middleware/csrf";
import { isAuth } from "../middleware/isAuth";
import {
	getInvoices,
	createInvoice,
	updateInvoice,
	deleteInvoice,
} from "../controller/invoice";

const router = Router();

router.get("/invoice", isAuth, validateCsrf, getInvoices);
router.post("/invoice", isAuth, validateCsrf, createInvoice);
router.patch("/invoice", isAuth, validateCsrf, updateInvoice);
router.delete("/invoice", isAuth, validateCsrf, deleteInvoice);

export default router;
