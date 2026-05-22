from __future__ import annotations

import re
from enum import Enum
from pydantic import BaseModel, Field, field_validator

class EnvironmentTier(str, Enum):
    nonprod = "nonprod"
    prod = "prod"

class BastionInstanceType(str, Enum):
    t3_micro = "t3.micro"
    t3_small = "t3.small"
    t3_medium = "t3.medium"

class VpcNetmask(int, Enum):
    slash_16 = 16
    slash_17 = 17
    slash_18 = 18
    slash_19 = 19
    slash_20 = 20

class ProvisionEnvironmentRequest(BaseModel):
    """Input schema for provisioning a new environment."""

    # --- Basic Info ---
    environment_name: str = Field(
        ...,
        min_length=3,
        max_length=40,
        description="Environment name, e.g. 'internal-qa-qa', 'internal-perf'",
        examples=["internal-qa-qa"],
    )
    business: str = Field(
        default="int-workloads",
        min_length=2,
        max_length=30,
        description="Business unit / team label",
    )
    platform_name: str = Field(
        default="development",
        description="Platform name",
    )
    aws_account_id: str = Field(
        ...,
        min_length=12,
        max_length=12,
        pattern=r"^\d{12}$",
        description="12-digit AWS account ID for the target environment",
        examples=["415221474590"],
    )
    branch_name: str = Field(
        ...,
        min_length=3,
        max_length=60,
        description="Branch name to create, e.g. 'feat/DEVOPP-386'",
        examples=["feat/DEVOPP-386"],
    )

    # --- App Config Management ---
    app_config_create: bool = Field(
        default=True,
        description="Enable app config management module",
    )
    create_cross_cluster_iam: bool = Field(
        default=True,
        description="Create IAM roles for cross-cluster access",
    )
    deploy_api_gateway: bool = Field(
        default=False,
        description="Enable API Gateway deployment",
    )
    sops_kms_create_replica: bool = Field(
        default=False,
        description="Replicate SOPS KMS key to secondary region",
    )
    github_actions_org_repo_list: str = Field(
        default="repo:Caylent-Cubic/*",
        description="Comma-separated repo patterns for GitHub Actions OIDC access",
    )

    # --- Bastion ---
    deploy_bastion: bool = Field(default=True)
    bastion_ami_id: str = Field(
        default="ami-075b5421f670d735c",
        description="AMI ID for bastion host (us-west-2)",
    )
    bastion_instance_type: BastionInstanceType = Field(
        default=BastionInstanceType.t3_micro,
    )
    bastion_name: str = Field(
        default="bastion",
        description="Name tag for the bastion instance",
    )
    bastion_iam_role_path: str = Field(
        default="/cubic-service-role/",
        description="IAM role path for bastion instance profile",
    )
    bastion_egress_cidr_blocks: str = Field(
        default="0.0.0.0/0",
        description="Comma-separated CIDR blocks for bastion egress",
    )
    bastion_egress_security_groups: str = Field(
        default="",
        description="Comma-separated security group IDs for bastion egress",
    )

    # --- VPC Primary ---
    create_vpc_primary: bool = Field(
        default=True,
        description="Enable VPC creation for this environment",
    )
    vpc_primary_region: str = Field(
        default="us-west-2",
        description="AWS region for the primary VPC",
    )
    vpc_primary_netmask: VpcNetmask = Field(
        default=VpcNetmask.slash_19,
        description="VPC CIDR netmask length",
    )
    environment_tier: EnvironmentTier = Field(
        default=EnvironmentTier.nonprod,
    )

    # VPC Module Controls
    vpc_create_internet_gateway: bool = Field(default=True)
    vpc_create_nat_gateway: bool = Field(default=True)
    vpc_create_vpc_endpoints: bool = Field(default=True)
    vpc_create_egress_firewall: bool = Field(default=False)
    vpc_create_eks_cp_subnets: bool = Field(default=True)

    # VPC Basic Config
    vpc_ipam_pool_name: str = Field(
        default="internal-pool-non-routable",
        description="IPAM pool name for VPC CIDR allocation",
    )
    vpc_nat_gw_deployment: str = Field(
        default="one_per_az",
        description="NAT gateway deployment strategy",
    )
    vpc_endpoints_primary: str = Field(
        default="s3,ec2,rds,cloudtrail,logs,sns,ssm,ec2messages,imagebuilder,kms,ssmmessages,elasticfilesystem,execute-api",
        description="Comma-separated VPC endpoint services for primary VPC",
    )

    # VPC Flow Logs
    vpc_enable_flow_logs: bool = Field(default=True)
    vpc_flow_logs_retention: int = Field(
        default=30, ge=1, le=365,
        description="Flow logs retention in days",
    )

    # VPC Transit Gateway
    vpc_attach_tgw: bool = Field(default=True)
    vpc_tgw_rt_attach: str = Field(
        default="regional",
        description="TGW route table to attach",
    )
    vpc_tgw_rt_propagate: str = Field(
        default="regional,internal",
        description="Comma-separated TGW route tables to propagate",
    )
    vpc_tgw_subnet_names: str = Field(
        default="eks_control_plane_workloads,app",
        description="Comma-separated subnet names for TGW attachment",
    )
    vpc_tgw_dest_cidrs: str = Field(
        default="10.0.0.0/8",
        description="Comma-separated destination CIDRs for TGW routes",
    )

    # VPC Private Hosted Zone
    vpc_associate_phz: bool = Field(default=True)
    vpc_connect_to_phz: bool = Field(default=False)

    # --- VPC Secondary ---
    create_vpc_secondary: bool = Field(
        default=True,
        description="Whether to create a secondary VPC",
    )
    vpc_secondary_region: str = Field(
        default="us-east-1",
        description="AWS region for the secondary VPC",
    )
    vpc_secondary_netmask: int = Field(
        default=19, ge=16, le=28,
        description="Secondary VPC CIDR netmask length",
    )
    vpc_endpoints_secondary: str = Field(
        default="s3,ec2,rds,cloudtrail,logs,sns,ssm,ec2messages,imagebuilder,kms,ssmmessages",
        description="Comma-separated VPC endpoint services for secondary VPC",
    )

    # --- SOPS KMS ---
    sops_kms_deletion_window: int = Field(
        default=30,
        ge=7,
        le=30,
        description="KMS key deletion window in days",
    )

    # --- EKS cluster name prefix (used in subnet tags) ---
    eks_cluster_name: str = Field(
        default="",
        description="EKS cluster name for subnet tagging. Leave empty to auto-generate.",
    )

    # --- App subnet custom tags (EKS subnet discovery) ---
    app_subnet_tag_role_key: str = Field(
        default="kubernetes.io/role/internal-elb",
        description="First app_subnet_custom_tags key",
    )
    app_subnet_tag_role_value: str = Field(
        default="1",
        description="First app_subnet_custom_tags value",
    )
    app_subnet_tag_cluster_key: str = Field(
        default="",
        description="Second app_subnet_custom_tags key. Leave empty to derive as kubernetes.io/cluster/<eks_cluster_name>.",
    )
    app_subnet_tag_cluster_value: str = Field(
        default="shared",
        description="Second app_subnet_custom_tags value",
    )

    # --- Private Hosted Zone domain ---
    phz_domain: str = Field(
        default="",
        description="Private hosted zone domain. Leave empty to auto-generate.",
    )

    # --- EKS Cluster ---
    create_eks: bool = Field(
        default=True,
        description="Enable EKS cluster creation",
    )
    eks_cluster_version: str = Field(
        default="1.32",
        description="EKS Kubernetes version",
    )
    eks_authentication_mode: str = Field(
        default="API_AND_CONFIG_MAP",
        description="EKS authentication mode (API, CONFIG_MAP, API_AND_CONFIG_MAP)",
    )
    eks_endpoint_private_access: bool = Field(default=True)
    eks_endpoint_public_access: bool = Field(default=True)
    eks_cluster_enabled_log_types: str = Field(
        default="api,authenticator,audit,scheduler,controllerManager",
        description="Comma-separated list of enabled control plane log types",
    )
    eks_cluster_public_access_cidrs: str = Field(
        default="0.0.0.0/0",
        description="Comma-separated CIDRs allowed for public API access",
    )
    eks_create_argocd: bool = Field(default=True)
    eks_argocd_mgmt_account_id: str = Field(
        default="588738587208",
        description="ArgoCD management AWS account ID",
    )
    eks_create_nlb_for_eks_cluster: bool = Field(default=True)
    eks_create_nodegroup: bool = Field(default=False)
    eks_iam_admin_sso_role_arn: str = Field(
        default="arn:aws:iam::415221474590:role/aws-reserved/sso.amazonaws.com/us-west-2/AWSReservedSSO_AWSAdministratorAccess_bb235172dfb90891",
        description="Admin SSO role ARN for cluster access",
    )
    eks_iam_roles_path: str = Field(
        default="/cubic-service-role/",
        description="IAM roles path",
    )
    eks_pci_cluster: bool = Field(default=False)
    eks_enable_cross_zone_load_balancing: bool = Field(default=True)
    eks_coredns_version: str = Field(default="v1.11.4-eksbuild.24")
    eks_kubeproxy_version: str = Field(default="v1.32.6-eksbuild.12")
    eks_vpccni_version: str = Field(default="v1.19.3-eksbuild.1")
    eks_ebscsi_version: str = Field(default="v1.40.0-eksbuild.1")
    eks_create_ebscsi: bool = Field(default=False)
    eks_mountpoint_s3_csi_version: str = Field(default="v2.2.1-eksbuild.1")
    eks_mountpoint_s3_csi_sa_role_arn: str = Field(
        default="arn:aws:iam::415221474590:role/cubic-service-role/AmazonEKS_S3_CSI_DriverRole",
        description="IAM role ARN for Mountpoint S3 CSI driver service account",
    )

    @field_validator("environment_name")
    @classmethod
    def validate_environment_name(cls, v: str) -> str:
        if not re.match(r"^[a-z][a-z0-9-]+[a-z0-9]$", v):
            raise ValueError(
                "Must start with a letter, contain only lowercase alphanumeric "
                "and hyphens, and not end with a hyphen"
            )
        if "--" in v:
            raise ValueError("Must not contain consecutive hyphens")
        return v

    @field_validator("bastion_ami_id")
    @classmethod
    def validate_ami_id(cls, v: str) -> str:
        if not re.match(r"^ami-[a-f0-9]{8,17}$", v):
            raise ValueError("Must be a valid AMI ID (ami-xxxxxxxxx)")
        return v

    def derive_eks_cluster_name(self) -> str:
        if self.eks_cluster_name:
            return self.eks_cluster_name
        return f"{self.environment_name}-eks"

    def derive_app_subnet_tag_cluster_key(self) -> str:
        if self.app_subnet_tag_cluster_key:
            return self.app_subnet_tag_cluster_key
        return f"kubernetes.io/cluster/{self.derive_eks_cluster_name()}"

    def derive_phz_domain(self) -> str:
        if self.phz_domain:
            return self.phz_domain
        return f"{self.environment_name}.nam.ctsnonprodcloud.com"

    def derive_branch_name(self) -> str:
        return self.branch_name

