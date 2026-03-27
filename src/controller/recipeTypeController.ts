import { NextFunction, Request, Response } from "express";

import RecipeType from "../models/recipeType";

export const getRecipeTypes = (
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

	RecipeType.find({ householdId: householdId })
		.then((recipeTypes) => {
			res.status(200).json({
				recipeTypes: recipeTypes.map((recipeType) => ({
					_id: recipeType._id,
					name: recipeType.name,
					householdId: recipeType.householdId,
				})),
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const createRecipeType = (
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

	const recipeType = new RecipeType({
		name,
		householdId,
	});

	recipeType
		.save()
		.then((result) => {
			res.status(201).json({
				message: "Recipe type created!",
				recipeType: result,
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const renameRecipeType = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const recipeTypeId = req.body.recipeTypeId;
	const newName = req.body.name;

	if (!householdId || !recipeTypeId || !newName) {
		const error = new Error(
			"Household ID, recipe type ID, and new name are required",
		) as any;
		error.statusCode = 400;
		return next(error);
	}

	RecipeType.findById(recipeTypeId)
		.then((recipeType) => {
			if (!recipeType) {
				const error = new Error("Recipe type not found") as any;
				error.statusCode = 404;
				throw error;
			}
			recipeType.name = newName;
			return recipeType.save();
		})
		.then((updated) => {
			res.status(200).json({
				message: "Recipe type renamed successfully",
				recipeTypeId: updated._id,
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const deleteRecipeType = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const recipeTypeId = req.body.recipeTypeId;

	if (!recipeTypeId) {
		const error = new Error("Recipe type ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	RecipeType.findByIdAndDelete(recipeTypeId)
		.then((result) => {
			if (!result) {
				const error = new Error("Recipe type not found") as any;
				error.statusCode = 404;
				throw error;
			}
			res.status(200).json({
				message: "Recipe type deleted successfully",
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};
