package org.onlinecheckers.apiserver.model.dtos.websocket;

import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Message sent by client to reset the game
 */
@Data
@NoArgsConstructor
public class ResetGameMessage extends GameWebSocketMessage {
    
    public ResetGameMessage(String gameId, String playerId) {
        this.setType("RESET_GAME");
        this.setGameId(gameId);
        this.setPlayerId(playerId);
    }
}