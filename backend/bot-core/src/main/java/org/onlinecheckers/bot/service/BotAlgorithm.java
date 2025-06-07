package org.onlinecheckers.bot.service;

import org.onlinecheckers.bot.dto.BotMoveRequestDto;
import org.onlinecheckers.bot.dto.BotMoveResponseDto;
import org.onlinecheckers.bot.model.Team;
import org.onlinecheckers.bot.model.Move;
import org.onlinecheckers.bot.model.MoveEvaluation;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Core bot algorithm for checkers game.
 */
public class BotAlgorithm {

    // Fields to track last moves for anti-repetition logic
    // This prevents the bot from creating infinite loops by repeating the same moves
    private String lastFromPosition = null;
    private String lastToPosition = null;
    private String secondLastFromPosition = null;
    private String secondLastToPosition = null;

    /**
     * Calculate the best move for the bot given the current board state.
     * This is the main entry point for bot move calculation.
     * 
     * @param request Contains board state, player color, difficulty, and move history
     * @return The calculated best move with from/to positions and capture path
     */
    public BotMoveResponseDto calculateMove(BotMoveRequestDto request) {
        // Convert playerColor string to Team enum for internal processing
        Team botTeam = request.getPlayerColor().equalsIgnoreCase("white") ? Team.WHITE : Team.BLACK;

        // Set minimax search depth based on difficulty level
        // Higher depth = stronger play but slower calculation
        int depth;
        switch (request.getDifficulty()) {
            case 1: depth = 1; break;  // Easy: 1 move ahead
            case 2: depth = 3; break;  // Medium: 3 moves ahead
            case 3: depth = 5; break;  // Hard: 5 moves ahead
            default: depth = 3;
        }

        // Execute MinMax algorithm with alpha-beta pruning for optimal move
        MoveEvaluation bestMove = minimax(
            request.getBoard(), 
            depth, 
            Integer.MIN_VALUE, 
            Integer.MAX_VALUE, 
            true, 
            botTeam
        );

        // Anti-repetition logic: check if this move would create a forbidden third repetition
        // Pattern blocked: A->B, then B->A, then A->B again (infinite loop prevention)
        if (wouldCreateThirdRepetition(bestMove.getFromPosition(), bestMove.getToPosition())) {
            System.out.println("Blocking third repetition of pattern: " + 
                              secondLastFromPosition + "->" + secondLastToPosition + " -> " +
                              lastFromPosition + "->" + lastToPosition + " -> " +
                              bestMove.getFromPosition() + "->" + bestMove.getToPosition());
            
            // Store the forbidden move positions for filtering
            final String forbiddenFrom = bestMove.getFromPosition();
            final String forbiddenTo = bestMove.getToPosition();
            
            // Find all available alternative moves
            List<Move> allMoves = getAllPossibleMoves(request.getBoard(), botTeam);
            
            // Filter out the forbidden repetitive move
            List<Move> alternativeMoves = allMoves.stream()
                .filter(move -> !isSameMove(move.getFromPosition(), move.getToPosition(), 
                                           forbiddenFrom, forbiddenTo))
                .collect(Collectors.toList());
            
            if (!alternativeMoves.isEmpty()) {
                // Evaluate alternative moves to pick the best non-repetitive option
                MoveEvaluation bestAlternative = null;
                for (Move altMove : alternativeMoves) {
                    String[][] boardCopy = copyBoard(request.getBoard());
                    applyMove(boardCopy, altMove);
                    int score = evaluateBoard(boardCopy, botTeam);
                    
                    if (bestAlternative == null || score > bestAlternative.getScore()) {
                        bestAlternative = new MoveEvaluation(score, altMove.getFromPosition(), 
                                                           altMove.getToPosition(), altMove.getCapturePath());
                    }
                }
                
                if (bestAlternative != null) {
                    bestMove = bestAlternative;
                    System.out.println("Selected alternative move: " + bestMove.getFromPosition() + "->" + bestMove.getToPosition());
                }
            }
        }

        // Update move history for future anti-repetition checks
        updateMoveHistory(bestMove.getFromPosition(), bestMove.getToPosition());

        // Safety check: if no valid move found, return a default "no move" response
        if (bestMove.getFromPosition() == null || bestMove.getToPosition() == null) {
            return new BotMoveResponseDto("00", "00", null);
        }

        System.out.println("Bot selected move: " + bestMove.getFromPosition() + " -> " + bestMove.getToPosition());

        // Convert internal move evaluation to API response format
        return new BotMoveResponseDto(
                bestMove.getFromPosition(),
                bestMove.getToPosition(),
                bestMove.getCapturePath()
        );
    }

