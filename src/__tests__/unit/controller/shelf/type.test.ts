import { describe, it, expect, vi } from "vitest";

vi.mock("../../../../lib/prisma", () => ({
	prisma: {
		shelfType: {
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
	getShelfTypes,
	createShelfType,
	renameShelfType,
	deleteShelfType,
} from "../../../../controller/shelf/type";

const makeMockRes = () => {
	const res: any = {};
	res.status = vi.fn().mockReturnValue(res);
	res.json = vi.fn().mockReturnValue(res);
	return res;
};

describe("getShelfTypes", () => {
	it("returns 404 when user is missing", () => {
		const req: any = { user: undefined, householdId: "h1" };
		const res = makeMockRes();
		const next = vi.fn();

		getShelfTypes(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
	});

	it("returns 404 when householdId is missing", () => {
		const req: any = { user: { id: "u1" }, householdId: undefined };
		const res = makeMockRes();
		const next = vi.fn();

		getShelfTypes(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
	});

	it("returns mapped shelf types on success", async () => {
		const mockDocs = [{ id: "st1", name: "Wall Shelf", householdId: "h1" }];
		(prisma.shelfType.findMany as any).mockResolvedValue(mockDocs);

		const req: any = { user: { id: "u1" }, householdId: "h1" };
		const res = makeMockRes();
		const next = vi.fn();

		getShelfTypes(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			shelfTypes: mockDocs.map((d) => ({
				_id: d.id,
				name: d.name,
				householdId: d.householdId,
			})),
		});
	});
});

describe("createShelfType", () => {
	it("returns 400 when name is missing", () => {
		const req: any = { body: {}, user: { id: "u1" }, householdId: "h1" };
		const res = makeMockRes();
		const next = vi.fn();

		createShelfType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
	});

	it("returns 400 when user is missing", () => {
		const req: any = {
			body: { name: "Floor Shelf" },
			user: undefined,
			householdId: "h1",
		};
		const res = makeMockRes();
		const next = vi.fn();

		createShelfType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
	});

	it("returns 201 with shelfType on success", async () => {
		const savedDoc = { id: "st-new", name: "Floor Shelf", householdId: "h1" };
		(prisma.shelfType.create as any).mockResolvedValue(savedDoc);

		const req: any = {
			body: { name: "Floor Shelf" },
			user: { id: "u1" },
			householdId: "h1",
		};
		const res = makeMockRes();
		const next = vi.fn();

		createShelfType(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(201));
		expect(res.json).toHaveBeenCalledWith({
			message: "Shelf type created!",
			shelfType: { _id: "st-new", name: "Floor Shelf", householdId: "h1" },
		});
	});
});

describe("renameShelfType", () => {
	it("returns 400 when required fields are missing", () => {
		const req: any = { body: {}, householdId: "h1" };
		const res = makeMockRes();
		const next = vi.fn();

		renameShelfType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
	});

	it("returns 404 when shelf type is not found", async () => {
		(prisma.shelfType.findUnique as any).mockResolvedValue(null);

		const req: any = {
			body: { shelfTypeId: "nonexistent", name: "New Name" },
			householdId: "h1",
		};
		const res = makeMockRes();
		const next = vi.fn();

		renameShelfType(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
	});

	it("returns 200 with shelfTypeId on success", async () => {
		const existingDoc = { id: "st-1", name: "Old Name", householdId: "h1" };
		const updatedDoc = { id: "st-1", name: "New Name", householdId: "h1" };

		(prisma.shelfType.findUnique as any).mockResolvedValue(existingDoc);
		(prisma.shelfType.update as any).mockResolvedValue(updatedDoc);

		const req: any = {
			body: { shelfTypeId: "st-1", name: "New Name" },
			householdId: "h1",
		};
		const res = makeMockRes();
		const next = vi.fn();

		renameShelfType(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			message: "Shelf type renamed successfully",
			shelfTypeId: "st-1",
		});
	});
});

describe("deleteShelfType", () => {
	it("returns 400 when shelfTypeId is missing", () => {
		const req: any = { body: {} };
		const res = makeMockRes();
		const next = vi.fn();

		deleteShelfType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
	});

	it("returns 404 when shelf type is not found", async () => {
		(prisma.shelfType.findUnique as any).mockResolvedValue(null);

		const req: any = { body: { shelfTypeId: "nonexistent" } };
		const res = makeMockRes();
		const next = vi.fn();

		deleteShelfType(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
	});

	it("returns 200 on successful deletion", async () => {
		const existingDoc = { id: "st-1", name: "Wall Shelf", householdId: "h1" };
		(prisma.shelfType.findUnique as any).mockResolvedValue(existingDoc);
		(prisma.shelfType.delete as any).mockResolvedValue(existingDoc);

		const req: any = { body: { shelfTypeId: "st-1" } };
		const res = makeMockRes();
		const next = vi.fn();

		deleteShelfType(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			message: "Shelf type deleted successfully",
		});
	});
});
