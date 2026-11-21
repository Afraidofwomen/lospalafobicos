"""Verificación simbólica de pasos de cálculo.

La comparación evalúa operadores (derivada, integral, límite) y luego
pide a SymPy que simplifique la diferencia. Si el álgebra no concluye,
se muestrean puntos deterministas. Las misconceptions son patrones
comunes; no sustituyen a la igualdad.
"""

from __future__ import annotations

import math
import re
from typing import Any

import sympy as sp
from sympy.parsing.latex import parse_latex
from sympy.parsing.latex.errors import LaTeXParsingError

class ParseError(Exception):
    pass


_KNOWN_COMMANDS = {
    "frac", "dfrac", "tfrac", "sin", "cos", "tan", "sec", "csc", "cot",
    "ln", "log", "exp", "sqrt", "cdot", "times", "pm", "mp", "pi", "infty",
    "theta", "alpha", "beta", "gamma", "left", "right", "int", "lim", "to",
    "rightarrow", "leftarrow", "leq", "geq", "neq", "cdot", "prime",
    "arcsin", "arccos", "arctan", "sinh", "cosh", "tanh", "partial",
    "mathrm", "text", "operatorname", "displaystyle", "quad", "qquad",
    "dots", "ldots", "cdots", "bar", "overline",
}

_CALL_NAMES = {"x", "y", "t", "u", "v", "n", "z", "r", "s", "a", "b", "c"}


_LHS = re.compile(
    r"^\s*(?:y\s*'|y\^\{?\\prime\}?|f'\s*\([^)]*\)|\\frac\{dy\}\{dx\}|\\frac\{d\}\{dx\}\s*y)\s*=\s*(.+)$",
    re.IGNORECASE | re.DOTALL,
)


def verify_payload(data: dict[str, Any]) -> dict[str, Any]:
    relation = data.get("relation")
    if relation not in ("equivalent", "next_valid"):
        raise ParseError("La relación debe ser equivalent o next_valid.")
    problem = _prepare(str(data.get("problem", "")), data.get("type"))
    step = _prepare(str(data.get("step", "")), None)
    if relation == "equivalent":
        return _equivalent(problem, step)
    return _next_valid(problem, step)


def _prepare(latex: str, kind: str | None) -> sp.Expr:
    cleaned = _clean_latex(latex)
    if not cleaned:
        raise ParseError("La expresión está vacía.")
    try:
        expr = parse_latex(cleaned)
    except (LaTeXParsingError, ValueError, TypeError) as exc:
        raise ParseError("No pude leer la expresión.") from exc
    except Exception as exc:
        raise ParseError("No pude leer la expresión.") from exc
    expr = expr.subs(sp.Symbol("e"), sp.E).subs(sp.Symbol("pi"), sp.pi)
    expr = _desugar_calls(expr)
    if kind == "derivative" and not isinstance(expr, (sp.Derivative, sp.Integral, sp.Limit)):
        expr = sp.Derivative(expr, _variable(expr))
    elif kind == "integral" and not isinstance(expr, (sp.Derivative, sp.Integral, sp.Limit)):
        expr = sp.Integral(expr, _variable(expr))
    return expr


def _clean_latex(latex: str) -> str:
    text = latex.strip()
    text = text.replace(r"\dfrac", r"\frac").replace(r"\tfrac", r"\frac")
    text = text.replace(r"\,", " ").replace(r"\;", " ").replace(r"\!", "")
    text = text.replace(r"\left", "").replace(r"\right", "")
    match = _LHS.match(text)
    if match:
        text = match.group(1).strip()
    text = text.strip()
    unknown = set(re.findall(r"\\([a-zA-Z]+)", text)) - _KNOWN_COMMANDS
    if unknown:
        raise ParseError("No pude leer la expresión.")
    return text


def _unwrap_symbol(value: Any) -> sp.Symbol:
    while isinstance(value, tuple):
        if not value:
            return sp.Symbol("x")
        value = value[0]
    if isinstance(value, sp.Symbol):
        return value
    return sp.Symbol("x")


