import mongoose, { Types, Document } from "mongoose";

export interface IShelfPlaceType extends Document {
	_id: Types.ObjectId;
	name: string;
	householdId: Types.ObjectId;
}
const Schema = mongoose.Schema;

const shelfPlaceTypeSchema = new Schema<IShelfPlaceType>({
	name: {
		type: String,
		required: true,
	},
	householdId: {
		type: Types.ObjectId,
		required: true,
	},
});

export default mongoose.model<IShelfPlaceType>("ShelfPlaceType", shelfPlaceTypeSchema);
