package org.onlinecheckers.apiserver.repositories;

import org.onlinecheckers.apiserver.model.entities.Game;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface GameRepository extends JpaRepository<Game, String> {
    
    /**
     * Find a game by ID with eagerly loaded authorized sessions.
     * 
     * @param gameId The ID of the game to find
     * @return Optional containing the game with loaded authorized sessions, or empty if not found
     */
    @Query("SELECT g FROM Game g LEFT JOIN FETCH g.authorizedSessions WHERE g.id = :gameId")
    Optional<Game> findByIdWithAuthorizedSessions(@Param("gameId") String gameId);

    /**
     * Find a game by ID with both authorized sessions and players eagerly loaded.
     * 
     * @param gameId The ID of the game to find
     * @return Optional containing the game with loaded authorized sessions and players, or empty if not found
     */
    @Query("SELECT g FROM Game g LEFT JOIN FETCH g.authorizedSessions LEFT JOIN FETCH g.players WHERE g.id = :gameId")
    Optional<Game> findByIdWithAuthorizedSessionsAndPlayers(@Param("gameId") String gameId);

    /**
     * Find a game by ID with all collections eagerly loaded (authorizedSessions, players, spectatorSessions).
     * 
     * @param gameId The ID of the game to find
     * @return Optional containing the game with all collections loaded, or empty if not found
     */
    @Query(
        "SELECT DISTINCT g FROM Game g " +
        "LEFT JOIN FETCH g.authorizedSessions " +
        "LEFT JOIN FETCH g.players " +
        "LEFT JOIN FETCH g.spectatorSessions " +
        "WHERE g.id = :gameId"
    )
    Optional<Game> findByIdWithAllCollections(@Param("gameId") String gameId);
}