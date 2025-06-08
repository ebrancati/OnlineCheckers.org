package org.onlinecheckers.apiserver.services;

import org.onlinecheckers.apiserver.model.dtos.PlayerRestartDto;
import org.onlinecheckers.apiserver.repositories.PlayerRestartRepository;
import org.onlinecheckers.apiserver.exceptions.SessionGameNotFoundException;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;

@Service
public class RestartService {

    @Autowired
    private PlayerRestartRepository playerRestartRepository;

    /**
     * Get the restart status for a specific game
     * @param gameId - ID of the game
     * @return PlayerRestartDto with current restart status
     * @throws SessionGameNotFoundException if game not found
     */
    public PlayerRestartDto getRestartStatus(String gameId) {
        return playerRestartRepository.findById(gameId)
                .orElseThrow(() -> new SessionGameNotFoundException(gameId));
    }

    /**
     * Update the restart status for a game
     * @param status - Updated restart status
     * @return Saved PlayerRestartDto
     */
    public PlayerRestartDto updateRestartStatus(PlayerRestartDto status) {
        return playerRestartRepository.save(status);
    }

    /**
     * Reset the restart status for both players (set both flags to false)
     * @param gameId - ID of the game
     * @return Updated PlayerRestartDto with both restart flags set to false
     * @throws SessionGameNotFoundException if game not found
     */
    public PlayerRestartDto resetPlayerRestart(String gameId) {
        PlayerRestartDto restart = getRestartStatus(gameId);
        restart.setRestartB(false);
        restart.setRestartW(false);
        return playerRestartRepository.save(restart);
    }

    /**
     * Check if both players want to restart
     * @param status - Current restart status
     * @return true if both players have requested restart
     */
    public boolean bothPlayersWantRestart(PlayerRestartDto status) {
        return status.isRestartB() && status.isRestartW();
    }

    /**
     * Create initial restart status for a new game
     * @param gameId - ID of the game
     * @param nicknameW - White player nickname
     * @param nicknameB - Black player nickname
     * @return Created PlayerRestartDto
     */
    public PlayerRestartDto createInitialRestartStatus(String gameId, String nicknameW, String nicknameB) {
        PlayerRestartDto restartStatus = new PlayerRestartDto();
        restartStatus.setGameID(gameId);
        restartStatus.setNicknameW(nicknameW);
        restartStatus.setNicknameB(nicknameB);
        restartStatus.setRestartW(false);
        restartStatus.setRestartB(false);
        return playerRestartRepository.save(restartStatus);
    }

    /**
     * Update restart status for a specific player
     * @param gameId - ID of the game
     * @param playerNickname - Nickname of the player
     * @param wantsRestart - Whether the player wants to restart
     * @return Updated PlayerRestartDto
     */
    public PlayerRestartDto updatePlayerRestartStatus(String gameId, String playerNickname, boolean wantsRestart) {
        PlayerRestartDto status = getRestartStatus(gameId);
        
        if (playerNickname.equals(status.getNicknameW())) {
            status.setRestartW(wantsRestart);
        } else if (playerNickname.equals(status.getNicknameB())) {
            status.setRestartB(wantsRestart);
        } else {
            throw new IllegalArgumentException("Player " + playerNickname + " not found in game " + gameId);
        }
        
        return playerRestartRepository.save(status);
    }

    /**
     * Check if a specific player has requested restart
     * @param status - Current restart status
     * @param playerNickname - Nickname of the player to check
     * @return true if the player has requested restart
     */
    public boolean hasPlayerRequestedRestart(PlayerRestartDto status, String playerNickname) {
        if (playerNickname.equals(status.getNicknameW())) {
            return status.isRestartW();
        } else if (playerNickname.equals(status.getNicknameB())) {
            return status.isRestartB();
        }
        return false;
    }
}