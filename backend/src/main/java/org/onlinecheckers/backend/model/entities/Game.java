package org.onlinecheckers.backend.model.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Game extends SessionGame {

	@OneToMany(mappedBy = "game")
	List<Player> players = new ArrayList<>();

	@Column(columnDefinition = "TEXT")
	private String chat = "Chat:\n";

	@Column(columnDefinition = "TEXT")
	@Convert(converter = StringListConverter.class)
	private List<String> cronologiaMosse = new ArrayList<>();

	@Column(columnDefinition = "TEXT")
	@Convert(converter = StringListConverter.class)
	private List<String> lastMultiCapturePath = new ArrayList<>();

	public void addPlayer(Player p) {
		if (players.size() >= 2)
			throw new IllegalStateException("The game already has 2 players");

		players.add(p);
		p.setGame(this);
	}
}