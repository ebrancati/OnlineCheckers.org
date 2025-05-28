import { Component, OnInit, OnDestroy } from '@angular/core';
import { OfflineBoardComponent } from '../offline-board/offline-board.component';
import { BotService } from '../../../services/bot.service';
import { AudioService } from '../../../services/audio.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { OfflineMovesComponent } from '../offline-moves/offline-moves.component';

@Component({
  selector: 'app-bot-board',
  templateUrl: './bot-board.component.html',
  styleUrls: ['./bot-board.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    OfflineMovesComponent
  ]
})
export class BotBoardComponent extends OfflineBoardComponent implements OnInit, OnDestroy {
  botColor: 'black' | 'white' = 'black';
  playerColor: 'black' | 'white' = 'white';
  difficulty: number = 2; // Default: medium difficulty
  isThinking: boolean = false;

  // BOARD HISTORY TRACKING FOR ANTI-LOOP
  private boardHistory: string[] = []; // Complete board state history
  private readonly MAX_HISTORY_SIZE = 50; // Keep last 50 positions

  // Animation properties for captures
  isAnimatingCapture: boolean = false;
  captureAnimationPath: { row: number, col: number }[] = [];
  captureAnimationStep: number = 0;
  captureAnimationInterval: any = null;

  // Drag and drop properties
  override draggedPiece: { row: number, col: number } | null = null;
  override dragOverCell: { row: number, col: number } | null = null;

  constructor(
    private botService: BotService,
    audioService: AudioService,
    translate: TranslateService
  ) {
    super(audioService, translate);
  }

  override ngOnInit() {
    super.ngOnInit();

    // If bot starts first, make its first move
    if (this.currentPlayer === this.botColor) {
      this.getBotMove();
    }
  }

  override ngOnDestroy() {
    // Clean up any running intervals when component is destroyed
    if (this.captureAnimationInterval) {
      clearInterval(this.captureAnimationInterval);
      this.captureAnimationInterval = null;
    }
    
    // Call parent destroy method
    super.ngOnDestroy();
  }

  /**
   * Enhanced makeMove method that includes bot logic and board history tracking
   */
  override makeMove(fromRow: number, fromCol: number, toRow: number, toCol: number): void {
    // Record board state before player move
    const beforeMoveHash = this.createBoardHash();
    this.addBoardToHistory(beforeMoveHash);

    console.log('Player making move from', fromRow + ',' + fromCol, 'to', toRow + ',' + toCol);

    // Execute move normally using parent method
    super.makeMove(fromRow, fromCol, toRow, toCol);

    // Record board state after player move
    setTimeout(() => {
      const afterMoveHash = this.createBoardHash();
      this.addBoardToHistory(afterMoveHash);
      console.log('Player move completed. New board hash:', afterMoveHash);
    }, 100);

    // If after player's move it's bot's turn and game is not over
    if (!this.gameOver && this.currentPlayer === this.botColor) {
      // Add small delay to give illusion that bot is "thinking"
      setTimeout(() => {
        this.getBotMove();
      }, 500);
    }
  }

  /**
   * Enhanced getBotMove method that sends board history to backend
   */
  getBotMove() {
    this.isThinking = true;

    // Create current board hash
    const currentBoardHash = this.createBoardHash();
    
    // Prepare request with board history
    const request = {
      board: this.board.map(row => row.map(cell => {
        if (!cell.hasPiece) return '';
        return cell.isKing
          ? (cell.pieceColor === 'white' ? 'W' : 'B')
          : (cell.pieceColor === 'white' ? 'w' : 'b');
      })),
      playerColor: this.botColor,
      difficulty: this.difficulty,
      boardHistory: [...this.boardHistory] // Send complete board history to prevent loops
    };

    console.log('Sending to bot:');
    console.log('- Current board hash:', currentBoardHash);
    console.log('- Board history length:', this.boardHistory.length);
    console.log('- Repetitions of current position:', this.countRepetitions(currentBoardHash));

    this.botService.calculateMove(request).subscribe({
      next: (response) => {
        this.isThinking = false;

        // Add current position to history BEFORE making the move
        this.addBoardToHistory(currentBoardHash);

        // Convert coordinates from API notation
        const fromRow = parseInt(response.from.charAt(0));
        const fromCol = parseInt(response.from.charAt(1));
        const toRow = parseInt(response.to.charAt(0));
        const toCol = parseInt(response.to.charAt(1));

        console.log('Bot chose move:', response.from + ' -> ' + response.to);

        // Execute bot move
        if (response.path && response.path.length > 0) {
          // Handle multiple capture with animation
          this.moves = [...this.moves, {
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            captured: [{ row: fromRow + (toRow - fromRow) / 2, col: fromCol + (toCol - fromCol) / 2 }]
          }];
          this.animateBotCapturePath(fromRow, fromCol, response.path);
        } else {
          // Simple move
          super.makeMove(fromRow, fromCol, toRow, toCol);
        }

        // Add the new board state after bot's move to history
        setTimeout(() => {
          const afterMoveHash = this.createBoardHash();
          this.addBoardToHistory(afterMoveHash);
          console.log('Bot move completed. New board hash:', afterMoveHash);
        }, 100);
      },
      error: (err) => {
        console.error('Error calculating bot move:', err);
        this.isThinking = false;
      }
    });
  }

