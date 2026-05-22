"""Quick smoke test for workflow_updater against real workflow files."""
from app.workflow_updater import patch_validate_plan_workflow, patch_plan_deploy_workflow

# Read the real workflow files
with open(r"D:\Jira\My Tickets\internal-qa-infra-provision\terraform-cts-umb-internal\.github\workflows\terraform_validate_plan.yml") as f:
    vp = f.read()
with open(r"D:\Jira\My Tickets\internal-qa-infra-provision\terraform-cts-umb-internal\.github\workflows\terraform_plan_deploy.yml") as f:
    pd = f.read()

env = "test-auto-qa"
acct = "999888777666"

# Patch validate/plan
vp_patched = patch_validate_plan_workflow(vp, env, acct)
assert '"name":"test-auto-qa","account_id":"999888777666"' in vp_patched, "Matrix not patched"
assert "environments/test-auto-qa/" in vp_patched, "Grep block not added"
print("validate_plan: OK")

# Patch plan/deploy
pd_patched = patch_plan_deploy_workflow(pd, env, acct)
assert '"name":"test-auto-qa","account_id":"999888777666"' in pd_patched, "Matrix not patched"
assert "approve-test-auto-qa:" in pd_patched, "Approve job not added"
assert "validate-test-auto-qa:" in pd_patched, "Validate job not added"
assert "plan-test-auto-qa:" in pd_patched, "Plan job not added"
assert "deploy-test-auto-qa:" in pd_patched, "Deploy job not added"
assert "environment: test-auto-qa-approval" in pd_patched, "Approval env not set"
assert 'account_id: "999888777666"' in pd_patched, "Account ID not in jobs"
print("plan_deploy: OK")

# Idempotency - patching again should be a no-op
vp2 = patch_validate_plan_workflow(vp_patched, env, acct)
assert vp2 == vp_patched, "validate_plan not idempotent!"
pd2 = patch_plan_deploy_workflow(pd_patched, env, acct)
assert pd2 == pd_patched, "plan_deploy not idempotent!"
print("Idempotency: OK")

print("ALL TESTS PASSED")
