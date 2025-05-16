package org.checkersonline.backend.model.dtos;

import jakarta.persistence.ElementCollection;
import lombok.AllArgsConstructor;
import lombok.Data;
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