    /**
     * Check if the current move would create a third repetition of the same pattern.
     * This prevents infinite loops in gameplay.
     * 
     * Pattern: A->B, then B->A, then A->B again (ALLOWED)
     * But: A->B, then B->A, then A->B, then B->A again (BLOCKED)
     */
    private boolean wouldCreateThirdRepetition(String fromPos, String toPos) {
        // Need at least 2 previous moves to detect a repetition pattern
        if (lastFromPosition == null || secondLastFromPosition == null) {
            return false;
        }
        
        // Check if we have the repetitive pattern: 
        // Move 1: A->B (secondLast)
        // Move 2: B->A (last) 
        // Move 3: A->B (current) - this would be the third repetition to block
        boolean isThirdInPattern = 
            // Current move is reverse of last move
            fromPos.equals(lastToPosition) && toPos.equals(lastFromPosition) &&
            // Last move was reverse of second-last move  
            lastFromPosition.equals(secondLastToPosition) && lastToPosition.equals(secondLastFromPosition) &&
            // Current move is same as second-last move (completing the cycle)
            fromPos.equals(secondLastFromPosition) && toPos.equals(secondLastToPosition);
        
        return isThirdInPattern;
    }

    /**
     * Check if two moves are identical (same from and to positions)
     */
    private boolean isSameMove(String from1, String to1, String from2, String to2) {
        return from1.equals(from2) && to1.equals(to2);
    }

    /**
     * Update the move history tracking (keep track of last 2 moves for anti-repetition)
     */
    private void updateMoveHistory(String fromPos, String toPos) {
        // Shift the history: current becomes last, last becomes second-last
        secondLastFromPosition = lastFromPosition;
        secondLastToPosition = lastToPosition;
        
        // Store current move as the new "last move"
        lastFromPosition = fromPos;
        lastToPosition = toPos;
    }

