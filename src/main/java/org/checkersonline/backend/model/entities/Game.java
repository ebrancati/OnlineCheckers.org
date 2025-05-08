package org.checkersonline.backend.model.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.checkersonline.backend.model.dtos.MoveDto;

import java.util.ArrayList;
import java.util.List;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Game extends SessionGame
{


	@OneToMany(mappedBy = "game")
	List<Player> players = new ArrayList<>();

	private String chat;

	private List<String> cronologiaMosse = new ArrayList<>();



	public void addPlayer(Player p) {
		if (players.size() >= 2) {
			throw new IllegalStateException("La partita ha già 2 giocatori");}
		players.add(p);
		p.setGame(this);
	}





}

