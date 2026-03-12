import { describe, it, expect, vi } from "vitest";

vi.mock("../../../models/unitType", () => ({
	default: {
		find: vi.fn(),
		findById: vi.fn(),
		findByIdAndDelete: vi.fn(),
	},
}));

import UnitType from "../../../models/unitType";
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
		const req: any = { user: { _id: "u1" }, householdId: undefined };
		const res = makeMockRes();
		const next = vi.fn();

		getUnitTypes(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
	});

	it("returns mapped unit types on success", async () => {
		const mockDocs = [
			{ _id: "ut1", name: "Kilogram", householdId: "h1" },
			{ _id: "ut2", name: "Litre", householdId: "h1" },
		];
		(UnitType.find as any).mockResolvedValue(mockDocs);

		const req: any = { user: { _id: "u1" }, householdId: "h1" };
		const res = makeMockRes();
		const next = vi.fn();

		getUnitTypes(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			unitTypes: mockDocs.map((d) => ({
				_id: d._id,
				name: d.name,
				householdId: d.householdId,
			})),
		});
	});

	it("calls next with 500 on DB error", async () => {
		(UnitType.find as any).mockRejectedValue(new Error("DB error"));

		const req: any = { user: { _id: "u1" }, householdId: "h1" };
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
		const req: any = { body: {}, user: { _id: "u1" }, householdId: "h1" };
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
			user: { _id: "u1" },
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
		(UnitType.findById as any).mockResolvedValue(null);

		const req: any = {
			body: { unitTypeId: "000000000000000000000001", name: "Ghost" },
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
		const mockDoc = {
			_id: "ut1",
			name: "Old Name",
			householdId: "h1",
			save: vi.fn().mockResolvedValue({ _id: "ut1" }),
		};
		(UnitType.findById as any).mockResolvedValue(mockDoc);

		const req: any = {
			body: { unitTypeId: "ut1", name: "New Name" },
			householdId: "h1",
		};
		const res = makeMockRes();
		const next = vi.fn();

		renameUnitType(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(mockDoc.name).toBe("New Name");
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({ message: "Unit type renamed successfully" }),
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
		(UnitType.findByIdAndDelete as any).mockResolvedValue(null);

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
		(UnitType.findByIdAndDelete as any).mockResolvedValue({ _id: "ut1" });

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
