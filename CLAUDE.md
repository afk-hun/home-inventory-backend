# Backend Agent — Home Inventory API

You are the backend agent for this project. Your responsibilities:
1. **Understand** the existing codebase before touching it.
2. **Implement** new endpoints following established patterns exactly.
3. **Identify and surface** security vulnerabilities — always ask the developer before silently patching them, and explain the risk and suggested fix.

---

## Project Overview

Node.js + Express v5 REST API written in TypeScript, backed by MongoDB via Mongoose.
Authentication uses short-lived JWT access tokens (1 h) + long-lived refresh tokens (7 d), both stored as `httpOnly` cookies.
All state-mutating requests are also CSRF-protected.

---

## Directory Layout

```
src/
├── index.ts                     # App bootstrap: Express setup, CORS, error handler, DB connect
├── global.ts                    # Augments Express Request with `user` and `householdId`
├── constants/
│   └── csrf.ts                  # Cookie/header name constants
├── lib/
│   └── csrf.ts                  # createCsrfToken(), isCsrfTokenValid()
├── middleware/
│   ├── isAuth.ts                # JWT validation → populates req.user and req.householdId
│   ├── csrf.ts                  # validateCsrf middleware
│   └── rateLimiter.ts           # loginLimiter, signupLimiter (express-rate-limit)
├── models/
│   ├── user.ts                  # IUser, User model
│   ├── household.ts             # IHousehold, Household model
│   └── shelfPlaceType.ts        # IShelfPlaceType, ShelfPlaceType model
├── routes/
│   ├── auth.ts                  # /auth/* routes
│   ├── household.ts             # /household/* routes
│   └── shelf.ts                 # /shelf/* routes
└── controller/
    ├── csrf.ts                  # csrfToken controller
    ├── auth.ts                  # signup, login, refreshToken, logout
    ├── household.ts             # getHouseholds, setHousehold, createHousehold, renameHousehold, deleteHousehold
    └── shelf/
        └── placeType.ts         # getShelfPlaceTypes, createShelfPlaceType, renameShelfPlaceType, deleteShelfPlaceType
```

---

## Coding Patterns — Follow These Exactly

### 1. Controller shape

Controllers always receive `(req: Request, res: Response, next: NextFunction)`.
Prefer promise-chain style (`.then().catch()`) matching the existing controllers.
Async/await is acceptable for new files but be consistent within a file.

```ts
import { NextFunction, Request, Response } from "express";

export const doSomething = (req: Request, res: Response, next: NextFunction) => {
  const value = req.body.value;

  if (!value) {
    const error = new Error("value is required") as any;
    error.statusCode = 400;
    return next(error);
  }

  MyModel.findOne({ ... })
    .then((doc) => {
      if (!doc) {
        const error = new Error("Not found") as any;
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({ result: doc });
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};
```

**Never** throw unhandled errors or call `res.json` without setting a status code.

### 2. Error handling

- Attach `.statusCode` to errors before passing to `next(err)`.
- The global error handler in `index.ts` handles status codes and hides stack traces in production.
- 4xx errors may include a `.data` field (validation arrays, etc.).
- Do **not** create new error classes in controllers — use the `as any` cast pattern already in use.

### 3. Route file shape

```ts
import { Router } from "express";
import { isAuth } from "../middleware/isAuth";
import { validateCsrf } from "../middleware/csrf";
import { doSomething } from "../controller/myFeature";

const router = Router();

router.get("/items",   isAuth, validateCsrf, doSomething);
router.post("/items",  isAuth, validateCsrf, doSomething);
router.patch("/items", isAuth, validateCsrf, doSomething);
router.delete("/items",isAuth, validateCsrf, doSomething);

export default router;
```

Register the new router in `index.ts`:
```ts
import myFeatureRoutes from "./routes/myFeature";
app.use("/my-feature", myFeatureRoutes);
```

### 4. Middleware order on routes

For protected routes, middleware always goes in this order:
```
isAuth  →  validateCsrf  →  [express-validator body() array]  →  controller
```

For auth routes (before session exists):
```
rateLimiter  →  validateCsrf  →  [body() validators]  →  controller
```

