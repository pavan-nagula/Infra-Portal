"""
Update GitHub Actions workflow files to include a new environment.

Modifies two workflows following the exact pattern used for internal-qa-qa:
  1. terraform_validate_plan.yml  — add to all-tf matrix + grep block
  2. terraform_plan_deploy.yml    — same + 4 new jobs (approve/validate/plan/deploy)
"""

from __future__ import annotations

import logging
import re

logger = logging.getLogger(__name__)

VALIDATE_PLAN_PATH = ".github/workflows/terraform_validate_plan.yml"
PLAN_DEPLOY_PATH = ".github/workflows/terraform_plan_deploy.yml"


def _add_to_tf_matrix(content: str, env_name: str, account_id: str) -> str:
    """Append the new env to the all-terraform-changed matrix line."""
    # Match: ...{"name":"<last>","account_id":"<id>"}]}'
    pattern = r"""(\{"name":"[^"]+","account_id":"[^"]+"\})\]\}'"""
    replacement = rf'\1,{{"name":"{env_name}","account_id":"{account_id}"}}'
    replacement += """]}'"""
    new_content = re.sub(pattern, replacement, content)
    if new_content == content:
        raise ValueError("Could not find the all-tf matrix line to patch")
    return new_content


def _add_grep_block(content: str, env_name: str, account_id: str) -> str:
    """Insert a new grep-based detection block for the environment."""
    # Find the last grep block (before the final matrix_output= line)
    new_block = (
        f'\n            if echo "${{{{ steps.changed-files.outputs.tfvars_all_changed_files }}}}" | grep -q "environments/{env_name}/"; then\n'
        f'              echo "DEBUG: Adding {env_name} environment"\n'
        f'              changed_envs=$(echo "$changed_envs" | jq -c \'. + [{{"name":"{env_name}","account_id":"{account_id}"}}]\')\n'
        f'              echo "changed_envs after {env_name}: $changed_envs"\n'
        f"            fi\n"
    )

    # Insert before the line: matrix_output="{\"environment\":$changed_envs}"
    anchor = '            matrix_output="{\\\"environment\\\":$changed_envs}"'
    if anchor not in content:
        raise ValueError("Could not find matrix_output anchor line in workflow")

    return content.replace(anchor, new_block + anchor)


def _build_deploy_jobs(env_name: str, account_id: str) -> str:
    """Build the 4 deploy-workflow jobs block (approve/validate/plan/deploy)."""
    # Sanitise env name for YAML job ids (replace non-alphanumeric with -)
    job_id = re.sub(r"[^a-zA-Z0-9]", "-", env_name)
    title = env_name.replace("-", " ").title().replace(" ", "-")

    return f"""
  # Manual Approval for {title}
  approve-{job_id}:
    needs: detect-changes
    if: ${{{{ always() && contains(needs.detect-changes.outputs.matrix, '{env_name}') }}}}
    runs-on: ubuntu-latest
    environment: {env_name}-approval
    steps:
      - name: Manual approval for {title} deployment
        run: echo "Manual approval required for {title} deployment"

  # {env_name} Environment
  validate-{job_id}:
    needs: [approve-{job_id}, detect-changes]
    if: ${{{{ always() && needs.approve-{job_id}.result == 'success' && contains(needs.detect-changes.outputs.matrix, '{env_name}') }}}}
    strategy:
      matrix:
        environment:
          - name: {env_name}
            account_id: "{account_id}"
    permissions:
      id-token: write
      contents: read
      pull-requests: write
    uses: cubic-aws/terraform-cts-umb-lib-pipelines/.github/workflows/terraform-validate.yml@new_reusable_pipelines
    with:
      tf_version: ${{{{ vars.TF_VERSION }}}}
      aws_region: ${{{{ vars.AWS_REGION }}}}
      environment: ${{{{ matrix.environment.name }}}}
      role_to_assume: "arn:aws:iam::${{{{ matrix.environment.account_id }}}}:role/cubic-service-role/github-oidc-role"
      var_file_path: './environments/${{{{ matrix.environment.name }}}}/terraform.tfvars'
      workspace: true
    secrets: inherit

  plan-{job_id}:
    needs: [validate-{job_id}, detect-changes]
    if: ${{{{ always() && needs.validate-{job_id}.result == 'success' && contains(needs.detect-changes.outputs.matrix, '{env_name}') }}}}
    strategy:
      matrix:
        environment:
          - name: {env_name}
            account_id: "{account_id}"
    permissions:
      id-token: write
      contents: read
      pull-requests: write
    uses: cubic-aws/terraform-cts-umb-lib-pipelines/.github/workflows/terraform-plan.yml@new_reusable_pipelines
    with:
      tf_version: ${{{{ vars.TF_VERSION }}}}
      aws_region: ${{{{ vars.AWS_REGION }}}}
      environment: ${{{{ matrix.environment.name }}}}
      role_to_assume: "arn:aws:iam::${{{{ matrix.environment.account_id }}}}:role/cubic-service-role/github-oidc-role"
      tfplan_s3_bucket: ${{{{ vars.TFPLAN_S3_BUCKET }}}}
      var_file_path: './environments/${{{{ matrix.environment.name }}}}/terraform.tfvars'
      workspace: true
    secrets: inherit

  deploy-{job_id}:
    needs: [plan-{job_id}, detect-changes]
    if: ${{{{ always() && needs.plan-{job_id}.result == 'success' && contains(needs.detect-changes.outputs.matrix, '{env_name}') }}}}
    strategy:
      matrix:
        environment:
          - name: {env_name}
            account_id: "{account_id}"
    permissions:
      id-token: write
      contents: read
      pull-requests: write
    uses: cubic-aws/terraform-cts-umb-lib-pipelines/.github/workflows/terraform-apply.yml@new_reusable_pipelines
    with:
      tf_version: ${{{{ vars.TF_VERSION }}}}
      aws_region: ${{{{ vars.AWS_REGION }}}}
      environment: ${{{{ matrix.environment.name }}}}
      role_to_assume: "arn:aws:iam::${{{{ matrix.environment.account_id }}}}:role/cubic-service-role/github-oidc-role"
      tfplan_s3_bucket: ${{{{ vars.TFPLAN_S3_BUCKET }}}}
      var_file_path: './environments/${{{{ matrix.environment.name }}}}/terraform.tfvars'
      workspace: true
    secrets: inherit
"""


def patch_validate_plan_workflow(content: str, env_name: str, account_id: str) -> str:
    """Patch terraform_validate_plan.yml to include the new environment."""
    if f'"name":"{env_name}"' in content or f"name: {env_name}" in content:
        logger.info("Environment %s already exists in validate/plan workflow", env_name)
        return content

    content = _add_to_tf_matrix(content, env_name, account_id)
    content = _add_grep_block(content, env_name, account_id)
    return content


def patch_plan_deploy_workflow(content: str, env_name: str, account_id: str) -> str:
    """Patch terraform_plan_deploy.yml to include the new environment."""
    if f'"name":"{env_name}"' in content or f"name: {env_name}" in content:
        logger.info("Environment %s already exists in plan/deploy workflow", env_name)
        return content

    content = _add_to_tf_matrix(content, env_name, account_id)
    content = _add_grep_block(content, env_name, account_id)
    # Append the 4 jobs at the end of the file
    content = content.rstrip() + "\n" + _build_deploy_jobs(env_name, account_id)
    return content
