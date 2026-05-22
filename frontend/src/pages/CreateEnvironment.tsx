import { useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Typography,
} from 'antd';
import { environmentApi } from '../services/api';
import type { EnvironmentConfig } from '../types/environment';
import { getDefaultConfig } from '../utils/defaults';
import { showError, showSuccess } from '../hooks/useAsync';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

export default function CreateEnvironment() {
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const handleSubmit = async (values: { environment: string; tag: string; accountId: string }) => {
    setSubmitting(true);
    try {
      const config: EnvironmentConfig = {
        ...getDefaultConfig(),
        environment: values.environment,
        tags: { env: values.tag },
      };
      const result = await environmentApi.create(config, values.accountId);
      Modal.success({
        title: 'Environment Created',
        content: (
          <div>
            <p>Branch: <code>{result.branch}</code></p>
            <p>
              <a href={result.prUrl} target="_blank" rel="noreferrer">
                View Pull Request
              </a>
            </p>
          </div>
        ),
        onOk: () => navigate('/environments'),
      });
      showSuccess('Environment created successfully');
    } catch (err) {
      showError('Failed to create environment', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', paddingTop: 24 }}>
      <Title level={4} style={{ color: '#fff', marginBottom: 24 }}>Create New Environment</Title>
      <Card
        style={{
          background: '#1a1a2e',
          border: '1px solid #2a2a4a',
          borderRadius: 8,
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark={false}
        >
          <Form.Item
            label={<span style={{ color: '#d9d9d9' }}>Environment Name</span>}
            name="environment"
            rules={[{ required: true, message: 'Please enter an environment name' }]}
          >
            <Input placeholder="e.g. internal-qa, boil, internal-performance" />
          </Form.Item>

          <Form.Item
            label={<span style={{ color: '#d9d9d9' }}>Environment Tag</span>}
            name="tag"
            rules={[{ required: true, message: 'Please enter an environment tag' }]}
          >
            <Input placeholder="e.g. dev, staging, prod" />
          </Form.Item>

          <Form.Item
            label={<span style={{ color: '#d9d9d9' }}>AWS Account ID</span>}
            name="accountId"
            rules={[
              { required: true, message: 'Please enter the AWS Account ID' },
              { pattern: /^\d{12}$/, message: 'Must be a 12-digit AWS Account ID' },
            ]}
          >
            <Input placeholder="e.g. 123456789012" maxLength={12} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Button type="primary" htmlType="submit" loading={submitting} block>
              Create Environment & Open PR
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
