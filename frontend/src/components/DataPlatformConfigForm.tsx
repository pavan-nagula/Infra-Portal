import {
  Form,
  Input,
  Switch,
  Select,
  InputNumber,
  Row,
  Col,
  Card,
  Button,
  Tabs,
  Collapse,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type {
  EnvironmentConfig,
  ElastiCacheCluster,
  MskCluster,
  RdsCluster,
} from '../types/environment';

interface Props {
  config: EnvironmentConfig;
  onChange: (partial: Partial<EnvironmentConfig>) => void;
}

/** ElastiCache Section */
function ElastiCacheSection({
  clusters,
  envName,
  onUpdate,
}: {
  clusters: Record<string, ElastiCacheCluster>;
  envName: string;
  onUpdate: (c: Record<string, ElastiCacheCluster>) => void;
}) {
  const addCluster = () => {
    const key = `redis-${Object.keys(clusters).length + 1}`;
    onUpdate({
      ...clusters,
      [key]: {
        createModule: true,
        createReplicationGroup: true,
        applyImmediately: true,
        clusterMode: 'enabled',
        engineVersion: null,
        logGroupRetention: 7,
        maintenanceWindow: 'sun:05:00-sun:06:00',
        nodeType: 'cache.r7g.large',
        snapshotRetentionLimit: 14,
        snapshotWindow: '00:00-04:00',
        numNodeGroups: 1,
        replicasPerNodeGroup: 1,
        dnsEndpoint: `${key}-cluster.${envName}.nam.ctsnonprodcloud.com`,
      },
    });
  };

  return (
    <div>
      {Object.entries(clusters).map(([key, cluster]) => (
        <Card
          key={key}
          title={`Redis Cluster: ${key}`}
          size="small"
          style={{ marginBottom: 12 }}
          extra={
            <Button
              danger
              icon={<DeleteOutlined />}
              size="small"
              onClick={() => {
                const next = { ...clusters };
                delete next[key];
                onUpdate(next);
              }}
            />
          }
        >
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item label="Node Type">
                <Select
                  value={cluster.nodeType}
                  onChange={(val) =>
                    onUpdate({ ...clusters, [key]: { ...cluster, nodeType: val } })
                  }
                  options={[
                    { label: 'cache.r7g.large', value: 'cache.r7g.large' },
                    { label: 'cache.r7g.xlarge', value: 'cache.r7g.xlarge' },
                    { label: 'cache.r6g.large', value: 'cache.r6g.large' },
                    { label: 'cache.t4g.medium', value: 'cache.t4g.medium' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item label="Node Groups">
                <InputNumber
                  value={cluster.numNodeGroups}
                  onChange={(val) =>
                    onUpdate({
                      ...clusters,
                      [key]: { ...cluster, numNodeGroups: val ?? 1 },
                    })
                  }
                  min={1}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item label="Replicas/Group">
                <InputNumber
                  value={cluster.replicasPerNodeGroup}
                  onChange={(val) =>
                    onUpdate({
                      ...clusters,
                      [key]: { ...cluster, replicasPerNodeGroup: val ?? 1 },
                    })
                  }
                  min={0}
                  max={5}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item label="DNS Endpoint">
                <Input
                  value={cluster.dnsEndpoint}
                  onChange={(e) =>
                    onUpdate({
                      ...clusters,
                      [key]: { ...cluster, dnsEndpoint: e.target.value },
                    })
                  }
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      ))}
      <Button type="dashed" onClick={addCluster} icon={<PlusOutlined />} block>
        Add ElastiCache Cluster
      </Button>
    </div>
  );
}

/** MSK Section */
function MskSection({
  clusters,
  envName,
  onUpdate,
}: {
  clusters: Record<string, MskCluster>;
  envName: string;
  onUpdate: (c: Record<string, MskCluster>) => void;
}) {
  const addCluster = () => {
    const key = `kafka-cluster-${Object.keys(clusters).length + 1}`;
    onUpdate({
      ...clusters,
      [key]: {
        clusterName: 'msk-cluster',
        environment: envName,
        numberOfBrokerNodes: 3,
        volumeSize: 3500,
        configureIamPolicy: true,
        policyName: 'msk-cluster',
        createModule: true,
        instanceType: 'kafka.m5.large',
        subnetType: 'aws_services',
        iamClientAuthentication: true,
        unauthenticated: true,
        clientBrokerEncryption: 'TLS_PLAINTEXT',
      },
    });
  };

  return (
    <div>
      {Object.entries(clusters).map(([key, cluster]) => (
        <Card
          key={key}
          title={`MSK Cluster: ${key}`}
          size="small"
          style={{ marginBottom: 12 }}
          extra={
            <Button
              danger
              icon={<DeleteOutlined />}
              size="small"
              onClick={() => {
                const next = { ...clusters };
                delete next[key];
                onUpdate(next);
              }}
            />
          }
        >
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item label="Instance Type">
                <Select
                  value={cluster.instanceType}
                  onChange={(val) =>
                    onUpdate({ ...clusters, [key]: { ...cluster, instanceType: val } })
                  }
                  options={[
                    { label: 'kafka.m5.large', value: 'kafka.m5.large' },
                    { label: 'kafka.m5.xlarge', value: 'kafka.m5.xlarge' },
                    { label: 'kafka.m5.2xlarge', value: 'kafka.m5.2xlarge' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item label="Broker Nodes">
                <InputNumber
                  value={cluster.numberOfBrokerNodes}
                  onChange={(val) =>
                    onUpdate({
                      ...clusters,
                      [key]: { ...cluster, numberOfBrokerNodes: val ?? 3 },
                    })
                  }
                  min={1}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item label="Volume (GB)">
                <InputNumber
                  value={cluster.volumeSize}
                  onChange={(val) =>
                    onUpdate({
                      ...clusters,
                      [key]: { ...cluster, volumeSize: val ?? 100 },
                    })
                  }
                  min={100}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item label="Encryption">
                <Select
                  value={cluster.clientBrokerEncryption}
                  onChange={(val) =>
                    onUpdate({
                      ...clusters,
                      [key]: { ...cluster, clientBrokerEncryption: val },
                    })
                  }
                  options={[
                    { label: 'TLS', value: 'TLS' },
                    { label: 'TLS + Plaintext', value: 'TLS_PLAINTEXT' },
                    { label: 'Plaintext', value: 'PLAINTEXT' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item label="IAM Auth">
                <Switch
                  checked={cluster.iamClientAuthentication}
                  onChange={(val) =>
                    onUpdate({
                      ...clusters,
                      [key]: { ...cluster, iamClientAuthentication: val },
                    })
                  }
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      ))}
      <Button type="dashed" onClick={addCluster} icon={<PlusOutlined />} block>
        Add MSK Cluster
      </Button>
    </div>
  );
}

/** RDS Section */
function RdsSection({
  clusters,
  envName,
  onUpdate,
}: {
  clusters: Record<string, RdsCluster>;
  envName: string;
  onUpdate: (c: Record<string, RdsCluster>) => void;
}) {
  const addDatabase = () => {
    const name = prompt('Database name (e.g., ec, ncs, nis):');
    if (!name) return;
    const key = name.toLowerCase();
    onUpdate({
      ...clusters,
      [key]: {
        createModule: true,
        appName: key,
        secretNamePrefix: 'admin-user',
        parameterGroupName: `${envName}-${key}-prmtrgrp`,
        parameterGroupFamily: 'oracle-ee-19',
        parameterTimeZone: 'America/Los_Angeles',
        parameterGroupParameters: [
          { name: 'audit_sys_operations', value: 'TRUE', applyMethod: 'pending-reboot' },
          { name: 'audit_trail', value: 'XML', applyMethod: 'pending-reboot' },
          { name: 'processes', value: '1000', applyMethod: 'pending-reboot' },
        ],
        optionGroupName: `${envName}-${key}-optgrp`,
        optionGroupEngineName: 'oracle-ee',
        optionGroupMajorEngineVersion: '19',
        securityGroupSufix: 'default-sg-rds',
        dbIdentifier: `${key}-oracle-rds`,
        dbEngine: 'oracle-ee',
        dbEngineVersion: '19',
        dbInstanceClass: 'db.t3.small',
        dbCharacterSetName: 'AL32UTF8',
        dbLicenseModel: 'bring-your-own-license',
        dbDbName: key.toUpperCase(),
        dbMultiAz: false,
        dbStorageType: 'gp3',
        dbIops: null,
        dbAllocatedStorage: 100,
        dbMaxAllocatedStorage: 600,
        dbStorageEncrypted: true,
        dbBackupRetentionPeriod: 14,
        dbDeletionProtection: false,
        dbPerformanceInsightsEnabled: true,
        dbPerformanceInsightsRetentionPeriod: 7,
        dbMonitoringInterval: 15,
        dbCreateSleepDuration: '40s',
        dbSkipFinalSnapshot: true,
        dbDeleteAutomatedBackups: true,
        dbPubliclyAccessible: false,
        dbCaCertIdentifier: 'rds-ca-rsa2048-g1',
        dbMinorVersionUpgrade: false,
        createReadReplicas: false,
        readReplicaCount: 0,
        replicaInstanceClass: 'db.r7i.large',
        replicaMode: 'open-read-only',
        deleteAllSnapshotsOnDestroy: true,
        createUsers: false,
        oracleUsers: [],
        dnsRecord: `${key}-db.${envName}.nam.ctsnonprodcloud.com`,
        ingressRules: [],
        egressRules: [],
      },
    });
  };

  return (
    <div>
      {Object.entries(clusters).map(([key, db]) => (
        <Collapse
          key={key}
          style={{ marginBottom: 8 }}
          items={[
            {
              key,
              label: `Oracle RDS: ${key.toUpperCase()} (${db.dbInstanceClass})`,
              extra: (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = { ...clusters };
                    delete next[key];
                    onUpdate(next);
                  }}
                />
              ),
              children: (
                <>
                  <Row gutter={16}>
                    <Col span={6}>
                      <Form.Item label="Instance Class">
                        <Select
                          value={db.dbInstanceClass}
                          onChange={(val) =>
                            onUpdate({ ...clusters, [key]: { ...db, dbInstanceClass: val } })
                          }
                          options={[
                            { label: 'db.t3.small', value: 'db.t3.small' },
                            { label: 'db.t3.medium', value: 'db.t3.medium' },
                            { label: 'db.r7i.large', value: 'db.r7i.large' },
                            { label: 'db.r7i.xlarge', value: 'db.r7i.xlarge' },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item label="Storage (GB)">
                        <InputNumber
                          value={db.dbAllocatedStorage}
                          onChange={(val) =>
                            onUpdate({
                              ...clusters,
                              [key]: { ...db, dbAllocatedStorage: val ?? 100 },
                            })
                          }
                          min={20}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item label="Max Storage">
                        <InputNumber
                          value={db.dbMaxAllocatedStorage}
                          onChange={(val) =>
                            onUpdate({
                              ...clusters,
                              [key]: { ...db, dbMaxAllocatedStorage: val ?? 600 },
                            })
                          }
                          min={20}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item label="Multi-AZ">
                        <Switch
                          checked={db.dbMultiAz}
                          onChange={(val) =>
                            onUpdate({ ...clusters, [key]: { ...db, dbMultiAz: val } })
                          }
                        />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item label="DNS Record">
                        <Input
                          value={db.dnsRecord}
                          onChange={(e) =>
                            onUpdate({
                              ...clusters,
                              [key]: { ...db, dnsRecord: e.target.value },
                            })
                          }
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={4}>
                      <Form.Item label="Encrypted">
                        <Switch checked={db.dbStorageEncrypted} disabled />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item label="Backup Days">
                        <InputNumber
                          value={db.dbBackupRetentionPeriod}
                          onChange={(val) =>
                            onUpdate({
                              ...clusters,
                              [key]: { ...db, dbBackupRetentionPeriod: val ?? 14 },
                            })
                          }
                          min={0}
                          max={35}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item label="Perf Insights">
                        <Switch
                          checked={db.dbPerformanceInsightsEnabled}
                          onChange={(val) =>
                            onUpdate({
                              ...clusters,
                              [key]: { ...db, dbPerformanceInsightsEnabled: val },
                            })
                          }
                        />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item label="Read Replicas">
                        <Switch
                          checked={db.createReadReplicas}
                          onChange={(val) =>
                            onUpdate({
                              ...clusters,
                              [key]: { ...db, createReadReplicas: val },
                            })
                          }
                        />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item label="Deletion Prot">
                        <Switch
                          checked={db.dbDeletionProtection}
                          onChange={(val) =>
                            onUpdate({
                              ...clusters,
                              [key]: { ...db, dbDeletionProtection: val },
                            })
                          }
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </>
              ),
            },
          ]}
        />
      ))}
      <Button type="dashed" onClick={addDatabase} icon={<PlusOutlined />} block>
        Add Oracle RDS Database
      </Button>
    </div>
  );
}

export default function DataPlatformConfigForm({ config, onChange }: Props) {
  return (
    <Tabs
      items={[
        {
          key: 'elasticache',
          label: 'ElastiCache (Redis)',
          children: (
            <ElastiCacheSection
              clusters={config.elasticacheClusters}
              envName={config.environment}
              onUpdate={(c) => onChange({ elasticacheClusters: c })}
            />
          ),
        },
        {
          key: 'msk',
          label: 'MSK (Kafka)',
          children: (
            <MskSection
              clusters={config.mskClusters}
              envName={config.environment}
              onUpdate={(c) => onChange({ mskClusters: c })}
            />
          ),
        },
        {
          key: 'rds',
          label: 'RDS (Oracle)',
          children: (
            <RdsSection
              clusters={config.rdsClusters}
              envName={config.environment}
              onUpdate={(c) => onChange({ rdsClusters: c })}
            />
          ),
        },
      ]}
    />
  );
}
