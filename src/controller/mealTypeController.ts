import { NextFunction, Request, Response } from "express";

import MealType from "../models/mealType";

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

	MealType.find({ householdId })
		.then((mealTypes) => {
			res.status(200).json({
				mealTypes: mealTypes.map((mealType) => ({
					_id: mealType._id,
					name: mealType.name,
					householdId: mealType.householdId,
				})),
			});
		})
		.catch((err) => {
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

	const mealType = new MealType({ name, householdId });

	mealType
		.save()
		.then((result) => {
			res.status(201).json({
				message: "Meal type created!",
				mealType: result,
			});
		})
		.catch((err) => {
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

	MealType.findById(mealTypeId)
		.then((mealType) => {
			if (!mealType) {
				const error = new Error("Meal type not found") as any;
				error.statusCode = 404;
				throw error;
			}
			mealType.name = newName;
			return mealType.save();
		})
		.then((updated) => {
			res.status(200).json({
				message: "Meal type renamed successfully",
				mealTypeId: updated._id,
			});
		})
		.catch((err) => {
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

	MealType.findByIdAndDelete(mealTypeId)
		.then((result) => {
			if (!result) {
				const error = new Error("Meal type not found") as any;
				error.statusCode = 404;
				throw error;
			}
			res.status(200).json({ message: "Meal type deleted successfully" });
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};
