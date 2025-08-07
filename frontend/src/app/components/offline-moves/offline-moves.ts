import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Move {
  from: { row: number, col: number };
  to: { row: number, col: number };
  captured?: { row: number, col: number }[];
}

interface FormattedMove {
  notation: string;
  isCaptureContinuation: boolean;
}

interface TurnMoves {
  number: number;
  white: FormattedMove[];
  black: FormattedMove[];
}

@Component({
  selector: 'app-offline-moves',
  imports: [ CommonModule ],
  templateUrl: './offline-moves.html',
  styleUrl:    './offline-moves.css',
})
export class OfflineMovesComponent implements OnChanges {
  @Input() moves: Move[] = [];

  displayMoves: TurnMoves[] = [];

  ngOnChanges(): void {
    // Reset display moves
    this.displayMoves = [];

    if (this.moves.length === 0) return;

    // Move structure organized by turn
    const organizedMoves: TurnMoves[] = [];
    let currentTurn: TurnMoves = { number: 1, white: [], black: [] };
    let isWhiteTurn = true;
    let lastPosition: { row: number, col: number } | null = null;

    // Process all moves
    for (let i = 0; i < this.moves.length; i++) {
      const move = this.moves[i];
      
      // Check if it's a multiple capture
      const isMultiCapture = lastPosition !== null && 
                            move.from.row === lastPosition.row && 
                            move.from.col === lastPosition.col;
      
      // Format the move
      const formattedMove: FormattedMove = {
        notation: isMultiCapture ? 
                  this.formatCaptureChain(move) : 
                  this.formatMove(move),
        isCaptureContinuation: isMultiCapture
      };
      
      // Add the move to the current turn
      if (isWhiteTurn) {
        currentTurn.white.push(formattedMove);
        
        // If it is not a multiple capture or it is the last move, turn goes to black
        if (!move.captured || 
            i === this.moves.length - 1 || 
            this.moves[i+1].from.row !== move.to.row || 
            this.moves[i+1].from.col !== move.to.col) {
          isWhiteTurn = false;
        }
      } else {
        currentTurn.black.push(formattedMove);
        
        // If it is not a multiple capture or it is the last move, turn goes to white and a new turn begins
        if (!move.captured || 
            i === this.moves.length - 1 || 
            this.moves[i+1].from.row !== move.to.row || 
            this.moves[i+1].from.col !== move.to.col) {
          isWhiteTurn = true;
          organizedMoves.push(currentTurn);
          currentTurn = { number: currentTurn.number + 1, white: [], black: [] };
        }
      }
      
      // Update last position to detect multiple captures
      lastPosition = move.to;
    }
    
    // Add last round if not empty
    if (currentTurn.white.length > 0 || currentTurn.black.length > 0) {
      organizedMoves.push(currentTurn);
    }
    
    this.displayMoves = organizedMoves;

    setTimeout(() => {
      const movesDiv = document.querySelector('.moves') as HTMLElement;
      if (movesDiv) movesDiv.scrollTop = movesDiv.scrollHeight;
    }, 50);
  }

  /**
  * Calculate how many rows the shift number should occupy
  */
  getRowSpan(turn: TurnMoves): number {
    // Calculate the maximum number of moves between black and white players
    return Math.max(turn.white.length, turn.black.length);
  }

  private formatCaptureChain(move: Move): string {
    const to = this.toAlgebraic(move.to.row, move.to.col);
    return `x${to}`;
  }

  /**
  * Converts the board coordinates to algebraic notation
  */
  private toAlgebraic(row: number, col: number): string {
    const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const rows = ['8', '7', '6', '5', '4', '3', '2', '1'];
    return columns[col] + rows[row];
  }

  /**
  * Formats a single move in algebraic notation
  */
  private formatMove(move: Move): string {
    const from = this.toAlgebraic(move.from.row, move.from.col);
    const to = this.toAlgebraic(move.to.row, move.to.col);
    return move.captured ? `${from}x${to}` : `${from}-${to}`;
  }

  onScroll(event: Event): void {
    // This method can be used later if needed for scroll detection
  }
}