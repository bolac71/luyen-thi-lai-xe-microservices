import axios from 'axios';

const KONG_BASE_URL = 'http://localhost:8000';

interface UserProfileResponse {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
}

describe('Identity to User Service Event Synchronization (Integration)', () => {
  let adminToken: string;

  beforeAll(async () => {
    // 1. Đăng nhập tài khoản admin để lấy access token
    try {
      const response = await axios.post(`${KONG_BASE_URL}/auth/login`, {
        username: 'admin@test.com',
        password: '123456',
      });
      adminToken = response.data.data.accessToken;
    } catch (error) {
      throw new Error(
        `Failed to login as admin: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }, 30000);

  it('should synchronize user creation from identity-service to user-service via RabbitMQ', async () => {
    const randomSuffix = Math.floor(Math.random() * 100000);
    const testUserEmail = `integration-test-${randomSuffix}@test.com`;
    const testUserFullName = `Integration Test User ${randomSuffix}`;

    // 2. Tạo tài khoản đăng nhập mới qua identity-service
    const createResponse = await axios.post(
      `${KONG_BASE_URL}/admin/identity-users`,
      {
        email: testUserEmail,
        fullName: testUserFullName,
        role: 'STUDENT',
        temporaryPassword: 'Password@123',
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(createResponse.status).toBe(201);
    const userId = createResponse.data.data.userId;
    expect(userId).toBeDefined();

    // 3. Chờ đồng bộ bất đồng bộ qua RabbitMQ (Eventual Consistency)
    // Thực hiện gọi thử (polling) API của user-service tối đa 10 lần (mỗi lần cách nhau 500ms)
    let userProfile: UserProfileResponse | null = null;
    const maxRetries = 10;
    const retryIntervalMs = 500;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const profileResponse = await axios.get(
          `${KONG_BASE_URL}/admin/users/${userId}`,
          {
            headers: {
              Authorization: `Bearer ${adminToken}`,
            },
          },
        );
        if (profileResponse.status === 200 && profileResponse.data.success) {
          userProfile = profileResponse.data.data;
          break;
        }
      } catch {
        // Ignored: profile may not be created yet, so user-service might return 404
      }
      await new Promise((resolve) => setTimeout(resolve, retryIntervalMs));
    }

    // 4. Khẳng định (Assert) profile đã được tạo thành công bên user-service với đúng thông tin
    expect(userProfile).not.toBeNull();
    if (!userProfile) {
      throw new Error('User profile was not synchronized');
    }
    expect(userProfile.id).toBe(userId);
    expect(userProfile.email).toBe(testUserEmail);
    expect(userProfile.fullName).toBe(testUserFullName);
    expect(userProfile.role).toBe('STUDENT');
    expect(userProfile.isActive).toBe(true);

    // 5. Dọn dẹp dữ liệu kiểm thử (Clean up)
    const deleteResponse = await axios.delete(
      `${KONG_BASE_URL}/admin/identity-users/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        data: {
          deletedById: 'system-integration-test',
        },
      },
    );
    expect(deleteResponse.status).toBe(200);
  }, 30000);
});
