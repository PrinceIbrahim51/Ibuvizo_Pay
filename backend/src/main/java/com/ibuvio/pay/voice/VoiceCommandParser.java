package com.ibuvio.pay.voice;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

import com.ibuvio.pay.payment.PaymentDtos.Contact;
import com.ibuvio.pay.voice.VoiceDtos.ParseResponse;

/**
 * Rule-based multilingual intent parser for shopkeepers and non-tech users, e.g.
 *   "Amma-ku ₹500 anuppu"   (Tamil)  -> PAY 500 to Amma
 *   "Rahul ko 200 bhejo"     (Hindi)  -> PAY 200 to Rahul
 *   "ஐநூறு ரூபாய் விற்பனை"  (Tamil)  -> RECORD_SALE 500
 *   "spent 1200 on stock"    (English)-> RECORD_EXPENSE 1200 STOCK
 * The result is only a suggestion: the app always shows it for confirmation and payments still need the UPI PIN.
 */
@Component
public class VoiceCommandParser {

    private static final Pattern VPA = Pattern.compile("[a-z0-9][a-z0-9._-]{1,48}@[a-z][a-z0-9]{1,30}(?:\\.[a-z0-9]{2,20}){0,3}");

    private static final List<String> SALE = List.of("sold", "sale", "sales", "income", "becha", "बेचा", "बिक्री",
            "बिका", "kamai", "कमाई", "vitren", "விற்றேன்", "விற்பனை", "vitpanai", "varavu", "வரவு", "అమ్మాను",
            "అమ్మకం", "ammanu");
    private static final List<String> EXPENSE = List.of("spent", "expense", "bought", "purchase", "purchased",
            "kharcha", "खर्च", "खर्चा", "kharida", "खरीदा", "selavu", "செலவு", "vaanginen", "வாங்கினேன்", "ఖర్చు",
            "kharchu", "కొన్నాను", "konnanu");
    private static final List<String> PAY = List.of("pay", "send", "transfer", "bhejo", "bhej", "भेजो", "भेज",
            "भेजना", "dedo", "दे", "anuppu", "அனுப்பு", "அனுப்பவும்", "அனுப்புங்க", "kudu", "கொடு", "கொடுங்க",
            "pampu", "పంపు", "పంపండి", "ivvu", "ఇవ్వు");

    private static final Map<String, List<String>> CATEGORIES = Map.of(
            "STOCK", List.of("stock", "maal", "माल", "சரக்கு", "sarakku", "goods", "saman", "सामान", "సరుకు"),
            "RENT", List.of("rent", "kiraya", "किराया", "வாடகை", "vaadagai", "అద్దె"),
            "SALARY", List.of("salary", "tankha", "तनख्वाह", "वेतन", "சம்பளம்", "sambalam", "జీతం"),
            "UTILITIES", List.of("electricity", "bijli", "बिजली", "கரண்ட்", "மின்சாரம்", "current", "కరెంటు"),
            "TRANSPORT", List.of("petrol", "diesel", "auto", "transport", "பெட்ரோல்", "पेट्रोल", "పెట్రోల్"));

    /** Hindi "X ko", Tamil "X-ku / Xக்கு / Xukku", Telugu "X ki / Xకి", English "to X". */
    private static final List<Pattern> PAYEE = List.of(
            unicode("\\bto\\s+([\\p{L}][\\p{L}\\p{M}.]{1,30})"),
            unicode("([\\p{L}][\\p{L}\\p{M}.]{1,30})\\s+(?:ko|को)\\b"),
            unicode("([\\p{L}][\\p{L}\\p{M}.]{1,30}?)(?:-?ukku|-?kku|-ku|ku)\\b"),
            unicode("([\\p{L}\\p{M}]{2,30}?)(?:வுக்கு|யுக்கு|க்கு|ுக்கு)"),
            unicode("([\\p{L}][\\p{L}\\p{M}.]{1,30})\\s+(?:ki|కి)\\b"),
            unicode("([\\p{L}\\p{M}]{2,30}?)కి"));

    /** Relations people commonly say in their own language, mapped to how contacts are usually saved. */
    private static final Map<String, String> ALIASES = Map.ofEntries(
            Map.entry("அம்மா", "amma"), Map.entry("அம்மாவ", "amma"), Map.entry("அப்பா", "appa"),
            Map.entry("அண்ணா", "anna"), Map.entry("அக்கா", "akka"), Map.entry("माँ", "maa"),
            Map.entry("मां", "maa"), Map.entry("मम्मी", "mummy"), Map.entry("पापा", "papa"),
            Map.entry("भैया", "bhaiya"), Map.entry("దీదీ", "didi"), Map.entry("అమ్మ", "amma"),
            Map.entry("నాన్న", "nanna"));

    private static final List<String> STOP = List.of("pay", "send", "transfer", "rs", "rupees", "upi", "me", "for");

    /** Unicode-aware \\b and \\w so word boundaries work for Devanagari, Tamil and Telugu text too. */
    private static Pattern unicode(String regex) {
        return Pattern.compile(regex, Pattern.UNICODE_CHARACTER_CLASS);
    }

