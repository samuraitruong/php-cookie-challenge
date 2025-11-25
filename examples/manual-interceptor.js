/**
 * Example: Manual interceptor setup
 * This shows how to use client.interceptors.response.use(challengeCookie)
 */
import axios from 'axios';
import { createCookieChallengeInterceptor } from '../src/index.js';

async function example() {
  // Create your axios client
  const client = axios.create({
    baseURL: 'https://example.com',
    timeout: 5000,
  });

  // Create the cookie challenge interceptor
  // This interceptor will automatically:
  // 1. Detect cookie challenges in responses
  // 2. Make sequential API calls to get cookies
  // 3. Retry the original request with new cookies
  const challengeCookie = createCookieChallengeInterceptor(client);
  
  // Use it with the response interceptor
  client.interceptors.response.use(challengeCookie);

  try {
    // Make requests - cookie challenges will be handled automatically
    const response = await client.get('/api/data');
    console.log('Response:', response.data);
    
    const postResponse = await client.post('/api/submit', { 
      data: 'value' 
    });
    console.log('Post Response:', postResponse.data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// example();

