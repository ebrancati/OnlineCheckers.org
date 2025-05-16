import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { player } from '../model/entities/player';

@Injectable({ providedIn: 'root' })
export class PlayerService {
  constructor(private http: HttpClient) {}

  createPlayer(nickname: player) {
    return this.http.post<player>(`/api/players/create`, nickname);
  }
}
