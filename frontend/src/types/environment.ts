/** Environment configuration types matching the Terraform variables */

export interface EnvironmentConfig {
    // Basic Configuration
    environment: string;
    business: string;
    platformName: string;
    createCrossClusterIam: boolean;
    deployApiGateway: boolean;
    projectName: string;
    name: string;
    tags: Record<string, string>;

    // App Config Management
    appConfigManagement: AppConfigManagement;

    // Bastion
    bastionConfiguration: BastionConfiguration;

    // ElastiCache
    elasticacheClusters: Record<string, ElastiCacheCluster>;

    // VPC Primary (us-west-2)
    vpcPrimary: VpcConfiguration;

    // VPC Secondary (us-east-1)
    vpcSecondary: VpcConfiguration;

    // VPC Flow Logs
    vpcFlowLogsIam: VpcFlowLogsIam;

    // MSK
    mskClusters: Record<string, MskCluster>;
    mskTopicsPerCluster: Record<string, MskTopicConfig>;

    // RDS
    rdsClusters: Record<string, RdsCluster>;
    rdsAuroraDefaults: Record<string, unknown>;
    rdsAuroraItems: Record<string, unknown>;

    // EKS
    eksClusters: Record<string, EksCluster>;

    // Firewall
    ingressWebRules: string;
    allowHttpsDomains: string[];
    blockedCountries: string[];
    blockAllTrafficRule: string;
    advancedIdsRules: string;
    threatDetectionRules: string;

    // S3
    s3Buckets: Record<string, S3Bucket>;

    // Settlement
    sftpConnector: Record<string, unknown>;
    settlementFilepush: Record<string, unknown>;
    settlementFilepull: Record<string, unknown>;
    settlementObservability: Record<string, unknown>;

    // CipherTrust
    createK170v: boolean;
    k170vAmiId: string;
    k170vInstanceType: string;
    k170vVolumeSize: number;
    k170vAdminCidrBlocks: string[];

    // Oracle Golden Gate
    oraGoldenGate: Record<string, OracleGoldenGate>;

    // Verified Access
    verifiedAccessEndpoints: Record<string, unknown>;
}

export interface AppConfigManagement {
    create: boolean;
    sopsKmsKey: {
        deletionWindowInDays: number;
        createReplica: boolean;
    };
    githubActionsOrgRepoNameList: string[];
}

export interface BastionConfiguration {
    deployBastion: boolean;
    amiId: string;
    instanceType: string;
    name: string;
    egressCidrBlocks: string[];
    egressSecurityGroups: string[];
    iamRolePath: string;
}

export interface ElastiCacheCluster {
    createModule: boolean;
    createReplicationGroup: boolean;
    applyImmediately: boolean;
    clusterMode: string;
    engineVersion: string | null;
    logGroupRetention: number;
    maintenanceWindow: string;
    nodeType: string;
    snapshotRetentionLimit: number;
    snapshotWindow: string;
    numNodeGroups: number;
    replicasPerNodeGroup: number;
    dnsEndpoint: string;
    transitEncryptionEnabled?: boolean;
    createUserManagement?: boolean;
}

export interface VpcConfiguration {
    createVpc: boolean;
    createInternetGateway: boolean;
    createNatGateway: boolean;
    createVpcEndpoints: boolean;
    createEgressNetworkFirewall: boolean;
    createEksControlPlaneSubnets: boolean;
    availabilityZones: string[];
    environmentTier: string;
    vpcType: string;
    ipamPoolName: string;
    ipv4NetmaskLength: number;
    workloadSubnetCidrs: Record<string, { newbits: number; netnum: number }>;
    natGatewayDeployment: string;
    vpcEndpoints: string[];
    enableFlowLogs: boolean;
    flowLogsRetentionDays: number;
    attachToTransitGateway: boolean;
    transitGatewayRouteTableToAttach: string;
    transitGatewayRouteTablesToPropagate: string[];
    tgwSubnetNames: string[];
    tgwDestinationCidrs: string[];
    customRoutes: VpcCustomRoute[];
    associateWithPrivateHostedZones: boolean;
    privateHostedZonesProdToAssociate: string[];
    privateHostedZonesNonProdToAssociate: string[];
    connectToPhz: boolean;
    appSubnetCustomTags: Record<string, string>;
}

export interface VpcCustomRoute {
    subnetNames: string[];
    destinationCidrs: string[];
    targetType: string;
    targetId: string;
}

export interface VpcFlowLogsIam {
    createRole: boolean;
    trustedRoleServices: string[];
    createPolicy: boolean;
}

export interface MskCluster {
    clusterName: string;
    environment: string;
    numberOfBrokerNodes: number;
    volumeSize: number;
    configureIamPolicy: boolean;
    policyName: string;
    createModule: boolean;
    instanceType: string;
    subnetType: string;
    iamClientAuthentication: boolean;
    unauthenticated: boolean;
    clientBrokerEncryption: string;
}

export interface MskTopicConfig {
    environment: string;
    iamRolesPath: string;
    subnetType: string;
    createTopics: boolean;
    topicsFilePath: string;
    topicsObjectKey: string;
}

export interface MskTopic {
    name: string;
    replicationFactor: number;
    partitions: number;
    businessFunction: string;
    applications: string[];
}

