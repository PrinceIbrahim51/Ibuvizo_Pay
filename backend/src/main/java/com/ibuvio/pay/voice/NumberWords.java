package com.ibuvio.pay.voice;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Extracts a rupee amount from spoken text in English, Hindi, Tamil and Telugu (native script or romanised).
 * Speech recognisers usually emit digits ("500"), which are handled first; number words are the fallback.
 */
final class NumberWords {

    private static final Pattern DIGITS = Pattern.compile("(?:₹|rs\\.?|inr)?\\s*(\\d{1,3}(?:,\\d{2,3})+|\\d+)(?:\\.(\\d{1,2}))?");

    private static final Map<String, Double> UNITS = new HashMap<>();
    private static final Map<String, Double> MULTIPLIERS = new HashMap<>();

    static {
        // English
        String[] en = {"zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven",
                "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"};
        for (int i = 0; i < en.length; i++) UNITS.put(en[i], (double) i);
        String[] tens = {"twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"};
        for (int i = 0; i < tens.length; i++) UNITS.put(tens[i], (double) (i + 2) * 10);
        put(UNITS, 0.5, "half");
        put(MULTIPLIERS, 100, "hundred");
        put(MULTIPLIERS, 1000, "thousand", "k");
        put(MULTIPLIERS, 100000, "lakh", "lac", "lakhs");

        // Hindi (Devanagari + romanised)
        put(UNITS, 1, "एक", "ek");
        put(UNITS, 2, "दो", "do");
        put(UNITS, 3, "तीन", "teen");
        put(UNITS, 4, "चार", "char", "chaar");
        put(UNITS, 5, "पांच", "पाँच", "paanch", "panch");
        put(UNITS, 6, "छह", "छः", "chhe", "chhah");
        put(UNITS, 7, "सात", "saat");
        put(UNITS, 8, "आठ", "aath");
        put(UNITS, 9, "नौ", "nau");
        put(UNITS, 10, "दस", "das");
        put(UNITS, 20, "बीस", "bees");
        put(UNITS, 25, "पच्चीस", "pachchis", "pachees");
        put(UNITS, 30, "तीस", "tees");
        put(UNITS, 40, "चालीस", "chalis");
        put(UNITS, 50, "पचास", "pachas");
        put(UNITS, 60, "साठ", "saath");
        put(UNITS, 70, "सत्तर", "sattar");
        put(UNITS, 80, "अस्सी", "assi");
        put(UNITS, 90, "नब्बे", "nabbe");
        put(UNITS, 1.5, "डेढ़", "डेढ", "dedh");
        put(UNITS, 2.5, "ढाई", "dhai");
        put(MULTIPLIERS, 100, "सौ", "sau");
        put(MULTIPLIERS, 1000, "हज़ार", "हजार", "hazaar", "hazar");
        put(MULTIPLIERS, 100000, "लाख");

        // Tamil (Tamil script + romanised). Hundreds/thousands are often single compound words.
        put(UNITS, 1, "ஒன்று", "ஒரு", "onnu", "ondru", "oru");
        put(UNITS, 2, "இரண்டு", "ரெண்டு", "irandu", "rendu");
        put(UNITS, 3, "மூன்று", "மூணு", "moonu", "moondru");
        put(UNITS, 4, "நான்கு", "நாலு", "naalu", "nangu");
        put(UNITS, 5, "ஐந்து", "அஞ்சு", "ainthu", "anju");
        put(UNITS, 6, "ஆறு", "aaru");
        put(UNITS, 7, "ஏழு", "ezhu");
        put(UNITS, 8, "எட்டு", "ettu");
        put(UNITS, 9, "ஒன்பது", "onbathu");
        put(UNITS, 10, "பத்து", "pathu");
        put(UNITS, 20, "இருபது", "irubathu");
        put(UNITS, 50, "ஐம்பது", "aimbathu");
        put(UNITS, 100, "நூறு", "nooru");
        put(UNITS, 200, "இருநூறு", "irunooru");
        put(UNITS, 300, "முந்நூறு", "munnooru");
        put(UNITS, 400, "நானூறு", "naanooru");
        put(UNITS, 500, "ஐநூறு", "ஐந்நூறு", "ainooru", "ainnooru", "aynooru");
        put(UNITS, 600, "அறுநூறு", "arunooru");
        put(UNITS, 700, "எழுநூறு", "ezhunooru");
        put(UNITS, 800, "எண்ணூறு", "ennooru");
        put(UNITS, 900, "தொள்ளாயிரம்", "thollayiram");
        put(UNITS, 1000, "ஆயிரம்", "aayiram");
        put(UNITS, 2000, "இரண்டாயிரம்", "rendaayiram", "irandayiram");
        put(UNITS, 3000, "மூவாயிரம்", "moovaayiram");
        put(UNITS, 5000, "ஐயாயிரம்", "aiyaayiram");
        put(UNITS, 10000, "பத்தாயிரம்", "pathaayiram");
        put(MULTIPLIERS, 1000, "ஆயிரத்து");
        put(MULTIPLIERS, 100000, "லட்சம்", "latcham");

        // Telugu
        put(UNITS, 1, "ఒకటి", "okati");
        put(UNITS, 2, "రెండు");
        put(UNITS, 5, "ఐదు", "aidu");
        put(UNITS, 10, "పది", "padi");
        put(UNITS, 100, "వంద", "vanda");
        put(UNITS, 500, "ఐదువందలు", "aiduvandalu");
        put(MULTIPLIERS, 100, "వందలు", "vandalu");
        put(MULTIPLIERS, 1000, "వెయ్యి", "veyyi", "వేలు", "velu");
    }

    private NumberWords() {}

    private static void put(Map<String, Double> map, double value, String... words) {
        for (String w : words) map.put(w, value);
    }

    /** Returns the amount in paise, or null when no amount was found. */
    static Long parsePaise(String text) {
        Matcher m = DIGITS.matcher(text);
        if (m.find()) {
            long rupees = Long.parseLong(m.group(1).replace(",", ""));
            long paise = 0;
            if (m.group(2) != null) {
                paise = Long.parseLong(m.group(2).length() == 1 ? m.group(2) + "0" : m.group(2));
            }
            return rupees > 10_000_000 ? null : rupees * 100 + paise;
        }
        double total = 0;
        double current = 0;
        boolean found = false;
        for (String raw : text.split("[\\s,.!?-]+")) {
            String token = stripSuffix(raw);
            Double unit = UNITS.get(token);
            Double mult = MULTIPLIERS.get(token);
            if (unit != null) {
                current += unit;
                found = true;
            } else if (mult != null) {
                found = true;
                if (mult == 100) {
                    current = (current == 0 ? 1 : current) * 100;
                } else {
                    total += (current == 0 ? 1 : current) * mult;
                    current = 0;
                }
            }
        }
        double rupees = total + current;
        if (!found || rupees <= 0 || rupees > 10_000_000) return null;
        return Math.round(rupees * 100);
    }

    /** Drops common Tamil/Hindi case endings and "rupees" words glued to numbers (e.g. "ஐநூறு" + "ரூபாய்"). */
    private static String stripSuffix(String token) {
        String t = token.toLowerCase();
        for (String s : new String[] {"ரூபாய்", "ரூபா", "rupaye", "rupees", "rupee", "रुपये", "रुपए"}) {
            if (t.endsWith(s) && t.length() > s.length()) {
                return t.substring(0, t.length() - s.length());
            }
        }
        return t;
    }
}