### 5. Mongoose model shape

```ts
import mongoose, { Types, Document } from "mongoose";

export interface IMyModel extends Document {
  _id: Types.ObjectId;
  name: string;
  householdId: Types.ObjectId;
}

const myModelSchema = new mongoose.Schema<IMyModel>({
  name:        { type: String, required: true },
  householdId: { type: mongoose.Schema.Types.ObjectId, ref: "Household", required: true },
});

export default mongoose.model<IMyModel>("MyModel", myModelSchema);
```

### 6. Request augmentation

`req.user` (type `IUser` without password) and `req.householdId` (string | undefined) are populated by `isAuth`.
Use them directly — do not re-query the user inside controllers when `isAuth` already ran.

### 7. Cookies

Auth cookies are managed in `controller/auth.ts`. Use the exported helpers:
- `setHouseholdCookie(res, id)` — already exported.
- For new cookies: follow the same pattern (`httpOnly`, `secure` in production, `sameSite: "lax"`).

### 8. Input validation

Use `express-validator` `body()` chains in the route file, then call `validationResult(req)` at the top of the controller (see `auth.ts`).
Always `.trim()` string inputs and use `.normalizeEmail()` for emails.

---

## Security Rules — Always Check These

Before implementing or reviewing any endpoint, verify:

| # | Check | Why |
|---|-------|-----|
| 1 | `isAuth` is on every non-public route | Prevents unauthenticated access |
| 2 | `validateCsrf` is on every state-mutating route | Prevents CSRF |
| 3 | Ownership is verified before mutating a resource | Prevents IDOR (e.g., any user can rename *any* household by ID — **this is a known gap in the current code**) |
| 4 | Pagination / limits on list endpoints | Prevents unbounded data dumps |
| 5 | `body()` validators on every user-supplied field | Prevents injection and bad data |
| 6 | Sensitive fields stripped from responses | Passwords, tokens must never be returned |
| 7 | Rate limiting on costly or auth-sensitive routes | Prevents brute-force and abuse |
| 8 | No raw MongoDB operator injection (`$where`, `$gt` in body) | NoSQL injection |

### Known vulnerabilities to flag (do not silently fix — ask first)

- **IDOR on household and shelf mutations**: `renameHousehold`, `deleteHousehold`, `renameShelfPlaceType`, `deleteShelfPlaceType` look up a resource by ID from the request body but do **not** verify that the authenticated user owns it. Any authenticated user can modify another user's household.
- **`householdId` from `isAuth` vs. body**: Some controllers mix these sources. Prefer `req.householdId` (set by `isAuth`) over `req.body.householdId` for trust boundary reasons.
- **Login returns 404 when no household exists**: `login` in `controller/auth.ts` throws a 404 if the user has no household. A new user who hasn't created a household yet cannot log in. Confirm with developer whether this is intentional.

When you spot a new vulnerability:
1. Stop and describe it clearly to the developer.
2. Explain the attack scenario.
3. Propose a fix.
4. Wait for confirmation before modifying existing code.

---

## Adding a New Feature — Checklist

1. **Model**: Add `src/models/<feature>.ts` with interface + schema.
2. **Controller**: Add `src/controller/<feature>.ts` with one export per operation.
3. **Route**: Add `src/routes/<feature>.ts` following the middleware order above.
4. **Register**: Import and `app.use()` in `index.ts`.
5. **Security review**: Run through the security table above for every new endpoint.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Defaults to 3000 |
| `MONGODB_URI` | Yes | Full MongoDB connection string |
| `JWT_SECRET` | Yes | Secret for signing JWTs and CSRF tokens |
| `CORS_ORIGIN` | Yes | Comma-separated allowed origins |
| `NODE_ENV` | No | Set to `production` to enable secure cookies and suppress debug messages |
| `TRUST_PROXY` | No | Express trust proxy setting (`true`, `false`, or hop count) |

---

## Running Locally

```bash
# from repo root
docker compose up          # starts MongoDB + backend + frontend

# or standalone
cd home-inventory-backend
npm install
npm run dev                # ts-node-dev with hot reload
```
