"""Game logic for M11 CLUBE — simplified to 3 game types.

Game types (post user-confirmed Andar/Bahar definition):
- jodi:        Bet on 00-99. Wins if number == final jodi (open_digit+close_digit).
               Payout: 1:100  (₹10 bet → ₹1000 win)
- haruf_andar: Bet on single digit 0-9. Wins if digit == OPEN_DIGIT (first/pehla digit of result).
               i.e. for jodi "12" → Andar = 1.  Payout: 1:10
- haruf_bahar: Bet on single digit 0-9. Wins if digit == CLOSE_DIGIT (second/doosra digit).
               i.e. for jodi "12" → Bahar = 2.  Payout: 1:10
- cross_bet:   Frontend expands selection into multiple jodis.
               Modes: 'with_jodi' (include pairs 11,22,33) / 'jod_cut' (exclude pairs).
               Stored individually with type='cross_bet'. Evaluated same as jodi.
               Payout: 1:100

Result format: 2-digit string "XY" where X=open_digit (Andar), Y=close_digit (Bahar).
Stored in market.live_result via results collection (both pana fields set to "XY").
"""
from typing import Optional

GAMES = {
    "jodi":        {"name": "Jodi Bet",    "rate": 100, "session": False, "input": "jodi"},
    "haruf_andar": {"name": "Haruf Andar", "rate": 10,  "session": False, "input": "digit"},
    "haruf_bahar": {"name": "Haruf Bahar", "rate": 10,  "session": False, "input": "digit"},
    "cross_bet":   {"name": "Cross Bet",   "rate": 100, "session": False, "input": "jodi"},
}


def _digits_from_result(result: Optional[str]):
    """Accepts a 2-digit string like '37' and returns (open_digit, close_digit)."""
    if not result or not isinstance(result, str):
        return None, None
    r = result.strip()
    if len(r) < 2 or not r[:2].isdigit():
        return None, None
    return int(r[0]), int(r[1])


def evaluate_bid(
    game_type: str,
    session: Optional[str],
    number: str,
    open_pana: Optional[str],
    close_pana: Optional[str],
) -> bool:
    """Return True if the bid wins.

    Backward-compat signature: `open_pana` / `close_pana` may carry the new
    2-digit result format ("XY") instead of legacy 3-digit panas.
    Falls back to legacy logic when result is supplied as panas.
    """
    # Try new-format: combined 2-digit result lives in either pana field
    result = None
    for candidate in (open_pana, close_pana):
        if candidate and isinstance(candidate, str) and len(candidate.strip()) == 2 and candidate.strip().isdigit():
            result = candidate.strip()
            break
    open_digit, close_digit = _digits_from_result(result)

    # Legacy fallback: pana → digit (sum of digits % 10)
    if open_digit is None and open_pana and open_pana.isdigit() and len(open_pana) == 3:
        open_digit = sum(int(c) for c in open_pana) % 10
    if close_digit is None and close_pana and close_pana.isdigit() and len(close_pana) == 3:
        close_digit = sum(int(c) for c in close_pana) % 10

    if open_digit is None or close_digit is None:
        return False

    jodi = f"{open_digit}{close_digit}"

    if game_type in ("jodi", "cross_bet"):
        return str(number).zfill(2) == jodi

    if game_type == "haruf_andar":
        # Andar = first/open digit (e.g. jodi 12 → Andar = 1)
        try:
            return int(number) == open_digit
        except Exception:
            return False

    if game_type == "haruf_bahar":
        # Bahar = second/close digit (e.g. jodi 12 → Bahar = 2)
        try:
            return int(number) == close_digit
        except Exception:
            return False

    return False


def default_game_rates() -> dict:
    return {key: cfg["rate"] for key, cfg in GAMES.items()}
