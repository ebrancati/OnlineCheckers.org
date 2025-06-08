package org.onlinecheckers.apiserver.model.dtos;

/**
 * DTO that includes game state and user's access level (PLAYER or SPECTATOR)
 */
public record GameAccessDto(
    String gameId,
    String role,        // "PLAYER" or "SPECTATOR"
    GameDto gameState,
    String message      // Optional message for the user
) {
    // Constructor senza messaggio (per compatibilità)
    public GameAccessDto(String gameId, String role, GameDto gameState) {
        this(gameId, role, gameState, null);
    }
}