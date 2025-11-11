package com.yahyashqair.jao.persistence;

import java.util.UUID;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TerminalRepository extends ReactiveCrudRepository<TerminalEntity, UUID> {
}
