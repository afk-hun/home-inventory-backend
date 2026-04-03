import { NextFunction, Request, Response } from "express";

import { prisma } from "../../lib/prisma";
import { toMongoDoc } from "../../lib/serialize";

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

	prisma.itemType
		.findMany({ where: { householdId } })
		.then((itemTypes) => {
			res.status(200).json({
				itemTypes: itemTypes.map((it) => ({
					_id: it.id,
					name: it.name,
					householdId: it.householdId,
				})),
			});
		})
		.catch((err: any) => {
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

	prisma.itemType
		.create({ data: { householdId, name } })
		.then((result) => {
			res.status(201).json({
				message: "Item type created!",
				itemType: toMongoDoc(result),
			});
		})
		.catch((err: any) => {
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

	prisma.itemType
		.findUnique({ where: { id: itemTypeId } })
		.then((itemType) => {
			if (!itemType) {
				const error = new Error("Item type not found") as any;
				error.statusCode = 404;
				throw error;
			}
			return prisma.itemType.update({
				where: { id: itemTypeId },
				data: { name },
			});
		})
		.then((updated) => {
			res.status(200).json({
				message: "Item type renamed successfully",
				itemTypeId: updated.id,
			});
		})
		.catch((err: any) => {
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

	prisma.itemType
		.findUnique({ where: { id: itemTypeId } })
		.then((itemType) => {
			if (!itemType) {
				const error = new Error("Item type not found") as any;
				error.statusCode = 404;
				throw error;
			}
			return prisma.itemType.delete({ where: { id: itemTypeId } });
		})
		.then(() => {
			res.status(200).json({
				message: "Item type deleted successfully",
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};
