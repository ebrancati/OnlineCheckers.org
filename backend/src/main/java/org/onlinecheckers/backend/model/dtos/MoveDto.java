package org.onlinecheckers.backend.model.dtos;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class MoveDto {
    private String from;
    private String to;
    private String player;
    private List<String> path;
}