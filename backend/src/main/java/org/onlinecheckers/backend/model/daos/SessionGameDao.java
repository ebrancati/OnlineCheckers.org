package org.onlinecheckers.backend.model.daos;

import org.onlinecheckers.backend.model.entities.SessionGame;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SessionGameDao extends JpaRepository<SessionGame, String> {}