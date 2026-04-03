import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../lib/prisma", () => ({
	prisma: {
		monthlyCookingSchedule: {
			findMany: vi.fn(),
			findFirst: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
		meal: {
			deleteMany: vi.fn(),
		},
		$transaction: vi.fn(),
	},
}));

import { prisma } from "../../../lib/prisma";
import {
	getSchedules,
	getSchedule,
	createSchedule,
	updateSchedule,
	deleteSchedule,
} from "../../../controller/monthlyCookingScheduleController";

const makeMockRes = () => {
	const res: any = {};
	res.status = vi.fn().mockReturnValue(res);
	res.json = vi.fn().mockReturnValue(res);
	return res;
};

const makeMeal = (overrides: any = {}) => ({
	id: "meal-1",
	scheduleId: "s-1",
	recipeId: "recipe-1",
	mealType: "Breakfast",
	start: new Date("2026-03-01T07:00:00Z"),
	end: new Date("2026-03-01T08:00:00Z"),
	portion: 2,
	...overrides,
});

// ---------------------------------------------------------------------------
// getSchedules
// ---------------------------------------------------------------------------

describe("getSchedules", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls next with 404 when req.user is missing", () => {
		const req: any = { user: undefined, householdId: "hh-1" };
		const res = makeMockRes();
		const next = vi.fn();

		getSchedules(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when householdId is missing", () => {
		const req: any = { user: { id: "user-1" }, householdId: undefined };
		const res = makeMockRes();
		const next = vi.fn();

		getSchedules(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 500 when findMany rejects", async () => {
		(prisma.monthlyCookingSchedule.findMany as any).mockRejectedValue(new Error("DB error"));

		const req: any = { user: { id: "user-1" }, householdId: "hh-1" };
		const res = makeMockRes();
		const next = vi.fn();

		getSchedules(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 500 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 with schedules array on happy path", async () => {
		const mockDocs = [
			{
				id: "s-1",
				householdId: "hh-1",
				name: "March 2026",
				start: new Date("2026-03-01"),
				end: new Date("2026-03-31"),
				meals: [],
			},
		];
		(prisma.monthlyCookingSchedule.findMany as any).mockResolvedValue(mockDocs);

		const req: any = { user: { id: "user-1" }, householdId: "hh-1" };
		const res = makeMockRes();
		const next = vi.fn();

		getSchedules(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		const jsonArg = res.json.mock.calls[0][0];
		expect(jsonArg.schedules[0]._id).toBe("s-1");
		expect(jsonArg.schedules[0].meals).toEqual([]);
		expect(next).not.toHaveBeenCalled();
	});

	it("calls findMany with the correct householdId", async () => {
		(prisma.monthlyCookingSchedule.findMany as any).mockResolvedValue([]);

		const req: any = { user: { id: "user-1" }, householdId: "hh-42" };
		const res = makeMockRes();
		const next = vi.fn();

		getSchedules(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(prisma.monthlyCookingSchedule.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: { householdId: "hh-42" } }),
		);
	});
});

// ---------------------------------------------------------------------------
// getSchedule
// ---------------------------------------------------------------------------

