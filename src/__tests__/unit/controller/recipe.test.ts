import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../lib/prisma", () => ({
	prisma: {
		recipe: {
			findMany: vi.fn(),
			findUnique: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
		ingredient: {
			deleteMany: vi.fn(),
		},
		shelfItem: {
			findMany: vi.fn(),
		},
		$transaction: vi.fn(),
	},
}));

import { prisma } from "../../../lib/prisma";
import {
	getRecipes,
	getRecipe,
	getMissingIngredients,
	createRecipe,
	updateRecipe,
	deleteRecipe,
} from "../../../controller/recipeController";

const makeMockRes = () => {
	const res: any = {};
	res.status = vi.fn().mockReturnValue(res);
	res.json = vi.fn().mockReturnValue(res);
	return res;
};

// ---------------------------------------------------------------------------
// getRecipes
// ---------------------------------------------------------------------------

describe("getRecipes", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls next with 404 when req.user is missing", () => {
		const req: any = { user: undefined, householdId: "hh-1" };
		const res = makeMockRes();
		const next = vi.fn();

		getRecipes(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when householdId is missing", () => {
		const req: any = { user: { id: "user-1" }, householdId: undefined };
		const res = makeMockRes();
		const next = vi.fn();

		getRecipes(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 500 when findMany rejects", async () => {
		(prisma.recipe.findMany as any).mockRejectedValue(new Error("DB error"));

		const req: any = { user: { id: "user-1" }, householdId: "hh-1" };
		const res = makeMockRes();
		const next = vi.fn();

		getRecipes(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 500 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 with recipes array on happy path", async () => {
		const mockDocs = [
			{
				id: "r-1",
				householdId: "hh-1",
				name: "Pasta",
				type: "Main",
				ingredients: [],
				portion: 2,
				description: "A classic",
			},
		];
		(prisma.recipe.findMany as any).mockResolvedValue(mockDocs);

		const req: any = { user: { id: "user-1" }, householdId: "hh-1" };
		const res = makeMockRes();
		const next = vi.fn();

		getRecipes(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		const jsonArg = res.json.mock.calls[0][0];
		expect(jsonArg.recipes[0]._id).toBe("r-1");
		expect(jsonArg.recipes[0].name).toBe("Pasta");
		expect(jsonArg.recipes[0].ingredients).toEqual([]);
		expect(next).not.toHaveBeenCalled();
	});

	it("calls findMany with the correct householdId", async () => {
		(prisma.recipe.findMany as any).mockResolvedValue([]);

		const req: any = { user: { id: "user-1" }, householdId: "hh-99" };
		const res = makeMockRes();
		const next = vi.fn();

		getRecipes(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(prisma.recipe.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: { householdId: "hh-99" } }),
		);
	});
});

// ---------------------------------------------------------------------------
// getRecipe
// ---------------------------------------------------------------------------

