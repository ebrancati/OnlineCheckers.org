import { Router } from '@angular/router';
import { NgClass, NgForOf, NgIf } from '@angular/common';
import { OnlineMovesComponent as MovesComponent } from '../online-moves/online-moves.component';
import { ChatComponent } from '../chat/chat.component';
import { MoveServiceService } from '../../../services/move-service.service';
import { GameService } from '../../../services/game.service';
import { ActivatedRoute } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { interval, Subscription } from 'rxjs';
import { MoveP } from '../../../model/entities/MoveP';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { AudioService } from '../../../services/audio.service';
import { TranslateModule } from '@ngx-translate/core';
import { RestartService, PlayerRestartStatus } from '../../../services/restart.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { WebSocketGameService, GameUpdateData, RestartStatusData } from '../../../services/websocket-game.service';
import { ConnectionStatus } from '../../../services/websocket.service';

export interface PlayerDto {
  id: string;
  nickname: string;
  team: 'WHITE' | 'BLACK';
}

export interface GameResponse {
  cronologiaMosse: string[];
  chat: string;
  id: string;
  board: string[][];
  turno: 'WHITE' | 'BLACK' | 'NONE';
  pedineW: number;
  pedineB: number;
  damaW: number;
  damaB: number;
  partitaTerminata: boolean;
  vincitore: 'WHITE' | 'BLACK' | 'NONE';
  players: PlayerDto[];
  lastMultiCapturePath?: string[];
}

/**
 * Interface representing a cell on the checkers board
 */
interface Cell {
  hasPiece: boolean;
  pieceColor: 'black' | 'white' | null;
  isKing: boolean;
}

/**
 * Interface representing a move in the game
 */
interface Move {
  from: { row: number, col: number };
  to: { row: number, col: number };
  captured?: { row: number, col: number }[];
}

@Component({
  selector: 'app-online-board',
  imports: [
    NgForOf,
    NgClass,
    NgIf,
    MovesComponent,
    ChatComponent,
    TranslateModule
  ],
  templateUrl: './online-board.component.html',
  styleUrl: './online-board.component.css',
  standalone: true
})
export class OnlineBoardComponent implements OnInit, OnDestroy {
  private captureChainStart: { row: number; col: number } | null = null;
  private hasCalledReset = false;
  origin: string | undefined
  board: Cell[][] = [];
  highlightedCells: { row: number, col: number }[] = [];
  selectedCell: { row: number, col: number } | null = null;
  currentPlayer: 'black' | 'white' = 'white';
  playerTeam: 'WHITE' | 'BLACK' | null = null;

  whitePlayerNickname: string = 'Giocatore Bianco';
  blackPlayerNickname: string = 'Giocatore Nero';

  moves: Move[] = [];
  gameID: string = '';
  pollingSubscription: Subscription | null = null;
  private pollingFallbackSubscription: any = null;

  piecesWithMoves: { row: number, col: number }[] = [];
  piecesWithoutMoves: { row: number, col: number }[] = [];

  gameOver: boolean = false;
  showGameOverModal: boolean = false;
  winner: 'black' | 'white' | null = null;
  whiteCount: number = 12;
  blackCount: number = 12;
  columns: string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  rows: number[] = [1, 2, 3, 4, 5, 6, 7, 8];
  nickname: string | null = localStorage.getItem('nickname');
  capturePath: string[] = [];

  // Drag and drop properties
  draggedPiece: { row: number, col: number } | null = null;
  dragOverCell: { row: number, col: number } | null = null;

  isAnimatingCapture: boolean = false;
  captureAnimationPath: { row: number, col: number }[] = [];
  captureAnimationStep: number = 0;
  captureAnimationInterval: any = null;
  lastAnimatedCaptureId: string = '';

  lastProcessedMoveCount: number = 0;

  // Stop polling when user is making multiple moves
  isCapturingMultiple: boolean = false;

  restartStatus: PlayerRestartStatus | null = null;
  restartPollingSubscription: Subscription | null = null;
  showRestartRequestedMessage: boolean = false;
  waitingForOpponentRestart: boolean = false;
  isResetting: boolean = false;
  hasClickedRestart: boolean = false;

  // Property to track the copy status of the game link
  linkCopied: boolean = false;
  protected chatHistory: string='';

  constructor(
    private moveService: MoveServiceService,
    private gameService: GameService,
    private route: ActivatedRoute,
    public router: Router,
    private audioService: AudioService,
    private restartService: RestartService,
    private webSocketGameService: WebSocketGameService,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.origin = this.document.location.origin;
  }

  ngOnInit() {
    this.gameID = this.route.snapshot.paramMap.get('gameId')!;
    this.initBoard();

    // Start WebSocket connection instead of polling
    this.startWebSocketConnection();
  }