export interface RdsCluster {
    createModule: boolean;
    appName: string;
    secretNamePrefix: string;
    parameterGroupName: string;
    parameterGroupFamily: string;
    parameterTimeZone: string;
    parameterGroupParameters: RdsParameter[];
    optionGroupName: string;
    optionGroupEngineName: string;
    optionGroupMajorEngineVersion: string;
    securityGroupSufix: string;
    dbIdentifier: string;
    dbEngine: string;
    dbEngineVersion: string;
    dbInstanceClass: string;
    dbCharacterSetName: string;
    dbLicenseModel: string;
    dbDbName: string;
    dbMultiAz: boolean;
    dbStorageType: string;
    dbIops: number | null;
    dbAllocatedStorage: number;
    dbMaxAllocatedStorage: number;
    dbStorageEncrypted: boolean;
    dbBackupRetentionPeriod: number;
    dbDeletionProtection: boolean;
    dbPerformanceInsightsEnabled: boolean;
    dbPerformanceInsightsRetentionPeriod: number;
    dbMonitoringInterval: number;
    dbCreateSleepDuration: string;
    dbSkipFinalSnapshot: boolean;
    dbDeleteAutomatedBackups: boolean;
    dbPubliclyAccessible: boolean;
    dbCaCertIdentifier: string;
    dbMinorVersionUpgrade: boolean;
    createReadReplicas: boolean;
    readReplicaCount: number;
    replicaInstanceClass: string;
    replicaMode: string;
    deleteAllSnapshotsOnDestroy: boolean;
    createUsers: boolean;
    oracleUsers: OracleUser[];
    dnsRecord: string;
    ingressRules: SecurityGroupRule[];
    egressRules: SecurityGroupRule[];
}

export interface RdsParameter {
    name: string;
    value: string;
    applyMethod: string;
}

export interface OracleUser {
    username: string;
    rotationDays: number;
}

export interface SecurityGroupRule {
    protocol: string;
    description: string;
    cidrBlocks?: string[];
    securityGroups?: string[];
    fromPort?: number;
    toPort?: number;
    self?: boolean;
}

export interface EksCluster {
    createEksModule: boolean;
    createArgocd: boolean;
    clusterName: string;
    clusterVersion: string;
    clusterEnabledLogTypes: string[];
    authenticationMode: string;
    endpointPrivateAccess: boolean;
    endpointPublicAccess: boolean;
    createNlbForEksCluster: boolean;
    oidcClientIdList: string[];
    oidcThumbprintList: string[];
    iamAccess: Record<string, unknown>;
    iamRolesPath: string;
    createNodegroup: boolean;
    clusterPublicAccessCidrs: string[];
    createCoredns: boolean;
    corednsVersion: string;
    corednsConfigValues: Record<string, unknown>;
    corednsSaRoleArn: string;
    createFargateCoredns: boolean;
    createKubeproxy: boolean;
    kubeproxyVersion: string;
    kubeproxyConfigValues: Record<string, unknown>;
    kubeproxySaRoleArn: string;
    createVpccni: boolean;
    vpccniVersion: string;
    vpccniConfigValues: unknown;
    vpccniSaRoleArn: string;
    createEbscsi: boolean;
    ebscsiVersion: string;
    ebscsiConfigValues: Record<string, unknown>;
    pciCluster?: boolean;
    enableCrossZoneLoadBalancing?: boolean;
    additionalTags?: Record<string, string>;
}

export interface S3Bucket {
    bucketName: string;
    versioning: boolean;
    encryption: boolean;
}

export interface OracleGoldenGate {
    createOggModule: boolean;
    oggInstanceAmi: string;
    oggInstanceType: string;
    environment: string;
}

/** Pipeline execution status */
export interface PipelineRun {
    id: number;
    environment: string;
    status: 'queued' | 'in_progress' | 'completed' | 'failed';
    conclusion?: 'success' | 'failure' | 'cancelled';
    createdAt: string;
    updatedAt: string;
    htmlUrl: string;
    steps: PipelineStep[];
}

export interface PipelineStep {
    name: string;
    status: string;
    conclusion?: string;
}

/** Cluster registration request (python-only feature) */
export interface ClusterRegistrationRequest {
    full_env_name: string;
    short_env_name: string;
    aws_account_id: string;
    aws_region: string;
    server_url: string;
    vpc_id: string;
    pr_branch_name: string;
    chart_branch?: string;
    auto_sync?: boolean;
    prune?: boolean;
    self_heal?: boolean;
}

/** Known environments from the CI/CD pipeline */
export const KNOWN_ENVIRONMENTS: { name: string; accountId: string; estimatedCost: string }[] = [
    { name: 'boil', accountId: '888577057664', estimatedCost: '$1,200/mo' },
    { name: 'internal-qa', accountId: '703671906224', estimatedCost: '$1,500/mo' },
    { name: 'internal-performance', accountId: '307946648035', estimatedCost: '$2,500/mo' },
    { name: 'internal-qa-qa', accountId: '415221474590', estimatedCost: '$1,500/mo' },
];

/** AWS regions used */
export const AWS_REGIONS = {
    primary: 'us-west-2',
    secondary: 'us-east-1',
};

/** Default subnet CIDR layout */
export const DEFAULT_SUBNET_CIDRS: Record<string, { newbits: number; netnum: number }> = {
    app: { newbits: 4, netnum: 0 },
    secure: { newbits: 5, netnum: 6 },
    frontend: { newbits: 5, netnum: 9 },
    dmz: { newbits: 5, netnum: 12 },
    mbo: { newbits: 5, netnum: 15 },
    eks_control_plane: { newbits: 5, netnum: 18 },
    aws_services: { newbits: 8, netnum: 168 },
    waf: { newbits: 8, netnum: 171 },
    vwan: { newbits: 8, netnum: 174 },
    firewall: { newbits: 8, netnum: 177 },
};

/** Default VPC endpoints */
export const DEFAULT_VPC_ENDPOINTS = [
    's3', 'ec2', 'rds', 'cloudtrail', 'logs', 'sns',
    'ssm', 'ec2messages', 'imagebuilder', 'kms',
    'ssmmessages', 'elasticfilesystem', 'execute-api',
];
