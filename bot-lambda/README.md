# OnlineCheckers.org - Bot Lambda

AI service developed with Quarkus and deployed on AWS Lambda.

## 🎯 API

### POST /bot/move

Calculate bot's next move

**Request Body:**
```json
{
  "board": "string[][]",      // 8x8 board state ("", "w", "W", "b", "B")
  "playerColor": "string",    // "white" or "black"
  "difficulty": "number",     // 1 (easy), 2 (medium), 3 (hard)
  "boardHistory": "string[]"  // Previous board states
}
```

**Response:**
```json
{
  "from": "string",      // Starting position (e.g., "23")
  "to": "string",        // Ending position (e.g., "34")
  "path": "string[]"     // Capture path (optional, for multiple captures)
}
```

### GET /bot/health

Health check endpoint.

**Response:**
```json
{
  "status": "UP",
  "service": "bot-lambda"
}
```