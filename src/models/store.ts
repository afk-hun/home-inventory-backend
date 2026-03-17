import mongoose, { Types, Document } from "mongoose";

export interface IStore extends Document {
	_id: Types.ObjectId;
	householdId: Types.ObjectId;
	name: string;
}

const storeSchema = new mongoose.Schema<IStore>({
	householdId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Household",
		required: true,
	},
	name: { type: String, required: true },
});

export default mongoose.model<IStore>("Store", storeSchema);
