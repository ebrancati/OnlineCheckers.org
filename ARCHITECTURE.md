## API Documentation

### SPRING BOOT REST API

| Endpoint                 | Method | Description                                                      | Input | Output |
|--------------------------|--------|------------------------------------------------------------------|-------|--------|
| /api/games/create        | POST   | Giocatore 1 Crea nuova partita e genera un ID                    | { "nickname": "player1" } | `{ "gameId": "235897" }` |
| /api/games/join/{gameId} | POST   | Giocatore 2 entra nella partita generata da Giocatore 1 grazie all'ID | `{ "nickname": "player2" }` | `{ "success": true }` |
| /api/games/{gameId}/move | POST   | La mossa eseguita nel client viene mandata al backend per essere validata | `{ "from": "a2", "to": "a4", "player": "white" }` | `{ "valid": true }` |
| /api/games/{id}/board    | GET    | Ritorna JSON che mostra la scacchiera della partita in corso     | - | `{ "board": [...] }` |

### PYTHON(?) REST API

| Endpoint          | Method | Description                                              | Input | Output |
|-------------------|--------|----------------------------------------------------------|-------|--------|
| /api/bot/get-move | POST   | Riceve in input la scacchiera e la difficoltà, ritorna in output la mossa scelta dal bot | `{ "board": [...], "difficulty": 3 }` | `{ "from": "e7", "to": "e5" }` |

## Case conventions

**camelCase** - nomi di metodi, funzioni e variabili

**PascalCase** - nomi di classi e interfacce

**SNAKE_CASE** maiuscolo - per costanti

*nomi preferibilmente in inglese*
