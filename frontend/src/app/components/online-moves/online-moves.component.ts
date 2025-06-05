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
  styleUrl: './online-moves.component.css',
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
          
      const formattedMove = {
          notation: this.formatMove(move),
          isCaptureContinuation: false
      };

      if (isWhiteTurn) {
        currentTurnData.white.push(formattedMove);
        isWhiteTurn = false;
      } else {
        currentTurnData.black.push(formattedMove);
        isWhiteTurn = true;
        currentTurn++;

        // Prepare next turn if there are more moves
        if (this.moves.indexOf(move) < this.moves.length - 1) {
          this.displayMoves.push({
              number: currentTurn,
              white: [],
              black: []
          });
        }
      }
    }
  }

  /**
  * Calculate how many rows the turn number should occupy
  */
  getRowSpan(turn: TurnMoves): number {
    return Math.max(turn.white.length, turn.black.length);
  }

  /**
  * Checks whether a move is a continuation of a multiple capture
  */
  private isFollowUpCapture(prevMove: Move, currentMove: Move): boolean {
    return prevMove.to.row === currentMove.from.row &&
           prevMove.to.col === currentMove.from.col &&
           !!currentMove.captured;
  }

  /**
  * Converts the board coordinates to algebraic notation
  */
  protected toAlgebraic(row: number, col: number): string {
    const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const rows = ['1', '2', '3', '4', '5', '6', '7', '8'];
    return columns[col] + rows[row];
  }
  
  private formatCaptureChain(move: Move): string {
    const to = this.toAlgebraic(move.to.row, move.to.col);
    return `x${to}`;
  }

  /**
  * Formats a single move in algebraic notation
  */
  private formatMove(move: Move): string {
    const from = this.toAlgebraic(move.from.row, move.from.col);
    const to = this.toAlgebraic(move.to.row, move.to.col);
    return move.captured ? `${from}x${to}` : `${from}-${to}`;
  }
}