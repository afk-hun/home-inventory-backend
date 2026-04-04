import { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "../lib/db";
import { invoices, invoiceElements } from "../db/schema";
import { toMongoDoc } from "../lib/serialize";

function mapInvoiceElements(items: any[]) {
	return items.map((item) => ({
		_id: item.id,
		inStoreId: item.inStoreId,
		inStoreName: item.inStoreName,
		inStorePrice: item.inStorePrice,
		inStoreUnitPrice: item.inStoreUnitPrice,
		inStoreQuantity: item.inStoreQuantity,
		inStoreUnit: item.inStoreUnit,
		inStoreTaxType: item.inStoreTaxType,
	}));
}

function invoiceWithItems(id: string) {
	return db.query.invoices.findFirst({
		where: (t, { eq }) => eq(t.id, id),
		with: { invoiceItems: true },
	}).sync();
}

export const getInvoices = (req: Request, res: Response, next: NextFunction) => {
	const householdId = req.householdId;
	const { storeId } = req.query;

	if (!householdId) {
		const error = new Error("Household not found") as any;
		error.statusCode = 404;
		return next(error);
	}

	try {
		const result = storeId && typeof storeId === "string"
			? db.query.invoices.findMany({
				where: (t, { and, eq }) => and(eq(t.householdId, householdId), eq(t.storeId, storeId)),
				with: { invoiceItems: true },
			}).sync()
			: db.query.invoices.findMany({
				where: (t, { eq }) => eq(t.householdId, householdId),
				with: { invoiceItems: true },
			}).sync();
		res.status(200).json({
			invoices: result.map((inv) => ({
				...toMongoDoc(inv),
				invoiceItems: mapInvoiceElements(inv.invoiceItems),
			})),
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const createInvoice = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const user = req.user;
	const householdId = req.householdId;
	const { storeId, storeName, storeAddress, purchaseDate, invoiceItems: itemsBody } = req.body;

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

	if (!storeId || !storeName || !storeAddress || !purchaseDate) {
		const error = new Error(
			"Store ID, store name, store address, and purchase date are required",
		) as any;
		error.statusCode = 400;
		return next(error);
	}

	const itemsList: any[] = itemsBody || [];

	try {
		const id = createId();
		db.insert(invoices).values({
			id,
			householdId,
			storeId,
			storeName,
			storeAddress,
			purchaseDate: new Date(purchaseDate),
		}).run();
		if (itemsList.length > 0) {
			db.insert(invoiceElements).values(
				itemsList.map((item: any) => ({
					id: createId(),
					invoiceId: id,
					inStoreId: item.inStoreId,
					inStoreName: item.inStoreName,
					inStorePrice: item.inStorePrice,
					inStoreUnitPrice: item.inStoreUnitPrice,
					inStoreQuantity: item.inStoreQuantity,
					inStoreUnit: item.inStoreUnit,
					inStoreTaxType: item.inStoreTaxType,
				})),
			).run();
		}
		const result = invoiceWithItems(id)!;
		res.status(201).json({
			message: "Invoice created!",
			invoice: {
				...toMongoDoc(result),
				invoiceItems: mapInvoiceElements(result.invoiceItems),
			},
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const updateInvoice = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const { invoiceId, storeId, storeName, storeAddress, purchaseDate, invoiceItems: itemsBody } = req.body;

	if (!invoiceId) {
		const error = new Error("Invoice ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	try {
		const invoice = db.query.invoices.findFirst({ where: (t, { eq }) => eq(t.id, invoiceId) }).sync();
		if (!invoice) {
			const error = new Error("Invoice not found") as any;
			error.statusCode = 404;
			return next(error);
		}

		const updateData: any = {};
		if (storeId !== undefined) updateData.storeId = storeId;
		if (storeName !== undefined) updateData.storeName = storeName;
		if (storeAddress !== undefined) updateData.storeAddress = storeAddress;
		if (purchaseDate !== undefined) updateData.purchaseDate = new Date(purchaseDate);

		if (itemsBody !== undefined) {
			db.transaction((tx) => {
				tx.delete(invoiceElements).where(eq(invoiceElements.invoiceId, invoiceId)).run();
				if (Object.keys(updateData).length > 0) {
					tx.update(invoices).set(updateData).where(eq(invoices.id, invoiceId)).run();
				}
				if ((itemsBody as any[]).length > 0) {
					tx.insert(invoiceElements).values(
						(itemsBody as any[]).map((item: any) => ({
							id: createId(),
							invoiceId,
							inStoreId: item.inStoreId,
							inStoreName: item.inStoreName,
							inStorePrice: item.inStorePrice,
							inStoreUnitPrice: item.inStoreUnitPrice,
							inStoreQuantity: item.inStoreQuantity,
							inStoreUnit: item.inStoreUnit,
							inStoreTaxType: item.inStoreTaxType,
						})),
					).run();
				}
			});
		} else if (Object.keys(updateData).length > 0) {
			db.update(invoices).set(updateData).where(eq(invoices.id, invoiceId)).run();
		}

		const updated = invoiceWithItems(invoiceId)!;
		res.status(200).json({
			message: "Invoice updated successfully",
			invoice: {
				...toMongoDoc(updated),
				invoiceItems: mapInvoiceElements(updated.invoiceItems),
			},
		});
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};

export const deleteInvoice = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const invoiceId = req.body.invoiceId;

	if (!invoiceId) {
		const error = new Error("Invoice ID is required") as any;
		error.statusCode = 400;
		return next(error);
	}

	try {
		const invoice = db.query.invoices.findFirst({ where: (t, { eq }) => eq(t.id, invoiceId) }).sync();
		if (!invoice) {
			const error = new Error("Invoice not found") as any;
			error.statusCode = 404;
			return next(error);
		}
		db.delete(invoices).where(eq(invoices.id, invoiceId)).run();
		res.status(200).json({ message: "Invoice deleted successfully" });
	} catch (err: any) {
		if (!err.statusCode) err.statusCode = 500;
		next(err);
	}
};
