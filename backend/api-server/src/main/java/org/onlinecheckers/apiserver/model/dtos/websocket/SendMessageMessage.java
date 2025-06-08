package org.onlinecheckers.apiserver.model.dtos.websocket;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Message sent by client to send a chat message
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SendMessageMessage extends GameWebSocketMessage {
    private String text;
    
    public SendMessageMessage(String gameId, String playerId, String text) {
        this.setType("SEND_MESSAGE");
        this.setGameId(gameId);
        this.setPlayerId(playerId);
        this.text = text;
    }
}