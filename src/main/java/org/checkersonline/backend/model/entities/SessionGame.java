package org.checkersonline.backend.model.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.checkersonline.backend.model.entities.enums.Team;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
public class SessionGame extends BaseEntity
{
	@Lob
	@Convert(converter = StringMatrixConverter.class)
	private String[][] board = new String[8][8];


	private Team turno;
	private int pedineW;
	private int pedineB;
	private int damaW;
	private int damaB;
	private boolean partitaTerminata;
	@Enumerated(EnumType.STRING)
	private Team vincitore;


	@Transient
	private final String[][] BOARDINIT = {
			{"", "b", "", "b", "", "b", "", "b"},
			{"b", "", "b", "", "b", "", "b", ""},
			{"", "b", "", "b", "", "b", "", "b"},
			{"", "", "", "", "", "", "", ""},
			{"", "", "", "", "", "", "", ""},
			{"w", "", "w", "", "w", "", "w", ""},
			{"", "w", "", "w", "", "w", "", "w"},
			{"w", "", "w", "", "w", "", "w", ""}
	};



}
