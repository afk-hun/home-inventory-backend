import { NextFunction, Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../lib/db";
import { invoiceItems } from "../db/schema";
import { toMongoDoc } from "../lib/serialize";

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

	try {
		const storeId = req.query.storeId as string | undefined;
		const result = storeId
			? db.query.invoiceItems.findMany({
				where: (t, { and, eq }) => and(eq(t.householdId, householdId), eq(t.storeId, storeId)),
			}).sync()
			: db.query.invoiceItems.findMany({
				where: (t, { eq }) => eq(t.householdId, householdId),
			}).sync();
		res.status(200).json({
			invoiceItems: result.map((item) => ({
				...toMongoDoc(item),
				store: { id: item.storeId, name: item.storeName },
			})),
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const getInvoiceItem = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const id = req.params.id as string;

	if (!id) {
		const error = new Error("Invoice item ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	try {
		const item = db.query.invoiceItems.findFirst({ where: (t, { eq }) => eq(t.id, id) }).sync();
		if (!item) {
			const error = new Error("Invoice item not found") as any;
			error.statusCode = 404;
			return next(error);
		}
		res.status(200).json({
			invoiceItem: {
				...toMongoDoc(item),
				store: { id: item.storeId, name: item.storeName },
			},
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
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

	try {
		const id = createId();
		db.insert(invoiceItems).values({
			id,
			householdId,
			storeId: store.id,
			storeName: store.name,
			inStoreId,
			inStoreName,
			inStorePrice,
			inStoreUnitPrice,
			inStoreQuantity,
			inStoreUnit,
			inStoreTaxType,
		}).run();
		const result = db.query.invoiceItems.findFirst({ where: (t, { eq }) => eq(t.id, id) }).sync()!;
		res.status(201).json({
			message: "Invoice item created!",
			invoiceItem: {
				...toMongoDoc(result),
				store: { id: result.storeId, name: result.storeName },
			},
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
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

	try {
		const item = db.query.invoiceItems.findFirst({ where: (t, { eq }) => eq(t.id, invoiceItemId) }).sync();
		if (!item) {
			const error = new Error("Invoice item not found") as any;
			error.statusCode = 404;
			return next(error);
		}

		const updateData: any = {};
		if (store !== undefined) {
			updateData.storeId = store.id;
			updateData.storeName = store.name;
		}
		if (inStoreId !== undefined) updateData.inStoreId = inStoreId;
		if (inStoreName !== undefined) updateData.inStoreName = inStoreName;
		if (inStorePrice !== undefined) updateData.inStorePrice = inStorePrice;
		if (inStoreUnitPrice !== undefined) updateData.inStoreUnitPrice = inStoreUnitPrice;
		if (inStoreQuantity !== undefined) updateData.inStoreQuantity = inStoreQuantity;
		if (inStoreUnit !== undefined) updateData.inStoreUnit = inStoreUnit;
		if (inStoreTaxType !== undefined) updateData.inStoreTaxType = inStoreTaxType;

		db.update(invoiceItems).set(updateData).where(eq(invoiceItems.id, invoiceItemId)).run();
		const updated = db.query.invoiceItems.findFirst({ where: (t, { eq }) => eq(t.id, invoiceItemId) }).sync()!;
		res.status(200).json({
			message: "Invoice item updated successfully",
			invoiceItem: {
				...toMongoDoc(updated),
				store: { id: updated.storeId, name: updated.storeName },
			},
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
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

	try {
		const item = db.query.invoiceItems.findFirst({ where: (t, { eq }) => eq(t.id, invoiceItemId) }).sync();
		if (!item) {
			const error = new Error("Invoice item not found") as any;
			error.statusCode = 404;
			return next(error);
		}
		db.delete(invoiceItems).where(eq(invoiceItems.id, invoiceItemId)).run();
		res.status(200).json({ message: "Invoice item deleted successfully" });
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};
