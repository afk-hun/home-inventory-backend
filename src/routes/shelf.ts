import { Router } from "express";
import { validateCsrf } from "../middleware/csrf";
import { isAuth } from "../middleware/isAuth";
import { getShelfPlaceTypes, createShelfPlaceType, renameShelfPlaceType, deleteShelfPlaceType } from "../controller/shelf/placeType";
import { getShelfTypes, createShelfType, renameShelfType, deleteShelfType } from "../controller/shelf/type";
import { getItemTypes, createItemType, renameItemType, deleteItemType } from "../controller/shelf/itemType";
import { getItem, getItems, createItem, updateItem, deleteItem, addConnectedStore } from "../controller/shelf/item";
import { getShelves, getShelf, createShelf, updateShelf, deleteShelf, addShelfItem, removeShelfItem, consumeRecipeIngredients, addCheckedToShoppingBag } from "../controller/shelf/shelf";

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

router.get("/item-type", isAuth, validateCsrf, getItemTypes);
router.post("/item-type", isAuth, validateCsrf, createItemType);
router.patch("/item-type", isAuth, validateCsrf, renameItemType);
router.delete("/item-type", isAuth, validateCsrf, deleteItemType);

router.get("/item/:id", isAuth, validateCsrf, getItem);
router.get("/item", isAuth, validateCsrf, getItems);
router.post("/item/add-store", isAuth, validateCsrf, addConnectedStore);
router.post("/item", isAuth, validateCsrf, createItem);
router.patch("/item", isAuth, validateCsrf, updateItem);
router.delete("/item", isAuth, validateCsrf, deleteItem);
// Register specific sub-paths before /:id to avoid Express matching them as params
router.post("/shelf/add-item", isAuth, validateCsrf, addShelfItem);
router.delete("/shelf/remove-item", isAuth, validateCsrf, removeShelfItem);
router.post("/shelf/consume-recipe", isAuth, validateCsrf, consumeRecipeIngredients);
router.post("/shelf/add-to-bag", isAuth, validateCsrf, addCheckedToShoppingBag);

router.get("/shelf/:id", isAuth, validateCsrf, getShelf);
router.get("/shelf", isAuth, validateCsrf, getShelves);
router.post("/shelf", isAuth, validateCsrf, createShelf);
router.patch("/shelf", isAuth, validateCsrf, updateShelf);
router.delete("/shelf", isAuth, validateCsrf, deleteShelf);

export default router;