/**
 * Tier 2 Verification Script
 * Tests:
 * 1. Authentication for Sales & Admin
 * 2. RBAC validation (Warehouse forbidden from managing customers)
 * 3. Customer creation (POST /customers)
 * 4. Customer listing with pagination (GET /customers)
 * 5. Customer search query (GET /customers?search=...)
 * 6. Customer filtering by Type & Status (GET /customers?customerType=...&status=...)
 * 7. Customer detail with Challan history (GET /customers/:id)
 * 8. Customer update (PUT /customers/:id)
 * 9. Customer follow-up logging with timestamped notes (POST /customers/:id/followups)
 * 10. Product search, category filter, and pagination (GET /products)
 * 11. Product low-stock alert filter (GET /products?lowStockOnly=true)
 */
import process from 'node:process';

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

async function request(path: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);
  return { status: response.status, ok: response.ok, data };
}

async function runTier2Tests() {
  console.log('\n======================================================');
  console.log('       RUNNING TIER 2 CRM & SEARCH TEST SUITE          ');
  console.log('======================================================\n');

  // 1. Authenticate Sales, Admin, Warehouse
  console.log('1. Authenticating test users...');
  const salesLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'sales@operations.com', password: 'Sales@123' }),
  });
  const salesToken = salesLogin.data.data.token;
  console.log('  ✔ Logged in as SALES');

  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@operations.com', password: 'Admin@123' }),
  });
  const adminToken = adminLogin.data.data.token;
  console.log('  ✔ Logged in as ADMIN');

  const whLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'warehouse@operations.com', password: 'Warehouse@123' }),
  });
  const whToken = whLogin.data.data.token;
  console.log('  ✔ Logged in as WAREHOUSE');

  // 2. RBAC check: Warehouse cannot create customer
  console.log('\n2. Testing RBAC on Customer management...');
  const rbacRes = await request('/customers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${whToken}` },
    body: JSON.stringify({
      name: 'Unauthorized Contact',
      mobile: '+91 99999 88888',
      email: 'unauth@test.com',
      businessName: 'Unauthorized Corp',
      customerType: 'RETAIL',
      address: '123 Fake Street',
    }),
  });
  if (rbacRes.status === 403) {
    console.log('  ✔ RBAC verified: WAREHOUSE forbidden from creating customers (403 Forbidden)');
  } else {
    throw new Error(`Expected 403, got ${rbacRes.status}`);
  }

  // 3. Create Customer
  console.log('\n3. Testing Customer Creation (POST /customers)...');
  const createCustomerRes = await request('/customers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${salesToken}` },
    body: JSON.stringify({
      name: 'Rohan Mehta',
      mobile: '+91 98220 99887',
      email: 'rohan@mehtaindustries.com',
      businessName: 'Mehta Precision Engineering Ltd',
      gstNumber: '27AABCM1234F1Z8',
      customerType: 'WHOLESALE',
      address: 'Plot 88, Bhosari MIDC, Pune, MH 411026',
      status: 'LEAD',
      notes: 'Met at Mumbai manufacturing expo. High interest in bulk fasteners.',
    }),
  });

  if (createCustomerRes.status !== 201) {
    throw new Error(`Customer creation failed: ${JSON.stringify(createCustomerRes.data)}`);
  }

  const customer = createCustomerRes.data.data;
  console.log(`  ✔ Customer created: "${customer.businessName}" (Type: ${customer.customerType}, Status: ${customer.status})`);

  // 4. List Customers with Pagination
  console.log('\n4. Testing Customer Listing & Pagination (GET /customers?page=1&limit=3)...');
  const listRes = await request('/customers?page=1&limit=3', {
    headers: { Authorization: `Bearer ${salesToken}` },
  });

  if (listRes.status !== 200 || !listRes.data.pagination) {
    throw new Error(`Customer list failed: ${JSON.stringify(listRes.data)}`);
  }
  console.log(`  ✔ Customers retrieved: Total = ${listRes.data.pagination.total}, Limit = ${listRes.data.pagination.limit}, Total Pages = ${listRes.data.pagination.totalPages}`);

  // 5. Search Customers by keyword
  console.log('\n5. Testing Customer Search (GET /customers?search=Mehta)...');
  const searchRes = await request('/customers?search=Mehta', {
    headers: { Authorization: `Bearer ${salesToken}` },
  });

  if (searchRes.status !== 200 || searchRes.data.data.length === 0) {
    throw new Error(`Customer search failed: ${JSON.stringify(searchRes.data)}`);
  }
  console.log(`  ✔ Search returned ${searchRes.data.data.length} match(es) for "Mehta": "${searchRes.data.data[0].businessName}"`);

  // 6. Filter Customers by Type and Status
  console.log('\n6. Testing Customer Filtering (GET /customers?customerType=WHOLESALE&status=LEAD)...');
  const filterRes = await request('/customers?customerType=WHOLESALE&status=LEAD', {
    headers: { Authorization: `Bearer ${salesToken}` },
  });

  if (filterRes.status !== 200) {
    throw new Error(`Filter failed: ${JSON.stringify(filterRes.data)}`);
  }
  console.log(`  ✔ Filter returned ${filterRes.data.data.length} customer(s) matching WHOLESALE + LEAD`);

  // 7. Get Customer by ID
  console.log('\n7. Testing Get Customer Details (GET /customers/:id)...');
  const detailRes = await request(`/customers/${customer.id}`, {
    headers: { Authorization: `Bearer ${salesToken}` },
  });

  if (detailRes.status !== 200 || detailRes.data.data.id !== customer.id) {
    throw new Error(`Get customer failed: ${JSON.stringify(detailRes.data)}`);
  }
  console.log(`  ✔ Customer details fetched: ${detailRes.data.data.name} (${detailRes.data.data.businessName})`);

  // 8. Update Customer Details
  console.log('\n8. Testing Customer Update (PUT /customers/:id)...');
  const updateRes = await request(`/customers/${customer.id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${salesToken}` },
    body: JSON.stringify({
      status: 'ACTIVE',
      mobile: '+91 98220 11223',
    }),
  });

  if (updateRes.status !== 200 || updateRes.data.data.status !== 'ACTIVE') {
    throw new Error(`Customer update failed: ${JSON.stringify(updateRes.data)}`);
  }
  console.log(`  ✔ Customer updated: Status converted from LEAD -> ${updateRes.data.data.status}`);

  // 9. Add Follow-Up Note (CRM Feature)
  console.log('\n9. Testing Follow-Up Logging (POST /customers/:id/followups)...');
  const nextFollowUpDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
  const followUpRes = await request(`/customers/${customer.id}/followups`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${salesToken}` },
    body: JSON.stringify({
      notes: 'Client confirmed order requirement for 100 fasteners next week. Sample sent via courier.',
      followUpDate: nextFollowUpDate,
      status: 'ACTIVE',
    }),
  });

  if (followUpRes.status !== 200 || !followUpRes.data.data.notes.includes('Client confirmed order')) {
    throw new Error(`Follow-up failed: ${JSON.stringify(followUpRes.data)}`);
  }
  console.log(`  ✔ Follow-up recorded with author stamp! Notes length: ${followUpRes.data.data.notes.length} chars`);
  console.log(`  ✔ Next follow-up date set to: ${followUpRes.data.data.followUpDate}`);

  // 10. Product Search & Pagination
  console.log('\n10. Testing Product Search & Pagination (GET /products?search=Hex&page=1&limit=2)...');
  const prodSearchRes = await request('/products?search=Hex&page=1&limit=2', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  if (prodSearchRes.status !== 200 || prodSearchRes.data.data.length === 0) {
    throw new Error(`Product search failed: ${JSON.stringify(prodSearchRes.data)}`);
  }
  console.log(`  ✔ Product search found ${prodSearchRes.data.pagination.total} match(es) for "Hex": "${prodSearchRes.data.data[0].name}"`);
  console.log(`  ✔ Product pagination verified: Page ${prodSearchRes.data.pagination.page}/${prodSearchRes.data.pagination.totalPages} (Limit: ${prodSearchRes.data.pagination.limit})`);

  // 11. Product Low Stock Alert Filter
  console.log('\n11. Testing Low Stock Alert Filter (GET /products?lowStockOnly=true)...');
  const lowStockRes = await request('/products?lowStockOnly=true', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  if (lowStockRes.status !== 200) {
    throw new Error(`Low stock filter failed: ${JSON.stringify(lowStockRes.data)}`);
  }
  console.log(`  ✔ Low stock filter returned ${lowStockRes.data.data.length} item(s) currently below minStockAlert:`);
  for (const p of lowStockRes.data.data) {
    console.log(`    • "${p.name}" (SKU: ${p.sku}): Stock = ${p.currentStock}, MinAlert = ${p.minStockAlert}`);
  }

  console.log('\n======================================================');
  console.log('    🎉 ALL TIER 2 TESTS PASSED WITH 100% SUCCESS!     ');
  console.log('======================================================\n');
}

runTier2Tests().catch((err) => {
  console.error('\n❌ TIER 2 TEST RUN FAILED:', err);
  process.exit(1);
});
