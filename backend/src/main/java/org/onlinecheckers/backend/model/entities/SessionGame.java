package org.onlinecheckers.backend.model.entities;

import org.onlinecheckers.backend.model.entities.enums.Team;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
public class SessionGame extends BaseEntity {

	@Lob
	@Convert(converter = StringMatrixConverter.class)
	private String[][] board = new String[8][8];

	@Enumerated(EnumType.STRING)
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