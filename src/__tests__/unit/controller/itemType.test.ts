import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../lib/prisma", () => ({
	prisma: {
		itemType: {
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
		const req: any = { user: { id: "user-1" }, householdId: undefined };
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
			{ id: "it-1", name: "Electronics", householdId: "hh-1" },
			{ id: "it-2", name: "Furniture", householdId: "hh-1" },
		];
		(prisma.itemType.findMany as any).mockResolvedValue(mockDocs);

		const req: any = { user: { id: "user-1" }, householdId: "hh-1" };
		const res = makeMockRes();
		const next = vi.fn();

		getItemTypes(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			itemTypes: mockDocs.map((d) => ({
				_id: d.id,
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
	});

	it("calls next with 400 when name is missing", () => {
		const req: any = {
			body: {},
			user: { id: "user-1" },
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
			user: { id: "user-1" },
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
			id: "it-new",
			name: "Books",
			householdId: "hh-1",
		};
		(prisma.itemType.create as any).mockResolvedValue(savedDoc);

		const req: any = {
			body: { name: "Books" },
			user: { id: "user-1" },
			householdId: "hh-1",
		};
		const res = makeMockRes();
		const next = vi.fn();

		createItemType(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(201));
		expect(res.json).toHaveBeenCalledWith({
			message: "Item type created!",
			itemType: { _id: "it-new", name: "Books", householdId: "hh-1" },
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

	it("calls next with 404 when itemType is not found", async () => {
		(prisma.itemType.findUnique as any).mockResolvedValue(null);

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
		const existingDoc = { id: "it-1", name: "Old Name", householdId: "hh-1" };
		const updatedDoc = { id: "it-1", name: "Renamed", householdId: "hh-1" };

		(prisma.itemType.findUnique as any).mockResolvedValue(existingDoc);
		(prisma.itemType.update as any).mockResolvedValue(updatedDoc);

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
			itemTypeId: "it-1",
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

	it("calls next with 404 when itemType is not found", async () => {
		(prisma.itemType.findUnique as any).mockResolvedValue(null);

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
		const existingDoc = { id: "it-1", name: "Electronics", householdId: "hh-1" };
		(prisma.itemType.findUnique as any).mockResolvedValue(existingDoc);
		(prisma.itemType.delete as any).mockResolvedValue(existingDoc);

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