  /**
   * Start WebSocket connection and subscribe to game updates
   */
  startWebSocketConnection() {
    // Connect to WebSocket
    this.webSocketGameService.connectToGame(this.gameID)
      .pipe(takeUntil(this.destroy$))
      .subscribe();

    // Subscribe to game state updates
    this.webSocketGameService.gameUpdate$
      .pipe(takeUntil(this.destroy$))
      .subscribe(gameData => {
        if (gameData) {
          this.handleGameUpdate(gameData);
        }
      });

    // Subscribe to chat messages
    this.webSocketGameService.chatMessage$
      .pipe(takeUntil(this.destroy$))
      .subscribe(chatData => {
        if (chatData) {
          this.handleChatUpdate(chatData);
        }
      });

    // Subscribe to restart status updates
    this.webSocketGameService.restartStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(restartData => {
        if (restartData) {
          this.handleRestartStatusUpdate(restartData);
        }
      });

    // Subscribe to connection status
    this.webSocketGameService.connectionStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        console.log('WebSocket connection status:', status);
        
        // If WebSocket disconnects, fall back to polling
        if (status === ConnectionStatus.ERROR || status === ConnectionStatus.DISCONNECTED) {
          console.warn('WebSocket disconnected, falling back to REST polling');
          this.startPollingFallback();
        } else if (status === ConnectionStatus.CONNECTED) {
          // Stop polling when WebSocket connects
          this.stopPollingFallback();
        }
      });

    // Subscribe to player events
    this.webSocketGameService.playerJoined$
      .pipe(takeUntil(this.destroy$))
      .subscribe(player => {
        console.log('Player joined:', player.playerNickname);
      });

    this.webSocketGameService.playerLeft$
      .pipe(takeUntil(this.destroy$))
      .subscribe(player => {
        console.log('Player left:', player.playerNickname);
      });

    // Subscribe to game reset events
    this.webSocketGameService.gameReset$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        console.log('Game was reset');
        this.handleGameReset();
      });

    // Subscribe to WebSocket errors
    this.webSocketGameService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        console.error('WebSocket game error:', error);
      });
  }

  /**
   * Handle game state updates from WebSocket
   */
  private handleGameUpdate(gameData: GameUpdateData): void {
    console.log('Received game update via WebSocket:', gameData);

    // Handle game reset detection
    if (this.gameOver && !gameData.partitaTerminata) {
      this.gameOver = false;
      this.winner = null;
      this.showGameOverModal = false;
    }

    // Update player team if not set
    const nickname = localStorage.getItem('nickname');
    if (nickname && !this.playerTeam) {
      const playerMatch = gameData.players.find(p => p.nickname === nickname);
      if (playerMatch) {
        this.playerTeam = playerMatch.team as 'WHITE' | 'BLACK';
      }
    }

    // Skip update if we're in the middle of a multiple capture
    if (this.isCapturingMultiple) {
      this.chatHistory = gameData.chat ?? '';
      return;
    }

    // Update player nicknames
    for (const player of gameData.players) {
      if (player.team === 'WHITE') {
        this.whitePlayerNickname = player.nickname;
      } else if (player.team === 'BLACK') {
        this.blackPlayerNickname = player.nickname;
      }
    }

    // Handle multi-capture animation
    const captureId = gameData.lastMultiCapturePath ?
      gameData.lastMultiCapturePath.join('-') + '-' + gameData.turno :
      '';

    if (
      gameData.lastMultiCapturePath &&
      gameData.lastMultiCapturePath.length > 1 &&
      gameData.turno === this.playerTeam &&
      captureId !== this.lastAnimatedCaptureId
    ) {
      this.lastAnimatedCaptureId = captureId;
      const oldBoard = JSON.parse(JSON.stringify(this.board));
      this.startCaptureAnimation(oldBoard, gameData.lastMultiCapturePath, () => {
        this.updateGameStateFromData(gameData);
      });
      return;
    }

    // Normal update
    this.updateGameStateFromData(gameData);

    // Update moves from history
    if (gameData.cronologiaMosse && Array.isArray(gameData.cronologiaMosse)) {
      this.updateMovesFromHistory(gameData.cronologiaMosse);
    }
  }

  /**
   * Update game state from WebSocket data
   */
  private updateGameStateFromData(gameData: GameUpdateData): void {
    this.resetMoveIndicators();
    
    const oldTurn = this.currentPlayer;
    this.currentPlayer = gameData.turno === 'WHITE' ? 'white' : 'black';
    
    // Update board
    this.updateBoardFromState(gameData.board);
    
    // Update piece counts
    const oldWhiteCount = this.whiteCount;
    const oldBlackCount = this.blackCount;
    this.whiteCount = gameData.pedineW + gameData.damaW;
    this.blackCount = gameData.pedineB + gameData.damaB;
    
    // Update chat
    this.chatHistory = gameData.chat ?? '';
    
    // Play sound when player's turn changes
    if (oldTurn !== this.currentPlayer &&
        this.currentPlayer === (this.playerTeam === 'WHITE' ? 'white' : 'black') &&
        !this.isAnimatingCapture) {
      
      const totalOldCount = oldWhiteCount + oldBlackCount;
      const totalNewCount = this.whiteCount + this.blackCount;
      
      if (totalNewCount < totalOldCount) {
        this.audioService.playCaptureSound();
      } else {
        this.audioService.playMoveSound();
      }
    }
    
    // Update game over status
    this.gameOver = gameData.partitaTerminata;
    
    if (this.gameOver && gameData.vincitore !== 'NONE') {
      this.winner = gameData.vincitore === 'WHITE' ? 'white' : 'black';
      
      if (this.playerTeam === gameData.vincitore) {
        this.audioService.playWinSound();
      } else {
        this.audioService.playLoseSound();
      }
      
      this.showGameOverModal = true;
    }
  }

  /**
   * Handle chat updates from WebSocket
   */
  private handleChatUpdate(chatData: any): void {
    console.log('Received chat message via WebSocket:', chatData);
    // Chat updates are handled in the main game update
    // This is for any additional chat-specific logic if needed in future
  }

  /**
   * Handle restart status updates from WebSocket
   */
  private handleRestartStatusUpdate(restartData: RestartStatusData): void {
    console.log('Received restart status update via WebSocket:', restartData);
    this.restartStatus = restartData;
    
    // Update local flags
    if (this.playerTeam === 'WHITE' && restartData.restartW) {
      this.waitingForOpponentRestart = true;
    } else if (this.playerTeam === 'BLACK' && restartData.restartB) {
      this.waitingForOpponentRestart = true;
    }
  }

  /**
   * Handle game reset from WebSocket
   */
  private handleGameReset(): void {
    console.log('Handling game reset from WebSocket');
    this.audioService.playMoveSound();
    this.showGameOverModal = false;
    this.waitingForOpponentRestart = false;
    this.gameOver = false;
    this.winner = null;
    this.resetLocalState();
  }

  /**
   * Updates moves array from server move history
   * @param moveHistory - Array of move strings from server
   */
  updateMovesFromHistory(moveHistory: string[]): void {

    this.moves = [];

    for (const moveString of moveHistory) {
      // Parse move string in format "fromRow,fromCol-toRow,toCol-player"
      const parts = moveString.split('-');
      if (parts.length < 3) continue; // Skip invalid format

      const fromRow = parseInt(parts[0][0]);
      const fromCol = parseInt(parts[0][1]);
      const toRow = parseInt(parts[1][0]);
      const toCol = parseInt(parts[1][1]);

      // Check if this is a capture move (distance = 2)
      const isCapture = Math.abs(fromRow - toRow) === 2 && Math.abs(fromCol - toCol) === 2;

      // Create move object
      const move: Move = {
        from: { row: fromRow, col: fromCol },
        to: { row: toRow, col: toCol }
      };

      // Add captured piece if it's a capture
      if (isCapture) {
        const capturedRow = Math.floor((fromRow + toRow) / 2);
        const capturedCol = Math.floor((fromCol + toCol) / 2);
        move.captured = [{ row: capturedRow, col: capturedCol }];
      }

      // Add the move to the moves array
      this.moves.push(move);
    }
  }

  /**
   * Updates the game state based on the response from the server
   */
  updateGameState(response: GameResponse) {
    // Reset move indicators
    this.resetMoveIndicators();
    
    // Save the previous state for comparison
    const oldBoard = this.board ? JSON.parse(JSON.stringify(this.board)) : null;
    const oldTurn = this.currentPlayer;

    // Update the current shift
    this.currentPlayer = response.turno === 'WHITE' ? 'white' : 'black';

    // Update board
    this.updateBoardFromState(response.board);

    // Update piece counts
    const oldWhiteCount = this.whiteCount;
    const oldBlackCount = this.blackCount;
    this.whiteCount = response.pedineW + response.damaW;
    this.blackCount = response.pedineB + response.damaB;

    // Play sound when player's turn changes (means opponent made a move)
    if (oldTurn !== this.currentPlayer &&
        this.currentPlayer === (this.playerTeam === 'WHITE' ? 'white' : 'black') &&
        !this.isAnimatingCapture) {

      // Determine whether it was a capture or a normal move based on the piece count
      const totalOldCount = oldWhiteCount + oldBlackCount;
      const totalNewCount = this.whiteCount + this.blackCount;

      if (totalNewCount < totalOldCount) {
        // It was a capture (the total number of piece decreased)
        this.audioService.playCaptureSound();
      } else {
        // It was a normal move
        this.audioService.playMoveSound();
      }
    }

    // Update end game status
    this.gameOver = response.partitaTerminata;

    // Show the end game modal to both winner and loser
    if (this.gameOver && response.vincitore !== 'NONE') {
      // Convert the winner from the backend format (WHITE/BLACK) to the frontend format (white/black)
      this.winner = response.vincitore === 'WHITE' ? 'white' : 'black';

      // Play the appropriate sound
      if (this.playerTeam === response.vincitore) {
        this.audioService.playWinSound();
      } else {
        this.audioService.playLoseSound();
      }

      // Always show the end game modal, regardless of who won
      this.showGameOverModal = true;

      // If polling is active, we stop it at the end of the game
      if (this.pollingSubscription) {
        this.pollingSubscription.unsubscribe();
        this.pollingSubscription = null;
      }
    }
  }

  /**
   * Updates the board based on the state received from the server
   */
  updateBoardFromState(boardState: string[][]) {
    if (!boardState || !Array.isArray(boardState)) return;

    this.board = boardState.map(row =>
      row.map(cell => ({
        hasPiece: cell !== '',
        pieceColor: cell === 'b' || cell === 'B' ? 'black' : cell === 'w' || cell === 'W' ? 'white' : null,
        isKing: cell === 'B' || cell === 'W'
      }))
    );
  }

  /**
   * Check if it's the current player's turn
   */
  isPlayerTurn(): boolean {
    // If we don't have a role yet, it's not our turn
    if (!this.playerTeam) return false;

    // If an opponent is missing, it's not time to play yet
    if (this.needsOpponent()) return false;

    // Check if it's our turn based on the color
    const isPlayerTurn =  (this.playerTeam === 'WHITE' && this.currentPlayer === 'white') ||
                          (this.playerTeam === 'BLACK' && this.currentPlayer === 'black');

    return isPlayerTurn;
  }
  
  /**
   * Initialize the game board with pieces in starting positions
   */
  initBoard() {
    const initialData = [
      [ "", "b", "", "b", "", "b", "", "b" ],
      [ "b", "", "b", "", "b", "", "b", "" ],
      [ "", "b", "", "b", "", "b", "", "b" ],
      [ "",  "",  "",  "",  "",  "",  "",  "" ],
      [ "",  "",  "",  "",  "",  "",  "",  "" ],
      [ "w", "", "w", "", "w", "", "w", "" ],
      [ "", "w", "", "w", "", "w", "", "w" ],
      [ "w", "", "w", "", "w", "", "w", "" ],
    ];
    this.board = initialData.map(row =>
      row.map(cell => ({
        hasPiece: cell === 'b' || cell === 'w',
        pieceColor: cell === 'b' ? 'black' : cell === 'w' ? 'white' : null,
        isKing: false
      }))
    );

    this.currentPlayer = 'white'; // initial turn
    this.moves = []; // store move history
    this.gameOver = false; // game not finished
    this.showGameOverModal = false; // hide end game modal
    this.winner = null;
    this.highlightedCells = []; // clears highlighted cells on the board
    this.selectedCell = null; // no piece is selected
  }

  /**
   * Determines if a cell should be colored light
   * @param row - Row index of the cell
   * @param col - Column index of the cell
   * @returns True if the cell should be light colored
   */
  isLight(row: number, col: number): boolean {
    return (row + col) % 2 === 0;
  }

  /**
   * Determines if a cell should be highlighted as a possible move
   * @param row - Row index of the cell
   * @param col - Column index of the cell
   * @returns True if the cell is a possible move
   */
  isHighlight(row: number, col: number): boolean {
    return this.highlightedCells.some(cell => cell.row === row && cell.col === col);
  }

  /**
   * Determines if a cell is currently selected
   * @param row - Row index of the cell
   * @param col - Column index of the cell
   * @returns True if the cell is currently selected
   */
  isSelected(row: number, col: number): boolean {
    return this.selectedCell?.row === row && this.selectedCell?.col === col;
  }

  /**
   * Handles click events on board cells
   * @param row - Row index of the clicked cell
   * @param col - Column index of the clicked cell
   */
  onCellClick(row: number, col: number): void {
    if (this.gameOver) return;

    // Check if it's the player's turn
    if (!this.isPlayerTurn()) return;

    const cell = this.board[row][col];

    // If a highlighted cell is clicked, it means making a move
    if (this.isHighlight(row, col) && this.selectedCell) {
      // Reset indicators before making move
      this.resetMoveIndicators();
      
      this.makeMove(this.selectedCell.row, this.selectedCell.col, row, col);
      return;
    }

    // Clear previous highlights if clicking on a new cell
    this.highlightedCells = [];
    
    // Reset any previous move indicators
    this.resetMoveIndicators();

    // If the cell has no piece or it's not the current player's piece, do nothing
    if (!cell.hasPiece || cell.pieceColor !== this.currentPlayer) {
      this.selectedCell = null;
      return;
    }

    this.selectedCell = { row, col };

    // Get and show all possible moves
    const validMoves = this.getValidMoves(row, col);
    this.highlightedCells = validMoves;
    
    // Check if this piece has moves or not
    if (validMoves.length > 0) {
      // Add the clicked piece with moves to the list
      this.piecesWithMoves.push({ row, col });
    } else {
      // Only add the clicked piece without moves to the list
      this.piecesWithoutMoves.push({ row, col });
    }
  }

  /**
   * Gets valid moves for a piece at the specified position
   * @param row - Row index of the piece
   * @param col - Column index of the piece
   * @returns Array of positions representing valid moves
   */
  getValidMoves(row: number, col: number): { row: number, col: number }[] {
    const validMoves: { row: number, col: number }[] = [];
    const cell = this.board[row][col];

    // Check if there are any forced captures first
    const allCaptures = this.getAllForcedCaptures();

    // If there are forced captures, only return those for this piece
    if (allCaptures.length > 0) {
      return allCaptures
        .filter(m => m.from.row === row && m.from.col === col)
        .map(m => m.to);
    }

    // No forced captures, so return regular moves
    const directions = cell.isKing
      ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] // Kings can move in all diagonal directions
      : cell.pieceColor === 'white' ? [[-1, 1], [-1, -1]] : [[1, 1], [1, -1]]; // Regular pieces move forward only

    // calculates and adds the normal (non-capturing) moves a piece can make
    directions.forEach(([dr, dc]) => {
      const r2 = row + dr;
      const c2 = col + dc;

      if (this.isValidPosition(r2, c2) && !this.board[r2][c2].hasPiece) {
        validMoves.push({ row: r2, col: c2 });
      }
    });

    return validMoves;
  }

  /**
   * Gets all possible capture moves for the current player
   * @returns Array of moves that involve capturing opponent pieces
   */
  getAllForcedCaptures(): Move[] {
    const captures: Move[] = [];

    // Scan the entire board for forced captures
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = this.board[r][c];

        // Skip empty cells or opponent's pieces
        if (!cell.hasPiece || cell.pieceColor !== this.currentPlayer) continue;

        // Get captures for this piece
        const pieceCapturesMoves = this.getCapturesForPiece(r, c);
        captures.push(...pieceCapturesMoves);
      }
    }

    return captures;
  }

  /**
   * Gets all possible capture moves for a specific piece
   * @param row - Row index of the piece
   * @param col - Column index of the piece
   * @returns Array of capture moves for the piece
   */
  getCapturesForPiece(row: number, col: number): Move[] {
    const captures: Move[] = [];
    const cell = this.board[row][col];

    if (!cell.hasPiece) return captures;

    // Define directions based on piece type
    let directions: number[][];

    if (cell.isKing) {
      // promoted piece can move and capture in all directions
      directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    } else {
      // Normal pieces can only capture forward and sideways
      // For white, forward is -1 (upwards)
      // For black, forward is +1 (downwards)
      if (cell.pieceColor === 'white') {
        directions = [[-1, -1], [-1, 1]];
      } else {
        directions = [[1, -1], [1, 1]];
      }
    }

    // Check every direction for capture opportunities
    directions.forEach(([dr, dc]) => {
      const captureRow = row + dr;
      const captureCol = col + dc;
      const landRow = row + 2 * dr;
      const landCol = col + 2 * dc;

      // Check every direction for capture opportunities
      if (!this.isValidPosition(captureRow, captureCol) || !this.isValidPosition(landRow, landCol)) {
        return;
      }

      const captureCell = this.board[captureRow][captureCol];
      const landCell = this.board[landRow][landCol];

      // Check if there is an opponent's piece to capture and an empty cell to land on
      if (captureCell.hasPiece && captureCell.pieceColor !== cell.pieceColor && !landCell.hasPiece) {
        captures.push({
          from: { row, col },
          to: { row: landRow, col: landCol },
          captured: [{ row: captureRow, col: captureCol }]
        });
      }
    });

    return captures;
  }

  /**
   * Executes a move from one position to another
   * @param fromRow - Starting row
   * @param fromCol - Starting column
   * @param toRow - Destination row
   * @param toCol - Destination column
   */
  makeMove(fromRow: number, fromCol: number, toRow: number, toCol: number): void {
    if (!this.isPlayerTurn()) return;

    const isCapture = Math.abs(fromRow - toRow) === 2 && Math.abs(fromCol - toCol) === 2;
    const movingPiece = { ...this.board[fromRow][fromCol] };

    // Visual feedback for captures
    if (isCapture) {
      const capRow = (fromRow + toRow) / 2;
      const capCol = (fromCol + toCol) / 2;
      const capturedPiece = this.board[capRow][capCol];

      if (!capturedPiece.hasPiece || capturedPiece.pieceColor === movingPiece.pieceColor) {
        return;
      }

      this.board[capRow][capCol] = { hasPiece: false, pieceColor: null, isKing: false };
      this.audioService.playCaptureSound();
    } else {
      this.audioService.playMoveSound();
    }

    // Move piece visually
    this.board[fromRow][fromCol] = { hasPiece: false, pieceColor: null, isKing: false };

    // Check for king promotion
    let becomesKing = false;
    if (!movingPiece.isKing) {
      if ((movingPiece.pieceColor === 'white' && toRow === 0) ||
          (movingPiece.pieceColor === 'black' && toRow === 7)) {
        movingPiece.isKing = true;
        becomesKing = true;
        this.audioService.playKingSound();
      }
    }

    this.board[toRow][toCol] = { ...movingPiece };

    // Check for additional captures
    const further = this.getCapturesForPiece(toRow, toCol);

    if (isCapture && further.length > 0) {
      // Handle multiple captures
      if (!this.captureChainStart) {
        this.captureChainStart = { row: fromRow, col: fromCol };
        this.isCapturingMultiple = true;
      }

      if (!this.capturePath) this.capturePath = [];
      this.capturePath.push(`${toRow}${toCol}`);

      this.moves = [...this.moves, {
        from: { row: fromRow, col: fromCol },
        to: { row: toRow, col: toCol },
        captured: [{ row: (fromRow + toRow) / 2, col: (fromCol + toCol) / 2 }]
      }];

      this.selectedCell = { row: toRow, col: toCol };
      this.highlightedCells = further.map(m => m.to);
      this.resetMoveIndicators();
      this.piecesWithMoves.push({ row: toRow, col: toCol });

      if (becomesKing) {
        setTimeout(() => this.board = [...this.board], 100);
      }
    } else {
      // Send move via WebSocket with fallback
      const start = this.captureChainStart || { row: fromRow, col: fromCol };

      if (!isCapture || !this.captureChainStart) {
        this.moves = [...this.moves, {
          from: { row: fromRow, col: fromCol },
          to: { row: toRow, col: toCol },
          captured: isCapture ? [{ row: (fromRow + toRow) / 2, col: (fromCol + toCol) / 2 }] : undefined
        }];
      }

      if (isCapture && this.captureChainStart) {
        this.capturePath.push(`${toRow}${toCol}`);
      }

      // Send via WebSocket with automatic fallback
      this.webSocketGameService.sendMove(
        `${start.row}${start.col}`,
        `${toRow}${toCol}`,
        movingPiece.pieceColor!,
        this.captureChainStart && this.capturePath ? this.capturePath : undefined
      ).then(() => {
        console.log('Move sent successfully via WebSocket');
      }).catch(error => {
        console.error('Move failed via WebSocket, using REST fallback:', error);
        this.fallbackMoveToRest(start, toRow, toCol, movingPiece.pieceColor!);
      });

      // Clear capture state
      this.captureChainStart = null;
      this.selectedCell = null;
      this.highlightedCells = [];
      this.isCapturingMultiple = false;
      this.capturePath = [];
      this.resetMoveIndicators();

      // Change turn locally (will be confirmed by WebSocket update)
      this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
      this.checkGameOver();
    }
  }

  /**
   * Fallback to REST API when WebSocket fails
   */
  private fallbackMoveToRest(start: {row: number, col: number}, toRow: number, toCol: number, playerColor: string): void {
    const payload = {
      from: `${start.row}${start.col}`,
      to: `${toRow}${toCol}`,
      player: playerColor,
      path: this.captureChainStart && this.capturePath ? this.capturePath : undefined
    };

    this.moveService.saveMove(payload, this.gameID).subscribe({
      next: res => {
        console.log('REST fallback successful');
        if (res && (res as any).cronologiaMosse) {
          this.updateMovesFromHistory((res as any).cronologiaMosse);
        }
      },
      error: err => console.error('REST fallback also failed:', err)
    });
  }

  /**
   * Check all pieces of the current player to determine which have moves
   */
  checkAllPiecesForMoves(): void {
    // First, clear the arrays
    this.piecesWithMoves = [];
    this.piecesWithoutMoves = [];
    
    // Scan the entire board to find pieces with and without moves
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = this.board[r][c];
        
        // Only check the current player's pieces
        if (cell.hasPiece && cell.pieceColor === this.currentPlayer) {
          const moves = this.getValidMoves(r, c);
          
          if (moves.length > 0) {
            this.piecesWithMoves.push({ row: r, col: c });
          } else {
            this.piecesWithoutMoves.push({ row: r, col: c });
          }
        }
      }
    }
  }

  /**
   * Determines if a cell has a piece with available moves
   * @param row - Row index of the cell
   * @param col - Column index of the cell
   * @returns True if the cell has a piece with available moves
   */
  hasAvailableMoves(row: number, col: number): boolean {
    return this.piecesWithMoves.some(piece => piece.row === row && piece.col === col);
  }
  
  /**
   * Determines if a cell has a piece with no available moves
   * @param row - Row index of the cell
   * @param col - Column index of the cell
   * @returns True if the cell has a piece with no available moves
   */
  hasNoAvailableMoves(row: number, col: number): boolean {
    return this.piecesWithoutMoves.some(piece => piece.row === row && piece.col === col);
  }
  
  /**
   * Resets the move indicators
   */
  resetMoveIndicators(): void {
    this.piecesWithMoves = [];
    this.piecesWithoutMoves = [];
  }
  /**
   * Checks if the game is over and determines the winner
   */
  checkGameOver(): void {
    // Check if a player has no pieces left
    let whiteCount = 0;
    let blackCount = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = this.board[r][c];
        if (cell.hasPiece) {
          if (cell.pieceColor === 'white') whiteCount++;
          else blackCount++;
        }
      }
    }

    this.whiteCount = whiteCount;
    this.blackCount = blackCount;

    if (whiteCount === 0) {
      this.gameOver = true;
      this.winner = 'black'; // player black wins if player white has no pieces
      this.showGameOverModal = true;
      return;
    }

    if (blackCount === 0) {
      this.gameOver = true;
      this.winner = 'white'; // player white wins if player black has no pieces
      this.showGameOverModal = true;
      return;
    }

    // Check if current player has valid moves
    let hasValidMoves = false;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = this.board[r][c];
        if (cell.hasPiece && cell.pieceColor === this.currentPlayer) {
          const moves = this.getValidMoves(r, c);
          if (moves.length > 0) {
            // Player has at least one valid move
            hasValidMoves = true;
            break;
          }
        }
      }
      if (hasValidMoves) break;
    }

    // If current player has no valid moves, they lose
    if (!hasValidMoves) {
      this.gameOver = true;
      this.winner = this.currentPlayer === 'white' ? 'black' : 'white';
      this.showGameOverModal = true;
    }
  }

  /**
   * Hides the game over modal
   */
  hideGameOverModal(): void {
    this.showGameOverModal = false;
  }

  /**
  * Checks if the game needs a second player
  * @returns true if a player is missing, false if both players are present
  */
  needsOpponent(): boolean {
    // The game needs an opponent if it has less than 2 players
    return !this.whitePlayerNickname || !this.blackPlayerNickname ||
          this.whitePlayerNickname === 'Giocatore Bianco' ||
          this.blackPlayerNickname === 'Giocatore Nero';
  }

  /**
  * Copy text to clipboard
  * @param inputElement Input element containing text to copy
  */
  copyToClipboard(inputElement: HTMLInputElement): void {
    inputElement.select();
    inputElement.setSelectionRange(0, 99999); // For mobile devices

    document.execCommand('copy');

    // Deselect the text
    inputElement.blur();

    // Show confirmation message
    this.linkCopied = true;

    // Hide message after 2 seconds
    setTimeout(() => {
      this.linkCopied = false;
    }, 2000);
  }

  /**
   * Checks if a position is within the board boundaries
   * @param row - Row index to check
   * @param col - Column index to check
   * @returns True if the position is valid
   */
  isValidPosition(row: number, col: number): boolean {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }

  /**
   * Handles the start of a drag operation
   * @param event - The drag event
   * @param row - Row index of the dragged piece
   * @param col - Column index of the dragged piece
   */
  onDragStart(event: DragEvent, row: number, col: number): void {
    if (this.gameOver || !this.isPlayerTurn()) {
      event.preventDefault();
      return;
    }

    const cell = this.board[row][col];

    // Only allow dragging the current player's pieces
    if (!cell.hasPiece || cell.pieceColor !== this.currentPlayer) {
      event.preventDefault();
      return;
    }

    // Store the dragged piece position
    this.draggedPiece = { row, col };

    // Set the drag image (optional)
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', `${row},${col}`);
      event.dataTransfer.effectAllowed = 'move';
    }

    // Select the piece and show valid moves
    this.selectedCell = { row, col };
    this.highlightedCells = this.getValidMoves(row, col);
  }

  /**
   * Handles the end of a drag operation
   * @param event - The drag event
   */
  onDragEnd(event: DragEvent): void {
    // Reset drag state if no drop occurred
    this.draggedPiece = null;
    this.dragOverCell = null;
  }

  /**
   * Handles dragging over a potential drop target
   * @param event - The drag event
   * @param row - Row index of the target cell
   * @param col - Column index of the target cell
   */
  onDragOver(event: DragEvent, row: number, col: number): void {
    // Prevent default to allow drop
    if (this.isHighlight(row, col)) {
      event.preventDefault();

      // Add drag-over class for visual feedback
      const element = event.currentTarget as HTMLElement;
      element.classList.add('drag-over');

      this.dragOverCell = { row, col };
    }
  }

  /**
   * Handles dropping a piece on a target cell
   * @param event - The drag event
   * @param row - Row index of the target cell
   * @param col - Column index of the target cell
   */
  onDrop(event: DragEvent, row: number, col: number): void {
    event.preventDefault();

    // Remove drag-over class
    const element = event.currentTarget as HTMLElement;
    element.classList.remove('drag-over');

    // Check if this is a valid drop target
    if (this.draggedPiece && this.isHighlight(row, col)) {
      // Make the move
      this.makeMove(this.draggedPiece.row, this.draggedPiece.col, row, col);
    }

    // Reset drag state
    this.draggedPiece = null;
    this.dragOverCell = null;
  }

  // Method to start the capture animation
  startCaptureAnimation(oldBoard: Cell[][], path: string[], onComplete: () => void) {

    // Stop any ongoing animations
    if (this.captureAnimationInterval) {
      clearInterval(this.captureAnimationInterval);
      this.captureAnimationInterval = null;
    }

    this.isAnimatingCapture = true;
    this.captureAnimationPath = path.map(pos => ({
      row: parseInt(pos[0]),
      col: parseInt(pos[1])
    }));
    this.captureAnimationStep = 0;

    // Copy the original board to use for animation
    this.board = JSON.parse(JSON.stringify(oldBoard));

    // Identify the piece that is capturing
    const startRow = this.captureAnimationPath[0].row;
    const startCol = this.captureAnimationPath[0].col;
    const piece = { ...this.board[startRow][startCol] }; // Create a copy of the piece

    if (!piece.hasPiece) {
      console.error("Error: No piece found at the starting position of the animation!");
      this.isAnimatingCapture = false;
      onComplete();
      return;
    }

    // Interval for animation (move the piece every 500ms)
    this.captureAnimationInterval = setInterval(() => {
      if (this.captureAnimationStep < this.captureAnimationPath.length - 1) {

        // Current position
        const current = this.captureAnimationPath[this.captureAnimationStep];

        // Next position
        const next = this.captureAnimationPath[this.captureAnimationStep + 1];

        // Calculate the position of the captured piece
        const capturedRow = (current.row + next.row) / 2;
        const capturedCol = (current.col + next.col) / 2;

        // Removes the piece from the current position
        this.board[current.row][current.col] = {
          hasPiece: false,
          pieceColor: null,
          isKing: false
        };

        // Removes the captured piece
        this.board[capturedRow][capturedCol] = {
          hasPiece: false,
          pieceColor: null,
          isKing: false
        };

        // Check if the piece has been promoted
        let becameKing = false;
        if (!piece.isKing) {
          if (
            (piece.pieceColor === 'white' && next.row === 0) ||
            (piece.pieceColor === 'black' && next.row === 7)
          ) {
            // piece promoted
            piece.isKing = true;
            becameKing = true;

            this.audioService.playKingSound();
          }
        }

        // Move the piece to the new position
        this.board[next.row][next.col] = {
          hasPiece: true,
          pieceColor: piece.pieceColor,
          isKing: piece.isKing
        };

        // Force an interface update immediately
        // if the piece has been promoted, so as to show the crown
        if (becameKing) {
          // Create a copy of the board to force Angular to detect the change
          this.board = [...this.board.map(row => [...row])];
        }

        this.audioService.playCaptureSound();

        this.captureAnimationStep++;
      } else {
        // End of animation
        clearInterval(this.captureAnimationInterval);
        this.captureAnimationInterval = null;
        this.isAnimatingCapture = false;

        // Callback to complete the update
        onComplete();
      }
    }, 500); // 500ms delay between each animation step
  }

  /**
  * Method to restore the local state of the game
  */
  private resetLocalState() {
    this.selectedCell = null;
    this.highlightedCells = [];
    this.moves = [];
    this.isAnimatingCapture = false;
    this.captureChainStart = null;
    this.captureAnimationPath = [];
    this.capturePath = [];
    this.lastAnimatedCaptureId = '';
    this.lastProcessedMoveCount = 0;
    this.isCapturingMultiple = false;
    this.restartPollingSubscription?.unsubscribe();
    this.restartPollingSubscription = null;
  }

  /**
  * Method to request restart
  */
  requestRestart() {
    this.hasClickedRestart = true;
    
    if (this.webSocketGameService.isConnected()) {
      // Send via WebSocket
      this.webSocketGameService.requestRestart();
      this.waitingForOpponentRestart = true;
      this.showRestartRequestedMessage = true;
    } else {
      // Fallback to REST (existing implementation)
      if (!this.restartStatus) {
        console.error('Cannot request restart: restart status not available');
        return;
      }
      
      const updatedStatus = {
        gameID: this.restartStatus.gameID,
        nicknameB: this.restartStatus.nicknameB,
        nicknameW: this.restartStatus.nicknameW,
        restartB: this.playerTeam === 'BLACK' ? true : this.restartStatus.restartB,
        restartW: this.playerTeam === 'WHITE' ? true : this.restartStatus.restartW
      };
      
      this.restartService.updateRestartStatus(updatedStatus).subscribe({
        next: () => {
          this.waitingForOpponentRestart = true;
          this.showRestartRequestedMessage = true;
        },
        error: (err) => console.error('Restart request error:', err)
      });
    }
  }

  /**
  * Method to cancel the reboot request
  */
  cancelRestartRequest() {
    if (!this.gameID || !this.restartStatus || !this.waitingForOpponentRestart) return;

    // Create a copy of the current state
    let updatedStatus = { ...this.restartStatus };

    // Update status based on player's team
    if (this.playerTeam === 'WHITE') {
      updatedStatus.restartW = false;
    } else if (this.playerTeam === 'BLACK') {
      updatedStatus.restartB = false;
    }

    // Send the update to the server
    this.restartService.updateRestartStatus(updatedStatus).subscribe({
      next: () => {
        this.waitingForOpponentRestart = false;
      },
      error: (err) => {
        console.error('Error canceling restart request:', err);
      }
    });
  }

  /**
   * Start polling fallback when WebSocket is not available
   */
  private startPollingFallback(): void {
    if (this.pollingFallbackSubscription) return; // Already polling

    console.log('Starting REST polling fallback');
    
    this.pollingFallbackSubscription = interval(3000).subscribe(() => {
      this.gameService.getGameState(this.gameID).subscribe({
        next: (response: any) => {
          // Convert REST response to WebSocket format and handle
          const gameData: GameUpdateData = {
            id: response.id,
            board: response.board,
            turno: response.turno,
            pedineW: response.pedineW,
            pedineB: response.pedineB,
            damaW: response.damaW,
            damaB: response.damaB,
            partitaTerminata: response.partitaTerminata,
            vincitore: response.vincitore,
            players: response.players,
            chat: response.chat,
            cronologiaMosse: response.cronologiaMosse,
            lastMultiCapturePath: response.lastMultiCapturePath
          };
          
          this.handleGameUpdate(gameData);
        },
        error: error => console.error('Polling fallback error:', error)
      });
    });
  }

  /**
   * Stop polling fallback when WebSocket reconnects
   */
  private stopPollingFallback(): void {
    if (this.pollingFallbackSubscription) {
      this.pollingFallbackSubscription.unsubscribe();
      this.pollingFallbackSubscription = null;
      console.log('Stopped REST polling fallback');
    }
  }

  /**
  * Check if the other player has requested a restart
  */
  hasOpponentRequestedRestart(): boolean {
    if (!this.restartStatus) return false;

    if (this.playerTeam === 'WHITE') {
      return this.restartStatus.restartB;
    } else if (this.playerTeam === 'BLACK') {
      return this.restartStatus.restartW;
    }

    return false;
  }

  resetGame(): void {
    if (this.gameID) {
      this.requestRestart();
    } else {
      this.router.navigate(['/play']);
    }
  }

  private destroy$ = new Subject<void>();

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Disconnect WebSocket
    this.webSocketGameService.disconnect();
    
    // Stop polling fallback
    this.stopPollingFallback();
    
    // Clean up existing subscriptions
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
    if (this.restartPollingSubscription) {
      this.restartPollingSubscription.unsubscribe();
    }
    if (this.captureAnimationInterval) {
      clearInterval(this.captureAnimationInterval);
    }
  }

  protected readonly localStorage = localStorage;
}