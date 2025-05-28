package org.onlinecheckers.botlambda.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class BotMoveRequestDto {
    private String[][] board;
    private String playerColor; // "white" or "black"
    private int difficulty; // 1, 2 or 3
    private List<String> boardHistory; // List of previous board states as hashes

    // Default constructor for Jackson
    public BotMoveRequestDto() {}

    public BotMoveRequestDto(String[][] board, String playerColor, int difficulty, List<String> boardHistory) {
        this.board = board;
        this.playerColor = playerColor;
        this.difficulty = difficulty;
        this.boardHistory = boardHistory;
    }

    // Getters and setters
    public String[][] getBoard() {
        return board;
    }

    public void setBoard(String[][] board) {
        this.board = board;
    }

    public String getPlayerColor() {
        return playerColor;
    }

    public void setPlayerColor(String playerColor) {
        this.playerColor = playerColor;
    }

    public int getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(int difficulty) {
        this.difficulty = difficulty;
    }

    public List<String> getBoardHistory() {
        return boardHistory;
    }

    public void setBoardHistory(List<String> boardHistory) {
        this.boardHistory = boardHistory;
    }
}