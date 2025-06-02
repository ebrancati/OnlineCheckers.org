# OnlineCheckers.org - Backend

## Technologies

- Java 21
- Spring Boot 3.4.5
- Spring Data JPA
- MySQL

## Prerequisites

Ensure you have the following installed:

- JDK 21 or later
- Maven
- MySQL Server
- Git

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/ebrancati/OnlineCheckers.org.git
cd OnlineCheckers.org/backend
```

### 2. Configure Application

Create the `src/main/resources/application.properties` file:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/checkersonline?createDatabaseIfNotExist=true&useSSL=false
spring.datasource.username=root
spring.datasource.password=
spring.jpa.hibernate.ddl-auto=update
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQLDialect
server.port=8080
```

### 3. Build and Run

```bash
mvn clean install
mvn spring-boot:run
```

The server will start on port 8080.

## Project Structure

- **controllers/** - REST API endpoints
- **model/entities/** - JPA entities
- **model/dtos/** - Data transfer objects
- **model/dtos/services/** - Business logic services
- **model/dtos/mappers/** - Entity-DTO mappers
- **model/daos/** - Data access objects (repositories)
- **exceptions/** - Custom exception classes

## API Endpoints

### Players
- POST `/api/players/create` - Create a new player

### Games
- GET `/api/games/{id}` - Get game state
- POST `/api/games/create` - Create a new game
- POST `/api/games/join/{id}` - Join an existing game
- POST `/api/games/{id}/move` - Make a move
- POST `/api/games/{id}/chat` - Send a chat message
- POST `/api/games/{id}/reset` - Reset a game
- DELETE `/api/games/{id}` - Delete a game

### Bot
- POST `/api/bot/move` - Calculate bot move

### Restart Status
- GET `/api/restartStatus/{id}/` - Get game restart status
- POST `/api/restartStatus/{id}` - Update restart status
- POST `/api/restartStatus/{id}/restart` - Reset restart status

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request