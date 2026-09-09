# Mini ERP + CRM Operations Portal

> A production-grade, scoped full-stack Operations Portal designed for wholesale and distribution enterprises. Built with **Node.js, Express, TypeScript, Prisma ORM, PostgreSQL (Neon)**, and **React + TypeScript (Vite)** with a custom high-density admin design system.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_Cloud-blue.svg)](https://neon.tech/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-teal.svg)](https://www.prisma.io/)
[![React](https://img.shields.io/badge/React-19-cyan.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.x-purple.svg)](https://vitejs.dev/)

---

## Table of Contents

- [Overview & Architecture](#overview--architecture)
- [Key Business Invariants & Guarantees](#key-business-invariants--guarantees)
- [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
- [Demo Credentials](#demo-credentials)
- [Project Structure](#project-structure)
- [Local Development Setup](#local-development-setup)
- [Environment Variables](#environment-variables)
- [Automated Verification & Test Suites](#automated-verification--test-suites)
- [REST API Reference](#rest-api-reference)
- [Postman Collection](#postman-collection)
- [Production Deployment Guide](#production-deployment-guide)
- [Assumptions & Trade-offs](#assumptions--trade-offs)

---

## Overview & Architecture

Wholesale and distribution companies require ironclad inventory accounting, auditable stock movements, immutable transaction snapshots, and lightweight CRM capabilities for sales and customer support. 

This repository implements a modular, 3-tier architecture:

```
┌────────────────────────────────────────────────────────┐
│               Frontend (React 19 + Vite)               │
│   Auth Context · Table-Driven UI · Modals · Badges     │
└───────────────────────────┬────────────────────────────┘
                            │ REST JSON (JWT Bearer)
┌───────────────────────────▼────────────────────────────┐
│         Backend Controller & Routing Layer (Express)   │
│   Zod Schema Validation · JWT RBAC Middleware Guards   │
├────────────────────────────────────────────────────────┤
│                    Service Layer                       │
│  Business Rules · Stock Transactions · Challan Engine  │
├────────────────────────────────────────────────────────┤
│                 Prisma ORM & PostgreSQL                │
│  Row-Level Locking (FOR UPDATE) · Audit Trail Logs     │
└────────────────────────────────────────────────────────┘
```

### Architectural Decisions

1. **Strict Controller-Service Separation**: Express controllers handle HTTP parsing, status mapping, and response serialization. All domain logic, database operations, and transactional validations live strictly within isolated service modules (`products.service.ts`, `challans.service.ts`, `customers.service.ts`).
2. **Snapshotting vs. Dynamic Foreign Keys**: Line items on delivery challans (`ChallanItem`) store frozen snapshots (`productNameSnapshot`, `unitPriceSnapshot`). Historical delivery challans remain permanently accurate even if products are renamed, re-categorized, or re-priced later.
3. **No Direct Inventory Overwrites**: Inventory levels cannot be directly updated via standard product PUT endpoints. All stock adjustments must pass through the audited `POST /api/products/:id/stock` endpoint with reason codes and signed delta quantities.
4. **Clean Pure CSS Admin Design System**: No heavy monolithic UI frameworks (like Material UI or Ant Design) or utility bloat (Tailwind). Built using a high-density, CSS custom-property design system with intuitive micro-interactions, responsive side-drawers, and red alert badges for low stock thresholds.

---

## Key Business Invariants & Guarantees

### 1. Zero-Stock-Leakage & Concurrency Protection
To prevent race conditions during high-volume wholesale operations (such as two warehouse dispatchers confirming orders simultaneously):
- **Row-Level Locking**: When confirming a challan, target products are locked using PostgreSQL's `SELECT id, "currentStock" FROM "Product" WHERE id IN (...) FOR UPDATE` within a Prisma interactive transaction (`prisma.$transaction`).
- **Deficit Pre-Validation**: Stock quantities are checked across all items before applying any changes. If any item is short, the transaction immediately rolls back with an itemized deficit error (`400 Bad Request`) without deducting stock from preceding items.
- **Conditional Atomic Decrement**: Decrements enforce `WHERE currentStock >= quantity` at the database level.
- **Single-Confirmation**: Challan status is checked inside the transaction. Attempting to re-confirm an already `CONFIRMED` or `CANCELLED` challan is rejected with a `400 Bad Request`.

### 2. Full Audit Trail & Reversibility
- Every inventory modification records a permanent row in `StockLog` capturing `changeType` (`IN` | `OUT`), `quantity`, `balanceAfter`, `reason`, `referenceId`, and the authenticated `userId`.
- Confirming a challan logs an `OUT` movement with the challan ID as the reference.
- Cancelling a confirmed challan initiates an atomic transaction that marks the challan `CANCELLED`, replenishes the warehouse inventory, and appends `IN` reversal logs.

---

## Role-Based Access Control (RBAC)

| Role | Products & Stock Viewing | Stock Adjustment (IN/OUT) | Create/Edit Draft Challan | Confirm/Cancel Challan | Customer CRM & Follow-ups |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **`ADMIN`** | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| **`WAREHOUSE`** | ✅ Full | ✅ Full | ❌ Read Only | ✅ Confirm / Cancel | ❌ Forbidden |
| **`SALES`** | ✅ Full | ❌ Forbidden | ✅ Create / Edit | ❌ Forbidden | ✅ Full |
| **`ACCOUNTS`** | ✅ Full | ❌ Forbidden | ❌ Read Only | ❌ Read Only | ❌ Read Only |

---

## Demo Credentials

All demo accounts are pre-seeded in the database:

| Email | Password | Role | Description |
| :--- | :--- | :---: | :--- |
| `admin@operations.com` | `Role@123` | `ADMIN` | Unrestricted superuser access across all modules |
| `sales@operations.com` | `Role@123` | `SALES` | Can manage CRM leads/customers and draft new challans |
| `warehouse@operations.com` | `Role@123` | `WAREHOUSE` | Manages stock movements and confirms delivery shipments |
| `accounts@operations.com` | `Role@123` | `ACCOUNTS` | Read-only auditor for challan records and stock ledger |

> **Quick Switcher**: The frontend login page includes 1-click role demo buttons that prefill credentials instantly.

---

## Project Structure

```text
Company_Assignment_ERM/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma         # Database models, relations & enums
│   │   └── seed.ts               # Idempotent database seeder
│   ├── src/
│   │   ├── config/               # Database client & environment configuration
│   │   ├── middlewares/          # JWT auth guard, RBAC check, error handlers
│   │   ├── modules/
│   │   │   ├── auth/             # Login, register, me endpoints & service
│   │   │   ├── products/         # Catalog, stock adjustments & audit logs
│   │   │   ├── challans/         # Challan engine, snapshotting & stock deduction
│   │   │   └── customers/        # Customer CRM, notes & follow-up tracking
│   │   └── index.ts              # Express application bootstrap
│   ├── scripts/
│   │   ├── test-tier1.ts         # Automated test suite for Tier 1 features
│   │   └── test-tier2.ts         # Automated test suite for Tier 2 features
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/client.ts         # Centralized API fetch wrapper with token handling
│   │   ├── components/           # Navbar, Badges, Modals, Pagination, Toast
│   │   ├── context/              # Authentication state provider
│   │   ├── pages/
│   │   │   ├── Login.tsx         # Login view with 1-click role selector
│   │   │   ├── Products/         # Inventory table, search, stock adjustment modal
│   │   │   ├── Challans/         # Challans list, item snapshot viewer, create modal
│   │   │   └── Customers/        # CRM view, search, contact card, follow-up modal
│   │   ├── index.css             # High-density admin design system (Vanilla CSS)
│   │   └── App.tsx               # Main routing & layout shell
│   └── package.json
├── postman/
│   └── ERM_Operations_Portal.postman_collection.json # Complete API collection
├── .env.example                  # Root environment template
└── README.md                     # Comprehensive documentation
```

---

## Local Development Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **PostgreSQL Database**: A hosted PostgreSQL instance (recommended: [Neon.tech](https://neon.tech/)) or a local PostgreSQL server.

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/Kisan062/Mini-ERP-CRM-Operations-Portal.git
cd Mini-ERP-CRM-Operations-Portal
```

---

### Step 2: Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file inside `backend/` (or copy from `.env.example`):
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://user:password@host/neondb?sslmode=require"
JWT_SECRET="super-secure-jwt-secret-key"
JWT_EXPIRES_IN="7d"
CLIENT_URL="http://localhost:5173"
```

Push database migrations and seed initial data:
```bash
# Push schema to database
npx prisma db push

# Seed users, initial inventory, and customers
npm run prisma:seed
```

Start the backend development server:
```bash
npm run dev
# Running at http://localhost:5000 (Health check: http://localhost:5000/health)
```

---

### Step 3: Frontend Setup
Open a new terminal window:
```bash
cd frontend
npm install
```

Create a `.env` file inside `frontend/`:
```env
VITE_API_BASE_URL="http://localhost:5000/api"
```

Start the frontend development server:
```bash
npm run dev
# Running at http://localhost:5173
```

Visit **`http://localhost:5173`** in your browser and log in with any of the demo accounts.

---

## Environment Variables

| Variable | Location | Default / Example | Purpose |
| :--- | :--- | :--- | :--- |
| `PORT` | `backend/.env` | `5000` | Port for Express HTTP server |
| `NODE_ENV` | `backend/.env` | `development` | Environment mode (`development` / `production`) |
| `DATABASE_URL` | `backend/.env` | `postgresql://...` | PostgreSQL connection string |
| `JWT_SECRET` | `backend/.env` | `your-secret-key` | Secret key used to sign and verify JWT tokens |
| `JWT_EXPIRES_IN` | `backend/.env` | `7d` | Expiration window for access tokens |
| `CLIENT_URL` | `backend/.env` | `http://localhost:5173` | Allowed origin for CORS validation |
| `VITE_API_BASE_URL`| `frontend/.env`| `http://localhost:5000/api` | Backend base URL used by Vite frontend |

---

## Automated Verification & Test Suites

The codebase includes two automated test suites written in TypeScript to verify core business logic, edge cases, transactional rollbacks, and RBAC rules without requiring external mocking tools:

### Run Tier 1 Test Suite
```bash
cd backend
npm run test:tier1
```
**Scenarios Verified**:
1. Authentication & JWT issuance for all 4 roles.
2. Direct product current stock modification via standard PUT is strictly blocked (Returns `400`).
3. Challan creation captures immutable snapshots of product name and unit price.
4. Challan confirmation fails with `400 Bad Request` when warehouse stock is insufficient, leaving stock untouched (zero leakage).
5. Challan confirmation succeeds when stock is adequate, atomically decrementing inventory and generating `OUT` stock logs.
6. Re-confirming an already confirmed challan is rejected with `400`.
7. Cancelling a confirmed challan restores inventory and logs an `IN` reversal entry.
8. Non-admin users cannot perform unauthorized actions (e.g. Sales attempting stock adjustment returns `403 Forbidden`).

### Run Tier 2 Test Suite
```bash
cd backend
npm run test:tier2
```
**Scenarios Verified**:
1. Full Customer CRM CRUD lifecycle (Create, Read, Update).
2. Follow-up notes logging with user attribution and automatic customer status updates.
3. Multi-field search across company name, contact person, email, and phone.
4. Filter by customer status (`LEAD`, `ACTIVE`, `INACTIVE`) and customer type (`RETAIL`, `WHOLESALE`, `DISTRIBUTOR`).
5. Products global search and category filtering.
6. Low stock alert filtering (`currentStock <= minStockAlert`).

---

## REST API Reference

All requests expecting or returning payloads use `Content-Type: application/json`. Authenticated routes require an `Authorization: Bearer <token>` header.

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Create a new user (Restricted to `ADMIN`).
- `POST /api/auth/login` — Authenticate and receive a JWT access token.
- `GET /api/auth/me` — Retrieve the currently authenticated profile.

### Products & Inventory (`/api/products`)
- `GET /api/products` — List all products with optional filters:
  - `search`: Case-insensitive match on name or SKU.
  - `category`: Filter by category.
  - `lowStockOnly=true`: Return only items where `currentStock <= minStockAlert`.
- `POST /api/products` — Create a new product (Requires `ADMIN` or `WAREHOUSE`).
- `GET /api/products/:id` — Get product details.
- `PUT /api/products/:id` — Update product details. Direct changes to `currentStock` are blocked.
- `POST /api/products/:id/stock` — Adjust stock with audited reason (Requires `ADMIN` or `WAREHOUSE`).
- `GET /api/products/:id/logs` — View full immutable stock movement history for a product.

### Delivery Challans (`/api/challans`)
- `GET /api/challans` — List challans with search and status filter.
- `POST /api/challans` — Create a `DRAFT` challan with price and name snapshots (Requires `ADMIN` or `SALES`).
- `GET /api/challans/:id` — View challan details including frozen item snapshots.
- `PUT /api/challans/:id` — Edit an existing `DRAFT` challan.
- `PATCH /api/challans/:id/confirm` — Confirm challan, atomically decrementing warehouse stock (Requires `ADMIN` or `WAREHOUSE`).
- `PATCH /api/challans/:id/cancel` — Cancel challan, restoring inventory if confirmed (Requires `ADMIN` or `WAREHOUSE`).

### Customers / CRM (`/api/customers`)
- `GET /api/customers` — Paginated customer list with multi-field search and type/status filters.
- `POST /api/customers` — Create a customer record (Requires `ADMIN` or `SALES`).
- `GET /api/customers/:id` — View customer profile, notes timeline, and order history.
- `PUT /api/customers/:id` — Update customer details.
- `POST /api/customers/:id/followups` — Log interaction note and advance next follow-up date.

---

## Postman Collection

A complete Postman collection is included in the repository at:
```text
postman/ERM_Operations_Portal.postman_collection.json
```

### How to Use:
1. Open Postman and click **Import**.
2. Select `postman/ERM_Operations_Portal.postman_collection.json`.
3. Set the `baseUrl` collection variable to `http://localhost:5000/api` (or your deployed Render URL).
4. Run the **Login - Admin** request; the test script will automatically set the `authToken` collection variable for all subsequent requests.

---

## Production Deployment Guide

### Database: Neon PostgreSQL
1. Create a project on [Neon.tech](https://neon.tech).
2. Copy the pooled connection string (`postgresql://user:pass@host/neondb?sslmode=require`).

### Backend: Render.com
1. Create a new **Web Service** on Render and link your GitHub repository.
2. Configure settings:
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npm start`
3. Add Environment Variables:
   - `DATABASE_URL`: *(Your Neon Connection String)*
   - `JWT_SECRET`: *(A long, secure random string)*
   - `JWT_EXPIRES_IN`: `7d`
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `CLIENT_URL`: *(Your deployed frontend Vercel URL, e.g. `https://your-app.vercel.app`)*
4. Run database seed on Render (can be triggered once via Render Shell or build script):
   ```bash
   npx prisma db push && npm run prisma:seed
   ```

### Frontend: Vercel
1. Create a new project on [Vercel](https://vercel.com) and link your GitHub repository.
2. Configure settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add Environment Variable:
   - `VITE_API_BASE_URL`: `https://your-render-service.onrender.com/api`
4. Deploy.

---

## Assumptions & Trade-offs

1. **Authentication Storage**: Per the assignment specifications, JWT access tokens are stored in `localStorage` for ease of evaluation. In an enterprise financial deployment, httpOnly secure SameSite cookies with refresh-token rotation would be preferred.
2. **Challan Numbering**: Generated using the sequential pattern `CH-YYYY-XXXXX` calculated transactionally to avoid collision.
3. **Product Stock Invariance**: As a core rule of wholesale inventory control, direct stock overwrites are disabled. Stock can only be shifted via audited adjustment logs (`IN`/`OUT`) or through delivery challan confirmations/cancellations.
4. **Soft vs. Hard Deletes**: Core entities (Products, Customers, Challans) are retained permanently for auditable accounting history.

---

## License
MIT License. Built for technical evaluation.
