package org.onlinecheckers.backend.model.daos;

import org.onlinecheckers.backend.model.dtos.PlayerRestartDto;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlayerRestartDao extends JpaRepository<PlayerRestartDto, String> {}