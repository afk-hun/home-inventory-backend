import { NextFunction, Request, Response } from "express";

import { prisma } from "../../lib/prisma";
import { toMongoDoc } from "../../lib/serialize";

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

	prisma.shelfPlaceType
		.findMany({ where: { householdId } })
		.then((shelfPlaces) => {
			res.status(200).json({
				shelfPlaces: shelfPlaces.map((sp) => ({
					_id: sp.id,
					name: sp.name,
					householdId: sp.householdId,
				})),
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) {
				err.statusCode = 500;
			}
			next(err);
		});
};

export const createShelfPlaceType = (
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

	prisma.shelfPlaceType
		.create({ data: { name, householdId } })
		.then((result) => {
			res.status(201).json({
				message: "Shelf place type created!",
				shelfPlaceType: toMongoDoc(result),
			});
		})
		.catch((err: any) => {
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

	prisma.shelfPlaceType
		.findUnique({ where: { id: shelfPlaceTypeId } })
		.then((shelfPlaceType) => {
			if (!shelfPlaceType) {
				const error = new Error("Shelf place type not found") as any;
				error.statusCode = 404;
				throw error;
			}
			return prisma.shelfPlaceType.update({
				where: { id: shelfPlaceTypeId },
				data: { name: newName },
			});
		})
		.then((updated) => {
			res.status(200).json({
				message: "Shelf place type renamed successfully",
				shelfPlaceTypeId: updated.id,
			});
		})
		.catch((err: any) => {
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

	prisma.shelfPlaceType
		.findUnique({ where: { id: shelfPlaceTypeId } })
		.then((shelfPlaceType) => {
			if (!shelfPlaceType) {
				const error = new Error("Shelf place type not found") as any;
				error.statusCode = 404;
				throw error;
			}
			return prisma.shelfPlaceType.delete({ where: { id: shelfPlaceTypeId } });
		})
		.then(() => {
			res.status(200).json({
				message: "Shelf place type deleted successfully",
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) {
				err.statusCode = 500;
			}
			next(err);
		});
};
