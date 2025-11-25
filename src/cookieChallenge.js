/**
 * Detects if a response contains a cookie challenge
 * @param {Object} response - Axios response object
 * @returns {boolean} True if cookie challenge is detected
 */
function detectCookieChallenge(response) {
  if (!response || !response.data) {
    return false;
  }

  // Check if response is HTML containing the challenge script
  const data = typeof response.data === 'string' ? response.data : '';
  
  // Look for the challenge indicators:
  // 1. Contains slowAES.decrypt
  // 2. Contains document.cookie with __test
  // 3. Contains location.href redirect
  const hasSlowAES = data.includes('slowAES.decrypt');
  const hasTestCookie = data.includes('__test=');
  const hasLocationRedirect = data.includes('location.href');
  const hasAesJs = data.includes('/aes.js');
  
  return hasSlowAES && hasTestCookie && hasLocationRedirect && hasAesJs;
}

/**
 * Extracts encrypted values from the challenge HTML
 * @param {string} html - HTML content containing the challenge script
 * @returns {Object|null} Object with encrypted values (a, b, c) or null if not found
 */
function extractEncryptedValues(html) {
  // Extract the encrypted values from the script
  // Pattern: var a=toNumbers("..."),b=toNumbers("..."),c=toNumbers("...");
  // The values might be on one line or multiple lines, with or without spaces
  const aMatch = html.match(/var\s+a\s*=\s*toNumbers\s*\(\s*"([a-fA-F0-9]+)"\s*\)/);
  const bMatch = html.match(/var\s+b\s*=\s*toNumbers\s*\(\s*"([a-fA-F0-9]+)"\s*\)/);
  const cMatch = html.match(/var\s+c\s*=\s*toNumbers\s*\(\s*"([a-fA-F0-9]+)"\s*\)/);
  
  if (!aMatch || !bMatch || !cMatch) {
    // Try alternative pattern - all on one line: var a=toNumbers("..."),b=toNumbers("..."),c=toNumbers("...");
    const allMatch = html.match(/var\s+a\s*=\s*toNumbers\s*\(\s*"([a-fA-F0-9]+)"\s*\)\s*,\s*b\s*=\s*toNumbers\s*\(\s*"([a-fA-F0-9]+)"\s*\)\s*,\s*c\s*=\s*toNumbers\s*\(\s*"([a-fA-F0-9]+)"\s*\)/);
    if (allMatch) {
      return {
        a: allMatch[1],
        b: allMatch[2],
        c: allMatch[3],
      };
    }
    return null;
  }
  
  return {
    a: aMatch[1],
    b: bMatch[1],
    c: cMatch[1],
  };
}

/**
 * Converts hex string to array of numbers
 * @param {string} hex - Hex string
 * @returns {Array<number>} Array of numbers
 */
function toNumbers(hex) {
  const result = [];
  hex.replace(/(..)/g, (match) => {
    result.push(parseInt(match, 16));
  });
  return result;
}

/**
 * Converts array of numbers to hex string
 * @param {Array<number>} numbers - Array of numbers
 * @returns {string} Hex string
 */
function toHex(numbers) {
  let result = '';
  for (let i = 0; i < numbers.length; i++) {
    result += (numbers[i] < 16 ? '0' : '') + numbers[i].toString(16);
  }
  return result.toLowerCase();
}

/**
 * Loads slowAES from the server
 * @param {Object} client - Axios client instance
 * @param {string} baseURL - Base URL of the server
 * @returns {Promise<Object>} slowAES object
 */
async function loadSlowAES(client, baseURL) {
  try {
    const response = await client.get('/aes.js', {
      baseURL: baseURL,
      responseType: 'text',
    });
    
    // Evaluate the slowAES code
    // The slowAES code defines a global slowAES object
    // We need to execute it and return the slowAES object
    const slowAES = {};
    
    // Create a function that executes the code and returns slowAES
    // The code defines slowAES as a global, so we pass it as a parameter
    const code = `
      ${response.data}
      return typeof slowAES !== 'undefined' ? slowAES : {};
    `;
    
    const func = new Function('slowAES', code);
    const result = func(slowAES);
    
    // Return the slowAES object (it should have decrypt method)
    return result && typeof result.decrypt === 'function' ? result : slowAES;
  } catch (error) {
    // If loading fails, try to use a fallback or throw
    throw new Error(`Failed to load slowAES: ${error.message}`);
  }
}

