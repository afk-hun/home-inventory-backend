import { NextFunction, Request, Response } from "express";

import ShelfType from "../../models/shelfType";

export const getShelfTypes = (
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

	ShelfType.find({ householdId: householdId })
		.then((shelfTypes) => {
			res.status(200).json({
				shelfTypes: shelfTypes.map((shelfType) => ({
					_id: shelfType._id,
					name: shelfType.name,
					householdId: shelfType.householdId,
				})),
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const createShelfType = (
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

	const shelfType = new ShelfType({
		name,
		householdId,
	});

	shelfType
		.save()
		.then((result) => {
			res.status(201).json({
				message: "Shelf type created!",
				shelfType: result,
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const renameShelfType = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const shelfTypeId = req.body.shelfTypeId;
	const newName = req.body.name;

	if (!householdId || !shelfTypeId || !newName) {
		const error = new Error(
			"Household ID, shelf type ID, and new name are required",
		) as any;
		error.statusCode = 400;
		return next(error);
	}

	ShelfType.findById(shelfTypeId)
		.then((shelfType) => {
			if (!shelfType) {
				const error = new Error("Shelf type not found") as any;
				error.statusCode = 404;
				throw error;
			}
			shelfType.name = newName;
			return shelfType.save();
		})
		.then((updated) => {
			res.status(200).json({
				message: "Shelf type renamed successfully",
				shelfTypeId: updated._id,
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const deleteShelfType = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const shelfTypeId = req.body.shelfTypeId;

	if (!shelfTypeId) {
		const error = new Error("Shelf type ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	ShelfType.findByIdAndDelete(shelfTypeId)
		.then((result) => {
			if (!result) {
				const error = new Error("Shelf type not found") as any;
				error.statusCode = 404;
				throw error;
			}
			res.status(200).json({
				message: "Shelf type deleted successfully",
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};
