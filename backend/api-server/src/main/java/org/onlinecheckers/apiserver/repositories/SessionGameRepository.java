package org.onlinecheckers.apiserver.repositories;

import org.onlinecheckers.apiserver.model.entities.SessionGame;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SessionGameRepository extends JpaRepository<SessionGame, String> {}