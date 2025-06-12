package org.onlinecheckers.apiserver.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.onlinecheckers.apiserver.repositories.NicknameAttemptRepository;
import org.onlinecheckers.apiserver.model.entities.NicknameAttempt;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;

@Service
public class NicknameValidationService {

    @Autowired
    private NicknameAttemptRepository nicknameAttemptRepository;

    // Blacklist of forbidden words
    private static final List<String> BLACKLIST = Arrays.asList(
        // Impersonation terms
        "admin", "moderator"
    );

    // URL detection patterns
    private static final Pattern URL_PATTERN = Pattern.compile(
        "(?i).*(https?://|www\\.|\\.(com|it|org|net|edu|gov|co\\.uk).*)", 
        Pattern.CASE_INSENSITIVE
    );

    /**
     * Validates a nickname and logs failed attempts
     * @param nickname The nickname to validate
     * @return NicknameValidationResult with validation result and reason
     */
    public NicknameValidationResult validateNickname(String nickname) {
        // Basic validation (length, null check)
        if (nickname == null || nickname.trim().isEmpty()) {
            return new NicknameValidationResult(
                false,
                "EMPTY_NICKNAME",
                "Nickname cannot be empty"
            );
        }

        String trimmedNickname = nickname.trim();
        
        if (trimmedNickname.length() < 3) {
            return new NicknameValidationResult(
                false,
                "TOO_SHORT",
                "Nickname must be at least 3 characters"
            );
        }

        if (trimmedNickname.length() > 20) {
            return new NicknameValidationResult(
                false,
                "TOO_LONG",
                "Nickname cannot exceed 20 characters"
            );
        }

        // Check for URL patterns
        if (URL_PATTERN.matcher(trimmedNickname).matches()) {

            logFailedAttempt(trimmedNickname, trimmedNickname, "URL_DETECTED");

            return new NicknameValidationResult(
                false,
                "URL_DETECTED",
                "URLs are not allowed in nicknames"
            );
        }

        // Normalize nickname for blacklist check
        String normalizedNickname = normalizeNickname(trimmedNickname);
        
        // Check against blacklist
        for (String forbiddenWord : BLACKLIST) {
            if (normalizedNickname.contains(forbiddenWord)) {
                logFailedAttempt(trimmedNickname, normalizedNickname, "BLACKLIST");
                return new NicknameValidationResult(
                    false,
                    "INVALID_CONTENT",
                    "This nickname is not allowed"
                );
            }
        }

        // Nickname is valid
        return new NicknameValidationResult(true, null, null);
    }

    /**
     * Normalizes nickname by replacing common character substitutions
     * @param nickname Original nickname
     * @return Normalized nickname for blacklist checking
     */
    private String normalizeNickname(String nickname) {
        return nickname.toLowerCase()
            .replace("4", "a")
            .replace("3", "e") 
            .replace("1", "i")
            .replace("0", "o")
            .replace("5", "s")
            .replace("7", "t")
            .replace("@", "a")
            .replace("$", "s")
            .replace("!", "i")
            .replace("_", "")
            .replace("-", "")
            .replaceAll("\\s+", ""); // Remove all whitespace
    }

    /**
     * Logs a failed nickname attempt to the database
     * @param attemptedNickname The original attempted nickname
     * @param normalizedNickname The normalized version
     * @param reason The reason for rejection
     */
    private void logFailedAttempt(String attemptedNickname, String normalizedNickname, String reason) {
        try {
            NicknameAttempt existingAttempt = nicknameAttemptRepository
                .findByAttemptedNickname(attemptedNickname);

            if (existingAttempt != null) {
                // Increment existing attempt count
                existingAttempt.setAttemptCount(existingAttempt.getAttemptCount() + 1);
                existingAttempt.setLastAttempt(LocalDateTime.now());
                nicknameAttemptRepository.save(existingAttempt);
            } else {
                // Create new attempt record
                NicknameAttempt newAttempt = new NicknameAttempt();
                newAttempt.setAttemptedNickname(attemptedNickname);
                newAttempt.setNormalizedNickname(normalizedNickname);
                newAttempt.setAttemptCount(1);
                newAttempt.setReason(reason);
                newAttempt.setFirstAttempt(LocalDateTime.now());
                newAttempt.setLastAttempt(LocalDateTime.now());
                nicknameAttemptRepository.save(newAttempt);
            }
        } catch (Exception e) {
            System.err.println("Failed to log nickname attempt: " + e.getMessage());
        }
    }

    /**
     * Result class for nickname validation
     */
    public static class NicknameValidationResult {
        private final boolean valid;
        private final String errorCode;
        private final String errorMessage;

        public NicknameValidationResult(boolean valid, String errorCode, String errorMessage) {
            this.valid = valid;
            this.errorCode = errorCode;
            this.errorMessage = errorMessage;
        }

        public boolean isValid() { return valid; }
        public String getErrorCode() { return errorCode; }
        public String getErrorMessage() { return errorMessage; }
    }
}