import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioService {

  constructor() {}

  playMoveSound(): void {
    new Audio('assets/sounds/move.mp3').play();
  }

  playCaptureSound(): void {
    new Audio('assets/sounds/capture.mp3').play();
  }

  playWinSound(): void {
    new Audio('assets/sounds/win.mp3').play();
  }

  playLoseSound(): void {
    new Audio('assets/sounds/lose.mp3').play();
  }

  playKingSound(): void {
    new Audio('assets/sounds/king.mp3').play();
  }
}