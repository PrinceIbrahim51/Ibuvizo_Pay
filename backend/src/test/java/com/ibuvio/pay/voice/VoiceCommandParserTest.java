package com.ibuvio.pay.voice;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.ibuvio.pay.payment.PaymentDtos.Contact;
import com.ibuvio.pay.voice.VoiceDtos.ParseResponse;

class VoiceCommandParserTest {

    private final VoiceCommandParser parser = new VoiceCommandParser();
    private final List<Contact> contacts = List.of(new Contact("Amma", "amma@ibuvio"),
            new Contact("Rahul Verma", "rahul.verma@ibuvio"));

    @Test
    void tamilRomanised() {
        ParseResponse r = parser.parse("Amma-ku ₹500 anuppu", "ta", contacts);
        assertThat(r.intent()).isEqualTo(VoiceIntent.PAY);
        assertThat(r.amountPaise()).isEqualTo(50000);
        assertThat(r.payeeVpa()).isEqualTo("amma@ibuvio");
        assertThat(r.confirmation()).contains("அனுப்பவா");
    }

    @Test
    void tamilScriptWithNumberWords() {
        ParseResponse r = parser.parse("அம்மாவுக்கு ஐநூறு ரூபாய் அனுப்பு", "ta", contacts);
        assertThat(r.intent()).isEqualTo(VoiceIntent.PAY);
        assertThat(r.amountPaise()).isEqualTo(50000);
        assertThat(r.payeeVpa()).isEqualTo("amma@ibuvio");
    }

    @Test
    void hindiDevanagari() {
        ParseResponse r = parser.parse("राहुल को दो हज़ार पांच सौ भेजो", "hi", contacts);
        assertThat(r.intent()).isEqualTo(VoiceIntent.PAY);
        assertThat(r.amountPaise()).isEqualTo(250000);
        assertThat(r.payeeName()).isEqualTo("राहुल");
    }

    @Test
    void hindiRomanisedMatchesContact() {
        ParseResponse r = parser.parse("rahul ko 200 bhejo", "hi", contacts);
        assertThat(r.payeeVpa()).isEqualTo("rahul.verma@ibuvio");
        assertThat(r.amountPaise()).isEqualTo(20000);
    }

    @Test
    void englishPay() {
        ParseResponse r = parser.parse("Send 1,250 to Rahul", "en", contacts);
        assertThat(r.intent()).isEqualTo(VoiceIntent.PAY);
        assertThat(r.amountPaise()).isEqualTo(125000);
        assertThat(r.payeeVpa()).isEqualTo("rahul.verma@ibuvio");
    }

    @Test
    void shopSaleInTamil() {
        ParseResponse r = parser.parse("இன்று ஐநூறு ரூபாய் விற்பனை", "ta", contacts);
        assertThat(r.intent()).isEqualTo(VoiceIntent.RECORD_SALE);
        assertThat(r.amountPaise()).isEqualTo(50000);
        assertThat(r.paymentMode()).isEqualTo("CASH");
    }

    @Test
    void shopExpenseInHindiWithCategory() {
        ParseResponse r = parser.parse("1200 ka maal kharida", "hi", contacts);
        assertThat(r.intent()).isEqualTo(VoiceIntent.RECORD_EXPENSE);
        assertThat(r.amountPaise()).isEqualTo(120000);
        assertThat(r.category()).isEqualTo("STOCK");
    }

    @Test
    void englishWordsAmount() {
        ParseResponse r = parser.parse("spent two thousand five hundred on rent", "en", contacts);
        assertThat(r.intent()).isEqualTo(VoiceIntent.RECORD_EXPENSE);
        assertThat(r.amountPaise()).isEqualTo(250000);
        assertThat(r.category()).isEqualTo("RENT");
    }

    @Test
    void vpaDigitsAreNotMistakenForAmount() {
        ParseResponse r = parser.parse("pay 300 to 9876543210@ybl", "en", contacts);
        assertThat(r.amountPaise()).isEqualTo(30000);
        assertThat(r.payeeVpa()).isEqualTo("9876543210@ybl");
    }

    @Test
    void unknownCommand() {
        assertThat(parser.parse("what is the weather", "en", contacts).intent()).isEqualTo(VoiceIntent.UNKNOWN);
    }
}
