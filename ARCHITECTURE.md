# Architecture Documentation

## Deployment Architecture

### Development
```
Frontend → API Server → Bot Core
              ↓
          MySQL DB
```

### Production
```

Frontend → API Server → Bot Lambda → Bot Core → Response
               ↓           ↓ (if fails)
          MySQL DB      API Server → Bot Core → Response
```

## Technology Stack

### Frontend
- **Framework**: Angular 19
- **UI**: Bootstrap 5 + Custom CSS
- **Internationalization**: ngx-translate

### Backend
- **API Server**: Spring Boot 3.4.5 (Java 21)
- **Bot Service**: Quarkus 3.6.4 (AWS Lambda)
- **Shared Logic**: bot-core library
- **Database**: MySQL
- **Communication**: REST API + WebSockets

## Component Architecture

### Frontend Structure
```
src/
├── app/
│   ├── components/          # Reusable UI components
│   │   ├── bot-board/      # Bot game board
│   │   ├── offline-board/  # Base game board
│   │   ├── online-board/   # Multiplayer board
│   │   └── ...
│   ├── pages/              # Route components
│   │   ├── menu/          # Main menu
│   │   ├── online-game/   # Online game page
│   │   ├── bot-game/      # Bot game page
│   │   └── ...
│   └── services/          # Angular services
│       ├── game.service.ts
│       ├── websocket.service.ts
│       ├── bot.service.ts
│       └── ...
├── assets/
│   ├── i18n/              # Translation files
│   ├── audio/             # Game sounds
│   └── images/            # Game assets
└── styles/                # Global styles & themes
```

### Backend Structure
```
backend/
├── api-server/            # Main Spring Boot application
│   ├── controllers/       # REST endpoints & WebSocket handlers
│   ├── services/         # Business logic
│   ├── repositories/     # Data access layer
│   ├── model/            # Entities & DTOs
│   └── config/           # Configuration classes
├── bot-lambda/           # Quarkus Lambda function
│   ├── resource/         # REST endpoints
│   └── service/          # Bot calculation service
└── bot-core/             # Shared AI library
    ├── dto/              # Data transfer objects
    ├── model/            # Game models
    └── service/          # AI algorithm implementation
```

## Game Modes

### 1. Local Play (Offline)
- Two players on same device
- No network required
- Immediate move validation

### 2. Online Multiplayer
- Real-time gameplay via WebSockets
- Session-based player authentication
- Spectator support
- In-game chat
- Game sharing via ID

### 3. Bot Play (Single Player)
- Three difficulty levels (Easy, Medium, Hard)
- Smart AI with anti-loop logic
- Local fallback when Lambda unavailable

## API Documentation

### REST Endpoints

| Endpoint                   | Method | Description                                              |
|----------------------------|--------|----------------------------------------------------------|
| `/api/games/create`        | POST   | Create new game session                                  |
| `/api/games/join/{id}`     | POST   | Join existing game                                       |
| `/api/games/{id}`          | GET    | Get game state with access control                      |
| `/api/games/{id}/board`    | GET    | Get current board state                                  |
| `/api/games/{id}/move`     | POST   | Make a move                                              |
| `/api/games/{id}/chat`     | POST   | Send chat message                                        |
| `/api/games/{id}/reset`    | POST   | Reset game to initial state                             |
| `/api/bot/move`            | POST   | Calculate bot move                                       |
| `/api/players/create`      | POST   | Create new player                                        |
| `/api/restartStatus/{id}`  | GET    | Get restart voting status                               |
| `/api/restartStatus/{id}`  | POST   | Update restart vote                                      |

### WebSocket Events

| Message Type              | Direction    | Description                     |
|---------------------------|-------------|---------------------------------|
| `SUBSCRIBE_GAME`          | Client→Server| Join game room                  |
| `MAKE_MOVE`               | Client→Server| Submit move                     |
| `SEND_MESSAGE`            | Client→Server| Send chat message               |
| `UPDATE_RESTART_STATUS`   | Client→Server| Vote for game restart           |
| `RESET_GAME`              | Client→Server| Reset game                      |
| `GAME_STATE_UPDATE`       | Server→Client| Updated game state              |
| `RESTART_STATUS_UPDATE`   | Server→Client| Updated restart voting status   |
| `PLAYER_CONNECTED`        | Server→Client| Player joined game              |
| `PLAYER_DISCONNECTED`     | Server→Client| Player left game                |
| `ERROR`                   | Server→Client| Error message                   |

## Data Models

### Game State
```typescript
interface GameDto {
  id: string;
  board: string[][];           // 8x8 board matrix
  turno: Team;                 // Current player turn
  pedineW: number;             // White pieces count
  pedineB: number;             // Black pieces count
  damaW: number;               // White kings count
  damaB: number;               // Black kings count
  partitaTerminata: boolean;   // Game over flag
  vincitore: Team;             // Winner
  players: Player[];           // Game players
  cronologiaMosse: string[];   // Move history
  chat: string;                // Chat messages
  spectatorCount: number;      // Number of spectators
}
```

### Move
```typescript
interface MoveDto {
  from: string;        // Starting position
  to: string;          // Ending position
  player: string;      // Player color ("WHITE"/"BLACK")
  path?: string[];     // Capture path for multi-jumps
}
```

## Security & Authorization

### Session Management
- HTTP sessions for player authentication
- Session IDs stored in game authorized sessions
- Distinction between players and spectators

### Access Control
- **Players**: Can make moves, chat, reset game
- **Spectators**: Read-only access to game state
- **WebSocket**: Authorization checked on each message

## Bot AI Algorithm

### Architecture
- **Algorithm**: Minimax with Alpha-Beta pruning
- **Depth**: 1-5 moves based on difficulty
- **Anti-Loop**: Prevents infinite move repetition