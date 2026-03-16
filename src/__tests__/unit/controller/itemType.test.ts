import { describe, it, expect, vi, beforeEach } from "vitest";

// Module-level save mock — tests can replace the resolved value as needed
let mockSave = vi.fn();

vi.mock("../../../models/itemType", () => {
	const find = vi.fn();
	const findById = vi.fn();
	const findByIdAndDelete = vi.fn();

	// Must be a regular function (not arrow) so `new ItemType(...)` works.
	const MockItemType = vi.fn(function MockItemTypeImpl(this: any, data: any) {
		Object.assign(this, data);
		this.save = (...args: any[]) => mockSave(...args);
	});

	(MockItemType as any).find = find;
	(MockItemType as any).findById = findById;
	(MockItemType as any).findByIdAndDelete = findByIdAndDelete;

	return { default: MockItemType };
});

import ItemType from "../../../models/itemType";
import {
	getItemTypes,
	createItemType,
	renameItemType,
	deleteItemType,
} from "../../../controller/shelf/itemType";

const makeMockRes = () => {
	const res: any = {};
	res.status = vi.fn().mockReturnValue(res);
	res.json = vi.fn().mockReturnValue(res);
	return res;
};

// ---------------------------------------------------------------------------
// getItemTypes
// ---------------------------------------------------------------------------

describe("getItemTypes", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
	});

	it("calls next with 404 when req.user is missing", () => {
		const req: any = { user: undefined, householdId: "hh-1" };
		const res = makeMockRes();
		const next = vi.fn();

		getItemTypes(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when householdId is missing", () => {
		const req: any = { user: { _id: "user-1" }, householdId: undefined };
		const res = makeMockRes();
		const next = vi.fn();

		getItemTypes(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 with itemTypes array on happy path", async () => {
		const mockDocs = [
			{ _id: "it-1", id: "it-1", name: "Electronics", householdId: "hh-1" },
			{ _id: "it-2", id: "it-2", name: "Furniture", householdId: "hh-1" },
		];
		(ItemType.find as any).mockResolvedValue(mockDocs);

		const req: any = { user: { _id: "user-1" }, householdId: "hh-1" };
		const res = makeMockRes();
		const next = vi.fn();

		getItemTypes(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			itemTypes: mockDocs.map((d) => ({
				_id: d._id,
				id: d.id,
				name: d.name,
				householdId: d.householdId,
			})),
		});
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// createItemType
// ---------------------------------------------------------------------------

describe("createItemType", () => {
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

		createItemType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 400 when owner (user) is missing", () => {
		const req: any = {
			body: { name: "Books" },
			user: undefined,
			householdId: "hh-1",
		};
		const res = makeMockRes();
		const next = vi.fn();

		createItemType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 400 when householdId is missing", () => {
		const req: any = {
			body: { name: "Books" },
			user: { _id: "user-1" },
			householdId: undefined,
		};
		const res = makeMockRes();
		const next = vi.fn();

		createItemType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 201 with itemType on happy path", async () => {
		const savedDoc = {
			_id: "it-new",
			name: "Books",
			householdId: "hh-1",
		};
		mockSave = vi.fn().mockResolvedValue(savedDoc);

		const req: any = {
			body: { name: "Books" },
			user: { _id: "user-1" },
			householdId: "hh-1",
		};
		const res = makeMockRes();
		const next = vi.fn();

		createItemType(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(201));
		expect(res.json).toHaveBeenCalledWith({
			message: "Item type created!",
			itemType: savedDoc,
		});
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// renameItemType
// ---------------------------------------------------------------------------

describe("renameItemType", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
	});

	it("calls next with 400 when householdId is missing", () => {
		const req: any = {
			householdId: undefined,
			body: { itemTypeId: "it-1", name: "New Name" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		renameItemType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 400 when itemTypeId is missing", () => {
		const req: any = {
			householdId: "hh-1",
			body: { name: "New Name" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		renameItemType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 400 when name is missing", () => {
		const req: any = {
			householdId: "hh-1",
			body: { itemTypeId: "it-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		renameItemType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when findById returns null", async () => {
		(ItemType.findById as any).mockResolvedValue(null);

		const req: any = {
			householdId: "hh-1",
			body: { itemTypeId: "nonexistent-id", name: "New Name" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		renameItemType(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 with itemTypeId on happy path", async () => {
		const updatedDoc = { _id: "it-1", name: "Renamed" };
		const mockFoundDoc: any = {
			_id: "it-1",
			name: "Old Name",
			save: vi.fn().mockResolvedValue(updatedDoc),
		};
		(ItemType.findById as any).mockResolvedValue(mockFoundDoc);

		const req: any = {
			householdId: "hh-1",
			body: { itemTypeId: "it-1", name: "Renamed" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		renameItemType(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			message: "Item type renamed successfully",
			itemTypeId: updatedDoc._id,
		});
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// deleteItemType
// ---------------------------------------------------------------------------

describe("deleteItemType", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
	});

	it("calls next with 400 when itemTypeId is missing", () => {
		const req: any = { body: {} };
		const res = makeMockRes();
		const next = vi.fn();

		deleteItemType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when findByIdAndDelete returns null", async () => {
		(ItemType.findByIdAndDelete as any).mockResolvedValue(null);

		const req: any = { body: { itemTypeId: "nonexistent-id" } };
		const res = makeMockRes();
		const next = vi.fn();

		deleteItemType(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 on successful deletion", async () => {
		const deletedDoc = { _id: "it-1", name: "Electronics", householdId: "hh-1" };
		(ItemType.findByIdAndDelete as any).mockResolvedValue(deletedDoc);

		const req: any = { body: { itemTypeId: "it-1" } };
		const res = makeMockRes();
		const next = vi.fn();

		deleteItemType(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			message: "Item type deleted successfully",
		});
		expect(next).not.toHaveBeenCalled();
	});
});
