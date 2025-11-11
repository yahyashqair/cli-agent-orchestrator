package com.yahyashqair.jao.persistence;

import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;

public interface TerminalLogRepository extends ReactiveCrudRepository<TerminalLogEntity, UUID> {
    Flux<TerminalLogEntity> findByTerminalIdOrderByTimestampDesc(UUID terminalId, Pageable pageable);
}
