package org.onlinecheckers.apiserver.model.entities;

import jakarta.persistence.Converter;
import jakarta.persistence.AttributeConverter;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Converter
public class StringListConverter implements AttributeConverter<List<String>, String> {

    private static final String SEPARATOR = ";";

    @Override
    public String convertToDatabaseColumn(List<String> list) {
        return list != null && !list.isEmpty()
                ? String.join(SEPARATOR, list)
                : "";
    }

    @Override
    public List<String> convertToEntityAttribute(String joined) {
        return joined != null && !joined.isBlank()
                ? new ArrayList<>(Arrays.asList(joined.split(SEPARATOR)))
                : new ArrayList<>();
    }
}