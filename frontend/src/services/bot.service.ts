// src/services/bot.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BotMoveRequest {
  board: string[][];
  playerColor: string;
  difficulty: number;
}

export interface BotMoveResponse {
  from: string;
  to: string;
  path?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class BotService {
  constructor(private http: HttpClient) {}

  calculateMove(request: BotMoveRequest): Observable<BotMoveResponse> {
    return this.http.post<BotMoveResponse>('/api/bot/move', request);
  }
}