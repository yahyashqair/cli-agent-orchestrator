package com.yahyashqair.jao.domain;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record TerminalRegistrationRequest(
        @NotBlank String alias,
        @NotBlank String role,
        List<String> handles) {
}
