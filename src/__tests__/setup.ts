import { beforeAll, afterAll, afterEach } from "vitest";
import { prisma } from "../lib/prisma";

beforeAll(async () => {
	process.env.JWT_SECRET = "test-secret-key-for-vitest";
	process.env.NODE_ENV = "test";
	process.env.CORS_ORIGIN = "http://localhost:5173";
	process.env.DATABASE_URL = "file:./test.db";
});

afterEach(async () => {
	// Delete all records in reverse dependency order
	await prisma.meal.deleteMany();
	await prisma.ingredient.deleteMany();
	await prisma.shoppingListItem.deleteMany();
	await prisma.shoppingList.deleteMany();
	await prisma.monthlyCookingSchedule.deleteMany();
	await prisma.recipe.deleteMany();
	await prisma.invoiceElement.deleteMany();
	await prisma.invoice.deleteMany();
	await prisma.invoiceItem.deleteMany();
	await prisma.shelfItem.deleteMany();
	await prisma.shelf.deleteMany();
	await prisma.itemConnectedStore.deleteMany();
	await prisma.item.deleteMany();
	await prisma.itemType.deleteMany();
	await prisma.shelfType.deleteMany();
	await prisma.shelfPlaceType.deleteMany();
	await prisma.unitType.deleteMany();
	await prisma.mealType.deleteMany();
	await prisma.recipeType.deleteMany();
	await prisma.store.deleteMany();
	await prisma.householdMember.deleteMany();
	await prisma.household.deleteMany();
	await prisma.user.deleteMany();
});

afterAll(async () => {
	await prisma.$disconnect();
});
