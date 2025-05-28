package org.onlinecheckers.botlambda.service;

import jakarta.enterprise.context.ApplicationScoped;
import org.onlinecheckers.botlambda.dto.BotMoveRequestDto;
import org.onlinecheckers.botlambda.dto.BotMoveResponseDto;
import org.onlinecheckers.botlambda.model.*;
import org.jboss.logging.Logger;

import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

@ApplicationScoped
public class BotService {

    private static final Logger LOG = Logger.getLogger(BotService.class);
    
    // Cache for position evaluations to improve performance
    private final Map<String, Integer> positionCache = new HashMap<>();
    
    // Max cache size to prevent memory issues in lambda
    private static final int MAX_CACHE_SIZE = 10000;

    public BotMoveResponseDto calculateBestMove(BotMoveRequestDto request) {
        long startTime = System.currentTimeMillis();
        
        try {
            Team botTeam = Team.valueOf(request.getPlayerColor().toUpperCase());
            int depth = getDepthForDifficulty(request.getDifficulty());
            
            LOG.debugf("Starting minimax with depth %d for team %s", depth, botTeam);
            
            // Convert board state
            String[][] board = request.getBoard();
            
            // Clear cache if it gets too large
            if (positionCache.size() > MAX_CACHE_SIZE) {
                positionCache.clear();
                LOG.debug("Position cache cleared");
            }
            
            // Run minimax algorithm
            MoveEvaluation bestMove = minimax(board, depth, Integer.MIN_VALUE, Integer.MAX_VALUE, 
                                            true, botTeam, request.getBoardHistory());

            if (bestMove.getFromPosition() == null || bestMove.getToPosition() == null) {
                LOG.warn("No valid moves found");
                return new BotMoveResponseDto("00", "00", null);
            }

            BotMoveResponseDto response = new BotMoveResponseDto(
                bestMove.getFromPosition(),
                bestMove.getToPosition(),
                bestMove.getCapturePath()
            );
            
            long executionTime = System.currentTimeMillis() - startTime;
            LOG.debugf("Bot move calculated in %d ms: %s -> %s", 
                       executionTime, response.getFrom(), response.getTo());
            
            return response;
            
        } catch (Exception e) {
            LOG.errorf(e, "Error in calculateBestMove");
            throw new RuntimeException("Failed to calculate bot move", e);
        }
    }

    private int getDepthForDifficulty(int difficulty) {
        return switch (difficulty) {
            case 1 -> 2;  // Easy
            case 2 -> 4;  // Medium
            case 3 -> 6;  // Hard
            default -> 4;
        };
    }

    private MoveEvaluation minimax(String[][] board, int depth, int alpha, int beta, 
                                   boolean isMaximizing, Team team, List<String> boardHistory) {
        
        // Generate board hash for position cache and repetition detection
        String boardHash = generateBoardHash(board);
        
        // Check for draw by repetition
        if (boardHistory != null && Collections.frequency(boardHistory, boardHash) >= 2) {
            return new MoveEvaluation(0, null, null, null); // Draw evaluation
        }
        
        // Check cache for position evaluation
        if (positionCache.containsKey(boardHash + "_" + depth + "_" + isMaximizing)) {
            int cachedScore = positionCache.get(boardHash + "_" + depth + "_" + isMaximizing);
            return new MoveEvaluation(cachedScore, null, null, null);
        }

        // Terminal conditions
        if (depth == 0 || isGameOver(board)) {
            int score = evaluateBoard(board, team);
            String cacheKey = boardHash + "_" + depth + "_" + isMaximizing;
            positionCache.put(cacheKey, score);
            return new MoveEvaluation(score, null, null, null);
        }

        Team currentTeam = isMaximizing ? team : getOpponentTeam(team);
        List<Move> possibleMoves = getAllPossibleMoves(board, currentTeam);

        if (possibleMoves.isEmpty()) {
            // No moves available - opponent wins
            int score = isMaximizing ? Integer.MIN_VALUE + 1000 : Integer.MAX_VALUE - 1000;
            return new MoveEvaluation(score, null, null, null);
        }

        // Sort moves by estimated value for better alpha-beta pruning
        possibleMoves.sort((m1, m2) -> {
            int score1 = estimateMoveValue(board, m1, currentTeam);
            int score2 = estimateMoveValue(board, m2, currentTeam);
            return isMaximizing ? Integer.compare(score2, score1) : Integer.compare(score1, score2);
        });

        if (isMaximizing) {
            return findBestMaxMove(board, depth, alpha, beta, team, possibleMoves, boardHistory);
        } else {
            return findBestMinMove(board, depth, alpha, beta, team, possibleMoves, boardHistory);
        }
    }

