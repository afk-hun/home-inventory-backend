import { describe, it, expect, vi, beforeEach } from "vitest";

let mockSave = vi.fn();

vi.mock("../../../models/monthlyCookingSchedule", () => {
	const find = vi.fn();
	const findOne = vi.fn();
	const findOneAndDelete = vi.fn();

	const MockSchedule = vi.fn(function MockScheduleImpl(this: any, data: any) {
		Object.assign(this, data);
		this.save = (...args: any[]) => mockSave(...args);
	});

	(MockSchedule as any).find = find;
	(MockSchedule as any).findOne = findOne;
	(MockSchedule as any).findOneAndDelete = findOneAndDelete;

	return { default: MockSchedule };
});

import MonthlyCookingSchedule from "../../../models/monthlyCookingSchedule";
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

// ---------------------------------------------------------------------------
// getSchedules
// ---------------------------------------------------------------------------

describe("getSchedules", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
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
		const req: any = { user: { _id: "user-1" }, householdId: undefined };
		const res = makeMockRes();
		const next = vi.fn();

		getSchedules(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 500 when MonthlyCookingSchedule.find rejects", async () => {
		(MonthlyCookingSchedule.find as any).mockRejectedValue(new Error("DB error"));

		const req: any = { user: { _id: "user-1" }, householdId: "hh-1" };
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
				_id: "s-1",
				householdId: "hh-1",
				name: "March 2026",
				start: new Date("2026-03-01"),
				end: new Date("2026-03-31"),
				meals: [],
			},
		];
		(MonthlyCookingSchedule.find as any).mockResolvedValue(mockDocs);

		const req: any = { user: { _id: "user-1" }, householdId: "hh-1" };
		const res = makeMockRes();
		const next = vi.fn();

		getSchedules(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({ schedules: mockDocs });
		expect(next).not.toHaveBeenCalled();
	});

	it("calls find with the correct householdId", async () => {
		(MonthlyCookingSchedule.find as any).mockResolvedValue([]);

		const req: any = { user: { _id: "user-1" }, householdId: "hh-42" };
		const res = makeMockRes();
		const next = vi.fn();

		getSchedules(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(MonthlyCookingSchedule.find).toHaveBeenCalledWith({ householdId: "hh-42" });
	});
});

// ---------------------------------------------------------------------------
// getSchedule
// ---------------------------------------------------------------------------