def _is_var_call(expr: sp.Expr) -> bool:
    return isinstance(expr, sp.Function) and getattr(expr, "name", None) in _CALL_NAMES and len(expr.args) == 1


def _desugar_calls(expr: sp.Expr) -> sp.Expr:
    """x(expr) en LaTeX de cálculo es un producto, no una función llamada x."""
    if isinstance(expr, sp.Pow) and _is_var_call(expr.base):
        call = expr.base
        return sp.Symbol(call.name) * (_desugar_calls(call.args[0]) ** _desugar_calls(expr.exp))
    if _is_var_call(expr):
        return sp.Symbol(expr.name) * _desugar_calls(expr.args[0])
    if not getattr(expr, "args", ()):
        return expr
    return expr.func(*[_desugar_calls(arg) for arg in expr.args])


def _variable(expr: sp.Expr) -> sp.Symbol:
    if isinstance(expr, sp.Derivative) and expr.variables:
        return _unwrap_symbol(expr.variables[0])
    if isinstance(expr, sp.Integral) and expr.limits:
        return _unwrap_symbol(expr.limits[0])
    if isinstance(expr, sp.Limit):
        return _unwrap_symbol(expr.args[1])
    symbols = list(expr.free_symbols)
    by_name = {symbol.name: symbol for symbol in symbols}
    for name in ("x", "t", "y", "u"):
        if name in by_name:
            return by_name[name]
    if symbols:
        return symbols[0]
    return sp.Symbol("x")


def _equivalent(problem: sp.Expr, step: sp.Expr) -> dict[str, Any]:
    if _same(problem, step):
        return _result(True, "Las dos expresiones son equivalentes.", None, None, problem)
    return _result(
        False,
        "Esas dos expresiones no son equivalentes.",
        _witness(_value(problem), _value(step), _variable(problem)),
        None,
        problem,
    )


def _next_valid(problem: sp.Expr, step: sp.Expr) -> dict[str, Any]:
    expected = _value(problem)
    if expected is None:
        return {
            "valid": False,
            "reason": "No pude calcular esa operación. ¿Puedes reescribirla?",
            "counterexample": None,
            "misconception": None,
            "nextStepLatex": None,
            "status": "unverifiable",
        }
    student = _value(step)
    if student is None:
        student = step
    var = _variable(problem)

    if isinstance(problem, sp.Integral) and not _definite(problem):
        return _check_indefinite(problem.function, student, expected, var, step)

    if _same_values(student, expected):
        return _result(True, _ok_reason(problem), None, None, expected)

    misconception = _classify(problem, student, expected, var)
    return _result(
        False,
        _bad_reason(misconception),
        _witness(expected, student, var),
        misconception,
        expected,
        add_constant=isinstance(problem, sp.Integral) and not _definite(problem),
    )


def _check_indefinite(integrand: sp.Expr, student: sp.Expr, expected: sp.Expr, var: sp.Symbol, raw_step: sp.Expr) -> dict[str, Any]:
    try:
        derivative = sp.diff(student, var)
    except Exception:
        return {
            "valid": False,
            "reason": "No pude calcular esa operación. ¿Puedes reescribirla?",
            "counterexample": None,
            "misconception": None,
            "nextStepLatex": None,
            "status": "unverifiable",
        }
    if _same_values(derivative, integrand):
        gap = sp.simplify(student - expected)
        if gap == 0 or _same_values(student, expected):
            return _result(
                False,
                "La parte principal cuadra, pero falta la constante de integración.",
                None,
                "missing_integration_constant",
                expected,
                add_constant=True,
            )
        if not gap.free_symbols or var not in gap.free_symbols:
            return _result(True, "El paso es una antiderivada válida.", None, None, expected, add_constant=True)
    misconception = _classify_integral(integrand, student, expected, var)
    return _result(
        False,
        _bad_reason(misconception),
        _witness(expected, student, var),
        misconception,
        expected,
        add_constant=True,
    )


