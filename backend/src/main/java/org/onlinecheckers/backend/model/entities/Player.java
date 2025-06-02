package org.onlinecheckers.backend.model.entities;

import org.onlinecheckers.backend.model.entities.enums.Team;
import jakarta.persistence.*;
import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnore;

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
