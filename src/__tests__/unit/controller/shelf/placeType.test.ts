import { describe, it, expect, vi } from "vitest";

vi.mock("../../../../models/shelfPlaceType", () => {
	return {
		default: {
			find: vi.fn(),
			findById: vi.fn(),
			findByIdAndDelete: vi.fn(),
		},
	};
});

import ShelfPlaceType from "../../../../models/shelfPlaceType";
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
		const req: any = { user: { _id: "u1" }, householdId: undefined };
		const res = makeMockRes();
		const next = vi.fn();

		getShelfPlaceTypes(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
	});

	it("returns mapped shelf place types on success", async () => {
		const mockDocs = [
			{ _id: "spt1", name: "Top Shelf", householdId: "h1" },
		];
		(ShelfPlaceType.find as any).mockResolvedValue(mockDocs);

		const req: any = { user: { _id: "u1" }, householdId: "h1" };
		const res = makeMockRes();
		const next = vi.fn();

		getShelfPlaceTypes(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			shelfPlaces: mockDocs.map((d) => ({
				_id: d._id,
				name: d.name,
				householdId: d.householdId,
			})),
		});
	});
});

describe("createShelfPlaceType", () => {
	it("returns 400 when name is missing", async () => {
		const req: any = {
			body: {},
			user: { _id: "u1" },
			householdId: "h1",
		};
		const res = makeMockRes();
		const next = vi.fn();

		await createShelfPlaceType(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
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
		(ShelfPlaceType.findById as any).mockResolvedValue(null);

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
		(ShelfPlaceType.findByIdAndDelete as any).mockResolvedValue(null);

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
});
