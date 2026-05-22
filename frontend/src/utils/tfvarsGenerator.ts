import type { EnvironmentConfig } from '../types/environment';

/**
 * Client-side tfvars generator as a fallback when the backend is unavailable.
 * Produces a terraform.tfvars file matching the project's HCL conventions.
 */
export function generateTfvarsLocally(config: EnvironmentConfig): string {
  const lines: string[] = [];

  const line = (s: string) => lines.push(s);
  const blank = () => lines.push('');

  // -- Basic --
  line(`### Environment: ${config.environment}`);
  line(`environment = "${config.environment}"`);
  line(`business    = "${config.business}"`);
  blank();
  line(`platform_name            = "${config.platformName}"`);
  line(`create_cross_cluster_iam = ${config.createCrossClusterIam}`);
  line(`deploy_api_gateway       = ${config.deployApiGateway}`);
  blank();

  // -- App Config Management --
  line('app_config_management = {');
  line(`  create = ${config.appConfigManagement.create}`);
  line('  sops_kms_key = {');
  line(`    deletion_window_in_days = ${config.appConfigManagement.sopsKmsKey.deletionWindowInDays}`);
  line(`    create_replica          = ${config.appConfigManagement.sopsKmsKey.createReplica}`);
  line('  }');
  line(`  github_actions_org_repo_name_list = ${formatStringList(config.appConfigManagement.githubActionsOrgRepoNameList)}`);
  line('}');
  blank();

  // -- Tags --
  line('tags = {');
  for (const [k, v] of Object.entries(config.tags)) {
    line(`  ${k} = "${v}"`);
  }
  line('}');
  blank();

  // -- Bastion --
  line('# Bastion Configuration');
  line('bastion_configuration = {');
  line(`  deploy_bastion         = ${config.bastionConfiguration.deployBastion}`);
  line(`  ami_id                 = "${config.bastionConfiguration.amiId}"`);
  line(`  instance_type          = "${config.bastionConfiguration.instanceType}"`);
  line(`  name                   = "${config.bastionConfiguration.name}"`);
  line(`  egress_cidr_blocks     = ${formatStringList(config.bastionConfiguration.egressCidrBlocks)}`);
  line(`  egress_security_groups = ${formatStringList(config.bastionConfiguration.egressSecurityGroups)}`);
  line(`  iam_role_path          = "${config.bastionConfiguration.iamRolePath}"`);
  line('}');
  blank();

  // -- ElastiCache --
  if (Object.keys(config.elasticacheClusters).length > 0) {
    line('# ElastiCache');
    line('elasticache_clusters = {');
    for (const [name, cluster] of Object.entries(config.elasticacheClusters)) {
      line(`  "${name}" = {`);
      line(`    create_module            = ${cluster.createModule}`);
      line(`    create_replication_group = ${cluster.createReplicationGroup}`);
      line(`    apply_immediately        = ${cluster.applyImmediately}`);
      line(`    cluster_mode             = "${cluster.clusterMode}"`);
      line(`    engine_version           = ${cluster.engineVersion === null ? 'null' : `"${cluster.engineVersion}"`}`);
      line(`    log_group_retention      = ${cluster.logGroupRetention}`);
      line(`    maintenance_window       = "${cluster.maintenanceWindow}"`);
      line(`    node_type                = "${cluster.nodeType}"`);
      line(`    snapshot_retention_limit = ${cluster.snapshotRetentionLimit}`);
      line(`    snapshot_window          = "${cluster.snapshotWindow}"`);
      line(`    num_node_groups          = ${cluster.numNodeGroups}`);
      line(`    replicas_per_node_group  = ${cluster.replicasPerNodeGroup}`);
      line(`    dns_endpoint             = "${cluster.dnsEndpoint}"`);
      if (cluster.transitEncryptionEnabled !== undefined) {
        line(`    transit_encryption_enabled = ${cluster.transitEncryptionEnabled}`);
      }
      if (cluster.createUserManagement !== undefined) {
        line(`    create_user_management     = ${cluster.createUserManagement}`);
      }
      line('  }');
    }
    line('}');
    blank();
  }

  // -- VPC Primary --
  line('# VPC us-west-2');
  generateVpcBlock(lines, 'vpc_primary', config.vpcPrimary, config);
  blank();

  // -- VPC Secondary --
  line('# VPC us-east-1');
  generateVpcBlock(lines, 'vpc_secondary', config.vpcSecondary, config);
  blank();

  // -- VPC Flow Logs --
  line('# VPC Flow Logs IAM');
  line('vpc_flow_logs_iam = {');
  line(`  create_role           = ${config.vpcFlowLogsIam.createRole}`);
  line(`  trusted_role_services = ${formatStringList(config.vpcFlowLogsIam.trustedRoleServices)}`);
  line(`  create_policy = ${config.vpcFlowLogsIam.createPolicy}`);
  line('}');
  blank();

  // -- MSK --
  if (Object.keys(config.mskClusters).length > 0) {
    line('# MSK Clusters');
    line('msk_clusters = {');
    for (const [name, cluster] of Object.entries(config.mskClusters)) {
      line(`  "${name}" = {`);
      line(`    cluster_name              = "${cluster.clusterName}"`);
      line(`    environment               = "${cluster.environment}"`);
      line(`    number_of_broker_nodes    = ${cluster.numberOfBrokerNodes}`);
      line(`    volume_size               = ${cluster.volumeSize}`);
      line(`    configure_iam_policy      = ${cluster.configureIamPolicy}`);
      line(`    policy_name               = "${cluster.policyName}"`);
      line(`    create_module             = ${cluster.createModule}`);
      line(`    instance_type             = "${cluster.instanceType}"`);
      line(`    subnet_type               = "${cluster.subnetType}"`);
      line(`    iam_client_authentication = ${cluster.iamClientAuthentication}`);
      line(`    unauthenticated           = ${cluster.unauthenticated}`);
      line(`    client_broker_encryption  = "${cluster.clientBrokerEncryption}"`);
      line('  },');
    }
    line('}');
    blank();
  }

  // -- RDS --
  if (Object.keys(config.rdsClusters).length > 0) {
    line('# RDS Oracle');
    line('rds_cluster = {');
    for (const [name, db] of Object.entries(config.rdsClusters)) {
      line(`  "${name}" = {`);
      line(`    create_module          = ${db.createModule}`);
      line(`    app_name               = "${db.appName}"`);
      line(`    secret_name_prefix     = "${db.secretNamePrefix}"`);
      line(`    parameter_group_name   = "${db.parameterGroupName}"`);
      line(`    parameter_group_family = "${db.parameterGroupFamily}"`);
      line(`    parameter_time_zone    = "${db.parameterTimeZone}"`);
      line('    parameter_group_parameters = [');
      for (const p of db.parameterGroupParameters) {
        line('      {');
        line(`        name         = "${p.name}"`);
        line(`        value        = "${p.value}"`);
        line(`        apply_method = "${p.applyMethod}"`);
        line('      },');
      }
      line('    ]');
      line(`    option_group_name                        = "${db.optionGroupName}"`);
      line(`    option_group_engine_name                 = "${db.optionGroupEngineName}"`);
      line(`    option_group_major_engine_version        = "${db.optionGroupMajorEngineVersion}"`);
      line(`    security_group_sufix                     = "${db.securityGroupSufix}"`);
      line(`    db_identifier                            = "${db.dbIdentifier}"`);
      line(`    db_engine                                = "${db.dbEngine}"`);
      line(`    db_engine_version                        = "${db.dbEngineVersion}"`);
      line(`    db_instance_class                        = "${db.dbInstanceClass}"`);
      line(`    db_character_set_name                    = "${db.dbCharacterSetName}"`);
      line(`    db_license_model                         = "${db.dbLicenseModel}"`);
      line(`    db_db_name                               = "${db.dbDbName}"`);
      line(`    db_multi_az                              = ${db.dbMultiAz}`);
      line(`    db_storage_type                          = "${db.dbStorageType}"`);
      line(`    db_iops                                  = ${db.dbIops === null ? 'null' : db.dbIops}`);
      line(`    db_allocated_storage                     = ${db.dbAllocatedStorage}`);
      line(`    db_max_allocated_storage                 = ${db.dbMaxAllocatedStorage}`);
      line(`    db_storage_encrypted                     = ${db.dbStorageEncrypted}`);
      line(`    db_backup_retention_period               = ${db.dbBackupRetentionPeriod}`);
      line(`    db_performance_insights_enabled          = ${db.dbPerformanceInsightsEnabled}`);
      line(`    db_performance_insights_retention_period = ${db.dbPerformanceInsightsRetentionPeriod}`);
      line(`    db_monitoring_interval                   = ${db.dbMonitoringInterval}`);
      line(`    db_publicly_accessible                   = ${db.dbPubliclyAccessible}`);
      line(`    db_ca_cert_identifier                    = "${db.dbCaCertIdentifier}"`);
      line(`    db_minor_version_upgrade                 = ${db.dbMinorVersionUpgrade}`);
      line(`    db_deletion_protection                   = "${db.dbDeletionProtection}"`);
      line(`    delete_all_snapshots_on_destroy          = "${db.deleteAllSnapshotsOnDestroy}"`);
      line(`    db_skip_final_snapshot                   = "${db.dbSkipFinalSnapshot}"`);
      line(`    db_delete_automated_backups              = "${db.dbDeleteAutomatedBackups}"`);
      line(`    db_create_sleep_duration                 = "${db.dbCreateSleepDuration}"`);
      line(`    create_read_replicas                     = ${db.createReadReplicas}`);
      line(`    read_replica_count                       = ${db.readReplicaCount}`);
      line(`    replica_instance_class                   = "${db.replicaInstanceClass}"`);
      line(`    replica_mode                             = "${db.replicaMode}"`);
      if (db.createUsers) {
        line(`    create_users = true`);
        line('    oracle_users = [');
        for (const u of db.oracleUsers) {
          line(`      { username = "${u.username}", rotation_days = ${u.rotationDays} },`);
        }
        line('    ]');
      }
      line(`    dns_record = "${db.dnsRecord}"`);
      if (db.ingressRules.length > 0) {
        line('    ingress_rules = [');
        for (const r of db.ingressRules) {
          line('      {');
          line(`        description     = "${r.description}"`);
          line(`        protocol        = "${r.protocol}"`);
          if (r.securityGroups?.length) {
            line(`        security_groups = ${formatStringList(r.securityGroups)}`);
          }
          if (r.cidrBlocks?.length) {
            line(`        cidr_blocks     = ${formatStringList(r.cidrBlocks)}`);
          }
          line('      },');
        }
        line('    ]');
      }
      line('  },');
    }
    line('}');
    blank();
  }

  // -- EKS --
  if (Object.keys(config.eksClusters).length > 0) {
    line('# EKS Clusters');
    line('eks_clusters = {');
    for (const [name, eks] of Object.entries(config.eksClusters)) {
      line(`  "${name}" = {`);
      line(`    create_eks_module = ${eks.createEksModule}`);
      line(`    create_argocd    = ${eks.createArgocd}`);
      line(`    cluster_name     = "${eks.clusterName}"`);
      line(`    cluster_version  = "${eks.clusterVersion}"`);
      line(`    cluster_enabled_log_types = ${formatStringList(eks.clusterEnabledLogTypes)}`);
      line(`    authentication_mode       = "${eks.authenticationMode}"`);
      line(`    endpoint_private_access   = ${eks.endpointPrivateAccess}`);
      line(`    endpoint_public_access    = ${eks.endpointPublicAccess}`);
      line(`    create_nlb_for_eks_cluster = ${eks.createNlbForEksCluster}`);
      line(`    oidc_client_id_list  = ${formatStringList(eks.oidcClientIdList)}`);
      line(`    oidc_thumbprint_list = ${formatStringList(eks.oidcThumbprintList)}`);
      line(`    iam_access     = {}`);
      line(`    iam_roles_path = "${eks.iamRolesPath}"`);
      line(`    create_nodegroup = ${eks.createNodegroup}`);
      line(`    cluster_public_access_cidrs = ${formatStringList(eks.clusterPublicAccessCidrs)}`);
      line(`    create_coredns         = ${eks.createCoredns}`);
      line(`    coredns_version        = "${eks.corednsVersion}"`);
      line(`    coredns_config_values  = {}`);
      line(`    coredns_sa_role_arn    = "${eks.corednsSaRoleArn}"`);
      line(`    create_fargate_coredns = ${eks.createFargateCoredns}`);
      line(`    create_kubeproxy        = ${eks.createKubeproxy}`);
      line(`    kubeproxy_version       = "${eks.kubeproxyVersion}"`);
      line(`    kubeproxy_config_values = {}`);
      line(`    kubeproxy_sa_role_arn   = "${eks.kubeproxySaRoleArn}"`);
      line(`    create_vpccni        = ${eks.createVpccni}`);
      line(`    vpccni_version       = "${eks.vpccniVersion}"`);
      line(`    vpccni_config_values = {}`);
      line(`    vpccni_sa_role_arn   = "${eks.vpccniSaRoleArn}"`);
      line(`    create_ebscsi        = ${eks.createEbscsi}`);
      line(`    ebscsi_version       = "${eks.ebscsiVersion}"`);
      line(`    ebscsi_config_values = {}`);
      if (eks.pciCluster) {
        line(`    pci_cluster = ${eks.pciCluster}`);
      }
      line('  }');
    }
    line('}');
    blank();
  }

  // -- Firewall Rules --
  line('# Firewall Rules');
  line(`ingress_web_rules = <<-EOT`);
  line(config.ingressWebRules);
  line('EOT');
  blank();
  line(`allow_https_domains = ${formatStringList(config.allowHttpsDomains)}`);
  line(`blocked_countries   = ${formatStringList(config.blockedCountries)}`);
  blank();
  line(`block_all_traffic_rule = <<-EOT`);
  line(config.blockAllTrafficRule);
  line('EOT');
  blank();
  line(`advanced_ids_rules = <<-EOT`);
  line(config.advancedIdsRules);
  line('EOT');
  blank();
  line(`threat_detection_rules = <<-EOT`);
  line(config.threatDetectionRules);
  line('EOT');

  return lines.join('\n');
}

