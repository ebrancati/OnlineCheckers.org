package org.checkersonline.backend.model.daos;

import org.checkersonline.backend.model.entities.Game;

import org.springframework.data.jpa.repository.JpaRepository;

public interface GameDao extends JpaRepository<Game, String>
{
}