  /**
   * Creates a hash of the current board position
   */
  private createBoardHash(): string {
    let hash = '';
    
    // Create hash from board state
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = this.board[r][c];
        if (!cell.hasPiece) {
          hash += '.';
        } else {
          hash += cell.isKing 
            ? (cell.pieceColor === 'white' ? 'W' : 'B')
            : (cell.pieceColor === 'white' ? 'w' : 'b');
        }
      }
    }
    
    // Include current player to distinguish identical positions with different turns
    hash += '_' + this.currentPlayer;
    
    return hash;
  }

  /**
   * Adds a board state to the history
   */
  private addBoardToHistory(boardHash: string): void {
    this.boardHistory.push(boardHash);
    
    // Keep only the last MAX_HISTORY_SIZE positions to avoid memory issues
    if (this.boardHistory.length > this.MAX_HISTORY_SIZE) {
      this.boardHistory.shift(); // Remove oldest position
    }
    
    console.log('Board history updated. Size:', this.boardHistory.length);
  }

  /**
   * Counts how many times a position appears in history
   */
  private countRepetitions(boardHash: string): number {
    return this.boardHistory.filter(hash => hash === boardHash).length;
  }

  /**
   * Animates a multiple capture path for the bot
   */
  animateBotCapturePath(startRow: number, startCol: number, path: string[]) {
    // Stop any running animations
    if (this.captureAnimationInterval) {
      clearInterval(this.captureAnimationInterval);
      this.captureAnimationInterval = null;
    }

    this.isAnimatingCapture = true;

    // Build complete path including starting position
    this.captureAnimationPath = [{ row: startRow, col: startCol }];

    // Add each position in the path
    for (const pos of path) {
      const row = parseInt(pos.charAt(0));
      const col = parseInt(pos.charAt(1));
      this.captureAnimationPath.push({ row, col });
    }

    this.captureAnimationStep = 0;

    // Save the color and king status of the moving piece
    const movingPiece = { ...this.board[startRow][startCol] };

    // Animation interval (move piece every 500ms)
    this.captureAnimationInterval = setInterval(() => {
      if (this.captureAnimationStep < this.captureAnimationPath.length - 1) {
        // Current position
        const current = this.captureAnimationPath[this.captureAnimationStep];
        // Next position
        const next = this.captureAnimationPath[this.captureAnimationStep + 1];

        // Calculate captured piece position
        const capturedRow = (current.row + next.row) / 2;
        const capturedCol = (current.col + next.col) / 2;

        // Apply movement animation to current piece
        const currentPieceElement = this.getPieceElement(current.row, current.col);
        if (currentPieceElement) {
          currentPieceElement.classList.add('moving');
        }

        // Apply capture animation to captured piece
        const capturedPieceElement = this.getPieceElement(capturedRow, capturedCol);
        if (capturedPieceElement) {
          capturedPieceElement.classList.add('captured');
        }

        // Wait for animation to finish before updating state
        setTimeout(() => {
          // Remove piece from current position
          this.board[current.row][current.col] = {
            hasPiece: false,
            pieceColor: null,
            isKing: false
          };

          // Remove captured piece
          this.board[capturedRow][capturedCol] = {
            hasPiece: false,
            pieceColor: null,
            isKing: false
          };
        }, 300); // Wait 300ms for animation

        // Check if piece becomes king
        if (!movingPiece.isKing) {
          if ((movingPiece.pieceColor === 'white' && next.row === 0) ||
            (movingPiece.pieceColor === 'black' && next.row === 7)) {
            // Piece becomes king
            movingPiece.isKing = true;

            // Play king promotion sound
            this.audioService.playKingSound();
          }
        }

        // Move piece to new position
        this.board[next.row][next.col] = {
          hasPiece: true,
          pieceColor: movingPiece.pieceColor,
          isKing: movingPiece.isKing
        };

        // Apply movement animation to piece in new position
        setTimeout(() => {
          const newPieceElement = this.getPieceElement(next.row, next.col);
          if (newPieceElement) {
            newPieceElement.classList.add('moving');
          }
        }, 10); // Small delay to ensure DOM is updated

        // Play capture sound
        this.audioService.playCaptureSound();

        // Advance to next animation step
        this.captureAnimationStep++;

        // Force interface update
        this.board = [...this.board];
      } else {
        // End of animation
        clearInterval(this.captureAnimationInterval);
        this.captureAnimationInterval = null;
        this.isAnimatingCapture = false;

        // Change turn
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';

        // Update piece count
        this.updatePieceCount();

        // Check if game is over
        this.checkGameOver();
      }
    }, 500); // 500ms delay between each animation step
  }

  /**
   * Updates piece count for both colors
   */
  updatePieceCount() {
    this.whiteCount = 0;
    this.blackCount = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = this.board[r][c];
        if (cell.hasPiece) {
          if (cell.pieceColor === 'white') this.whiteCount++;
          else this.blackCount++;
        }
      }
    }
  }

  /**
   * Handle cell clicks during animations and bot turns
   */
  override onCellClick(row: number, col: number): void {
    // If animation is running or bot is thinking or it's bot's turn, ignore clicks
    if (this.isAnimatingCapture || this.isThinking || this.currentPlayer === this.botColor) {
      return;
    }

    // Otherwise proceed normally
    super.onCellClick(row, col);
  }

  /**
   * Changes bot difficulty level
   */
  setDifficulty(level: number) {
    this.difficulty = level;
  }

  /**
   * Changes bot and player colors
   */
  setColors(botColor: 'black' | 'white') {
    this.botColor = botColor;
    this.playerColor = botColor === 'black' ? 'white' : 'black';

    // Reset game
    this.resetGame();

    // If bot starts, make its first move
    if (this.currentPlayer === this.botColor) {
      this.getBotMove();
    }
  }

  /**
   * Reset game and clear board history
   */
  override resetGame(): void {
    super.resetGame();

    // Stop any running animations
    if (this.captureAnimationInterval) {
      clearInterval(this.captureAnimationInterval);
      this.captureAnimationInterval = null;
    }

    this.isAnimatingCapture = false;
    this.isThinking = false;

    // Clear board history when game resets
    this.boardHistory = [];
    console.log('Game reset - board history cleared');

    // If bot starts, make its first move
    if (this.currentPlayer === this.botColor) {
      setTimeout(() => {
        this.getBotMove();
      }, 500);
    }
  }

  /**
   * Handle drag start with animation and bot turn checks
   */
  override onDragStart(event: DragEvent, row: number, col: number): void {
    // If animation is running, bot is thinking, or it's bot's turn, prevent drag
    if (this.isAnimatingCapture || this.isThinking || this.currentPlayer === this.botColor || this.gameOver) {
      event.preventDefault();
      return;
    }

    // Otherwise proceed normally
    super.onDragStart(event, row, col);
  }

  /**
   * Handle drag over with animation and bot turn checks
   */
  override onDragOver(event: DragEvent, row: number, col: number): void {
    // If animation is running, bot is thinking, or it's bot's turn, ignore drag over
    if (this.isAnimatingCapture || this.isThinking || this.currentPlayer === this.botColor || this.gameOver) {
      return;
    }

    // Otherwise proceed normally
    super.onDragOver(event, row, col);
  }

  /**
   * Handle drop with animation and bot turn checks
   */
  override onDrop(event: DragEvent, row: number, col: number): void {
    // If animation is running, bot is thinking, or it's bot's turn, ignore drop
    if (this.isAnimatingCapture || this.isThinking || this.currentPlayer === this.botColor || this.gameOver) {
      return;
    }

    // Otherwise proceed normally
    super.onDrop(event, row, col);
  }

  /**
   * Handle drag end with animation and bot turn checks
   */
  override onDragEnd(event: DragEvent): void {
    // If animation is running, bot is thinking, or it's bot's turn, ignore drag end
    if (this.isAnimatingCapture || this.isThinking || this.currentPlayer === this.botColor || this.gameOver) {
      return;
    }

    // Otherwise proceed normally
    super.onDragEnd(event);
  }

  /**
   * Show custom error message for bot game mode
   */
  override showTurnErrorMessage(): void {
    // Clear previous timer if exists
    if (this.errorMessageTimeout) {
      clearTimeout(this.errorMessageTimeout);
    }
    
    // Use bot-specific translation keys
    const key = this.currentPlayer === this.playerColor ? 
      'BOT.YOUR_TURN_ERROR' : 
      'BOT.BOT_TURN_ERROR';
      
    this.translate.get(key).subscribe((message: string) => {
      this.errorMessage = message;
      this.showErrorMessage = true;
    });
    
    this.errorMessageTimeout = setTimeout(() => {
      this.showErrorMessage = false;
      this.errorMessage = null;
    }, 3000);
  }

  /**
   * Debug method to log current history state
   */
  private logHistoryDebug(): void {
    console.log('=== BOARD HISTORY DEBUG ===');
    console.log('Total positions:', this.boardHistory.length);
    
    // Count unique positions
    const uniquePositions = new Set(this.boardHistory).size;
    console.log('Unique positions:', uniquePositions);
    console.log('Repeated positions:', this.boardHistory.length - uniquePositions);
    
    // Show most recent positions
    console.log('Last 5 positions:', this.boardHistory.slice(-5));
    console.log('========================');
  }

  /**
   * Get statistics about current game history
   */
  getHistoryStats(): { total: number, unique: number, repetitions: number } {
    const total = this.boardHistory.length;
    const unique = new Set(this.boardHistory).size;
    const repetitions = total - unique;
    
    return { total, unique, repetitions };
  }
}