def _classify(problem: sp.Expr, student: sp.Expr, expected: sp.Expr, var: sp.Symbol) -> str | None:
    if isinstance(problem, sp.Derivative) and len(problem.variables) == 1:
        inner = problem.expr
        found = _classify_derivative(inner, student, expected, var)
        if found:
            return found
        if _same_values(student, inner) and not _same_values(inner, expected):
            return "operator_not_applied"
    if isinstance(problem, sp.Limit):
        if _indeterminate(problem) and not _same_values(student, expected):
            return "indeterminate_form"
    if _same_values(student, -expected):
        return "sign_error"
    return None


def _classify_derivative(inner: sp.Expr, student: sp.Expr, expected: sp.Expr, var: sp.Symbol) -> str | None:
    quotient = _as_quotient(inner, var)
    if quotient is not None:
        numer, denom = quotient
        found = _match_forms(student, expected, _quotient_forms(numer, denom, var))
        if found:
            return found
    product = _as_product(inner, var)
    if product is not None and quotient is None:
        left, right = product
        found = _match_forms(student, expected, _product_forms(left, right, var))
        if found:
            return found
    chain = _as_chain(inner, var)
    if chain is not None:
        found = _match_forms(student, expected, _chain_forms(chain, var))
        if found:
            return found
    power = _as_pure_power(inner, var)
    if power is not None:
        found = _match_forms(student, expected, _power_forms(power, var))
        if found:
            return found
    if _same_values(student, -expected):
        return "sign_error"
    return None


def _classify_integral(integrand: sp.Expr, student: sp.Expr, expected: sp.Expr, var: sp.Symbol) -> str | None:
    power = _as_pure_power(integrand, var)
    if power is not None:
        exponent = power
        forgot_divisor = var ** (exponent + 1)
        if _up_to_constant(student, forgot_divisor, var) and not _up_to_constant(student, expected, var):
            return "power_rule_coefficient"
        if exponent != -1:
            forgot_increment = var ** exponent / (exponent + 1)
            if _up_to_constant(student, forgot_increment, var):
                return "power_rule_exponent"
    try:
        derivative = sp.simplify(sp.diff(student, var))
    except Exception:
        return None
    if integrand == 0:
        return None
    try:
        ratio = sp.simplify(sp.together(derivative / integrand))
    except Exception:
        ratio = None
    if ratio is not None and not ratio.free_symbols:
        if ratio == -1:
            return "sign_error"
        if _as_chain(integrand, var) is not None and ratio != 1:
            return "chain_rule_omitted"
    if _same_values(student, -expected):
        return "sign_error"
    return None


def _quotient_forms(numer: sp.Expr, denom: sp.Expr, var: sp.Symbol) -> list[tuple[str, sp.Expr]]:
    nu = sp.diff(numer, var)
    nv = sp.diff(denom, var)
    return [
        ("quotient_sign", (nu * denom + numer * nv) / denom ** 2),
        ("quotient_sign", (numer * nv - nu * denom) / denom ** 2),
        ("quotient_denominator", (nu * denom - numer * nv) / denom),
    ]


def _product_forms(left: sp.Expr, right: sp.Expr, var: sp.Symbol) -> list[tuple[str, sp.Expr]]:
    dl = sp.diff(left, var)
    dr = sp.diff(right, var)
    return [
        ("product_of_derivatives", dl * dr),
        ("product_rule_incomplete", dl * right),
        ("product_rule_incomplete", left * dr),
    ]


def _chain_forms(chain: tuple[Any, ...], var: sp.Symbol) -> list[tuple[str, sp.Expr]]:
    kind = chain[0]
    if kind == "func":
        func, inner = chain[1], chain[2]
        slot = sp.Symbol("_u")
        outer = sp.diff(func(slot), slot).subs(slot, inner)
        return [
            ("chain_rule_omitted", outer),
            ("chain_rule_omitted", sp.diff(inner, var)),
        ]
    base, exponent = chain[1], chain[2]
    forgot_inner = exponent * base ** (exponent - 1)
    return [("chain_rule_omitted", forgot_inner)]


def _power_forms(exponent: sp.Expr, var: sp.Symbol) -> list[tuple[str, sp.Expr]]:
    return [
        ("power_rule_exponent", exponent * var ** exponent),
        ("power_rule_coefficient", var ** (exponent - 1)),
    ]


