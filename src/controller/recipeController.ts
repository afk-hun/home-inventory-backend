import { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../lib/db";
import { recipes, ingredients, shelfItems } from "../db/schema";
import { toMongoDoc } from "../lib/serialize";
import { toBase } from "../lib/units";

function mapIngredients(ings: any[]) {
	return ings.map((ing) => ({
		_id: ing.id,
		quantity: ing.quantity,
		unit: ing.unit,
		item: ing.itemId,
	}));
}

function recipeWithIngredients(id: string) {
	return db.query.recipes.findFirst({
		where: (t, { eq }) => eq(t.id, id),
		with: { ingredients: true },
	}).sync();
}

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

	try {
		const result = db.query.recipes.findMany({
			where: (t, { eq }) => eq(t.householdId, householdId),
			with: { ingredients: true },
		}).sync();
		res.status(200).json({
			recipes: result.map((recipe) => ({
				_id: recipe.id,
				householdId: recipe.householdId,
				name: recipe.name,
				type: recipe.type,
				ingredients: mapIngredients(recipe.ingredients),
				portion: recipe.portion,
				description: recipe.description,
			})),
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const getRecipe = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const user = req.user;
	const householdId = req.householdId;
	const recipeId = req.params.id as string;

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
		const recipe = db.query.recipes.findFirst({
			where: (t, { eq }) => eq(t.id, recipeId),
			with: { ingredients: true },
		}).sync();
		if (!recipe) {
			const error = new Error("Recipe not found") as any;
			error.statusCode = 404;
			return next(error);
		}
		res.status(200).json({
			recipe: {
				_id: recipe.id,
				householdId: recipe.householdId,
				name: recipe.name,
				type: recipe.type,
				ingredients: mapIngredients(recipe.ingredients),
				portion: recipe.portion,
				description: recipe.description,
			},
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const createRecipe = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const user = req.user;
	const householdId = req.householdId;
	const { name, type, ingredients: ingsBody, portion, description } = req.body;

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

	const ingList: any[] = ingsBody || [];

	try {
		const id = createId();
		db.insert(recipes).values({ id, householdId, name, type, portion, description }).run();
		if (ingList.length > 0) {
			db.insert(ingredients).values(
				ingList.map((ing: any) => {
					const { baseQuantity, baseUnit } = toBase(ing.quantity, ing.unit);
					return {
						id: createId(),
						recipeId: id,
						itemId: ing.item,
						quantity: ing.quantity,
						unit: ing.unit,
						...(baseQuantity !== null && { baseQuantity }),
						...(baseUnit !== null && { baseUnit }),
					};
				}),
			).run();
		}
		const result = recipeWithIngredients(id)!;
		res.status(201).json({
			message: "Recipe created!",
			recipe: {
				...toMongoDoc(result),
				ingredients: mapIngredients(result.ingredients),
			},
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const updateRecipe = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const { recipeId, name, type, ingredients: ingsBody, portion, description } = req.body;

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

	try {
		const recipe = db.query.recipes.findFirst({ where: (t, { eq }) => eq(t.id, recipeId) }).sync();
		if (!recipe) {
			const error = new Error("Recipe not found") as any;
			error.statusCode = 404;
			return next(error);
		}

		const updateData: any = {};
		if (name !== undefined) updateData.name = name;
		if (type !== undefined) updateData.type = type;
		if (portion !== undefined) updateData.portion = portion;
		if (description !== undefined) updateData.description = description;

		if (ingsBody !== undefined) {
			db.transaction((tx) => {
				tx.delete(ingredients).where(eq(ingredients.recipeId, recipeId)).run();
				if (Object.keys(updateData).length > 0) {
					tx.update(recipes).set(updateData).where(eq(recipes.id, recipeId)).run();
				}
				if ((ingsBody as any[]).length > 0) {
					tx.insert(ingredients).values(
						(ingsBody as any[]).map((ing: any) => {
							const { baseQuantity, baseUnit } = toBase(ing.quantity, ing.unit);
							return {
								id: createId(),
								recipeId,
								itemId: ing.item,
								quantity: ing.quantity,
								unit: ing.unit,
								...(baseQuantity !== null && { baseQuantity }),
								...(baseUnit !== null && { baseUnit }),
							};
						}),
					).run();
				}
			});
		} else if (Object.keys(updateData).length > 0) {
			db.update(recipes).set(updateData).where(eq(recipes.id, recipeId)).run();
		}

		const updated = recipeWithIngredients(recipeId)!;
		res.status(200).json({
			message: "Recipe updated successfully",
			recipe: {
				...toMongoDoc(updated),
				ingredients: mapIngredients(updated.ingredients),
			},
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const getMissingIngredients = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const user = req.user;
	const householdId = req.householdId;
	const recipeId = req.params.id as string;

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
		const recipe = db.query.recipes.findFirst({
			where: (t, { eq }) => eq(t.id, recipeId),
			with: { ingredients: { with: { item: { columns: { id: true, name: true } } } } },
		}).sync();
		if (!recipe) {
			const error = new Error("Recipe not found") as any;
			error.statusCode = 404;
			return next(error);
		}

		// Fetch all shelf items for this household (via shelves relation)
		const householdShelves = db.query.shelves.findMany({
			where: (t, { eq }) => eq(t.householdId, householdId),
			with: { items: true },
		}).sync();
		const allShelfItems = householdShelves.flatMap((s) => s.items);

		// Build two maps per itemId:
		//   baseMap: baseUnit -> total baseQuantity (for cross-unit comparison)
		//   exactMap: unit_lower -> total quantity (fallback for exact-unit match)
		const shelfBase = new Map<string, Map<string, number>>();
		const shelfExact = new Map<string, Map<string, number>>();

		for (const si of allShelfItems) {
			const itemId = si.itemId;

			if (si.baseUnit && si.baseQuantity !== null && si.baseQuantity !== undefined) {
				if (!shelfBase.has(itemId)) shelfBase.set(itemId, new Map());
				const bm = shelfBase.get(itemId)!;
				bm.set(si.baseUnit, (bm.get(si.baseUnit) || 0) + si.baseQuantity);
			}

			const unit = (si.unit || "").toLowerCase();
			if (!shelfExact.has(itemId)) shelfExact.set(itemId, new Map());
			const em = shelfExact.get(itemId)!;
			em.set(unit, (em.get(unit) || 0) + si.quantity);
		}

		const missing: { item: { _id: string; name: string }; amount: number; unit: string }[] = [];

		for (const ingredient of recipe.ingredients) {
			const itemId = ingredient.item.id;
			const requiredAmount = ingredient.quantity;

			if (
				ingredient.baseUnit &&
				ingredient.baseQuantity !== null &&
				ingredient.baseQuantity !== undefined
			) {
				const bm = shelfBase.get(itemId);
				const shelfBaseAmount = bm ? (bm.get(ingredient.baseUnit) || 0) : 0;
				const needed = (ingredient.baseQuantity as number) - shelfBaseAmount;
				if (needed <= 0) continue;
				missing.push({
					item: { _id: ingredient.item.id, name: ingredient.item.name },
					amount: needed,
					unit: ingredient.baseUnit,
				});
			} else {
				const requiredUnit = ingredient.unit.toLowerCase();
				const em = shelfExact.get(itemId);
				const shelfAmount = em ? (em.get(requiredUnit) || 0) : 0;
				const needed = requiredAmount - shelfAmount;
				if (needed <= 0) continue;
				missing.push({
					item: { _id: ingredient.item.id, name: ingredient.item.name },
					amount: needed,
					unit: ingredient.unit,
				});
			}
		}

		res.status(200).json(missing);
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
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

	try {
		const recipe = db.query.recipes.findFirst({ where: (t, { eq }) => eq(t.id, recipeId) }).sync();
		if (!recipe) {
			const error = new Error("Recipe not found") as any;
			error.statusCode = 404;
			return next(error);
		}
		db.delete(recipes).where(eq(recipes.id, recipeId)).run();
		res.status(200).json({ message: "Recipe deleted successfully" });
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};
