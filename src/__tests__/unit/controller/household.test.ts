import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../lib/prisma", () => ({
	prisma: {
		household: {
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
	getHouseholds,
	createHousehold,
	renameHousehold,
	deleteHousehold,
	setHousehold,
} from "../../../controller/household";

const makeMockRes = () => {
	const res: any = {};
	res.status = vi.fn().mockReturnValue(res);
	res.json = vi.fn().mockReturnValue(res);
	res.cookie = vi.fn().mockReturnValue(res);
	return res;
};

describe("setHousehold", () => {
	it("returns 400 when householdId is missing from body", () => {
		const req: any = { body: {} };
		const res = makeMockRes();
		const next = vi.fn();

		setHousehold(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
	});

	it("sets cookie and returns 200 with a valid householdId", () => {
		const req: any = { body: { householdId: "household-123" } };
		const res = makeMockRes();
		const next = vi.fn();

		setHousehold(req, res, next);

		expect(res.cookie).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(200);
	});
});

describe("getHouseholds", () => {
	it("returns 404 when req.user is undefined", () => {
		const req: any = { user: undefined };
		const res = makeMockRes();
		const next = vi.fn();

		getHouseholds(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
	});

	it("returns mapped household list on success", async () => {
		const mockDocs = [
			{ id: "h1", name: "Home", ownerId: "u1" },
			{ id: "h2", name: "Office", ownerId: "u1" },
		];
		(prisma.household.findMany as any).mockResolvedValue(mockDocs);

		const req: any = { user: { id: "user-1" } };
		const res = makeMockRes();
		const next = vi.fn();

		getHouseholds(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			households: mockDocs.map((h) => ({
				_id: h.id,
				name: h.name,
				members: [],
			})),
		});
	});
});

describe("createHousehold", () => {
	it("returns 400 when name is missing", async () => {
		const req: any = { body: {}, user: { id: "u1", name: "Alice" } };
		const res = makeMockRes();
		const next = vi.fn();

		await createHousehold(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
	});

	it("returns 400 when user is not on req", async () => {
		const req: any = { body: { name: "My House" }, user: undefined };
		const res = makeMockRes();
		const next = vi.fn();

		await createHousehold(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
	});
});

describe("renameHousehold", () => {
	it("returns 400 when required fields are missing", () => {
		const req: any = { body: {} };
		const res = makeMockRes();
		const next = vi.fn();

		renameHousehold(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
	});

	it("returns 404 when household is not found", async () => {
		(prisma.household.findUnique as any).mockResolvedValue(null);

		const req: any = {
			body: { householdId: "nonexistent", name: "New Name" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		renameHousehold(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
	});
});

describe("deleteHousehold", () => {
	it("returns 400 when householdId is missing", () => {
		const req: any = { body: {} };
		const res = makeMockRes();
		const next = vi.fn();

		deleteHousehold(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
	});

	it("returns 404 when household is not found", async () => {
		(prisma.household.findUnique as any).mockResolvedValue(null);

		const req: any = { body: { householdId: "nonexistent" } };
		const res = makeMockRes();
		const next = vi.fn();

		deleteHousehold(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
	});
});
