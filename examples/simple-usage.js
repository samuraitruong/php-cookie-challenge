/**
 * Example: Simple usage with auto-configured client
 */
import { createAxiosClient } from '../src/index.js';

async function example() {
  const client = createAxiosClient({
    baseURL: 'https://example.com',
    timeout: 5000,
  });

  try {
    const response = await client.get('/api/data');
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// example();

