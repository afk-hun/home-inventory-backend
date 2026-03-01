import { Router } from "express";
import { csrfToken } from "../controller/csrf";
import { validateCsrf } from "../middleware/csrf";
import { createHousehold, deleteHousehold, renameHousehold } from "../controller/household";

const router = Router();

router.get("/csrf-token", csrfToken);

router.post("/create", validateCsrf, createHousehold);
router.patch("/rename", validateCsrf, renameHousehold);
router.delete("/remove", validateCsrf, deleteHousehold);

export default router;