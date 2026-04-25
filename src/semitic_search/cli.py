"""Typer CLI for Semitic Search v0."""

from __future__ import annotations

import json
import urllib.parse
from typing import Optional

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from .models import Cognate, SemiticSearchResult
from .romanization import SUPPORTED_SCHEMES, to_native
from .search import search
from .validator import ValidationResult, validate as run_validator

app = typer.Typer(
    add_completion=False,
    help="Identify Semitic roots and find cross-language cognates with confidence tiers.",
    no_args_is_help=True,
)

console = Console()


TIER_COLORS = {
    "high": "green",
    "medium": "cyan",
    "low": "yellow",
    "speculative": "magenta",
    "unknown": "dim",
}

WIKTIONARY_LANG_NAMES = {
    "ar": "Arabic",
    "he": "Hebrew",
    "syc": "Classical_Syriac",
    "am": "Amharic",
    "ti": "Tigrinya",
    "akk": "Akkadian",
    "ug": "Ugaritic",
    "osa": "Sabaean",
}


def _wiktionary_url(cognate: Cognate) -> Optional[str]:
    if not cognate.wiktionary_hint:
        return None
    title = urllib.parse.quote(cognate.wiktionary_hint, safe="")
    lang_section = WIKTIONARY_LANG_NAMES.get(cognate.language, "")
    anchor = f"#{lang_section}" if lang_section else ""
    return f"https://en.wiktionary.org/wiki/{title}{anchor}"


def _print_header(result: SemiticSearchResult) -> None:
    root_str = result.extracted_root or "[unknown]"
    root_line = Text()
    root_line.append("Input: ", style="bold")
    root_line.append(f"{result.input_word}  ")
    root_line.append("Language: ", style="bold")
    root_line.append(f"{result.detected_language_name} ({result.detected_language})  ")
    root_line.append("Root: ", style="bold")
    root_line.append(root_str, style="bold yellow")
    if result.root_type:
        root_line.append(f"  ({result.root_type})", style="dim")
    root_line.append(f"  · root confidence: ", style="dim")
    root_line.append(
        result.root_confidence,
        style=TIER_COLORS.get(result.root_confidence, "white"),
    )
    console.print(Panel(root_line, title="Semitic Search", border_style="blue"))


def _print_proto_slots(result: SemiticSearchResult) -> None:
    if not result.proto_slots:
        return
    table = Table(title="Proto-Semitic slot candidates", show_lines=False)
    table.add_column("Slot", justify="right")
    table.add_column("Surface")
    table.add_column("Proto-candidates (weighted)")
    for slot in result.proto_slots:
        candidates = ", ".join(
            f"{c.proto_phoneme} ({c.weight:.2f})" for c in slot.proto_candidates
        )
        table.add_row(str(slot.position), slot.surface_consonant, candidates)
    console.print(table)


def _print_cognates_by_tier(result: SemiticSearchResult) -> None:
    if not result.cognates:
        console.print("[dim](no cognates returned)[/dim]")
        return

    order = ["high", "medium", "low", "speculative", "unknown"]
    by_tier: dict[str, list[Cognate]] = {tier: [] for tier in order}
    for cog in result.cognates:
        by_tier.setdefault(cog.confidence, []).append(cog)

    for tier in order:
        cogs = by_tier.get(tier) or []
        if not cogs:
            continue
        color = TIER_COLORS[tier]
        console.print(f"\n[bold {color}]── {tier.upper()} confidence ──[/bold {color}]")
        for cog in cogs:
            line = Text()
            line.append(f"  {cog.language_name}", style="bold")
            line.append(f" · {cog.surface_form}", style="bold white")
            line.append(f"  ({cog.surface_root})", style="yellow")
            line.append(f"  — {cog.gloss}")
            console.print(line)
            if cog.correspondence_path:
                console.print(f"    [dim]↳ {cog.correspondence_path}[/dim]")
            if cog.notes:
                console.print(f"    [dim italic]note: {cog.notes}[/dim italic]")
            url = _wiktionary_url(cog)
            if url:
                console.print(f"    [blue underline]{url}[/blue underline]")


def _print_caveats(result: SemiticSearchResult) -> None:
    if not result.caveats:
        return
    console.print("\n[bold]Caveats[/bold]")
    for c in result.caveats:
        console.print(f"  • {c}")


