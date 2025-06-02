package org.onlinecheckers.backend.model.dtos;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BotMoveResponseDto {
    private String from;
    private String to;
    private List<String> path;
}