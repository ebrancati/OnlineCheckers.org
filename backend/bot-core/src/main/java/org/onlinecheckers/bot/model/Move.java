package org.onlinecheckers.bot.model;

import java.util.List;

public class Move {
    private String fromPosition;
    private String toPosition;
    private List<String> capturePath;

    public Move(String fromPosition, String toPosition, List<String> capturePath) {
        this.fromPosition = fromPosition;
        this.toPosition = toPosition;
        this.capturePath = capturePath;
    }

    // Getters
    public String getFromPosition() {
        return fromPosition;
    }

    public String getToPosition() {
        return toPosition;
    }

    public List<String> getCapturePath() {
        return capturePath;
    }

    // Setters
    public void setFromPosition(String fromPosition) {
        this.fromPosition = fromPosition;
    }

    public void setToPosition(String toPosition) {
        this.toPosition = toPosition;
    }

    public void setCapturePath(List<String> capturePath) {
        this.capturePath = capturePath;
    }

    @Override
    public String toString() {
        return "Move{" +
                "from='" + fromPosition + '\'' +
                ", to='" + toPosition + '\'' +
                ", captures=" + (capturePath != null ? capturePath.size() : 0) +
                '}';
    }
}