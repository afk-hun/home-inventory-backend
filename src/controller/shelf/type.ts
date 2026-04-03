import { NextFunction, Request, Response } from "express";

import { prisma } from "../../lib/prisma";
import { toMongoDoc } from "../../lib/serialize";

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

	prisma.shelfType
		.findMany({ where: { householdId } })
		.then((shelfTypes) => {
			res.status(200).json({
				shelfTypes: shelfTypes.map((st) => ({
					_id: st.id,
					name: st.name,
					householdId: st.householdId,
				})),
			});
		})
		.catch((err: any) => {
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

	prisma.shelfType
		.create({ data: { name, householdId } })
		.then((result) => {
			res.status(201).json({
				message: "Shelf type created!",
				shelfType: toMongoDoc(result),
			});
		})
		.catch((err: any) => {
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

	prisma.shelfType
		.findUnique({ where: { id: shelfTypeId } })
		.then((shelfType) => {
			if (!shelfType) {
				const error = new Error("Shelf type not found") as any;
				error.statusCode = 404;
				throw error;
			}
			return prisma.shelfType.update({
				where: { id: shelfTypeId },
				data: { name: newName },
			});
		})
		.then((updated) => {
			res.status(200).json({
				message: "Shelf type renamed successfully",
				shelfTypeId: updated.id,
			});
		})
		.catch((err: any) => {
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

	prisma.shelfType
		.findUnique({ where: { id: shelfTypeId } })
		.then((shelfType) => {
			if (!shelfType) {
				const error = new Error("Shelf type not found") as any;
				error.statusCode = 404;
				throw error;
			}
			return prisma.shelfType.delete({ where: { id: shelfTypeId } });
		})
		.then(() => {
			res.status(200).json({
				message: "Shelf type deleted successfully",
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};
