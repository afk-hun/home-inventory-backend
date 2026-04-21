import { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../lib/db";
import { monthlyCookingSchedules, meals } from "../db/schema";
import { toMongoDoc } from "../lib/serialize";

function mapMeals(ms: any[]) {
	return ms.map((m) => ({
		_id: m.id,
		start: m.start,
		end: m.end,
		mealType: m.mealType,
		recipe: m.recipeId,
		portion: m.portion,
		done: m.done,
	}));
}

function scheduleWithMeals(id: string) {
	return db.query.monthlyCookingSchedules.findFirst({
		where: (t, { eq }) => eq(t.id, id),
		with: { meals: true },
	}).sync();
}

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

	try {
		const result = db.query.monthlyCookingSchedules.findMany({
			where: (t, { eq }) => eq(t.householdId, householdId),
			with: { meals: true },
		}).sync();
		res.status(200).json({
			schedules: result.map((s) => ({
				...toMongoDoc(s),
				meals: mapMeals(s.meals),
			})),
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const getSchedule = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const user = req.user;
	const householdId = req.householdId;
	const scheduleId = req.params.id as string;

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

	try {
		const schedule = db.query.monthlyCookingSchedules.findFirst({
			where: (t, { and, eq }) => and(eq(t.id, scheduleId), eq(t.householdId, householdId)),
			with: { meals: true },
		}).sync();
		if (!schedule) {
			const error = new Error("Schedule not found") as any;
			error.statusCode = 404;
			return next(error);
		}
		res.status(200).json({
			schedule: {
				...toMongoDoc(schedule),
				meals: mapMeals(schedule.meals),
			},
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const createSchedule = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const user = req.user;
	const householdId = req.householdId;
	const { name, start, end, meals: mealsBody } = req.body;

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

	const mealList: any[] = mealsBody || [];

	try {
		const id = createId();
		db.insert(monthlyCookingSchedules).values({
			id,
			householdId,
			name,
			start: new Date(start),
			end: new Date(end),
		}).run();
		if (mealList.length > 0) {
			db.insert(meals).values(
				mealList.map((m: any) => ({
					id: createId(),
					scheduleId: id,
					recipeId: m.recipe,
					mealType: m.mealType,
					start: new Date(m.start),
					end: new Date(m.end),
					portion: m.portion,
					done: m.done ?? false,
				})),
			).run();
		}
		const result = scheduleWithMeals(id)!;
		res.status(201).json({
			message: "Schedule created!",
			schedule: {
				...toMongoDoc(result),
				meals: mapMeals(result.meals),
			},
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const updateSchedule = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const { scheduleId, name, start, end, meals: mealsBody } = req.body;

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

	try {
		const schedule = db.query.monthlyCookingSchedules.findFirst({
			where: (t, { and, eq }) => and(eq(t.id, scheduleId), eq(t.householdId, householdId)),
		}).sync();
		if (!schedule) {
			const error = new Error("Schedule not found") as any;
			error.statusCode = 404;
			return next(error);
		}

		const updateData: any = {};
		if (name !== undefined) updateData.name = name;
		if (start !== undefined) updateData.start = new Date(start);
		if (end !== undefined) updateData.end = new Date(end);

		if (mealsBody !== undefined) {
			db.transaction((tx) => {
				tx.delete(meals).where(eq(meals.scheduleId, scheduleId)).run();
				if (Object.keys(updateData).length > 0) {
					tx.update(monthlyCookingSchedules).set(updateData).where(eq(monthlyCookingSchedules.id, scheduleId)).run();
				}
				if ((mealsBody as any[]).length > 0) {
					tx.insert(meals).values(
						(mealsBody as any[]).map((m: any) => ({
							id: createId(),
							scheduleId,
							recipeId: m.recipe,
							mealType: m.mealType,
							start: new Date(m.start),
							end: new Date(m.end),
							portion: m.portion,
							done: m.done ?? false,
						})),
					).run();
				}
			});
		} else if (Object.keys(updateData).length > 0) {
			db.update(monthlyCookingSchedules).set(updateData).where(eq(monthlyCookingSchedules.id, scheduleId)).run();
		}

		const updated = scheduleWithMeals(scheduleId)!;
		res.status(200).json({
			message: "Schedule updated successfully",
			schedule: {
				...toMongoDoc(updated),
				meals: mapMeals(updated.meals),
			},
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
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

	try {
		const schedule = db.query.monthlyCookingSchedules.findFirst({
			where: (t, { and, eq }) => and(eq(t.id, scheduleId), eq(t.householdId, householdId)),
		}).sync();
		if (!schedule) {
			const error = new Error("Schedule not found") as any;
			error.statusCode = 404;
			return next(error);
		}
		db.delete(monthlyCookingSchedules).where(eq(monthlyCookingSchedules.id, scheduleId)).run();
		res.status(200).json({ message: "Schedule deleted successfully" });
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};