def _match_forms(student: sp.Expr, expected: sp.Expr, forms: list[tuple[str, sp.Expr]]) -> str | None:
    for name, form in forms:
        if _same_values(student, form) and not _same_values(form, expected):
            return name
    return None


def _as_quotient(expr: sp.Expr, var: sp.Symbol) -> tuple[sp.Expr, sp.Expr] | None:
    numer, denom = sp.fraction(sp.together(expr))
    if denom == 1 or not denom.has(var):
        return None
    return numer, denom


def _as_product(expr: sp.Expr, var: sp.Symbol) -> tuple[sp.Expr, sp.Expr] | None:
    if not isinstance(expr, sp.Mul):
        return None
    varying = [factor for factor in expr.args if factor.has(var)]
    constant = [factor for factor in expr.args if not factor.has(var)]
    if len(varying) < 2:
        return None
    left = sp.Mul(*constant, varying[0]) if constant else varying[0]
    right = sp.Mul(*varying[1:])
    return left, right


def _as_chain(expr: sp.Expr, var: sp.Symbol) -> tuple[Any, ...] | None:
    if isinstance(expr, sp.Pow):
        base, exponent = expr.as_base_exp()
        if base.has(var) and not exponent.has(var) and base != var:
            return ("power", base, exponent)
        return None
    functions = (sp.sin, sp.cos, sp.tan, sp.exp, sp.asin, sp.acos, sp.atan, sp.sec, sp.csc, sp.cot)
    if expr.func is sp.log and expr.args:
        inner = expr.args[0]
        base = expr.args[1] if len(expr.args) > 1 else sp.E
        if base == sp.E and inner.has(var) and sp.simplify(inner - var) != 0:
            return ("func", sp.log, inner)
    if getattr(expr, "func", None) in functions and len(expr.args) == 1:
        inner = expr.args[0]
        if inner.has(var) and sp.simplify(inner - var) != 0:
            return ("func", expr.func, inner)
    return None


def _as_pure_power(expr: sp.Expr, var: sp.Symbol) -> sp.Expr | None:
    if isinstance(expr, sp.Pow) and expr.base == var and not expr.exp.has(var):
        return expr.exp
    if expr == var:
        return sp.Integer(1)
    return None


def _definite(expr: sp.Integral) -> bool:
    for limit in expr.limits:
        try:
            if len(limit) == 3:
                return True
        except TypeError:
            continue
    return False


def _indeterminate(expr: sp.Limit) -> bool:
    body, var, point = expr.args[0], expr.args[1], expr.args[2]
    numer, denom = sp.fraction(sp.together(body))
    try:
        if denom != 1 and numer.subs(var, point) == 0 and denom.subs(var, point) == 0:
            return True
        direct = body.subs(var, point)
    except Exception:
        return False
    if direct is sp.nan or direct.has(sp.nan, sp.zoo, sp.oo, -sp.oo):
        return True
    return False


def _value(expr: sp.Expr) -> sp.Expr | None:
    try:
        done = expr.doit()
    except Exception:
        return None
    if isinstance(expr, sp.Integral) and isinstance(done, sp.Integral):
        return None
    if isinstance(expr, sp.Limit) and isinstance(done, sp.Limit):
        return None
    return done


def _same(left: sp.Expr, right: sp.Expr) -> bool:
    a = _value(left)
    b = _value(right)
    if a is None or b is None:
        a = a if a is not None else left
        b = b if b is not None else right
    return _same_values(a, b)


def _same_values(left: sp.Expr, right: sp.Expr) -> bool:
    try:
        diff = sp.simplify(left - right)
    except Exception:
        diff = left - right
    if diff == 0:
        return True
    for transform in (sp.expand, sp.trigsimp, sp.cancel, sp.together):
        try:
            if sp.simplify(transform(left - right)) == 0:
                return True
        except Exception:
            continue
    return _numeric_equal(left, right)


def _up_to_constant(left: sp.Expr, right: sp.Expr, var: sp.Symbol) -> bool:
    if _same_values(left, right):
        return True
    try:
        gap = sp.simplify(left - right)
    except Exception:
        return False
    return gap.free_symbols.isdisjoint({var})


