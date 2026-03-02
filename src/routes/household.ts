import { Router } from "express";
import { csrfToken } from "../controller/csrf";
import { validateCsrf } from "../middleware/csrf";
import { createHousehold, deleteHousehold, getHouseholds, renameHousehold } from "../controller/household";
import { isAuth } from "../middleware/isAuth";

const router = Router();

// router.get("/csrf-token", csrfToken);

router.get("/households", isAuth, validateCsrf, getHouseholds); 
router.post("/create", isAuth, validateCsrf, createHousehold);
router.patch("/rename", isAuth, validateCsrf, renameHousehold);
router.delete("/remove", isAuth, validateCsrf, deleteHousehold);

export default router;