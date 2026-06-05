"""Game logic for M11 CLUBE Matka app.

Defines all game types, payout multipliers, and a function to
compute whether a given bid wins based on declared results.
"""
from typing import Optional

# Game catalog: key -> {name, payout_multiplier, session_based, input_type}
# input_type: digit (single 0-9), jodi (2 digits 00-99), pana (3 digits),
#             sangam_half_a (digit + pana), sangam_half_b (pana + digit),
#             sangam_full (pana + pana), generic (free text - simple flow)
GAMES = {
    "single_digit":       {"name": "Single Digit",      "rate": 9.5,    "session": True,  "input": "digit"},
    "single_digit_bulk":  {"name": "Single Digit Bulk", "rate": 9.5,    "session": True,  "input": "digit"},
    "jodi":               {"name": "Jodi Digit",        "rate": 95,     "session": False, "input": "jodi"},
    "jodi_bulk":          {"name": "Jodi Digit Bulk",   "rate": 95,     "session": False, "input": "jodi"},
    "single_pana":        {"name": "Single Pana",       "rate": 150,    "session": True,  "input": "pana"},
    "single_pana_bulk":   {"name": "Single Pana Bulk",  "rate": 150,    "session": True,  "input": "pana"},
    "double_pana":        {"name": "Double Pana",       "rate": 300,    "session": True,  "input": "pana"},
    "double_pana_bulk":   {"name": "Double Pana Bulk",  "rate": 300,    "session": True,  "input": "pana"},
    "triple_pana":        {"name": "Triple Pana",       "rate": 800,    "session": True,  "input": "pana"},
    "penal_group":        {"name": "Penal Group",       "rate": 150,    "session": True,  "input": "pana"},
    "red_brackets":       {"name": "Red Brackets",      "rate": 95,     "session": False, "input": "jodi"},
    "sp_dp_tp":           {"name": "SP DP TP",          "rate": 150,    "session": True,  "input": "pana"},
    "choice_pana_spdp":   {"name": "Choice Pana SPDP",  "rate": 150,    "session": True,  "input": "pana"},
    "sp_motor":           {"name": "SP Motor",          "rate": 150,    "session": True,  "input": "generic"},
    "dp_motor":           {"name": "DP Motor",          "rate": 300,    "session": True,  "input": "generic"},
    "group_jodi":         {"name": "Group Jodi",        "rate": 95,     "session": False, "input": "jodi"},
    "digit_based_jodi":   {"name": "Digit Based Jodi",  "rate": 95,     "session": False, "input": "jodi"},
    "odd_even":           {"name": "Odd Even",          "rate": 1.9,    "session": True,  "input": "digit"},
    "two_digits_panel":   {"name": "Two Digits Panel",  "rate": 150,    "session": True,  "input": "pana"},
    "half_sangam_a":      {"name": "Half Sangam A",     "rate": 1500,   "session": False, "input": "sangam_half_a"},
    "half_sangam_b":      {"name": "Half Sangam B",     "rate": 1500,   "session": False, "input": "sangam_half_b"},
    "full_sangam":        {"name": "Full Sangam",       "rate": 8000,   "session": False, "input": "sangam_full"},
}


def pana_to_digit(pana: str) -> int:
    """Sum of digits modulo 10. E.g. 123 -> 6, 569 -> 0."""
    return sum(int(c) for c in pana) % 10


def evaluate_bid(
    game_type: str,
    session: Optional[str],
    number: str,
    open_pana: Optional[str],
    close_pana: Optional[str],
) -> bool:
    """Return True if the bid wins given declared open/close pana results."""
    if not open_pana or not close_pana:
        # Cannot evaluate until both sessions declared (for jodi/sangam)
        # but single-session games can evaluate with just the relevant one.
        pass

    open_digit = pana_to_digit(open_pana) if open_pana else None
    close_digit = pana_to_digit(close_pana) if close_pana else None
    jodi = f"{open_digit}{close_digit}" if open_digit is not None and close_digit is not None else None

    g = GAMES.get(game_type)
    if not g:
        return False
    inp = g["input"]

    if inp == "digit":
        if session == "open" and open_digit is not None:
            if game_type == "odd_even":
                bet_odd = int(number) % 2 == 1
                actual_odd = open_digit % 2 == 1
                return bet_odd == actual_odd
            return str(open_digit) == str(number)
        if session == "close" and close_digit is not None:
            if game_type == "odd_even":
                bet_odd = int(number) % 2 == 1
                actual_odd = close_digit % 2 == 1
                return bet_odd == actual_odd
            return str(close_digit) == str(number)
        return False

    if inp == "pana":
        if session == "open" and open_pana:
            return number == open_pana
        if session == "close" and close_pana:
            return number == close_pana
        return False

    if inp == "jodi":
        if jodi is None:
            return False
        return number == jodi

    if inp == "sangam_half_a":
        # Format: "digit-pana"  -> open digit + close pana
        if open_digit is None or not close_pana:
            return False
        try:
            d, p = number.split("-")
            return int(d) == open_digit and p == close_pana
        except Exception:
            return False

    if inp == "sangam_half_b":
        # Format: "pana-digit" -> open pana + close digit
        if not open_pana or close_digit is None:
            return False
        try:
            p, d = number.split("-")
            return p == open_pana and int(d) == close_digit
        except Exception:
            return False

    if inp == "sangam_full":
        # Format: "open_pana-close_pana"
        if not open_pana or not close_pana:
            return False
        try:
            op, cp = number.split("-")
            return op == open_pana and cp == close_pana
        except Exception:
            return False

    if inp == "generic":
        # Treat as pana-style match on session result
        if session == "open" and open_pana:
            return number == open_pana
        if session == "close" and close_pana:
            return number == close_pana
        return False

    return False


def default_game_rates() -> dict:
    return {key: cfg["rate"] for key, cfg in GAMES.items()}