    /**
     * MinMax algorithm with alpha-beta pruning for optimal move calculation.
     * This is the core AI decision-making algorithm.
     * 
     * @param board Current board state
     * @param depth How many moves ahead to search
     * @param alpha Best value that maximizing player can guarantee
     * @param beta Best value that minimizing player can guarantee
     * @param isMaximizing True if current player is maximizing (bot), false if minimizing (opponent)
     * @param team The team color we're optimizing for
     * @return Best move evaluation found at this depth
     */
    private MoveEvaluation minimax(String[][] board, int depth, int alpha, int beta, 
                                   boolean isMaximizing, Team team) {
        
        // Base case: reached maximum search depth or game is over
        if (depth == 0 || isGameOver(board)) {
            int boardScore = evaluateBoard(board, team);
            return new MoveEvaluation(boardScore, null, null, null);
        }

        // Determine which team is moving at this level of the search tree
        Team opponentTeam = (team == Team.WHITE) ? Team.BLACK : Team.WHITE;
        Team currentTeam = isMaximizing ? team : opponentTeam;

        if (isMaximizing) {
            // Maximizing player: try to find the move with highest evaluation
            MoveEvaluation bestEval = new MoveEvaluation(Integer.MIN_VALUE, null, null, null);
            List<Move> possibleMoves = getAllPossibleMoves(board, currentTeam);

            // If no moves available, this position is losing
            if (possibleMoves.isEmpty()) {
                return new MoveEvaluation(Integer.MIN_VALUE, null, null, null);
            }

            // Evaluate each possible move
            for (Move move : possibleMoves) {
                // Create copy of board and apply move to simulate the position
                String[][] boardCopy = copyBoard(board);
                applyMove(boardCopy, move);

                // Recursively evaluate the resulting position
                MoveEvaluation eval = minimax(boardCopy, depth - 1, alpha, beta, false, team);

                // Calculate capture bonus: captures are generally good moves
                int captureCount = 0;
                if (move.getCapturePath() != null) {
                    captureCount = move.getCapturePath().size();
                }

                // Apply bonus for captures (encourage aggressive play)
                int adjustedScore = eval.getScore() + (captureCount * 5);

                // Update best evaluation if this move is better
                if (adjustedScore > bestEval.getScore() ||
                        (adjustedScore == bestEval.getScore() && captureCount > bestEval.getCaptureCount())) {
                    bestEval = new MoveEvaluation(
                            adjustedScore,
                            move.getFromPosition(),
                            move.getToPosition(),
                            move.getCapturePath(),
                            captureCount
                    );
                }

                // Alpha-beta pruning: if this branch is already worse than beta, skip remaining moves
                alpha = Math.max(alpha, adjustedScore);
                if (beta <= alpha) {
                    break; // Beta cutoff
                }
            }

            return bestEval;
        } else {
            // Minimizing player: try to find the move with lowest evaluation (opponent's perspective)
            MoveEvaluation bestEval = new MoveEvaluation(Integer.MAX_VALUE, null, null, null);
            List<Move> possibleMoves = getAllPossibleMoves(board, currentTeam);

            // If no moves available, this position is winning for us
            if (possibleMoves.isEmpty()) {
                return new MoveEvaluation(Integer.MAX_VALUE, null, null, null);
            }

            // Evaluate each possible opponent move
            for (Move move : possibleMoves) {
                String[][] boardCopy = copyBoard(board);
                applyMove(boardCopy, move);

                MoveEvaluation eval = minimax(boardCopy, depth - 1, alpha, beta, true, team);

                // Calculate capture penalty from our perspective (opponent captures are bad for us)
                int captureCount = 0;
                if (move.getCapturePath() != null) {
                    captureCount = move.getCapturePath().size();
                }

                int adjustedScore = eval.getScore() - (captureCount * 5);

                // Update best evaluation (from minimizing perspective)
                if (adjustedScore < bestEval.getScore() ||
                        (adjustedScore == bestEval.getScore() && captureCount > bestEval.getCaptureCount())) {
                    bestEval = new MoveEvaluation(
                            adjustedScore,
                            move.getFromPosition(),
                            move.getToPosition(),
                            move.getCapturePath(),
                            captureCount
                    );
                }

                // Alpha-beta pruning from minimizing perspective
                beta = Math.min(beta, adjustedScore);
                if (beta <= alpha) {
                    break; // Alpha cutoff
                }
            }

            return bestEval;
        }
    }

    /**
     * Check if the game has ended (one side has no pieces left)
     */
    private boolean isGameOver(String[][] board) {
        boolean whiteExists = false;
        boolean blackExists = false;

        // Scan the entire board for remaining pieces
        for (int i = 0; i < 8; i++) {
            for (int j = 0; j < 8; j++) {
                String piece = board[i][j];
                if (piece == null || piece.isEmpty()) continue;

                if (piece.equalsIgnoreCase("w")) {
                    whiteExists = true;
                } else if (piece.equalsIgnoreCase("b")) {
                    blackExists = true;
                }

                // Early exit if both sides still have pieces
                if (whiteExists && blackExists) return false;
            }
        }

        // Game is over if one player has no pieces remaining
        return true;
    }

