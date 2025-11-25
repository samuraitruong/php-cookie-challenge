import { createAxiosClient } from '../src/client.js';

/**
 * Integration tests for the axios client
 * These tests make actual HTTP requests to verify the interceptor behavior
 */

describe('Integration Tests', () => {
  test('should successfully get JSON response from test URL after handling challenge', async () => {
    const client = createAxiosClient({
      baseURL: 'https://hbcc.free.nf',
      timeout: 10000,
    });

    const response = await client.get('/test.php');

    expect(response.status).toBe(200);
    // After challenge is processed by interceptor, should get JSON response
    expect(response.data).toEqual({ ok: true });
  }, 15000); // Increase timeout for network request
});