    public ParseResponse parse(String text, String language, List<Contact> contacts) {
        String t = text.toLowerCase(Locale.ROOT).replace('–', '-').trim();
        Long amount = NumberWords.parsePaise(VPA.matcher(t).replaceAll(" "));
        VoiceIntent intent = containsAny(t, SALE) ? VoiceIntent.RECORD_SALE
                : containsAny(t, EXPENSE) ? VoiceIntent.RECORD_EXPENSE
                : containsAny(t, PAY) ? VoiceIntent.PAY
                : VoiceIntent.UNKNOWN;

        String payeeName = null;
        String payeeVpa = null;
        boolean matched = false;
        if (intent == VoiceIntent.PAY) {
            Matcher vm = VPA.matcher(t);
            if (vm.find()) {
                payeeVpa = vm.group();
                payeeName = payeeVpa;
                matched = true;
            } else {
                payeeName = extractPayee(t);
                if (payeeName != null) {
                    Contact c = match(payeeName, contacts);
                    if (c != null) {
                        payeeName = c.name();
                        payeeVpa = c.vpa();
                        matched = true;
                    }
                }
            }
        }
        String category = intent == VoiceIntent.RECORD_EXPENSE ? category(t)
                : intent == VoiceIntent.RECORD_SALE ? "SALES" : null;
        String mode = intent == VoiceIntent.RECORD_SALE || intent == VoiceIntent.RECORD_EXPENSE
                ? (t.contains("upi") || t.contains("online") || t.contains("gpay") ? "UPI" : "CASH") : null;

        double confidence = intent == VoiceIntent.UNKNOWN ? 0.0
                : (amount != null ? 0.5 : 0.2) + (intent != VoiceIntent.PAY || matched ? 0.4 : 0.1);
        return new ParseResponse(intent, amount, payeeName, payeeVpa, matched, category, mode,
                confirmation(intent, amount, payeeName, category, language), Math.min(1.0, confidence));
    }

    private static boolean containsAny(String text, List<String> words) {
        for (String w : words) {
            if (w.chars().allMatch(ch -> ch < 128)) {
                if (unicode("\\b" + Pattern.quote(w) + "\\b").matcher(text).find()) return true;
            } else if (text.contains(w)) {
                return true;
            }
        }
        return false;
    }

    private static String extractPayee(String text) {
        for (Pattern p : PAYEE) {
            Matcher m = p.matcher(text);
            while (m.find()) {
                String name = m.group(1).replaceAll("[.-]+$", "");
                if (!STOP.contains(name) && !name.chars().allMatch(Character::isDigit)) {
                    return ALIASES.getOrDefault(name, name);
                }
            }
        }
        return null;
    }

    private static Contact match(String spoken, List<Contact> contacts) {
        String s = spoken.toLowerCase(Locale.ROOT);
        for (Contact c : contacts) {
            String name = c.name().toLowerCase(Locale.ROOT);
            if (name.equals(s) || name.split("\\s+")[0].equals(s) || c.vpa().startsWith(s + "@")
                    || c.vpa().startsWith(s + ".")) {
                return c;
            }
        }
        return null;
    }

    private static String category(String text) {
        for (var e : CATEGORIES.entrySet()) {
            if (containsAny(text, e.getValue())) return e.getKey();
        }
        return "OTHER";
    }

    private static String confirmation(VoiceIntent intent, Long amountPaise, String payee, String category,
                                       String lang) {
        if (intent == VoiceIntent.UNKNOWN) {
            return switch (lang) {
                case "hi" -> "माफ़ कीजिए, समझ नहीं आया। फिर से बोलिए।";
                case "ta" -> "மன்னிக்கவும், புரியவில்லை. மீண்டும் சொல்லுங்கள்.";
                case "te" -> "క్షమించండి, అర్థం కాలేదు. మళ్ళీ చెప్పండి.";
                default -> "Sorry, I didn't get that. Please try again.";
            };
        }
        String amt = amountPaise == null ? "?" : "₹" + formatRupees(amountPaise);
        String who = payee == null ? "?" : payee;
        return switch (intent) {
            case PAY -> switch (lang) {
                case "hi" -> who + " को " + amt + " भेजें?";
                case "ta" -> who + "-க்கு " + amt + " அனுப்பவா?";
                case "te" -> who + " కి " + amt + " పంపాలా?";
                default -> "Pay " + amt + " to " + who + "?";
            };
            case RECORD_SALE -> switch (lang) {
                case "hi" -> amt + " की बिक्री दर्ज करें?";
                case "ta" -> amt + " விற்பனை பதிவு செய்யவா?";
                case "te" -> amt + " అమ్మకం నమోదు చేయాలా?";
                default -> "Record a sale of " + amt + "?";
            };
            case RECORD_EXPENSE -> switch (lang) {
                case "hi" -> amt + " का खर्च दर्ज करें?";
                case "ta" -> amt + " செலவு பதிவு செய்யவா?";
                case "te" -> amt + " ఖర్చు నమోదు చేయాలా?";
                default -> "Record an expense of " + amt + " (" + category.toLowerCase(Locale.ROOT) + ")?";
            };
            default -> "";
        };
    }

    private static String formatRupees(long paise) {
        long r = paise / 100;
        long p = paise % 100;
        return p == 0 ? Long.toString(r) : String.format("%d.%02d", r, p);
    }
}
