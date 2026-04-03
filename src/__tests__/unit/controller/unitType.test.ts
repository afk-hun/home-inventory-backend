import { describe, it, expect, vi } from "vitest";

vi.mock("../../../lib/prisma", () => ({
	prisma: {
		unitType: {
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
	getUnitTypes,
	createUnitType,
	renameUnitType,
	deleteUnitType,
} from "../../../controller/unitType";

const makeMockRes = () => {
	const res: any = {};
	res.status = vi.fn().mockReturnValue(res);
	res.json = vi.fn().mockReturnValue(res);
	return res;
};

// ---------------------------------------------------------------------------
// getUnitTypes
// ---------------------------------------------------------------------------

describe("getUnitTypes", () => {
	it("returns 404 when user is missing", () => {
		const req: any = { user: undefined, householdId: "h1" };
		const res = makeMockRes();
		const next = vi.fn();

		getUnitTypes(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
	});

	it("returns 404 when householdId is missing", () => {
		const req: any = { user: { id: "u1" }, householdId: undefined };
		const res = makeMockRes();
		const next = vi.fn();

		getUnitTypes(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
	});

	it("returns mapped unit types on success", async () => {
		const mockDocs = [
			{ id: "ut1", name: "Kilogram", householdId: "h1" },
			{ id: "ut2", name: "Litre", householdId: "h1" },
		];
		(prisma.unitType.findMany as any).mockResolvedValue(mockDocs);

		const req: any = { user: { id: "u1" }, householdId: "h1" };
		const res = makeMockRes();
		const next = vi.fn();

		getUnitTypes(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			unitTypes: mockDocs.map((d) => ({
				_id: d.id,
				name: d.name,
				householdId: d.householdId,
			})),
		});
	});

	it("calls next with 500 on DB error", async () => {
		(prisma.unitType.findMany as any).mockRejectedValue(new Error("DB error"));

		const req: any = { user: { id: "u1" }, householdId: "h1" };
		const res = makeMockRes();
		const next = vi.fn();

		getUnitTypes(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 500 }),
			),
		);
	});
});

// ---------------------------------------------------------------------------
// createUnitType
// ---------------------------------------------------------------------------

describe("createUnitType", () => {
	it("returns 400 when name is missing", () => {
		const req: any = { body: {}, user: { id: "u1" }, householdId: "h1" };
		const res = makeMockRes();
		const next = vi.fn();

		createUnitType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
	});

	it("returns 400 when user is missing", () => {
		const req: any = {
			body: { name: "Gram" },
			user: undefined,
			householdId: "h1",
		};
		const res = makeMockRes();
		const next = vi.fn();

		createUnitType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
	});

	it("returns 400 when householdId is missing", () => {
		const req: any = {
			body: { name: "Gram" },
			user: { id: "u1" },
			householdId: undefined,
		};
		const res = makeMockRes();
		const next = vi.fn();

		createUnitType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
	});
});

// ---------------------------------------------------------------------------
// renameUnitType
// ---------------------------------------------------------------------------

describe("renameUnitType", () => {
	it("returns 400 when required fields are missing", () => {
		const req: any = { body: {}, householdId: "h1" };
		const res = makeMockRes();
		const next = vi.fn();

		renameUnitType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
	});

	it("returns 400 when householdId is missing", () => {
		const req: any = {
			body: { unitTypeId: "ut1", name: "New Name" },
			householdId: undefined,
		};
		const res = makeMockRes();
		const next = vi.fn();

		renameUnitType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
	});

	it("returns 404 when unit type is not found", async () => {
		(prisma.unitType.findUnique as any).mockResolvedValue(null);

		const req: any = {
			body: { unitTypeId: "ut1", name: "Ghost" },
			householdId: "h1",
		};
		const res = makeMockRes();
		const next = vi.fn();

		renameUnitType(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
	});

	it("renames and returns 200 on success", async () => {
		const existingDoc = { id: "ut1", name: "Old Name", householdId: "h1" };
		const updatedDoc = { id: "ut1", name: "New Name", householdId: "h1" };
		(prisma.unitType.findUnique as any).mockResolvedValue(existingDoc);
		(prisma.unitType.update as any).mockResolvedValue(updatedDoc);

		const req: any = {
			body: { unitTypeId: "ut1", name: "New Name" },
			householdId: "h1",
		};
		const res = makeMockRes();
		const next = vi.fn();

		renameUnitType(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({ message: "Unit type renamed successfully" }),
		);
		expect(prisma.unitType.update).toHaveBeenCalledWith(
			expect.objectContaining({ data: { name: "New Name" } }),
		);
	});
});

// ---------------------------------------------------------------------------
// deleteUnitType
// ---------------------------------------------------------------------------

describe("deleteUnitType", () => {
	it("returns 400 when unitTypeId is missing", () => {
		const req: any = { body: {} };
		const res = makeMockRes();
		const next = vi.fn();

		deleteUnitType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
	});

	it("returns 404 when unit type is not found", async () => {
		(prisma.unitType.findUnique as any).mockResolvedValue(null);

		const req: any = { body: { unitTypeId: "nonexistent" } };
		const res = makeMockRes();
		const next = vi.fn();

		deleteUnitType(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
	});

	it("returns 200 on successful deletion", async () => {
		const existingDoc = { id: "ut1", name: "Kilogram", householdId: "h1" };
		(prisma.unitType.findUnique as any).mockResolvedValue(existingDoc);
		(prisma.unitType.delete as any).mockResolvedValue(existingDoc);

		const req: any = { body: { unitTypeId: "ut1" } };
		const res = makeMockRes();
		const next = vi.fn();

		deleteUnitType(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({ message: "Unit type deleted successfully" }),
		);
	});
});
