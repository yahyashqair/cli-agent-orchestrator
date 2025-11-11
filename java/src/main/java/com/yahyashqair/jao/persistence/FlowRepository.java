package com.yahyashqair.jao.persistence;

import java.util.UUID;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;

public interface FlowRepository extends ReactiveCrudRepository<FlowEntity, UUID> {
}
