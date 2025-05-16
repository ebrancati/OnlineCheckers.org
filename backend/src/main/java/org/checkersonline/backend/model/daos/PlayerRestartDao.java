package org.checkersonline.backend.model.daos;

import org.checkersonline.backend.model.dtos.PlayerRestartDto;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlayerRestartDao extends JpaRepository<PlayerRestartDto, String> {
}
