package org.onlinecheckers.backend.repositories;

import org.onlinecheckers.backend.model.dtos.PlayerRestartDto;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlayerRestartRepository extends JpaRepository<PlayerRestartDto, String> {}