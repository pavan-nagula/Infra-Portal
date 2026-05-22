import {
  Form,
  Input,
  Switch,
  Select,
  Divider,
  Row,
  Col,
  Card,
} from 'antd';
import type { EnvironmentConfig } from '../types/environment';
import { KNOWN_ENVIRONMENTS } from '../types/environment';

interface Props {
  config: EnvironmentConfig;
  onChange: (partial: Partial<EnvironmentConfig>) => void;
}

export default function BasicConfigForm({ config, onChange }: Props) {
  return (
    <div>
      <Card title="Environment Identity" size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Environment Name" required>
              <Input
                value={config.environment}
                onChange={(e) => onChange({ environment: e.target.value })}
                placeholder="e.g., staging, prod-east"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Business Unit">
              <Input
                value={config.business}
                onChange={(e) => onChange({ business: e.target.value })}
                placeholder="e.g., int-workloads"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Platform Name">
              <Select
                value={config.platformName}
                onChange={(val) => onChange({ platformName: val })}
                options={[
                  { label: 'Development', value: 'development' },
                  { label: 'QA', value: 'qa' },
                  { label: 'Performance', value: 'performance' },
                  { label: 'Production', value: 'production' },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Project Name">
              <Input
                value={config.projectName}
                onChange={(e) => onChange({ projectName: e.target.value })}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Name">
              <Input
                value={config.name}
                onChange={(e) => onChange({ name: e.target.value })}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Clone From Existing">
              <Select
                allowClear
                placeholder="Optional - clone config from..."
                options={KNOWN_ENVIRONMENTS.map((e) => ({
                  label: e.name,
                  value: e.name,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card title="Feature Flags" size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Deploy API Gateway">
              <Switch
                checked={config.deployApiGateway}
                onChange={(val) => onChange({ deployApiGateway: val })}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Cross-Cluster IAM">
              <Switch
                checked={config.createCrossClusterIam}
                onChange={(val) => onChange({ createCrossClusterIam: val })}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="CipherTrust Manager (k170v)">
              <Switch
                checked={config.createK170v}
                onChange={(val) => onChange({ createK170v: val })}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card title="Tags" size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Form.Item label="Environment Tag">
              <Input
                value={config.tags.Environment ?? ''}
                onChange={(e) =>
                  onChange({
                    tags: { ...config.tags, Environment: e.target.value },
                  })
                }
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Team">
              <Input
                value={config.tags.Team ?? ''}
                onChange={(e) =>
                  onChange({
                    tags: { ...config.tags, Team: e.target.value },
                  })
                }
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Application">
              <Input
                value={config.tags.Application ?? ''}
                onChange={(e) =>
                  onChange({
                    tags: { ...config.tags, Application: e.target.value },
                  })
                }
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Terraform">
              <Input value="true" disabled />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Divider />

      <Card title="Bastion Host" size="small">
        <Row gutter={16}>
          <Col span={4}>
            <Form.Item label="Deploy Bastion">
              <Switch
                checked={config.bastionConfiguration.deployBastion}
                onChange={(val) =>
                  onChange({
                    bastionConfiguration: {
                      ...config.bastionConfiguration,
                      deployBastion: val,
                    },
                  })
                }
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="AMI ID">
              <Input
                value={config.bastionConfiguration.amiId}
                onChange={(e) =>
                  onChange({
                    bastionConfiguration: {
                      ...config.bastionConfiguration,
                      amiId: e.target.value,
                    },
                  })
                }
                placeholder="ami-xxxxxxxxxxxxxxxxx"
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Instance Type">
              <Select
                value={config.bastionConfiguration.instanceType}
                onChange={(val) =>
                  onChange({
                    bastionConfiguration: {
                      ...config.bastionConfiguration,
                      instanceType: val,
                    },
                  })
                }
                options={[
                  { label: 't3.micro', value: 't3.micro' },
                  { label: 't3.small', value: 't3.small' },
                  { label: 't3.medium', value: 't3.medium' },
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="IAM Role Path">
              <Input
                value={config.bastionConfiguration.iamRolePath}
                onChange={(e) =>
                  onChange({
                    bastionConfiguration: {
                      ...config.bastionConfiguration,
                      iamRolePath: e.target.value,
                    },
                  })
                }
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>
    </div>
  );
}
