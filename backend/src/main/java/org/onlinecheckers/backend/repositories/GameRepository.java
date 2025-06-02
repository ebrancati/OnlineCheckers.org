package org.onlinecheckers.backend.repositories;

import org.onlinecheckers.backend.model.entities.Game;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameRepository extends JpaRepository<Game, String> {}