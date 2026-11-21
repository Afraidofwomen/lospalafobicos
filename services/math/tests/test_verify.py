import pytest

from verify import ParseError, verify_payload

# relation, problem, step, type, valid, misconception
CASES = [
    ("equivalent", r"(x+1)^{2}", r"x^{2}+2x+1", None, True, None),
    ("equivalent", r"\sin^{2}x+\cos^{2}x", r"1", None, True, None),
    ("equivalent", r"\frac{x^{2}-1}{x-1}", r"x+1", None, True, None),
    ("equivalent", r"2(x+3)", r"2x+6", None, True, None),
    ("equivalent", r"\sin(2x)", r"2\sin x\cos x", None, True, None),
    ("equivalent", r"\frac{1}{x}+1", r"\frac{1+x}{x}", None, True, None),
    ("equivalent", r"\ln(e^{x})", r"x", None, True, None),
    ("equivalent", r"e^{\ln x}", r"x", None, True, None),
    ("equivalent", r"2x", r"x", None, False, None),
    ("equivalent", r"x^{2}", r"x^{2}+1", None, False, None),
    ("equivalent", r"\sin x", r"\cos x", None, False, None),
    ("equivalent", r"4", r"2+2", None, True, None),
    ("equivalent", r"5", r"2+2", None, False, None),
    ("equivalent", r"\frac{x^{3}-x}{x}", r"x^{2}-1", None, True, None),
    ("equivalent", r"e^{3x}", r"e^{3x}", None, True, None),
    ("equivalent", r"\frac{d}{dx}x^{2}", r"2x", None, True, None),
    ("next_valid", r"\frac{d}{dx}(x^{2}\sin x)", r"2x\sin x+x^{2}\cos x", None, True, None),
    ("next_valid", r"\frac{d}{dx}\sin(x^{2})", r"2x\cos(x^{2})", None, True, None),
    ("next_valid", r"\frac{d}{dx}x^{3}", r"3x^{2}", None, True, None),
    ("next_valid", r"\frac{d}{dx}(\frac{x^{2}}{\sin x})", r"\frac{2x\sin x-x^{2}\cos x}{\sin^{2}x}", None, True, None),
    ("next_valid", r"\frac{d}{dx}\ln x", r"\frac{1}{x}", None, True, None),
    ("next_valid", r"\frac{d}{dx}e^{3x}", r"3e^{3x}", None, True, None),
    ("next_valid", r"\frac{d}{dx}(x^{2}+1)^{5}", r"10x(x^{2}+1)^{4}", None, True, None),
    ("next_valid", r"\frac{d}{dt}t^{2}", r"2t", None, True, None),
    ("next_valid", r"\frac{d}{dx}\tan x", r"\sec^{2}x", None, True, None),
    ("next_valid", r"\frac{d}{dx}(\sin x\cos x)", r"\cos^{2}x-\sin^{2}x", None, True, None),
    ("next_valid", r"\frac{d}{dx}(5)", r"0", None, True, None),
    ("next_valid", r"\frac{d}{dx}x", r"1", None, True, None),
    ("next_valid", r"x^{3}", r"3x^{2}", "derivative", True, None),
    ("next_valid", r"\frac{d}{dx}\sin(x^{2})", r"\cos(x^{2})", None, False, "chain_rule_omitted"),
    ("next_valid", r"\frac{d}{dx}(x^{2}\sin x)", r"2x\cos x", None, False, "product_of_derivatives"),
    ("next_valid", r"\frac{d}{dx}(x^{2}\sin x)", r"2x\sin x", None, False, "product_rule_incomplete"),
    ("next_valid", r"\frac{d}{dx}(x^{2}\sin x)", r"x^{2}\cos x", None, False, "product_rule_incomplete"),
    ("next_valid", r"\frac{d}{dx}(\frac{x^{2}}{\sin x})", r"\frac{2x\sin x+x^{2}\cos x}{\sin^{2}x}", None, False, "quotient_sign"),
    ("next_valid", r"\frac{d}{dx}(\frac{x^{2}}{\sin x})", r"\frac{2x\sin x-x^{2}\cos x}{\sin x}", None, False, "quotient_denominator"),
    ("next_valid", r"\frac{d}{dx}x^{3}", r"3x^{3}", None, False, "power_rule_exponent"),
    ("next_valid", r"\frac{d}{dx}x^{3}", r"x^{2}", None, False, "power_rule_coefficient"),
    ("next_valid", r"\frac{d}{dx}(x^{2}+1)^{5}", r"5(x^{2}+1)^{4}", None, False, "chain_rule_omitted"),
    ("next_valid", r"\frac{d}{dx}x^{2}", r"x^{2}", None, False, "operator_not_applied"),
    ("next_valid", r"\frac{d}{dx}x^{2}", r"x", None, False, "power_rule_coefficient"),
    ("next_valid", r"\frac{d}{dx}e^{3x}", r"e^{3x}", None, False, "chain_rule_omitted"),
    ("next_valid", r"\frac{d}{dx}\ln(x^{2})", r"\frac{1}{x^{2}}", None, False, "chain_rule_omitted"),
    ("next_valid", r"\frac{d}{dx}(\frac{x}{x+1})", r"\frac{2x+1}{(x+1)^{2}}", None, False, "quotient_sign"),
    ("next_valid", r"\frac{d}{dx}(5)", r"1", None, False, None),
    ("next_valid", r"\frac{d}{dx}\sin x", r"-\cos x", None, False, "sign_error"),
    ("next_valid", r"\int x\,dx", r"\frac{x^{2}}{2}+C", None, True, None),
    ("next_valid", r"\int x\,dx", r"\frac{x^{2}}{2}", None, False, "missing_integration_constant"),
    ("next_valid", r"\int x\,dx", r"x^{2}", None, False, "power_rule_coefficient"),
    ("next_valid", r"\int \cos(2x)\,dx", r"\frac{\sin(2x)}{2}+C", None, True, None),
    ("next_valid", r"\int \cos(2x)\,dx", r"\sin(2x)+C", None, False, "chain_rule_omitted"),
    ("next_valid", r"\int_{0}^{1} x\,dx", r"\frac{1}{2}", None, True, None),
    ("next_valid", r"\int_{0}^{1} x\,dx", r"1", None, False, None),
    ("next_valid", r"\int e^{x}\,dx", r"e^{x}+C", None, True, None),
    ("next_valid", r"\int \sin x\,dx", r"-\cos x+C", None, True, None),
    ("next_valid", r"\int \sin x\,dx", r"\cos x+C", None, False, "sign_error"),
    ("next_valid", r"\int x^{2}\,dx", r"\frac{x^{3}}{3}+C", None, True, None),
    ("next_valid", r"\int x^{2}\,dx", r"\frac{x^{3}}{3}", None, False, "missing_integration_constant"),
    ("next_valid", r"\int_{0}^{\pi}\sin x\,dx", r"2", None, True, None),
    ("equivalent", r"\int x\,dx", r"\frac{x^{2}}{2}", None, True, None),
    ("next_valid", r"\lim_{x\to 0}\frac{\sin x}{x}", r"1", None, True, None),
    ("next_valid", r"\lim_{x\to 0}\frac{\sin x}{x}", r"0", None, False, "indeterminate_form"),
    ("next_valid", r"\lim_{x\to 0}\frac{1-\cos x}{x^{2}}", r"\frac{1}{2}", None, True, None),
    ("next_valid", r"\lim_{x\to\infty}\frac{1}{x}", r"0", None, True, None),
    ("next_valid", r"\lim_{x\to 2}\frac{x^{2}-4}{x-2}", r"4", None, True, None),
    ("next_valid", r"\lim_{x\to 2}\frac{x^{2}-4}{x-2}", r"0", None, False, "indeterminate_form"),
    ("next_valid", r"\lim_{x\to 0}e^{x}", r"1", None, True, None),
    ("next_valid", r"\lim_{x\to 0}e^{x}", r"0", None, False, None),
    ("next_valid", r"\frac{d}{dx}(x^{2}+3x)", r"2x+3", None, True, None),
    ("next_valid", r"\frac{d}{dx}\cos x", r"-\sin x", None, True, None),
    ("next_valid", r"\frac{d}{dx}\cos x", r"\sin x", None, False, "sign_error"),
    ("next_valid", r"\int (2x+1)\,dx", r"x^{2}+x+C", None, True, None),
    ("next_valid", r"x^{2}\sin x", r"2x\sin x+x^{2}\cos x", "derivative", True, None),
    ("next_valid", r"\frac{d}{dx}(\frac{x+1}{x})", r"-\frac{1}{x^{2}}", None, True, None),
]


