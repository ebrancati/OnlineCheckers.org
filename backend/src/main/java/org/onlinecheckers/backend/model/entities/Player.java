package org.onlinecheckers.backend.model.entities;

import org.onlinecheckers.backend.model.entities.enums.Team;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Player extends BaseEntity {
	
	private String nickname;
	@ManyToOne(fetch = FetchType.LAZY)
	@JsonIgnore
	@JoinColumn(name = "game_id")
	private Game game;
	@Enumerated(EnumType.STRING)
	private Team team;
}
