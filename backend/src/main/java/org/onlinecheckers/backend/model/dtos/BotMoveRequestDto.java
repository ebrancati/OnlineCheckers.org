package org.onlinecheckers.backend.model.dtos;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BotMoveRequestDto {
    private String[][] board;
    private String playerColor; // "white" or "black"
    private int difficulty; // 1, 2 or 3
    private List<String> boardHistory; // List of previous board states as hashes
}