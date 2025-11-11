package com.yahyashqair.jao.domain;

import jakarta.validation.constraints.NotBlank;

public record AssignTaskRequest(@NotBlank String routeType, @NotBlank String routeValue, @NotBlank String taskId, @NotBlank String description) {
}
