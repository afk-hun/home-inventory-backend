import { NextFunction, Request, Response } from "express";

import Recipe from "../models/recipe";
import Shelf from "../models/shelf";

export const getRecipes = (
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

	Recipe.find({ householdId: householdId })
		.then((recipes) => {
			res.status(200).json({
				recipes: recipes.map((recipe) => ({
					_id: recipe._id,
					householdId: recipe.householdId,
					name: recipe.name,
					type: recipe.type,
					ingredients: recipe.ingredients,
					portion: recipe.portion,
					description: recipe.description,
				})),
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const getRecipe = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const user = req.user;
	const householdId = req.householdId;
	const recipeId = req.params.id;

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

	Recipe.findById(recipeId)
		.then((recipe) => {
			if (!recipe) {
				const error = new Error("Recipe not found") as any;
				error.statusCode = 404;
				throw error;
			}
			res.status(200).json({
				recipe: {
					_id: recipe._id,
					householdId: recipe.householdId,
					name: recipe.name,
					type: recipe.type,
					ingredients: recipe.ingredients,
					portion: recipe.portion,
					description: recipe.description,
				},
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const createRecipe = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const user = req.user;
	const householdId = req.householdId;
	const name = req.body.name;
	const type = req.body.type;
	const ingredients = req.body.ingredients;
	const portion = req.body.portion;
	const description = req.body.description;

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

	if (!name) {
		const error = new Error("Name is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	const recipe = new Recipe({
		householdId,
		name,
		type,
		ingredients: ingredients || [],
		portion,
		description,
	});

	recipe
		.save()
		.then((result) => {
			res.status(201).json({
				message: "Recipe created!",
				recipe: result,
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const updateRecipe = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const recipeId = req.body.recipeId;
	const name = req.body.name;
	const type = req.body.type;
	const ingredients = req.body.ingredients;
	const portion = req.body.portion;
	const description = req.body.description;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!recipeId) {
		const error = new Error("Recipe ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	Recipe.findById(recipeId)
		.then((recipe) => {
			if (!recipe) {
				const error = new Error("Recipe not found") as any;
				error.statusCode = 404;
				throw error;
			}
			if (name !== undefined) recipe.name = name;
			if (type !== undefined) recipe.type = type;
			if (ingredients !== undefined) recipe.ingredients = ingredients;
			if (portion !== undefined) recipe.portion = portion;
			if (description !== undefined) recipe.description = description;
			return recipe.save();
		})
		.then((updated) => {
			res.status(200).json({
				message: "Recipe updated successfully",
				recipe: updated,
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const getMissingIngredients = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const user = req.user;
	const householdId = req.householdId;
	const recipeId = req.params.id;

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

	let foundRecipe: any;

	Recipe.findById(recipeId)
		.populate("ingredients.item", "_id name")
		.then((recipe) => {
			if (!recipe) {
				const error = new Error("Recipe not found") as any;
				error.statusCode = 404;
				throw error;
			}
			foundRecipe = recipe;
			return Shelf.find({ householdId });
		})
		.then((shelves) => {
			// Build a map: itemId -> { [unit_lower]: totalQuantity }
			const shelfTotals = new Map<string, Map<string, number>>();

			for (const shelf of shelves) {
				for (const shelfItem of shelf.items) {
					const itemId = shelfItem.item.toString();
					const unit = (shelfItem.unit || "").toLowerCase();
					if (!shelfTotals.has(itemId)) {
						shelfTotals.set(itemId, new Map());
					}
					const unitMap = shelfTotals.get(itemId)!;
					unitMap.set(unit, (unitMap.get(unit) || 0) + shelfItem.quantity);
				}
			}

			const missing: { item: { _id: any; name: any }; amount: number; unit: string }[] = [];

			for (const ingredient of foundRecipe.ingredients) {
				const itemId = (ingredient.item._id ?? ingredient.item).toString();
				const requiredUnit = ingredient.unit.toLowerCase();
				const requiredAmount = ingredient.quantity;

				const unitMap = shelfTotals.get(itemId);
				const shelfAmount = unitMap ? (unitMap.get(requiredUnit) || 0) : 0;

				if (shelfAmount < requiredAmount) {
					const populatedItem = ingredient.item;
					missing.push({
						item: {
							_id: populatedItem._id ?? populatedItem,
							name: populatedItem.name ?? undefined,
						},
						amount: requiredAmount,
						unit: ingredient.unit,
					});
				}
			}

			res.status(200).json(missing);
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const deleteRecipe = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const recipeId = req.body.recipeId;

	if (!recipeId) {
		const error = new Error("Recipe ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	Recipe.findByIdAndDelete(recipeId)
		.then((result) => {
			if (!result) {
				const error = new Error("Recipe not found") as any;
				error.statusCode = 404;
				throw error;
			}
			res.status(200).json({
				message: "Recipe deleted successfully",
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};
