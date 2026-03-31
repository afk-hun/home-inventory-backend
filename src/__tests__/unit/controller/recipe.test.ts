import { describe, it, expect, vi, beforeEach } from "vitest";

// Module-level save mock — tests can replace the resolved value per-test
let mockSave = vi.fn();

vi.mock("../../../models/recipe", () => {
	const find = vi.fn();
	const findById = vi.fn();
	const findByIdAndDelete = vi.fn();

	// Must be a regular function (not arrow) so `new Recipe(...)` works.
	const MockRecipe = vi.fn(function MockRecipeImpl(this: any, data: any) {
		Object.assign(this, data);
		this.save = (...args: any[]) => mockSave(...args);
	});

	(MockRecipe as any).find = find;
	(MockRecipe as any).findById = findById;
	(MockRecipe as any).findByIdAndDelete = findByIdAndDelete;

	return { default: MockRecipe };
});

vi.mock("../../../models/shelf", () => {
	const find = vi.fn();
	return { default: { find } };
});

import Recipe from "../../../models/recipe";
import Shelf from "../../../models/shelf";
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
		mockSave = vi.fn();
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
		const req: any = { user: { _id: "user-1" }, householdId: undefined };
		const res = makeMockRes();
		const next = vi.fn();

		getRecipes(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 500 when Recipe.find rejects", async () => {
		(Recipe.find as any).mockRejectedValue(new Error("DB error"));

		const req: any = { user: { _id: "user-1" }, householdId: "hh-1" };
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
				_id: "r-1",
				householdId: "hh-1",
				name: "Pasta",
				type: "Main",
				ingredients: [],
				portion: 2,
				description: "A classic",
			},
			{
				_id: "r-2",
				householdId: "hh-1",
				name: "Salad",
				type: undefined,
				ingredients: [],
				portion: undefined,
				description: undefined,
			},
		];
		(Recipe.find as any).mockResolvedValue(mockDocs);

		const req: any = { user: { _id: "user-1" }, householdId: "hh-1" };
		const res = makeMockRes();
		const next = vi.fn();

		getRecipes(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			recipes: mockDocs.map((d) => ({
				_id: d._id,
				householdId: d.householdId,
				name: d.name,
				type: d.type,
				ingredients: d.ingredients,
				portion: d.portion,
				description: d.description,
			})),
		});
		expect(next).not.toHaveBeenCalled();
	});

	it("calls Recipe.find with the correct householdId", async () => {
		(Recipe.find as any).mockResolvedValue([]);

		const req: any = { user: { _id: "user-1" }, householdId: "hh-99" };
		const res = makeMockRes();
		const next = vi.fn();

		getRecipes(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(Recipe.find).toHaveBeenCalledWith({ householdId: "hh-99" });
	});
});

// ---------------------------------------------------------------------------
// getRecipe
// ---------------------------------------------------------------------------

