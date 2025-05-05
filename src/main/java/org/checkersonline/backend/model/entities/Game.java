package org.checkersonline.backend.model.entities;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.OneToMany;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.checkersonline.backend.model.entities.enums.Team;

import java.util.List;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Game extends BaseEntity
{
	@OneToMany(mappedBy = "game")
	List<Player> players;
	public void addPlayer(Player p) {
		if (players.size() >= 2) {
			throw new IllegalStateException("La partita ha già 2 giocatori");}
		players.add(p);
		p.setGame(this);}
}

