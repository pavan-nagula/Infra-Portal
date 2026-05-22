from jinja2 import Environment, FileSystemLoader, select_autoescape
from pathlib import Path
from app.schemas import ProvisionEnvironmentRequest, ClusterRegistrationRequest

TEMPLATES_DIR = Path(__file__).parent / "templates"


def _jinja_env() -> Environment:
    return Environment(
        loader=FileSystemLoader(str(TEMPLATES_DIR)),
        autoescape=select_autoescape([]),
        keep_trailing_newline=True,
        trim_blocks=True,
        lstrip_blocks=True,
    )


def render_tfvars(request: ProvisionEnvironmentRequest) -> str:
    """Render the terraform.tfvars from a Jinja2 template."""

    env = _jinja_env()
    template = env.get_template("terraform.tfvars.j2")

    # Format github_actions_org_repo_list as quoted HCL list items
    repo_list = [item.strip() for item in request.github_actions_org_repo_list.split(",") if item.strip()]
    github_actions_formatted = ", ".join(f'"{r}"' for r in repo_list)

    # Format bastion egress CIDR blocks as quoted HCL list items
    egress_cidrs = [c.strip() for c in request.bastion_egress_cidr_blocks.split(",") if c.strip()]
    bastion_egress_cidr_formatted = ", ".join(f'"{c}"' for c in egress_cidrs)

    # Format bastion egress security groups as quoted HCL list items
    egress_sgs = [s.strip() for s in request.bastion_egress_security_groups.split(",") if s.strip()]
    bastion_egress_sgs_formatted = ", ".join(f'"{s}"' for s in egress_sgs)

    # Helper to format comma-separated string into quoted HCL list
    def hcl_list(csv_str: str) -> str:
        items = [i.strip() for i in csv_str.split(",") if i.strip()]
        return ", ".join(f'"{i}"' for i in items)

    # Multi-line variant for long lists (one item per line, 2-space indent)
    def hcl_list_multiline(csv_str: str) -> str:
        items = [i.strip() for i in csv_str.split(",") if i.strip()]
        if not items:
            return ""
        return "\n  " + ",\n  ".join(f'"{i}"' for i in items) + "\n"

    # Derive AZ list from region (e.g. us-west-2 -> us-west-2a/b/c)
    def azs_for_region(region: str) -> str:
        return ", ".join(f'"{region}{s}"' for s in ("a", "b", "c"))

    context = {
        "environment_name": request.environment_name,
        "business": request.business,
        "platform_name": request.platform_name,
        "app_config_create": request.app_config_create,
        "create_cross_cluster_iam": request.create_cross_cluster_iam,
        "deploy_api_gateway": request.deploy_api_gateway,
        "deploy_bastion": request.deploy_bastion,
        "bastion_ami_id": request.bastion_ami_id,
        "bastion_instance_type": request.bastion_instance_type.value,
        "bastion_name": request.bastion_name,
        "bastion_iam_role_path": request.bastion_iam_role_path,
        "bastion_egress_cidr_formatted": bastion_egress_cidr_formatted,
        "bastion_egress_sgs_formatted": bastion_egress_sgs_formatted,
        # VPC Primary
        "vpc_primary_region": request.vpc_primary_region,
        "vpc_primary_azs_formatted": azs_for_region(request.vpc_primary_region),
        "vpc_primary_netmask": request.vpc_primary_netmask.value,
        "environment_tier": request.environment_tier.value,
        "create_vpc_primary": request.create_vpc_primary,
        "vpc_create_internet_gateway": request.vpc_create_internet_gateway,
        "vpc_create_nat_gateway": request.vpc_create_nat_gateway,
        "vpc_create_vpc_endpoints": request.vpc_create_vpc_endpoints,
        "vpc_create_egress_firewall": request.vpc_create_egress_firewall,
        "vpc_create_eks_cp_subnets": request.vpc_create_eks_cp_subnets,
        "vpc_ipam_pool_name": request.vpc_ipam_pool_name,
        "vpc_nat_gw_deployment": request.vpc_nat_gw_deployment,
        "vpc_endpoints_primary_formatted": hcl_list(request.vpc_endpoints_primary),
        "vpc_enable_flow_logs": request.vpc_enable_flow_logs,
        "vpc_flow_logs_retention": request.vpc_flow_logs_retention,
        "vpc_attach_tgw": request.vpc_attach_tgw,
        "vpc_tgw_rt_attach": request.vpc_tgw_rt_attach,
        "vpc_tgw_rt_propagate_formatted": hcl_list(request.vpc_tgw_rt_propagate),
        "vpc_tgw_subnet_names_formatted": hcl_list(request.vpc_tgw_subnet_names),
        "vpc_tgw_dest_cidrs_formatted": hcl_list(request.vpc_tgw_dest_cidrs),
        "vpc_associate_phz": request.vpc_associate_phz,
        "vpc_connect_to_phz": request.vpc_connect_to_phz,
        # VPC Secondary
        "create_vpc_secondary": request.create_vpc_secondary,
        "vpc_secondary_region": request.vpc_secondary_region,
        "vpc_secondary_azs_formatted": azs_for_region(request.vpc_secondary_region),
        "vpc_secondary_netmask": request.vpc_secondary_netmask,
        "vpc_endpoints_secondary_formatted": hcl_list(request.vpc_endpoints_secondary),
        # Other
        "sops_kms_deletion_window": request.sops_kms_deletion_window,
        "sops_kms_create_replica": request.sops_kms_create_replica,
        "github_actions_org_repo_list_formatted": github_actions_formatted,
        "eks_cluster_name": request.derive_eks_cluster_name(),
        "app_subnet_tag_role_key": request.app_subnet_tag_role_key,
        "app_subnet_tag_role_value": request.app_subnet_tag_role_value,
        "app_subnet_tag_cluster_key": request.derive_app_subnet_tag_cluster_key(),
        "app_subnet_tag_cluster_value": request.app_subnet_tag_cluster_value,
        "phz_domain": request.derive_phz_domain(),
        # EKS
        "create_eks": request.create_eks,
        "eks_cluster_version": request.eks_cluster_version,
        "eks_authentication_mode": request.eks_authentication_mode,
        "eks_endpoint_private_access": request.eks_endpoint_private_access,
        "eks_endpoint_public_access": request.eks_endpoint_public_access,
        "eks_cluster_enabled_log_types_formatted": hcl_list(request.eks_cluster_enabled_log_types),
        "eks_cluster_public_access_cidrs_formatted": hcl_list(request.eks_cluster_public_access_cidrs),
        "eks_create_argocd": request.eks_create_argocd,
        "eks_argocd_mgmt_account_id": request.eks_argocd_mgmt_account_id,
        "eks_create_nlb_for_eks_cluster": request.eks_create_nlb_for_eks_cluster,
        "eks_create_nodegroup": request.eks_create_nodegroup,
        "eks_iam_admin_sso_role_arn": request.eks_iam_admin_sso_role_arn,
        "eks_iam_roles_path": request.eks_iam_roles_path,
        "eks_pci_cluster": request.eks_pci_cluster,
        "eks_enable_cross_zone_load_balancing": request.eks_enable_cross_zone_load_balancing,
        "eks_coredns_version": request.eks_coredns_version,
        "eks_kubeproxy_version": request.eks_kubeproxy_version,
        "eks_vpccni_version": request.eks_vpccni_version,
        "eks_ebscsi_version": request.eks_ebscsi_version,
        "eks_create_ebscsi": request.eks_create_ebscsi,
        "eks_mountpoint_s3_csi_version": request.eks_mountpoint_s3_csi_version,
        "eks_mountpoint_s3_csi_sa_role_arn": request.eks_mountpoint_s3_csi_sa_role_arn,
    }

    return template.render(**context)


