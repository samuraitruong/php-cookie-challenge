# @samuraitruong/php-cookie-challenge

An axios wrapper library that automatically detects and processes cookie challenges from PHP free hosting providers, allowing seamless API access without manual cookie handling.

## The Problem

Many free PHP hosting providers (like free.nf, InfinityFree, etc.) implement cookie-based challenge systems to protect their servers from abuse. When you make an API request to these hosts:

1. **First Request**: The server returns an HTML page with a JavaScript challenge instead of your API response
2. **The Challenge**: Contains encrypted values that need to be decrypted using a server-provided AES library
3. **Cookie Requirement**: The decrypted value must be sent as a cookie (`__test`) in subsequent requests
4. **Manual Process**: Without automation, you'd need to:
   - Parse the HTML response
   - Extract encrypted values
   - Load and execute the AES decryption library
   - Generate the cookie
   - Retry the request with the cookie

This process is tedious and error-prone when building API clients.

## The Solution

This library automatically handles all of the above steps transparently. Your API client code remains clean and simple - just make requests as you normally would, and the library handles the cookie challenge in the background.

## Features

- 🔄 Automatic cookie challenge detection via response interceptors
- 🍪 Silent cookie processing to bypass server challenges
- 🎯 Easy-to-use axios client wrapper
- 🧪 Comprehensive unit tests

## Installation

```bash
npm install @samuraitruong/php-cookie-challenge
```

## Usage

### Simple Usage - Auto-configured Client

```javascript
import { createAxiosClient } from '@samuraitruong/php-cookie-challenge';

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
import axios from 'axios';
import { createCookieChallengeInterceptor } from '@samuraitruong/php-cookie-challenge';

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

## How It Works

The library automatically handles cookie challenges by:

1. **Detection**: Detects when a server response contains a JavaScript-based cookie challenge (typically using slowAES encryption)
2. **Processing**: 
   - Extracts encrypted values from the challenge HTML
   - Loads the slowAES library from the server
   - Decrypts the challenge to generate the required cookie
3. **Retry**: Automatically retries the original request with the decrypted cookie and required parameters

All of this happens silently in the background - your code doesn't need to handle any of these details.

## License

ISC