describe("getRecipe", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
	});

	it("calls next with 404 when recipe is not found", async () => {
		(Recipe.findById as any).mockResolvedValue(null);

		const req: any = {
			user: { _id: "user-1" },
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

	it("calls next with 500 when Recipe.findById rejects", async () => {
		(Recipe.findById as any).mockRejectedValue(new Error("DB failure"));

		const req: any = {
			user: { _id: "user-1" },
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
			_id: "r-1",
			householdId: "hh-1",
			name: "Lasagna",
			type: "Main",
			ingredients: [],
			portion: 4,
			description: "Italian classic",
		};
		(Recipe.findById as any).mockResolvedValue(mockDoc);

		const req: any = {
			user: { _id: "user-1" },
			householdId: "hh-1",
			params: { id: "r-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		getRecipe(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			recipe: {
				_id: mockDoc._id,
				householdId: mockDoc.householdId,
				name: mockDoc.name,
				type: mockDoc.type,
				ingredients: mockDoc.ingredients,
				portion: mockDoc.portion,
				description: mockDoc.description,
			},
		});
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// createRecipe
// ---------------------------------------------------------------------------

describe("createRecipe", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
	});

	it("calls next with 400 when name is missing", () => {
		const req: any = {
			body: {},
			user: { _id: "user-1" },
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
			user: { _id: "user-1" },
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

	it("calls next with 500 when save rejects", async () => {
		mockSave = vi.fn().mockRejectedValue(new Error("Save failed"));

		const req: any = {
			body: { name: "Soup" },
			user: { _id: "user-1" },
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
			_id: "r-new",
			householdId: "hh-1",
			name: "Soup",
			type: undefined,
			ingredients: [],
			portion: undefined,
			description: undefined,
		};
		mockSave = vi.fn().mockResolvedValue(savedDoc);

		const req: any = {
			body: { name: "Soup" },
			user: { _id: "user-1" },
			householdId: "hh-1",
		};
		const res = makeMockRes();
		const next = vi.fn();

		createRecipe(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(201));
		expect(res.json).toHaveBeenCalledWith({
			message: "Recipe created!",
			recipe: savedDoc,
		});
		expect(next).not.toHaveBeenCalled();
	});

	it("calls next with 404 when user is missing (checked before householdId)", () => {
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
		mockSave = vi.fn();
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
		(Recipe.findById as any).mockResolvedValue(null);

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

	it("calls next with 500 when findById rejects", async () => {
		(Recipe.findById as any).mockRejectedValue(new Error("DB error"));

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
		const updatedDoc = {
			_id: "r-1",
			householdId: "hh-1",
			name: "Updated Name",
			type: "Dessert",
			ingredients: [],
			portion: 3,
			description: "Updated desc",
		};
		const mockFoundDoc: any = {
			_id: "r-1",
			name: "Old Name",
			type: undefined,
			ingredients: [],
			portion: undefined,
			description: undefined,
			save: vi.fn().mockResolvedValue(updatedDoc),
		};
		(Recipe.findById as any).mockResolvedValue(mockFoundDoc);

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
		expect(res.json).toHaveBeenCalledWith({
			message: "Recipe updated successfully",
			recipe: updatedDoc,
		});
		expect(next).not.toHaveBeenCalled();
	});

	it("only updates fields that are provided (leaves others unchanged)", async () => {
		const mockFoundDoc: any = {
			_id: "r-1",
			name: "Old Name",
			type: "OldType",
			ingredients: [],
			portion: 5,
			description: "Old desc",
			save: vi.fn().mockResolvedValue({ _id: "r-1", name: "New Name" }),
		};
		(Recipe.findById as any).mockResolvedValue(mockFoundDoc);

		const req: any = {
			householdId: "hh-1",
			body: { recipeId: "r-1", name: "New Name" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		updateRecipe(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		// Name should be updated
		expect(mockFoundDoc.name).toBe("New Name");
		// Other fields left intact since they were not in the body
		expect(mockFoundDoc.type).toBe("OldType");
		expect(mockFoundDoc.portion).toBe(5);
		expect(mockFoundDoc.description).toBe("Old desc");
	});
});

// ---------------------------------------------------------------------------
// deleteRecipe
// ---------------------------------------------------------------------------

describe("deleteRecipe", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
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

	it("calls next with 404 when findByIdAndDelete returns null", async () => {
		(Recipe.findByIdAndDelete as any).mockResolvedValue(null);

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

	it("calls next with 500 when findByIdAndDelete rejects", async () => {
		(Recipe.findByIdAndDelete as any).mockRejectedValue(new Error("DB down"));

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
		const deletedDoc = {
			_id: "r-1",
			householdId: "hh-1",
			name: "Deleted Recipe",
		};
		(Recipe.findByIdAndDelete as any).mockResolvedValue(deletedDoc);

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

	it("calls findByIdAndDelete with the correct id", async () => {
		const deletedDoc = { _id: "r-99", name: "Gone", householdId: "hh-1" };
		(Recipe.findByIdAndDelete as any).mockResolvedValue(deletedDoc);

		const req: any = { body: { recipeId: "r-99" } };
		const res = makeMockRes();
		const next = vi.fn();

		deleteRecipe(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(Recipe.findByIdAndDelete).toHaveBeenCalledWith("r-99");
	});
});

// ---------------------------------------------------------------------------
// getMissingIngredients
// ---------------------------------------------------------------------------

describe("getMissingIngredients", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
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
		const req: any = { user: { _id: "user-1" }, householdId: undefined, params: { id: "r-1" } };
		const res = makeMockRes();
		const next = vi.fn();

		getMissingIngredients(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when recipe is not found", async () => {
		const mockFindById = {
			populate: vi.fn().mockResolvedValue(null),
		};
		(Recipe.findById as any).mockReturnValue(mockFindById);

		const req: any = { user: { _id: "user-1" }, householdId: "hh-1", params: { id: "nonexistent-id" } };
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

	it("calls next with 500 when Recipe.findById rejects", async () => {
		const mockFindById = {
			populate: vi.fn().mockRejectedValue(new Error("DB error")),
		};
		(Recipe.findById as any).mockReturnValue(mockFindById);

		const req: any = { user: { _id: "user-1" }, householdId: "hh-1", params: { id: "r-1" } };
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
			ingredients: [
				{ item: { _id: itemId, name: "Flour" }, quantity: 200, unit: "g" },
			],
		};
		const mockFindById = {
			populate: vi.fn().mockResolvedValue(mockRecipe),
		};
		(Recipe.findById as any).mockReturnValue(mockFindById);
		(Shelf.find as any).mockResolvedValue([
			{
				items: [
					{ item: { toString: () => itemId }, quantity: 500, unit: "g" },
				],
			},
		]);

		const req: any = { user: { _id: "user-1" }, householdId: "hh-1", params: { id: "r-1" } };
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
			ingredients: [
				{ item: { _id: itemId, name: "Sugar" }, quantity: 300, unit: "g" },
			],
		};
		const mockFindById = {
			populate: vi.fn().mockResolvedValue(mockRecipe),
		};
		(Recipe.findById as any).mockReturnValue(mockFindById);
		(Shelf.find as any).mockResolvedValue([
			{
				items: [
					{ item: { toString: () => itemId }, quantity: 100, unit: "g" },
				],
			},
		]);

		const req: any = { user: { _id: "user-1" }, householdId: "hh-1", params: { id: "r-1" } };
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
			ingredients: [
				{ item: { _id: itemId, name: "Salt" }, quantity: 50, unit: "g" },
			],
		};
		const mockFindById = {
			populate: vi.fn().mockResolvedValue(mockRecipe),
		};
		(Recipe.findById as any).mockReturnValue(mockFindById);
		(Shelf.find as any).mockResolvedValue([]);

		const req: any = { user: { _id: "user-1" }, householdId: "hh-1", params: { id: "r-1" } };
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
			ingredients: [
				{ item: { _id: itemId, name: "Milk" }, quantity: 2, unit: "L" },
			],
		};
		const mockFindById = {
			populate: vi.fn().mockResolvedValue(mockRecipe),
		};
		(Recipe.findById as any).mockReturnValue(mockFindById);
		(Shelf.find as any).mockResolvedValue([
			{
				items: [
					// shelf has ml, recipe needs L — different units → treat as 0
					{ item: { toString: () => itemId }, quantity: 5000, unit: "ml" },
				],
			},
		]);

		const req: any = { user: { _id: "user-1" }, householdId: "hh-1", params: { id: "r-1" } };
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
			ingredients: [
				{ item: { _id: itemId, name: "Pepper" }, quantity: 10, unit: "g" },
			],
		};
		const mockFindById = {
			populate: vi.fn().mockResolvedValue(mockRecipe),
		};
		(Recipe.findById as any).mockReturnValue(mockFindById);
		(Shelf.find as any).mockResolvedValue([
			{
				items: [
					{ item: { toString: () => itemId }, quantity: 50, unit: "G" },
				],
			},
		]);

		const req: any = { user: { _id: "user-1" }, householdId: "hh-1", params: { id: "r-1" } };
		const res = makeMockRes();
		const next = vi.fn();

		getMissingIngredients(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		// 50G on shelf >= 10g required → not missing
		expect(res.json).toHaveBeenCalledWith([]);
		expect(next).not.toHaveBeenCalled();
	});

	it("returns full required amount (not the difference) when partially stocked", async () => {
		const itemId = "item-6";
		const mockRecipe = {
			ingredients: [
				{ item: { _id: itemId, name: "Butter" }, quantity: 400, unit: "g" },
			],
		};
		const mockFindById = {
			populate: vi.fn().mockResolvedValue(mockRecipe),
		};
		(Recipe.findById as any).mockReturnValue(mockFindById);
		(Shelf.find as any).mockResolvedValue([
			{
				items: [
					{ item: { toString: () => itemId }, quantity: 150, unit: "g" },
				],
			},
		]);

		const req: any = { user: { _id: "user-1" }, householdId: "hh-1", params: { id: "r-1" } };
		const res = makeMockRes();
		const next = vi.fn();

		getMissingIngredients(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		// Returns full 400, not 250 (the difference)
		expect(res.json).toHaveBeenCalledWith([
			{ item: { _id: itemId, name: "Butter" }, amount: 400, unit: "g" },
		]);
	});

	it("sums quantities across multiple shelves for the same item and unit", async () => {
		const itemId = "item-7";
		const mockRecipe = {
			ingredients: [
				{ item: { _id: itemId, name: "Rice" }, quantity: 500, unit: "g" },
			],
		};
		const mockFindById = {
			populate: vi.fn().mockResolvedValue(mockRecipe),
		};
		(Recipe.findById as any).mockReturnValue(mockFindById);
		// Two shelves each with 300g → total 600g >= 500g
		(Shelf.find as any).mockResolvedValue([
			{ items: [{ item: { toString: () => itemId }, quantity: 300, unit: "g" }] },
			{ items: [{ item: { toString: () => itemId }, quantity: 300, unit: "g" }] },
		]);

		const req: any = { user: { _id: "user-1" }, householdId: "hh-1", params: { id: "r-1" } };
		const res = makeMockRes();
		const next = vi.fn();

		getMissingIngredients(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith([]);
	});
});
