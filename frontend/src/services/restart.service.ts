import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Interfaccia che rappresenta lo stato di riavvio dei giocatori
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
   * Ottiene lo stato di riavvio corrente per una partita specifica
   * @param gameId - ID della partita
   * @returns Observable con lo stato di riavvio
   */
  getRestartStatus(gameId: string): Observable<PlayerRestartStatus> {
    return this.http.get<PlayerRestartStatus>(`/api/restartStatus/${gameId}/`);
  }

  /**
   * Aggiorna lo stato di riavvio di un giocatore
   * @param status - Oggetto con lo stato aggiornato di riavvio
   * @returns Observable con la risposta
   */
  updateRestartStatus(status: PlayerRestartStatus): Observable<any> {
    return this.http.post(`/api/restartStatus/${status.gameID}`, status);
  }

  /**
   * Resetta la partita quando entrambi i giocatori hanno accettato
   * @param gameId - ID della partita da resettare
   * @returns Observable con la risposta
   */
  resetGame(gameId: string): Observable<any> {
    return this.http.post(`/api/games/${gameId}/reset`, {});
  }

  /**
   * Utilitario per determinare se il giocatore corrente è il bianco
   * @param status - Stato di riavvio
   * @param nickname - Nickname del giocatore corrente
   * @returns true se il giocatore è il bianco
   */
  isWhitePlayer(status: PlayerRestartStatus, nickname: string | null): boolean {
    return nickname === status.nicknameW;
  }

  /**
   * Utilitario per determinare se il giocatore corrente è il nero
   * @param status - Stato di riavvio
   * @param nickname - Nickname del giocatore corrente
   * @returns true se il giocatore è il nero
   */
  isBlackPlayer(status: PlayerRestartStatus, nickname: string | null): boolean {
    return nickname === status.nicknameB;
  }

  /**
   * Aggiorna lo stato di riavvio del giocatore bianco
   * @param status - Stato di riavvio corrente
   * @param wantsRestart - Nuovo valore
   * @returns Nuovo oggetto stato con il valore aggiornato
   */
  setWhitePlayerRestart(status: PlayerRestartStatus, wantsRestart: boolean): PlayerRestartStatus {
    return {
      ...status,
      restartW: wantsRestart
    };
  }

  /**
   * Aggiorna lo stato di riavvio del giocatore nero
   * @param status - Stato di riavvio corrente
   * @param wantsRestart - Nuovo valore
   * @returns Nuovo oggetto stato con il valore aggiornato
   */
  setBlackPlayerRestart(status: PlayerRestartStatus, wantsRestart: boolean): PlayerRestartStatus {
    return {
      ...status,
      restartB: wantsRestart
    };
  }

  /**
   * Verifica se entrambi i giocatori hanno richiesto il riavvio
   * @param status - Stato di riavvio
   * @returns true se entrambi i giocatori vogliono riavviare
   */
  bothPlayersWantRestart(status: PlayerRestartStatus,): boolean {
    return status.restartB && status.restartW;
  }

  resetPlayerRestart(gameId:string) {
    return this.http.post<PlayerRestartStatus>(`/api/restartStatus/${gameId}/restart`, {});
  }

}
