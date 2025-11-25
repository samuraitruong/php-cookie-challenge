# Free PHP Host Axios

An axios wrapper library that automatically detects and processes cookie challenges, allowing seamless bypassing of server challenges.

## Features

- 🔄 Automatic cookie challenge detection via response interceptors
- 🍪 Silent cookie processing to bypass server challenges
- 🎯 Easy-to-use axios client wrapper
- 🧪 Comprehensive unit tests

## Installation

```bash
npm install
```

## Usage

### Simple Usage - Auto-configured Client

```javascript
const { createAxiosClient } = require('free-php-host-axios');

// Create a client with automatic cookie challenge handling
const client = createAxiosClient({
  baseURL: 'https://example.com',
  timeout: 5000,
});

// Use it like a regular axios client
// Cookie challenges are automatically detected and processed
const response = await client.get('/api/data');
const postResponse = await client.post('/api/submit', { data: 'value' });
```

### Manual Interceptor Setup

```javascript
const axios = require('axios');
const { createCookieChallengeInterceptor } = require('free-php-host-axios');

// Create your axios client
const client = axios.create({
  baseURL: 'https://example.com',
});

// Create and use the cookie challenge interceptor
const challengeCookie = createCookieChallengeInterceptor(client);
client.interceptors.response.use(challengeCookie);

// Now all requests will automatically handle cookie challenges
// The interceptor will make sequential API calls to get cookies
// and retry the original request with the new cookies
const response = await client.get('/api/data');
```

The cookie challenge detection and processing happens automatically and silently in the background. When a challenge is detected, the interceptor will:
1. Make sequential API calls to get the required cookies
2. Automatically retry the original request with the new cookies
3. Return the final response as if the challenge never happened

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Project Structure

```
.
├── src/
│   ├── index.js              # Main entry point
│   ├── client.js             # Axios client with interceptors
│   └── cookieChallenge.js    # Cookie challenge detection/processing logic
├── tests/
│   ├── client.test.js        # Unit tests for client
│   └── integration.test.js   # Integration tests
├── package.json
└── README.md
```

## Implementation Status

The library structure is set up with placeholder functions for:
- `detectCookieChallenge()` - Detects if a response contains a cookie challenge
- `processCookieChallenge()` - Processes the challenge and updates cookies

You can implement the specific detection and processing logic in `src/cookieChallenge.js` based on your requirements.

## License

ISC

