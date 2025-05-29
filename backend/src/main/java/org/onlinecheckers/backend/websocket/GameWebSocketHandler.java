package org.onlinecheckers.backend.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.onlinecheckers.backend.services.GameWebSocketService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;

import java.io.IOException;
import java.net.URI;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class GameWebSocketHandler implements WebSocketHandler {

    private static final Logger logger = LoggerFactory.getLogger(GameWebSocketHandler.class);
    
    @Autowired
    private GameWebSocketService gameWebSocketService;
    
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    // Track active sessions: gameId -> Set<WebSocketSession>
    private final Map<String, Map<String, WebSocketSession>> gameSessions = new ConcurrentHashMap<>();
    // Track session metadata: sessionId -> GameSessionInfo
    private final Map<String, GameSessionInfo> sessionInfo = new ConcurrentHashMap<>();
    
    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String gameId = extractGameIdFromSession(session);
        String playerId = extractPlayerIdFromSession(session);
        String playerNickname = extractPlayerNicknameFromSession(session);
        
        logger.info("WebSocket connection established for game: {}, player: {} ({})", 
                   gameId, playerId, playerNickname);
        
        // Store session info
        GameSessionInfo info = new GameSessionInfo(gameId, playerId, playerNickname);
        sessionInfo.put(session.getId(), info);
        
        // Add session to game room
        gameSessions.computeIfAbsent(gameId, k -> new ConcurrentHashMap<>())
                   .put(session.getId(), session);
        
        // Notify service about new connection
        gameWebSocketService.handlePlayerJoined(gameId, playerId, playerNickname);
        
        // Send initial game state to the newly connected player
        gameWebSocketService.sendGameStateToPlayer(gameId, session);
        
        // Notify other players about the new connection
        broadcastToGame(gameId, WebSocketMessage.playerJoined(gameId, playerId, playerNickname), 
                       session.getId());
    }

    @Override
    public void handleMessage(WebSocketSession session, org.springframework.web.socket.WebSocketMessage<?> message) throws Exception {
        GameSessionInfo info = sessionInfo.get(session.getId());
        if (info == null) {
            logger.warn("Received message from unknown session: {}", session.getId());
            return;
        }
        
        try {
            // Parse message based on payload type
            String payload = null;
            if (message.getPayload() instanceof String) {
                payload = (String) message.getPayload();
            } else if (message instanceof TextMessage) {
                payload = ((TextMessage) message).getPayload();
            } else if (message.getPayload() instanceof byte[]) {
                payload = new String((byte[]) message.getPayload());
            }
            
            if (payload == null || payload.trim().isEmpty()) {
                logger.warn("Received empty message from session: {}", session.getId());
                return;
            }
            
            // Parse JSON message to our custom WebSocketMessage
            WebSocketMessage wsMessage = objectMapper.readValue(payload, WebSocketMessage.class);
            wsMessage.setGameId(info.getGameId());
            wsMessage.setPlayerId(info.getPlayerId());
            wsMessage.setPlayerNickname(info.getPlayerNickname());
            
            logger.info("Received message type: {} from player: {} in game: {}", 
                       wsMessage.getType(), info.getPlayerNickname(), info.getGameId());
            
            // Route message to appropriate handler
            handleGameMessage(session, wsMessage);
            
        } catch (Exception e) {
            logger.error("Error handling message from session {}: {}", session.getId(), e.getMessage(), e);
            sendErrorToSession(session, "Error processing message: " + e.getMessage());
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        logger.error("WebSocket transport error for session {}: {}", session.getId(), exception.getMessage());
        
        GameSessionInfo info = sessionInfo.get(session.getId());
        if (info != null) {
            // Notify other players about the connection issue
            broadcastToGame(info.getGameId(), 
                          WebSocketMessage.error(info.getGameId(), "Player " + info.getPlayerNickname() + " connection unstable"), 
                          session.getId());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus closeStatus) throws Exception {
        GameSessionInfo info = sessionInfo.remove(session.getId());
        if (info == null) {
            logger.warn("Connection closed for unknown session: {}", session.getId());
            return;
        }
        
        logger.info("WebSocket connection closed for game: {}, player: {} ({}), reason: {}", 
                   info.getGameId(), info.getPlayerId(), info.getPlayerNickname(), closeStatus);
        
        // Remove session from game room
        Map<String, WebSocketSession> gameRoom = gameSessions.get(info.getGameId());
        if (gameRoom != null) {
            gameRoom.remove(session.getId());
            if (gameRoom.isEmpty()) {
                gameSessions.remove(info.getGameId());
                logger.info("Game room {} is now empty, removed from active games", info.getGameId());
            }
        }
        
        // Notify service about disconnection
        gameWebSocketService.handlePlayerLeft(info.getGameId(), info.getPlayerId(), info.getPlayerNickname());
        
        // Notify other players about the disconnection
        broadcastToGame(info.getGameId(), 
                       WebSocketMessage.playerLeft(info.getGameId(), info.getPlayerId(), info.getPlayerNickname()), 
                       null);
    }

    @Override
    public boolean supportsPartialMessages() {
        return false;
    }
    
    /**
     * Handle specific game-related messages
     */
    private void handleGameMessage(WebSocketSession session, WebSocketMessage wsMessage) {
        switch (wsMessage.getType()) {
            case MOVE:
                gameWebSocketService.handleMove(wsMessage, this::broadcastToGame);
                break;
                
            case CHAT:
                gameWebSocketService.handleChat(wsMessage, this::broadcastToGame);
                break;
                
            case RESTART_REQUEST:
                gameWebSocketService.handleRestartRequest(wsMessage, this::broadcastToGame);
                break;
                
            case SYNC_REQUEST:
                gameWebSocketService.sendGameStateToPlayer(wsMessage.getGameId(), session);
                break;
                
            case HEARTBEAT:
                // Respond to heartbeat
                sendToSession(session, WebSocketMessage.heartbeatResponse(wsMessage.getGameId()));
                break;
                
            default:
                logger.warn("Unknown message type: {} from player: {}", 
                           wsMessage.getType(), wsMessage.getPlayerNickname());
                sendErrorToSession(session, "Unknown message type: " + wsMessage.getType());
        }
    }
    
    /**
     * Broadcast message to all players in a game
     */
    public void broadcastToGame(String gameId, WebSocketMessage message, String excludeSessionId) {
        Map<String, WebSocketSession> gameRoom = gameSessions.get(gameId);
        if (gameRoom == null || gameRoom.isEmpty()) {
            logger.debug("No active sessions for game: {}", gameId);
            return;
        }
        
        String messageJson;
        try {
            messageJson = objectMapper.writeValueAsString(message);
        } catch (Exception e) {
            logger.error("Error serializing message for broadcast: {}", e.getMessage());
            return;
        }
        
        gameRoom.forEach((sessionId, session) -> {
            if (excludeSessionId != null && excludeSessionId.equals(sessionId)) {
                return; // Skip excluded session
            }
            
            try {
                if (session.isOpen()) {
                    session.sendMessage(new TextMessage(messageJson));
                } else {
                    logger.debug("Session {} is closed, removing from game room", sessionId);
                    gameRoom.remove(sessionId);
                }
            } catch (IOException e) {
                logger.error("Error sending message to session {}: {}", sessionId, e.getMessage());
                gameRoom.remove(sessionId);
            }
        });
    }
    
    /**
     * Send message to specific session
     */
    public void sendToSession(WebSocketSession session, WebSocketMessage message) {
        if (!session.isOpen()) {
            logger.debug("Session {} is closed, cannot send message", session.getId());
            return;
        }
        
        try {
            String messageJson = objectMapper.writeValueAsString(message);
            session.sendMessage(new TextMessage(messageJson));
        } catch (IOException e) {
            logger.error("Error sending message to session {}: {}", session.getId(), e.getMessage());
        }
    }
    
    /**
     * Send error message to specific session
     */
    private void sendErrorToSession(WebSocketSession session, String errorMessage) {
        GameSessionInfo info = sessionInfo.get(session.getId());
        String gameId = info != null ? info.getGameId() : null;
        sendToSession(session, WebSocketMessage.error(gameId, errorMessage));
    }
    
    /**
     * Extract game ID from WebSocket session URI
     */
    private String extractGameIdFromSession(WebSocketSession session) {
        URI uri = session.getUri();
        if (uri != null) {
            String path = uri.getPath();
            // Path format: /ws/game/{gameId}
            String[] pathParts = path.split("/");
            if (pathParts.length >= 3) {
                return pathParts[pathParts.length - 1]; // Last part is gameId
            }
        }
        throw new IllegalArgumentException("Cannot extract gameId from session URI: " + uri);
    }
    
    /**
     * Extract player ID from session attributes or headers
     */
    private String extractPlayerIdFromSession(WebSocketSession session) {
        // Try to get from handshake headers first
        String playerId = getHeaderValue(session, "X-Player-Id");
        if (playerId != null) {
            return playerId;
        }
        
        // Fallback: generate a temporary ID
        return "temp_" + session.getId().substring(0, 8);
    }
    
    /**
     * Extract player nickname from session attributes or headers
     */
    private String extractPlayerNicknameFromSession(WebSocketSession session) {
        // Try to get from handshake headers
        String nickname = getHeaderValue(session, "X-Player-Nickname");
        if (nickname != null) {
            return nickname;
        }
        
        // Fallback: use "Guest" + session ID
        return "Guest_" + session.getId().substring(0, 6);
    }
    
    /**
     * Get header value from WebSocket handshake
     */
    private String getHeaderValue(WebSocketSession session, String headerName) {
        return session.getHandshakeHeaders().getFirst(headerName);
    }
    
    /**
     * Get number of active sessions for a game
     */
    public int getActiveSessionCount(String gameId) {
        Map<String, WebSocketSession> gameRoom = gameSessions.get(gameId);
        return gameRoom != null ? gameRoom.size() : 0;
    }
    
    /**
     * Get all active game IDs
     */
    public java.util.Set<String> getActiveGameIds() {
        return gameSessions.keySet();
    }
    
    /**
     * Inner class to store session metadata
     */
    private static class GameSessionInfo {
        private final String gameId;
        private final String playerId;
        private final String playerNickname;
        
        public GameSessionInfo(String gameId, String playerId, String playerNickname) {
            this.gameId = gameId;
            this.playerId = playerId;
            this.playerNickname = playerNickname;
        }
        
        public String getGameId() { return gameId; }
        public String getPlayerId() { return playerId; }
        public String getPlayerNickname() { return playerNickname; }
    }
}