describe("getRecipe", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls next with 404 when recipe is not found", async () => {
		(prisma.recipe.findUnique as any).mockResolvedValue(null);

		const req: any = {
			user: { id: "user-1" },
			householdId: "hh-1",
			params: { id: "nonexistent-id" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		getRecipe(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 500 when findUnique rejects", async () => {
		(prisma.recipe.findUnique as any).mockRejectedValue(new Error("DB failure"));

		const req: any = {
			user: { id: "user-1" },
			householdId: "hh-1",
			params: { id: "r-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		getRecipe(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 500 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 with recipe on happy path", async () => {
		const mockDoc = {
			id: "r-1",
			householdId: "hh-1",
			name: "Lasagna",
			type: "Main",
			ingredients: [{ id: "ing-1", itemId: "item-1", quantity: 200, unit: "g", recipeId: "r-1" }],
			portion: 4,
			description: "Italian classic",
		};
		(prisma.recipe.findUnique as any).mockResolvedValue(mockDoc);

		const req: any = {
			user: { id: "user-1" },
			householdId: "hh-1",
			params: { id: "r-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		getRecipe(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		const jsonArg = res.json.mock.calls[0][0];
		expect(jsonArg.recipe._id).toBe("r-1");
		expect(jsonArg.recipe.name).toBe("Lasagna");
		expect(jsonArg.recipe.ingredients[0]._id).toBe("ing-1");
		expect(jsonArg.recipe.ingredients[0].item).toBe("item-1");
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// createRecipe
// ---------------------------------------------------------------------------

describe("createRecipe", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls next with 400 when name is missing", () => {
		const req: any = {
			body: {},
			user: { id: "user-1" },
			householdId: "hh-1",
		};
		const res = makeMockRes();
		const next = vi.fn();

		createRecipe(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when householdId is missing", () => {
		const req: any = {
			body: { name: "Soup" },
			user: { id: "user-1" },
			householdId: undefined,
		};
		const res = makeMockRes();
		const next = vi.fn();

		createRecipe(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 500 when create rejects", async () => {
		(prisma.recipe.create as any).mockRejectedValue(new Error("Save failed"));

		const req: any = {
			body: { name: "Soup" },
			user: { id: "user-1" },
			householdId: "hh-1",
		};
		const res = makeMockRes();
		const next = vi.fn();

		createRecipe(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 500 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 201 with recipe on happy path", async () => {
		const savedDoc = {
			id: "r-new",
			householdId: "hh-1",
			name: "Soup",
			type: null,
			ingredients: [],
			portion: null,
			description: null,
		};
		(prisma.recipe.create as any).mockResolvedValue(savedDoc);

		const req: any = {
			body: { name: "Soup" },
			user: { id: "user-1" },
			householdId: "hh-1",
		};
		const res = makeMockRes();
		const next = vi.fn();

		createRecipe(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(201));
		const jsonArg = res.json.mock.calls[0][0];
		expect(jsonArg.message).toBe("Recipe created!");
		expect(jsonArg.recipe._id).toBe("r-new");
		expect(next).not.toHaveBeenCalled();
	});

	it("calls next with 404 when user is missing", () => {
		const req: any = {
			body: { name: "Soup" },
			user: undefined,
			householdId: "hh-1",
		};
		const res = makeMockRes();
		const next = vi.fn();

		createRecipe(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// updateRecipe
// ---------------------------------------------------------------------------

describe("updateRecipe", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls next with 400 when recipeId is missing", () => {
		const req: any = {
			householdId: "hh-1",
			body: { name: "Updated" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		updateRecipe(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when recipe is not found", async () => {
		(prisma.recipe.findUnique as any).mockResolvedValue(null);

		const req: any = {
			householdId: "hh-1",
			body: { recipeId: "nonexistent-id", name: "Updated" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		updateRecipe(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 500 when findUnique rejects", async () => {
		(prisma.recipe.findUnique as any).mockRejectedValue(new Error("DB error"));

		const req: any = {
			householdId: "hh-1",
			body: { recipeId: "r-1", name: "Updated" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		updateRecipe(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 500 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 with updated recipe on happy path", async () => {
		const existingDoc = {
			id: "r-1",
			householdId: "hh-1",
			name: "Old Name",
			type: null,
			portion: null,
			description: null,
		};
		const updatedDoc = {
			id: "r-1",
			householdId: "hh-1",
			name: "Updated Name",
			type: "Dessert",
			ingredients: [],
			portion: 3,
			description: "Updated desc",
		};

		(prisma.recipe.findUnique as any).mockResolvedValue(existingDoc);
		(prisma.recipe.update as any).mockResolvedValue(updatedDoc);

		const req: any = {
			householdId: "hh-1",
			body: {
				recipeId: "r-1",
				name: "Updated Name",
				type: "Dessert",
				portion: 3,
				description: "Updated desc",
			},
		};
		const res = makeMockRes();
		const next = vi.fn();

		updateRecipe(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		const jsonArg = res.json.mock.calls[0][0];
		expect(jsonArg.message).toBe("Recipe updated successfully");
		expect(jsonArg.recipe._id).toBe("r-1");
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// deleteRecipe
// ---------------------------------------------------------------------------

describe("deleteRecipe", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls next with 400 when recipeId is missing", () => {
		const req: any = { body: {} };
		const res = makeMockRes();
		const next = vi.fn();

		deleteRecipe(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when recipe is not found", async () => {
		(prisma.recipe.findUnique as any).mockResolvedValue(null);

		const req: any = { body: { recipeId: "nonexistent-id" } };
		const res = makeMockRes();
		const next = vi.fn();

		deleteRecipe(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 500 when delete rejects", async () => {
		const existingDoc = { id: "r-1", householdId: "hh-1", name: "Recipe" };
		(prisma.recipe.findUnique as any).mockResolvedValue(existingDoc);
		(prisma.recipe.delete as any).mockRejectedValue(new Error("DB down"));

		const req: any = { body: { recipeId: "r-1" } };
		const res = makeMockRes();
		const next = vi.fn();

		deleteRecipe(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 500 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 on successful deletion", async () => {
		const existingDoc = { id: "r-1", householdId: "hh-1", name: "Deleted Recipe" };
		(prisma.recipe.findUnique as any).mockResolvedValue(existingDoc);
		(prisma.recipe.delete as any).mockResolvedValue(existingDoc);

		const req: any = { body: { recipeId: "r-1" } };
		const res = makeMockRes();
		const next = vi.fn();

		deleteRecipe(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			message: "Recipe deleted successfully",
		});
		expect(next).not.toHaveBeenCalled();
	});

	it("calls delete with the correct id", async () => {
		const existingDoc = { id: "r-99", householdId: "hh-1", name: "Gone" };
		(prisma.recipe.findUnique as any).mockResolvedValue(existingDoc);
		(prisma.recipe.delete as any).mockResolvedValue(existingDoc);

		const req: any = { body: { recipeId: "r-99" } };
		const res = makeMockRes();
		const next = vi.fn();

		deleteRecipe(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(prisma.recipe.delete).toHaveBeenCalledWith({ where: { id: "r-99" } });
	});
});

// ---------------------------------------------------------------------------
// getMissingIngredients
// ---------------------------------------------------------------------------

describe("getMissingIngredients", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls next with 404 when req.user is missing", () => {
		const req: any = { user: undefined, householdId: "hh-1", params: { id: "r-1" } };
		const res = makeMockRes();
		const next = vi.fn();

		getMissingIngredients(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when householdId is missing", () => {
		const req: any = { user: { id: "user-1" }, householdId: undefined, params: { id: "r-1" } };
		const res = makeMockRes();
		const next = vi.fn();

		getMissingIngredients(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when recipe is not found", async () => {
		(prisma.recipe.findUnique as any).mockResolvedValue(null);

		const req: any = { user: { id: "user-1" }, householdId: "hh-1", params: { id: "nonexistent-id" } };
		const res = makeMockRes();
		const next = vi.fn();

		getMissingIngredients(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 500 when findUnique rejects", async () => {
		(prisma.recipe.findUnique as any).mockRejectedValue(new Error("DB error"));

		const req: any = { user: { id: "user-1" }, householdId: "hh-1", params: { id: "r-1" } };
		const res = makeMockRes();
		const next = vi.fn();

		getMissingIngredients(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 500 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 with empty array when all ingredients are sufficiently stocked", async () => {
		const itemId = "item-1";
		const mockRecipe = {
			id: "r-1",
			householdId: "hh-1",
			name: "Bread",
			ingredients: [
				{ id: "ing-1", itemId, quantity: 200, unit: "g", recipeId: "r-1", item: { id: itemId, name: "Flour" } },
			],
		};
		(prisma.recipe.findUnique as any).mockResolvedValue(mockRecipe);
		(prisma.shelfItem.findMany as any).mockResolvedValue([
			{ id: "si-1", shelfId: "shelf-1", itemId, quantity: 500, unit: "g" },
		]);

		const req: any = { user: { id: "user-1" }, householdId: "hh-1", params: { id: "r-1" } };
		const res = makeMockRes();
		const next = vi.fn();

		getMissingIngredients(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith([]);
		expect(next).not.toHaveBeenCalled();
	});

	it("returns missing ingredient when shelf quantity is insufficient", async () => {
		const itemId = "item-2";
		const mockRecipe = {
			id: "r-1",
			householdId: "hh-1",
			name: "Cake",
			ingredients: [
				{ id: "ing-2", itemId, quantity: 300, unit: "g", recipeId: "r-1", item: { id: itemId, name: "Sugar" } },
			],
		};
		(prisma.recipe.findUnique as any).mockResolvedValue(mockRecipe);
		(prisma.shelfItem.findMany as any).mockResolvedValue([
			{ id: "si-1", shelfId: "shelf-1", itemId, quantity: 100, unit: "g" },
		]);

		const req: any = { user: { id: "user-1" }, householdId: "hh-1", params: { id: "r-1" } };
		const res = makeMockRes();
		const next = vi.fn();

		getMissingIngredients(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith([
			{ item: { _id: itemId, name: "Sugar" }, amount: 300, unit: "g" },
		]);
		expect(next).not.toHaveBeenCalled();
	});

	it("returns missing ingredient when item is not on any shelf", async () => {
		const itemId = "item-3";
		const mockRecipe = {
			id: "r-1",
			householdId: "hh-1",
			name: "Soup",
			ingredients: [
				{ id: "ing-3", itemId, quantity: 50, unit: "g", recipeId: "r-1", item: { id: itemId, name: "Salt" } },
			],
		};
		(prisma.recipe.findUnique as any).mockResolvedValue(mockRecipe);
		(prisma.shelfItem.findMany as any).mockResolvedValue([]);

		const req: any = { user: { id: "user-1" }, householdId: "hh-1", params: { id: "r-1" } };
		const res = makeMockRes();
		const next = vi.fn();

		getMissingIngredients(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith([
			{ item: { _id: itemId, name: "Salt" }, amount: 50, unit: "g" },
		]);
		expect(next).not.toHaveBeenCalled();
	});

	it("treats shelf quantity as 0 when units differ (case-insensitive mismatch)", async () => {
		const itemId = "item-4";
		const mockRecipe = {
			id: "r-1",
			householdId: "hh-1",
			name: "Smoothie",
			ingredients: [
				{ id: "ing-4", itemId, quantity: 2, unit: "L", recipeId: "r-1", item: { id: itemId, name: "Milk" } },
			],
		};
		(prisma.recipe.findUnique as any).mockResolvedValue(mockRecipe);
		// shelf has ml, recipe needs L → different units → missing
		(prisma.shelfItem.findMany as any).mockResolvedValue([
			{ id: "si-1", shelfId: "shelf-1", itemId, quantity: 5000, unit: "ml" },
		]);

		const req: any = { user: { id: "user-1" }, householdId: "hh-1", params: { id: "r-1" } };
		const res = makeMockRes();
		const next = vi.fn();

		getMissingIngredients(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith([
			{ item: { _id: itemId, name: "Milk" }, amount: 2, unit: "L" },
		]);
		expect(next).not.toHaveBeenCalled();
	});

	it("matches units case-insensitively (shelf 'G' matches recipe 'g')", async () => {
		const itemId = "item-5";
		const mockRecipe = {
			id: "r-1",
			householdId: "hh-1",
			name: "Stew",
			ingredients: [
				{ id: "ing-5", itemId, quantity: 10, unit: "g", recipeId: "r-1", item: { id: itemId, name: "Pepper" } },
			],
		};
		(prisma.recipe.findUnique as any).mockResolvedValue(mockRecipe);
		(prisma.shelfItem.findMany as any).mockResolvedValue([
			{ id: "si-1", shelfId: "shelf-1", itemId, quantity: 50, unit: "G" },
		]);

		const req: any = { user: { id: "user-1" }, householdId: "hh-1", params: { id: "r-1" } };
		const res = makeMockRes();
		const next = vi.fn();

		getMissingIngredients(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		// 50G on shelf >= 10g required → not missing
		expect(res.json).toHaveBeenCalledWith([]);
		expect(next).not.toHaveBeenCalled();
	});

	it("sums quantities across multiple shelf items for the same item and unit", async () => {
		const itemId = "item-7";
		const mockRecipe = {
			id: "r-1",
			householdId: "hh-1",
			name: "Rice dish",
			ingredients: [
				{ id: "ing-7", itemId, quantity: 500, unit: "g", recipeId: "r-1", item: { id: itemId, name: "Rice" } },
			],
		};
		(prisma.recipe.findUnique as any).mockResolvedValue(mockRecipe);
		// Two shelf items each with 300g → total 600g >= 500g
		(prisma.shelfItem.findMany as any).mockResolvedValue([
			{ id: "si-1", shelfId: "shelf-1", itemId, quantity: 300, unit: "g" },
			{ id: "si-2", shelfId: "shelf-2", itemId, quantity: 300, unit: "g" },
		]);

		const req: any = { user: { id: "user-1" }, householdId: "hh-1", params: { id: "r-1" } };
		const res = makeMockRes();
		const next = vi.fn();

		getMissingIngredients(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith([]);
	});
});
