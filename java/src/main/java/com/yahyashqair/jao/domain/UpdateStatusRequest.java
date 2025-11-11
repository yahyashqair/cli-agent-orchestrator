package com.yahyashqair.jao.domain;

import jakarta.validation.constraints.NotBlank;

public record UpdateStatusRequest(
        @NotBlank String routeType,
        @NotBlank String routeValue,
        @NotBlank String status) {
}
