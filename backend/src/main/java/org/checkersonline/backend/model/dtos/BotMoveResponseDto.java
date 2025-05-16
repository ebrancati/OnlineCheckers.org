package org.checkersonline.backend.model.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BotMoveResponseDto {
    private String from;
    private String to;
    private List<String> path; // Per catture multiple
}