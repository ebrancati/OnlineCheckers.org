package org.onlinecheckers.apiserver.model.dtos;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.Data;
import lombok.AllArgsConstructor;
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