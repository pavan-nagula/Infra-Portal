"""Patcher for ApplicationSet files that gate by `environment` label.

These files (e.g. `adot-collector/application.yml`) include an
``matchExpressions`` block selecting clusters by their ``environment`` label.
When a new environment is registered, its name must be appended to the
appropriate ``values:`` list inside that block.

Example block::

    - clusters:
        selector:
          matchExpressions:
          - key: environment
            operator: In
            values:
            - dev
            - devops
            - internal-qa-qa

This patcher locates the first such block whose values list already
contains a known non-prod marker (or the first block overall when no
marker is supplied) and appends the new environment.
"""
import re

# Paths in the app-of-apps repo where this pattern is used. Add more as needed.
ADOT_COLLECTOR_PATH = "apps/infrastructure/observability/adot-collector/application.yml"


class EnvMatchPatchError(Exception):
    """Raised when the env match-expressions block cannot be patched safely."""


def patch_environment_match_values(
    content: str,
    new_environment: str,
    anchor: str | None = "internal-qa-qa",
) -> tuple[str, bool]:
    """Append ``new_environment`` to a ``matchExpressions`` values list.

    The target block is the first one whose ``- key: environment`` selector
    contains ``anchor`` in its values list. If ``anchor`` is None, the first
    ``environment`` block is used.

    Returns ``(new_content, changed)``. Idempotent: returns ``changed=False``
    when ``new_environment`` is already present.

    Raises ``EnvMatchPatchError`` if no suitable block is found.
    """
    if not new_environment or not new_environment.strip():
        raise EnvMatchPatchError("new_environment must be a non-empty string")
    new_environment = new_environment.strip()

    lines = content.splitlines(keepends=True)

    # Find every "- key: environment" line.
    key_re = re.compile(r"^(?P<indent>\s*)-\s+key:\s*environment\s*$")
    values_re = re.compile(r"^(?P<indent>\s*)values:\s*$")
    item_re = re.compile(r"^(?P<indent>\s*)-\s+(?P<val>\S+)\s*$")

    candidates: list[tuple[int, int, int, str, list[str]]] = []
    # (key_idx, values_idx, last_item_idx, item_indent, items)

    i = 0
    while i < len(lines):
        m_key = key_re.match(lines[i])
        if not m_key:
            i += 1
            continue
        key_indent = m_key.group("indent")

        # Walk forward to find `values:` indented 2 spaces deeper than the
        # `- key:` line (standard YAML list-item continuation).
        expected_values_indent = key_indent + "  "
        values_idx = None
        for j in range(i + 1, min(i + 8, len(lines))):
            m_v = values_re.match(lines[j])
            if m_v and m_v.group("indent") == expected_values_indent:
                values_idx = j
                break
        if values_idx is None:
            i += 1
            continue

        # Collect list items immediately after `values:`.
        items: list[str] = []
        item_indent = None
        last_item_idx = values_idx
        for j in range(values_idx + 1, len(lines)):
            m_it = item_re.match(lines[j])
            if m_it:
                if item_indent is None:
                    item_indent = m_it.group("indent")
                if m_it.group("indent") != item_indent:
                    break
                items.append(m_it.group("val"))
                last_item_idx = j
                continue
            # Non-item line ends the list.
            break

        if items and item_indent is not None:
            candidates.append((i, values_idx, last_item_idx, item_indent, items))

        i = last_item_idx + 1

    if not candidates:
        raise EnvMatchPatchError(
            "No `- key: environment` / `values:` block found in file"
        )

    # Pick the candidate block.
    target = None
    if anchor:
        for c in candidates:
            if anchor in c[4]:
                target = c
                break
    if target is None:
        target = candidates[0]

    _, _, last_item_idx, item_indent, items = target

    if new_environment in items:
        return content, False

    new_line = f"{item_indent}- {new_environment}\n"
    if not lines[last_item_idx].endswith("\n"):
        lines[last_item_idx] = lines[last_item_idx] + "\n"
    lines.insert(last_item_idx + 1, new_line)
    return "".join(lines), True
