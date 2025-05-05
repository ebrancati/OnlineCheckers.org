package org.checkersonline.backend.model.dao;

import org.checkersonline.backend.model.entities.Player;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlayerDao extends JpaRepository<Player, Long>
{
}
