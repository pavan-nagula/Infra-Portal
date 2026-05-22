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
  Space,
  Collapse,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { EnvironmentConfig, EksCluster } from '../types/environment';

interface Props {
  config: EnvironmentConfig;
  onChange: (partial: Partial<EnvironmentConfig>) => void;
}

const DEFAULT_EKS_CLUSTER: EksCluster = {
  createEksModule: true,
  createArgocd: true,
  clusterName: '',
  clusterVersion: '1.31',
  clusterEnabledLogTypes: ['api', 'audit', 'authenticator', 'controllerManager', 'scheduler'],
  authenticationMode: 'API_AND_CONFIG_MAP',
  endpointPrivateAccess: true,
  endpointPublicAccess: false,
  createNlbForEksCluster: true,
  oidcClientIdList: ['sts.amazonaws.com'],
  oidcThumbprintList: [],
  iamAccess: {},
  iamRolesPath: '/cubic-service-role/',
  createNodegroup: false,
  clusterPublicAccessCidrs: ['0.0.0.0/0'],
  createCoredns: true,
  corednsVersion: 'v1.11.4-eksbuild.2',
  corednsConfigValues: {},
  corednsSaRoleArn: '',
  createFargateCoredns: false,
  createKubeproxy: true,
  kubeproxyVersion: 'v1.31.3-eksbuild.2',
  kubeproxyConfigValues: {},
  kubeproxySaRoleArn: '',
  createVpccni: true,
  vpccniVersion: 'v1.19.2-eksbuild.1',
  vpccniConfigValues: {},
  vpccniSaRoleArn: '',
  createEbscsi: true,
  ebscsiVersion: 'v1.37.0-eksbuild.1',
  ebscsiConfigValues: {},
  pciCluster: false,
  enableCrossZoneLoadBalancing: false,
  additionalTags: {},
};

function EksClusterForm({
  name,
  cluster,
  onClusterChange,
  onRemove,
}: {
  name: string;
  cluster: EksCluster;
  onClusterChange: (c: EksCluster) => void;
  onRemove: () => void;
}) {
  const update = (partial: Partial<EksCluster>) =>
    onClusterChange({ ...cluster, ...partial });

  return (
    <Card
      title={`EKS Cluster: ${name}`}
      size="small"
      style={{ marginBottom: 16 }}
      extra={
        <Button
          danger
          icon={<DeleteOutlined />}
          size="small"
          onClick={onRemove}
        >
          Remove
        </Button>
      }
    >
      <Row gutter={16}>
        <Col span={4}>
          <Form.Item label="Create">
            <Switch
              checked={cluster.createEksModule}
              onChange={(val) => update({ createEksModule: val })}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Cluster Name" required>
            <Input
              value={cluster.clusterName}
              onChange={(e) => update({ clusterName: e.target.value })}
              placeholder="e.g., myenv-eks"
            />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Cluster Version">
            <Select
              value={cluster.clusterVersion}
              onChange={(val) => update({ clusterVersion: val })}
              options={[
                { label: '1.31', value: '1.31' },
                { label: '1.30', value: '1.30' },
                { label: '1.29', value: '1.29' },
              ]}
            />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Auth Mode">
            <Select
              value={cluster.authenticationMode}
              onChange={(val) => update({ authenticationMode: val })}
              options={[
                { label: 'API & ConfigMap', value: 'API_AND_CONFIG_MAP' },
                { label: 'API Only', value: 'API' },
              ]}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={4}>
          <Form.Item label="ArgoCD">
            <Switch
              checked={cluster.createArgocd}
              onChange={(val) => update({ createArgocd: val })}
            />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item label="Private Endpoint">
            <Switch
              checked={cluster.endpointPrivateAccess}
              onChange={(val) => update({ endpointPrivateAccess: val })}
            />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item label="Public Endpoint">
            <Switch
              checked={cluster.endpointPublicAccess}
              onChange={(val) => update({ endpointPublicAccess: val })}
            />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item label="Create NLB">
            <Switch
              checked={cluster.createNlbForEksCluster}
              onChange={(val) => update({ createNlbForEksCluster: val })}
            />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item label="PCI Cluster">
            <Switch
              checked={cluster.pciCluster ?? false}
              onChange={(val) => update({ pciCluster: val })}
            />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item label="Node Group">
            <Switch
              checked={cluster.createNodegroup}
              onChange={(val) => update({ createNodegroup: val })}
            />
          </Form.Item>
        </Col>
      </Row>

      <Collapse
        ghost
        items={[
          {
            key: 'addons',
            label: 'Cluster Add-ons',
            children: (
              <>
                <Row gutter={16}>
                  <Col span={6}>
                    <Form.Item label="CoreDNS">
                      <Switch
                        checked={cluster.createCoredns}
                        onChange={(val) => update({ createCoredns: val })}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item label="CoreDNS Version">
                      <Input
                        value={cluster.corednsVersion}
                        onChange={(e) =>
                          update({ corednsVersion: e.target.value })
                        }
                      />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item label="kube-proxy">
                      <Switch
                        checked={cluster.createKubeproxy}
                        onChange={(val) => update({ createKubeproxy: val })}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item label="kube-proxy Version">
                      <Input
                        value={cluster.kubeproxyVersion}
                        onChange={(e) =>
                          update({ kubeproxyVersion: e.target.value })
                        }
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={6}>
                    <Form.Item label="VPC CNI">
                      <Switch
                        checked={cluster.createVpccni}
                        onChange={(val) => update({ createVpccni: val })}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item label="VPC CNI Version">
                      <Input
                        value={cluster.vpccniVersion}
                        onChange={(e) =>
                          update({ vpccniVersion: e.target.value })
                        }
                      />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item label="EBS CSI">
                      <Switch
                        checked={cluster.createEbscsi}
                        onChange={(val) => update({ createEbscsi: val })}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item label="EBS CSI Version">
                      <Input
                        value={cluster.ebscsiVersion}
                        onChange={(e) =>
                          update({ ebscsiVersion: e.target.value })
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
    </Card>
  );
}

export default function EksConfigForm({ config, onChange }: Props) {
  const clusters = config.eksClusters;

  const addCluster = () => {
    const key = `eks-${Object.keys(clusters).length + 1}`;
    onChange({
      eksClusters: {
        ...clusters,
        [key]: {
          ...DEFAULT_EKS_CLUSTER,
          clusterName: `${config.environment}-eks`,
        },
      },
    });
  };

  const updateCluster = (key: string, cluster: EksCluster) => {
    onChange({ eksClusters: { ...clusters, [key]: cluster } });
  };

  const removeCluster = (key: string) => {
    const next = { ...clusters };
    delete next[key];
    onChange({ eksClusters: next });
  };

  return (
    <div>
      {Object.entries(clusters).map(([key, cluster]) => (
        <EksClusterForm
          key={key}
          name={key}
          cluster={cluster}
          onClusterChange={(c) => updateCluster(key, c)}
          onRemove={() => removeCluster(key)}
        />
      ))}
      <Button
        type="dashed"
        onClick={addCluster}
        icon={<PlusOutlined />}
        style={{ width: '100%' }}
      >
        Add EKS Cluster
      </Button>
    </div>
  );
}
