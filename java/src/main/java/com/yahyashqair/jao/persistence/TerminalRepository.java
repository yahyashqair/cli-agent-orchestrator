package com.yahyashqair.jao.persistence;

import com.yahyashqair.jao.domain.TerminalStatus;
import java.util.UUID;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Mono;

public interface TerminalRepository extends ReactiveCrudRepository<TerminalEntity, UUID> {
    Mono<TerminalEntity> findByAlias(String alias);

    Mono<TerminalEntity> findByIdAndStatus(UUID id, TerminalStatus status);
}
