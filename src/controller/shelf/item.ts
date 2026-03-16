import { NextFunction, Request, Response } from "express";

import Item from "../../models/item";
import Store from "../../models/store";

export const getItems = (req: Request, res: Response, next: NextFunction) => {
	const user = req.user;
	const householdId = req.householdId;
	const page = Math.max(1, parseInt(req.query.page as string) || 1);
	const limit = Math.max(1, parseInt(req.query.limit as string) || 5);
	const skip = (page - 1) * limit;

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

	Item.countDocuments({ householdId })
		.then((total) => {
			return Item.find({ householdId })
				.skip(skip)
				.limit(limit)
				.then((items) => {
					res.status(200).json({
						items,
						pagination: {
							total,
							page,
							limit,
							totalPages: Math.ceil(total / limit),
						},
					});
				});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const getItem = (req: Request, res: Response, next: NextFunction) => {
	const user = req.user;
	const householdId = req.householdId;
	const { id } = req.params;

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

	Item.findOne({ _id: id, householdId })
		.populate("type", "name")
		.then((item) => {
			if (!item) {
				const error = new Error("Item not found") as any;
				error.statusCode = 404;
				throw error;
			}
			res.status(200).json({ item });
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const createItem = (req: Request, res: Response, next: NextFunction) => {
	const user = req.user;
	const householdId = req.householdId;
	const { name, type, connectedStores } = req.body;

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
		const error = new Error("Item name is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	const item = new Item({
		householdId,
		name,
		...(type !== undefined && { type }),
		connectedStores: connectedStores || [],
	});

	item
		.save()
		.then((result) => {
			res.status(201).json({ message: "Item created!", item: result });
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const updateItem = (req: Request, res: Response, next: NextFunction) => {
	const householdId = req.householdId;
	const { itemId, name, type, connectedStores } = req.body;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!itemId) {
		const error = new Error("Item ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	Item.findOne({ _id: itemId, householdId })
		.then((item) => {
			if (!item) {
				const error = new Error("Item not found") as any;
				error.statusCode = 404;
				throw error;
			}

			if (name !== undefined) item.name = name;
			if (type !== undefined) item.type = type;
			if (connectedStores !== undefined) item.connectedStores = connectedStores;

			return item.save();
		})
		.then((updated) => {
			res.status(200).json({ message: "Item updated successfully", item: updated });
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const deleteItem = (req: Request, res: Response, next: NextFunction) => {
	const householdId = req.householdId;
	const { itemId } = req.body;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!itemId) {
		const error = new Error("Item ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	Item.findOneAndDelete({ _id: itemId, householdId })
		.then((result) => {
			if (!result) {
				const error = new Error("Item not found") as any;
				error.statusCode = 404;
				throw error;
			}
			res.status(200).json({ message: "Item deleted successfully" });
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const addConnectedStore = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const { itemId, storeId, storeItemId } = req.body;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!itemId || !storeId || !storeItemId) {
		const error = new Error(
			"Item ID, store ID, and store item ID are required",
		) as any;
		error.statusCode = 400;
		return next(error);
	}

	Store.findOne({ _id: storeId, householdId })
		.then((store) => {
			if (!store) {
				const error = new Error("Store not found") as any;
				error.statusCode = 404;
				throw error;
			}

			return Item.findOne({ _id: itemId, householdId }).then((item) => {
				if (!item) {
					const error = new Error("Item not found") as any;
					error.statusCode = 404;
					throw error;
				}

				item.connectedStores.push({
					storeId: store._id,
					storeName: store.name,
					storeItemId,
				});

				return item.save();
			});
		})
		.then((updated) => {
			res.status(200).json({
				message: "Store added to item",
				item: updated,
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};
