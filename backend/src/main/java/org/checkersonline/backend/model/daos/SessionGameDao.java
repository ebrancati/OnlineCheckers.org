package org.checkersonline.backend.model.daos;
import org.checkersonline.backend.model.entities.SessionGame;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SessionGameDao extends JpaRepository<SessionGame, String>
{
}
