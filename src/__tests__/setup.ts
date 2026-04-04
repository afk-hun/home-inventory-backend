import { beforeAll, afterEach } from "vitest";
import { db } from "../lib/db";
import {
	meals,
	ingredients,
	shoppingListItems,
	shoppingLists,
	monthlyCookingSchedules,
	recipes,
	invoiceElements,
	invoices,
	invoiceItems,
	shelfItems,
	shelves,
	itemConnectedStores,
	items,
	itemTypes,
	shelfTypes,
	shelfPlaceTypes,
	unitTypes,
	mealTypes,
	recipeTypes,
	stores,
	householdMembers,
	households,
	users,
} from "../db/schema";

beforeAll(() => {
	process.env.JWT_SECRET = "test-secret-key-for-vitest";
	process.env.NODE_ENV = "test";
	process.env.CORS_ORIGIN = "http://localhost:5173";
	process.env.DATABASE_URL = "file:./test.db";
});

afterEach(() => {
	// Delete all records in reverse dependency order
	db.delete(meals).run();
	db.delete(ingredients).run();
	db.delete(shoppingListItems).run();
	db.delete(shoppingLists).run();
	db.delete(monthlyCookingSchedules).run();
	db.delete(recipes).run();
	db.delete(invoiceElements).run();
	db.delete(invoices).run();
	db.delete(invoiceItems).run();
	db.delete(shelfItems).run();
	db.delete(shelves).run();
	db.delete(itemConnectedStores).run();
	db.delete(items).run();
	db.delete(itemTypes).run();
	db.delete(shelfTypes).run();
	db.delete(shelfPlaceTypes).run();
	db.delete(unitTypes).run();
	db.delete(mealTypes).run();
	db.delete(recipeTypes).run();
	db.delete(stores).run();
	db.delete(householdMembers).run();
	db.delete(households).run();
	db.delete(users).run();
});