function generateVpcBlock(
  lines: string[],
  varName: string,
  vpc: EnvironmentConfig['vpcPrimary'],
  config: EnvironmentConfig,
) {
  const line = (s: string) => lines.push(s);

  line(`${varName} = {`);
  line(`  create_vpc                       = ${vpc.createVpc}`);
  line(`  create_internet_gateway          = ${vpc.createInternetGateway}`);
  line(`  create_nat_gateway               = ${vpc.createNatGateway}`);
  line(`  create_vpc_endpoints             = ${vpc.createVpcEndpoints}`);
  line(`  create_egress_network_firewall   = ${vpc.createEgressNetworkFirewall}`);
  line(`  create_eks_control_plane_subnets = ${vpc.createEksControlPlaneSubnets}`);
  line('');
  line(`  availability_zones = ${formatStringList(vpc.availabilityZones)}`);
  line('');
  line(`  environment_tier    = "${vpc.environmentTier}"`);
  line(`  vpc_type            = "${vpc.vpcType}"`);
  line(`  ipam_pool_name      = "${vpc.ipamPoolName}"`);
  line(`  ipv4_netmask_length = ${vpc.ipv4NetmaskLength}`);
  line('  workload_subnet_cidrs = {');
  for (const [name, cidr] of Object.entries(vpc.workloadSubnetCidrs)) {
    const padding = ' '.repeat(Math.max(0, 17 - name.length));
    line(`    ${name}${padding} = { "newbits" = ${cidr.newbits}, "netnum" = ${cidr.netnum} }`);
  }
  line('  }');
  line(`  nat_gateway_deployment = "${vpc.natGatewayDeployment}"`);
  line(`  vpc_endpoints          = ${formatStringList(vpc.vpcEndpoints)}`);
  line('');
  line(`  enable_flow_logs         = ${vpc.enableFlowLogs}`);
  line(`  flow_logs_retention_days = ${vpc.flowLogsRetentionDays}`);
  line('');
  line(`  attach_to_transit_gateway                 = ${vpc.attachToTransitGateway}`);
  line(`  transit_gateway_route_table_to_attach     = "${vpc.transitGatewayRouteTableToAttach}"`);
  line(`  transit_gateway_route_tables_to_propagate = ${formatStringList(vpc.transitGatewayRouteTablesToPropagate)}`);
  line(`  tgw_subnet_names                          = ${formatStringList(vpc.tgwSubnetNames)}`);
  line(`  tgw_destination_cidrs                     = ${formatStringList(vpc.tgwDestinationCidrs)}`);
  line('');
  line(`  associate_with_private_hosted_zones        = ${vpc.associateWithPrivateHostedZones}`);
  line(`  private_hosted_zones_prod_to_associate     = ${formatStringList(vpc.privateHostedZonesProdToAssociate)}`);
  line(`  private_hosted_zones_non_prod_to_associate = ${formatStringList(vpc.privateHostedZonesNonProdToAssociate)}`);
  line(`  connect_to_phz                             = ${vpc.connectToPhz}`);

  if (Object.keys(vpc.appSubnetCustomTags).length > 0) {
    line('  app_subnet_custom_tags = {');
    for (const [k, v] of Object.entries(vpc.appSubnetCustomTags)) {
      line(`    "${k}" = "${v}"`);
    }
    line('  }');
  }

  line('}');
}

function formatStringList(arr: string[]): string {
  if (arr.length === 0) return '[]';
  return `[${arr.map((s) => `"${s}"`).join(', ')}]`;
}
