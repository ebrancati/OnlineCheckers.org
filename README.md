# OnlineCheckers.org - Backend

This is the backend component of OnlineCheckers.org, a web application that allows users to play Italian Checkers online against other players or against a bot.

## Technologies

- Java 21
- Spring Boot 3.4.5
- Spring Data JPA
- MySQL

## Prerequisites

Before you begin, ensure you have the following installed:

- JDK 21 or later
- Maven
- MySQL Server
- Git

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/online-checkers.git
cd online-checkers/backend
```

### 2. Configure Database

Create a MySQL database:

```sql
CREATE DATABASE onlinecheckers;
CREATE USER 'checkersuser'@'localhost' IDENTIFIED BY 'yourpassword';
GRANT ALL PRIVILEGES ON onlinecheckers.* TO 'checkersuser'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Configure Application

Edit the `src/main/resources/application.properties` file:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/onlinecheckers
spring.datasource.username=checkersuser
spring.datasource.password=yourpassword
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
```

### 4. Build and Run

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

## License

To the extent possible under law, this work is dedicated to the public domain worldwide. 
http://creativecommons.org/publicdomain/zero/1.0/