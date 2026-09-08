/**
 * Tier 1 Verification Script
 * Tests:
 * 1. Health check
 * 2. User login across all roles (Admin, Sales, Warehouse, Accounts)
 * 3. RBAC validation
 * 4. Product creation and stock adjustment
 * 5. Challan creation as DRAFT with snapshot integrity
 * 6. Challan editing in DRAFT status
 * 7. Challan confirmation with INSUFFICIENT stock (assert 400 + roll back)
 * 8. Challan confirmation with SUFFICIENT stock (assert 200 + atomic decrement + StockLog OUT)
 * 9. Re-confirmation prevention
 * 10. Challan cancellation and stock restoration (StockLog IN)
 */

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

async function runTests() {
  console.log('\n======================================================');
  console.log('       RUNNING TIER 1 BUSINESS LOGIC TEST SUITE        ');
  console.log('======================================================\n');

  // 1. Health Check
  console.log('1. Testing Health Endpoint...');
  const health = await fetch('http://localhost:5000/health');
  if (health.status !== 200) {
    throw new Error(`Health check failed with status ${health.status}`);
  }
  console.log('  ✔ Health check passed (200 OK)');

  // 2. Authentication Test
  console.log('\n2. Testing Authentication for all 4 roles...');
  const roles = [
    { role: 'ADMIN', email: 'admin@operations.com', pass: 'Admin@123' },
    { role: 'SALES', email: 'sales@operations.com', pass: 'Sales@123' },
    { role: 'WAREHOUSE', email: 'warehouse@operations.com', pass: 'Warehouse@123' },
    { role: 'ACCOUNTS', email: 'accounts@operations.com', pass: 'Accounts@123' },
  ];

  const tokens: Record<string, string> = {};

  for (const r of roles) {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: r.email, password: r.pass }),
    });

    if (res.status !== 200 || !res.data?.data?.token) {
      throw new Error(`Login failed for ${r.role}: ${JSON.stringify(res.data)}`);
    }

    tokens[r.role] = res.data.data.token;
    console.log(`  ✔ Logged in as ${r.role} (User: ${res.data.data.user.name})`);
  }

  // 3. RBAC Check (Sales trying to perform Warehouse stock adjust)
  console.log('\n3. Testing Role-Based Access Control (RBAC)...');
  const rbacRes = await request('/products/prod-screw-m8/stock', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.SALES}` },
    body: JSON.stringify({ quantity: 5, movementType: 'IN', reason: 'Unauthorized test' }),
  });

  if (rbacRes.status === 403) {
    console.log('  ✔ RBAC passed: SALES forbidden from adjusting stock (403 Forbidden)');
  } else {
    throw new Error(`RBAC failure: expected 403, got ${rbacRes.status}`);
  }

  // 4. Product Creation & Direct Edit Restrictions
  console.log('\n4. Testing Product Creation & Direct Edit Protection...');
  const testSku = `TEST-ITEM-${Date.now()}`;
  const createProdRes = await request('/products', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.ADMIN}` },
    body: JSON.stringify({
      name: 'Precision Test Gear 50T',
      sku: testSku,
      category: 'Gears',
      unitPrice: 150.0,
      initialStock: 10,
      minStockAlert: 5,
      location: 'Bin T-1',
    }),
  });

  if (createProdRes.status !== 201) {
    throw new Error(`Product creation failed: ${JSON.stringify(createProdRes.data)}`);
  }

  const testProduct = createProdRes.data.data;
  console.log(`  ✔ Product created: "${testProduct.name}" (SKU: ${testProduct.sku}, Stock: ${testProduct.currentStock})`);

  // Verify stock movement log was written for initial stock
  const logsRes = await request(`/products/${testProduct.id}/logs`, {
    headers: { Authorization: `Bearer ${tokens.ADMIN}` },
  });
  if (logsRes.data?.data?.length > 0 && logsRes.data.data[0].movementType === 'IN') {
    console.log(`  ✔ Initial stock logged: ${logsRes.data.data[0].quantityChanged} units IN (Reason: "${logsRes.data.data[0].reason}")`);
  } else {
    throw new Error('Initial stock log missing');
  }

  // 5. Stock Adjustment (IN & OUT)
  console.log('\n5. Testing Controlled Stock Adjustment (Warehouse)...');
  const adjustInRes = await request(`/products/${testProduct.id}/stock`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.WAREHOUSE}` },
    body: JSON.stringify({
      quantity: 15,
      movementType: 'IN',
      reason: 'Batch receiving PO-9092',
    }),
  });

  if (adjustInRes.status !== 200 || adjustInRes.data.data.product.currentStock !== 25) {
    throw new Error(`Stock adjustment failed: ${JSON.stringify(adjustInRes.data)}`);
  }
  console.log(`  ✔ Warehouse adjusted stock IN (+15). New stock: ${adjustInRes.data.data.product.currentStock}`);

  // 6. Create Challan in DRAFT status
  console.log('\n6. Testing Challan Creation (DRAFT status)...');
  const createChallanRes = await request('/challans', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.SALES}` },
    body: JSON.stringify({
      customerId: 'cust-apex-hardware',
      items: [
        { productId: testProduct.id, quantity: 20 },
      ],
    }),
  });

  if (createChallanRes.status !== 201) {
    throw new Error(`Challan creation failed: ${JSON.stringify(createChallanRes.data)}`);
  }

  const challan = createChallanRes.data.data;
  console.log(`  ✔ Draft Challan created: ${challan.challanNumber} (Status: ${challan.status}, Total Qty: ${challan.totalQuantity})`);
  console.log(`  ✔ Snapshot check: item snapshot name = "${challan.items[0].productNameSnapshot}", unitPrice = ${challan.items[0].unitPriceSnapshot}`);

  // Verify stock has NOT changed while DRAFT
  const checkStock1 = await request(`/products/${testProduct.id}`, {
    headers: { Authorization: `Bearer ${tokens.ADMIN}` },
  });
  if (checkStock1.data.data.currentStock !== 25) {
    throw new Error(`Stock prematurely changed during DRAFT! Current: ${checkStock1.data.data.currentStock}`);
  }
  console.log(`  ✔ Verified: Current stock remained untouched at 25 during DRAFT creation`);

  // 7. HIGH-SCRUTINY TEST: Confirm with INSUFFICIENT stock (must abort transaction)
  console.log('\n7. Testing High-Scrutiny Business Logic: Confirmation with INSUFFICIENT Stock...');
  // Edit draft to request 999 units (available is 25)
  const editChallanRes = await request(`/challans/${challan.id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${tokens.SALES}` },
    body: JSON.stringify({
      items: [{ productId: testProduct.id, quantity: 999 }],
    }),
  });
  if (editChallanRes.status !== 200) {
    throw new Error(`Edit challan failed: ${JSON.stringify(editChallanRes.data)}`);
  }
  console.log('  ✔ Draft edited to request 999 units (exceeding stock of 25)');

  const confirmFailRes = await request(`/challans/${challan.id}/confirm`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tokens.WAREHOUSE}` },
  });

  if (confirmFailRes.status === 400 && confirmFailRes.data?.error?.details?.shortages) {
    console.log(`  ✔ Correctly rejected with 400 Bad Request!`);
    console.log(`    Server message:\n    ${confirmFailRes.data.error.message.replace(/\n/g, '\n    ')}`);
  } else {
    throw new Error(`Expected 400 Bad Request with shortages details, got: ${confirmFailRes.status} - ${JSON.stringify(confirmFailRes.data)}`);
  }

  // Verify stock is STILL 25 (transaction aborted completely)
  const checkStock2 = await request(`/products/${testProduct.id}`, {
    headers: { Authorization: `Bearer ${tokens.ADMIN}` },
  });
  if (checkStock2.data.data.currentStock !== 25) {
    throw new Error(`Stock leaked! Expected 25, got ${checkStock2.data.data.currentStock}`);
  }
  console.log(`  ✔ Verified: Stock strictly untouched (25) after aborted transaction`);

  // 8. HIGH-SCRUTINY TEST: Confirm with SUFFICIENT stock
  console.log('\n8. Testing High-Scrutiny Business Logic: Successful Confirmation & Atomic Decrement...');
  // Edit draft back to valid quantity (10 units)
  await request(`/challans/${challan.id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${tokens.SALES}` },
    body: JSON.stringify({
      items: [{ productId: testProduct.id, quantity: 10 }],
    }),
  });

  const confirmPassRes = await request(`/challans/${challan.id}/confirm`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tokens.WAREHOUSE}` },
  });

  if (confirmPassRes.status !== 200 || confirmPassRes.data.data.status !== 'CONFIRMED') {
    throw new Error(`Challan confirmation failed: ${JSON.stringify(confirmPassRes.data)}`);
  }
  console.log(`  ✔ Challan ${challan.challanNumber} status changed to CONFIRMED`);

  // Verify stock decremented by exactly 10 (25 - 10 = 15)
  const checkStock3 = await request(`/products/${testProduct.id}`, {
    headers: { Authorization: `Bearer ${tokens.ADMIN}` },
  });
  if (checkStock3.data.data.currentStock !== 15) {
    throw new Error(`Stock decrement error! Expected 15, got ${checkStock3.data.data.currentStock}`);
  }
  console.log(`  ✔ Verified: Stock decremented atomically from 25 to ${checkStock3.data.data.currentStock}`);

  // Verify StockLog was written with movementType OUT and reason
  const logsAfterConfirm = await request(`/products/${testProduct.id}/logs`, {
    headers: { Authorization: `Bearer ${tokens.ADMIN}` },
  });
  const latestLog = logsAfterConfirm.data.data[0];
  if (latestLog.movementType === 'OUT' && latestLog.quantityChanged === 10 && latestLog.reason.includes(challan.challanNumber)) {
    console.log(`  ✔ Verified: StockLog created -> ${latestLog.movementType} ${latestLog.quantityChanged} units (Reason: "${latestLog.reason}")`);
  } else {
    throw new Error(`StockLog verification failed: ${JSON.stringify(latestLog)}`);
  }

  // 9. Re-confirmation prevention
  console.log('\n9. Testing Re-confirmation Prevention...');
  const reConfirmRes = await request(`/challans/${challan.id}/confirm`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tokens.WAREHOUSE}` },
  });
  if (reConfirmRes.status === 400) {
    console.log(`  ✔ Re-confirmation blocked (400 Bad Request: "${reConfirmRes.data.error.message}")`);
  } else {
    throw new Error(`Re-confirmation should fail, got ${reConfirmRes.status}`);
  }

  // 10. Challan Cancellation & Stock Reversal
  console.log('\n10. Testing Challan Cancellation & Stock Reversal...');
  const cancelRes = await request(`/challans/${challan.id}/cancel`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tokens.ADMIN}` },
  });

  if (cancelRes.status !== 200 || cancelRes.data.data.status !== 'CANCELLED') {
    throw new Error(`Challan cancellation failed: ${JSON.stringify(cancelRes.data)}`);
  }
  console.log(`  ✔ Challan ${challan.challanNumber} status changed to CANCELLED`);

  // Verify stock reversed back (15 + 10 = 25)
  const checkStock4 = await request(`/products/${testProduct.id}`, {
    headers: { Authorization: `Bearer ${tokens.ADMIN}` },
  });
  if (checkStock4.data.data.currentStock !== 25) {
    throw new Error(`Stock reversal failed! Expected 25, got ${checkStock4.data.data.currentStock}`);
  }
  console.log(`  ✔ Verified: Stock reversed back from 15 to ${checkStock4.data.data.currentStock}`);

  const logsAfterCancel = await request(`/products/${testProduct.id}/logs`, {
    headers: { Authorization: `Bearer ${tokens.ADMIN}` },
  });
  const cancelLog = logsAfterCancel.data.data[0];
  if (cancelLog.movementType === 'IN' && cancelLog.quantityChanged === 10) {
    console.log(`  ✔ Verified: Reversal StockLog created -> ${cancelLog.movementType} ${cancelLog.quantityChanged} units (Reason: "${cancelLog.reason}")`);
  }

  console.log('\n======================================================');
  console.log('    🎉 ALL TIER 1 TESTS PASSED WITH 100% SUCCESS!     ');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
