import type { Lang } from '@/api/types';

/** Strings for the voice assistant and Shop mode, the screens built for shopkeepers and non-English speakers. */
const STRINGS = {
  speakNow: { en: 'Tap the mic and speak', hi: 'माइक दबाएँ और बोलें', ta: 'மைக்கை அழுத்தி பேசுங்கள்', te: 'మైక్ నొక్కి మాట్లాడండి' },
  listening: { en: 'Listening…', hi: 'सुन रहे हैं…', ta: 'கேட்கிறது…', te: 'వింటోంది…' },
  confirm: { en: 'Confirm', hi: 'पुष्टि करें', ta: 'உறுதி செய்', te: 'నిర్ధారించండి' },
  cancel: { en: 'Cancel', hi: 'रद्द करें', ta: 'ரத்து', te: 'రద్దు' },
  typeInstead: { en: 'Or type your command', hi: 'या लिखकर बताएँ', ta: 'அல்லது தட்டச்சு செய்யுங்கள்', te: 'లేదా టైప్ చేయండి' },
  todaysBooks: { en: "Today's books", hi: 'आज का हिसाब', ta: 'இன்றைய கணக்கு', te: 'ఈరోజు లెక్కలు' },
  income: { en: 'Sales', hi: 'बिक्री', ta: 'விற்பனை', te: 'అమ్మకాలు' },
  expense: { en: 'Expenses', hi: 'खर्च', ta: 'செலவு', te: 'ఖర్చులు' },
  profit: { en: 'Profit', hi: 'मुनाफ़ा', ta: 'லாபம்', te: 'లాభం' },
  loss: { en: 'Loss', hi: 'घाटा', ta: 'நஷ்டம்', te: 'నష్టం' },
  addSale: { en: 'Add sale', hi: 'बिक्री जोड़ें', ta: 'விற்பனை சேர்', te: 'అమ్మకం జోడించు' },
  addExpense: { en: 'Add expense', hi: 'खर्च जोड़ें', ta: 'செலவு சேர்', te: 'ఖర్చు జోడించు' },
  speakToAdd: { en: 'Speak to add', hi: 'बोलकर जोड़ें', ta: 'பேசி சேர்', te: 'మాట్లాడి జోడించు' },
  gstReport: { en: 'GST report', hi: 'GST रिपोर्ट', ta: 'GST அறிக்கை', te: 'GST నివేదిక' },
  last7: { en: 'Last 7 days', hi: 'पिछले 7 दिन', ta: 'கடந்த 7 நாட்கள்', te: 'గత 7 రోజులు' },
  entries: { en: "Today's entries", hi: 'आज की एंट्री', ta: 'இன்றைய பதிவுகள்', te: 'ఈరోజు ఎంట్రీలు' },
  noEntries: { en: 'No entries yet today.', hi: 'आज अभी कोई एंट्री नहीं।', ta: 'இன்று இன்னும் பதிவுகள் இல்லை.', te: 'ఈరోజు ఇంకా ఎంట్రీలు లేవు.' },
  saved: { en: 'Saved to your books', hi: 'हिसाब में जुड़ गया', ta: 'கணக்கில் சேர்க்கப்பட்டது', te: 'లెక్కల్లో జోడించబడింది' },
} as const;

export type StringKey = keyof typeof STRINGS;

export function t(key: StringKey, lang: Lang = 'en'): string {
  return STRINGS[key][lang] ?? STRINGS[key].en;
}

/** BCP-47 tags passed to the phone's speech recogniser. */
export const SPEECH_LOCALE: Record<Lang, string> = { en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN' };

export const VOICE_EXAMPLES: Record<Lang, string[]> = {
  en: ['Pay 500 to Rahul', 'Sold 1200 cash', 'Spent 800 on stock'],
  hi: ['Rahul ko 500 bhejo', 'आज 1200 की बिक्री', '800 का माल खरीदा'],
  ta: ['Amma-ku ₹500 anuppu', 'ஐநூறு ரூபாய் விற்பனை', '800 சரக்கு செலவு'],
  te: ['Ravi కి 500 పంపు', '1200 అమ్మకం', '800 ఖర్చు'],
};

export const LANG_LABEL: Record<Lang, string> = { en: 'English', hi: 'हिंदी', ta: 'தமிழ்', te: 'తెలుగు' };
