package org.onlinecheckers.backend.services;

import org.onlinecheckers.backend.model.dtos.MoveDto;
import org.onlinecheckers.backend.model.entities.Game;
import org.onlinecheckers.backend.model.entities.enums.Team;
import org.onlinecheckers.backend.repositories.GameRepository;
import org.onlinecheckers.backend.exceptions.InvalidMoveException;
import org.onlinecheckers.backend.exceptions.SessionGameNotFoundException;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@Transactional
public class MoveService {
    @Autowired
    private GameRepository gameDao;

    public Game makeMove(String gameId, MoveDto dto) {

        // Load game
        Game game = gameDao.findById(gameId)
                .orElseThrow(() -> new SessionGameNotFoundException(gameId));

        // Player validation
        if (dto.getPlayer() == null)
            throw new InvalidMoveException("Player field is required");

        Team player;
        try {
            player = Team.valueOf(dto.getPlayer().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new InvalidMoveException("Invalid player: " + dto.getPlayer());
        }

        if (!player.equals(game.getTurno()))
            throw new InvalidMoveException("Not " + player + "'s turn.");

        String[][] board = game.getBoard();
        System.out.println("Stato scacchiera:");
        for (String[] row : board) {
            System.out.println(Arrays.toString(row));
        }

        // Extract coordinates
        int fromR = Character.getNumericValue(dto.getFrom().charAt(0));
        int fromC = Character.getNumericValue(dto.getFrom().charAt(1));
        int toR   = Character.getNumericValue(dto.getTo().charAt(0));
        int toC   = Character.getNumericValue(dto.getTo().charAt(1));

        System.out.println("Coordinate: from[" + fromR + "," + fromC + "] to[" + toR + "," + toC + "]");

        try {
            validateCoordinates(fromR, fromC);
            validateCoordinates(toR, toC);
        } catch (InvalidMoveException e) {
            throw e;
        }

        String piece = board[fromR][fromC];
        if (piece.isEmpty()) {
            throw new InvalidMoveException("No piece at position " + dto.getFrom());
        }

        boolean isWhitePiece = piece.equalsIgnoreCase("w");

        if ((player == Team.WHITE) != isWhitePiece)
            throw new InvalidMoveException("Piece does not belong to player.");

        if (!board[toR][toC].isEmpty())
            throw new InvalidMoveException("Destination " + dto.getTo() + " is not empty.");

        int dr = toR - fromR;
        int dc = toC - fromC;

        // Automatically detect catches
        boolean isPotentialCapture = Math.abs(dr) == 2 && Math.abs(dc) == 2;
        boolean isExplicitCapture = dto.getPath() != null && !dto.getPath().isEmpty();
        boolean isCapture = isExplicitCapture;

        // If it looks like a capture, check if there is an opponent's piece in the middle
        if (isPotentialCapture && !isCapture) {
            int midR = (fromR + toR) / 2;
            int midC = (fromC + toC) / 2;

            String midPiece = board[midR][midC];
            boolean isOpponentPiece = !midPiece.isEmpty() && (midPiece.equalsIgnoreCase("w") != isWhitePiece);

            if (isOpponentPiece) {
                // Create a path
                if (dto.getPath() == null) {
                    dto.setPath(new ArrayList<>());
                }
                dto.getPath().add(dto.getTo());
                isCapture = true;
            }
        }

        if (isCapture) {

            // Perform the captures following the path
            int currentR = fromR;
            int currentC = fromC;

            for (String position : dto.getPath()) {

                int pathR = Character.getNumericValue(position.charAt(0));
                int pathC = Character.getNumericValue(position.charAt(1));

                try {
                    validateCoordinates(pathR, pathC);
                } catch (InvalidMoveException e) {
                    throw e;
                }

                // Check validity of the jump
                int movedr = pathR - currentR;
                int movedc = pathC - currentC;

                if (Math.abs(movedr) != 2 || Math.abs(movedc) != 2) {
                    throw new InvalidMoveException("Invalid capture distance from " +
                        currentR + currentC + " to " + position +
                        ". Expected distance of 2, got dr=" + movedr + ", dc=" + movedc
                    );
                }

                // Calculate the position of the captured pawn
                int capturedR = (currentR + pathR) / 2;
                int capturedC = (currentC + pathC) / 2;

                String capturedPiece = board[capturedR][capturedC];

                if (capturedPiece.isEmpty())
                    throw new InvalidMoveException("No piece to capture at " + capturedR + capturedC);

                if (capturedPiece.equalsIgnoreCase(piece))
                    throw new InvalidMoveException("Cannot capture own piece at " + capturedR + capturedC);

                if (!board[pathR][pathC].isEmpty())
                    throw new InvalidMoveException("Destination in path is not empty: " + position);

                // Remove the captured pawn
                board[capturedR][capturedC] = "";

                // Update piece count
                if (capturedPiece.equalsIgnoreCase("w")) {
                    if (capturedPiece.equals("w"))
                        game.setPedineW(game.getPedineW() - 1);
                    else
                        game.setDamaW(game.getDamaW() - 1);
                } else {
                    if (capturedPiece.equals("b"))
                        game.setPedineB(game.getPedineB() - 1);
                    else
                        game.setDamaB(game.getDamaB() - 1);
                }

                // Add to move history
                String moveRecord = currentR    + ""    +
                                    currentC    + "-"   +
                                    pathR       + ""    +
                                    pathC       + "-"   +
                                    dto.getPlayer();

                game.getCronologiaMosse().add(moveRecord);

                // Temporarily move the piece for the next capture
                board[currentR][currentC] = "";

                // Check piece promotion after every single step
                if (piece.equals("w") && pathR == 0) {
                    // Promote white piece
                    piece = "W";
                    game.setPedineW(game.getPedineW() - 1);
                    game.setDamaW(game.getDamaW() + 1);
                }
                if (piece.equals("b") && pathR == 7) {
                    // Promote black piece
                    piece = "B";
                    game.setPedineB(game.getPedineB() - 1);
                    game.setDamaB(game.getDamaB() + 1);
                }

                // Place the piece in the new position
                board[pathR][pathC] = piece;

                // Update the current position for the next capture
                currentR = pathR;
                currentC = pathC;
            }
        }
        else {

            if (Character.isUpperCase(piece.charAt(0))) {
                // Promoted piece: free diagonal
                if (Math.abs(dr) != Math.abs(dc) || dr == 0) {
                    System.out.println("Errore: mossa diagonale non valida per dama");
                    throw new InvalidMoveException("Invalid simple move for king. Expected diagonal move, got dr=" + dr + ", dc=" + dc);
                }

                int stepR = dr / Math.abs(dr), stepC = dc / Math.abs(dc);
                for (int i = 1; i < Math.abs(dr); i++) {
                    int checkR = fromR + i*stepR;
                    int checkC = fromC + i*stepC;

                    if (!board[checkR][checkC].isEmpty()) {
                        throw new InvalidMoveException("Path is blocked for king move at [" + checkR + "," + checkC + "]");
                    }
                }
            } else {
                // Normal piece: a single diagonal forward
                if (Math.abs(dr) != 1 || Math.abs(dc) != 1) {
                    throw new InvalidMoveException("Invalid simple move for piece. Expected dr,dc=±1, got dr=" + dr + ", dc=" + dc);
                }
                if (piece.equals("w") && dr != -1) {
                    throw new InvalidMoveException("White piece can only move forward. Got dr=" + dr);
                }
                if (piece.equals("b") && dr != 1) {
                    throw new InvalidMoveException("Black piece can only move forward. Got dr=" + dr);
                }
            }

            // Add to move history
            String moveRecord = dto.getFrom() + "-" + dto.getTo() + "-" + dto.getPlayer();
            game.getCronologiaMosse().add(moveRecord);

            // Move the piece for the simple move
            board[fromR][fromC] = "";
            board[toR][toC] = piece;
        }

        // Check piece promotion
        if (!isCapture) {
            if (piece.equals("w") && toR == 0) {
                board[toR][toC] = "W";  // Promote white piece
                game.setPedineW(game.getPedineW() - 1);
                game.setDamaW(game.getDamaW() + 1);
            }
            if (piece.equals("b") && toR == 7) {
                board[toR][toC] = "B";  // Promote black piece
                game.setPedineB(game.getPedineB() - 1);
                game.setDamaB(game.getDamaB() + 1);
            }
        } else {
            // For multiple catches, check the promotion after the last stop
            String finalPiece = board[toR][toC];
            if (finalPiece.equals("w") && toR == 0) {
                board[toR][toC] = "W";  // Promote white piece
                game.setPedineW(game.getPedineW() - 1);
                game.setDamaW(game.getDamaW() + 1);
            }
            if (finalPiece.equals("b") && toR == 7) {
                board[toR][toC] = "B";  // Promote black piece
                game.setPedineB(game.getPedineB() - 1);
                game.setDamaB(game.getDamaB() + 1);
            }
        }

        // Change turn
        Team opponent = (player == Team.WHITE ? Team.BLACK : Team.WHITE);
        game.setTurno(opponent);

        // End of game check for missing pieces
        if (game.getPedineW() + game.getDamaW() == 0) {
            game.setPartitaTerminata(true);
            game.setVincitore(Team.BLACK);
        }
        if (game.getPedineB() + game.getDamaB() == 0) {
            game.setPartitaTerminata(true);
            game.setVincitore(Team.WHITE);
        }

        // Check if the opponent has any legal moves
        if (!game.isPartitaTerminata() && !hasAnyMoves(board, opponent)) {
            game.setPartitaTerminata(true);
            game.setVincitore(player);
        }

        if (isCapture && dto.getPath() != null && dto.getPath().size() > 1) {
            // Save the multi-capture path to show to the opponent
            List<String> fullPath = new ArrayList<>();
            fullPath.add(dto.getFrom()); // Add the starting position
            fullPath.addAll(dto.getPath()); // Add all intermediate positions
            game.setLastMultiCapturePath(fullPath);
        } else {
            // Clear the path for normal moves or single captures
            game.setLastMultiCapturePath(new ArrayList<>());
        }

        return gameDao.save(game);
    }

    private void validateCoordinates(int r, int c) {
        if (r < 0 || r > 7 || c < 0 || c > 7) {
            throw new InvalidMoveException("Coordinates out of bounds: (" + r + "," + c + ")");
        }
    }

    private List<int[]> findCapturePath(String[][] board, int r, int c,
                                        int destR, int destC, String piece) {
        return dfs(board, r, c, destR, destC, piece, new HashSet<>());
    }

    private List<int[]> dfs(
        String[][] board,
        int r,
        int c,
        int destR,
        int destC,
        String piece,
        Set<String> used
    ) {
        if (r == destR && c == destC) return new ArrayList<>();

        char pchar = piece.charAt(0);

        // Directions: four diagonals
        int[][] dirs = new int[][]{{1, 1}, {1, -1}, {-1, 1}, {-1, -1}};

        for (int[] d : dirs) {
            int dr = d[0], dc = d[1];
            if (Character.isUpperCase(pchar)) {
                for (int step = 1; ; step++) {
                    int midR = r + step * dr;
                    int midC = c + step * dc;
                    if (midR < 0 || midR > 7 || midC < 0 || midC > 7) break;
                    String cap = board[midR][midC];
                    if (cap.isEmpty()) continue;
                    if (cap.equalsIgnoreCase(piece)) break; // own piece
                    // opponent piece found
                    // try landing positions beyond
                    for (int landStep = 1; ; landStep++) {
                        int landR = midR + landStep * dr;
                        int landC = midC + landStep * dc;
                        if (landR < 0 || landR > 7 || landC < 0 || landC > 7) break;
                        if (!board[landR][landC].isEmpty()) break; // blocked
                        String key = midR + "," + midC + "->" + landR + "," + landC;
                        if (used.contains(key)) continue;
                        used.add(key);
                        List<int[]> path = dfs(board, landR, landC, destR, destC, piece, used);
                        if (path != null) {
                            List<int[]> full = new ArrayList<>();
                            full.add(new int[]{midR, midC});
                            full.addAll(path);
                            return full;
                        }
                        used.remove(key);
                    }
                    // only first opponent can be captured
                    break;
                }
            } else {
                // Normal Piece: only adjacent capture
                int midR = r + dr;
                int midC = c + dc;
                int landR = r + 2 * dr;
                int landC = c + 2 * dc;
                if (landR < 0 || landR > 7 || landC < 0 || landC > 7) continue;
                String cap = board[midR][midC];
                if (cap.isEmpty() || cap.equalsIgnoreCase(piece)) continue;
                if (!board[landR][landC].isEmpty()) continue;
                String key = midR + "," + midC + "->" + landR + "," + landC;
                if (used.contains(key)) continue;
                used.add(key);
                List<int[]> path = dfs(board, landR, landC, destR, destC, piece, used);
                if (path != null) {
                    List<int[]> full = new ArrayList<>();
                    full.add(new int[]{midR, midC});
                    full.addAll(path);
                    return full;
                }
                used.remove(key);
            }
        }
        return null;
    }

    /**
    * Check if has at least one move (simple or capture).
    */
    private boolean hasAnyMoves(String[][] board, Team team) {
        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; c++) {
                String cell = board[r][c];
                if (cell.isEmpty()) continue;
                boolean isWhite = cell.equalsIgnoreCase("w");
                if ((team == Team.WHITE) != isWhite) continue;

                // Capture possible?
                if (findCapturePath(board, r, c, r, c, cell) != null
                        && !findCapturePath(board, r, c, r, c, cell).isEmpty()) {
                    return true;
                }
                // Simple move possible?
                if (Character.isUpperCase(cell.charAt(0))) {
                    // Promoted piece: free diagonal of at least 1 step
                    int[][] dirs = {{1,1},{1,-1},{-1,1},{-1,-1}};
                    for (int[] d: dirs) {
                        int nr = r + d[0], nc = c + d[1];
                        if (nr<0||nr>7||nc<0||nc>7) continue;
                        if (board[nr][nc].isEmpty()) return true;
                    }
                } else {
                    // Normal piece: one move forward
                    int dr = isWhite ? -1 : 1;
                    int[][] forward = {{dr,1},{dr,-1}};
                    for (int[] d: forward) {
                        int nr = r + d[0], nc = c + d[1];
                        if (nr<0||nr>7||nc<0||nc>7) continue;
                        if (board[nr][nc].isEmpty()) return true;
                    }
                }
            }
        }
        
        return false;
    }
}