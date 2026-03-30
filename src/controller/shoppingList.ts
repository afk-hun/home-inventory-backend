import { NextFunction, Request, Response } from "express";

import ShoppingList from "../models/shoppingList";

export const getShoppingLists = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	ShoppingList.find({ householdId })
		.then((lists) => {
			res.status(200).json({ shoppingLists: lists });
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const getShoppingList = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const { shoppingListId } = req.params;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!shoppingListId) {
		const error = new Error("Shopping list ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	ShoppingList.findOne({ _id: shoppingListId, householdId })
		.then((list) => {
			if (!list) {
				const error = new Error("Shopping list not found") as any;
				error.statusCode = 404;
				throw error;
			}
			res.status(200).json({ shoppingList: list });
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const createShoppingList = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const { name, storeId, items } = req.body;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!name || !storeId) {
		const error = new Error("Name and store ID are required") as any;
		error.statusCode = 400;
		return next(error);
	}

	const shoppingList = new ShoppingList({
		householdId,
		name,
		storeId,
		items: items || [],
	});

	shoppingList
		.save()
		.then((result) => {
			res.status(201).json({
				message: "Shopping list created!",
				shoppingList: result,
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const updateShoppingList = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const { shoppingListId, name, storeId, items } = req.body;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!shoppingListId) {
		const error = new Error("Shopping list ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	ShoppingList.findOne({ _id: shoppingListId, householdId })
		.then((list) => {
			if (!list) {
				const error = new Error("Shopping list not found") as any;
				error.statusCode = 404;
				throw error;
			}

			if (name !== undefined) list.name = name;
			if (storeId !== undefined) list.storeId = storeId;
			if (items !== undefined) list.items = items;

			return list.save();
		})
		.then((updated) => {
			res.status(200).json({
				message: "Shopping list updated successfully",
				shoppingList: updated,
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const deleteShoppingList = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const { shoppingListId } = req.body;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!shoppingListId) {
		const error = new Error("Shopping list ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	ShoppingList.findOneAndDelete({ _id: shoppingListId, householdId })
		.then((result) => {
			if (!result) {
				const error = new Error("Shopping list not found") as any;
				error.statusCode = 404;
				throw error;
			}
			res.status(200).json({ message: "Shopping list deleted successfully" });
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};
