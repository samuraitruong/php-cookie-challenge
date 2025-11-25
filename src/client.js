import axios from 'axios';
import { createCookieChallengeInterceptor } from './cookieChallenge.js';

/**
 * Creates an axios client with automatic cookie challenge detection and processing
 * @param {Object} config - Axios configuration object
 * @param {Function} challengeHandler - Optional custom challenge handler function
 * @returns {Object} Configured axios instance with interceptors
 */
function createAxiosClient(config = {}, challengeHandler = null) {
  const client = axios.create(config);

  // Create cookie challenge interceptor with client reference
  // The client will be used for making sequential API calls and retrying requests
  const cookieChallengeInterceptor = challengeHandler || createCookieChallengeInterceptor(client);

  // Response interceptor - handles cookie challenge detection and processing
  client.interceptors.response.use(
    cookieChallengeInterceptor,
    async (error) => {
      // Handle errors that might be related to cookie challenges
      if (error.response) {
        try {
          const processedResponse = await cookieChallengeInterceptor(error.response);
          return processedResponse;
        } catch (processError) {
          // If processing fails, reject with original error
          return Promise.reject(error);
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
}

export {
  createAxiosClient,
};

