import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Player } from '../model/entities/player';
import { GameState } from '../model/entities/game-state';
import { GameAccessDto } from '../model/entities/game-access-dto';

@Injectable({
  providedIn: 'root'
})
export class GameService {

  constructor(private http: HttpClient) {}

  getGameState(gameId: string): Observable<GameAccessDto> {
    return this.http.get<GameAccessDto>(`/api/games/${gameId}`);
  }

  createGame(player: Player) {
    return this.http.post<GameState>(`/api/games/create`, player);
  }

  joinGame(gameId: string, nickname: Player) {
    return this.http.post<boolean>(`/api/games/join/${gameId}`, nickname);
  }

  sendMessages(gameId: string, payload: { player: string | null; text: string }) {
    return this.http.post(`/api/games/${gameId}/chat`, payload);
  }

  deleteGame(gameId: string) {
    return this.http.delete(`/api/games/${gameId}`);
  }

  isSpectator(gameAccess: GameAccessDto): boolean {
    return gameAccess.role === 'SPECTATOR';
  }

  isPlayer(gameAccess: GameAccessDto): boolean {
    return gameAccess.role === 'PLAYER';
  }

  getUserMessage(gameAccess: GameAccessDto): string | null {
    return gameAccess.message || null;
  }
}