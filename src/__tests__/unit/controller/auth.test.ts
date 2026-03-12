import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { logout, refreshToken } from "../../../controller/auth";

const JWT_SECRET = "test-secret-key-for-vitest";

const makeMockRes = () => {
	const res: any = {};
	res.status = vi.fn().mockReturnValue(res);
	res.json = vi.fn().mockReturnValue(res);
	res.cookie = vi.fn().mockReturnValue(res);
	res.clearCookie = vi.fn().mockReturnValue(res);
	return res;
};

describe("logout", () => {
	it("clears auth and CSRF cookies and returns 200", () => {
		const req: any = {};
		const res = makeMockRes();

		logout(req, res);

		expect(res.clearCookie).toHaveBeenCalledWith(
			"auth_token",
			expect.any(Object),
		);
		expect(res.clearCookie).toHaveBeenCalledWith(
			"refresh_token",
			expect.any(Object),
		);
		expect(res.clearCookie).toHaveBeenCalledWith(
			"user_id",
			expect.any(Object),
		);
		expect(res.clearCookie).toHaveBeenCalledWith(
			"csrf_session",
			expect.any(Object),
		);
		expect(res.clearCookie).toHaveBeenCalledWith(
			"XSRF-TOKEN",
			expect.any(Object),
		);
		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith({
			message: "Logged out successfully.",
		});
	});
});

describe("refreshToken", () => {
	beforeEach(() => {
		process.env.JWT_SECRET = JWT_SECRET;
	});

	it("returns 401 when refresh_token cookie is missing", () => {
		const req: any = { cookies: {} };
		const res = makeMockRes();

		refreshToken(req, res);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
	});

	it("returns 401 when token type is not refresh", () => {
		const accessToken = jwt.sign(
			{ email: "a@a.com", userId: "123", type: "access" },
			JWT_SECRET,
		);
		const req: any = { cookies: { refresh_token: accessToken } };
		const res = makeMockRes();

		refreshToken(req, res);

		expect(res.status).toHaveBeenCalledWith(401);
	});

	it("returns 401 when token is invalid", () => {
		const req: any = { cookies: { refresh_token: "not-a-valid-jwt" } };
		const res = makeMockRes();

		refreshToken(req, res);

		expect(res.status).toHaveBeenCalledWith(401);
	});

	it("issues new tokens and returns 200 with a valid refresh token", () => {
		const validRefresh = jwt.sign(
			{ email: "a@a.com", userId: "abc123", type: "refresh" },
			JWT_SECRET,
			{ expiresIn: "7d" },
		);
		const req: any = { cookies: { refresh_token: validRefresh } };
		const res = makeMockRes();

		refreshToken(req, res);

		expect(res.cookie).toHaveBeenCalledWith(
			"auth_token",
			expect.any(String),
			expect.any(Object),
		);
		expect(res.cookie).toHaveBeenCalledWith(
			"refresh_token",
			expect.any(String),
			expect.any(Object),
		);
		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith({ message: "Token refreshed." });
	});
});