VERDICT_STYLE = {"agree": "green", "disagree": "red", "unsure": "yellow"}


def _print_validation(validation: ValidationResult, primary: SemiticSearchResult) -> None:
    style = {"high": "green", "mixed": "yellow", "low": "red"}[validation.overall_agreement]
    console.print(
        f"\n[bold {style}]── Gemini validation: {validation.overall_agreement.upper()} agreement ──[/bold {style}]"
    )
    rv = validation.root_extraction_verdict
    rv_color = VERDICT_STYLE[rv]
    line = Text()
    line.append("  Root extraction: ", style="bold")
    line.append(rv.upper(), style=rv_color)
    if validation.root_extraction_notes:
        line.append(f" — {validation.root_extraction_notes}", style="dim")
    console.print(line)

    if validation.cognate_verdicts:
        console.print("\n[bold]Per-cognate verdicts[/bold]")
        for cv in validation.cognate_verdicts:
            color = VERDICT_STYLE[cv.verdict]
            console.print(
                f"  [{color}]{cv.verdict.upper():<8}[/{color}] {cv.language} · "
                f"{cv.surface_form} [dim]— {cv.reason}[/dim]"
            )

    if validation.missed_cognates:
        console.print("\n[bold yellow]Possibly missed cognates[/bold yellow]")
        for mc in validation.missed_cognates:
            console.print(
                f"  + {mc.language} · {mc.surface_form} ({mc.surface_root}) — "
                f"{mc.gloss} [dim]({mc.reason})[/dim]"
            )

    console.print(f"\n[italic]{validation.overall_notes}[/italic]")


@app.command()
def look_up(
    word: str = typer.Argument(..., help="A word in Arabic, Hebrew, Syriac, Amharic, or Tigrinya."),
    as_json: bool = typer.Option(False, "--json", help="Emit raw JSON instead of the rich TUI."),
    show_usage: bool = typer.Option(
        False,
        "--show-usage",
        help="Print token usage (including cache stats) after the response.",
    ),
    validate: bool = typer.Option(
        False,
        "--validate",
        help="Cross-check the result with Gemini 3 Pro for a second opinion.",
    ),
    scheme: str | None = typer.Option(
        None,
        "--scheme",
        "-s",
        help=(
            "Interpret input as a romanization and convert to native script before searching. "
            "Choices: buckwalter (Arabic), sbl-he (Hebrew)."
        ),
    ),
) -> None:
    """Look up a Semitic word and show its root and cross-language cognates."""
    if scheme:
        if scheme not in SUPPORTED_SCHEMES:
            console.print(
                f"[red]Unknown scheme '{scheme}'. Supported: {sorted(SUPPORTED_SCHEMES)}[/red]"
            )
            raise typer.Exit(code=2)
        converted = to_native(word, scheme=scheme)
        console.print(f"[dim]romanization[/dim] [cyan]{word}[/cyan] [dim]→[/dim] [yellow]{converted}[/yellow]  [dim](scheme: {scheme})[/dim]")
        word = converted

    with console.status(f"[bold blue]Analyzing[/] [yellow]{word}[/yellow]..."):
        result, raw = search(word)

    if as_json:
        payload = {"primary": result.model_dump(mode="json")}
    else:
        _print_header(result)
        _print_proto_slots(result)
        _print_cognates_by_tier(result)
        _print_caveats(result)

    validation: ValidationResult | None = None
    if validate:
        with console.status("[bold magenta]Validating with Gemini...[/]"):
            try:
                validation = run_validator(result)
            except Exception as e:
                console.print(f"[red]Gemini validation failed: {e}[/red]")

    if as_json:
        if validation:
            payload["validation"] = validation.model_dump(mode="json")
        console.print_json(json.dumps(payload, ensure_ascii=False))
    elif validation:
        _print_validation(validation, result)

    if show_usage:
        u = raw
        console.print(
            f"\n[dim]model={u.model}  in={u.input_tokens}  out={u.output_tokens}  "
            f"cache_read={u.cache_read_tokens}  cache_write={u.cache_write_tokens}[/dim]"
        )


if __name__ == "__main__":
    app()
