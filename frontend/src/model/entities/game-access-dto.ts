import { GameResponse } from './game-response';

export interface GameAccessDto {
  gameId: string;
  role: 'PLAYER' | 'SPECTATOR';
  gameState: GameResponse;
  message?: string;
}