package org.onlinecheckers.backend.controllers;

import org.onlinecheckers.backend.model.dtos.websocket.*;
import org.onlinecheckers.backend.model.dtos.MoveDto;
import org.onlinecheckers.backend.model.dtos.MessageDto;
import org.onlinecheckers.backend.model.dtos.PlayerRestartDto;
import org.onlinecheckers.backend.services.MoveService;
import org.onlinecheckers.backend.services.GameService;
import org.onlinecheckers.backend.services.RestartService;
import org.onlinecheckers.backend.repositories.GameRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;
import java.util.Map;
import java.util.Set;

@Component
public class GameWebSocketHandler implements WebSocketHandler {

    @Autowired
    private MoveService moveService;
    
    @Autowired
    private GameService gameService;
    
    @Autowired
    private RestartService restartService;
    
    @Autowired
    private GameRepository gameRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();
    
    // gameId -> Set of WebSocket sessions for that game
    private final Map<String, Set<WebSocketSession>> gameRooms = new ConcurrentHashMap<>();
    
    // sessionId -> gameId for cleanup
    private final Map<String, String> sessionToGame = new ConcurrentHashMap<>();
    
    // sessionId -> playerId for identification
    private final Map<String, String> sessionToPlayer = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        System.out.println("WebSocket connection established: " + session.getId());
    }

    @Override
    public void handleMessage(WebSocketSession session, WebSocketMessage<?> message) throws Exception {
        try {
            // Extract the text payload from Spring's WebSocketMessage
            String messageText = ((TextMessage) message).getPayload();
            System.out.println("Raw message received: " + messageText);
            
            // Parse into our custom GameWebSocketMessage using polymorphic deserialization
            GameWebSocketMessage wsMessage = objectMapper.readValue(messageText, GameWebSocketMessage.class);
            
            System.out.println("Parsed message class: " + wsMessage.getClass().getName());
            System.out.println("Game ID: " + wsMessage.getGameId());
            System.out.println("Player ID: " + wsMessage.getPlayerId());
            
            // Use instanceof instead of string comparison
            if (wsMessage instanceof SubscribeGameMessage) {
                System.out.println("Handling SUBSCRIBE_GAME message");
                handleSubscribeGame(session, (SubscribeGameMessage) wsMessage);
            }
            else if (wsMessage instanceof MakeMoveMessage) {
                System.out.println("Handling MAKE_MOVE message");
                handleMakeMove(session, (MakeMoveMessage) wsMessage);
            }
            else if (wsMessage instanceof SendMessageMessage) {
                System.out.println("Handling SEND_MESSAGE message");
                handleSendMessage(session, (SendMessageMessage) wsMessage);
            }
            else if (wsMessage instanceof UpdateRestartStatusMessage) {
                System.out.println("Handling UPDATE_RESTART_STATUS message");
                handleUpdateRestartStatus(session, (UpdateRestartStatusMessage) wsMessage);
            }
            else if (wsMessage instanceof ResetGameMessage) {
                System.out.println("Handling RESET_GAME message");
                handleResetGame(session, (ResetGameMessage) wsMessage);
            }
            else {
                System.err.println("Unknown message type: " + wsMessage.getClass().getSimpleName());
                sendError(session, "Unknown message type: " + wsMessage.getClass().getSimpleName());
            }
        } catch (Exception e) {
            System.err.println("Error handling WebSocket message: " + e.getMessage());
            e.printStackTrace(); // This will show the full stack trace
            sendError(session, "Error processing message: " + e.getMessage());
        }
    }

    private void handleSubscribeGame(WebSocketSession session, SubscribeGameMessage message) throws Exception {
        String gameId = message.getGameId();
        String playerId = message.getPlayerId();
        
        // Add session to game room
        gameRooms.computeIfAbsent(gameId, k -> new CopyOnWriteArraySet<>()).add(session);
        sessionToGame.put(session.getId(), gameId);
        sessionToPlayer.put(session.getId(), playerId);
        
        // Send initial game state
        sendGameStateToSession(session, gameId);
        
        // Send initial restart status
        sendRestartStatusToSession(session, gameId);
        
        // Notify other players in the room
        broadcastToGame(gameId, new PlayerConnectionMessage("PLAYER_CONNECTED", playerId, gameId), session);

        // Broadcast game state to all players when someone connects
        broadcastGameStateToGame(gameId);
        
        System.out.println("Player " + playerId + " subscribed to game " + gameId);
    }

    private void handleMakeMove(WebSocketSession session, MakeMoveMessage message) throws Exception {
        try {
            // Convert to existing MoveDto format
            MoveDto moveDto = new MoveDto();
            moveDto.setFrom(message.getFrom());
            moveDto.setTo(message.getTo());
            moveDto.setPlayer(message.getPlayer());
            moveDto.setPath(message.getPath());
            
            // Use existing move service
            moveService.makeMove(message.getGameId(), moveDto);
            
            // Broadcast updated game state to all players in the game
            broadcastGameStateToGame(message.getGameId());
            
        } catch (Exception e) {
            sendError(session, "Move failed: " + e.getMessage());
        }
    }

    private void handleSendMessage(WebSocketSession session, SendMessageMessage message) throws Exception {
        try {
            // Convert to existing MessageDto format
            MessageDto messageDto = new MessageDto(message.getPlayerId(), message.getText());
            
            // Use existing game service (assuming it has a chat method)
            gameRepository.findById(message.getGameId()).ifPresent(game -> {
                game.setChat(game.getChat() + "<b>" + messageDto.player() + "</b>" + ": " + messageDto.text() + "\n");
                gameRepository.save(game);
            });
            
            // Broadcast updated game state (includes chat)
            broadcastGameStateToGame(message.getGameId());
            
        } catch (Exception e) {
            sendError(session, "Failed to send message: " + e.getMessage());
        }
    }

    private void handleUpdateRestartStatus(WebSocketSession session, UpdateRestartStatusMessage message) throws Exception {
        try {
            // Create PlayerRestartDto
            PlayerRestartDto status = new PlayerRestartDto();
            status.setGameID(message.getGameId());
            status.setNicknameW(message.getNicknameW());
            status.setNicknameB(message.getNicknameB());
            status.setRestartW(message.isRestartW());
            status.setRestartB(message.isRestartB());
            
            // Use existing restart service
            restartService.updateRestartStatus(status);
            
            // Broadcast updated restart status
            broadcastRestartStatusToGame(message.getGameId());
            
        } catch (Exception e) {
            sendError(session, "Failed to update restart status: " + e.getMessage());
        }
    }

    private void handleResetGame(WebSocketSession session, ResetGameMessage message) throws Exception {
        try {
            // Use existing game service reset method
            gameRepository.findById(message.getGameId()).ifPresent(game -> {
                game.setBoard(game.getBOARDINIT());
                game.setTurno(org.onlinecheckers.backend.model.entities.enums.Team.WHITE);
                game.setPedineB(12);
                game.setPedineW(12);
                game.setDamaW(0);
                game.setDamaB(0);
                game.setPartitaTerminata(false);
                game.setVincitore(org.onlinecheckers.backend.model.entities.enums.Team.NONE);
                game.getCronologiaMosse().clear();
                gameRepository.save(game);
            });
            
            // Reset restart status
            restartService.resetPlayerRestart(message.getGameId());
            
            // Broadcast updated game state
            broadcastGameStateToGame(message.getGameId());
            broadcastRestartStatusToGame(message.getGameId());
            
        } catch (Exception e) {
            sendError(session, "Failed to reset game: " + e.getMessage());
        }
    }

    private void sendGameStateToSession(WebSocketSession session, String gameId) throws Exception {
        var gameState = gameService.getGame(gameId);
        GameStateUpdateMessage message = new GameStateUpdateMessage("GAME_STATE_UPDATE", gameState);
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(message)));
    }

    private void sendRestartStatusToSession(WebSocketSession session, String gameId) throws Exception {
        try {
            var restartStatus = restartService.getRestartStatus(gameId);
            RestartStatusUpdateMessage message = new RestartStatusUpdateMessage("RESTART_STATUS_UPDATE", restartStatus);
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(message)));
        } catch (Exception e) {

        }
    }

    private void broadcastGameStateToGame(String gameId) throws Exception {
        var gameState = gameService.getGame(gameId);
        GameStateUpdateMessage message = new GameStateUpdateMessage("GAME_STATE_UPDATE", gameState);
        broadcastToGame(gameId, message, null);
    }

    private void broadcastRestartStatusToGame(String gameId) throws Exception {
        try {
            var restartStatus = restartService.getRestartStatus(gameId);
            RestartStatusUpdateMessage message = new RestartStatusUpdateMessage("RESTART_STATUS_UPDATE", restartStatus);
            broadcastToGame(gameId, message, null);
        } catch (Exception e) {

        }
    }

    private void broadcastToGame(String gameId, Object message, WebSocketSession excludeSession) throws Exception {
        Set<WebSocketSession> sessions = gameRooms.get(gameId);
        if (sessions != null) {
            String messageJson = objectMapper.writeValueAsString(message);
            for (WebSocketSession session : sessions) {
                if (session != excludeSession && session.isOpen()) {
                    try {
                        session.sendMessage(new TextMessage(messageJson));
                    } catch (Exception e) {
                        System.err.println("Failed to send message to session: " + e.getMessage());
                        // Remove failed session
                        sessions.remove(session);
                        cleanup(session);
                    }
                }
            }
        }
    }

    private void sendError(WebSocketSession session, String errorMessage) throws Exception {
        ErrorMessage error = new ErrorMessage("ERROR", errorMessage, "GENERAL_ERROR");
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(error)));
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        System.err.println("WebSocket transport error for session " + session.getId() + ": " + exception.getMessage());
        cleanup(session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus closeStatus) throws Exception {
        System.out.println("WebSocket connection closed: " + session.getId() + ", status: " + closeStatus);
        
        String gameId = sessionToGame.get(session.getId());
        String playerId = sessionToPlayer.get(session.getId());
        
        if (gameId != null && playerId != null) {
            // Notify other players
            broadcastToGame(gameId, new PlayerConnectionMessage("PLAYER_DISCONNECTED", playerId, gameId), session);
        }
        
        cleanup(session);
    }

    private void cleanup(WebSocketSession session) {
        String gameId = sessionToGame.remove(session.getId());
        String playerId = sessionToPlayer.remove(session.getId());
        
        if (gameId != null) {
            Set<WebSocketSession> sessions = gameRooms.get(gameId);
            if (sessions != null) {
                sessions.remove(session);
                if (sessions.isEmpty()) {
                    gameRooms.remove(gameId);
                }
            }
        }
    }

    @Override
    public boolean supportsPartialMessages() {
        return false;
    }
}