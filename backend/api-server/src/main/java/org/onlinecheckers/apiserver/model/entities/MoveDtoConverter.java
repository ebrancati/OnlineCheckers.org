package org.onlinecheckers.apiserver.model.entities;

import org.onlinecheckers.apiserver.model.dtos.MoveDto;

import jakarta.persistence.Converter;
import jakarta.persistence.AttributeConverter;
import com.fasterxml.jackson.databind.ObjectMapper;

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