package org.onlinecheckers.apiserver.model.dtos.websocket;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Message sent by server to update game state
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GameStateUpdateMessage {
    private String type = "GAME_STATE_UPDATE";
    private Object gameState; // GameResponse object
}