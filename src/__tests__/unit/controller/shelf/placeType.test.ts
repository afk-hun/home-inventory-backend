import { describe, it, expect, vi } from "vitest";

vi.mock("../../../../lib/prisma", () => ({
	prisma: {
		shelfPlaceType: {
			findMany: vi.fn(),
			findUnique: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
	},
}));

import { prisma } from "../../../../lib/prisma";
import {
	getShelfPlaceTypes,
	createShelfPlaceType,
	renameShelfPlaceType,
	deleteShelfPlaceType,
} from "../../../../controller/shelf/placeType";

const makeMockRes = () => {
	const res: any = {};
	res.status = vi.fn().mockReturnValue(res);
	res.json = vi.fn().mockReturnValue(res);
	return res;
};

describe("getShelfPlaceTypes", () => {
	it("returns 404 when user is missing", () => {
		const req: any = { user: undefined, householdId: "h1" };
		const res = makeMockRes();
		const next = vi.fn();

		getShelfPlaceTypes(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
	});

	it("returns 404 when householdId is missing", () => {
		const req: any = { user: { id: "u1" }, householdId: undefined };
		const res = makeMockRes();
		const next = vi.fn();

		getShelfPlaceTypes(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
	});

	it("returns mapped shelf place types on success", async () => {
		const mockDocs = [
			{ id: "spt1", name: "Top Shelf", householdId: "h1" },
		];
		(prisma.shelfPlaceType.findMany as any).mockResolvedValue(mockDocs);

		const req: any = { user: { id: "u1" }, householdId: "h1" };
		const res = makeMockRes();
		const next = vi.fn();

		getShelfPlaceTypes(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			shelfPlaces: mockDocs.map((d) => ({
				_id: d.id,
				name: d.name,
				householdId: d.householdId,
			})),
		});
	});
});

describe("createShelfPlaceType", () => {
	it("returns 400 when name is missing", () => {
		const req: any = {
			body: {},
			user: { id: "u1" },
			householdId: "h1",
		};
		const res = makeMockRes();
		const next = vi.fn();

		createShelfPlaceType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
	});

	it("returns 201 with shelfPlaceType on success", async () => {
		const savedDoc = { id: "spt-new", name: "Bottom", householdId: "h1" };
		(prisma.shelfPlaceType.create as any).mockResolvedValue(savedDoc);

		const req: any = {
			body: { name: "Bottom" },
			user: { id: "u1" },
			householdId: "h1",
		};
		const res = makeMockRes();
		const next = vi.fn();

		createShelfPlaceType(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(201));
		expect(res.json).toHaveBeenCalledWith({
			message: "Shelf place type created!",
			shelfPlaceType: { _id: "spt-new", name: "Bottom", householdId: "h1" },
		});
	});
});

describe("renameShelfPlaceType", () => {
	it("returns 400 when required fields are missing", () => {
		const req: any = { body: {}, householdId: "h1" };
		const res = makeMockRes();
		const next = vi.fn();

		renameShelfPlaceType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
	});

	it("returns 404 when shelf place type is not found", async () => {
		(prisma.shelfPlaceType.findUnique as any).mockResolvedValue(null);

		const req: any = {
			body: { shelfPlaceTypeId: "nonexistent", name: "New Name" },
			householdId: "h1",
		};
		const res = makeMockRes();
		const next = vi.fn();

		renameShelfPlaceType(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
	});

	it("returns 200 with shelfPlaceTypeId on success", async () => {
		const existingDoc = { id: "spt-1", name: "Old", householdId: "h1" };
		const updatedDoc = { id: "spt-1", name: "New Name", householdId: "h1" };

		(prisma.shelfPlaceType.findUnique as any).mockResolvedValue(existingDoc);
		(prisma.shelfPlaceType.update as any).mockResolvedValue(updatedDoc);

		const req: any = {
			body: { shelfPlaceTypeId: "spt-1", name: "New Name" },
			householdId: "h1",
		};
		const res = makeMockRes();
		const next = vi.fn();

		renameShelfPlaceType(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			message: "Shelf place type renamed successfully",
			shelfPlaceTypeId: "spt-1",
		});
	});
});

describe("deleteShelfPlaceType", () => {
	it("returns 400 when shelfPlaceTypeId is missing", () => {
		const req: any = { body: {} };
		const res = makeMockRes();
		const next = vi.fn();

		deleteShelfPlaceType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
	});

	it("returns 404 when shelf place type is not found", async () => {
		(prisma.shelfPlaceType.findUnique as any).mockResolvedValue(null);

		const req: any = { body: { shelfPlaceTypeId: "nonexistent" } };
		const res = makeMockRes();
		const next = vi.fn();

		deleteShelfPlaceType(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
	});

	it("returns 200 on successful deletion", async () => {
		const existingDoc = { id: "spt-1", name: "Top Shelf", householdId: "h1" };
		(prisma.shelfPlaceType.findUnique as any).mockResolvedValue(existingDoc);
		(prisma.shelfPlaceType.delete as any).mockResolvedValue(existingDoc);

		const req: any = { body: { shelfPlaceTypeId: "spt-1" } };
		const res = makeMockRes();
		const next = vi.fn();

		deleteShelfPlaceType(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			message: "Shelf place type deleted successfully",
		});
	});
});
