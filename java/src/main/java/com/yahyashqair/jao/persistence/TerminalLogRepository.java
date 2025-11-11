package com.yahyashqair.jao.persistence;

import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TerminalLogRepository extends ReactiveCrudRepository<TerminalLogEntity, Long> {
}
