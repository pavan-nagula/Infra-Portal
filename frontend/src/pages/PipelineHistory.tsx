import { useEffect, useCallback, useState } from 'react';
import { Table, Tag, Select, Button, Space, Card, Typography, Row, Col, Steps, Timeline } from 'antd';
import {
  ReloadOutlined,
  LinkOutlined,
  PlayCircleOutlined,
  GithubOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  BranchesOutlined,
} from '@ant-design/icons';
import { pipelineApi } from '../services/api';
import type { PipelineRun } from '../types/environment';
import { KNOWN_ENVIRONMENTS } from '../types/environment';
import EmptyState from '../components/EmptyState';
import { useAsync } from '../hooks/useAsync';

const { Title, Text } = Typography;

export default function PipelineHistory() {
  const { data: runs, loading, error, execute } = useAsync<PipelineRun[]>([]);
  const [envFilter, setEnvFilter] = useState<string | undefined>();

  const fetchRuns = useCallback(() => {
    execute(() => pipelineApi.listRuns(envFilter));
  }, [execute, envFilter]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const statusColor = (status: string, conclusion?: string) => {
    if (status === 'completed') {
      return conclusion === 'success' ? 'green' : 'red';
    }
    if (status === 'in_progress') return 'blue';
    return 'default';
  };

  const columns = [
    {
      title: 'Run ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: 'Environment',
      dataIndex: 'environment',
      key: 'environment',
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: unknown, record: PipelineRun) => (
        <Tag color={statusColor(record.status, record.conclusion)}>
          {record.status === 'completed'
            ? record.conclusion?.toUpperCase()
            : record.status.toUpperCase().replace('_', ' ')}
        </Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val: string) => new Date(val).toLocaleString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: PipelineRun) => (
        <a href={record.htmlUrl} target="_blank" rel="noreferrer">
          <Button icon={<LinkOutlined />} size="small">
            View on GitHub
          </Button>
        </a>
      ),
    },
  ];

  const dataSource = (runs ?? []).map((r) => ({ ...r, key: r.id }));

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0, color: '#fff' }}>
          <PlayCircleOutlined style={{ marginRight: 8 }} />
          Pipeline Automation
        </Title>
        <Space>
          <Select
            placeholder="Filter by environment"
            allowClear
            style={{ width: 200 }}
            onChange={setEnvFilter}
            options={KNOWN_ENVIRONMENTS.map((e) => ({
              label: e.name,
              value: e.name,
            }))}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchRuns}>
            Refresh
          </Button>
        </Space>
      </div>

      {/* Pipeline Overview */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card
            title={<span style={{ color: '#fff' }}><BranchesOutlined /> Pipeline Location</span>}
            size="small"
            style={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8 }}
            styles={{ header: { borderBottom: '1px solid #2a2a4a' }, body: { padding: 16 } }}
          >
            <div style={{ marginBottom: 12 }}>
              <Text style={{ color: '#8c8c8c', fontSize: 12 }}>Repository</Text>
              <br />
              <Text style={{ color: '#fff' }}>
                <GithubOutlined style={{ marginRight: 6 }} />
                cubic-aws/terraform-cts-umb-internal
              </Text>
            </div>
            <div style={{ marginBottom: 12 }}>
              <Text style={{ color: '#8c8c8c', fontSize: 12 }}>Workflow</Text>
              <br />
              <Text style={{ color: '#fff' }}>.github/workflows/terraform-plan.yml</Text>
            </div>
            <div>
              <Text style={{ color: '#8c8c8c', fontSize: 12 }}>Trigger</Text>
              <br />
              <Text style={{ color: '#fff' }}>On PR to main → terraform plan per environment</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={<span style={{ color: '#fff' }}><SyncOutlined spin /> Currently Running</span>}
            size="small"
            style={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8 }}
            styles={{ header: { borderBottom: '1px solid #2a2a4a' }, body: { padding: 16 } }}
          >
            <Timeline
              items={[
                {
                  dot: <SyncOutlined spin style={{ color: '#1677ff' }} />,
                  children: (
                    <div>
                      <Text style={{ color: '#fff' }}>terraform plan — <Tag color="blue">internal-qa</Tag></Text>
                      <br />
                      <Text style={{ color: '#8c8c8c', fontSize: 11 }}>Started 2 min ago</Text>
                    </div>
                  ),
                },
                {
                  dot: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
                  children: (
                    <div>
                      <Text style={{ color: '#fff' }}>terraform plan — <Tag color="green">boil</Tag></Text>
                      <br />
                      <Text style={{ color: '#8c8c8c', fontSize: 11 }}>Completed 5 min ago</Text>
                    </div>
                  ),
                },
                {
                  dot: <ClockCircleOutlined style={{ color: '#8c8c8c' }} />,
                  children: (
                    <div>
                      <Text style={{ color: '#fff' }}>terraform plan — <Tag color="default">internal-performance</Tag></Text>
                      <br />
                      <Text style={{ color: '#8c8c8c', fontSize: 11 }}>Queued</Text>
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      {/* Pipeline Steps */}
      <Card
        size="small"
        style={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8, marginBottom: 24 }}
        styles={{ body: { padding: '16px 24px' } }}
      >
        <Steps
          size="small"
          current={2}
          items={[
            { title: 'PR Created', description: 'Branch pushed' },
            { title: 'Terraform Init', description: 'Providers loaded' },
            { title: 'Terraform Plan', description: 'In progress...' },
            { title: 'Review', description: 'Pending approval' },
            { title: 'Terraform Apply', description: 'Waiting' },
          ]}
        />
      </Card>

      {/* Run History Table */}
      <Title level={5} style={{ color: '#fff', marginBottom: 12 }}>Run History</Title>
      <Card
        style={{
          background: '#1a1a2e',
          border: '1px solid #2a2a4a',
          borderRadius: 8,
        }}
        styles={{ body: { padding: 0 } }}
        loading={loading}
      >
        {dataSource.length === 0 && !loading ? (
          <div style={{ padding: 24 }}>
            <EmptyState description="No pipeline runs found. Trigger a plan from the Environments page." />
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={dataSource}
            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `${total} runs` }}
            size="middle"
          />
        )}
      </Card>
    </div>
  );
}
