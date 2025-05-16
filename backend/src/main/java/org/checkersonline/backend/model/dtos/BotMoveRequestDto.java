package org.checkersonline.backend.model.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BotMoveRequestDto {
    private String[][] board;
    private String playerColor; // "white" o "black"
    private int difficulty; // 1, 2 o 3
}