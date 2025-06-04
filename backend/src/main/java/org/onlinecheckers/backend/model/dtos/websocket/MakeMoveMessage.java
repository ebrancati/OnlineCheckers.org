package org.onlinecheckers.backend.model.dtos.websocket;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;

/**
 * Message sent by client to make a move
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MakeMoveMessage extends GameWebSocketMessage {
    private String from;
    private String to;
    private String player;
    private List<String> path;
    
    public MakeMoveMessage(String gameId, String playerId, String from, String to, String player, List<String> path) {
        this.setType("MAKE_MOVE");
        this.setGameId(gameId);
        this.setPlayerId(playerId);
        this.from = from;
        this.to = to;
        this.player = player;
        this.path = path;
    }
}