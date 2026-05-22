import {
  Form,
  Input,
  Switch,
  Select,
  InputNumber,
  Row,
  Col,
  Card,
  Collapse,
  Checkbox,
} from 'antd';
import type { EnvironmentConfig, VpcConfiguration } from '../types/environment';
import { DEFAULT_VPC_ENDPOINTS } from '../types/environment';

interface Props {
  config: EnvironmentConfig;
  onChange: (partial: Partial<EnvironmentConfig>) => void;
}

function VpcSection({
  title,
  vpc,
  onVpcChange,
  regionAzs,
}: {
  title: string;
  vpc: VpcConfiguration;
  onVpcChange: (v: Partial<VpcConfiguration>) => void;
  regionAzs: string[];
}) {
  return (
    <Card title={title} size="small" style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col span={4}>
          <Form.Item label="Create VPC">
            <Switch
              checked={vpc.createVpc}
              onChange={(val) => onVpcChange({ createVpc: val })}
            />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item label="Internet GW">
            <Switch
              checked={vpc.createInternetGateway}
              onChange={(val) => onVpcChange({ createInternetGateway: val })}
            />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item label="NAT GW">
            <Switch
              checked={vpc.createNatGateway}
              onChange={(val) => onVpcChange({ createNatGateway: val })}
            />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item label="VPC Endpoints">
            <Switch
              checked={vpc.createVpcEndpoints}
              onChange={(val) => onVpcChange({ createVpcEndpoints: val })}
            />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item label="EKS CP Subnets">
            <Switch
              checked={vpc.createEksControlPlaneSubnets}
              onChange={(val) =>
                onVpcChange({ createEksControlPlaneSubnets: val })
              }
            />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item label="Egress Firewall">
            <Switch
              checked={vpc.createEgressNetworkFirewall}
              onChange={(val) =>
                onVpcChange({ createEgressNetworkFirewall: val })
              }
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={6}>
          <Form.Item label="Environment Tier">
            <Select
              value={vpc.environmentTier}
              onChange={(val) => onVpcChange({ environmentTier: val })}
              options={[
                { label: 'Non-Prod', value: 'nonprod' },
                { label: 'Production', value: 'prod' },
              ]}
            />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="VPC Type">
            <Select
              value={vpc.vpcType}
              onChange={(val) => onVpcChange({ vpcType: val })}
              options={[
                { label: 'Workload', value: 'workload' },
                { label: 'Shared Services', value: 'shared-services' },
              ]}
            />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="IPAM Pool">
            <Input
              value={vpc.ipamPoolName}
              onChange={(e) => onVpcChange({ ipamPoolName: e.target.value })}
            />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Netmask Length">
            <InputNumber
              value={vpc.ipv4NetmaskLength}
              onChange={(val) =>
                onVpcChange({ ipv4NetmaskLength: val ?? 19 })
              }
              min={16}
              max={28}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="Availability Zones">
            <Select
              mode="multiple"
              value={vpc.availabilityZones}
              onChange={(val) => onVpcChange({ availabilityZones: val })}
              options={regionAzs.map((az) => ({ label: az, value: az }))}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="NAT Gateway Deployment">
            <Select
              value={vpc.natGatewayDeployment}
              onChange={(val) => onVpcChange({ natGatewayDeployment: val })}
              options={[
                { label: 'One per AZ', value: 'one_per_az' },
                { label: 'Single', value: 'single' },
              ]}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Flow Logs Retention (days)">
            <InputNumber
              value={vpc.flowLogsRetentionDays}
              onChange={(val) =>
                onVpcChange({ flowLogsRetentionDays: val ?? 30 })
              }
              min={1}
              max={365}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
      </Row>

      <Collapse
        ghost
        items={[
          {
            key: 'endpoints',
            label: 'VPC Endpoints',
            children: (
              <Checkbox.Group
                value={vpc.vpcEndpoints}
                onChange={(vals) =>
                  onVpcChange({ vpcEndpoints: vals as string[] })
                }
                options={DEFAULT_VPC_ENDPOINTS.map((ep) => ({
                  label: ep,
                  value: ep,
                }))}
              />
            ),
          },
          {
            key: 'tgw',
            label: 'Transit Gateway',
            children: (
              <Row gutter={16}>
                <Col span={6}>
                  <Form.Item label="Attach to TGW">
                    <Switch
                      checked={vpc.attachToTransitGateway}
                      onChange={(val) =>
                        onVpcChange({ attachToTransitGateway: val })
                      }
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="Route Table to Attach">
                    <Input
                      value={vpc.transitGatewayRouteTableToAttach}
                      onChange={(e) =>
                        onVpcChange({
                          transitGatewayRouteTableToAttach: e.target.value,
                        })
                      }
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="TGW Destination CIDRs">
                    <Select
                      mode="tags"
                      value={vpc.tgwDestinationCidrs}
                      onChange={(val) =>
                        onVpcChange({ tgwDestinationCidrs: val })
                      }
                    />
                  </Form.Item>
                </Col>
              </Row>
            ),
          },
          {
            key: 'phz',
            label: 'Private Hosted Zones',
            children: (
              <Row gutter={16}>
                <Col span={6}>
                  <Form.Item label="Associate PHZ">
                    <Switch
                      checked={vpc.associateWithPrivateHostedZones}
                      onChange={(val) =>
                        onVpcChange({
                          associateWithPrivateHostedZones: val,
                        })
                      }
                    />
                  </Form.Item>
                </Col>
                <Col span={9}>
                  <Form.Item label="Non-Prod PHZs">
                    <Select
                      mode="tags"
                      value={vpc.privateHostedZonesNonProdToAssociate}
                      onChange={(val) =>
                        onVpcChange({
                          privateHostedZonesNonProdToAssociate: val,
                        })
                      }
                      placeholder="e.g., env.nam.ctsnonprodcloud.com"
                    />
                  </Form.Item>
                </Col>
                <Col span={9}>
                  <Form.Item label="Prod PHZs">
                    <Select
                      mode="tags"
                      value={vpc.privateHostedZonesProdToAssociate}
                      onChange={(val) =>
                        onVpcChange({
                          privateHostedZonesProdToAssociate: val,
                        })
                      }
                    />
                  </Form.Item>
                </Col>
              </Row>
            ),
          },
        ]}
      />
    </Card>
  );
}

export default function VpcConfigForm({ config, onChange }: Props) {
  const updatePrimary = (partial: Partial<VpcConfiguration>) =>
    onChange({ vpcPrimary: { ...config.vpcPrimary, ...partial } });

  const updateSecondary = (partial: Partial<VpcConfiguration>) =>
    onChange({ vpcSecondary: { ...config.vpcSecondary, ...partial } });

  return (
    <div>
      <VpcSection
        title="Primary VPC (us-west-2)"
        vpc={config.vpcPrimary}
        onVpcChange={updatePrimary}
        regionAzs={['us-west-2a', 'us-west-2b', 'us-west-2c', 'us-west-2d']}
      />
      <VpcSection
        title="Secondary VPC (us-east-1)"
        vpc={config.vpcSecondary}
        onVpcChange={updateSecondary}
        regionAzs={['us-east-1a', 'us-east-1b', 'us-east-1c', 'us-east-1d']}
      />
    </div>
  );
}
