package org.onlinecheckers.backend.model.daos;

import org.onlinecheckers.backend.model.entities.Game;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameDao extends JpaRepository<Game, String> {}