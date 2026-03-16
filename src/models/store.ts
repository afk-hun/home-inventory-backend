import mongoose, { Types, Document } from "mongoose";

export interface IStoreInvoice {
	invoiceId: Types.ObjectId;
	storeName: string;
	purchaseDate: Date;
}

export interface IStore extends Document {
	_id: Types.ObjectId;
	householdId: Types.ObjectId;
	id: string;
	name: string;
	invoices: IStoreInvoice[];
}

const storeInvoiceSchema = new mongoose.Schema<IStoreInvoice>(
	{
		invoiceId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Invoice",
			required: true,
		},
		storeName: { type: String, required: true },
		purchaseDate: { type: Date, required: true },
	},
	{ _id: false },
);

const storeSchema = new mongoose.Schema<IStore>({
	householdId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Household",
		required: true,
	},
	id: { type: String, required: true },
	name: { type: String, required: true },
	invoices: { type: [storeInvoiceSchema], default: [] },
});

export default mongoose.model<IStore>("Store", storeSchema);
