import { NextFunction, Request, Response } from "express";

import ItemType from "../../models/itemType";

export const getItemTypes = (
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

	ItemType.find({ householdId })
		.then((itemTypes) => {
			res.status(200).json({
				itemTypes: itemTypes.map((itemType) => ({
					_id: itemType._id,
					id: itemType.id,
					name: itemType.name,
					householdId: itemType.householdId,
				})),
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const createItemType = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const name = req.body.name;
	const owner = req.user;
	const householdId = req.householdId;

	if (!name || !owner || !householdId) {
		const error = new Error(
			"Name, owner, and household ID are required",
		) as any;
		error.statusCode = 400;
		return next(error);
	}

	const itemType = new ItemType({ householdId, name });

	itemType
		.save()
		.then((result) => {
			res.status(201).json({
				message: "Item type created!",
				itemType: result,
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const renameItemType = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const { itemTypeId, name } = req.body;

	if (!householdId || !itemTypeId || !name) {
		const error = new Error(
			"Household ID, item type ID, and new name are required",
		) as any;
		error.statusCode = 400;
		return next(error);
	}

	ItemType.findById(itemTypeId)
		.then((itemType) => {
			if (!itemType) {
				const error = new Error("Item type not found") as any;
				error.statusCode = 404;
				throw error;
			}
			itemType.name = name;
			return itemType.save();
		})
		.then((updated) => {
			res.status(200).json({
				message: "Item type renamed successfully",
				itemTypeId: updated._id,
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const deleteItemType = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const { itemTypeId } = req.body;

	if (!itemTypeId) {
		const error = new Error("Item type ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	ItemType.findByIdAndDelete(itemTypeId)
		.then((result) => {
			if (!result) {
				const error = new Error("Item type not found") as any;
				error.statusCode = 404;
				throw error;
			}
			res.status(200).json({
				message: "Item type deleted successfully",
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};
