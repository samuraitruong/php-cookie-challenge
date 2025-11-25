import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { createAxiosClient } from '../src/client.js';
import * as cookieChallengeModule from '../src/cookieChallenge.js';
import { 
  detectCookieChallenge, 
  processCookieChallenge,
  createCookieChallengeInterceptor 
} from '../src/cookieChallenge.js';

describe('Axios Client with Cookie Challenge Interceptor', () => {
  let client;

  beforeEach(() => {
    // Note: In ES modules, mocking is more complex
    // For these tests, we're testing the actual interceptor setup
    // The integration test will test with real HTTP requests
  });

  test('should create axios client with interceptors', () => {
    client = createAxiosClient({ baseURL: 'https://hbcc.free.nf/test.php' });
    
    expect(client).toBeDefined();
    expect(client.interceptors).toBeDefined();
    expect(client.interceptors.response).toBeDefined();
    expect(typeof client.interceptors.response.use).toBe('function');
  });

  test('should register response interceptor', () => {
    client = createAxiosClient();
    
    // Verify interceptor is set up
    expect(client.interceptors.response).toBeDefined();
    expect(typeof client.interceptors.response.use).toBe('function');
  });
});

describe('Cookie Challenge Interceptor Creation', () => {
  test('should create interceptor function with client', () => {
    const mockClient = {
      get: jest.fn(),
      post: jest.fn(),
    };
    
    const interceptor = createCookieChallengeInterceptor(mockClient);
    expect(typeof interceptor).toBe('function');
  });

  test('should use interceptor with client.interceptors.response.use', async () => {
    const mockClient = {
      interceptors: {
        response: {
          use: jest.fn(),
        },
      },
      get: jest.fn(),
      post: jest.fn(),
    };
    
    const challengeCookie = createCookieChallengeInterceptor(mockClient);
    mockClient.interceptors.response.use(challengeCookie);
    
    expect(mockClient.interceptors.response.use).toHaveBeenCalledWith(challengeCookie);
  });

  test('should handle response without challenge', async () => {
    const mockClient = {
      get: jest.fn(),
      post: jest.fn(),
    };
    
    // Use a custom detect function that returns false
    const mockDetectFn = jest.fn().mockReturnValue(false);
    const interceptor = createCookieChallengeInterceptor(mockClient, mockDetectFn);
    
    const response = {
      data: {},
      status: 200,
      headers: {},
      config: {},
    };
    
    const result = await interceptor(response);
    expect(result).toEqual(response);
    expect(mockDetectFn).toHaveBeenCalledWith(response);
  });

  test('should process response with challenge', async () => {
    const mockClient = {
      get: jest.fn(),
      post: jest.fn(),
    };
    
    const response = {
      data: {},
      status: 200,
      headers: {},
      config: {},
    };
    
    // Create mock functions
    const mockDetectFn = jest.fn().mockReturnValue(true);
    const processedResponse = { ...response, data: { processed: true } };
    const mockProcessFn = jest.fn().mockResolvedValue(processedResponse);
    
    // Create interceptor with mocked functions
    const interceptor = createCookieChallengeInterceptor(mockClient, mockDetectFn, mockProcessFn);
    
    const result = await interceptor(response);
    expect(result).toEqual(processedResponse);
    expect(mockDetectFn).toHaveBeenCalledWith(response);
    expect(mockProcessFn).toHaveBeenCalledWith(response, mockClient);
  });
});

describe('Cookie Challenge Detection', () => {
  test('should return false for response without headers', () => {
    const response = {};
    expect(detectCookieChallenge(response)).toBe(false);
  });

  test('should return false for response with null headers', () => {
    const response = { headers: null };
    expect(detectCookieChallenge(response)).toBe(false);
  });

  test('should return false for normal response (placeholder)', () => {
    const response = {
      headers: {
        'content-type': 'application/json',
      },
      status: 200,
    };
    // Currently returns false as placeholder
    expect(detectCookieChallenge(response)).toBe(false);
  });

  test('should handle response with set-cookie header', () => {
    const response = {
      headers: {
        'set-cookie': ['session=abc123'],
        'content-type': 'text/html',
      },
      status: 200,
    };
    // Currently returns false as placeholder - will be implemented later
    expect(detectCookieChallenge(response)).toBe(false);
  });
});

describe('Cookie Challenge Processing', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      request: jest.fn(),
      get: jest.fn(),
      post: jest.fn(),
    };
  });

  test('should throw error when processing challenge without encrypted values', async () => {
    const response = {
      data: '<html><body>No challenge here</body></html>',
      status: 200,
      headers: {},
      config: {
        url: '/test',
        method: 'get',
        baseURL: 'https://example.com',
      },
    };

    await expect(processCookieChallenge(response, mockClient)).rejects.toThrow(
      'Could not extract encrypted values from challenge'
    );
  });

  test('should throw error when baseURL is missing', async () => {
    const challengeHtml = '<html><body><script>var a=toNumbers("f655ba9d09a112d4968c63579db590b4"),b=toNumbers("98344c2eee86c3994890592585b49f80"),c=toNumbers("fdd9f8ac7a55834004f21a883ac3e49e");</script></body></html>';
    
    const response = {
      data: challengeHtml,
      status: 200,
      headers: {},
      config: {
        url: '/test',
        method: 'get',
        // No baseURL
      },
    };

    await expect(processCookieChallenge(response, mockClient)).rejects.toThrow(
      'Could not determine base URL'
    );
  });
});

