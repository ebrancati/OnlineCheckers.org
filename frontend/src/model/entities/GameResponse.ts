export interface PlayerDto {
  id: string;
  nickname: string;
  team: 'WHITE' | 'BLACK';
}

export interface GameResponse {
  chat: string;
  id: string;
  board: string[][];
  turno: 'WHITE' | 'BLACK' | 'NONE';
  pedineW: number;
  pedineB: number;
  damaW: number;
  damaB: number;
  partitaTerminata: boolean;
  vincitore: 'WHITE' | 'BLACK' | 'NONE';
  players: PlayerDto[];
  cronologiaMosse: string[];
  lastMultiCapturePath?: string[];
}