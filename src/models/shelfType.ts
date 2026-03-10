import mongoose, { Types, Document } from "mongoose";

export interface IShelfType extends Document {
	_id: Types.ObjectId;
	name: string;
	householdId: Types.ObjectId;
}

const shelfTypeSchema = new mongoose.Schema<IShelfType>({
	name: {
		type: String,
		required: true,
	},
	householdId: {
		type: Types.ObjectId,
		required: true,
	},
});

export default mongoose.model<IShelfType>("ShelfType", shelfTypeSchema);
