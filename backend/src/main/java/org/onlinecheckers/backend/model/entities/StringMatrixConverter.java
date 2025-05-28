package org.onlinecheckers.backend.model.entities;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.hibernate.query.sqm.sql.ConversionException;

@Converter
public class StringMatrixConverter implements AttributeConverter<String[][], String>
{

	private final ObjectMapper objectMapper = new ObjectMapper();

	@Override
	public String convertToDatabaseColumn(String[][] matrix) {
		try {
			return objectMapper.writeValueAsString(matrix);
		} catch (Exception e) {
			throw new RuntimeException("Serialization error", e);
		}
	}

	@Override
	public String[][] convertToEntityAttribute(String dbData) {
		try {
			return objectMapper.readValue(dbData, String[][].class);
		} catch (Exception e) {
			throw new ConversionException("Deserialization error", e);
		}
	}
}