describe("getSchedule", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls next with 404 when req.user is missing", () => {
		const req: any = { user: undefined, householdId: "hh-1", params: { id: "s-1" } };
		const res = makeMockRes();
		const next = vi.fn();

		getSchedule(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when householdId is missing", () => {
		const req: any = { user: { id: "user-1" }, householdId: undefined, params: { id: "s-1" } };
		const res = makeMockRes();
		const next = vi.fn();

		getSchedule(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when schedule is not found", async () => {
		(prisma.monthlyCookingSchedule.findFirst as any).mockResolvedValue(null);

		const req: any = {
			user: { id: "user-1" },
			householdId: "hh-1",
			params: { id: "nonexistent-id" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		getSchedule(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 500 when findFirst rejects", async () => {
		(prisma.monthlyCookingSchedule.findFirst as any).mockRejectedValue(new Error("DB failure"));

		const req: any = {
			user: { id: "user-1" },
			householdId: "hh-1",
			params: { id: "s-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		getSchedule(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 500 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 with schedule on happy path", async () => {
		const meal = makeMeal();
		const mockDoc = {
			id: "s-1",
			householdId: "hh-1",
			name: "March 2026",
			start: new Date("2026-03-01"),
			end: new Date("2026-03-31"),
			meals: [meal],
		};
		(prisma.monthlyCookingSchedule.findFirst as any).mockResolvedValue(mockDoc);

		const req: any = {
			user: { id: "user-1" },
			householdId: "hh-1",
			params: { id: "s-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		getSchedule(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		const jsonArg = res.json.mock.calls[0][0];
		expect(jsonArg.schedule._id).toBe("s-1");
		expect(jsonArg.schedule.meals[0]._id).toBe("meal-1");
		expect(jsonArg.schedule.meals[0].recipe).toBe("recipe-1");
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// createSchedule
// ---------------------------------------------------------------------------

describe("createSchedule", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls next with 404 when req.user is missing", () => {
		const req: any = {
			user: undefined,
			householdId: "hh-1",
			body: { name: "March", start: "2026-03-01", end: "2026-03-31" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		createSchedule(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when householdId is missing", () => {
		const req: any = {
			user: { id: "user-1" },
			householdId: undefined,
			body: { name: "March", start: "2026-03-01", end: "2026-03-31" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		createSchedule(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 400 when name is missing", () => {
		const req: any = {
			user: { id: "user-1" },
			householdId: "hh-1",
			body: { start: "2026-03-01", end: "2026-03-31" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		createSchedule(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 400 when start is missing", () => {
		const req: any = {
			user: { id: "user-1" },
			householdId: "hh-1",
			body: { name: "March", end: "2026-03-31" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		createSchedule(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 400 when end is missing", () => {
		const req: any = {
			user: { id: "user-1" },
			householdId: "hh-1",
			body: { name: "March", start: "2026-03-01" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		createSchedule(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 500 when create rejects", async () => {
		(prisma.monthlyCookingSchedule.create as any).mockRejectedValue(new Error("Save failed"));

		const req: any = {
			user: { id: "user-1" },
			householdId: "hh-1",
			body: { name: "March", start: "2026-03-01", end: "2026-03-31" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		createSchedule(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 500 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 201 with schedule on happy path", async () => {
		const savedDoc = {
			id: "s-new",
			householdId: "hh-1",
			name: "March 2026",
			start: new Date("2026-03-01"),
			end: new Date("2026-03-31"),
			meals: [],
		};
		(prisma.monthlyCookingSchedule.create as any).mockResolvedValue(savedDoc);

		const req: any = {
			user: { id: "user-1" },
			householdId: "hh-1",
			body: { name: "March 2026", start: "2026-03-01", end: "2026-03-31" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		createSchedule(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(201));
		const jsonArg = res.json.mock.calls[0][0];
		expect(jsonArg.message).toBe("Schedule created!");
		expect(jsonArg.schedule._id).toBe("s-new");
		expect(jsonArg.schedule.meals).toEqual([]);
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// updateSchedule
// ---------------------------------------------------------------------------

describe("updateSchedule", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls next with 404 when householdId is missing", () => {
		const req: any = {
			householdId: undefined,
			body: { scheduleId: "s-1", name: "Updated" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		updateSchedule(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 400 when scheduleId is missing", () => {
		const req: any = {
			householdId: "hh-1",
			body: { name: "Updated" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		updateSchedule(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when schedule is not found", async () => {
		(prisma.monthlyCookingSchedule.findFirst as any).mockResolvedValue(null);

		const req: any = {
			householdId: "hh-1",
			body: { scheduleId: "nonexistent-id", name: "Updated" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		updateSchedule(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 500 when findFirst rejects", async () => {
		(prisma.monthlyCookingSchedule.findFirst as any).mockRejectedValue(new Error("DB error"));

		const req: any = {
			householdId: "hh-1",
			body: { scheduleId: "s-1", name: "Updated" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		updateSchedule(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 500 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 with updated schedule on happy path", async () => {
		const existingDoc = {
			id: "s-1",
			householdId: "hh-1",
			name: "March 2026",
			start: new Date("2026-03-01"),
			end: new Date("2026-03-31"),
		};
		const updatedDoc = {
			id: "s-1",
			householdId: "hh-1",
			name: "April 2026",
			start: new Date("2026-04-01"),
			end: new Date("2026-04-30"),
			meals: [],
		};

		(prisma.monthlyCookingSchedule.findFirst as any).mockResolvedValue(existingDoc);
		(prisma.monthlyCookingSchedule.update as any).mockResolvedValue(updatedDoc);

		const req: any = {
			householdId: "hh-1",
			body: {
				scheduleId: "s-1",
				name: "April 2026",
				start: "2026-04-01",
				end: "2026-04-30",
			},
		};
		const res = makeMockRes();
		const next = vi.fn();

		updateSchedule(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		const jsonArg = res.json.mock.calls[0][0];
		expect(jsonArg.message).toBe("Schedule updated successfully");
		expect(jsonArg.schedule._id).toBe("s-1");
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// deleteSchedule
// ---------------------------------------------------------------------------

describe("deleteSchedule", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls next with 404 when householdId is missing", () => {
		const req: any = {
			householdId: undefined,
			body: { scheduleId: "s-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		deleteSchedule(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 400 when scheduleId is missing", () => {
		const req: any = {
			householdId: "hh-1",
			body: {},
		};
		const res = makeMockRes();
		const next = vi.fn();

		deleteSchedule(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 400 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when schedule is not found", async () => {
		(prisma.monthlyCookingSchedule.findFirst as any).mockResolvedValue(null);

		const req: any = {
			householdId: "hh-1",
			body: { scheduleId: "nonexistent-id" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		deleteSchedule(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 404 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 on successful deletion", async () => {
		const existingDoc = {
			id: "s-1",
			householdId: "hh-1",
			name: "March 2026",
			start: new Date("2026-03-01"),
			end: new Date("2026-03-31"),
		};
		(prisma.monthlyCookingSchedule.findFirst as any).mockResolvedValue(existingDoc);
		(prisma.monthlyCookingSchedule.delete as any).mockResolvedValue(existingDoc);

		const req: any = {
			householdId: "hh-1",
			body: { scheduleId: "s-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		deleteSchedule(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({
			message: "Schedule deleted successfully",
		});
		expect(next).not.toHaveBeenCalled();
	});

	it("calls delete with correct scheduleId", async () => {
		const existingDoc = { id: "s-99", householdId: "hh-1", name: "Old", start: new Date(), end: new Date() };
		(prisma.monthlyCookingSchedule.findFirst as any).mockResolvedValue(existingDoc);
		(prisma.monthlyCookingSchedule.delete as any).mockResolvedValue(existingDoc);

		const req: any = {
			householdId: "hh-1",
			body: { scheduleId: "s-99" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		deleteSchedule(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(prisma.monthlyCookingSchedule.delete).toHaveBeenCalledWith({ where: { id: "s-99" } });
	});
});
