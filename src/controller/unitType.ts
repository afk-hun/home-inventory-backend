import { NextFunction, Request, Response } from "express";

import UnitType from "../models/unitType";

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

	UnitType.find({ householdId: householdId })
		.then((unitTypes) => {
			res.status(200).json({
				unitTypes: unitTypes.map((unitType) => ({
					_id: unitType._id,
					name: unitType.name,
					householdId: unitType.householdId,
				})),
			});
		})
		.catch((err) => {
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

	const unitType = new UnitType({
		name,
		householdId,
	});

	unitType
		.save()
		.then((result) => {
			res.status(201).json({
				message: "Unit type created!",
				unitType: result,
			});
		})
		.catch((err) => {
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

	UnitType.findById(unitTypeId)
		.then((unitType) => {
			if (!unitType) {
				const error = new Error("Unit type not found") as any;
				error.statusCode = 404;
				throw error;
			}
			unitType.name = newName;
			return unitType.save();
		})
		.then((updated) => {
			res.status(200).json({
				message: "Unit type renamed successfully",
				unitTypeId: updated._id,
			});
		})
		.catch((err) => {
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

	UnitType.findByIdAndDelete(unitTypeId)
		.then((result) => {
			if (!result) {
				const error = new Error("Unit type not found") as any;
				error.statusCode = 404;
				throw error;
			}
			res.status(200).json({
				message: "Unit type deleted successfully",
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};
