import { NextFunction, Request, Response } from "express";

import { prisma } from "../lib/prisma";
import { toMongoDoc } from "../lib/serialize";

export const getUnitTypes = (
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

	prisma.unitType
		.findMany({ where: { householdId } })
		.then((unitTypes) => {
			res.status(200).json({
				unitTypes: unitTypes.map((ut) => ({
					_id: ut.id,
					name: ut.name,
					householdId: ut.householdId,
				})),
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const createUnitType = (
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

	prisma.unitType
		.create({ data: { name, householdId } })
		.then((result) => {
			res.status(201).json({
				message: "Unit type created!",
				unitType: toMongoDoc(result),
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const renameUnitType = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const unitTypeId = req.body.unitTypeId;
	const newName = req.body.name;

	if (!householdId || !unitTypeId || !newName) {
		const error = new Error(
			"Household ID, unit type ID, and new name are required",
		) as any;
		error.statusCode = 400;
		return next(error);
	}

	prisma.unitType
		.findUnique({ where: { id: unitTypeId } })
		.then((unitType) => {
			if (!unitType) {
				const error = new Error("Unit type not found") as any;
				error.statusCode = 404;
				throw error;
			}
			return prisma.unitType.update({
				where: { id: unitTypeId },
				data: { name: newName },
			});
		})
		.then((updated) => {
			res.status(200).json({
				message: "Unit type renamed successfully",
				unitTypeId: updated.id,
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const deleteUnitType = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const unitTypeId = req.body.unitTypeId;

	if (!unitTypeId) {
		const error = new Error("Unit type ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	prisma.unitType
		.findUnique({ where: { id: unitTypeId } })
		.then((unitType) => {
			if (!unitType) {
				const error = new Error("Unit type not found") as any;
				error.statusCode = 404;
				throw error;
			}
			return prisma.unitType.delete({ where: { id: unitTypeId } });
		})
		.then(() => {
			res.status(200).json({
				message: "Unit type deleted successfully",
			});
		})
		.catch((err: any) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};
