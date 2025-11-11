package com.yahyashqair.jao.domain;

import java.time.Instant;

public record FlowRecord(Long id, String name, String specification, Instant createdAt) {
}
