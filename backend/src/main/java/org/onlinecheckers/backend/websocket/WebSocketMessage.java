package org.onlinecheckers.backend.websocket;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.Map;

@Data
@AllArgsConstructor
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class WebSocketMessage {
    
    // Message types
    public enum MessageType {
        // Client to Server
        MOVE,
        CHAT,
        RESTART_REQUEST,
        SYNC_REQUEST,
        HEARTBEAT,
        
        // Server to Client
        GAME_UPDATE,
        CHAT_MESSAGE,
        GAME_RESET,
        RESTART_STATUS_UPDATE,
        FULL_SYNC,
        HEARTBEAT_RESPONSE,
        ERROR,
        PLAYER_JOINED,
        PLAYER_LEFT
    }
    
    private MessageType type;
    private String gameId;
    private String playerId;
    private String playerNickname;
    private Map<String, Object> data;
    private String errorMessage;
    private Long timestamp;
    
    // Convenience constructors for common message types
    public WebSocketMessage(MessageType type, String gameId) {
        this.type = type;
        this.gameId = gameId;
        this.timestamp = System.currentTimeMillis();
    }
    
    public WebSocketMessage(MessageType type, String gameId, Map<String, Object> data) {
        this.type = type;
        this.gameId = gameId;
        this.data = data;
        this.timestamp = System.currentTimeMillis();
    }
    
    public WebSocketMessage(MessageType type, String gameId, String playerId, Map<String, Object> data) {
        this.type = type;
        this.gameId = gameId;
        this.playerId = playerId;
        this.data = data;
        this.timestamp = System.currentTimeMillis();
    }
    
    // Static factory methods for common messages
    public static WebSocketMessage gameUpdate(String gameId, Map<String, Object> gameState) {
        return new WebSocketMessage(MessageType.GAME_UPDATE, gameId, gameState);
    }
    
    public static WebSocketMessage chatMessage(String gameId, String playerId, String playerNickname, String text) {
        Map<String, Object> data = Map.of(
            "player", playerNickname,
            "text", text
        );
        return new WebSocketMessage(MessageType.CHAT_MESSAGE, gameId, playerId, data);
    }
    
    public static WebSocketMessage error(String gameId, String errorMessage) {
        WebSocketMessage message = new WebSocketMessage(MessageType.ERROR, gameId);
        message.setErrorMessage(errorMessage);
        return message;
    }
    
    public static WebSocketMessage heartbeatResponse(String gameId) {
        return new WebSocketMessage(MessageType.HEARTBEAT_RESPONSE, gameId);
    }
    
    public static WebSocketMessage gameReset(String gameId) {
        return new WebSocketMessage(MessageType.GAME_RESET, gameId);
    }
    
    public static WebSocketMessage restartStatusUpdate(String gameId, Map<String, Object> restartStatus) {
        return new WebSocketMessage(MessageType.RESTART_STATUS_UPDATE, gameId, restartStatus);
    }
    
    public static WebSocketMessage playerJoined(String gameId, String playerId, String playerNickname) {
        Map<String, Object> data = Map.of(
            "playerId", playerId,
            "playerNickname", playerNickname
        );
        return new WebSocketMessage(MessageType.PLAYER_JOINED, gameId, playerId, data);
    }
    
    public static WebSocketMessage playerLeft(String gameId, String playerId, String playerNickname) {
        Map<String, Object> data = Map.of(
            "playerId", playerId,
            "playerNickname", playerNickname
        );
        return new WebSocketMessage(MessageType.PLAYER_LEFT, gameId, playerId, data);
    }
}