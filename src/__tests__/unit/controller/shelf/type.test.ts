import { describe, it, expect, vi } from "vitest";

vi.mock("../../../../models/shelfType", () => {
	return {
		default: {
			find: vi.fn(),
			findById: vi.fn(),
			findByIdAndDelete: vi.fn(),
		},
	};
});

import ShelfType from "../../../../models/shelfType";
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
		const req: any = { user: { _id: "u1" }, householdId: undefined };
		const res = makeMockRes();
		const next = vi.fn();

		getShelfTypes(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
	});

	it("returns mapped shelf types on success", async () => {
		const mockDocs = [
			{ _id: "st1", name: "Fridge", householdId: "h1" },
			{ _id: "st2", name: "Freezer", householdId: "h1" },
		];
		(ShelfType.find as any).mockResolvedValue(mockDocs);

		const req: any = { user: { _id: "u1" }, householdId: "h1" };
		const res = makeMockRes();
		const next = vi.fn();

		getShelfTypes(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			shelfTypes: mockDocs.map((d) => ({
				_id: d._id,
				name: d.name,
				householdId: d.householdId,
			})),
		});
	});
});

describe("createShelfType", () => {
	it("returns 400 when name is missing", () => {
		const req: any = {
			body: {},
			user: { _id: "u1" },
			householdId: "h1",
		};
		const res = makeMockRes();
		const next = vi.fn();

		createShelfType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
	});

	it("returns 400 when householdId is missing", () => {
		const req: any = {
			body: { name: "Pantry" },
			user: { _id: "u1" },
			householdId: undefined,
		};
		const res = makeMockRes();
		const next = vi.fn();

		createShelfType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
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
		(ShelfType.findById as any).mockResolvedValue(null);

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
		(ShelfType.findByIdAndDelete as any).mockResolvedValue(null);

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
});
