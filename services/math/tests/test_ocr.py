import pytest

from ocr import EmptyReading, build_reading, guess_type


def test_guess_type_from_the_formula():
    assert guess_type(r"\lim_{x \to 0} \frac{\sin x}{x}") == "limit"
    assert guess_type(r"\int x \, dx") == "integral"
    assert guess_type(r"\frac{d}{dx}(x^{2})") == "derivative"
    assert guess_type(r"x^{2}+1") == "other"


def test_a_readable_formula_is_the_whole_crop():
    reading = build_reading(r"\frac{d}{dx}x^{2}")
    assert reading["problem"]["type"] == "derivative"
    assert reading["problem"]["bbox"] == [0, 0, 1, 1]
    assert reading["steps"] == []
    assert reading["legibility"] == "good"
    assert "Confírmala" in reading["notes"]


def test_unparseable_latex_stays_visible_but_low():
    reading = build_reading(r"\notacommand{{{")
    assert reading["legibility"] == "low"
    assert reading["problem"]["latex"].startswith(r"\notacommand")


def test_empty_prediction_is_rejected():
    with pytest.raises(EmptyReading):
        build_reading("   ")
    with pytest.raises(EmptyReading):
        build_reading("$$")
