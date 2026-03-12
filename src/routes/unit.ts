import { Router } from "express";
import { validateCsrf } from "../middleware/csrf";
import { isAuth } from "../middleware/isAuth";
import { getUnitTypes, createUnitType, renameUnitType, deleteUnitType } from "../controller/unitType";

const router = Router();

router.get("/unit-type", isAuth, validateCsrf, getUnitTypes);
router.post("/unit-type", isAuth, validateCsrf, createUnitType);
router.patch("/unit-type", isAuth, validateCsrf, renameUnitType);
router.delete("/unit-type", isAuth, validateCsrf, deleteUnitType);

export default router;
