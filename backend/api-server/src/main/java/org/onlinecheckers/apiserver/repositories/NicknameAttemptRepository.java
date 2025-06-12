package org.onlinecheckers.apiserver.repositories;

import org.onlinecheckers.apiserver.model.entities.NicknameAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface NicknameAttemptRepository extends JpaRepository<NicknameAttempt, Long> {
    
    /**
     * Find a nickname attempt by the exact attempted nickname
     * @param attemptedNickname The nickname that was attempted
     * @return The NicknameAttempt record if found, null otherwise
     */
    NicknameAttempt findByAttemptedNickname(String attemptedNickname);
    
    /**
     * Find all attempts for a specific reason
     * @param reason The rejection reason (BLACKLIST, URL_DETECTED, etc.)
     * @return List of attempts with that reason
     */
    List<NicknameAttempt> findByReason(String reason);
    
    /**
     * Find attempts with high attempt counts (for monitoring)
     * @param minAttempts Minimum number of attempts
     * @return List of frequently attempted nicknames
     */
    @Query("SELECT na FROM NicknameAttempt na WHERE na.attemptCount >= :minAttempts ORDER BY na.attemptCount DESC")
    List<NicknameAttempt> findByAttemptCountGreaterThanEqual(@Param("minAttempts") Integer minAttempts);
    
    /**
     * Find attempts within a date range
     * @param startDate Start date for search
     * @param endDate End date for search
     * @return List of attempts in the date range
     */
    @Query("SELECT na FROM NicknameAttempt na WHERE na.lastAttempt BETWEEN :startDate AND :endDate ORDER BY na.lastAttempt DESC")
    List<NicknameAttempt> findByLastAttemptBetween(
        @Param("startDate") LocalDateTime startDate, 
        @Param("endDate") LocalDateTime endDate
    );
    
    /**
     * Count total number of blocked attempts by reason
     * @param reason The rejection reason
     * @return Total count of attempts for that reason
     */
    @Query("SELECT SUM(na.attemptCount) FROM NicknameAttempt na WHERE na.reason = :reason")
    Long countTotalAttemptsByReason(@Param("reason") String reason);
}