import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { GameService } from "../../../services/game.service";
import { PlayerService } from "../../../services/player.service";
import { FormsModule } from '@angular/forms';
import { switchMap, finalize, catchError } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgIf } from '@angular/common';
import { of } from 'rxjs';

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
  
  // Nickname validation error handling
  showNicknameError = false;
  nicknameErrorMessage = '';

  constructor(
    private playerSvc: PlayerService,
    private gameSvc: GameService,
    private router: Router,
    private translate: TranslateService
  ) {}

  newGame() {
    // Clear previous errors
    this.clearNicknameError();
    
    this.isLoading = true;
    
    const player = { 
      nickname: this.nickname,
      preferredTeam: this.preferredTeam 
    };
    
    localStorage.setItem('nickname', this.nickname);
    
    this.playerSvc.createPlayer(player).pipe(
      switchMap((response: any) => {
        // Check if player creation was successful
        if (response.success === false) {
          // Handle nickname validation error
          this.handleNicknameValidationError(response);
          return of(null); // Return null to stop the chain
        }
        // Proceed with game creation if nickname is valid
        return this.gameSvc.createGame(player);
      }),
      finalize(() => this.isLoading = false),
      catchError((error) => {
        console.error('Error creating game:', error);
        
        // Check if it's a nickname validation error
        if (error.status === 400 && error.error) {
          this.handleNicknameValidationError(error.error);
        } else {
          // Generic error handling
          this.showNicknameError = true;
          this.nicknameErrorMessage = 'An unexpected error occurred. Please try again.';
        }
        
        this.isLoading = false;
        return of(null);
      })
    ).subscribe({
      next: (gs) => {
        if (gs) { // Only navigate if game creation was successful
          this.router.navigate(['/game', gs.id]);
        }
      }
    });
  }

  /**
   * Handle nickname validation errors from the backend
   */
  private handleNicknameValidationError(errorResponse: any): void {
    this.showNicknameError = true;
    
    // Get translated error message based on error code
    const errorCode = errorResponse.errorCode;
    const translationKey = `NICKNAME_VALIDATION.${errorCode}`;
    
    this.translate.get(translationKey).subscribe({
      next: (translatedMessage: string) => {
        // If translation is found, use it; otherwise use the message from backend
        this.nicknameErrorMessage = translatedMessage !== translationKey 
          ? translatedMessage 
          : errorResponse.message;
      },
      error: () => {
        // Fallback to backend message if translation fails
        this.nicknameErrorMessage = errorResponse.message;
      }
    });
  }

  /**
   * Clear nickname validation errors
   */
  private clearNicknameError(): void {
    this.showNicknameError = false;
    this.nicknameErrorMessage = '';
  }

  /**
   * Clear error when user starts typing
   */
  onNicknameChange(): void {
    if (this.showNicknameError) {
      this.clearNicknameError();
    }
  }

  join() {
    // Clear previous errors
    this.clearNicknameError();
    
    this.isLoading = true;
    
    const player = { nickname: this.nickname };
    localStorage.setItem('nickname', this.nickname);
    
    this.playerSvc.createPlayer(player).pipe(
      switchMap((response: any) => {
        // Check if player creation was successful
        if (response.success === false) {
          this.handleNicknameValidationError(response);
          return of(null);
        }
        return this.gameSvc.joinGame(this.joinGameId, player);
      }),
      finalize(() => this.isLoading = false),
      catchError((error) => {
        console.error('Error joining game:', error);
        
        if (error.status === 400 && error.error) {
          this.handleNicknameValidationError(error.error);
        } else {
          this.showNicknameError = true;
          this.nicknameErrorMessage = 'An unexpected error occurred. Please try again.';
        }
        
        this.isLoading = false;
        return of(null);
      })
    ).subscribe({
      next: (success) => {
        if (success) {
          this.router.navigate(['/game', this.joinGameId]);
        }
      }
    });
  }
}