describe("getSchedule", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
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
		const req: any = { user: { _id: "user-1" }, householdId: undefined, params: { id: "s-1" } };
		const res = makeMockRes();
		const next = vi.fn();

		getSchedule(req, res, next);

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({ statusCode: 404 }),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next with 404 when schedule is not found", async () => {
		(MonthlyCookingSchedule.findOne as any).mockResolvedValue(null);

		const req: any = {
			user: { _id: "user-1" },
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

	it("calls next with 500 when findOne rejects", async () => {
		(MonthlyCookingSchedule.findOne as any).mockRejectedValue(new Error("DB failure"));

		const req: any = {
			user: { _id: "user-1" },
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
		const mockDoc = {
			_id: "s-1",
			householdId: "hh-1",
			name: "March 2026",
			start: new Date("2026-03-01"),
			end: new Date("2026-03-31"),
			meals: [],
		};
		(MonthlyCookingSchedule.findOne as any).mockResolvedValue(mockDoc);

		const req: any = {
			user: { _id: "user-1" },
			householdId: "hh-1",
			params: { id: "s-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		getSchedule(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(res.json).toHaveBeenCalledWith({ schedule: mockDoc });
		expect(next).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// createSchedule
// ---------------------------------------------------------------------------

describe("createSchedule", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
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
			user: { _id: "user-1" },
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
			user: { _id: "user-1" },
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
			user: { _id: "user-1" },
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
			user: { _id: "user-1" },
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

	it("calls next with 500 when save rejects", async () => {
		mockSave = vi.fn().mockRejectedValue(new Error("Save failed"));

		const req: any = {
			user: { _id: "user-1" },
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
			_id: "s-new",
			householdId: "hh-1",
			name: "March 2026",
			start: new Date("2026-03-01"),
			end: new Date("2026-03-31"),
			meals: [],
		};
		mockSave = vi.fn().mockResolvedValue(savedDoc);

		const req: any = {
			user: { _id: "user-1" },
			householdId: "hh-1",
			body: { name: "March 2026", start: "2026-03-01", end: "2026-03-31" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		createSchedule(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(201));
		expect(res.json).toHaveBeenCalledWith({
			message: "Schedule created!",
			schedule: savedDoc,
		});
		expect(next).not.toHaveBeenCalled();
	});

	it("creates schedule with meals array when provided", async () => {
		const meal = {
			start: "2026-03-01T07:00:00.000Z",
			end: "2026-03-01T08:00:00.000Z",
			mealType: "Breakfast",
			recipe: "recipe-1",
			portion: 2,
		};
		const savedDoc = {
			_id: "s-new",
			householdId: "hh-1",
			name: "March 2026",
			start: new Date("2026-03-01"),
			end: new Date("2026-03-31"),
			meals: [meal],
		};
		mockSave = vi.fn().mockResolvedValue(savedDoc);

		const req: any = {
			user: { _id: "user-1" },
			householdId: "hh-1",
			body: {
				name: "March 2026",
				start: "2026-03-01",
				end: "2026-03-31",
				meals: [meal],
			},
		};
		const res = makeMockRes();
		const next = vi.fn();

		createSchedule(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(201));
		expect(res.json).toHaveBeenCalledWith({
			message: "Schedule created!",
			schedule: savedDoc,
		});
	});
});

// ---------------------------------------------------------------------------
// updateSchedule
// ---------------------------------------------------------------------------

describe("updateSchedule", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
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
		(MonthlyCookingSchedule.findOne as any).mockResolvedValue(null);

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

	it("calls next with 500 when findOne rejects", async () => {
		(MonthlyCookingSchedule.findOne as any).mockRejectedValue(new Error("DB error"));

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
		const updatedDoc = {
			_id: "s-1",
			householdId: "hh-1",
			name: "April 2026",
			start: new Date("2026-04-01"),
			end: new Date("2026-04-30"),
			meals: [],
		};
		const mockFoundDoc: any = {
			_id: "s-1",
			name: "March 2026",
			start: new Date("2026-03-01"),
			end: new Date("2026-03-31"),
			meals: [],
			save: vi.fn().mockResolvedValue(updatedDoc),
		};
		(MonthlyCookingSchedule.findOne as any).mockResolvedValue(mockFoundDoc);

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
		expect(res.json).toHaveBeenCalledWith({
			message: "Schedule updated successfully",
			schedule: updatedDoc,
		});
		expect(next).not.toHaveBeenCalled();
	});

	it("only updates fields that are provided", async () => {
		const mockFoundDoc: any = {
			_id: "s-1",
			name: "Old Name",
			start: new Date("2026-03-01"),
			end: new Date("2026-03-31"),
			meals: [],
			save: vi.fn().mockResolvedValue({ _id: "s-1", name: "New Name" }),
		};
		(MonthlyCookingSchedule.findOne as any).mockResolvedValue(mockFoundDoc);

		const req: any = {
			householdId: "hh-1",
			body: { scheduleId: "s-1", name: "New Name" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		updateSchedule(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(mockFoundDoc.name).toBe("New Name");
		// start, end, meals left unchanged
		expect(mockFoundDoc.start).toEqual(new Date("2026-03-01"));
		expect(mockFoundDoc.end).toEqual(new Date("2026-03-31"));
	});
});

// ---------------------------------------------------------------------------
// deleteSchedule
// ---------------------------------------------------------------------------

describe("deleteSchedule", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSave = vi.fn();
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

	it("calls next with 404 when findOneAndDelete returns null", async () => {
		(MonthlyCookingSchedule.findOneAndDelete as any).mockResolvedValue(null);

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

	it("calls next with 500 when findOneAndDelete rejects", async () => {
		(MonthlyCookingSchedule.findOneAndDelete as any).mockRejectedValue(new Error("DB down"));

		const req: any = {
			householdId: "hh-1",
			body: { scheduleId: "s-1" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		deleteSchedule(req, res, next);

		await vi.waitFor(() =>
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({ statusCode: 500 }),
			),
		);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 200 on successful deletion", async () => {
		const deletedDoc = {
			_id: "s-1",
			householdId: "hh-1",
			name: "March 2026",
		};
		(MonthlyCookingSchedule.findOneAndDelete as any).mockResolvedValue(deletedDoc);

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

	it("calls findOneAndDelete with correct id and householdId", async () => {
		const deletedDoc = { _id: "s-99", householdId: "hh-1", name: "Old" };
		(MonthlyCookingSchedule.findOneAndDelete as any).mockResolvedValue(deletedDoc);

		const req: any = {
			householdId: "hh-1",
			body: { scheduleId: "s-99" },
		};
		const res = makeMockRes();
		const next = vi.fn();

		deleteSchedule(req, res, next);

		await vi.waitFor(() => expect(res.status).toHaveBeenCalledWith(200));
		expect(MonthlyCookingSchedule.findOneAndDelete).toHaveBeenCalledWith({
			_id: "s-99",
			householdId: "hh-1",
		});
	});
});
