package org.onlinecheckers.backend.model.entities;

import jakarta.persistence.Converter;
import jakarta.persistence.AttributeConverter;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.onlinecheckers.backend.model.dtos.MoveDto;

@Converter
public class MoveDtoConverter implements AttributeConverter<MoveDto, String> {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(MoveDto moveDto) {

        if (moveDto == null) return null;

        try {
            return objectMapper.writeValueAsString(moveDto);
        } catch (Exception e) {
            throw new RuntimeException("Error serializing MoveDto", e);
        }
    }

    @Override
    public MoveDto convertToEntityAttribute(String dbData) {

        if (dbData == null || dbData.trim().isEmpty()) return null;

        try {
            return objectMapper.readValue(dbData, MoveDto.class);
        } catch (Exception e) {
            throw new RuntimeException("Error deserializing MoveDto", e);
        }
    }
}