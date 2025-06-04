package org.onlinecheckers.backend.model.dtos.websocket;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Message sent by server to notify player connection/disconnection
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlayerConnectionMessage {
    private String type; // "PLAYER_CONNECTED" or "PLAYER_DISCONNECTED"
    private String playerId;
    private String gameId;
}