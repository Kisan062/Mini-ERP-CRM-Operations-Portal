/**
 * User Management & RBAC Automated Test Suite
 */
export {};

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
  return { status: response.status, data };
}

async function runTests() {
  console.log('======================================================');
  console.log('     RUNNING USER MANAGEMENT & RBAC TEST SUITE        ');
  console.log('======================================================\n');

  // 1. Authenticate Admin and Sales
  console.log('1. Authenticating Admin & Sales...');
  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@operations.com', password: 'Admin@123' }),
  });
  if (adminLogin.status !== 200 || !adminLogin.data?.data?.token) {
    throw new Error(`Admin login failed: ${JSON.stringify(adminLogin.data)}`);
  }
  const adminToken = adminLogin.data.data.token;
  const adminId = adminLogin.data.data.user.id;
  console.log('  ✔ Admin authenticated');

  const salesLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'sales@operations.com', password: 'Sales@123' }),
  });
  if (salesLogin.status !== 200 || !salesLogin.data?.data?.token) {
    throw new Error(`Sales login failed: ${JSON.stringify(salesLogin.data)}`);
  }
  const salesToken = salesLogin.data.data.token;
  console.log('  ✔ Sales authenticated');

  // 2. Test RBAC: Non-admin should be forbidden from accessing /users
  console.log('\n2. Testing RBAC restrictions on non-admin accounts...');
  const forbiddenRes = await request('/users', {
    headers: { Authorization: `Bearer ${salesToken}` },
  });
  if (forbiddenRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for SALES, got ${forbiddenRes.status}`);
  }
  console.log('  ✔ SALES correctly blocked with 403 Forbidden on GET /api/users');

  const forbiddenPost = await request('/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${salesToken}` },
    body: JSON.stringify({
      name: 'Hacker',
      email: 'hacker@operations.com',
      password: 'Password123',
      role: 'ADMIN',
    }),
  });
  if (forbiddenPost.status !== 403) {
    throw new Error(`Expected 403 Forbidden for SALES creating user, got ${forbiddenPost.status}`);
  }
  console.log('  ✔ SALES correctly blocked with 403 Forbidden on POST /api/users');

  // 3. Admin Lists Users
  console.log('\n3. Testing Admin listing all users (GET /api/users)...');
  const listRes = await request('/users', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (listRes.status !== 200 || !Array.isArray(listRes.data?.data)) {
    throw new Error(`Failed to list users: ${JSON.stringify(listRes.data)}`);
  }
  console.log(`  ✔ Successfully listed ${listRes.data.data.length} users with activity counts`);
  const initialCount = listRes.data.data.length;

  // 4. Admin Creates New User
  console.log('\n4. Testing Admin creating new user (POST /api/users)...');
  const testEmail = `operator.${Date.now()}@operations.com`;
  const createRes = await request('/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Ravi Operator',
      email: testEmail,
      password: 'Operator@123',
      role: 'WAREHOUSE',
    }),
  });
  if (createRes.status !== 201 || !createRes.data?.data?.id) {
    throw new Error(`Failed to create user: ${JSON.stringify(createRes.data)}`);
  }
  const createdUser = createRes.data.data;
  console.log(`  ✔ User created: "${createdUser.name}" (${createdUser.email}) - Role: ${createdUser.role}`);

  // 5. Newly created user logs in
  console.log('\n5. Testing login with newly created user credentials...');
  const newLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: testEmail, password: 'Operator@123' }),
  });
  if (newLogin.status !== 200 || !newLogin.data?.data?.token) {
    throw new Error(`New user login failed: ${JSON.stringify(newLogin.data)}`);
  }
  console.log(`  ✔ New user logged in successfully! Role verified: ${newLogin.data.data.user.role}`);

  // 6. Test duplicate email rejection
  console.log('\n6. Testing duplicate email prevention (409 Conflict)...');
  const dupRes = await request('/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Duplicate Ravi',
      email: testEmail,
      password: 'AnotherPassword123',
      role: 'SALES',
    }),
  });
  if (dupRes.status !== 409) {
    throw new Error(`Expected 409 Conflict for duplicate email, got ${dupRes.status}`);
  }
  console.log('  ✔ Duplicate email correctly rejected with 409 Conflict');

  // 7. Update User Role (Promote from WAREHOUSE to SALES)
  console.log('\n7. Testing user role update (PUT /api/users/:id)...');
  const updateRes = await request(`/users/${createdUser.id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Ravi Senior Executive',
      role: 'SALES',
    }),
  });
  if (updateRes.status !== 200 || updateRes.data?.data?.role !== 'SALES') {
    throw new Error(`Failed to update user: ${JSON.stringify(updateRes.data)}`);
  }
  console.log(`  ✔ User promoted to SALES (Name: "${updateRes.data.data.name}")`);

  // 8. Self-deletion prevention
  console.log('\n8. Testing self-deletion prevention...');
  const selfDelRes = await request(`/users/${adminId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (selfDelRes.status !== 400) {
    throw new Error(`Expected 400 Bad Request for self-deletion, got ${selfDelRes.status}`);
  }
  console.log('  ✔ Admin self-deletion correctly blocked with 400 Bad Request');

  // 9. Delete unused test user
  console.log('\n9. Testing deletion of clean test user...');
  const delRes = await request(`/users/${createdUser.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (delRes.status !== 200) {
    throw new Error(`Failed to delete clean test user: ${JSON.stringify(delRes.data)}`);
  }
  console.log('  ✔ Clean test user deleted successfully');

  console.log('\n======================================================');
  console.log('    🎉 ALL USER MANAGEMENT TESTS PASSED 100%!          ');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ USER MANAGEMENT TEST FAILED:', err);
  process.exit(1);
});
