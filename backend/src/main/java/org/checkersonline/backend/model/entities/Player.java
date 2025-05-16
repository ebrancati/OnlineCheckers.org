package org.checkersonline.backend.model.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.checkersonline.backend.model.entities.enums.Team;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Player extends BaseEntity
{
	private String nickname;
	@ManyToOne(fetch = FetchType.LAZY)
	@JsonIgnore
	@JoinColumn(name = "game_id")
	private Game game;
	@Enumerated(EnumType.STRING)
	private Team team;
}
