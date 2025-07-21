# OnlineCheckers.org - Backend Services

This directory contains all the Java backend services for the OnlineCheckers.org project.

## Architecture

The backend is composed of three main components:

### bot-core/
Shared library containing the checkers AI algorithm and common data models.
- **Technology**: Pure Java 21
- **Purpose**: Single source of truth for bot logic
- **Used by**: Both api-server and bot-lambda

### api-server/
Main REST API server and WebSocket handler for the checkers game.
- **Technology**: Spring Boot 3.4.5, MySQL, WebSockets
- **Purpose**: Game management, player sessions, real-time communication
- **Deployment**: Traditional server/container

### bot-lambda/
Serverless AI service for calculating bot moves.
- **Technology**: Quarkus 3.6.4, AWS Lambda
- **Purpose**: High-performance AI move calculation
- **Deployment**: AWS Lambda function

## 🚀 Quick Start

### Prerequisites
- JDK 21 or later
- MySQL Server (for api-server)

### Build All Services
```bash
# From backend/ directory
.\mvnw.cmd clean install
```

### Run API Server
```bash
# From backend/ directory  
.\mvnw.cmd spring-boot:run -pl api-server
```

### Deploy Bot Lambda (Optional)
```bash
# From backend/ directory
.\mvnw.cmd clean package -pl bot-lambda
# Deploy the generated JAR to AWS Lambda
```

Guide: [How to test Bot Lambda Locally](./bot-lambda/README.md)

## Service Communication

```
Frontend (Angular)
        ↓
   api-server (Spring Boot)
        ↓ (optional fallback)
   bot-lambda (Quarkus)
        ↓
   bot-core (shared logic)
```

- **Primary**: Frontend ↔ api-server ↔ bot-lambda
- **Fallback**: If Lambda fails, api-server uses local bot-core directly

## 📋 API Documentation

### Game Management
- **POST** `/api/games/create` - Create new game
- **POST** `/api/games/join/{id}` - Join existing game  
- **GET** `/api/games/{id}` - Get game state
- **POST** `/api/games/{id}/move` - Make a move
- **POST** `/api/games/{id}/chat` - Send chat message
- **POST** `/api/games/{id}/reset` - Reset game
- **DELETE** `/api/games/{id}` - Delete game

### Player Management
- **POST** `/api/players/create` - Create player with nickname validation
- **POST** `/api/players/validate-nickname` - Validate nickname without creating player

### Restart System
- **GET** `/api/restartStatus/{id}/` - Get restart status
- **POST** `/api/restartStatus/{id}` - Update restart status
- **POST** `/api/restartStatus/{id}/restart` - Reset restart flags

### Bot System
- **POST** `/api/bot/move` - Calculate bot move

### WebSocket Real-time Communication
- **WebSocket** `/ws/game` - Real-time game updates
  - Message types: SUBSCRIBE_GAME, MAKE_MOVE, SEND_MESSAGE, UPDATE_RESTART_STATUS, RESET_GAME
  - Server broadcasts: GAME_STATE_UPDATE, RESTART_STATUS_UPDATE, PLAYER_CONNECTED/DISCONNECTED, ERROR

### Bot Lambda Endpoints
- **POST** `/bot/move` - Calculate AI move
- **GET** `/bot/health` - Health check

## Configuration

### api-server Configuration
Create `api-server/src/main/resources/application.properties`:

```properties
# Database Configuration
spring.datasource.url=jdbc:mysql://localhost:3306/checkersonline?createDatabaseIfNotExist=true&useSSL=false
spring.datasource.username=root
spring.datasource.password=your_mysql_password

# JPA Settings
spring.jpa.hibernate.ddl-auto=update
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQLDialect

# Session Management
server.servlet.session.tracking-modes=cookie
server.servlet.session.cookie.name=JSESSIONID
server.servlet.session.cookie.http-only=true
server.servlet.session.timeout=30m

# Server
server.port=8080

# Bot Lambda (optional)
bot.lambda.enabled=false
bot.lambda.url=https://your-lambda-url.amazonaws.com
```

⚠️ **Note**: This file contains sensitive information and is not committed to Git.

### bot-lambda Configuration
Pre-configured in `bot-lambda/src/main/resources/application.properties`:

✅ **Note**: This file is safe to commit and requires no manual configuration.

## Monitoring & Logging

- **api-server**: Standard Spring Boot logging to console
- **bot-lambda**: CloudWatch logs when deployed to AWS, console logs in dev mode
- **Performance**: Track bot response times and fallback usage in api-server logs