package org.onlinecheckers.backend.model.dtos.websocket;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Message sent by client to update restart status
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateRestartStatusMessage extends GameWebSocketMessage {
    private boolean restartW;
    private boolean restartB;
    private String nicknameW;
    private String nicknameB;
    
    public UpdateRestartStatusMessage(String gameId, String playerId, boolean restartW, boolean restartB, String nicknameW, String nicknameB) {
        this.setType("UPDATE_RESTART_STATUS");
        this.setGameId(gameId);
        this.setPlayerId(playerId);
        this.restartW = restartW;
        this.restartB = restartB;
        this.nicknameW = nicknameW;
        this.nicknameB = nicknameB;
    }
}