package org.onlinecheckers.apiserver.repositories;

import org.onlinecheckers.apiserver.model.entities.Game;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameRepository extends JpaRepository<Game, String> {}