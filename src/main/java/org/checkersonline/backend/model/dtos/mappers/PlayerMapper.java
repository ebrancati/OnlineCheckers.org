package org.checkersonline.backend.model.dtos.mappers;


import org.checkersonline.backend.model.dtos.PlayerDto;
import org.checkersonline.backend.model.entities.Player;
import org.springframework.stereotype.Service;

@Service
public class PlayerMapper {

    public PlayerDto toDto(Player player) {
        return new PlayerDto(player.getNickname());
    }
}
