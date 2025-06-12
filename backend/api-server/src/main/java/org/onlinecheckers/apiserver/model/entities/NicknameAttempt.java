package org.onlinecheckers.apiserver.model.entities;

import jakarta.persistence.*;
import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entity to track failed nickname attempts for moderation purposes
 */
@Entity
@Table(name = "nickname_attempts")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class NicknameAttempt {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    /**
     * The nickname that was attempted (original input)
     */
    @Column(name = "attempted_nickname", nullable = false, length = 255)
    private String attemptedNickname;
    
    /**
     * The normalized version of the nickname used for checking
     */
    @Column(name = "normalized_nickname", nullable = false, length = 255)
    private String normalizedNickname;
    
    /**
     * Number of times this exact nickname has been attempted
     */
    @Column(name = "attempt_count", nullable = false)
    private Integer attemptCount = 1;
    
    /**
     * The reason why this nickname was rejected
     * Values: BLACKLIST, URL_DETECTED, TOO_SHORT, TOO_LONG, etc.
     */
    @Column(name = "reason", nullable = false, length = 50)
    private String reason;
    
    /**
     * When this nickname was first attempted
     */
    @Column(name = "first_attempt", nullable = false)
    private LocalDateTime firstAttempt;
    
    /**
     * When this nickname was last attempted
     */
    @Column(name = "last_attempt", nullable = false)
    private LocalDateTime lastAttempt;
}