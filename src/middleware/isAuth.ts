import { NextFunction, Request, Response } from "express";

export const isAuth = (req: Request, res: Response, next: NextFunction) => {
	console.log(req.cookies);
	// if (!req.cookies) {
		
	// }
	next();
}