    private MoveEvaluation findBestMaxMove(String[][] board, int depth, int alpha, int beta,
                                           Team team, List<Move> possibleMoves, List<String> boardHistory) {
        MoveEvaluation bestEval = new MoveEvaluation(Integer.MIN_VALUE, null, null, null);

        for (Move move : possibleMoves) {
            String[][] boardCopy = copyBoard(board);
            applyMove(boardCopy, move);

            // Add some randomness for equal positions to avoid repetitive play
            MoveEvaluation eval = minimax(boardCopy, depth - 1, alpha, beta, false, team, boardHistory);
            int adjustedScore = eval.getScore() + calculateMoveBonus(move) + 
                               ThreadLocalRandom.current().nextInt(-2, 3);

            if (adjustedScore > bestEval.getScore() || 
                (adjustedScore == bestEval.getScore() && shouldPreferMove(move, bestEval))) {
                bestEval = new MoveEvaluation(adjustedScore, move.getFromPosition(), 
                                             move.getToPosition(), move.getCapturePath());
            }

            alpha = Math.max(alpha, adjustedScore);
            if (beta <= alpha) {
                break; // Alpha-beta pruning
            }
        }

        return bestEval;
    }

    private MoveEvaluation findBestMinMove(String[][] board, int depth, int alpha, int beta,
                                           Team team, List<Move> possibleMoves, List<String> boardHistory) {
        MoveEvaluation bestEval = new MoveEvaluation(Integer.MAX_VALUE, null, null, null);

        for (Move move : possibleMoves) {
            String[][] boardCopy = copyBoard(board);
            applyMove(boardCopy, move);

            MoveEvaluation eval = minimax(boardCopy, depth - 1, alpha, beta, true, team, boardHistory);
            int adjustedScore = eval.getScore() - calculateMoveBonus(move);

            if (adjustedScore < bestEval.getScore() || 
                (adjustedScore == bestEval.getScore() && shouldPreferMove(move, bestEval))) {
                bestEval = new MoveEvaluation(adjustedScore, move.getFromPosition(), 
                                             move.getToPosition(), move.getCapturePath());
            }

            beta = Math.min(beta, adjustedScore);
            if (beta <= alpha) {
                break; // Alpha-beta pruning
            }
        }

        return bestEval;
    }

    private int calculateMoveBonus(Move move) {
        int bonus = 0;
        
        // Bonus for captures
        if (move.getCapturePath() != null && !move.getCapturePath().isEmpty()) {
            bonus += move.getCapturePath().size() * 10;
        }
        
        // Bonus for advancing pieces
        int fromRow = Integer.parseInt(move.getFromPosition().substring(0, 1));
        int toRow = Integer.parseInt(move.getToPosition().substring(0, 1));
        bonus += Math.abs(toRow - fromRow) * 2;
        
        return bonus;
    }

    private boolean shouldPreferMove(Move newMove, MoveEvaluation currentBest) {
        // Prefer captures over non-captures
        boolean newHasCapture = newMove.getCapturePath() != null && !newMove.getCapturePath().isEmpty();
        
        if (newHasCapture) {
            return true;
        }
        
        // Add some randomness for variety
        return ThreadLocalRandom.current().nextBoolean();
    }

