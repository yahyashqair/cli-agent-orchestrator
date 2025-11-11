package com.yahyashqair.jao.domain;

import jakarta.validation.constraints.NotBlank;

public record SendMessageRequest(@NotBlank String routeType, @NotBlank String routeValue, @NotBlank String payload) {
}
