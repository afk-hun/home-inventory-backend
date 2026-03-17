import mongoose, { Types, Document } from "mongoose";

export interface IConnectedStore {
	storeId: Types.ObjectId;
	storeName: string;
	storeItemId: string;
	storeItemName: string;
}

export interface IItem extends Document {
	_id: Types.ObjectId;
	householdId: Types.ObjectId;
	name: string;
	type: Types.ObjectId;
	connectedStores: IConnectedStore[];
}

const connectedStoreSchema = new mongoose.Schema<IConnectedStore>(
	{
		storeId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Store",
			required: true,
		},
		storeName: { type: String, required: true },
		storeItemId: { type: String, required: true },
		storeItemName: { type: String, required: true },
	},
	{ _id: false },
);

const itemSchema = new mongoose.Schema<IItem>({
	householdId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Household",
		required: true,
	},
	name: { type: String, required: true },
	type: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "ItemType",
	},
	connectedStores: { type: [connectedStoreSchema], default: [] },
});

export default mongoose.model<IItem>("Item", itemSchema);
