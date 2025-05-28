package org.onlinecheckers.botlambda.model;

import java.util.List;

public class MoveEvaluation {
    private int score;
    private String fromPosition;
    private String toPosition;
    private List<String> capturePath;
    private int captureCount;

    public MoveEvaluation(int score, String fromPosition, String toPosition, List<String> capturePath) {
        this(score, fromPosition, toPosition, capturePath, capturePath != null ? capturePath.size() : 0);
    }

    public MoveEvaluation(int score, String fromPosition, String toPosition, List<String> capturePath, int captureCount) {
        this.score = score;
        this.fromPosition = fromPosition;
        this.toPosition = toPosition;
        this.capturePath = capturePath;
        this.captureCount = captureCount;
    }

    // Getters
    public int getScore() {
        return score;
    }

    public String getFromPosition() {
        return fromPosition;
    }

    public String getToPosition() {
        return toPosition;
    }

    public List<String> getCapturePath() {
        return capturePath;
    }

    public int getCaptureCount() {
        return captureCount;
    }

    // Setters
    public void setScore(int score) {
        this.score = score;
    }

    public void setFromPosition(String fromPosition) {
        this.fromPosition = fromPosition;
    }

    public void setToPosition(String toPosition) {
        this.toPosition = toPosition;
    }

    public void setCapturePath(List<String> capturePath) {
        this.capturePath = capturePath;
        this.captureCount = capturePath != null ? capturePath.size() : 0;
    }

    public void setCaptureCount(int captureCount) {
        this.captureCount = captureCount;
    }

    @Override
    public String toString() {
        return "MoveEvaluation{" +
                "score=" + score +
                ", from='" + fromPosition + '\'' +
                ", to='" + toPosition + '\'' +
                ", captures=" + captureCount +
                '}';
    }
}