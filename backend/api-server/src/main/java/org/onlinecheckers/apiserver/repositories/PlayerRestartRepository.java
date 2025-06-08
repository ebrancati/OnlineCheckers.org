package org.onlinecheckers.apiserver.repositories;

import org.onlinecheckers.apiserver.model.dtos.PlayerRestartDto;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlayerRestartRepository extends JpaRepository<PlayerRestartDto, String> {}