// Minimal i18n for Raja Khaiwal — 4 languages.
// Keys are stable; missing translations fall back to English.
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export const LANGS = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi",   native: "हिन्दी" },
  { code: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "ur", label: "Urdu",    native: "اردو" },
];

const D = {
  // common
  home: { en: "Home", hi: "होम", pa: "ਹੋਮ", ur: "ہوم" },
  my_bids: { en: "My Bids", hi: "मेरे दांव", pa: "ਮੇਰੀਆਂ ਬਿਡਾਂ", ur: "میری بولیاں" },
  passbook: { en: "Passbook", hi: "पासबुक", pa: "ਪਾਸਬੁੱਕ", ur: "پاس بک" },
  funds: { en: "Funds", hi: "फंड्स", pa: "ਫੰਡ", ur: "فنڈز" },
  support: { en: "Support", hi: "सहायता", pa: "ਸਹਾਇਤਾ", ur: "سپورٹ" },
  deposit: { en: "Deposit", hi: "जमा करें", pa: "ਜਮ੍ਹਾਂ", ur: "جمع" },
  withdraw: { en: "Withdraw", hi: "निकालें", pa: "ਕਢਵਾਓ", ur: "نکالیں" },
  whatsapp: { en: "WhatsApp", hi: "व्हाट्सऐप", pa: "ਵਟਸਐਪ", ur: "واٹس ایپ" },
  telegram: { en: "Telegram", hi: "टेलीग्राम", pa: "ਟੈਲੀਗਰਾਮ", ur: "ٹیلیگرام" },
  markets: { en: "Markets", hi: "बाजार", pa: "ਮਾਰਕੀਟ", ur: "بازار" },
  play_game: { en: "Play Game", hi: "खेलें", pa: "ਖੇਡੋ", ur: "کھیلیں" },
  closed_today: { en: "Closed For Today", hi: "आज बंद", pa: "ਅੱਜ ਬੰਦ", ur: "آج بند" },
  active: { en: "Active", hi: "सक्रिय", pa: "ਚਾਲੂ", ur: "فعال" },
  closed: { en: "Closed", hi: "बंद", pa: "ਬੰਦ", ur: "بند" },
  notifications: { en: "Notifications", hi: "सूचनाएँ", pa: "ਸੂਚਨਾਵਾਂ", ur: "اطلاعات" },
  settings: { en: "Settings", hi: "सेटिंग्स", pa: "ਸੈਟਿੰਗਜ਼", ur: "ترتیبات" },
  language: { en: "Language", hi: "भाषा", pa: "ਭਾਸ਼ਾ", ur: "زبان" },
  logout: { en: "Logout", hi: "लॉगआउट", pa: "ਲੌਗਆਉਟ", ur: "لاگ آؤٹ" },
  // login/register
  login_title: { en: "Welcome Back", hi: "वापस आपका स्वागत है", pa: "ਵਾਪਸ ਜੀ ਆਇਆਂ ਨੂੰ", ur: "خوش آمدید" },
  create_account: { en: "Create Account", hi: "खाता बनाएँ", pa: "ਖਾਤਾ ਬਣਾਓ", ur: "اکاؤنٹ بنائیں" },
  mobile_number: { en: "Mobile Number", hi: "मोबाइल नंबर", pa: "ਮੋਬਾਈਲ ਨੰਬਰ", ur: "موبائل نمبر" },
  password: { en: "Password", hi: "पासवर्ड", pa: "ਪਾਸਵਰਡ", ur: "پاس ورڈ" },
  full_name: { en: "Full Name", hi: "पूरा नाम", pa: "ਪੂਰਾ ਨਾਮ", ur: "پورا نام" },
  login_btn: { en: "Login", hi: "लॉगिन", pa: "ਲੌਗਇਨ", ur: "لاگ ان" },
  signup_btn: { en: "Create Account", hi: "खाता बनाएँ", pa: "ਖਾਤਾ ਬਣਾਓ", ur: "اکاؤنٹ بنائیں" },
  forgot_password: { en: "Forgot password?", hi: "पासवर्ड भूल गए?", pa: "ਪਾਸਵਰਡ ਭੁੱਲ ਗਏ?", ur: "پاس ورڈ بھول گئے؟" },
  new_here: { en: "New here?", hi: "नए हैं?", pa: "ਨਵੇਂ ਹੋ?", ur: "نئے ہیں؟" },
  already_member: { en: "Already a member?", hi: "पहले से सदस्य?", pa: "ਪਹਿਲਾਂ ਮੈਂਬਰ?", ur: "پہلے سے ممبر؟" },
  // wallet
  wallet_balance: { en: "Wallet Balance", hi: "वॉलेट बैलेंस", pa: "ਵਾਲਿਟ ਬੈਲੈਂਸ", ur: "والیٹ بیلنس" },
  add_funds: { en: "Add Funds", hi: "फंड जोड़ें", pa: "ਫੰਡ ਜੋੜੋ", ur: "فنڈز شامل کریں" },
  amount: { en: "Amount", hi: "राशि", pa: "ਰਾਸ਼ੀ", ur: "رقم" },
  submit: { en: "Submit", hi: "जमा करें", pa: "ਜਮਾ ਕਰੋ", ur: "جمع کریں" },
  // bid slip
  bet_slip: { en: "Bet Slip", hi: "बेट स्लिप", pa: "ਬੈੱਟ ਸਲਿੱਪ", ur: "بیٹ سلپ" },
  place_bids: { en: "Place Bids", hi: "बोली लगाएँ", pa: "ਬਿਡ ਲਾਓ", ur: "بولی لگائیں" },
  add_to_slip: { en: "Add to Bet Slip", hi: "स्लिप में जोड़ें", pa: "ਸਲਿੱਪ ਵਿੱਚ ਜੋੜੋ", ur: "سلپ میں شامل کریں" },
};

function translate(key, lang) {
  const row = D[key];
  if (!row) return key;
  return row[lang] || row.en || key;
}

const I18nContext = createContext({ lang: "en", setLang: () => {}, t: (k) => k });

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem("m11_lang") || "en");
  const setLang = useCallback((l) => { localStorage.setItem("m11_lang", l); setLangState(l); }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ur" ? "rtl" : "ltr";
  }, [lang]);
  const t = useCallback((key) => translate(key, lang), [lang]);
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
