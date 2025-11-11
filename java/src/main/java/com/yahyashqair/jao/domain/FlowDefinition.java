package com.yahyashqair.jao.domain;

import jakarta.validation.constraints.NotBlank;

public record FlowDefinition(@NotBlank String name, @NotBlank String specification) {
}
