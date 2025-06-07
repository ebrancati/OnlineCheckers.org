package org.onlinecheckers.apiserver.model.entities;

import org.onlinecheckers.apiserver.model.entities.enums.Team;

import jakarta.persistence.*;
import lombok.Data;
import lombok.AllArgsConstructor;
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