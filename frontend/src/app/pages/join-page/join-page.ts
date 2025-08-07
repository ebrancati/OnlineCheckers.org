import { Component, OnInit, Inject, PLATFORM_ID  } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { switchMap, firstValueFrom } from 'rxjs';

import { PlayerService } from '../../../services/player-service';
import { GameService } from '../../../services/game-service';

import { Player } from '../../../model/entities/player';


@Component({
  selector: 'join-page',
  imports: [ FormsModule ],
  templateUrl: './join-page.html'
})
export class JoinPage implements OnInit {
  step = 1;
  nickname: string | null = null;
  gameId!: string;
  selfPlayError = false;

  showError = false;
  errorCode: string | undefined;

  constructor(
    private route: ActivatedRoute,
    private playerSvc: PlayerService,
    private gameSvc: GameService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  closeError() {
    this.showError = false;
  }

  ngOnInit() {
    this.gameId = this.route.snapshot.paramMap.get('gameId')!;
    
    // Preload nickname from localStorage if available
    if (isPlatformBrowser(this.platformId))
      this.nickname = localStorage.getItem('nickname');
  }

  onNickname() {
    // check the game status before proceeding
    this.checkGameStatus().then(result => {
      if (!result.canJoin) {
        // Set the appropriate error code
        this.errorCode = result.errorCode;
        this.showError = true;
      } else {
        // Proceed to the next step
        this.step = 2;
      }
    });
  }

  private async checkGameStatus(): Promise<{ canJoin: boolean, errorCode?: string }> {
    try {
      // Get game state from server
      const gameAccess = await firstValueFrom(this.gameSvc.getGameState(this.gameId));
      
      // CASE 1: Check if the match exists
      if (!gameAccess || !gameAccess.gameState) {
        return { canJoin: false, errorCode: 'GAME_NOT_FOUND' };
      }
      
      // CASE 2: Check if the game is already full (already has two players)
      if (gameAccess.gameState.players && gameAccess.gameState.players.length >= 2) {
        return { canJoin: false, errorCode: 'GAME_FULL' };
      }
      
      // CASE 3: Check if the user is trying to play against himself
      const creatorNickname = gameAccess.gameState.players && gameAccess.gameState.players.length > 0 ? 
                              gameAccess.gameState.players[0].nickname : null;

      if (isPlatformBrowser(this.platformId))
        this.nickname = localStorage.getItem('nickname');
      
      if (creatorNickname && this.nickname === creatorNickname)
        return { canJoin: false, errorCode: 'SELF_PLAY' };
      
      // If no checks fail, the user can join the game
      return { canJoin: true };
    }
    catch (error) {
      console.error('Errore durante il controllo dello stato del gioco:', error);
      return { canJoin: false, errorCode: 'SERVER_ERROR' };
    }
  }

  onJoin() {
    // Check again before sending the join request
    this.checkGameStatus().then(result => {
      if (!result.canJoin) {
        this.errorCode = result.errorCode;
        this.showError = true;
        return;
      }
      
      // Proceed with the join
      
      if (isPlatformBrowser(this.platformId))
        localStorage.setItem('nickname', this.nickname || "anonymous");
      
      const dto: Player = { nickname: this.nickname || "anonymous" };

      this.playerSvc.createPlayer(dto).pipe(
        switchMap(() => this.gameSvc.joinGame(this.gameId, dto))
      ).subscribe({
        next: () => {
          this.router.navigate(['/game', this.gameId]);
        },
        error: err => {
          console.error('Errore join:', err);
          this.errorCode = 'JOIN_FAILED';
          this.showError = true;
        }
      });
    });
  }

  goToCPUMode() {
    this.router.navigate(['/play/computer']);
  }

  goToNewGame() {
    this.router.navigate(['/login']);
  }

  // Method to close the error message
  closeSelfPlayError() {
    this.selfPlayError = false;
  }
}