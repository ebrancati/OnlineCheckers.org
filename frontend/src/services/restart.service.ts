import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
* Interface that represents the restart state of players
*/
export interface PlayerRestartStatus {
  gameID: string;
  nicknameB: string;
  nicknameW: string;
  restartB: boolean;
  restartW: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RestartService {

  constructor(private http: HttpClient) {}

  /**
  * Gets the current restart state for a specific game
  * @param gameId - Game ID
  * @returns Observable with the restart state
  */
  getRestartStatus(gameId: string): Observable<PlayerRestartStatus> {
    return this.http.get<PlayerRestartStatus>(`/api/restartStatus/${gameId}/`);
  }

  /**
  * Updates a player's restart status
  * @param status - Object with the updated restart status
  * @returns Observable with the response
  */
  updateRestartStatus(status: PlayerRestartStatus): Observable<any> {
    return this.http.post(`/api/restartStatus/${status.gameID}`, status);
  }

  /**
  * Resets the game when both players have accepted
  * @param gameId - Game ID to reset
  * @returns Observable with the response
  */
  resetGame(gameId: string): Observable<any> {
    return this.http.post(`/api/games/${gameId}/reset`, {});
  }

  /**
  * Utility to determine if the current player is white
  * @param status - Restart status
  * @param nickname - Nickname of the current player
  * @returns true if the player is white
  */
  isWhitePlayer(status: PlayerRestartStatus, nickname: string | null): boolean {
    return nickname === status.nicknameW;
  }

  /**
  * Utility to determine if the current player is black
  * @param status - Restart status
  * @param nickname - Nickname of the current player
  * @returns true if the player is black
  */
  isBlackPlayer(status: PlayerRestartStatus, nickname: string | null): boolean {
    return nickname === status.nicknameB;
  }

  /**
  * Updates the white player's restart status
  * @param status - Current restart status
  * @param wantsRestart - New value
  * @returns New state object with the updated value
  */
  setWhitePlayerRestart(status: PlayerRestartStatus, wantsRestart: boolean): PlayerRestartStatus {
    return {
      ...status,
      restartW: wantsRestart
    };
  }

  /**
  * Updates the black player's restart status
  * @param status - Current restart status
  * @param wantsRestart - New value
  * @returns New state object with the updated value
  */
  setBlackPlayerRestart(status: PlayerRestartStatus, wantsRestart: boolean): PlayerRestartStatus {
    return {
      ...status,
      restartB: wantsRestart
    };
  }

  /**
  * Check if both players have requested a restart
  * @param status - Restart status
  * @returns true if both players want to restart
  */
  bothPlayersWantRestart(status: PlayerRestartStatus,): boolean {
    return status.restartB && status.restartW;
  }

  resetPlayerRestart(gameId:string) {
    return this.http.post<PlayerRestartStatus>(`/api/restartStatus/${gameId}/restart`, {});
  }
}
