import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../lib/prisma", () => ({
	prisma: {
		recipeType: {
			findMany: vi.fn(),
			findUnique: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
	},
}));

import { prisma } from "../../../lib/prisma";
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
		const req: any = { user: { id: "user-1" }, householdId: undefined };
		const res = makeMockRes();
		const next = vi.fn();

		getRecipeTypes(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 500 when findMany rejects", async () => {
		(prisma.recipeType.findMany as any).mockRejectedValue(new Error("DB error"));

		const req: any = { user: { id: "user-1" }, householdId: "hh-1" };
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
			{ id: "rt-1", name: "Dessert", householdId: "hh-1" },
			{ id: "rt-2", name: "Main Course", householdId: "hh-1" },
		];
		(prisma.recipeType.findMany as any).mockResolvedValue(mockDocs);

		const req: any = { user: { id: "user-1" }, householdId: "hh-1" };
		const res = makeMockRes();
		const next = vi.fn();

		getRecipeTypes(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			recipeTypes: mockDocs.map((d) => ({
				_id: d.id,
				name: d.name,
				householdId: d.householdId,
			})),
		});
		expect(next).not.toHaveBeenCalled();
	});

	it("findMany is called with the correct householdId", async () => {
		(prisma.recipeType.findMany as any).mockResolvedValue([]);

		const req: any = { user: { id: "user-1" }, householdId: "hh-42" };
		const res = makeMockRes();
		const next = vi.fn();

		getRecipeTypes(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(prisma.recipeType.findMany).toHaveBeenCalledWith({ where: { householdId: "hh-42" } });
	});
});

// ---------------------------------------------------------------------------
// createRecipeType
// ---------------------------------------------------------------------------

describe("createRecipeType", () => {
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
			user: { id: "user-1" },
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

	it("calls next with 500 when create rejects", async () => {
		(prisma.recipeType.create as any).mockRejectedValue(new Error("Save failed"));

		const req: any = {
			body: { name: "Soups" },
			user: { id: "user-1" },
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
		const savedDoc = { id: "rt-new", name: "Soups", householdId: "hh-1" };
		(prisma.recipeType.create as any).mockResolvedValue(savedDoc);

		const req: any = {
			body: { name: "Soups" },
			user: { id: "user-1" },
			householdId: "hh-1",
		};
		const res = makeMockRes();
		const next = vi.fn();

		createRecipeType(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(201));
		expect(res.json).toHaveBeenCalledWith({
			message: "Recipe type created!",
			recipeType: { _id: "rt-new", name: "Soups", householdId: "hh-1" },
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

	it("calls next with 404 when recipeType is not found", async () => {
		(prisma.recipeType.findUnique as any).mockResolvedValue(null);

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

	it("calls next with 500 when findUnique rejects", async () => {
		(prisma.recipeType.findUnique as any).mockRejectedValue(new Error("DB error"));

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
		const existingDoc = { id: "rt-1", name: "Old Name", householdId: "hh-1" };
		const updatedDoc = { id: "rt-1", name: "Renamed", householdId: "hh-1" };

		(prisma.recipeType.findUnique as any).mockResolvedValue(existingDoc);
		(prisma.recipeType.update as any).mockResolvedValue(updatedDoc);

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
			recipeTypeId: "rt-1",
		});
		expect(next).not.toHaveBeenCalled();
	});

	it("calls update with the correct name", async () => {
		const existingDoc = { id: "rt-1", name: "Old Name", householdId: "hh-1" };
		const updatedDoc = { id: "rt-1", name: "Renamed", householdId: "hh-1" };

		(prisma.recipeType.findUnique as any).mockResolvedValue(existingDoc);
		(prisma.recipeType.update as any).mockResolvedValue(updatedDoc);

		const req: any = {
			householdId: "hh-1",
			body: { recipeTypeId: "rt-1", name: "Renamed" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		renameRecipeType(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(prisma.recipeType.update).toHaveBeenCalledWith(
			expect.objectContaining({ data: { name: "Renamed" } }),
		);
	});
});

// ---------------------------------------------------------------------------
// deleteRecipeType
// ---------------------------------------------------------------------------

describe("deleteRecipeType", () => {
	beforeEach(() => {
		vi.clearAllMocks();
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

	it("calls next with 404 when recipeType is not found", async () => {
		(prisma.recipeType.findUnique as any).mockResolvedValue(null);

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

	it("calls next with 500 when delete rejects", async () => {
		const existingDoc = { id: "rt-1", name: "Dessert", householdId: "hh-1" };
		(prisma.recipeType.findUnique as any).mockResolvedValue(existingDoc);
		(prisma.recipeType.delete as any).mockRejectedValue(new Error("DB down"));

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
		const existingDoc = { id: "rt-1", name: "Dessert", householdId: "hh-1" };
		(prisma.recipeType.findUnique as any).mockResolvedValue(existingDoc);
		(prisma.recipeType.delete as any).mockResolvedValue(existingDoc);

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

	it("calls delete with the correct id", async () => {
		const existingDoc = { id: "rt-99", name: "Snacks", householdId: "hh-1" };
		(prisma.recipeType.findUnique as any).mockResolvedValue(existingDoc);
		(prisma.recipeType.delete as any).mockResolvedValue(existingDoc);

		const req: any = { body: { recipeTypeId: "rt-99" } };
		const res = makeMockRes();
		const next = vi.fn();

		deleteRecipeType(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(prisma.recipeType.delete).toHaveBeenCalledWith({ where: { id: "rt-99" } });
	});
});
