import { describe, it, expect, vi, beforeEach } from "vitest";

// Module-level save mock — tests can replace the resolved value per-test
let mockSave = vi.fn();

vi.mock("../../../models/recipeType", () => {
	const find = vi.fn();
	const findById = vi.fn();
	const findByIdAndDelete = vi.fn();

	// Must be a regular function (not arrow) so `new RecipeType(...)` works.
	const MockRecipeType = vi.fn(function MockRecipeTypeImpl(this: any, data: any) {
		Object.assign(this, data);
		this.save = (...args: any[]) => mockSave(...args);
	});

	(MockRecipeType as any).find = find;
	(MockRecipeType as any).findById = findById;
	(MockRecipeType as any).findByIdAndDelete = findByIdAndDelete;

	return { default: MockRecipeType };
});

import RecipeType from "../../../models/recipeType";
import {
	getRecipeTypes,
	createRecipeType,
	renameRecipeType,
	deleteRecipeType,
} from "../../../controller/recipeTypeController";

const makeMockRes = () => {
	const res: any = {};
	res.status = vi.fn().mockReturnValue(res);
	res.json = vi.fn().mockReturnValue(res);
	return res;
};

// ---------------------------------------------------------------------------
// getRecipeTypes
// ---------------------------------------------------------------------------

