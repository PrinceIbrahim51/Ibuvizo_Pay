package com.ibuvio.pay.voice;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class VoiceDtos {

    private VoiceDtos() {}

    /** Text comes from the phone's speech recogniser; IBUVIO servers never receive the audio itself. */
    public record ParseRequest(
            @NotBlank @Size(max = 200) @Pattern(regexp = "^[\\p{L}\\p{M}\\p{N} .,'₹@?!:/-]{1,200}$") String text,
            @NotBlank @Pattern(regexp = "^(en|hi|ta|te)$") String language) {}

    public record ParseResponse(VoiceIntent intent, Long amountPaise, String payeeName, String payeeVpa,
                                boolean payeeMatched, String category, String paymentMode, String confirmation,
                                double confidence) {}
}
