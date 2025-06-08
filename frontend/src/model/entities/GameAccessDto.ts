import { GameResponse } from './GameResponse';

export interface GameAccessDto {
  gameId: string;
  role: 'PLAYER' | 'SPECTATOR';
  gameState: GameResponse;
  message?: string;
}