"""Patcher for the ArgoCD ApplicationSet `projects` registry.

Adds a new project name to the `projects: |-` literal block in
`apps/infrastructure/deployment/argocd/application.yml` so the ApplicationSet
generator picks up the per-project cluster YAMLs.

String-based (line-aware) rather than YAML round-tripping to preserve the
exact original formatting (comments, blank lines, list ordering).
"""
import re

APPLICATIONSET_PATH = "apps/infrastructure/deployment/argocd/application.yml"


class AppSetPatchError(Exception):
    """Raised when the ApplicationSet file cannot be patched safely."""


def patch_projects_list(content: str, new_project: str) -> tuple[str, bool]:
    """Append ``new_project`` to the ``projects: |-`` block.

    Returns ``(new_content, changed)``. ``changed`` is False when the project
    is already present (idempotent no-op).

    Raises ``AppSetPatchError`` if the expected block cannot be located.
    """
    if not new_project or not new_project.strip():
        raise AppSetPatchError("new_project must be a non-empty string")
    new_project = new_project.strip()

    lines = content.splitlines(keepends=True)

    # Locate the `projects: |-` line (or `projects: |`).
    header_re = re.compile(r"^(?P<indent>\s*)projects:\s*\|-?\s*$")
    header_idx = None
    header_indent = ""
    for i, line in enumerate(lines):
        m = header_re.match(line)
        if m:
            header_idx = i
            header_indent = m.group("indent")
            break

    if header_idx is None:
        raise AppSetPatchError(
            "Could not find `projects: |-` block in ApplicationSet file"
        )

    # The list items must be indented deeper than the header.
    # Walk forward, collecting consecutive lines whose indent is strictly
    # greater than the header indent (and which are non-empty).
    item_indent = None
    last_item_idx = header_idx
    existing_projects: set[str] = set()

    for j in range(header_idx + 1, len(lines)):
        raw = lines[j]
        stripped = raw.rstrip("\n").rstrip("\r")
        if not stripped.strip():
            # Blank line — block continues only if subsequent lines stay indented.
            # For safety, treat blank as end-of-block.
            break
        leading = len(raw) - len(raw.lstrip(" "))
        if leading <= len(header_indent):
            # Dedented — block ended.
            break
        if item_indent is None:
            item_indent = raw[:leading]
        existing_projects.add(stripped.strip())
        last_item_idx = j

    if item_indent is None:
        raise AppSetPatchError(
            "`projects: |-` block has no entries — cannot determine indent"
        )

    if new_project in existing_projects:
        return content, False

    new_line = f"{item_indent}{new_project}\n"
    # Ensure the previous last item ends with a newline before insertion.
    if not lines[last_item_idx].endswith("\n"):
        lines[last_item_idx] = lines[last_item_idx] + "\n"

    lines.insert(last_item_idx + 1, new_line)
    return "".join(lines), True
