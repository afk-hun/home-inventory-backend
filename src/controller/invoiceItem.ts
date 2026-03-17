import { NextFunction, Request, Response } from "express";

import InvoiceItem from "../models/invoiceItem";

export const getInvoiceItems = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	const filter: Record<string, unknown> = { householdId };
	if (req.query.storeId) filter["store.id"] = req.query.storeId;

	InvoiceItem.find(filter)
		.then((items) => {
			res.status(200).json({ invoiceItems: items });
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const getInvoiceItem = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const { id } = req.params;

	if (!id) {
		const error = new Error("Invoice item ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	InvoiceItem.findById(id)
		.then((item) => {
			if (!item) {
				const error = new Error("Invoice item not found") as any;
				error.statusCode = 404;
				throw error;
			}
			res.status(200).json({ invoiceItem: item });
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const createInvoiceItem = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const householdId = req.householdId;
	const {
		store,
		inStoreId,
		inStoreName,
		inStorePrice,
		inStoreUnitPrice,
		inStoreQuantity,
		inStoreUnit,
		inStoreTaxType,
	} = req.body;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	if (
		!store ||
		!inStoreId ||
		!inStoreName ||
		inStorePrice === undefined ||
		inStoreUnitPrice === undefined ||
		!inStoreQuantity ||
		!inStoreUnit ||
		!inStoreTaxType
	) {
		const error = new Error("All fields are required") as any;
		error.statusCode = 400;
		return next(error);
	}

	const item = new InvoiceItem({
		householdId,
		store,
		inStoreId,
		inStoreName,
		inStorePrice,
		inStoreUnitPrice,
		inStoreQuantity,
		inStoreUnit,
		inStoreTaxType,
	});

	item
		.save()
		.then((result) => {
			res.status(201).json({
				message: "Invoice item created!",
				invoiceItem: result,
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const updateInvoiceItem = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const {
		invoiceItemId,
		store,
		inStoreId,
		inStoreName,
		inStorePrice,
		inStoreUnitPrice,
		inStoreQuantity,
		inStoreUnit,
		inStoreTaxType,
	} = req.body;

	if (!invoiceItemId) {
		const error = new Error("Invoice item ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	InvoiceItem.findById(invoiceItemId)
		.then((item) => {
			if (!item) {
				const error = new Error("Invoice item not found") as any;
				error.statusCode = 404;
				throw error;
			}

			if (store !== undefined) item.store = store;
			if (inStoreId !== undefined) item.inStoreId = inStoreId;
			if (inStoreName !== undefined) item.inStoreName = inStoreName;
			if (inStorePrice !== undefined) item.inStorePrice = inStorePrice;
			if (inStoreUnitPrice !== undefined) item.inStoreUnitPrice = inStoreUnitPrice;
			if (inStoreQuantity !== undefined) item.inStoreQuantity = inStoreQuantity;
			if (inStoreUnit !== undefined) item.inStoreUnit = inStoreUnit;
			if (inStoreTaxType !== undefined) item.inStoreTaxType = inStoreTaxType;

			return item.save();
		})
		.then((updated) => {
			res.status(200).json({
				message: "Invoice item updated successfully",
				invoiceItem: updated,
			});
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};

export const deleteInvoiceItem = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const { invoiceItemId } = req.body;

	if (!invoiceItemId) {
		const error = new Error("Invoice item ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	InvoiceItem.findByIdAndDelete(invoiceItemId)
		.then((result) => {
			if (!result) {
				const error = new Error("Invoice item not found") as any;
				error.statusCode = 404;
				throw error;
			}
			res.status(200).json({ message: "Invoice item deleted successfully" });
		})
		.catch((err) => {
			if (!err.statusCode) err.statusCode = 500;
			next(err);
		});
};
