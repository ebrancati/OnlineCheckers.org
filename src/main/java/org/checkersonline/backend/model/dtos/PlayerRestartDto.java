package org.checkersonline.backend.model.dtos;


import jakarta.persistence.Entity;
import jakarta.persistence.Id;

@Entity
public record PlayerRestartDto(

        @Id
        String gameID,
        String nicknameB,
        String nicknameW,
        boolean restartB,
        boolean restartW
) {
}
