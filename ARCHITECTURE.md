## API Documentation

### SPRING BOOT REST API

| Endpoint                   | Method | Description                                              | Request Body                                        | Response                                                                      |
|----------------------------|--------|----------------------------------------------------------|----------------------------------------------------|-------------------------------------------------------------------------------|
| /api/games/create          | POST   | Player 1 creates a new game and generates an ID          | `{ "nickname": "player1", "preferredTeam": "WHITE" }` | Game object with board state, players, and game ID                           |
| /api/games/join/{id}       | POST   | Player 2 joins the game using the game ID                | `{ "nickname": "player2" }`                        | `true` if successful                                                         |
| /api/games/{id}            | GET    | Gets the current game state                              | -                                                  | Game object with current board state                                         |
| /api/games/{id}/board      | GET    | Returns the current board state                          | -                                                  | GameDto object with current board state and game information                 |
| /api/games/{id}/move       | POST   | Validates and executes a move on the board               | `{ "from": "01", "to": "23", "player": "WHITE", "path": [...] }` | Updated GameDto with new board state                                         |
| /api/games/{id}/chat       | POST   | Sends a chat message                                     | `{ "player": "nickname", "text": "message" }`      | -                                                                            |
| /api/games/{id}/reset      | POST   | Resets the game to initial state                         | -                                                  | -                                                                            |
| /api/players/create        | POST   | Creates a new player                                     | `{ "nickname": "player" }`                         | Player object                                                                |
| /api/restartStatus/{id}/   | GET    | Gets restart status for a game                           | -                                                  | `{ "gameID": "id", "nicknameB": "player1", "nicknameW": "player2", "restartB": false, "restartW": false }` |
| /api/restartStatus/{id}    | POST   | Updates restart status                                   | PlayerRestartDto object                            | -                                                                            |
| /api/restartStatus/{id}/restart | POST | Resets restart flags                                  | -                                                  | Updated PlayerRestartDto                                                     |
| /api/games/{id}            | DELETE | Deletes a game session                                   | -                                                  | -                                                                            |