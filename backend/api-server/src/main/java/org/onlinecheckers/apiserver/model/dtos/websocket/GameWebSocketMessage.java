package org.onlinecheckers.apiserver.model.dtos.websocket;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

/**
 * Base class for all custom WebSocket messages
 */
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
    @JsonSubTypes.Type(value = SubscribeGameMessage.class, name = "SUBSCRIBE_GAME"),
    @JsonSubTypes.Type(value = MakeMoveMessage.class, name = "MAKE_MOVE"),
    @JsonSubTypes.Type(value = SendMessageMessage.class, name = "SEND_MESSAGE"),
    @JsonSubTypes.Type(value = UpdateRestartStatusMessage.class, name = "UPDATE_RESTART_STATUS"),
    @JsonSubTypes.Type(value = ResetGameMessage.class, name = "RESET_GAME")
})
public abstract class GameWebSocketMessage {
    private String type;
    private String gameId;
    private String playerId; // nickname

    // Getters and Setters
    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getGameId() {
        return gameId;
    }

    public void setGameId(String gameId) {
        this.gameId = gameId;
    }

    public String getPlayerId() {
        return playerId;
    }

    public void setPlayerId(String playerId) {
        this.playerId = playerId;
    }
}