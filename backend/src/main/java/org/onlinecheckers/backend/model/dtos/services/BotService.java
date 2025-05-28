package org.onlinecheckers.backend.model.dtos.services;

import org.onlinecheckers.backend.model.dtos.BotMoveRequestDto;
import org.onlinecheckers.backend.model.dtos.BotMoveResponseDto;
import org.onlinecheckers.backend.model.entities.enums.Team;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class BotService {

    @Value("${bot.lambda.url:}")
    private String lambdaUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    // Fields to track last moves for anti-repetition
    private String lastFromPosition = null;
    private String lastToPosition = null;
    private String secondLastFromPosition = null;
    private String secondLastToPosition = null;

    /**
     * Calculate bot move using AWS Lambda
     */
    public BotMoveResponseDto calculateBotMoveLambda(BotMoveRequestDto request) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<BotMoveRequestDto> entity = new HttpEntity<>(request, headers);

            String endpoint = lambdaUrl + "/bot/move";
            ResponseEntity<BotMoveResponseDto> response = restTemplate.exchange(
                    endpoint, HttpMethod.POST, entity, BotMoveResponseDto.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            } else {
                // Fallback to local implementation
                return calculateBotMove(request);
            }
        } catch (Exception e) {
            // Fallback to local implementation
            return calculateBotMove(request);
        }
    }
    public BotMoveResponseDto calculateBotMove(BotMoveRequestDto request) {
        // Convert playerColor to Team
        Team botTeam = request.getPlayerColor().equalsIgnoreCase("white") ? Team.WHITE : Team.BLACK;

        // Set depth based on difficulty
        int depth;
        switch (request.getDifficulty()) {
            case 1: depth = 1; break;
            case 2: depth = 3; break;
            case 3: depth = 5; break;
            default: depth = 4; // Default medium
        }

        // Execute MinMax with alpha-beta pruning (simplified without board history)
        MoveEvaluation bestMove = minimax(
            request.getBoard(), 
            depth, 
            Integer.MIN_VALUE, 
            Integer.MAX_VALUE, 
            true, 
            botTeam
        );

        // Check if this would create a forbidden third repetition
        if (wouldCreateThirdRepetition(bestMove.getFromPosition(), bestMove.getToPosition())) {
            System.out.println("Blocking third repetition of pattern: " + 
                              secondLastFromPosition + "->" + secondLastToPosition + " -> " +
                              lastFromPosition + "->" + lastToPosition + " -> " +
                              bestMove.getFromPosition() + "->" + bestMove.getToPosition());
            
            // Store the forbidden move positions
            final String forbiddenFrom = bestMove.getFromPosition();
            final String forbiddenTo = bestMove.getToPosition();
            
            // Find alternative moves
            List<Move> allMoves = getAllPossibleMoves(request.getBoard(), botTeam);
            
            // Filter out the forbidden move
            List<Move> alternativeMoves = allMoves.stream()
                .filter(move -> !isSameMove(move.getFromPosition(), move.getToPosition(), 
                                           forbiddenFrom, forbiddenTo))
                .collect(Collectors.toList());
            
            if (!alternativeMoves.isEmpty()) {
                // Pick the best alternative move
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

        // Update move history
        updateMoveHistory(bestMove.getFromPosition(), bestMove.getToPosition());

        // If no move found, return default
        if (bestMove.getFromPosition() == null || bestMove.getToPosition() == null) {
            return new BotMoveResponseDto("00", "00", null);
        }

        System.out.println("Bot selected move: " + bestMove.getFromPosition() + " -> " + bestMove.getToPosition());

        // Convert result to response format
        return new BotMoveResponseDto(
                bestMove.getFromPosition(),
                bestMove.getToPosition(),
                bestMove.getCapturePath()
        );
    }

    /**
     * Check if the current move would create a third repetition of the same pattern
     * Pattern: A->B, then B->A, then A->B again (ALLOWED)
     * But: A->B, then B->A, then A->B, then B->A again (BLOCKED)
     */
    private boolean wouldCreateThirdRepetition(String fromPos, String toPos) {
        // Need at least 2 previous moves to detect pattern
        if (lastFromPosition == null || secondLastFromPosition == null) {
            return false;
        }
        
        // Check if we have the pattern: 
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
     * Check if two moves are the same
     */
    private boolean isSameMove(String from1, String to1, String from2, String to2) {
        return from1.equals(from2) && to1.equals(to2);
    }

    /**
     * Update the move history (keep track of last 2 moves)
     */
    private void updateMoveHistory(String fromPos, String toPos) {
        // Shift the history
        secondLastFromPosition = lastFromPosition;
        secondLastToPosition = lastToPosition;
        
        // Store current move
        lastFromPosition = fromPos;
        lastToPosition = toPos;
    }

    /**
     * Simplified MinMax algorithm without board history complexity
     */
    private MoveEvaluation minimax(String[][] board, int depth, int alpha, int beta, 
                                            boolean isMaximizing, Team team) {
        
        // Check for game end or max depth
        if (depth == 0 || isGameOver(board)) {
            int boardScore = evaluateBoard(board, team);
            return new MoveEvaluation(boardScore, null, null, null);
        }

        Team opponentTeam = (team == Team.WHITE) ? Team.BLACK : Team.WHITE;
        Team currentTeam = isMaximizing ? team : opponentTeam;

        if (isMaximizing) {
            MoveEvaluation bestEval = new MoveEvaluation(Integer.MIN_VALUE, null, null, null);
            List<Move> possibleMoves = getAllPossibleMoves(board, currentTeam);

            if (possibleMoves.isEmpty()) {
                return new MoveEvaluation(Integer.MIN_VALUE, null, null, null);
            }

            for (Move move : possibleMoves) {
                // Create copy of board and apply move
                String[][] boardCopy = copyBoard(board);
                applyMove(boardCopy, move);

                // Evaluate move recursively
                MoveEvaluation eval = minimax(boardCopy, depth - 1, alpha, beta, false, team);

                // Calculate capture count
                int captureCount = 0;
                if (move.getCapturePath() != null) {
                    captureCount = move.getCapturePath().size();
                }

                // Apply bonus for captures
                int adjustedScore = eval.getScore() + (captureCount * 5);

                // Update best evaluation
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

                // Alpha-beta pruning
                alpha = Math.max(alpha, adjustedScore);
                if (beta <= alpha) {
                    break;
                }
            }

            return bestEval;
        } else {
            // Minimizing player logic
            MoveEvaluation bestEval = new MoveEvaluation(Integer.MAX_VALUE, null, null, null);
            List<Move> possibleMoves = getAllPossibleMoves(board, currentTeam);

            if (possibleMoves.isEmpty()) {
                return new MoveEvaluation(Integer.MAX_VALUE, null, null, null);
            }

            for (Move move : possibleMoves) {
                String[][] boardCopy = copyBoard(board);
                applyMove(boardCopy, move);

                MoveEvaluation eval = minimax(boardCopy, depth - 1, alpha, beta, true, team);

                int captureCount = 0;
                if (move.getCapturePath() != null) {
                    captureCount = move.getCapturePath().size();
                }

                int adjustedScore = eval.getScore() - (captureCount * 5);

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

                beta = Math.min(beta, adjustedScore);
                if (beta <= alpha) {
                    break;
                }
            }

            return bestEval;
        }
    }

    // Class representing a possible move
    private static class Move {
        private String fromPosition;
        private String toPosition;
        private List<String> capturePath;

        public Move(String fromPosition, String toPosition, List<String> capturePath) {
            this.fromPosition = fromPosition;
            this.toPosition = toPosition;
            this.capturePath = capturePath;
        }

        public String getFromPosition() {
            return fromPosition;
        }

        public String getToPosition() {
            return toPosition;
        }

        public List<String> getCapturePath() {
            return capturePath;
        }
    }

    // Class to handle move evaluation results
    private static class MoveEvaluation {
        private int score;
        private String fromPosition;
        private String toPosition;
        private List<String> capturePath;
        private int captureCount;

        public MoveEvaluation(int score, String fromPosition, String toPosition, List<String> capturePath) {
            this(score, fromPosition, toPosition, capturePath, 0);
        }

        public MoveEvaluation(int score, String fromPosition, String toPosition, List<String> capturePath, int captureCount) {
            this.score = score;
            this.fromPosition = fromPosition;
            this.toPosition = toPosition;
            this.capturePath = capturePath;
            this.captureCount = captureCount;
        }

        public int getScore() {
            return score;
        }

        public String getFromPosition() {
            return fromPosition;
        }

        public String getToPosition() {
            return toPosition;
        }

        public List<String> getCapturePath() {
            return capturePath;
        }

        public int getCaptureCount() {
            return captureCount;
        }
    }

    // Check if game is over
    private boolean isGameOver(String[][] board) {
        boolean whiteExists = false;
        boolean blackExists = false;

        for (int i = 0; i < 8; i++) {
            for (int j = 0; j < 8; j++) {
                String piece = board[i][j];
                if (piece == null || piece.isEmpty()) continue;

                if (piece.equalsIgnoreCase("w")) {
                    whiteExists = true;
                } else if (piece.equalsIgnoreCase("b")) {
                    blackExists = true;
                }

                if (whiteExists && blackExists) return false; // Both players have pieces
            }
        }

        return true; // Game over if one player has no pieces
    }

    // Evaluate board position
    private int evaluateBoard(String[][] board, Team team) {
        int whiteScore = 0;
        int blackScore = 0;

        for (int i = 0; i < 8; i++) {
            for (int j = 0; j < 8; j++) {
                String piece = board[i][j];
                if (piece == null || piece.isEmpty()) continue;

                // Pawns: 10 points, Kings: 20 points
                int value = Character.isUpperCase(piece.charAt(0)) ? 20 : 10;

                // Positional bonus (e.g: advanced pawns or close to becoming kings)
                int positionalBonus = 0;
                if (piece.toLowerCase().equals("w")) {
                    // White wants to go up (row 0)
                    positionalBonus = (7 - i) * 2;

                    // Additional bonus for edge pieces (harder to capture)
                    if (j == 0 || j == 7) positionalBonus += 2;

                    whiteScore += value + positionalBonus;
                } else {
                    // Black wants to go down (row 7)
                    positionalBonus = i * 2;

                    // Additional bonus for edge pieces
                    if (j == 0 || j == 7) positionalBonus += 2;

                    blackScore += value + positionalBonus;
                }
            }
        }

        // Return score based on bot team
        return (team == Team.WHITE) ? (whiteScore - blackScore) : (blackScore - whiteScore);
    }

    // Get all possible moves for a player
    private List<Move> getAllPossibleMoves(String[][] board, Team team) {
        List<Move> moves = new ArrayList<>();

        // Priority to forced captures
        List<Move> captures = getAllCaptures(board, team);
        if (!captures.isEmpty()) {
            return captures;
        }

        // White or black piece?
        char pieceChar = (team == Team.WHITE) ? 'w' : 'b';

        // If no captures, add normal moves
        for (int i = 0; i < 8; i++) {
            for (int j = 0; j < 8; j++) {
                String piece = board[i][j];
                if (piece == null || piece.isEmpty()) continue;

                // Check if it's a piece of the correct team
                if (piece.toLowerCase().charAt(0) != pieceChar) continue;

                boolean isKing = Character.isUpperCase(piece.charAt(0));
                String fromPos = i + "" + j;

                // Movement directions
                int[][] directions;
                if (isKing) {
                    // Kings: all diagonal directions
                    directions = new int[][]{{1, 1}, {1, -1}, {-1, 1}, {-1, -1}};
                } else {
                    // Pawns: only forward
                    if (team == Team.WHITE) {
                        directions = new int[][]{{-1, 1}, {-1, -1}}; // White goes up
                    } else {
                        directions = new int[][]{{1, 1}, {1, -1}}; // Black goes down
                    }
                }

                // Check moves in each direction
                for (int[] dir : directions) {
                    int newRow = i + dir[0];
                    int newCol = j + dir[1];

                    // Check that position is valid
                    if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                        // Check that cell is empty
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

    // Get all possible captures, choosing those that maximize captured pieces
    private List<Move> getAllCaptures(String[][] board, Team team) {
        List<Move> allCaptures = new ArrayList<>();

        // White or black piece?
        char pieceChar = (team == Team.WHITE) ? 'w' : 'b';
        char opponentChar = (team == Team.WHITE) ? 'b' : 'w';

        for (int i = 0; i < 8; i++) {
            for (int j = 0; j < 8; j++) {
                String piece = board[i][j];
                if (piece == null || piece.isEmpty()) continue;

                // Check if it's a piece of the correct team
                if (piece.toLowerCase().charAt(0) != pieceChar) continue;

                boolean isKing = Character.isUpperCase(piece.charAt(0));
                String fromPos = i + "" + j;

                // Capture directions
                int[][] directions;
                if (isKing) {
                    // Kings: all diagonal directions
                    directions = new int[][]{{1, 1}, {1, -1}, {-1, 1}, {-1, -1}};
                } else {
                    // Pawns: only forward (depending on color)
                    if (team == Team.WHITE) {
                        // White goes up (row 0)
                        directions = new int[][]{{-1, 1}, {-1, -1}};
                    } else {
                        // Black goes down (row 7)
                        directions = new int[][]{{1, 1}, {1, -1}};
                    }
                }

                // Search for captures in each direction
                for (int[] dir : directions) {
                    int captureRow = i + dir[0];
                    int captureCol = j + dir[1];
                    int landRow = i + 2 * dir[0];
                    int landCol = j + 2 * dir[1];

                    // Check that positions are valid
                    if (captureRow < 0 || captureRow >= 8 || captureCol < 0 || captureCol >= 8 ||
                            landRow < 0 || landRow >= 8 || landCol < 0 || landCol >= 8) {
                        continue;
                    }

                    // Check that there's an opponent piece to capture
                    String capturePiece = board[captureRow][captureCol];
                    if (capturePiece == null || capturePiece.isEmpty()) continue;
                    if (capturePiece.toLowerCase().charAt(0) != opponentChar) continue;

                    // Check that landing cell is empty
                    if (board[landRow][landCol] != null && !board[landRow][landCol].isEmpty()) continue;

                    // Add this capture
                    String toPos = landRow + "" + landCol;
                    List<String> path = new ArrayList<>();
                    path.add(toPos);

                    // Simulate capture to search for successive captures
                    String[][] boardCopy = copyBoard(board);
                    boardCopy[landRow][landCol] = boardCopy[i][j]; // Move piece
                    boardCopy[i][j] = ""; // Remove piece from original position
                    boardCopy[captureRow][captureCol] = ""; // Remove captured piece

                    // King promotion if necessary
                    if (!isKing) {
                        if ((team == Team.WHITE && landRow == 0) || (team == Team.BLACK && landRow == 7)) {
                            boardCopy[landRow][landCol] = boardCopy[landRow][landCol].toUpperCase();
                            isKing = true; // Piece was promoted to king
                        }
                    }

                    // Recursively search for additional captures
                    List<List<String>> subPaths = new ArrayList<>();
                    findMultipleCaptures(boardCopy, team, landRow, landCol, isKing, subPaths, new HashSet<>());

                    if (subPaths.isEmpty()) {
                        // No successive captures
                        allCaptures.add(new Move(fromPos, toPos, path));
                    } else {
                        // There are successive captures, add each complete path
                        for (List<String> subPath : subPaths) {
                            List<String> fullPath = new ArrayList<>(path);
                            fullPath.addAll(subPath);
                            allCaptures.add(new Move(fromPos, fullPath.get(fullPath.size() - 1), fullPath));
                        }
                    }
                }
            }
        }

        // If no captures, return empty list
        if (allCaptures.isEmpty()) {
            return allCaptures;
        }

        // Determine maximum number of captures
        int maxCaptures = 0;
        for (Move move : allCaptures) {
            int captureCount = 0;
            if (move.getCapturePath() != null) {
                captureCount = move.getCapturePath().size();
            }
            maxCaptures = Math.max(maxCaptures, captureCount);
        }

        // Filter only captures with maximum number
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

    // Find multiple captures starting from a position
    private void findMultipleCaptures(String[][] board, Team team, int row, int col, boolean isKing,
                                      List<List<String>> allPaths, Set<String> capturedPositions) {

        // Opponent piece
        char opponentChar = (team == Team.WHITE) ? 'b' : 'w';

        // Capture directions
        int[][] directions;
        if (isKing) {
            // Kings: all diagonal directions
            directions = new int[][]{{1, 1}, {1, -1}, {-1, 1}, {-1, -1}};
        } else {
            // Pawns: only forward (depending on color)
            if (team == Team.WHITE) {
                // White goes up (row 0)
                directions = new int[][]{{-1, 1}, {-1, -1}};
            } else {
                // Black goes down (row 7)
                directions = new int[][]{{1, 1}, {1, -1}};
            }
        }

        boolean foundCapture = false;

        for (int[] dir : directions) {
            int captureRow = row + dir[0];
            int captureCol = col + dir[1];
            int landRow = row + 2 * dir[0];
            int landCol = col + 2 * dir[1];

            // Check that positions are valid
            if (captureRow < 0 || captureRow >= 8 || captureCol < 0 || captureCol >= 8 ||
                    landRow < 0 || landRow >= 8 || landCol < 0 || landCol >= 8) {
                continue;
            }

            // Position of piece to capture
            String capturePos = captureRow + "" + captureCol;

            // Check that there's an opponent piece to capture
            String capturePiece = board[captureRow][captureCol];
            if (capturePiece == null || capturePiece.isEmpty()) continue;
            if (capturePiece.toLowerCase().charAt(0) != opponentChar) continue;

            // Check that we haven't already captured this piece in this path
            if (capturedPositions.contains(capturePos)) continue;

            // Check that landing cell is empty
            if (board[landRow][landCol] != null && !board[landRow][landCol].isEmpty()) continue;

            // Landing position
            String landPos = landRow + "" + landCol;

            // Create copy of captured pieces set and add this one
            Set<String> newCapturedPositions = new HashSet<>(capturedPositions);
            newCapturedPositions.add(capturePos);

            // Create board copy to simulate capture
            String[][] boardCopy = copyBoard(board);
            boardCopy[landRow][landCol] = boardCopy[row][col]; // Move piece
            boardCopy[row][col] = ""; // Remove piece from original position
            boardCopy[captureRow][captureCol] = ""; // Remove captured piece

            // Check king promotion
            boolean becameKing = false;
            if (!isKing) {
                if ((team == Team.WHITE && landRow == 0) || (team == Team.BLACK && landRow == 7)) {
                    boardCopy[landRow][landCol] = boardCopy[landRow][landCol].toUpperCase();
                    becameKing = true;
                }
            }

            // Find additional captures
            List<List<String>> subPaths = new ArrayList<>();
            findMultipleCaptures(boardCopy, team, landRow, landCol, isKing || becameKing, subPaths, newCapturedPositions);

            if (subPaths.isEmpty()) {
                // No successive captures, add this single position
                List<String> path = new ArrayList<>();
                path.add(landPos);
                allPaths.add(path);
            } else {
                // Add this position to each successive path
                for (List<String> subPath : subPaths) {
                    List<String> fullPath = new ArrayList<>();
                    fullPath.add(landPos);
                    fullPath.addAll(subPath);
                    allPaths.add(fullPath);
                }
            }

            foundCapture = true;
        }

        // If we found no additional captures, return empty list
        if (!foundCapture) {
            allPaths.add(new ArrayList<>());
        }
    }

    // Copy board to avoid modifications to original board
    private String[][] copyBoard(String[][] board) {
        String[][] copy = new String[8][8];
        for (int i = 0; i < 8; i++) {
            for (int j = 0; j < 8; j++) {
                copy[i][j] = board[i][j];
            }
        }
        return copy;
    }

    // Apply a move to the board
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
            // Handle capture sequence
            String currentPos = move.getFromPosition();

            for (String nextPos : move.getCapturePath()) {
                int curRow = Integer.parseInt(currentPos.substring(0, 1));
                int curCol = Integer.parseInt(currentPos.substring(1, 2));
                int nextRow = Integer.parseInt(nextPos.substring(0, 1));
                int nextCol = Integer.parseInt(nextPos.substring(1, 2));

                // Calculate captured piece position
                int capturedRow = (curRow + nextRow) / 2;
                int capturedCol = (curCol + nextCol) / 2;

                // Remove captured piece
                board[capturedRow][capturedCol] = "";

                currentPos = nextPos;
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