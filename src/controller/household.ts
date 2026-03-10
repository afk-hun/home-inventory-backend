import { NextFunction, Request, Response } from "express";

import Household from "../models/household";
import { setHouseholdCookie } from "./auth";

export const setHousehold = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.body.householdId;

	if (!householdId) {
		const error = new Error("Household ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	setHouseholdCookie(res, householdId);
	res.status(200).json({
		message: "Household set successfully",
	});
};

export const getHouseholds = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const user = req.user;

	if (!user) {
		const error = new Error("User not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	Household.find({ "owner._id": user._id })
		.then((households) => {
			res.status(200).json({
				households: households.map((household) => ({
					_id: household._id,
					name: household.name,
					members: household.members,
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

export const createHousehold = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const name = req.body.name;
	const owner = req.user;

	if (!name || !owner) {
		const error = new Error("Name and owner are required") as any;
		error.statusCode = 400;
		return next(error);
	}

	const household = new Household({
		name,
		owner: owner,
		members: [owner],
	});

	household
		.save()
		.then((result) => {
			res.status(201).json({
				message: "Household created!",
				household: household,
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

	if (!householdId || !newName) {
		const error = new Error(
			"Household ID and new name are required",
		) as any;
		error.statusCode = 400;
		return next(error);
	}

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

	if (!householdId) {
		const error = new Error("Household ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

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
