import { NextFunction, Request, Response } from "express";

import { prisma } from "../lib/prisma";
import { toMongoDoc } from "../lib/serialize";

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

	prisma.monthlyCookingSchedule
		.findMany({ where: { householdId }, include: { meals: true } })
		.then((schedules) => {
			res.status(200).json({
				schedules: schedules.map((s) => ({
					...toMongoDoc(s),
					meals: s.meals.map((m) => ({
						_id: m.id,
						start: m.start,
						end: m.end,
						mealType: m.mealType,
						recipe: m.recipeId,
						portion: m.portion,
					})),
				})),
			});
		})
		.catch((err: any) => {
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

	prisma.monthlyCookingSchedule
		.findFirst({
			where: { id: scheduleId, householdId },
			include: { meals: true },
		})
		.then((schedule) => {
			if (!schedule) {
				const error = new Error("Schedule not found") as any;
				error.statusCode = 404;
				throw error;
			}
			res.status(200).json({
				schedule: {
					...toMongoDoc(schedule),
					meals: schedule.meals.map((m) => ({
						_id: m.id,
						start: m.start,
						end: m.end,
						mealType: m.mealType,
						recipe: m.recipeId,
						portion: m.portion,
					})),
				},
			});
		})
		.catch((err: any) => {
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

	const mealList: any[] = meals || [];

	prisma.monthlyCookingSchedule
		.create({
			data: {
				householdId,
				name,
				start: new Date(start),
				end: new Date(end),
				meals: {
					create: mealList.map((m: any) => ({
						recipeId: m.recipe,
						mealType: m.mealType,
						start: new Date(m.start),
						end: new Date(m.end),
						portion: m.portion,
					})),
				},
			},
			include: { meals: true },
		})
		.then((result) => {
			res.status(201).json({
				message: "Schedule created!",
				schedule: {
					...toMongoDoc(result),
					meals: result.meals.map((m) => ({
						_id: m.id,
						start: m.start,
						end: m.end,
						mealType: m.mealType,
						recipe: m.recipeId,
						portion: m.portion,
					})),
				},
			});
		})
		.catch((err: any) => {
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

	prisma.monthlyCookingSchedule
		.findFirst({ where: { id: scheduleId, householdId } })
		.then((schedule) => {
			if (!schedule) {
				const error = new Error("Schedule not found") as any;
				error.statusCode = 404;
				throw error;
			}

			const updateData: any = {};
			if (name !== undefined) updateData.name = name;
			if (start !== undefined) updateData.start = new Date(start);
			if (end !== undefined) updateData.end = new Date(end);

			if (meals !== undefined) {
				return prisma.$transaction([
					prisma.meal.deleteMany({ where: { scheduleId } }),
					prisma.monthlyCookingSchedule.update({
						where: { id: scheduleId },
						data: {
							...updateData,
							meals: {
								create: (meals as any[]).map((m: any) => ({
									recipeId: m.recipe,
									mealType: m.mealType,
									start: new Date(m.start),
									end: new Date(m.end),
									portion: m.portion,
								})),
							},
						},
						include: { meals: true },
					}),
				]).then(([, updated]) => updated);
			}

			return prisma.monthlyCookingSchedule.update({
				where: { id: scheduleId },
				data: updateData,
				include: { meals: true },
			});
		})
		.then((updated: any) => {
			res.status(200).json({
				message: "Schedule updated successfully",
				schedule: {
					...toMongoDoc(updated),
					meals: updated.meals.map((m: any) => ({
						_id: m.id,
						start: m.start,
						end: m.end,
						mealType: m.mealType,
						recipe: m.recipeId,
						portion: m.portion,
					})),
				},
			});
		})
		.catch((err: any) => {
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

	prisma.monthlyCookingSchedule
		.findFirst({ where: { id: scheduleId, householdId } })
		.then((schedule) => {
			if (!schedule) {
				const error = new Error("Schedule not found") as any;
				error.statusCode = 404;
				throw error;
			}
			return prisma.monthlyCookingSchedule.delete({ where: { id: scheduleId } });
		})
		.then(() => {
			res.status(200).json({ message: "Schedule deleted successfully" });
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};
