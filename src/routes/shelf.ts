import { Router } from "express";
import { validateCsrf } from "../middleware/csrf";
import { isAuth } from "../middleware/isAuth";
import { getShelfPlaceTypes, createShelfPlaceType, renameShelfPlaceType, deleteShelfPlaceType } from "../controller/shelf/placeType";
import { getShelfTypes, createShelfType, renameShelfType, deleteShelfType } from "../controller/shelf/type";

const router = Router();

// router.get("/csrf-token", csrfToken);

router.get("/shelf-place-types", isAuth, validateCsrf, getShelfPlaceTypes);
router.post("/shelf-place-types", isAuth, validateCsrf, createShelfPlaceType);
router.patch("/shelf-place-types", isAuth, validateCsrf, renameShelfPlaceType);
router.delete("/shelf-place-types", isAuth, validateCsrf, deleteShelfPlaceType);

router.get("/shelf-types", isAuth, validateCsrf, getShelfTypes);
router.post("/shelf-types", isAuth, validateCsrf, createShelfType);
router.patch("/shelf-types", isAuth, validateCsrf, renameShelfType);
router.delete("/shelf-types", isAuth, validateCsrf, deleteShelfType);

export default router;