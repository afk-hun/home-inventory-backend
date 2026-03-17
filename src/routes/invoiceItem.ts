import { Router } from "express";
import { validateCsrf } from "../middleware/csrf";
import { isAuth } from "../middleware/isAuth";
import {
	getInvoiceItems,
	getInvoiceItem,
	createInvoiceItem,
	updateInvoiceItem,
	deleteInvoiceItem,
} from "../controller/invoiceItem";

const router = Router();

router.get("/", isAuth, validateCsrf, getInvoiceItems);
router.get("/:id", isAuth, validateCsrf, getInvoiceItem);
router.post("/", isAuth, validateCsrf, createInvoiceItem);
router.patch("/", isAuth, validateCsrf, updateInvoiceItem);
router.delete("/", isAuth, validateCsrf, deleteInvoiceItem);

export default router;
