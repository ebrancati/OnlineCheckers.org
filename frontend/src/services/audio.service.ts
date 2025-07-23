import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private moveSounds:    HTMLAudioElement[] = [];
  private captureSounds: HTMLAudioElement[] = [];
  private winSounds:     HTMLAudioElement[] = [];
  private loseSounds:    HTMLAudioElement[] = [];
  private kingSounds:    HTMLAudioElement[] = [];

  // number of simultaneous sounds per type
  private readonly POOL_SIZE = 3;

  constructor() {
    this.initializeAudioPools();
  }

  /**
   * Creates multiple audio instances for each sound type to handle rapid successive plays
   */
  private initializeAudioPools(): void {
    // Create pools for each sound type
    this.moveSounds    = this.createAudioPool('assets/sounds/move.mp3');
    this.captureSounds = this.createAudioPool('assets/sounds/capture.mp3');
    this.winSounds     = this.createAudioPool('assets/sounds/win.mp3');
    this.loseSounds    = this.createAudioPool('assets/sounds/lose.mp3');
    this.kingSounds    = this.createAudioPool('assets/sounds/king.mp3');
  }

  /**
   * Creates a pool of audio instances for a specific sound file
   * @param src - Path to the audio file
   * @returns Array of HTMLAudioElement instances
   */
  private createAudioPool(src: string): HTMLAudioElement[] {
    const pool: HTMLAudioElement[] = [];
    
    for (let i = 0; i < this.POOL_SIZE; i++) {
      const audio = new Audio(src);
      audio.volume = 0.7;
      audio.preload = 'auto';
      audio.load();
      pool.push(audio);
    }
    
    return pool;
  }

  /**
   * Finds the next available audio instance from a pool
   * @param pool - Array of audio instances
   * @returns Available HTMLAudioElement or creates a new one if all busy
   */
  private getAvailableAudio(pool: HTMLAudioElement[]): HTMLAudioElement {
    // Find an audio that's not currently playing
    const available = pool.find(audio => audio.paused || audio.ended);
    
    if (available) return available;

    return pool[0];
  }

  /**
   * Plays an audio from the specified pool
   * @param pool - The audio pool to use
   */
  private playFromPool(pool: HTMLAudioElement[]): void {
    try {
      const audio = this.getAvailableAudio(pool);

      audio.currentTime = 0;

      const playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn('Audio play failed:', error);
        });
      }
    } catch (error) {
      console.warn('Audio play error:', error);
    }
  }

  playMoveSound(): void {
    this.playFromPool(this.moveSounds);
  }

  playCaptureSound(): void {
    this.playFromPool(this.captureSounds);
  }

  playWinSound(): void {
    this.playFromPool(this.winSounds);
  }

  playLoseSound(): void {
    this.playFromPool(this.loseSounds);
  }

  playKingSound(): void {
    this.playFromPool(this.kingSounds);
  }
}