def build_changes_summary(request: ProvisionEnvironmentRequest) -> list[str]:
    """Build a human-readable summary of what will be created."""
    items = [
        f"Environment: **{request.environment_name}**",
        f"Business: {request.business}",
        f"Platform: {request.platform_name}",
        f"Branch: {request.branch_name}",
        "---",
        f"App Config: {'Enabled' if request.app_config_create else 'Disabled'}",
        f"Cross-Cluster IAM: {'Enabled' if request.create_cross_cluster_iam else 'Disabled'}",
        f"API Gateway: {'Enabled' if request.deploy_api_gateway else 'Disabled'}",
        f"SOPS KMS Key: Enabled (deletion window: {request.sops_kms_deletion_window} days, replica: {'Yes' if request.sops_kms_create_replica else 'No'})",
        f"GitHub Actions Repos: `{request.github_actions_org_repo_list}`",
        "---",
        f"Bastion Host: {'Enabled' if request.deploy_bastion else 'Disabled'}"
        + (f" ({request.bastion_instance_type.value})" if request.deploy_bastion else ""),
        f"Bastion AMI: `{request.bastion_ami_id}`",
        f"Bastion Name: {request.bastion_name}",
        f"Bastion IAM Role Path: {request.bastion_iam_role_path}",
        f"Bastion Egress CIDRs: {request.bastion_egress_cidr_blocks}",
        f"Bastion Egress SGs: {request.bastion_egress_security_groups or '(none)'}",
        "---",
        f"VPC: {'Enabled' if request.create_vpc_primary else 'Disabled'}",
        f"VPC Primary ({request.vpc_primary_region}): /{request.vpc_primary_netmask.value}",
        f"Environment Tier: {request.environment_tier.value}",
        f"IPAM Pool: {request.vpc_ipam_pool_name}",
        f"NAT GW: {request.vpc_nat_gw_deployment}",
        f"Internet GW: {'Yes' if request.vpc_create_internet_gateway else 'No'}",
        f"VPC Endpoints: {'Yes' if request.vpc_create_vpc_endpoints else 'No'}",
        f"Egress Firewall: {'Yes' if request.vpc_create_egress_firewall else 'No'}",
        f"EKS CP Subnets: {'Yes' if request.vpc_create_eks_cp_subnets else 'No'}",
        f"Flow Logs: {'Enabled' if request.vpc_enable_flow_logs else 'Disabled'} ({request.vpc_flow_logs_retention} days)",
        f"Transit Gateway: {'Attached' if request.vpc_attach_tgw else 'Not attached'}",
        f"PHZ: {'Associated' if request.vpc_associate_phz else 'Not associated'}",
        f"VPC Secondary ({request.vpc_secondary_region}): {'Yes (/' + str(request.vpc_secondary_netmask) + ')' if request.create_vpc_secondary else 'No'}",
        f"VPC Flow Logs IAM: Enabled",
        "---",
        f"EKS Cluster Name (for subnet tags): `{request.derive_eks_cluster_name()}`",
        f"Private Hosted Zone: `{request.derive_phz_domain()}`",
        "---",
        f"EKS Cluster: {'Enabled' if request.create_eks else 'Disabled'}",
        f"EKS Version: {request.eks_cluster_version}",
        f"EKS Auth Mode: {request.eks_authentication_mode}",
        f"ArgoCD: {'Enabled' if request.eks_create_argocd else 'Disabled'} (mgmt acct: {request.eks_argocd_mgmt_account_id})",
        f"EKS Node Group: {'Yes' if request.eks_create_nodegroup else 'No (Fargate)'}",
    ]
    return items