describe("getRecipeTypes", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
	});

	it("calls next with 404 when req.user is missing", () => {
		const req: any = { user: undefined, householdId: "hh-1" };
		const res = makeMockRes();
		const next = vi.fn();

		getRecipeTypes(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when householdId is missing", () => {
		const req: any = { user: { _id: "user-1" }, householdId: undefined };
		const res = makeMockRes();
		const next = vi.fn();

		getRecipeTypes(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 500 when RecipeType.find rejects", async () => {
		(RecipeType.find as any).mockRejectedValue(new Error("DB error"));

		const req: any = { user: { _id: "user-1" }, householdId: "hh-1" };
		const res = makeMockRes();
		const next = vi.fn();

		getRecipeTypes(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 500 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 with recipeTypes array on happy path", async () => {
		const mockDocs = [
			{ _id: "rt-1", name: "Dessert", householdId: "hh-1" },
			{ _id: "rt-2", name: "Main Course", householdId: "hh-1" },
		];
		(RecipeType.find as any).mockResolvedValue(mockDocs);

		const req: any = { user: { _id: "user-1" }, householdId: "hh-1" };
		const res = makeMockRes();
		const next = vi.fn();

		getRecipeTypes(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			recipeTypes: mockDocs.map((d) => ({
				_id: d._id,
				name: d.name,
				householdId: d.householdId,
			})),
		});
		expect(next).not.toHaveBeenCalled();
	});

	it("RecipeType.find is called with the correct householdId", async () => {
		(RecipeType.find as any).mockResolvedValue([]);

		const req: any = { user: { _id: "user-1" }, householdId: "hh-42" };
		const res = makeMockRes();
		const next = vi.fn();

		getRecipeTypes(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(RecipeType.find).toHaveBeenCalledWith({ householdId: "hh-42" });
	});
});

// ---------------------------------------------------------------------------
// createRecipeType
// ---------------------------------------------------------------------------

describe("createRecipeType", () => {
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

		createRecipeType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 400 when owner (user) is missing", () => {
		const req: any = {
			body: { name: "Soups" },
			user: undefined,
			householdId: "hh-1",
		};
		const res = makeMockRes();
		const next = vi.fn();

		createRecipeType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 400 when householdId is missing", () => {
		const req: any = {
			body: { name: "Soups" },
			user: { _id: "user-1" },
			householdId: undefined,
		};
		const res = makeMockRes();
		const next = vi.fn();

		createRecipeType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 500 when save rejects", async () => {
		mockSave = vi.fn().mockRejectedValue(new Error("Save failed"));

		const req: any = {
			body: { name: "Soups" },
			user: { _id: "user-1" },
			householdId: "hh-1",
		};
		const res = makeMockRes();
		const next = vi.fn();

		createRecipeType(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 500 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 201 with recipeType on happy path", async () => {
		const savedDoc = {
			_id: "rt-new",
			name: "Soups",
			householdId: "hh-1",
		};
		mockSave = vi.fn().mockResolvedValue(savedDoc);

		const req: any = {
			body: { name: "Soups" },
			user: { _id: "user-1" },
			householdId: "hh-1",
		};
		const res = makeMockRes();
		const next = vi.fn();

		createRecipeType(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(201));
		expect(res.json).toHaveBeenCalledWith({
			message: "Recipe type created!",
			recipeType: savedDoc,
		});
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// renameRecipeType
// ---------------------------------------------------------------------------

describe("renameRecipeType", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
	});

	it("calls next with 400 when householdId is missing", () => {
		const req: any = {
			householdId: undefined,
			body: { recipeTypeId: "rt-1", name: "New Name" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		renameRecipeType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 400 when recipeTypeId is missing", () => {
		const req: any = {
			householdId: "hh-1",
			body: { name: "New Name" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		renameRecipeType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 400 when name is missing", () => {
		const req: any = {
			householdId: "hh-1",
			body: { recipeTypeId: "rt-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		renameRecipeType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when findById returns null", async () => {
		(RecipeType.findById as any).mockResolvedValue(null);

		const req: any = {
			householdId: "hh-1",
			body: { recipeTypeId: "nonexistent-id", name: "New Name" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		renameRecipeType(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 500 when findById rejects", async () => {
		(RecipeType.findById as any).mockRejectedValue(new Error("DB error"));

		const req: any = {
			householdId: "hh-1",
			body: { recipeTypeId: "rt-1", name: "New Name" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		renameRecipeType(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 500 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 with recipeTypeId on happy path", async () => {
		const updatedDoc = { _id: "rt-1", name: "Renamed" };
		const mockFoundDoc: any = {
			_id: "rt-1",
			name: "Old Name",
			save: vi.fn().mockResolvedValue(updatedDoc),
		};
		(RecipeType.findById as any).mockResolvedValue(mockFoundDoc);

		const req: any = {
			householdId: "hh-1",
			body: { recipeTypeId: "rt-1", name: "Renamed" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		renameRecipeType(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			message: "Recipe type renamed successfully",
			recipeTypeId: updatedDoc._id,
		});
		expect(next).not.toHaveBeenCalled();
	});

	it("updates the name on the found document before saving", async () => {
		const mockFoundDoc: any = {
			_id: "rt-1",
			name: "Old Name",
			save: vi.fn().mockResolvedValue({ _id: "rt-1", name: "Renamed" }),
		};
		(RecipeType.findById as any).mockResolvedValue(mockFoundDoc);

		const req: any = {
			householdId: "hh-1",
			body: { recipeTypeId: "rt-1", name: "Renamed" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		renameRecipeType(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		// The name mutation must have happened before save
		expect(mockFoundDoc.name).toBe("Renamed");
	});
});

// ---------------------------------------------------------------------------
// deleteRecipeType
// ---------------------------------------------------------------------------

describe("deleteRecipeType", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
	});

	it("calls next with 400 when recipeTypeId is missing", () => {
		const req: any = { body: {} };
		const res = makeMockRes();
		const next = vi.fn();

		deleteRecipeType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when findByIdAndDelete returns null", async () => {
		(RecipeType.findByIdAndDelete as any).mockResolvedValue(null);

		const req: any = { body: { recipeTypeId: "nonexistent-id" } };
		const res = makeMockRes();
		const next = vi.fn();

		deleteRecipeType(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 500 when findByIdAndDelete rejects", async () => {
		(RecipeType.findByIdAndDelete as any).mockRejectedValue(new Error("DB down"));

		const req: any = { body: { recipeTypeId: "rt-1" } };
		const res = makeMockRes();
		const next = vi.fn();

		deleteRecipeType(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 500 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 on successful deletion", async () => {
		const deletedDoc = { _id: "rt-1", name: "Dessert", householdId: "hh-1" };
		(RecipeType.findByIdAndDelete as any).mockResolvedValue(deletedDoc);

		const req: any = { body: { recipeTypeId: "rt-1" } };
		const res = makeMockRes();
		const next = vi.fn();

		deleteRecipeType(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			message: "Recipe type deleted successfully",
		});
		expect(next).not.toHaveBeenCalled();
	});

	it("calls findByIdAndDelete with the correct id", async () => {
		const deletedDoc = { _id: "rt-99", name: "Snacks", householdId: "hh-1" };
		(RecipeType.findByIdAndDelete as any).mockResolvedValue(deletedDoc);

		const req: any = { body: { recipeTypeId: "rt-99" } };
		const res = makeMockRes();
		const next = vi.fn();

		deleteRecipeType(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(RecipeType.findByIdAndDelete).toHaveBeenCalledWith("rt-99");
	});
});
