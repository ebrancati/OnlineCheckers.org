package org.checkersonline.backend.model.daos;

import org.checkersonline.backend.model.entities.Player;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlayerDao extends JpaRepository<Player, String>
{
    Player findByNickname(String nickname);
}
