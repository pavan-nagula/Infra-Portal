import { Form, Input, Select, Row, Col, Card } from 'antd';
import type { EnvironmentConfig } from '../types/environment';

interface Props {
  config: EnvironmentConfig;
  onChange: (partial: Partial<EnvironmentConfig>) => void;
}

export default function SecurityConfigForm({ config, onChange }: Props) {
  return (
    <div>
      <Card title="Network Firewall Rules" size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item label="Ingress Web Rules (Suricata)">
              <Input.TextArea
                rows={4}
                value={config.ingressWebRules}
                onChange={(e) => onChange({ ingressWebRules: e.target.value })}
                placeholder="Suricata rules for ingress web traffic"
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item label="Advanced IDS Rules (Suricata)">
              <Input.TextArea
                rows={4}
                value={config.advancedIdsRules}
                onChange={(e) => onChange({ advancedIdsRules: e.target.value })}
                placeholder="Suricata rules for advanced intrusion detection"
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item label="Threat Detection Rules (Suricata)">
              <Input.TextArea
                rows={4}
                value={config.threatDetectionRules}
                onChange={(e) =>
                  onChange({ threatDetectionRules: e.target.value })
                }
                placeholder="Suricata rules for threat detection"
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item label="Block All Traffic Rule (Suricata)">
              <Input.TextArea
                rows={2}
                value={config.blockAllTrafficRule}
                onChange={(e) =>
                  onChange({ blockAllTrafficRule: e.target.value })
                }
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card title="Domain & Geo Filtering" size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Allowed HTTPS Domains">
              <Select
                mode="tags"
                value={config.allowHttpsDomains}
                onChange={(vals) => onChange({ allowHttpsDomains: vals })}
                placeholder="Add domains that should be allowed"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Blocked Countries (ISO codes)">
              <Select
                mode="tags"
                value={config.blockedCountries}
                onChange={(vals) => onChange({ blockedCountries: vals })}
                placeholder="e.g., CN, RU, KP"
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card title="VPC Flow Logs IAM" size="small">
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Create Role">
              <Select
                value={config.vpcFlowLogsIam.createRole ? 'true' : 'false'}
                onChange={(val) =>
                  onChange({
                    vpcFlowLogsIam: {
                      ...config.vpcFlowLogsIam,
                      createRole: val === 'true',
                    },
                  })
                }
                options={[
                  { label: 'Yes', value: 'true' },
                  { label: 'No', value: 'false' },
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Create Policy">
              <Select
                value={config.vpcFlowLogsIam.createPolicy ? 'true' : 'false'}
                onChange={(val) =>
                  onChange({
                    vpcFlowLogsIam: {
                      ...config.vpcFlowLogsIam,
                      createPolicy: val === 'true',
                    },
                  })
                }
                options={[
                  { label: 'Yes', value: 'true' },
                  { label: 'No', value: 'false' },
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Trusted Services">
              <Select
                mode="tags"
                value={config.vpcFlowLogsIam.trustedRoleServices}
                onChange={(vals) =>
                  onChange({
                    vpcFlowLogsIam: {
                      ...config.vpcFlowLogsIam,
                      trustedRoleServices: vals,
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
