package org.checkersonline.backend.model.dtos;


import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
public class PlayerRestartDto{
        @Id
        String gameID;
        String nicknameB;
        String nicknameW;
        boolean restartB;
        boolean restartW;

}
