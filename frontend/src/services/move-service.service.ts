import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MoveP } from '../model/entities/MoveP';
import { GameResponse } from '../app/components/online-board/online-board.component';

@Injectable({
  providedIn: 'root'
})
export class MoveServiceService {

  constructor(private http:HttpClient) {}

  saveMove(move: MoveP, gameID:string) {
    return this.http.post<GameResponse>(`/api/games/${gameID}/move`, move);
  }
}
