package org.onlinecheckers.apiserver.repositories;

import org.onlinecheckers.apiserver.model.entities.Game;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface GameRepository extends JpaRepository<Game, String> {
    
    /**
     * Find a game by ID with eagerly loaded authorized sessions.
     * This prevents lazy loading exceptions when accessing authorizedSessions
     * outside of a transactional context (e.g., in WebSocket handlers).
     * 
     * @param gameId The ID of the game to find
     * @return Optional containing the game with loaded authorized sessions, or empty if not found
     */
    @Query("SELECT g FROM Game g LEFT JOIN FETCH g.authorizedSessions WHERE g.id = :gameId")
    Optional<Game> findByIdWithAuthorizedSessions(@Param("gameId") String gameId);
}