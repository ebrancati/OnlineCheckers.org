import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { MoveP } from '../model/entities/MoveP';

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export interface GameStateUpdate {
  type: 'GAME_STATE_UPDATE';
  gameState: any;
}

export interface RestartStatusUpdate {
  type: 'RESTART_STATUS_UPDATE';
  restartStatus: any;
}

export interface PlayerConnectionUpdate {
  type: 'PLAYER_CONNECTED' | 'PLAYER_DISCONNECTED';
  playerId: string;
  gameId: string;
}

export interface ErrorMessage {
  type: 'ERROR';
  message: string;
  code: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000; // Start with 1 second
  private isConnecting = false;

  // Observables for different message types
  private gameStateSubject = new Subject<any>();
  private restartStatusSubject = new Subject<any>();
  private playerConnectionSubject = new Subject<PlayerConnectionUpdate>();
  private errorSubject = new Subject<ErrorMessage>();
  private connectionStatusSubject = new BehaviorSubject<'connected' | 'connecting' | 'disconnected'>('disconnected');

  public gameState$ = this.gameStateSubject.asObservable();
  public restartStatus$ = this.restartStatusSubject.asObservable();
  public playerConnection$ = this.playerConnectionSubject.asObservable();
  public error$ = this.errorSubject.asObservable();
  public connectionStatus$ = this.connectionStatusSubject.asObservable();

  constructor() {}

  /**
   * Connect to WebSocket and subscribe to a specific game
   */
  connect(gameId: string, playerId: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.subscribeToGame(gameId, playerId);
      return;
    }

    if (this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    this.connectionStatusSubject.next('connecting');

    const wsUrl = `ws://localhost:8080/ws/game`; // Adjust URL for production
    
    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.reconnectInterval = 1000;
        this.connectionStatusSubject.next('connected');
        
        // Subscribe to the game immediately after connection
        this.subscribeToGame(gameId, playerId);
      };

      this.socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.socket.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        this.isConnecting = false;
        this.connectionStatusSubject.next('disconnected');
        
        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect(gameId, playerId);
        }
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
        this.connectionStatusSubject.next('disconnected');
        this.errorSubject.next({
          type: 'ERROR',
          message: 'Connection error occurred',
          code: 'CONNECTION_ERROR'
        });
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      this.connectionStatusSubject.next('disconnected');
      this.scheduleReconnect(gameId, playerId);
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'GAME_STATE_UPDATE':
        this.gameStateSubject.next((message as GameStateUpdate).gameState);
        break;
      case 'RESTART_STATUS_UPDATE':
        this.restartStatusSubject.next((message as RestartStatusUpdate).restartStatus);
        break;
      case 'PLAYER_CONNECTED':
      case 'PLAYER_DISCONNECTED':
        this.playerConnectionSubject.next(message as PlayerConnectionUpdate);
        break;
      case 'ERROR':
        this.errorSubject.next(message as ErrorMessage);
        break;
      default:
        console.warn('Unknown WebSocket message type:', message.type);
    }
  }

  /**
   * Subscribe to game updates
   */
  private subscribeToGame(gameId: string, playerId: string): void {
    this.sendMessage({
      type: 'SUBSCRIBE_GAME',
      gameId: gameId,
      playerId: playerId
    });
  }

  /**
   * Send a move
   */
  makeMove(gameId: string, playerId: string, move: MoveP): void {
    this.sendMessage({
      type: 'MAKE_MOVE',
      gameId: gameId,
      playerId: playerId,
      from: move.from,
      to: move.to,
      player: move.player,
      path: move.path
    });
  }

  /**
   * Send a chat message
   */
  sendChatMessage(gameId: string, playerId: string, text: string): void {
    this.sendMessage({
      type: 'SEND_MESSAGE',
      gameId: gameId,
      playerId: playerId,
      text: text
    });
  }

  /**
   * Update restart status
   */
  updateRestartStatus(gameId: string, playerId: string, restartStatus: any): void {
    this.sendMessage({
      type: 'UPDATE_RESTART_STATUS',
      gameId: gameId,
      playerId: playerId,
      restartW: restartStatus.restartW,
      restartB: restartStatus.restartB,
      nicknameW: restartStatus.nicknameW,
      nicknameB: restartStatus.nicknameB
    });
  }

  /**
   * Reset game
   */
  resetGame(gameId: string, playerId: string): void {
    this.sendMessage({
      type: 'RESET_GAME',
      gameId: gameId,
      playerId: playerId
    });
  }

  /**
   * Send a message through WebSocket
   */
  private sendMessage(message: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected. Message not sent:', message);
      this.errorSubject.next({
        type: 'ERROR',
        message: 'Not connected to server',
        code: 'NOT_CONNECTED'
      });
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(gameId: string, playerId: string): void {
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts <= this.maxReconnectAttempts) {
      console.log(`Attempting to reconnect in ${this.reconnectInterval}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        if (this.socket?.readyState !== WebSocket.OPEN) {
          this.connect(gameId, playerId);
        }
      }, this.reconnectInterval);
      
      // Exponential backoff
      this.reconnectInterval = Math.min(this.reconnectInterval * 2, 30000); // Max 30 seconds
    } else {
      console.error('Max reconnection attempts reached');
      this.errorSubject.next({
        type: 'ERROR',
        message: 'Unable to connect to server. Please refresh the page.',
        code: 'MAX_RECONNECT_ATTEMPTS'
      });
    }
  }

  /**
   * Manually disconnect
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.close(1000, 'Manual disconnect');
      this.socket = null;
    }
    this.connectionStatusSubject.next('disconnected');
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }
}