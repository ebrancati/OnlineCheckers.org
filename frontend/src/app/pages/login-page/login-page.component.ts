import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { GameService } from "../../../services/game.service";
import { PlayerService } from "../../../services/player.service";
import { FormsModule } from '@angular/forms';
import { switchMap, finalize } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'login-page',
  standalone: true,
  imports: [
    FormsModule, TranslateModule, NgIf
  ],
  templateUrl: './login-page.component.html',
  styleUrl:    './login-page.component.css'
})
export class LoginPage {
  nickname = '';
  joinGameId = '';
  preferredTeam = 'WHITE'; // Default
  isLoading = false; // Flag to control loading status

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
        console.error('Error creating game:', err);
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
          console.error('Join failed');
        }
      },
      error: err => {
        console.error('Error join:', err);
        this.isLoading = false;
      }
    });
  }
}