import { Router } from "express";
import { validateCsrf } from "../middleware/csrf";
import { isAuth } from "../middleware/isAuth";
import { getShelfPlaceTypes, createShelfPlaceType, renameShelfPlaceType, deleteShelfPlaceType } from "../controller/shelf/placeType";

const router = Router();

// router.get("/csrf-token", csrfToken);

router.get("/shelf-place-types", isAuth, validateCsrf, getShelfPlaceTypes); 
router.post("/shelf-place-types", isAuth, validateCsrf, createShelfPlaceType);
router.patch("/shelf-place-types", isAuth, validateCsrf, renameShelfPlaceType);
router.delete("/shelf-place-types", isAuth, validateCsrf, deleteShelfPlaceType);

export default router;