import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

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
  selector: 'app-online-moves',
  standalone: true,
  imports: [
    CommonModule, TranslateModule
  ],
  templateUrl: './online-moves.component.html',
  styleUrl:    './online-moves.component.css',
})
export class OnlineMovesComponent implements OnChanges {
  @Input() moves: Move[] = [];
  displayMoves: TurnMoves[] = [];

  ngOnChanges(): void {
    this.displayMoves = [];

    if (this.moves.length === 0) return;

    let currentTurn = 1;
    let isWhiteTurn = true;

    // Initialize first turn
    this.displayMoves.push({
      number: currentTurn,
      white: [],
      black: []
    });

    for (const move of this.moves) {
      const currentTurnData = this.displayMoves[this.displayMoves.length - 1];
      
      // Check if this is a multiple capture (more than 1 captured piece)
      const isMultipleCapture = move.captured && move.captured.length > 1;
      
      if (isMultipleCapture) {
        // For multiple captures, create multiple formatted moves
        const formattedMoves = this.formatMultipleCapture(move);
        
        if (isWhiteTurn) {
          currentTurnData.white.push(...formattedMoves);
        } else {
          currentTurnData.black.push(...formattedMoves);
        }
      } else {
        // Single move (normal or single capture)
        const formattedMove = {
          notation: this.formatMove(move),
          isCaptureContinuation: false
        };
        
        if (isWhiteTurn) {
          currentTurnData.white.push(formattedMove);
        } else {
          currentTurnData.black.push(formattedMove);
        }
      }

      // Switch turns
      isWhiteTurn = !isWhiteTurn;
      
      if (isWhiteTurn) {
        // Starting a new turn
        currentTurn++;
        this.displayMoves.push({
          number: currentTurn,
          white: [],
          black: []
        });
      }
    }

    // Remove last empty turn if exists
    if (this.displayMoves.length > 0) {
      const lastTurn = this.displayMoves[this.displayMoves.length - 1];
      if (lastTurn.white.length === 0 && lastTurn.black.length === 0) {
        this.displayMoves.pop();
      }
    }
  }

  /**
   * Format a multiple capture into multiple display moves
   */
  private formatMultipleCapture(move: Move): FormattedMove[] {
    if (!move.captured || move.captured.length <= 1) {
      return [{
        notation: this.formatMove(move),
        isCaptureContinuation: false
      }];
    }

    const formattedMoves: FormattedMove[] = [];
    
    // First move: from original position to first capture
    const firstMove = {
      notation: `${this.toAlgebraic(move.from.row, move.from.col)}x${this.findFirstCapturePosition(move)}`,
      isCaptureContinuation: false
    };
    formattedMoves.push(firstMove);

    // Subsequent moves: just the destination (we need to reconstruct the path)
    const intermediateMoves = this.reconstructCapturePath(move);
    for (let i = 1; i < intermediateMoves.length; i++) {
      formattedMoves.push({
        notation: `x${intermediateMoves[i]}`,
        isCaptureContinuation: true
      });
    }

    return formattedMoves;
  }

  /**
   * Reconstruct the capture path from captured pieces
   */
  private reconstructCapturePath(move: Move): string[] {
    if (!move.captured || move.captured.length <= 1) {
      return [this.toAlgebraic(move.to.row, move.to.col)];
    }

    // This is a simplified reconstruction - in a real scenario you'd need
    // to properly calculate the path based on the captured pieces positions
    const path: string[] = [];
    
    // For now, we'll create intermediate positions based on captured pieces
    // This is a heuristic and might need adjustment based on your specific game logic
    let currentRow = move.from.row;
    let currentCol = move.from.col;
    
    for (const captured of move.captured) {
      // Calculate the landing position after capturing this piece
      const deltaRow = captured.row - currentRow;
      const deltaCol = captured.col - currentCol;
      
      // The landing position is one step further in the same direction
      const landRow = captured.row + (deltaRow > 0 ? 1 : -1);
      const landCol = captured.col + (deltaCol > 0 ? 1 : -1);
      
      path.push(this.toAlgebraic(landRow, landCol));
      
      currentRow = landRow;
      currentCol = landCol;
    }

    return path;
  }

  /**
   * Find the first capture position for display
   */
  private findFirstCapturePosition(move: Move): string {
    if (!move.captured || move.captured.length === 0) {
      return this.toAlgebraic(move.to.row, move.to.col);
    }

    // Calculate first landing position
    const firstCaptured = move.captured[0];
    const deltaRow = firstCaptured.row - move.from.row;
    const deltaCol = firstCaptured.col - move.from.col;
    
    const landRow = firstCaptured.row + (deltaRow > 0 ? 1 : -1);
    const landCol = firstCaptured.col + (deltaCol > 0 ? 1 : -1);
    
    return this.toAlgebraic(landRow, landCol);
  }

  /**
   * Calculate how many rows the turn number should occupy
   */
  getRowSpan(turn: TurnMoves): number {
    return Math.max(turn.white.length, turn.black.length);
  }

  /**
   * Converts the board coordinates to algebraic notation
   */
  private toAlgebraic(row: number, col: number): string {
    const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const rows = ['1', '2', '3', '4', '5', '6', '7', '8'];
    return columns[col] + rows[row];
  }

  /**
   * Formats a single move in algebraic notation
   */
  private formatMove(move: Move): string {
    const from = this.toAlgebraic(move.from.row, move.from.col);
    const to = this.toAlgebraic(move.to.row, move.to.col);
    return move.captured && move.captured.length > 0 ? `${from}x${to}` : `${from}-${to}`;
  }
}