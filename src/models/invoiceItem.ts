import mongoose, { Types, Document } from "mongoose";

export interface IInvoiceItem extends Document {
	_id: Types.ObjectId;
	invoiceId: Types.ObjectId;
	store: {
		id: string;
		name: string;
	};
	inStoreId: string;
	inStoreName: string;
	inStorePrice: number;
	inStoreUnitPrice: number;
	inStoreQuantity: string;
	inStoreUnit: string;
	inStoreTaxType: string;
}

const invoiceItemSchema = new mongoose.Schema<IInvoiceItem>({
	invoiceId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Invoice",
		required: true,
	},
	store: {
		id: { type: String, required: true },
		name: { type: String, required: true },
	},
	inStoreId: { type: String, required: true },
	inStoreName: { type: String, required: true },
	inStorePrice: { type: Number, required: true },
	inStoreUnitPrice: { type: Number, required: true },
	inStoreQuantity: { type: String, required: true },
	inStoreUnit: { type: String, required: true },
	inStoreTaxType: { type: String, required: true },
});

export default mongoose.model<IInvoiceItem>("InvoiceItem", invoiceItemSchema);
