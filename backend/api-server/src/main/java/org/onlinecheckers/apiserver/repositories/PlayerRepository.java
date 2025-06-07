package org.onlinecheckers.apiserver.repositories;

import org.onlinecheckers.apiserver.model.entities.Player;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PlayerRepository extends JpaRepository<Player, String> {
    List<Player> findByNickname(String nickname);
    void deleteAllByGameId(String gameId);
}
