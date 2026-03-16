import { NextFunction, Request, Response } from "express";

import Shelf from "../../models/shelf";
import "../../models/item"

export const getShelves = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const page = Math.max(1, parseInt(req.query.page as string) || 1);
	const limit = Math.max(1, parseInt(req.query.limit as string) || 5);
	const skip = (page - 1) * limit;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	Shelf.countDocuments({ householdId })
		.then((total) => {
			return Shelf.find({ householdId })
				.skip(skip)
				.limit(limit)
				.then((shelves) => {
					res.status(200).json({
						shelves,
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

export const getShelf = (req: Request, res: Response, next: NextFunction) => {
	const householdId = req.householdId;
	const { id } = req.params;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	Shelf.findOne({ _id: id, householdId })
		.populate("items.item", "name")
		.populate("items.unit", "name")
		.then((shelf) => {
			if (!shelf) {
				const error = new Error("Shelf not found") as any;
				error.statusCode = 404;
				throw error;
			}
			res.status(200).json({ shelf });
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const createShelf = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const { name, place, type } = req.body;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!name) {
		const error = new Error("Shelf name is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	const shelf = new Shelf({
		householdId,
		name,
		...(place !== undefined && { place }),
		...(type !== undefined && { type }),
		items: [],
	});

	shelf
		.save()
		.then((result) => {
			res.status(201).json({ message: "Shelf created!", shelf: result });
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const updateShelf = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const { shelfId, name, place, type } = req.body;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!shelfId) {
		const error = new Error("Shelf ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	Shelf.findOne({ _id: shelfId, householdId })
		.then((shelf) => {
			if (!shelf) {
				const error = new Error("Shelf not found") as any;
				error.statusCode = 404;
				throw error;
			}

			if (name !== undefined) shelf.name = name;
			if (place !== undefined) shelf.place = place;
			if (type !== undefined) shelf.type = type;

			return shelf.save();
		})
		.then((updated) => {
			res.status(200).json({
				message: "Shelf updated successfully",
				shelf: updated,
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const deleteShelf = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const { shelfId } = req.body;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!shelfId) {
		const error = new Error("Shelf ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	Shelf.findOneAndDelete({ _id: shelfId, householdId })
		.then((result) => {
			if (!result) {
				const error = new Error("Shelf not found") as any;
				error.statusCode = 404;
				throw error;
			}
			res.status(200).json({ message: "Shelf deleted successfully" });
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const addShelfItem = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const { shelfId, itemId, itemName, quantity, unit } = req.body;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!shelfId || (!itemId && !itemName) || quantity === undefined) {
		const error = new Error(
			"Shelf ID, item ID or item name, and quantity are required",
		) as any;
		error.statusCode = 400;
		return next(error);
	}

	Shelf.findOne({ _id: shelfId, householdId })
		.then((shelf) => {
			if (!shelf) {
				const error = new Error("Shelf not found") as any;
				error.statusCode = 404;
				throw error;
			}

			const newItem: any = { item: itemId, quantity };
			if (itemName !== undefined) newItem.itemName = itemName;
			if (unit !== undefined) newItem.unit = unit;

			shelf.items.push(newItem);

			return shelf.save();
		})
		.then((updated) => {
			res.status(200).json({
				message: "Item added to shelf",
				shelf: updated,
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const removeShelfItem = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const { shelfId, shelfItemId } = req.body;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (!shelfId || !shelfItemId) {
		const error = new Error("Shelf ID and shelf item ID are required") as any;
		error.statusCode = 400;
		return next(error);
	}

	Shelf.findOne({ _id: shelfId, householdId })
		.then((shelf) => {
			if (!shelf) {
				const error = new Error("Shelf not found") as any;
				error.statusCode = 404;
				throw error;
			}

			const itemIndex = shelf.items.findIndex(
				(i) => i._id.toString() === shelfItemId.toString(),
			);

			if (itemIndex === -1) {
				const error = new Error("Shelf item not found") as any;
				error.statusCode = 404;
				throw error;
			}

			shelf.items.splice(itemIndex, 1);

			return shelf.save();
		})
		.then((updated) => {
			res.status(200).json({
				message: "Item removed from shelf",
				shelf: updated,
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};
