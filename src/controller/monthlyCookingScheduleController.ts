import { NextFunction, Request, Response } from "express";

import MonthlyCookingSchedule from "../models/monthlyCookingSchedule";

export const getSchedules = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const user = req.user;
	const householdId = req.householdId;

	if (!user) {
		const error = new Error("User not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	MonthlyCookingSchedule.find({ householdId })
		.then((schedules) => {
			res.status(200).json({ schedules });
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const getSchedule = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const user = req.user;
	const householdId = req.householdId;
	const scheduleId = req.params.id;

	if (!user) {
		const error = new Error("User not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	MonthlyCookingSchedule.findOne({ _id: scheduleId, householdId })
		.then((schedule) => {
			if (!schedule) {
				const error = new Error("Schedule not found") as any;
				error.statusCode = 404;
				throw error;
			}
			res.status(200).json({ schedule });
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const createSchedule = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const user = req.user;
	const householdId = req.householdId;
	const { name, start, end, meals } = req.body;

	if (!user) {
		const error = new Error("User not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!name || !start || !end) {
		const error = new Error("Name, start, and end are required") as any;
		error.statusCode = 400;
		return next(error);
	}

	const schedule = new MonthlyCookingSchedule({
		householdId,
		name,
		start,
		end,
		meals: meals || [],
	});

	schedule
		.save()
		.then((result) => {
			res.status(201).json({
				message: "Schedule created!",
				schedule: result,
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const updateSchedule = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const { scheduleId, name, start, end, meals } = req.body;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!scheduleId) {
		const error = new Error("Schedule ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	MonthlyCookingSchedule.findOne({ _id: scheduleId, householdId })
		.then((schedule) => {
			if (!schedule) {
				const error = new Error("Schedule not found") as any;
				error.statusCode = 404;
				throw error;
			}
			if (name !== undefined) schedule.name = name;
			if (start !== undefined) schedule.start = start;
			if (end !== undefined) schedule.end = end;
			if (meals !== undefined) schedule.meals = meals;
			return schedule.save();
		})
		.then((updated) => {
			res.status(200).json({
				message: "Schedule updated successfully",
				schedule: updated,
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const deleteSchedule = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const { scheduleId } = req.body;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!scheduleId) {
		const error = new Error("Schedule ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	MonthlyCookingSchedule.findOneAndDelete({ _id: scheduleId, householdId })
		.then((result) => {
			if (!result) {
				const error = new Error("Schedule not found") as any;
				error.statusCode = 404;
				throw error;
			}
			res.status(200).json({ message: "Schedule deleted successfully" });
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};
