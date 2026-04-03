import { NextFunction, Request, Response } from "express";

import { prisma } from "../lib/prisma";
import { toMongoDoc } from "../lib/serialize";

export const getMealTypes = (
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

	prisma.mealType
		.findMany({ where: { householdId } })
		.then((mealTypes) => {
			res.status(200).json({
				mealTypes: mealTypes.map((mt) => ({
					_id: mt.id,
					name: mt.name,
					householdId: mt.householdId,
				})),
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const createMealType = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const name = req.body.name;
	const owner = req.user;
	const householdId = req.householdId;

	if (!name || !owner || !householdId) {
		const error = new Error("Name, owner, and household ID are required") as any;
		error.statusCode = 400;
		return next(error);
	}

	prisma.mealType
		.create({ data: { name, householdId } })
		.then((result) => {
			res.status(201).json({
				message: "Meal type created!",
				mealType: toMongoDoc(result),
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const renameMealType = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const mealTypeId = req.body.mealTypeId;
	const newName = req.body.name;

	if (!householdId || !mealTypeId || !newName) {
		const error = new Error(
			"Household ID, meal type ID, and new name are required",
		) as any;
		error.statusCode = 400;
		return next(error);
	}

	prisma.mealType
		.findUnique({ where: { id: mealTypeId } })
		.then((mealType) => {
			if (!mealType) {
				const error = new Error("Meal type not found") as any;
				error.statusCode = 404;
				throw error;
			}
			return prisma.mealType.update({
				where: { id: mealTypeId },
				data: { name: newName },
			});
		})
		.then((updated) => {
			res.status(200).json({
				message: "Meal type renamed successfully",
				mealTypeId: updated.id,
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const deleteMealType = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const mealTypeId = req.body.mealTypeId;

	if (!mealTypeId) {
		const error = new Error("Meal type ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	prisma.mealType
		.findUnique({ where: { id: mealTypeId } })
		.then((mealType) => {
			if (!mealType) {
				const error = new Error("Meal type not found") as any;
				error.statusCode = 404;
				throw error;
			}
			return prisma.mealType.delete({ where: { id: mealTypeId } });
		})
		.then(() => {
			res.status(200).json({ message: "Meal type deleted successfully" });
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};