    /**
     * Evaluate the current board position from the perspective of the given team.
     * Higher scores indicate better positions for the team.
     * 
     * Evaluation factors:
     * - Material count (pieces vs opponent pieces)
     * - Piece advancement (pieces closer to promotion)
     * - Board control (pieces on edges are harder to capture)
     * - King promotion bonuses
     */
    private int evaluateBoard(String[][] board, Team team) {
        int whiteScore = 0;
        int blackScore = 0;

        // Evaluate each square on the board
        for (int i = 0; i < 8; i++) {
            for (int j = 0; j < 8; j++) {
                String piece = board[i][j];
                if (piece == null || piece.isEmpty()) continue;

                // Base piece values: Pawns worth 10 points, Kings worth 20 points
                // Kings are more valuable because they can move in all directions
                int value = Character.isUpperCase(piece.charAt(0)) ? 20 : 10;

                // Positional bonus: reward pieces that are advancing toward promotion
                int positionalBonus = 0;
                if (piece.toLowerCase().equals("w")) {
                    // White pieces want to advance upward (toward row 0 for promotion)
                    positionalBonus = (7 - i) * 2;
                    
                    // Additional bonus for edge pieces (harder for opponent to capture)
                    if (j == 0 || j == 7) positionalBonus += 2;
                    
                    whiteScore += value + positionalBonus;
                } else {
                    // Black pieces want to advance downward (toward row 7 for promotion)
                    positionalBonus = i * 2;
                    
                    // Additional bonus for edge pieces
                    if (j == 0 || j == 7) positionalBonus += 2;
                    
                    blackScore += value + positionalBonus;
                }
            }
        }

        // Return relative score: positive favors our team, negative favors opponent
        return (team == Team.WHITE) ? (whiteScore - blackScore) : (blackScore - whiteScore);
    }

    /**
     * Get all possible legal moves for the specified team.
     * In checkers, captures are mandatory, so if captures are available,
     * only capture moves are returned.
     */
    private List<Move> getAllPossibleMoves(String[][] board, Team team) {
        List<Move> moves = new ArrayList<>();

        // Check for forced captures first (captures are mandatory in checkers)
        List<Move> captures = getAllCaptures(board, team);
        if (!captures.isEmpty()) {
            return captures; // If captures available, they are the only legal moves
        }

        // If no captures available, generate normal moves
        char pieceChar = (team == Team.WHITE) ? 'w' : 'b';

        // Scan board for pieces of the current team
        for (int i = 0; i < 8; i++) {
            for (int j = 0; j < 8; j++) {
                String piece = board[i][j];
                if (piece == null || piece.isEmpty()) continue;

                // Check if this piece belongs to the current team
                if (piece.toLowerCase().charAt(0) != pieceChar) continue;

                boolean isKing = Character.isUpperCase(piece.charAt(0));
                String fromPos = i + "" + j;

                // Determine valid movement directions based on piece type
                int[][] directions;
                if (isKing) {
                    // Kings can move in all four diagonal directions
                    directions = new int[][]{{1, 1}, {1, -1}, {-1, 1}, {-1, -1}};
                } else {
                    // Regular pieces can only move forward
                    if (team == Team.WHITE) {
                        directions = new int[][]{{-1, 1}, {-1, -1}}; // White moves up (decreasing row)
                    } else {
                        directions = new int[][]{{1, 1}, {1, -1}};   // Black moves down (increasing row)
                    }
                }

                // Check each possible direction for valid moves
                for (int[] dir : directions) {
                    int newRow = i + dir[0];
                    int newCol = j + dir[1];

                    // Ensure the destination is within board bounds
                    if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                        // Ensure the destination square is empty
                        if (board[newRow][newCol] == null || board[newRow][newCol].isEmpty()) {
                            String toPos = newRow + "" + newCol;
                            moves.add(new Move(fromPos, toPos, null));
                        }
                    }
                }
            }
        }

