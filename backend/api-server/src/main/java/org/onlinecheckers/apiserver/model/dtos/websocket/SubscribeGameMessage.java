package org.onlinecheckers.apiserver.model.dtos.websocket;

import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Message sent by client to subscribe to game updates
 */
@Data
@NoArgsConstructor
public class SubscribeGameMessage extends GameWebSocketMessage {
    
    public SubscribeGameMessage(String gameId, String playerId) {
        this.setType("SUBSCRIBE_GAME");
        this.setGameId(gameId);
        this.setPlayerId(playerId);
    }
}