class ProvisionEnvironmentResponse(BaseModel):
    success: bool
    message: str
    branch_name: str | None = None
    pr_url: str | None = None
    pr_number: int | None = None
    file_path: str | None = None
    changes_summary: list[str] = []

class HealthResponse(BaseModel):
    status: str = "healthy"
    version: str = "1.0.0"


# ───────────────────────────────────────────────────────────────────
#  Cluster Registration (ArgoCD app-of-apps)
# ───────────────────────────────────────────────────────────────────

class ClusterRegistrationRequest(BaseModel):
    """Input schema for registering an EKS cluster with ArgoCD."""

    # Identity
    full_env_name: str = Field(
        ...,
        min_length=3,
        max_length=40,
        description="Full environment name (also used as project name)",
        examples=["internal-stage-qa"],
    )
    short_env_name: str = Field(
        ...,
        min_length=3,
        max_length=20,
        description="Short environment name used as branch + filename prefix",
        examples=["int-stg-qa"],
    )

    # AWS cluster details
    aws_account_id: str = Field(
        ...,
        pattern=r"^\d{12}$",
        description="12-digit AWS account ID",
        examples=["123456789012"],
    )
    aws_region: str = Field(
        default="us-west-2",
        description="AWS region",
        examples=["us-west-2"],
    )
    server_url: str = Field(
        ...,
        min_length=10,
        description="EKS API server URL",
        examples=["https://A1B2C3D4.gr7.us-west-2.eks.amazonaws.com"],
    )
    vpc_id: str = Field(
        ...,
        pattern=r"^vpc-[a-f0-9]+$",
        description="VPC ID hosting the EKS cluster",
        examples=["vpc-0abc123def456789"],
    )

    # ArgoCD config
    chart_branch: str = Field(
        default="v1.6.5",
        description="app-of-apps Helm chart branch/release tag",
        examples=["v1.6.5"],
    )
    auto_sync: bool = Field(default=True, description="Enable ArgoCD autoSync")
    prune: bool = Field(default=True, description="Enable ArgoCD prune")
    self_heal: bool = Field(default=True, description="Enable ArgoCD selfHeal")

    # PR target
    pr_branch_name: str = Field(
        ...,
        min_length=3,
        max_length=60,
        description="Branch name to create in the argocd app-of-apps repo",
        examples=["feat/register-int-stg-qa"],
    )

    # ── validators ─────────────────────────────────────────────
    @field_validator("short_env_name")
    @classmethod
    def _validate_short(cls, v: str) -> str:
        if not re.fullmatch(r"[a-z0-9-]+", v):
            raise ValueError("short_env_name must be lowercase alphanumeric + hyphens")
        return v

    @field_validator("full_env_name")
    @classmethod
    def _validate_full(cls, v: str) -> str:
        if not re.fullmatch(r"[a-z0-9-]+", v):
            raise ValueError("full_env_name must be lowercase alphanumeric + hyphens")
        return v

    # ── derived ────────────────────────────────────────────────
    def cluster_name(self) -> str:
        return f"{self.short_env_name}-eks"

    def project_name(self) -> str:
        return self.full_env_name

    def default_branch(self) -> str:
        return self.short_env_name

    def register_file_path(self) -> str:
        return (
            f"environments/aws/devops/infrastructure/deployment/argocd/"
            f"devops-eks/cluster-config/project/{self.project_name()}/"
            f"{self.short_env_name}-register-clusters.yaml"
        )

    def values_file_path(self) -> str:
        return (
            f"environments/aws/devops/infrastructure/deployment/argocd/"
            f"devops-eks/cluster-config/project/{self.project_name()}/"
            f"cluster-values/{self.short_env_name}-cluster-values.yaml"
        )


class ClusterRegistrationResponse(BaseModel):
    success: bool
    message: str
    branch_name: str | None = None
    pr_url: str | None = None
    pr_number: int | None = None
    files_created: list[str] = []
    default_branch_name: str | None = None
    default_branch_url: str | None = None
    default_branch_created: bool = False
