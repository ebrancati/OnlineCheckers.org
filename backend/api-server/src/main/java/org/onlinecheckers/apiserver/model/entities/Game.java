package org.onlinecheckers.apiserver.model.entities;

import jakarta.persistence.*;
import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Game extends SessionGame {

    @OneToMany(mappedBy = "game")
    List<Player> players = new ArrayList<>();

    @Column(columnDefinition = "TEXT")
    private String chat = "";

    @Column(columnDefinition = "TEXT")
    @Convert(converter = StringListConverter.class)
    private List<String> cronologiaMosse = new ArrayList<>();

    @Column(columnDefinition = "TEXT")
    @Convert(converter = StringListConverter.class)
    private List<String> lastMultiCapturePath = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "game_authorized_sessions", joinColumns = @JoinColumn(name = "game_id"))
    @Column(name = "session_id")
    private Set<String> authorizedSessions = new HashSet<>();

    @ElementCollection
    @CollectionTable(name = "game_spectator_sessions", joinColumns = @JoinColumn(name = "game_id"))
    @Column(name = "session_id")
    private Set<String> spectatorSessions = new HashSet<>();

    public void addPlayer(Player p) {
        if (players.size() >= 2)
            throw new IllegalStateException("The game already has 2 players");

        players.add(p);
        p.setGame(this);
    }

    /**
     * Add a session ID to the list of authorized sessions that can interact with the game
     * @param sessionId The HTTP session ID to authorize
     */
    public void addAuthorizedSession(String sessionId) {
        if (sessionId != null && !sessionId.trim().isEmpty()) {
            this.authorizedSessions.add(sessionId);
        }
    }

    /**
     * Check if a session is authorized to interact with the game
     * @param sessionId The HTTP session ID to check
     * @return true if the session is authorized, false otherwise
     */
    public boolean isSessionAuthorized(String sessionId) {
        return sessionId != null && this.authorizedSessions.contains(sessionId);
    }

    /**
     * Check if a session is a spectator (not authorized to interact)
     * @param sessionId The HTTP session ID to check
     * @return true if the session is a spectator, false if authorized
     */
    public boolean isSpectator(String sessionId) {
        return !isSessionAuthorized(sessionId);
    }

    /**
     * Get all authorized session IDs for this game
     * @return Set of authorized session IDs
     */
    public Set<String> getAuthorizedSessions() {
        return new HashSet<>(this.authorizedSessions);
    }

    /**
     * Remove a session from authorized sessions (useful for cleanup)
     * @param sessionId The session ID to remove
     */
    public void removeAuthorizedSession(String sessionId) {
        this.authorizedSessions.remove(sessionId);
    }

    /**
     * Add a spectator session to the game
     * @param sessionId The HTTP session ID of the spectator
     */
    public void addSpectatorSession(String sessionId) {
        if (sessionId != null && !sessionId.trim().isEmpty()) {
            this.spectatorSessions.add(sessionId);
        }
    }

    /**
     * Remove a spectator session from the game
     * @param sessionId The HTTP session ID to remove
     */
    public void removeSpectatorSession(String sessionId) {
        this.spectatorSessions.remove(sessionId);
    }

    /**
     * Get the current number of spectators watching this game
     * @return Number of spectators
     */
    public int getSpectatorCount() {
        return this.spectatorSessions.size();
    }

    /**
     * Get all spectator session IDs
     * @return Set of spectator session IDs
     */
    public Set<String> getSpectatorSessions() {
        return new HashSet<>(this.spectatorSessions);
    }

    /**
     * Check if a session is a spectator
     * @param sessionId The session ID to check
     * @return true if the session is a spectator
     */
    public boolean isSpectatorSession(String sessionId) {
        return sessionId != null && this.spectatorSessions.contains(sessionId);
    }
}