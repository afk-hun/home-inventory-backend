import mongoose, { Types, Document } from "mongoose";

export interface IItemType extends Document {
	_id: Types.ObjectId;
	householdId: Types.ObjectId;
	name: string;
}

const itemTypeSchema = new mongoose.Schema<IItemType>({
	householdId: {
		type: Types.ObjectId,
		required: true,
	},
	name: {
		type: String,
		required: true,
	},
});

export default mongoose.model<IItemType>("ItemType", itemTypeSchema);
