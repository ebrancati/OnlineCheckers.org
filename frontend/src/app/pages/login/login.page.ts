import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { GameService } from "../../../services/game.service";
import { PlayerService } from "../../../services/player.service";
import { FormsModule } from '@angular/forms';
import { switchMap, finalize } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'page-login',
  standalone: true,
  imports: [
    FormsModule, TranslateModule, NgIf
  ],
  templateUrl: './login.page.html',
})
export class LoginPage {
  nickname = '';
  joinGameId = '';
  preferredTeam = 'WHITE'; // Default a bianco
  isLoading = false; // Flag per controllare lo stato di caricamento

  constructor(
    private playerSvc: PlayerService,
    private gameSvc: GameService,
    private router: Router
  ) {}

  newGame() {
    this.isLoading = true;
    
    const player = { 
      nickname: this.nickname,
      preferredTeam: this.preferredTeam 
    };
    
    localStorage.setItem('nickname', this.nickname);
    
    this.playerSvc.createPlayer(player).pipe(
      switchMap(() => this.gameSvc.createGame(player)),
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (gs) => {
        this.router.navigate(['/game', gs.id]);
      },
      error: (err) => {
        console.error('Errore durante la creazione della partita:', err);
        this.isLoading = false;
      }
    });
  }

  join() {
    this.isLoading = true;
    
    const player = { nickname: this.nickname };
    localStorage.setItem('nickname', this.nickname);
    
    this.playerSvc.createPlayer(player).pipe(
      switchMap(() => this.gameSvc.joinGame(this.joinGameId, player)),
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (success) => {
        if (success) {
          this.router.navigate(['/game', this.joinGameId]);
        } else {
          console.error('Join fallito');
        }
      },
      error: err => {
        console.error('Errore join:', err);
        this.isLoading = false;
      }
    });
  }
}