        return moves;
    }

    /**
     * Get all possible capture moves for the specified team.
     * Returns only the captures that result in the maximum number of pieces captured
     * (following standard checkers rules for mandatory maximum captures).
     */
    private List<Move> getAllCaptures(String[][] board, Team team) {
        List<Move> allCaptures = new ArrayList<>();

        // Identify piece characters for current team and opponent
        char pieceChar = (team == Team.WHITE) ? 'w' : 'b';
        char opponentChar = (team == Team.WHITE) ? 'b' : 'w';

        // Scan board for pieces that can make captures
        for (int i = 0; i < 8; i++) {
            for (int j = 0; j < 8; j++) {
                String piece = board[i][j];
                if (piece == null || piece.isEmpty()) continue;

                // Check if this piece belongs to the current team
                if (piece.toLowerCase().charAt(0) != pieceChar) continue;

                boolean isKing = Character.isUpperCase(piece.charAt(0));
                String fromPos = i + "" + j;

                // Determine capture directions based on piece type
                int[][] directions;
                if (isKing) {
                    // Kings can capture in all diagonal directions
                    directions = new int[][]{{1, 1}, {1, -1}, {-1, 1}, {-1, -1}};
                } else {
                    // Regular pieces can only capture in forward directions
                    if (team == Team.WHITE) {
                        directions = new int[][]{{-1, 1}, {-1, -1}}; // White captures upward
                    } else {
                        directions = new int[][]{{1, 1}, {1, -1}};   // Black captures downward
                    }
                }

                // Check each direction for possible captures
                for (int[] dir : directions) {
                    int captureRow = i + dir[0];      // Position of piece to capture
                    int captureCol = j + dir[1];
                    int landRow = i + 2 * dir[0];     // Landing position after capture
                    int landCol = j + 2 * dir[1];

                    // Ensure all positions are within board bounds
                    if (captureRow < 0 || captureRow >= 8 || captureCol < 0 || captureCol >= 8 ||
                            landRow < 0 || landRow >= 8 || landCol < 0 || landCol >= 8) {
                        continue;
                    }

                    // Check that there's an opponent piece to capture
                    String capturePiece = board[captureRow][captureCol];
                    if (capturePiece == null || capturePiece.isEmpty()) continue;
                    if (capturePiece.toLowerCase().charAt(0) != opponentChar) continue;

                    // Check that the landing square is empty
                    if (board[landRow][landCol] != null && !board[landRow][landCol].isEmpty()) continue;

                    // This is a valid capture - add it to the list
                    String toPos = landRow + "" + landCol;
                    List<String> path = new ArrayList<>();
                    path.add(toPos);

                    // Simulate the capture to check for additional consecutive captures
                    String[][] boardCopy = copyBoard(board);
                    boardCopy[landRow][landCol] = boardCopy[i][j];      // Move piece to landing position
                    boardCopy[i][j] = "";                              // Remove piece from original position
                    boardCopy[captureRow][captureCol] = "";             // Remove captured piece

                    // Handle king promotion during capture sequence
                    if (!isKing) {
                        if ((team == Team.WHITE && landRow == 0) || (team == Team.BLACK && landRow == 7)) {
                            boardCopy[landRow][landCol] = boardCopy[landRow][landCol].toUpperCase();
                            isKing = true; // Piece is now promoted to king
                        }
                    }

                    // Recursively search for additional captures from the landing position
                    List<List<String>> subPaths = new ArrayList<>();
                    findMultipleCaptures(boardCopy, team, landRow, landCol, isKing, subPaths, new HashSet<>());

                    if (subPaths.isEmpty()) {
                        // No additional captures possible - single capture move
                        allCaptures.add(new Move(fromPos, toPos, path));
                    } else {
                        // Additional captures found - create moves for each complete capture sequence
                        for (List<String> subPath : subPaths) {
                            List<String> fullPath = new ArrayList<>(path);
                            fullPath.addAll(subPath);
                            allCaptures.add(new Move(fromPos, fullPath.get(fullPath.size() - 1), fullPath));
                        }
                    }
                }
            }
        }

        // If no captures found, return empty list
        if (allCaptures.isEmpty()) {
            return allCaptures;
        }

        // Find the maximum number of captures in any single move sequence
        // (standard checkers rule: must make the move that captures the most pieces)
        int maxCaptures = 0;
        for (Move move : allCaptures) {
            int captureCount = 0;
            if (move.getCapturePath() != null) {
                captureCount = move.getCapturePath().size();
            }
            maxCaptures = Math.max(maxCaptures, captureCount);
        }

        // Return only the captures that achieve the maximum capture count
        List<Move> bestCaptures = new ArrayList<>();
        for (Move move : allCaptures) {
            int captureCount = 0;
            if (move.getCapturePath() != null) {
                captureCount = move.getCapturePath().size();
            }
            if (captureCount == maxCaptures) {
                bestCaptures.add(move);
            }
        }

        return bestCaptures;
    }

    /**
     * Recursively find multiple consecutive captures starting from a given position.
     * This handles the checkers rule where a piece must continue capturing if possible.
     * 
     * @param board Current board state after the previous capture
     * @param team Team making the captures
     * @param row Current row position of the capturing piece
     * @param col Current column position of the capturing piece
     * @param isKing Whether the capturing piece is a king
     * @param allPaths Output list to store all possible capture sequences
     * @param capturedPositions Set of positions already captured in this sequence (to avoid double-capture)
     */
    private void findMultipleCaptures(String[][] board, Team team, int row, int col, boolean isKing,
                                      List<List<String>> allPaths, Set<String> capturedPositions) {

        // Identify opponent pieces
        char opponentChar = (team == Team.WHITE) ? 'b' : 'w';

        // Determine valid capture directions for this piece
        int[][] directions;
        if (isKing) {
            // Kings can capture in all diagonal directions
            directions = new int[][]{{1, 1}, {1, -1}, {-1, 1}, {-1, -1}};
        } else {
            // Regular pieces can only capture in forward directions
            if (team == Team.WHITE) {
                directions = new int[][]{{-1, 1}, {-1, -1}}; // White captures upward
            } else {
                directions = new int[][]{{1, 1}, {1, -1}};   // Black captures downward
            }
        }

        boolean foundCapture = false;

        // Check each direction for additional capture opportunities
        for (int[] dir : directions) {
            int captureRow = row + dir[0];      // Position of piece to capture
            int captureCol = col + dir[1];
            int landRow = row + 2 * dir[0];     // Landing position after capture
            int landCol = col + 2 * dir[1];

            // Ensure positions are within board bounds
            if (captureRow < 0 || captureRow >= 8 || captureCol < 0 || captureCol >= 8 ||
                    landRow < 0 || landRow >= 8 || landCol < 0 || landCol >= 8) {
                continue;
            }

            String capturePos = captureRow + "" + captureCol;
            String capturePiece = board[captureRow][captureCol];
            
            // Validate this capture opportunity
            if (capturePiece == null || capturePiece.isEmpty()) continue;                    // No piece to capture
            if (capturePiece.toLowerCase().charAt(0) != opponentChar) continue;             // Not an opponent piece
            if (capturedPositions.contains(capturePos)) continue;                           // Already captured this piece
            if (board[landRow][landCol] != null && !board[landRow][landCol].isEmpty()) continue; // Landing square occupied

            String landPos = landRow + "" + landCol;
            
            // Create updated capture tracking set
            Set<String> newCapturedPositions = new HashSet<>(capturedPositions);
            newCapturedPositions.add(capturePos);

            // Simulate this capture
            String[][] boardCopy = copyBoard(board);
            boardCopy[landRow][landCol] = boardCopy[row][col]; // Move piece to landing position
            boardCopy[row][col] = "";                          // Remove piece from current position
            boardCopy[captureRow][captureCol] = "";            // Remove captured piece

            // Check for king promotion during the capture sequence
            boolean becameKing = false;
            if (!isKing) {
                if ((team == Team.WHITE && landRow == 0) || (team == Team.BLACK && landRow == 7)) {
                    boardCopy[landRow][landCol] = boardCopy[landRow][landCol].toUpperCase();
                    becameKing = true;
                }
            }

            // Recursively search for additional captures from the new position
            List<List<String>> subPaths = new ArrayList<>();
            findMultipleCaptures(boardCopy, team, landRow, landCol, isKing || becameKing, subPaths, newCapturedPositions);

            if (subPaths.isEmpty()) {
                // No further captures possible - end the sequence here
                List<String> path = new ArrayList<>();
                path.add(landPos);
                allPaths.add(path);
            } else {
                // Additional captures found - extend each sub-sequence with this capture
                for (List<String> subPath : subPaths) {
                    List<String> fullPath = new ArrayList<>();
                    fullPath.add(landPos);
                    fullPath.addAll(subPath);
                    allPaths.add(fullPath);
                }
            }

            foundCapture = true;
        }

        // If no additional captures were found, add an empty path to indicate end of sequence
        if (!foundCapture) {
            allPaths.add(new ArrayList<>());
        }
    }

    /**
     * Create a deep copy of the board to avoid modifying the original during simulations.
     * This is essential for the minimax algorithm which needs to test moves without
     * permanently altering the game state.
     */
    private String[][] copyBoard(String[][] board) {
        String[][] copy = new String[8][8];
        for (int i = 0; i < 8; i++) {
            for (int j = 0; j < 8; j++) {
                copy[i][j] = board[i][j];
            }
        }
        return copy;
    }

    /**
     * Apply a move to the board, handling both normal moves and capture sequences.
     * This method modifies the board state to reflect the completed move.
     * 
     * @param board The board to modify
     * @param move The move to apply (contains from/to positions and capture path)
     */
    private void applyMove(String[][] board, Move move) {
        // Parse move coordinates
        int fromRow = Integer.parseInt(move.getFromPosition().substring(0, 1));
        int fromCol = Integer.parseInt(move.getFromPosition().substring(1, 2));
        int toRow = Integer.parseInt(move.getToPosition().substring(0, 1));
        int toCol = Integer.parseInt(move.getToPosition().substring(1, 2));

        // Move the piece to its final destination
        String piece = board[fromRow][fromCol];
        board[toRow][toCol] = piece;
        board[fromRow][fromCol] = "";

        // Handle captures along the move path
        if (move.getCapturePath() != null && !move.getCapturePath().isEmpty()) {
            // Handle multiple capture sequence
            String currentPos = move.getFromPosition();

            for (String nextPos : move.getCapturePath()) {
                // Calculate positions involved in this capture step
                int curRow = Integer.parseInt(currentPos.substring(0, 1));
                int curCol = Integer.parseInt(currentPos.substring(1, 2));
                int nextRow = Integer.parseInt(nextPos.substring(0, 1));
                int nextCol = Integer.parseInt(nextPos.substring(1, 2));

                // Remove the captured piece (located between current and next positions)
                int capturedRow = (curRow + nextRow) / 2;
                int capturedCol = (curCol + nextCol) / 2;
                board[capturedRow][capturedCol] = "";

                currentPos = nextPos; // Move to next position in the capture sequence
            }
        } else if (Math.abs(fromRow - toRow) == 2 && Math.abs(fromCol - toCol) == 2) {
            // Handle single capture (piece moved diagonally by 2 squares)
            int capturedRow = (fromRow + toRow) / 2;
            int capturedCol = (fromCol + toCol) / 2;
            board[capturedRow][capturedCol] = "";
        }

        // Handle king promotion when pieces reach the opposite end of the board
        if (piece.equals("w") && toRow == 0) {
            board[toRow][toCol] = "W"; // Promote white piece to king
        } else if (piece.equals("b") && toRow == 7) {
            board[toRow][toCol] = "B"; // Promote black piece to king
        }
    }
}