package org.onlinecheckers.backend.repositories;

import org.onlinecheckers.backend.model.entities.SessionGame;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SessionGameRepository extends JpaRepository<SessionGame, String> {}