type UnitCategory = "mass" | "volume" | "count" | "other";

interface UnitDef {
	category: UnitCategory;
	/** Multiply user quantity by this to get base unit quantity. null for "other". */
	toBase: number | null;
	/** Base unit symbol for this category: "g", "ml", "pc", or null for "other". */
	baseUnit: string | null;
}

export const UNITS: Record<string, UnitDef> = {
	// Mass → base: g
	mg:  { category: "mass",   toBase: 0.001,    baseUnit: "g" },
	g:   { category: "mass",   toBase: 1,         baseUnit: "g" },
	dkg: { category: "mass",   toBase: 10,        baseUnit: "g" },
	kg:  { category: "mass",   toBase: 1000,      baseUnit: "g" },
	oz:  { category: "mass",   toBase: 28.3495,   baseUnit: "g" },
	lb:  { category: "mass",   toBase: 453.592,   baseUnit: "g" },

	// Volume → base: ml
	tsp:    { category: "volume", toBase: 4.929,    baseUnit: "ml" },
	tbsp:   { category: "volume", toBase: 14.787,   baseUnit: "ml" },
	fl_oz:  { category: "volume", toBase: 29.574,   baseUnit: "ml" },
	cup:    { category: "volume", toBase: 236.588,  baseUnit: "ml" },
	cl:     { category: "volume", toBase: 10,       baseUnit: "ml" },
	dl:     { category: "volume", toBase: 100,      baseUnit: "ml" },
	ml:     { category: "volume", toBase: 1,        baseUnit: "ml" },
	l:      { category: "volume", toBase: 1000,     baseUnit: "ml" },

	// Count → base: pc
	pc:     { category: "count", toBase: 1,   baseUnit: "pc" },
	dozen:  { category: "count", toBase: 12,  baseUnit: "pc" },

	// Other → no conversion
	bunch:    { category: "other", toBase: null, baseUnit: null },
	slice:    { category: "other", toBase: null, baseUnit: null },
	pinch:    { category: "other", toBase: null, baseUnit: null },
	bag:      { category: "other", toBase: null, baseUnit: null },
	handful:  { category: "other", toBase: null, baseUnit: null },
	pack:     { category: "other", toBase: null, baseUnit: null },
};

/**
 * Converts a quantity + unit to base unit form.
 * Returns { baseQuantity: null, baseUnit: null } for unknown or "other" units.
 */
export function toBase(
	quantity: number,
	unit: string,
): { baseQuantity: number | null; baseUnit: string | null } {
	const def = UNITS[unit];
	if (!def || def.toBase === null || def.baseUnit === null) {
		return { baseQuantity: null, baseUnit: null };
	}
	return {
		baseQuantity: quantity * def.toBase,
		baseUnit: def.baseUnit,
	};
}
