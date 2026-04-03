import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../lib/prisma", () => ({
	prisma: {
		mealType: {
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
	getMealTypes,
	createMealType,
	renameMealType,
	deleteMealType,
} from "../../../controller/mealTypeController";

const makeMockRes = () => {
	const res: any = {};
	res.status = vi.fn().mockReturnValue(res);
	res.json = vi.fn().mockReturnValue(res);
	return res;
};

// ---------------------------------------------------------------------------
// getMealTypes
// ---------------------------------------------------------------------------

describe("getMealTypes", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls next with 404 when req.user is missing", () => {
		const req: any = { user: undefined, householdId: "hh-1" };
		const res = makeMockRes();
		const next = vi.fn();

		getMealTypes(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when householdId is missing", () => {
		const req: any = { user: { id: "user-1" }, householdId: undefined };
		const res = makeMockRes();
		const next = vi.fn();

		getMealTypes(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 500 when findMany rejects", async () => {
		(prisma.mealType.findMany as any).mockRejectedValue(new Error("DB error"));

		const req: any = { user: { id: "user-1" }, householdId: "hh-1" };
		const res = makeMockRes();
		const next = vi.fn();

		getMealTypes(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 500 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 with mealTypes array on happy path", async () => {
		const mockDocs = [
			{ id: "mt-1", name: "Breakfast", householdId: "hh-1" },
			{ id: "mt-2", name: "Dinner", householdId: "hh-1" },
		];
		(prisma.mealType.findMany as any).mockResolvedValue(mockDocs);

		const req: any = { user: { id: "user-1" }, householdId: "hh-1" };
		const res = makeMockRes();
		const next = vi.fn();

		getMealTypes(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			mealTypes: mockDocs.map((d) => ({
				_id: d.id,
				name: d.name,
				householdId: d.householdId,
			})),
		});
		expect(next).not.toHaveBeenCalled();
	});

	it("findMany is called with the correct householdId", async () => {
		(prisma.mealType.findMany as any).mockResolvedValue([]);

		const req: any = { user: { id: "user-1" }, householdId: "hh-42" };
		const res = makeMockRes();
		const next = vi.fn();

		getMealTypes(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(prisma.mealType.findMany).toHaveBeenCalledWith({ where: { householdId: "hh-42" } });
	});
});

// ---------------------------------------------------------------------------
// createMealType
// ---------------------------------------------------------------------------

describe("createMealType", () => {
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

		createMealType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 400 when owner (user) is missing", () => {
		const req: any = {
			body: { name: "Lunch" },
			user: undefined,
			householdId: "hh-1",
		};
		const res = makeMockRes();
		const next = vi.fn();

		createMealType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 400 when householdId is missing", () => {
		const req: any = {
			body: { name: "Lunch" },
			user: { id: "user-1" },
			householdId: undefined,
		};
		const res = makeMockRes();
		const next = vi.fn();

		createMealType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 500 when create rejects", async () => {
		(prisma.mealType.create as any).mockRejectedValue(new Error("Save failed"));

		const req: any = {
			body: { name: "Lunch" },
			user: { id: "user-1" },
			householdId: "hh-1",
		};
		const res = makeMockRes();
		const next = vi.fn();

		createMealType(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 500 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 201 with mealType on happy path", async () => {
		const savedDoc = { id: "mt-new", name: "Lunch", householdId: "hh-1" };
		(prisma.mealType.create as any).mockResolvedValue(savedDoc);

		const req: any = {
			body: { name: "Lunch" },
			user: { id: "user-1" },
			householdId: "hh-1",
		};
		const res = makeMockRes();
		const next = vi.fn();

		createMealType(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(201));
		expect(res.json).toHaveBeenCalledWith({
			message: "Meal type created!",
			mealType: { _id: "mt-new", name: "Lunch", householdId: "hh-1" },
		});
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// renameMealType
// ---------------------------------------------------------------------------

describe("renameMealType", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls next with 400 when householdId is missing", () => {
		const req: any = {
			householdId: undefined,
			body: { mealTypeId: "mt-1", name: "New Name" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		renameMealType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 400 when mealTypeId is missing", () => {
		const req: any = {
			householdId: "hh-1",
			body: { name: "New Name" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		renameMealType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 400 when name is missing", () => {
		const req: any = {
			householdId: "hh-1",
			body: { mealTypeId: "mt-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		renameMealType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when mealType is not found", async () => {
		(prisma.mealType.findUnique as any).mockResolvedValue(null);

		const req: any = {
			householdId: "hh-1",
			body: { mealTypeId: "nonexistent-id", name: "New Name" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		renameMealType(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 500 when findUnique rejects", async () => {
		(prisma.mealType.findUnique as any).mockRejectedValue(new Error("DB error"));

		const req: any = {
			householdId: "hh-1",
			body: { mealTypeId: "mt-1", name: "New Name" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		renameMealType(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 500 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 with mealTypeId on happy path", async () => {
		const existingDoc = { id: "mt-1", name: "Old Name", householdId: "hh-1" };
		const updatedDoc = { id: "mt-1", name: "Renamed", householdId: "hh-1" };

		(prisma.mealType.findUnique as any).mockResolvedValue(existingDoc);
		(prisma.mealType.update as any).mockResolvedValue(updatedDoc);

		const req: any = {
			householdId: "hh-1",
			body: { mealTypeId: "mt-1", name: "Renamed" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		renameMealType(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			message: "Meal type renamed successfully",
			mealTypeId: "mt-1",
		});
		expect(next).not.toHaveBeenCalled();
	});

	it("calls update with the correct name", async () => {
		const existingDoc = { id: "mt-1", name: "Old Name", householdId: "hh-1" };
		const updatedDoc = { id: "mt-1", name: "Renamed", householdId: "hh-1" };

		(prisma.mealType.findUnique as any).mockResolvedValue(existingDoc);
		(prisma.mealType.update as any).mockResolvedValue(updatedDoc);

		const req: any = {
			householdId: "hh-1",
			body: { mealTypeId: "mt-1", name: "Renamed" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		renameMealType(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(prisma.mealType.update).toHaveBeenCalledWith(
			expect.objectContaining({ data: { name: "Renamed" } }),
		);
	});
});

// ---------------------------------------------------------------------------
// deleteMealType
// ---------------------------------------------------------------------------

describe("deleteMealType", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls next with 400 when mealTypeId is missing", () => {
		const req: any = { body: {} };
		const res = makeMockRes();
		const next = vi.fn();

		deleteMealType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when mealType is not found", async () => {
		(prisma.mealType.findUnique as any).mockResolvedValue(null);

		const req: any = { body: { mealTypeId: "nonexistent-id" } };
		const res = makeMockRes();
		const next = vi.fn();

		deleteMealType(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 500 when delete rejects", async () => {
		const existingDoc = { id: "mt-1", name: "Breakfast", householdId: "hh-1" };
		(prisma.mealType.findUnique as any).mockResolvedValue(existingDoc);
		(prisma.mealType.delete as any).mockRejectedValue(new Error("DB down"));

		const req: any = { body: { mealTypeId: "mt-1" } };
		const res = makeMockRes();
		const next = vi.fn();

		deleteMealType(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 500 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 on successful deletion", async () => {
		const existingDoc = { id: "mt-1", name: "Breakfast", householdId: "hh-1" };
		(prisma.mealType.findUnique as any).mockResolvedValue(existingDoc);
		(prisma.mealType.delete as any).mockResolvedValue(existingDoc);

		const req: any = { body: { mealTypeId: "mt-1" } };
		const res = makeMockRes();
		const next = vi.fn();

		deleteMealType(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			message: "Meal type deleted successfully",
		});
		expect(next).not.toHaveBeenCalled();
	});

	it("calls delete with the correct id", async () => {
		const existingDoc = { id: "mt-99", name: "Snack", householdId: "hh-1" };
		(prisma.mealType.findUnique as any).mockResolvedValue(existingDoc);
		(prisma.mealType.delete as any).mockResolvedValue(existingDoc);

		const req: any = { body: { mealTypeId: "mt-99" } };
		const res = makeMockRes();
		const next = vi.fn();

		deleteMealType(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(prisma.mealType.delete).toHaveBeenCalledWith({ where: { id: "mt-99" } });
	});
});
