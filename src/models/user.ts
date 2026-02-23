import mongoose, { Types, Document } from "mongoose";

export interface IUser extends Document {
	_id: Types.ObjectId;
	name: string;
	email: string;
	password: string;
}
const Schema = mongoose.Schema;

const userSchema = new Schema<IUser>({
	name: {
		type: String,
		required: true,
	},
	email: {
		type: String,
		required: true,
		unique: true,
	},
	password: {
		type: String,
		required: true,
	},
});

export default mongoose.model<IUser>("User", userSchema);
