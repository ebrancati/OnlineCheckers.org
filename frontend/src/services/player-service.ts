import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Player } from '../model/entities/player';

@Injectable({ providedIn: 'root' })
export class PlayerService {
  constructor(private http: HttpClient) {}

  createPlayer(nickname: Player) {
    return this.http.post<Player>(`/api/players/create`, nickname);
  }
}
