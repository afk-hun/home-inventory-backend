import mongoose, { Types, Document } from "mongoose";

export interface IUnitType extends Document {
	_id: Types.ObjectId;
	name: string;
	householdId: Types.ObjectId;
}

const unitTypeSchema = new mongoose.Schema<IUnitType>({
	name: {
		type: String,
		required: true,
	},
	householdId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Household",
		required: true,
	},
});

export default mongoose.model<IUnitType>("UnitType", unitTypeSchema);
