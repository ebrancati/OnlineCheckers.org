package org.onlinecheckers.backend.services;

import org.onlinecheckers.backend.model.daos.GameDao;
import org.onlinecheckers.backend.model.daos.PlayerRestartDao;
import org.onlinecheckers.backend.model.dtos.MoveDto;
import org.onlinecheckers.backend.model.dtos.PlayerRestartDto;
import org.onlinecheckers.backend.model.entities.Game;
import org.onlinecheckers.backend.model.entities.enums.Team;
import org.onlinecheckers.backend.websocket.WebSocketMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.WebSocketSession;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class GameWebSocketService {
    
    private static final Logger logger = LoggerFactory.getLogger(GameWebSocketService.class);
    
    @Autowired
    private GameDao gameDao;
    
    @Autowired
    private PlayerRestartDao playerRestartDao;
    
    @Autowired
    private MoveService moveService;
    
    /**
     * Handle player move via WebSocket
     */
    public void handleMove(WebSocketMessage message, TriConsumer<String, WebSocketMessage, String> broadcaster) {
        try {
            String gameId = message.getGameId();
            Map<String, Object> data = message.getData();
            
            if (data == null) {
                logger.error("Move message has no data");
                return;
            }
            
            // Extract move data
            String from = (String) data.get("from");
            String to = (String) data.get("to");
            String player = (String) data.get("player");
            @SuppressWarnings("unchecked")
            List<String> path = (List<String>) data.get("path");
            
            // Create MoveDto
            MoveDto moveDto = new MoveDto();
            moveDto.setFrom(from);
            moveDto.setTo(to);
            moveDto.setPlayer(player);
            moveDto.setPath(path);
            
            logger.info("Processing move: {} -> {} by player {} in game {}", from, to, player, gameId);
            
            // Process move through existing move service
            Game updatedGame = moveService.makeMove(gameId, moveDto);
            
            // Reset restart status when a move is made
            resetRestartStatus(gameId);
            
            // Broadcast updated game state to all players
            Map<String, Object> gameStateData = convertGameToMap(updatedGame);
            WebSocketMessage gameUpdateMessage = WebSocketMessage.gameUpdate(gameId, gameStateData);
            broadcaster.accept(gameId, gameUpdateMessage, null);
            
            logger.info("Move processed successfully for game {}", gameId);
            
        } catch (Exception e) {
            logger.error("Error processing move: {}", e.getMessage(), e);
            // Send error back to the player who made the move
            WebSocketMessage errorMessage = WebSocketMessage.error(message.getGameId(), 
                                                                  "Move failed: " + e.getMessage());
            broadcaster.accept(message.getGameId(), errorMessage, null);
        }
    }
    
    /**
     * Handle chat message via WebSocket
     */
    public void handleChat(WebSocketMessage message, TriConsumer<String, WebSocketMessage, String> broadcaster) {
        try {
            String gameId = message.getGameId();
            String playerNickname = message.getPlayerNickname();
            Map<String, Object> data = message.getData();
            
            if (data == null) {
                logger.error("Chat message has no data");
                return;
            }
            
            String text = (String) data.get("text");
            if (text == null || text.trim().isEmpty()) {
                logger.warn("Empty chat message from player {}", playerNickname);
                return;
            }
            
            logger.info("Processing chat message from {} in game {}: {}", playerNickname, gameId, text);
            
            // Update game chat
            Game game = gameDao.findById(gameId).orElse(null);
            if (game != null) {
                String chatEntry = "<b>" + playerNickname + "</b>: " + text + "\n";
                game.setChat(game.getChat() + chatEntry);
                gameDao.save(game);
                
                // Broadcast chat message to all players
                WebSocketMessage chatMessage = WebSocketMessage.chatMessage(gameId, message.getPlayerId(), 
                                                                           playerNickname, text);
                broadcaster.accept(gameId, chatMessage, null);
                
                logger.info("Chat message processed successfully for game {}", gameId);
            } else {
                logger.error("Game not found for chat message: {}", gameId);
            }
            
        } catch (Exception e) {
            logger.error("Error processing chat message: {}", e.getMessage(), e);
        }
    }
    
    /**
     * Handle restart request via WebSocket
     */
    public void handleRestartRequest(WebSocketMessage message, TriConsumer<String, WebSocketMessage, String> broadcaster) {
        try {
            String gameId = message.getGameId();
            String playerNickname = message.getPlayerNickname();
            
            logger.info("Processing restart request from {} in game {}", playerNickname, gameId);
            
            // Get current restart status
            PlayerRestartDto restartStatus = playerRestartDao.findById(gameId).orElse(null);
            if (restartStatus == null) {
                logger.error("Restart status not found for game: {}", gameId);
                return;
            }
            
            // Update restart status based on player
            boolean updated = false;
            if (restartStatus.getNicknameW().equals(playerNickname)) {
                restartStatus.setRestartW(true);
                updated = true;
            } else if (restartStatus.getNicknameB().equals(playerNickname)) {
                restartStatus.setRestartB(true);
                updated = true;
            }
            
            if (updated) {
                playerRestartDao.save(restartStatus);
                
                // Broadcast restart status update
                Map<String, Object> statusData = convertRestartStatusToMap(restartStatus);
                WebSocketMessage statusMessage = WebSocketMessage.restartStatusUpdate(gameId, statusData);
                broadcaster.accept(gameId, statusMessage, null);
                
                // Check if both players want to restart
                if (restartStatus.isRestartW() && restartStatus.isRestartB()) {
                    // Reset the game
                    Game game = gameDao.findById(gameId).orElse(null);
                    if (game != null) {
                        resetGame(game);
                        gameDao.save(game);
                        
                        // Reset restart status
                        restartStatus.setRestartW(false);
                        restartStatus.setRestartB(false);
                        playerRestartDao.save(restartStatus);
                        
                        // Broadcast game reset
                        Map<String, Object> gameStateData = convertGameToMap(game);
                        WebSocketMessage resetMessage = WebSocketMessage.gameUpdate(gameId, gameStateData);
                        broadcaster.accept(gameId, resetMessage, null);
                        
                        // Also send explicit reset notification
                        WebSocketMessage gameResetMessage = WebSocketMessage.gameReset(gameId);
                        broadcaster.accept(gameId, gameResetMessage, null);
                        
                        logger.info("Game {} has been reset by mutual agreement", gameId);
                    }
                }
                
                logger.info("Restart request processed for game {}", gameId);
            } else {
                logger.warn("Player {} not found in restart status for game {}", playerNickname, gameId);
            }
            
        } catch (Exception e) {
            logger.error("Error processing restart request: {}", e.getMessage(), e);
        }
    }
    
    /**
     * Send current game state to a specific player
     */
    public void sendGameStateToPlayer(String gameId, WebSocketSession session) {
        try {
            Game game = gameDao.findById(gameId).orElse(null);
            if (game == null) {
                logger.error("Game not found: {}", gameId);
                return;
            }
            
            //Map<String, Object> gameStateData = convertGameToMap(game);
            //WebSocketMessage fullSyncMessage = new WebSocketMessage(WebSocketMessage.MessageType.FULL_SYNC, 
            //                                                       gameId, gameStateData);
            
            // Send directly to the session (this would be implemented in the handler)
            logger.info("Sending full game state to player in game {}", gameId);
            
        } catch (Exception e) {
            logger.error("Error sending game state to player: {}", e.getMessage(), e);
        }
    }
    
    /**
     * Handle player joined event
     */
    public void handlePlayerJoined(String gameId, String playerId, String playerNickname) {
        logger.info("Player {} ({}) joined game {}", playerNickname, playerId, gameId);
        // Additional logic for player joining can be added here
    }
    
    /**
     * Handle player left event
     */
    public void handlePlayerLeft(String gameId, String playerId, String playerNickname) {
        logger.info("Player {} ({}) left game {}", playerNickname, playerId, gameId);
        // Additional logic for player leaving can be added here
        // e.g., pause game, notify other players, etc.
    }
    
    /**
     * Convert Game entity to Map for WebSocket message
     */
    private Map<String, Object> convertGameToMap(Game game) {
        Map<String, Object> gameData = new HashMap<>();
        gameData.put("id", game.getId());
        gameData.put("board", game.getBoard());
        gameData.put("turno", game.getTurno().name());
        gameData.put("pedineW", game.getPedineW());
        gameData.put("pedineB", game.getPedineB());
        gameData.put("damaW", game.getDamaW());
        gameData.put("damaB", game.getDamaB());
        gameData.put("partitaTerminata", game.isPartitaTerminata());
        gameData.put("vincitore", game.getVincitore().name());
        gameData.put("players", game.getPlayers());
        gameData.put("chat", game.getChat());
        gameData.put("cronologiaMosse", game.getCronologiaMosse());
        gameData.put("lastMultiCapturePath", game.getLastMultiCapturePath());
        return gameData;
    }
    
    /**
     * Convert PlayerRestartDto to Map for WebSocket message
     */
    private Map<String, Object> convertRestartStatusToMap(PlayerRestartDto restartStatus) {
        Map<String, Object> statusData = new HashMap<>();
        statusData.put("gameID", restartStatus.getGameID());
        statusData.put("nicknameB", restartStatus.getNicknameB());
        statusData.put("nicknameW", restartStatus.getNicknameW());
        statusData.put("restartB", restartStatus.isRestartB());
        statusData.put("restartW", restartStatus.isRestartW());
        return statusData;
    }
    
    /**
     * Reset game to initial state
     */
    private void resetGame(Game game) {
        game.setBoard(game.getBOARDINIT());
        game.setTurno(Team.WHITE);
        game.setPedineB(12);
        game.setPedineW(12);
        game.setDamaW(0);
        game.setDamaB(0);
        game.setPartitaTerminata(false);
        game.setVincitore(Team.NONE);
        game.getCronologiaMosse().clear();
        game.setLastMultiCapturePath(null);
        // Keep chat history but add a separator
        game.setChat(game.getChat() + "--- " + "Game Restarted" + " ---\n");
    }
    
    /**
     * Reset restart status when a move is made
     */
    private void resetRestartStatus(String gameId) {
        try {
            PlayerRestartDto restartStatus = playerRestartDao.findById(gameId).orElse(null);
            if (restartStatus != null && (restartStatus.isRestartW() || restartStatus.isRestartB())) {
                restartStatus.setRestartW(false);
                restartStatus.setRestartB(false);
                playerRestartDao.save(restartStatus);
                logger.info("Reset restart status for game {} due to move", gameId);
            }
        } catch (Exception e) {
            logger.error("Error resetting restart status: {}", e.getMessage());
        }
    }
    
    /**
     * Functional interface for tri-consumer (broadcaster function)
     */
    @FunctionalInterface
    public interface TriConsumer<T, U, V> {
        void accept(T t, U u, V v);
    }
}