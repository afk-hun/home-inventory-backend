import { NextFunction, Request, Response } from "express";

import ShelfPlaceType from "../../models/shelfPlaceType";

export const getShelfPlaceTypes = (
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

	ShelfPlaceType.find({ householdId: householdId })
		.then((shelfPlaces) => {
			res.status(200).json({
				shelfPlaces: shelfPlaces.map((shelfPlace) => ({
					_id: shelfPlace._id,
					name: shelfPlace.name,
					householdId: shelfPlace.householdId,
				})),
			});
		})
		.catch((err) => {
			if (!err.statusCode) {
				err.statusCode = 500;
			}
			next(err);
		});
};

export const createShelfPlaceType = async (
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

	const shelfPlaceType = new ShelfPlaceType({
		name,
		owner: owner,
		householdId: householdId,
	});

	shelfPlaceType
		.save()
		.then((result) => {
			res.status(201).json({
				message: "Shelf place type created!",
				shelfPlaceType: shelfPlaceType,
			});
		})
		.catch((err) => {
			if (!err.statusCode) {
				err.statusCode = 500;
			}
			next(err);
		});
};

export const renameShelfPlaceType = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const shelfPlaceTypeId = req.body.shelfPlaceTypeId;
	const newName = req.body.name;


	if (!householdId || !newName || !shelfPlaceTypeId) {
		const error = new Error("Household ID, shelf place type ID, and new name are required") as any;
		error.statusCode = 400;
		return next(error);
	}

	ShelfPlaceType.findById(shelfPlaceTypeId)
		.then((shelfPlaceType) => {
			if (!shelfPlaceType) {
				const error = new Error("Shelf place type not found") as any;
				error.statusCode = 404;
				throw error;
			}
			shelfPlaceType.name = newName;
			return shelfPlaceType.save();
		})
		.then((updatedShelfPlaceType) => {
			res.status(200).json({
				message: "Shelf place type renamed successfully",
				shelfPlaceTypeId: updatedShelfPlaceType._id,
			});
		})
		.catch((err) => {
			if (!err.statusCode) {
				err.statusCode = 500;
			}
			next(err);
		});
};

export const deleteShelfPlaceType = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const shelfPlaceTypeId = req.body.shelfPlaceTypeId;

	if (!shelfPlaceTypeId) {
		const error = new Error("Household ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	ShelfPlaceType.findByIdAndDelete(shelfPlaceTypeId)
		.then((result) => {
			if (!result) {
				const error = new Error("Shelf place type not found") as any;
				error.statusCode = 404;
				throw error;
			}
			res.status(200).json({
				message: "Shelf place type deleted successfully",
			});
		})
		.catch((err) => {
			if (!err.statusCode) {
				err.statusCode = 500;
			}
			next(err);
		});
};
