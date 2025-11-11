package com.yahyashqair.jao.domain;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record UpdateProgressRequest(
        @NotBlank String routeType,
        @NotBlank String routeValue,
        @NotBlank String taskId,
        @Min(0) @Max(100) int percent,
        String message) {
}