# ───────────────────────────────────────────────────────────────────
#  Cluster Registration (ArgoCD)
# ───────────────────────────────────────────────────────────────────

def _cluster_context(req: ClusterRegistrationRequest) -> dict:
    return {
        "cluster_name": req.cluster_name(),
        "server_url": req.server_url,
        "aws_account_id": req.aws_account_id,
        "full_env_name": req.full_env_name,
        "aws_region": req.aws_region,
        "vpc_id": req.vpc_id,
        "default_branch": req.default_branch(),
        "project_name": req.project_name(),
        "chart_branch": req.chart_branch,
        "auto_sync": "true" if req.auto_sync else "false",
        "prune": "true" if req.prune else "false",
        "self_heal": "true" if req.self_heal else "false",
    }


def render_cluster_register(req: ClusterRegistrationRequest) -> str:
    """Render the {short-env}-register-clusters.yaml file."""
    template = _jinja_env().get_template("register-clusters.yaml.j2")
    return template.render(**_cluster_context(req))


def render_cluster_values(req: ClusterRegistrationRequest) -> str:
    """Render the {short-env}-cluster-values.yaml file."""
    template = _jinja_env().get_template("cluster-values.yaml.j2")
    return template.render(**_cluster_context(req))


def build_cluster_changes_summary(req: ClusterRegistrationRequest) -> list[str]:
    return [
        f"Cluster Name: **{req.cluster_name()}**",
        f"Environment: {req.full_env_name}",
        f"Short Env / Branch: {req.short_env_name}",
        f"AWS Account: {req.aws_account_id}",
        f"Region: {req.aws_region}",
        f"VPC ID: {req.vpc_id}",
        f"Server URL: {req.server_url}",
        "---",
        f"Chart Branch: {req.chart_branch}",
        f"autoSync: {req.auto_sync}",
        f"prune: {req.prune}",
        f"selfHeal: {req.self_heal}",
        "---",
        f"Services Enabled: appconfig, istio-gw, istio-certs",
    ]