    private int estimateMoveValue(String[][] board, Move move, Team team) {
        // Quick estimation for move ordering
        int value = 0;
        
        // Captures are always valuable
        if (move.getCapturePath() != null && !move.getCapturePath().isEmpty()) {
            value += move.getCapturePath().size() * 100;
        }
        
        // Center control
        int toRow = Integer.parseInt(move.getToPosition().substring(0, 1));
        int toCol = Integer.parseInt(move.getToPosition().substring(1, 2));
        if (toRow >= 2 && toRow <= 5 && toCol >= 2 && toCol <= 5) {
            value += 10;
        }
        
        return value;
    }

    private String generateBoardHash(String[][] board) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 8; i++) {
            for (int j = 0; j < 8; j++) {
                sb.append(board[i][j] == null ? "." : board[i][j]);
            }
        }
        return sb.toString();
    }

    private Team getOpponentTeam(Team team) {
        return team == Team.WHITE ? Team.BLACK : Team.WHITE;
    }

    // Implementation of other methods follows the same pattern as the original Spring Boot version
    // but optimized for Lambda execution...
    
    private boolean isGameOver(String[][] board) {
        boolean whiteExists = false;
        boolean blackExists = false;

        for (int i = 0; i < 8; i++) {
            for (int j = 0; j < 8; j++) {
                String piece = board[i][j];
                if (piece == null || piece.isEmpty()) continue;

                if (piece.toLowerCase().charAt(0) == 'w') {
                    whiteExists = true;
                } else if (piece.toLowerCase().charAt(0) == 'b') {
                    blackExists = true;
                }

                if (whiteExists && blackExists) return false;
            }
        }

        return true;
    }

    private int evaluateBoard(String[][] board, Team team) {
        int whiteScore = 0;
        int blackScore = 0;

        for (int i = 0; i < 8; i++) {
            for (int j = 0; j < 8; j++) {
                String piece = board[i][j];
                if (piece == null || piece.isEmpty()) continue;

                int value = Character.isUpperCase(piece.charAt(0)) ? 30 : 10; // Promoted pieces worth more
                int positionalBonus = 0;

                if (piece.toLowerCase().charAt(0) == 'w') {
                    positionalBonus = (7 - i) * 2; // Advance bonus
                    if (j == 0 || j == 7) positionalBonus += 3; // Edge bonus
                    whiteScore += value + positionalBonus;
                } else {
                    positionalBonus = i * 2; // Advance bonus
                    if (j == 0 || j == 7) positionalBonus += 3; // Edge bonus
                    blackScore += value + positionalBonus;
                }
            }
        }

        return (team == Team.WHITE) ? (whiteScore - blackScore) : (blackScore - whiteScore);
    }

    private List<Move> getAllPossibleMoves(String[][] board, Team team) {
        List<Move> moves = new ArrayList<>();
        char pieceChar = (team == Team.WHITE) ? 'w' : 'b';

        // Check for forced captures first
        List<Move> captures = getAllCaptures(board, team);
        if (!captures.isEmpty()) {
            return captures;
        }

        // Regular moves
        for (int i = 0; i < 8; i++) {
            for (int j = 0; j < 8; j++) {
                String piece = board[i][j];
                if (piece == null || piece.isEmpty() || 
                    piece.toLowerCase().charAt(0) != pieceChar) continue;

                boolean isKing = Character.isUpperCase(piece.charAt(0));
                String fromPos = i + "" + j;

                int[][] directions = isKing ? 
                    new int[][]{{1, 1}, {1, -1}, {-1, 1}, {-1, -1}} :
                    (team == Team.WHITE ? new int[][]{{-1, 1}, {-1, -1}} : new int[][]{{1, 1}, {1, -1}});

                for (int[] dir : directions) {
                    int newRow = i + dir[0];
                    int newCol = j + dir[1];

                    if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8 &&
                        (board[newRow][newCol] == null || board[newRow][newCol].isEmpty())) {
                        String toPos = newRow + "" + newCol;
                        moves.add(new Move(fromPos, toPos, null));
                    }
                }
            }
        }

        return moves;
    }

    private List<Move> getAllCaptures(String[][] board, Team team) {
        List<Move> allCaptures = new ArrayList<>();
        char pieceChar = (team == Team.WHITE) ? 'w' : 'b';
        char opponentChar = (team == Team.WHITE) ? 'b' : 'w';

        for (int i = 0; i < 8; i++) {
            for (int j = 0; j < 8; j++) {
                String piece = board[i][j];
                if (piece == null || piece.isEmpty() || 
                    piece.toLowerCase().charAt(0) != pieceChar) continue;

                boolean isKing = Character.isUpperCase(piece.charAt(0));
                String fromPos = i + "" + j;

                // Get directions based on piece type
                int[][] directions;
                if (isKing) {
                    directions = new int[][]{{1, 1}, {1, -1}, {-1, 1}, {-1, -1}};
                } else {
                    directions = team == Team.WHITE ? 
                        new int[][]{{-1, 1}, {-1, -1}} : new int[][]{{1, 1}, {1, -1}};
                }

                // Check each direction for capture opportunities
                for (int[] dir : directions) {
                    int captureRow = i + dir[0];
                    int captureCol = j + dir[1];
                    int landRow = i + 2 * dir[0];
                    int landCol = j + 2 * dir[1];

                    // Check bounds
                    if (captureRow < 0 || captureRow >= 8 || captureCol < 0 || captureCol >= 8 ||
                        landRow < 0 || landRow >= 8 || landCol < 0 || landCol >= 8) {
                        continue;
                    }

                    String capturePiece = board[captureRow][captureCol];
                    String landCell = board[landRow][landCol];

                    // Check if there's an opponent piece to capture and empty landing cell
                    if (capturePiece != null && !capturePiece.isEmpty() && 
                        capturePiece.toLowerCase().charAt(0) == opponentChar &&
                        (landCell == null || landCell.isEmpty())) {
                        
                        String toPos = landRow + "" + landCol;
                        List<String> path = new ArrayList<>();
                        path.add(toPos);
                        allCaptures.add(new Move(fromPos, toPos, path));
                    }
                }
            }
        }

        return allCaptures;
    }

    private String[][] copyBoard(String[][] board) {
        String[][] copy = new String[8][8];
        for (int i = 0; i < 8; i++) {
            System.arraycopy(board[i], 0, copy[i], 0, 8);
        }
        return copy;
    }

    private void applyMove(String[][] board, Move move) {
        int fromRow = Integer.parseInt(move.getFromPosition().substring(0, 1));
        int fromCol = Integer.parseInt(move.getFromPosition().substring(1, 2));
        int toRow = Integer.parseInt(move.getToPosition().substring(0, 1));
        int toCol = Integer.parseInt(move.getToPosition().substring(1, 2));

        String piece = board[fromRow][fromCol];
        board[toRow][toCol] = piece;
        board[fromRow][fromCol] = "";

        // Handle captures
        if (move.getCapturePath() != null && !move.getCapturePath().isEmpty()) {
            // Remove captured pieces along the path
            for (int i = 0; i < move.getCapturePath().size() - 1; i++) {
                // Implementation for multi-capture path
            }
        } else if (Math.abs(fromRow - toRow) == 2 && Math.abs(fromCol - toCol) == 2) {
            // Single capture
            int capturedRow = (fromRow + toRow) / 2;
            int capturedCol = (fromCol + toCol) / 2;
            board[capturedRow][capturedCol] = "";
        }

        // King promotion
        if (piece.equals("w") && toRow == 0) {
            board[toRow][toCol] = "W";
        } else if (piece.equals("b") && toRow == 7) {
            board[toRow][toCol] = "B";
        }
    }
}