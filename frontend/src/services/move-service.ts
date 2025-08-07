import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { PieceMove } from '../model/entities/piece-move';
import { GameResponse } from '../model/entities/game-response'

@Injectable({
  providedIn: 'root'
})
export class MoveServiceService {

  constructor(private http:HttpClient) {}

  saveMove(move: PieceMove, gameID:string) {
    return this.http.post<GameResponse>(`/api/games/${gameID}/move`, move);
  }
}