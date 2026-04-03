/**
 * Converts a Prisma record (with `id`) to a MongoDB-compatible shape (with `_id`).
 * Works recursively on nested objects and arrays.
 */
export function toMongoDoc(obj: any): any {
	if (!obj || typeof obj !== "object") return obj;
	if (obj instanceof Date) return obj;
	if (Array.isArray(obj)) return obj.map(toMongoDoc);

	const { id, ...rest } = obj;
	const result: any = id !== undefined ? { _id: id } : {};
	for (const [key, value] of Object.entries(rest)) {
		result[key] = toMongoDoc(value);
	}
	return result;
}
