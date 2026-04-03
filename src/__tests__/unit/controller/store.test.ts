import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../lib/prisma", () => ({
	prisma: {
		store: {
			findFirst: vi.fn(),
			findMany: vi.fn(),
			count: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
	},
}));

import { prisma } from "../../../lib/prisma";
import {
	getStore,
	getStores,
	createStore,
	updateStore,
	deleteStore,
} from "../../../controller/store";

const makeMockRes = () => {
	const res: any = {};
	res.status = vi.fn().mockReturnValue(res);
	res.json = vi.fn().mockReturnValue(res);
	return res;
};

// ---------------------------------------------------------------------------
// getStore
// ---------------------------------------------------------------------------

describe("getStore", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls next with 404 when req.user is missing", () => {
		const req: any = {
			user: undefined,
			householdId: "household-1",
			params: { id: "store-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		getStore(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when req.householdId is missing", () => {
		const req: any = {
			user: { id: "user-1" },
			householdId: undefined,
			params: { id: "store-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		getStore(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when store is not found", async () => {
		(prisma.store.findFirst as any).mockResolvedValue(null);

		const req: any = {
			user: { id: "user-1" },
			householdId: "household-1",
			params: { id: "nonexistent-id" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		getStore(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 with store on success", async () => {
		const mockDoc = {
			id: "store-1",
			householdId: "household-1",
			name: "Costco",
		};
		(prisma.store.findFirst as any).mockResolvedValue(mockDoc);

		const req: any = {
			user: { id: "user-1" },
			householdId: "household-1",
			params: { id: "store-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		getStore(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			store: { _id: "store-1", householdId: "household-1", name: "Costco" },
		});
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// getStores
// ---------------------------------------------------------------------------

describe("getStores", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls next with 404 when req.user is missing", () => {
		const req: any = {
			user: undefined,
			householdId: "household-1",
			query: {},
		};
		const res = makeMockRes();
		const next = vi.fn();

		getStores(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when req.householdId is missing", () => {
		const req: any = {
			user: { id: "user-1" },
			householdId: undefined,
			query: {},
		};
		const res = makeMockRes();
		const next = vi.fn();

		getStores(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 with pagination shape on success", async () => {
		const mockStores = [
			{ id: "store-1", name: "Costco", householdId: "household-1" },
			{ id: "store-2", name: "Target", householdId: "household-1" },
		];

		(prisma.store.count as any).mockResolvedValue(2);
		(prisma.store.findMany as any).mockResolvedValue(mockStores);

		const req: any = {
			user: { id: "user-1" },
			householdId: "household-1",
			query: { page: "1", limit: "5" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		getStores(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		const jsonArg = res.json.mock.calls[0][0];
		expect(jsonArg.stores).toEqual(
			mockStores.map((s) => ({ _id: s.id, name: s.name, householdId: s.householdId })),
		);
		expect(jsonArg.pagination).toMatchObject({
			total: 2,
			page: 1,
			limit: 5,
			totalPages: 1,
		});
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// createStore
// ---------------------------------------------------------------------------

describe("createStore", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls next with 404 when req.user is missing", () => {
		const req: any = {
			user: undefined,
			householdId: "household-1",
			body: { name: "Costco" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		createStore(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when req.householdId is missing", () => {
		const req: any = {
			user: { id: "user-1" },
			householdId: undefined,
			body: { name: "Costco" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		createStore(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 400 when name is missing", () => {
		const req: any = {
			user: { id: "user-1" },
			householdId: "household-1",
			body: {},
		};
		const res = makeMockRes();
		const next = vi.fn();

		createStore(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 201 with store on success", async () => {
		const savedDoc = {
			id: "new-store-id",
			householdId: "household-1",
			name: "Costco",
		};

		(prisma.store.create as any).mockResolvedValue(savedDoc);

		const req: any = {
			user: { id: "user-1" },
			householdId: "household-1",
			body: { name: "Costco" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		createStore(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(201));
		expect(res.json).toHaveBeenCalledWith({
			message: "Store created!",
			store: { _id: "new-store-id", householdId: "household-1", name: "Costco" },
		});
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// updateStore
// ---------------------------------------------------------------------------

describe("updateStore", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls next with 400 when storeId is missing", () => {
		const req: any = { body: {} };
		const res = makeMockRes();
		const next = vi.fn();

		updateStore(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when store is not found", async () => {
		(prisma.store.findFirst as any).mockResolvedValue(null);

		const req: any = {
			householdId: "household-1",
			body: { storeId: "nonexistent-id", name: "New Name" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		updateStore(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 with updated store on success", async () => {
		const existingDoc = { id: "store-1", householdId: "household-1", name: "Old Costco" };
		const updatedDoc = { id: "store-1", householdId: "household-1", name: "Updated Costco" };

		(prisma.store.findFirst as any).mockResolvedValue(existingDoc);
		(prisma.store.update as any).mockResolvedValue(updatedDoc);

		const req: any = {
			householdId: "household-1",
			body: { storeId: "store-1", name: "Updated Costco" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		updateStore(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			message: "Store updated successfully",
			store: { _id: "store-1", householdId: "household-1", name: "Updated Costco" },
		});
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// deleteStore
// ---------------------------------------------------------------------------

describe("deleteStore", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls next with 400 when storeId is missing", () => {
		const req: any = { body: {} };
		const res = makeMockRes();
		const next = vi.fn();

		deleteStore(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when store is not found", async () => {
		(prisma.store.findFirst as any).mockResolvedValue(null);

		const req: any = {
			householdId: "household-1",
			body: { storeId: "nonexistent-id" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		deleteStore(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 on successful deletion", async () => {
		const existingDoc = { id: "store-1", householdId: "household-1", name: "Costco" };
		(prisma.store.findFirst as any).mockResolvedValue(existingDoc);
		(prisma.store.delete as any).mockResolvedValue(existingDoc);

		const req: any = {
			householdId: "household-1",
			body: { storeId: "store-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		deleteStore(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			message: "Store deleted successfully",
		});
		expect(next).not.toHaveBeenCalled();
	});
});
