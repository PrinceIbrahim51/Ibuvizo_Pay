package com.ibuvio.pay.voice;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ibuvio.pay.payment.PaymentService;
import com.ibuvio.pay.security.CurrentUser;
import com.ibuvio.pay.voice.VoiceDtos.ParseRequest;
import com.ibuvio.pay.voice.VoiceDtos.ParseResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/voice")
public class VoiceController {

    private final VoiceCommandParser parser;
    private final PaymentService payments;

    public VoiceController(VoiceCommandParser parser, PaymentService payments) {
        this.parser = parser;
        this.payments = payments;
    }

    @PostMapping("/parse")
    public ParseResponse parse(@Valid @RequestBody ParseRequest req) {
        return parser.parse(req.text(), req.language(), payments.recentContacts(CurrentUser.id()));
    }
}
