import { NextFunction, Request, Response } from "express";

import Household from "../models/household";

export const createHousehold = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const name = req.body.name;
	const owner = req.body.owner;

	const household = new Household({
		name,
		owner,
		users: [owner],
	});

	household
		.save()
		.then((result) => {
			res.status(201).json({
				message: "Household created!",
				householdId: result._id,
			});
		})
		.catch((err) => {
			if (!err.statusCode) {
				err.statusCode = 500;
			}
			next(err);
		});
};

export const renameHousehold = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.body.householdId;
	const newName = req.body.name;

	console.log(`Renaming household ${householdId} to ${newName}`);

	Household.findById(householdId)
		.then((household) => {
			if (!household) {
				const error = new Error("Household not found") as any;
				error.statusCode = 404;
				throw error;
			}
			household.name = newName;
			return household.save();
		})
		.then((updatedHousehold) => {
			res.status(200).json({
				message: "Household renamed successfully",
				householdId: updatedHousehold._id,
			});
		})
		.catch((err) => {
			if (!err.statusCode) {
				err.statusCode = 500;
			}
			next(err);
		});
};

export const deleteHousehold = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.body.householdId;

	Household.findByIdAndDelete(householdId)
		.then((result) => {
			if (!result) {
				const error = new Error("Household not found") as any;
				error.statusCode = 404;
				throw error;
			}
			res.status(200).json({
				message: "Household deleted successfully",
			});
		})
		.catch((err) => {
			if (!err.statusCode) {
				err.statusCode = 500;
			}
			next(err);
		});	
	};