def test_bank_covers_the_plan():
    assert len(CASES) >= 60


@pytest.mark.parametrize("case", CASES, ids=lambda case: f"{case[0]}-{case[1][:40]}-{case[2][:24]}")
def test_case(case):
    relation, problem, step, kind, valid, misconception = case
    result = verify_payload(
        {"relation": relation, "problem": problem, "step": step, "type": kind}
    )
    assert result["valid"] is valid, result
    assert result["misconception"] == misconception, result
    if valid:
        assert result["counterexample"] is None
    if result["status"] == "ok" and result["nextStepLatex"]:
        assert "incorrecto" not in result["reason"].lower()


def test_indefinite_next_step_names_constant():
    result = verify_payload(
        {
            "relation": "next_valid",
            "problem": r"\int x\,dx",
            "step": r"x",
        }
    )
    assert result["nextStepLatex"] is not None
    assert result["nextStepLatex"].endswith("+ C")


def test_counterexample_does_not_spell_the_symbolic_answer():
    result = verify_payload(
        {
            "relation": "next_valid",
            "problem": r"\frac{d}{dx}x^{2}",
            "step": r"x^{3}",
        }
    )
    assert result["valid"] is False
    assert result["counterexample"]
    assert "2x" not in result["counterexample"].replace(" ", "")
    assert "2 x" not in result["counterexample"]


def test_parse_error():
    with pytest.raises(ParseError):
        verify_payload({"relation": "equivalent", "problem": r"\notacommand{{{", "step": "x"})


def test_reasons_avoid_saying_incorrect():
    result = verify_payload(
        {
            "relation": "next_valid",
            "problem": r"\frac{d}{dx}x^{2}",
            "step": r"9",
        }
    )
    assert "incorrecto" not in result["reason"].lower()
    assert "está mal" not in result["reason"].lower()
