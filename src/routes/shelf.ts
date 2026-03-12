import { Router } from "express";
import { validateCsrf } from "../middleware/csrf";
import { isAuth } from "../middleware/isAuth";
import { getShelfPlaceTypes, createShelfPlaceType, renameShelfPlaceType, deleteShelfPlaceType } from "../controller/shelf/placeType";
import { getShelfTypes, createShelfType, renameShelfType, deleteShelfType } from "../controller/shelf/type";

const router = Router();

// router.get("/csrf-token", csrfToken);

router.get("/shelf-place-type", isAuth, validateCsrf, getShelfPlaceTypes);
router.post("/shelf-place-type", isAuth, validateCsrf, createShelfPlaceType);
router.patch("/shelf-place-type", isAuth, validateCsrf, renameShelfPlaceType);
router.delete("/shelf-place-type", isAuth, validateCsrf, deleteShelfPlaceType);

router.get("/shelf-type", isAuth, validateCsrf, getShelfTypes);
router.post("/shelf-type", isAuth, validateCsrf, createShelfType);
router.patch("/shelf-type", isAuth, validateCsrf, renameShelfType);
router.delete("/shelf-type", isAuth, validateCsrf, deleteShelfType);

export default router;