def _numeric_equal(left: sp.Expr, right: sp.Expr) -> bool:
    diff = left - right
    symbols = list(diff.free_symbols)
    if not symbols:
        try:
            value = complex(sp.N(diff))
        except Exception:
            return False
        return math.isfinite(value.real) and abs(value.imag) < 1e-6 and abs(value.real) < 1e-6
    probes = [0.3, 0.7, -0.4, 1.3, -1.7, 2.2, 0.15, -2.5, 3.1, 0.9]
    hits = 0
    for index, probe in enumerate(probes):
        subs = {symbol: probes[(index + offset) % len(probes)] for offset, symbol in enumerate(symbols)}
        try:
            value = complex(diff.subs(subs).evalf())
        except Exception:
            continue
        if not math.isfinite(value.real) or abs(value.imag) > 1e-6:
            continue
        if abs(value.real) > 1e-4:
            return False
        hits += 1
    return hits >= 5


def _witness(expected: sp.Expr, student: sp.Expr, var: sp.Symbol) -> str | None:
    if not expected.free_symbols and not student.free_symbols:
        return None
    for point in (0, 1, -1, 2, 0.5, -0.5, 3, 1.5, -2, 0.25):
        try:
            got = complex(sp.N(student.subs(var, point)))
            want = complex(sp.N(expected.subs(var, point)))
        except Exception:
            continue
        if not math.isfinite(got.real) or not math.isfinite(want.real):
            continue
        if abs(got.imag) > 1e-6 or abs(want.imag) > 1e-6:
            continue
        scale = max(1.0, abs(want.real))
        if abs(got.real - want.real) > 1e-3 * scale:
            shown = int(point) if float(point).is_integer() else point
            return f"x={shown} → tu paso da {_compact(got.real)} y no coincide"
    return None


def _compact(value: float) -> str:
    text = f"{value:.4g}"
    return text


def _present(expr: sp.Expr, add_constant: bool = False) -> str:
    value = expr
    if not getattr(value, "free_symbols", {1}):
        try:
            value = sp.simplify(value)
        except Exception:
            pass
    text = sp.latex(value)
    if add_constant:
        text = f"{text} + C"
    return text


def _result(
    valid: bool,
    reason: str,
    counterexample: str | None,
    misconception: str | None,
    expected: sp.Expr,
    add_constant: bool = False,
) -> dict[str, Any]:
    try:
        shown = _present(expected, add_constant=add_constant)
    except Exception:
        shown = None
    return {
        "valid": valid,
        "reason": reason,
        "counterexample": counterexample,
        "misconception": misconception,
        "nextStepLatex": shown,
        "status": "ok",
    }


def _ok_reason(problem: sp.Expr) -> str:
    if isinstance(problem, sp.Derivative):
        return "El paso coincide con la derivada."
    if isinstance(problem, sp.Integral):
        if _definite(problem):
            return "La integral definida coincide."
        return "El paso es una antiderivada válida."
    if isinstance(problem, sp.Limit):
        return "El límite coincide."
    return "El paso es válido."


def _bad_reason(misconception: str | None) -> str:
    reasons = {
        "chain_rule_omitted": "Falta un factor de la regla de la cadena.",
        "quotient_sign": "El signo del cociente no cuadra.",
        "quotient_denominator": "El denominador de la regla del cociente no cuadra.",
        "product_rule_incomplete": "Falta un término de la regla del producto.",
        "product_of_derivatives": "Derivar cada factor y multiplicarlos no es la regla del producto.",
        "power_rule_exponent": "El exponente no quedó bien al derivar o integrar.",
        "power_rule_coefficient": "Falta ajustar el coeficiente de la potencia.",
        "missing_integration_constant": "La parte principal cuadra, pero falta la constante de integración.",
        "operator_not_applied": "La operación todavía no se aplicó a la expresión.",
        "sign_error": "Hay un signo que no cuadra.",
        "indeterminate_form": "Sustituir directo en una forma indeterminada no basta.",
    }
    return reasons.get(misconception or "", "El paso no coincide con la verificación simbólica.")
