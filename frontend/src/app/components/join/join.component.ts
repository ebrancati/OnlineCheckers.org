import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PlayerService } from '../../../services/player.service';
import { GameService } from '../../../services/game.service';
import { player } from '../../../model/entities/player';
import { switchMap, firstValueFrom } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-join',
  standalone: true,
  imports: [
    FormsModule, 
    NgIf, 
    NgSwitch, 
    NgSwitchCase, 
    NgSwitchDefault,
    TranslateModule,
  ],
  templateUrl: './join.component.html'
})
export class JoinComponent implements OnInit {
  step = 1;
  nickname = '';
  gameId!: string;
  selfPlayError = false;

  showError = false;
  errorCode: string | undefined;

  constructor(
    private route: ActivatedRoute,
    private playerSvc: PlayerService,
    private gameSvc: GameService,
    private router: Router
  ) {}

  closeError() {
    this.showError = false;
  }

  ngOnInit() {
    this.gameId = this.route.snapshot.paramMap.get('gameId')!;
    
    // Precarica il nickname dal localStorage se disponibile
    const savedNickname = localStorage.getItem('nickname');
    if (savedNickname) {
      this.nickname = savedNickname;
    }
  }

  onNickname() {
    // Verifica lo stato del gioco prima di procedere
    this.checkGameStatus().then(result => {
      if (!result.canJoin) {
        // Imposta il codice di errore appropriato
        this.errorCode = result.errorCode;
        this.showError = true;
      } else {
        // Procedi al passo successivo
        this.step = 2;
      }
    });
  }

  private async checkGameStatus(): Promise<{ canJoin: boolean, errorCode?: string }> {
    try {
      // Ottieni lo stato del gioco dal server
      const gameState = await firstValueFrom(this.gameSvc.getGameState(this.gameId));
      
      // CASO 1: Verifica se la partita esiste
      if (!gameState) {
        return { canJoin: false, errorCode: 'GAME_NOT_FOUND' };
      }
      
      // CASO 2: Verifica se la partita è già piena (ha già due giocatori)
      if (gameState.players && gameState.players.length >= 2) {
        return { canJoin: false, errorCode: 'GAME_FULL' };
      }
      
      // CASO 3: Verifica se l'utente sta tentando di giocare contro se stesso
      const creatorNickname = gameState.players && gameState.players.length > 0 ? 
                              gameState.players[0].nickname : null;
      const localStorageNickname = localStorage.getItem('nickname');
      
      if (creatorNickname && localStorageNickname === creatorNickname) {
        return { canJoin: false, errorCode: 'SELF_PLAY' };
      }
      
      // Se nessun controllo fallisce, l'utente può unirsi alla partita
      return { canJoin: true };
    } catch (error) {
      console.error('Errore durante il controllo dello stato del gioco:', error);
      return { canJoin: false, errorCode: 'SERVER_ERROR' };
    }
  }

  onJoin() {
    // Verifica nuovamente prima di inviare la richiesta di join
    this.checkGameStatus().then(result => {
      if (!result.canJoin) {
        this.errorCode = result.errorCode;
        this.showError = true;
        return;
      }
      
      // Procedi con il join
      localStorage.setItem('nickname', this.nickname);
      const dto: player = { nickname: this.nickname };
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

  // Funzione per verificare se l'utente sta tentando di giocare contro se stesso
  private async checkSelfPlay(): Promise<boolean> {
    try {
      // Ottieni lo stato del gioco dal server
      const gameState = await this.gameSvc.getGameState(this.gameId).toPromise();
      
      // Se non ci sono giocatori, non può essere self-play
      if (!gameState.players || gameState.players.length === 0) {
        return false;
      }
      
      // Verifica se il nickname nel localStorage corrisponde al nickname del giocatore 1
      const creatorNickname = gameState.players[0].nickname;
      const localStorageNickname = localStorage.getItem('nickname');
      
      // Se il nickname nel localStorage è uguale a quello del giocatore 1, è self-play
      return localStorageNickname === creatorNickname;
    } catch (error) {
      console.error('Errore durante il controllo self-play:', error);
      // In caso di errore, per sicurezza non blocchiamo il join
      return false;
    }
  }

  goToLocalMode() {
    this.router.navigate(['/locale']);
  }

  goToNewGame() {
    this.router.navigate(['/login']);
  }

  // Metodo per chiudere il messaggio di errore
  closeSelfPlayError() {
    this.selfPlayError = false;
  }
}