/**
 * Processes a cookie challenge by making necessary requests and updating cookies
 * This function will make sequential API calls to get cookies and then retry the original request
 * @param {Object} response - Axios response object containing the challenge
 * @param {Object} client - Axios client instance to make follow-up requests
 * @returns {Promise<Object>} Retried response with cookies handled
 */
async function processCookieChallenge(response, client) {
  const originalRequest = response.config;
  const html = typeof response.data === 'string' ? response.data : String(response.data);
  
  // Extract encrypted values from HTML
  const encrypted = extractEncryptedValues(html);
  if (!encrypted) {
    throw new Error('Could not extract encrypted values from challenge');
  }
  
  // Get base URL from client config or construct from request URL
  let baseURL = client.defaults?.baseURL;
  if (!baseURL && originalRequest.url) {
    try {
      const url = new URL(originalRequest.url);
      baseURL = `${url.protocol}//${url.host}`;
    } catch (e) {
      // If URL is relative, try to get from request
      if (originalRequest.baseURL) {
        baseURL = originalRequest.baseURL;
      } else {
        throw new Error('Could not determine base URL for slowAES loading');
      }
    }
  }
  if (!baseURL) {
    throw new Error('Could not determine base URL for slowAES loading');
  }
  
  // Load slowAES library from the server
  const slowAES = await loadSlowAES(client, baseURL);
  
  // Convert hex strings to number arrays
  const a = toNumbers(encrypted.a);
  const b = toNumbers(encrypted.b);
  const c = toNumbers(encrypted.c);
  
  // Decrypt using slowAES (mode 2 = CBC)
  // The decrypt function signature: decrypt(ciphertext, mode, key, iv)
  // Check if decrypt exists on slowAES or slowAES.modeOfOperation
  let decrypted;
  if (typeof slowAES.decrypt === 'function') {
    decrypted = slowAES.decrypt(c, 2, a, b);
  } else if (slowAES.modeOfOperation && typeof slowAES.modeOfOperation.decrypt === 'function') {
    decrypted = slowAES.modeOfOperation.decrypt(c, 2, a, b);
  } else {
    throw new Error('slowAES.decrypt function not found');
  }
  
  // Convert decrypted array to hex string
  const cookieValue = toHex(decrypted);
  
  // Build the retry URL with ?i=1 parameter
  const originalUrl = originalRequest.url || '';
  let retryUrl;
  try {
    const url = new URL(originalUrl, baseURL);
    url.searchParams.set('i', '1');
    retryUrl = url.pathname + url.search;
  } catch (e) {
    // If URL parsing fails, append ?i=1 manually
    retryUrl = originalUrl + (originalUrl.includes('?') ? '&' : '?') + 'i=1';
  }
  
  // Retry the original request with the cookie and ?i=1 parameter
  const retryConfig = {
    ...originalRequest,
    url: retryUrl,
    headers: {
      ...originalRequest.headers,
      Cookie: `__test=${cookieValue}`,
    },
  };
  
  // Make the retry request
  const retryResponse = await client.request(retryConfig);
  
  return retryResponse;
}

/**
 * Creates a cookie challenge interceptor function that can be used with client.interceptors.use()
 * @param {Object} client - Axios client instance (will be used for sequential API calls and retry)
 * @param {Function} detectFn - Optional custom detection function (defaults to detectCookieChallenge)
 * @param {Function} processFn - Optional custom processing function (defaults to processCookieChallenge)
 * @returns {Function} Interceptor function for use with axios interceptors
 */
function createCookieChallengeInterceptor(client, detectFn = detectCookieChallenge, processFn = processCookieChallenge) {
  return async (response) => {
    // Check if response contains a cookie challenge
    const isChallenge = detectFn(response);
    
    if (isChallenge) {
      try {
        // Process the cookie challenge (makes sequential API calls and retries)
        // The client is captured from closure and will be used for:
        // 1. Making sequential API calls to get cookies
        // 2. Retrying the original request with new cookies
        const processedResponse = await processFn(response, client);
        return processedResponse;
      } catch (error) {
        // If processing fails, log error and rethrow so caller knows it failed
        console.error('Cookie challenge processing failed:', error.message || error);
        throw error;
      }
    }

    return response;
  };
}

export {
  detectCookieChallenge,
  processCookieChallenge,
  createCookieChallengeInterceptor,
};

