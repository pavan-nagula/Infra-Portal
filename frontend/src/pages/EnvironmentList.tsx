import { useEffect, useCallback, useState } from 'react';
import {
    Card,
    Button,
    Space,
    Popconfirm,
    Row,
    Col,
    Tag,
    Progress,
    Typography,
    Form,
    Input,
    Select,
    InputNumber,
    Switch,
    Slider,
    Steps,
    Timeline,
    Collapse,
} from 'antd';
import {
    RocketOutlined,
    CopyOutlined,
    ReloadOutlined,
    PlusOutlined,
    GlobalOutlined,
    CheckCircleOutlined,
    CloseOutlined,
    SyncOutlined,
    BranchesOutlined,
    RollbackOutlined,
    DollarOutlined,
} from '@ant-design/icons';
import { environmentApi, pipelineApi } from '../services/api';
import { KNOWN_ENVIRONMENTS } from '../types/environment';
import type { EnvironmentConfig } from '../types/environment';
import { getDefaultConfig } from '../utils/defaults';
import { generateTfvarsLocally } from '../utils/tfvarsGenerator';
import EmptyState from '../components/EmptyState';
import { useAsync, showError, showSuccess } from '../hooks/useAsync';

const { Text } = Typography;

interface EnvironmentListProps {
    showPipeline?: boolean;
}

export default function EnvironmentList({ showPipeline: _showPipeline }: EnvironmentListProps) {
    const { data: environments, loading, error, execute } = useAsync<string[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [wizardStep, setWizardStep] = useState(0);
    const [pipelineInfo, setPipelineInfo] = useState<{ branch: string; prUrl: string; environment: string } | null>(null);
    const [activePipelineEnv, setActivePipelineEnv] = useState<string | null>(null);
    const [form] = Form.useForm();

    // Filters
    const [tierFilter, setTierFilter] = useState<string | undefined>();
    const [regionFilter, setRegionFilter] = useState<string | undefined>();
    const [costRange, setCostRange] = useState<[number, number]>([0, 5000]);

    const fetchEnvironments = useCallback(() => {
        execute(async () => {
            try {
                return await environmentApi.list();
            } catch {
                return KNOWN_ENVIRONMENTS.map((e) => e.name);
            }
        });
    }, [execute]);

    useEffect(() => {
        fetchEnvironments();
    }, [fetchEnvironments]);

    const handleTriggerPlan = async (envName: string) => {
        setActivePipelineEnv(envName);
        try {
            const result = await pipelineApi.triggerPlan(envName);
            showSuccess(
                'Pipeline Triggered',
                `Run ID: ${result.runId} for ${envName}`,
            );
        } catch (err) {
            showError(`Failed to trigger pipeline for ${envName}`, err);
        }
    };

    const handleCreateEnvironment = async (values: { environment: string; tag: string; accountId: string }) => {
        setSubmitting(true);
        try {
            const config: EnvironmentConfig = {
                ...getDefaultConfig(),
                environment: values.environment,
                tags: { env: values.tag },
            };
            const result = await environmentApi.create(config, values.accountId);
            setPipelineInfo({ branch: result.branch, prUrl: result.prUrl, environment: values.environment });
            setActivePipelineEnv(values.environment);
            setShowCreateForm(false);
            setWizardStep(0);
            form.resetFields();
            fetchEnvironments();
        } catch (err) {
            showError('Failed to create environment', err);
        } finally {
            setSubmitting(false);
        }
    };

    const regionMap: Record<string, string> = {
        'internal-qa': 'us-east-1a',
        'boil': 'us-west-2b',
        'internal-performance': 'us-west-2a',
        'cts-umb-prod': 'us-east-1c',
    };

    const dataSource = (environments ?? []).map((name) => {
        const known = KNOWN_ENVIRONMENTS.find((e) => e.name === name);
        const costNum = parseInt((known?.estimatedCost ?? '$1500').replace(/[^0-9]/g, ''), 10);
        const isDegraded = name.includes('qa');
        return {
            name,
            accountId: known?.accountId ?? 'Unknown',
            estimatedCost: known?.estimatedCost ?? '$1,500/mo',
            costNum,
            region: regionMap[name] ?? 'us-east-1a',
            health: name.includes('performance') ? 92 : isDegraded ? 78 : 95,
            tier: name.includes('prod') ? 'Production' : name.includes('perf') || name.includes('performance') ? 'Performance' : 'Development',
            statusLabel: isDegraded ? 'Warning' : 'Healthy',
            utilization: [65, 72, 58, 80, 74, 68, 85], // mock trend data
        };
    });

    // Apply filters
    const filteredData = dataSource.filter((env) => {
        if (tierFilter && env.tier !== tierFilter) return false;
        if (regionFilter && !env.region.startsWith(regionFilter)) return false;
        if (env.costNum < costRange[0] || env.costNum > costRange[1]) return false;
        return true;
    });

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: 80, color: '#8c8c8c' }}>
                Loading environments...
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ textAlign: 'center', padding: 80 }}>
                <Text type="danger">{error}</Text>
                <br />
                <Button onClick={fetchEnvironments} style={{ marginTop: 16 }}>Retry</Button>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            {/* Filter Bar */}
            <Card
                size="small"
                style={{
                    background: '#1a1a2e',
                    border: '1px solid #2a2a4a',
                    borderRadius: 8,
                    marginBottom: 24,
                }}
                styles={{ body: { padding: '12px 20px' } }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <Select
                        placeholder="Tier"
                        allowClear
                        style={{ width: 140 }}
                        onChange={setTierFilter}
                        options={[
                            { label: 'Production', value: 'Production' },
                            { label: 'Performance', value: 'Performance' },
                            { label: 'Development', value: 'Development' },
                        ]}
                    />
                    <Select
                        placeholder="Owner"
                        allowClear
                        style={{ width: 140 }}
                        options={[
                            { label: 'Platform Team', value: 'platform' },
                            { label: 'Dev Team', value: 'dev' },
                            { label: 'QA Team', value: 'qa' },
                        ]}
                    />
                    <Select
                        placeholder="Region"
                        allowClear
                        style={{ width: 160 }}
                        onChange={setRegionFilter}
                        options={[
                            { label: 'us-west-2', value: 'us-west-2' },
                            { label: 'us-east-1', value: 'us-east-1' },
                            { label: 'eu-west-1', value: 'eu-west-1' },
                        ]}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 200 }}>
                        <DollarOutlined style={{ color: '#8c8c8c' }} />
                        <Slider
                            range
                            min={0}
                            max={5000}
                            step={100}
                            value={costRange}
                            onChange={(val) => setCostRange(val as [number, number])}
                            style={{ flex: 1 }}
                            tooltip={{ formatter: (val) => `$${val}/mo` }}
                        />
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                        <Space>
                            <Button icon={<ReloadOutlined />} onClick={fetchEnvironments}>
                                Refresh
                            </Button>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => setShowCreateForm(!showCreateForm)}
                            >
                                Create
                            </Button>
                        </Space>
                    </div>
                </div>
            </Card>

            {/* Environment Cards + Pipeline Panel */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {/* Left: Environment Cards */}
                <Col xs={24} lg={activePipelineEnv ? 16 : 24}>
                    {filteredData.length === 0 ? (
                        <EmptyState
                            description="No environments found. Adjust filters or create a new one!"
                        />
                    ) : (
                        <Row gutter={[16, 16]}>
                            {filteredData.map((env) => (
                                <Col xs={24} sm={12} lg={activePipelineEnv ? 8 : 6} key={env.name}>
                                    <Card
                                        size="small"
                                        style={{
                                            background: '#1a1a2e',
                                            border: '1px solid #2a2a4a',
                                            borderRadius: 8,
                                            height: '100%',
                                        }}
                                        styles={{ body: { padding: 16 } }}
                                    >
                                        {/* Name + Labels */}
                                        <div style={{ marginBottom: 12 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                <Text strong style={{ color: '#fff', fontSize: 14 }}>{env.name}</Text>
                                            </div>
                                            <Space size={4}>
                                                <Tag color={env.tier === 'Production' ? 'red' : env.tier === 'Performance' ? 'purple' : 'blue'} style={{ fontSize: 10, margin: 0 }}>
                                                    {env.tier}
                                                </Tag>
                                                <Tag
                                                    color={env.statusLabel === 'Healthy' ? 'green' : 'orange'}
                                                    style={{ fontSize: 10, margin: 0 }}
                                                >
                                                    {env.statusLabel}
                                                </Tag>
                                            </Space>
                                        </div>

                                        {/* Health Indicator */}
                                        <div style={{ marginBottom: 12 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                <Text style={{ color: '#8c8c8c', fontSize: 11 }}>Health</Text>
                                                <CheckCircleOutlined style={{ color: env.health >= 90 ? '#52c41a' : '#faad14', fontSize: 12 }} />
                                            </div>
                                            <Progress
                                                percent={env.health}
                                                size="small"
                                                strokeColor={env.health >= 90 ? '#52c41a' : '#faad14'}
                                                trailColor="#2a2a4a"
                                                format={(p) => <span style={{ color: '#fff', fontSize: 11 }}>{p}%</span>}
                                            />
                                        </div>

                                        {/* Mini Bar Graph (utilization trend) */}
                                        <div style={{ marginBottom: 12 }}>
                                            <Text style={{ color: '#8c8c8c', fontSize: 10, marginBottom: 4, display: 'block' }}>Resource Utilization</Text>
                                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 24 }}>
                                                {env.utilization.map((val, idx) => (
                                                    <div
                                                        key={idx}
                                                        style={{
                                                            flex: 1,
                                                            height: `${(val / 100) * 24}px`,
                                                            background: val > 75 ? '#faad14' : '#1677ff',
                                                            borderRadius: 2,
                                                            minWidth: 4,
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Cost */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <Text style={{ color: '#8c8c8c', fontSize: 11 }}>Cost</Text>
                                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: 500 }}>{env.estimatedCost}</Text>
                                        </div>

                                        {/* Region */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                                            <Text style={{ color: '#8c8c8c', fontSize: 11 }}>Region</Text>
                                            <Tag
                                                icon={<GlobalOutlined />}
                                                color="blue"
                                                style={{ fontSize: 10, margin: 0 }}
                                            >
                                                {env.region}
                                            </Tag>
                                        </div>

                                        {/* Actions */}
                                        <Space style={{ width: '100%' }} size={8}>
                                            <Button
                                                icon={<CopyOutlined />}
                                                size="small"
                                                block
                                                onClick={() => {
                                                    setShowCreateForm(true);
                                                    setWizardStep(0);
                                                    form.setFieldsValue({ environment: `${env.name}-clone`, tag: 'dev', accountId: env.accountId !== 'Unknown' ? env.accountId : '' });
                                                }}
                                            >
                                                Clone
                                            </Button>
                                            <Popconfirm
                                                title="Trigger terraform plan?"
                                                description={`Run terraform plan for ${env.name}`}
                                                onConfirm={() => handleTriggerPlan(env.name)}
                                            >
                                                <Button icon={<RocketOutlined />} size="small" type="primary" block>
                                                    Plan
                                                </Button>
                                            </Popconfirm>
                                        </Space>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    )}
                </Col>

                {/* Right: Automation Pipeline (shows when Plan or Clone is clicked) */}
                {activePipelineEnv && (
                    <Col xs={24} lg={8}>
                        <Card
                            title={
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#fff', fontSize: 13 }}><BranchesOutlined /> Pipeline: {activePipelineEnv}</span>
                                    <Button
                                        type="text"
                                        icon={<CloseOutlined />}
                                        onClick={() => setActivePipelineEnv(null)}
                                        style={{ color: '#8c8c8c' }}
                                        size="small"
                                    />
                                </div>
                            }
                            style={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8, position: 'sticky', top: 80 }}
                            styles={{ header: { borderBottom: '1px solid #2a2a4a' }, body: { padding: 16 } }}
                        >
                            <Steps
                                direction="vertical"
                                size="small"
                                current={1}
                                items={[
                                    {
                                        title: <Text style={{ color: '#fff', fontSize: 12 }}>Create Feature Branch</Text>,
                                        description: (
                                            <div>
                                                <Text style={{ color: '#8c8c8c', fontSize: 11 }}>Branch from main in internal repo</Text>
                                                <div style={{ marginTop: 4 }}>
                                                    <Tag color="blue" style={{ fontSize: 10 }}>feature/{activePipelineEnv}-tfvars</Tag>
                                                </div>
                                            </div>
                                        ),
                                        status: 'finish',
                                    },
                                    {
                                        title: <Text style={{ color: '#fff', fontSize: 12 }}>Commit tfvars & Open PR</Text>,
                                        description: (
                                            <div>
                                                <Text style={{ color: '#8c8c8c', fontSize: 11 }}>Generate tfvars, commit & create Pull Request</Text>
                                                <div style={{ marginTop: 6, marginLeft: 6 }}>
                                                    <Timeline
                                                        items={[
                                                            {
                                                                dot: <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 9 }} />,
                                                                children: <Text style={{ color: '#d9d9d9', fontSize: 10 }}>Generate {activePipelineEnv}.tfvars</Text>,
                                                            },
                                                            {
                                                                dot: <SyncOutlined spin style={{ color: '#1677ff', fontSize: 9 }} />,
                                                                children: <Text style={{ color: '#d9d9d9', fontSize: 10 }}>Open PR to main</Text>,
                                                            },
                                                        ]}
                                                    />
                                                </div>
                                            </div>
                                        ),
                                        status: 'process',
                                    },
                                    {
                                        title: <Text style={{ color: '#fff', fontSize: 12 }}>Terraform Plan</Text>,
                                        description: <Text style={{ color: '#8c8c8c', fontSize: 11 }}>Runs automatically on PR open</Text>,
                                        status: 'wait',
                                    },
                                    {
                                        title: <Text style={{ color: '#fff', fontSize: 12 }}>Merge PR to Main</Text>,
                                        description: <Text style={{ color: '#8c8c8c', fontSize: 11 }}>Approve & merge after plan review</Text>,
                                        status: 'wait',
                                    },
                                    {
                                        title: <Text style={{ color: '#fff', fontSize: 12 }}>Terraform Apply</Text>,
                                        description: <Text style={{ color: '#8c8c8c', fontSize: 11 }}>Triggered on merge to main</Text>,
                                        status: 'wait',
                                    },
                                ]}
                            />
                            <div style={{ marginTop: 12, padding: '10px 12px', background: '#0f0f1a', borderRadius: 6, border: '1px solid #2a2a4a' }}>
                                <Space>
                                    <RollbackOutlined style={{ color: '#faad14' }} />
                                    <Text style={{ color: '#faad14', fontSize: 11 }}>Rollback: revert PR to undo changes</Text>
                                </Space>
                            </div>
                        </Card>
                    </Col>
                )}
            </Row>

            {/* Create Environment Wizard */}
            {showCreateForm && (
                <Row gutter={[24, 24]}>
                    <Col xs={24}>
                        <Card
                            title={
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#fff' }}>Create New Environment</span>
                                    <Button
                                        type="text"
                                        icon={<CloseOutlined />}
                                        onClick={() => { setShowCreateForm(false); setWizardStep(0); form.resetFields(); }}
                                        style={{ color: '#8c8c8c' }}
                                        size="small"
                                    />
                                </div>
                            }
                            style={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8 }}
                            styles={{ header: { borderBottom: '1px solid #2a2a4a' }, body: { padding: 20 } }}
                        >
                            <Steps
                                size="small"
                                current={wizardStep}
                                style={{ marginBottom: 24 }}
                                items={[
                                    { title: 'Basics' },
                                    { title: 'Network' },
                                    { title: 'Compute' },
                                    { title: 'Data' },
                                    { title: 'Security' },
                                ]}
                            />

                            <Form
                                form={form}
                                layout="horizontal"
                                onFinish={handleCreateEnvironment}
                                requiredMark={false}
                                labelCol={{ span: 8 }}
                                wrapperCol={{ span: 16 }}
                            >
                                {/* Step 0: Basics */}
                                {wizardStep === 0 && (
                                    <>
                                        <Form.Item
                                            label={<span style={{ color: '#d9d9d9' }}>Environment Name</span>}
                                            name="environment"
                                            rules={[{ required: true, message: 'Required' }]}
                                        >
                                            <Input placeholder="e.g. internal-qa, boil, internal-performance" />
                                        </Form.Item>
                                        <Form.Item
                                            label={<span style={{ color: '#d9d9d9' }}>Tag</span>}
                                            name="tag"
                                            rules={[{ required: true, message: 'Required' }]}
                                        >
                                            <Input placeholder="e.g. dev, staging, prod" />
                                        </Form.Item>
                                        <Form.Item
                                            label={<span style={{ color: '#d9d9d9' }}>AWS Account ID</span>}
                                            name="accountId"
                                            rules={[
                                                { required: true, message: 'Required' },
                                                { pattern: /^\d{12}$/, message: 'Must be 12 digits' },
                                            ]}
                                        >
                                            <Input placeholder="e.g. 123456789012" maxLength={12} />
                                        </Form.Item>
                                        <Form.Item
                                            label={<span style={{ color: '#d9d9d9' }}>Weekend Stop</span>}
                                            name="weekendStop"
                                            valuePropName="checked"
                                            initialValue={false}
                                        >
                                            <Switch />
                                        </Form.Item>
                                    </>
                                )}

                                {/* Step 1: Network */}
                                {wizardStep === 1 && (
                                    <>
                                        <Form.Item
                                            label={<span style={{ color: '#d9d9d9' }}>VPC CIDR</span>}
                                            name="vpcCidr"
                                            initialValue="10.0.0.0/16"
                                        >
                                            <Input placeholder="e.g. 10.0.0.0/16" />
                                        </Form.Item>
                                        <Form.Item
                                            label={<span style={{ color: '#d9d9d9' }}>Availability Zones</span>}
                                            name="azCount"
                                            initialValue={3}
                                        >
                                            <InputNumber min={2} max={4} style={{ width: '100%' }} />
                                        </Form.Item>
                                        <Form.Item
                                            label={<span style={{ color: '#d9d9d9' }}>NAT Gateway</span>}
                                            name="natGateway"
                                            valuePropName="checked"
                                            initialValue={true}
                                        >
                                            <Switch />
                                        </Form.Item>
                                        <Form.Item
                                            label={<span style={{ color: '#d9d9d9' }}>VPN Enabled</span>}
                                            name="vpnEnabled"
                                            valuePropName="checked"
                                            initialValue={false}
                                        >
                                            <Switch />
                                        </Form.Item>
                                    </>
                                )}

                                {/* Step 2: Compute */}
                                {wizardStep === 2 && (
                                    <>
                                        <Form.Item
                                            label={<span style={{ color: '#d9d9d9' }}>EKS Version</span>}
                                            name="eksVersion"
                                            initialValue="1.29"
                                        >
                                            <Select
                                                options={[
                                                    { label: '1.29', value: '1.29' },
                                                    { label: '1.28', value: '1.28' },
                                                    { label: '1.27', value: '1.27' },
                                                ]}
                                            />
                                        </Form.Item>
                                        <Form.Item
                                            label={<span style={{ color: '#d9d9d9' }}>Instance Type</span>}
                                            name="instanceType"
                                            initialValue="m5.xlarge"
                                        >
                                            <Select
                                                options={[
                                                    { label: 'm5.large', value: 'm5.large' },
                                                    { label: 'm5.xlarge', value: 'm5.xlarge' },
                                                    { label: 'm5.2xlarge', value: 'm5.2xlarge' },
                                                    { label: 'c5.xlarge', value: 'c5.xlarge' },
                                                ]}
                                            />
                                        </Form.Item>
                                        <Form.Item
                                            label={<span style={{ color: '#d9d9d9' }}>Min Nodes</span>}
                                            name="minNodes"
                                            initialValue={2}
                                        >
                                            <InputNumber min={1} max={10} style={{ width: '100%' }} />
                                        </Form.Item>
                                        <Form.Item
                                            label={<span style={{ color: '#d9d9d9' }}>Max Nodes</span>}
                                            name="maxNodes"
                                            initialValue={6}
                                        >
                                            <InputNumber min={2} max={50} style={{ width: '100%' }} />
                                        </Form.Item>
                                    </>
                                )}

                                {/* Step 3: Data */}
                                {wizardStep === 3 && (
                                    <>
                                        <Form.Item
                                            label={<span style={{ color: '#d9d9d9' }}>RDS Enabled</span>}
                                            name="rdsEnabled"
                                            valuePropName="checked"
                                            initialValue={true}
                                        >
                                            <Switch />
                                        </Form.Item>
                                        <Form.Item
                                            label={<span style={{ color: '#d9d9d9' }}>RDS Instance</span>}
                                            name="rdsInstanceClass"
                                            initialValue="db.r5.large"
                                        >
                                            <Select
                                                options={[
                                                    { label: 'db.r5.large', value: 'db.r5.large' },
                                                    { label: 'db.r5.xlarge', value: 'db.r5.xlarge' },
                                                    { label: 'db.r6g.large', value: 'db.r6g.large' },
                                                ]}
                                            />
                                        </Form.Item>
                                        <Form.Item
                                            label={<span style={{ color: '#d9d9d9' }}>S3 Buckets</span>}
                                            name="s3Enabled"
                                            valuePropName="checked"
                                            initialValue={true}
                                        >
                                            <Switch />
                                        </Form.Item>
                                        <Form.Item
                                            label={<span style={{ color: '#d9d9d9' }}>ElastiCache</span>}
                                            name="elasticacheEnabled"
                                            valuePropName="checked"
                                            initialValue={false}
                                        >
                                            <Switch />
                                        </Form.Item>
                                    </>
                                )}

                                {/* Step 4: Security */}
                                {wizardStep === 4 && (
                                    <>
                                        <Form.Item
                                            label={<span style={{ color: '#d9d9d9' }}>WAF Enabled</span>}
                                            name="wafEnabled"
                                            valuePropName="checked"
                                            initialValue={true}
                                        >
                                            <Switch />
                                        </Form.Item>
                                        <Form.Item
                                            label={<span style={{ color: '#d9d9d9' }}>GuardDuty</span>}
                                            name="guarddutyEnabled"
                                            valuePropName="checked"
                                            initialValue={true}
                                        >
                                            <Switch />
                                        </Form.Item>
                                        <Form.Item
                                            label={<span style={{ color: '#d9d9d9' }}>KMS Encryption</span>}
                                            name="kmsEnabled"
                                            valuePropName="checked"
                                            initialValue={true}
                                        >
                                            <Switch />
                                        </Form.Item>
                                        <Form.Item
                                            label={<span style={{ color: '#d9d9d9' }}>SSO Integration</span>}
                                            name="ssoEnabled"
                                            valuePropName="checked"
                                            initialValue={false}
                                        >
                                            <Switch />
                                        </Form.Item>

                                        {/* Optional tfvars preview */}
                                        <Collapse
                                            ghost
                                            style={{ marginTop: 16 }}
                                            items={[{
                                                key: 'tfvars',
                                                label: <Text style={{ color: '#1677ff', fontSize: 12 }}>Preview tfvars file (optional)</Text>,
                                                children: (
                                                    <pre
                                                        style={{
                                                            background: '#0f0f1a',
                                                            border: '1px solid #2a2a4a',
                                                            borderRadius: 6,
                                                            padding: 12,
                                                            fontSize: 10,
                                                            lineHeight: 1.5,
                                                            color: '#e6e6e6',
                                                            maxHeight: 220,
                                                            overflow: 'auto',
                                                            fontFamily: 'JetBrains Mono, Fira Code, monospace',
                                                        }}
                                                    >
                                                        {generateTfvarsLocally({
                                                            ...getDefaultConfig(),
                                                            environment: form.getFieldValue('environment') || 'new-env',
                                                            tags: { env: form.getFieldValue('tag') || 'dev' },
                                                        })}
                                                    </pre>
                                                ),
                                            }]}
                                        />
                                    </>
                                )}

                                {/* Navigation Buttons */}
                                <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Space>
                                            {wizardStep > 0 && (
                                                <Button onClick={() => setWizardStep(wizardStep - 1)}>
                                                    Previous
                                                </Button>
                                            )}
                                        </Space>
                                        <Space>
                                            <Button onClick={() => { setShowCreateForm(false); setWizardStep(0); form.resetFields(); }}>
                                                Cancel
                                            </Button>
                                            {wizardStep < 4 ? (
                                                <Button
                                                    type="primary"
                                                    onClick={async () => {
                                                        const stepFields: Record<number, string[]> = {
                                                            0: ['environment', 'tag', 'accountId'],
                                                            1: ['vpcCidr', 'azCount'],
                                                            2: ['eksVersion', 'instanceType', 'minNodes', 'maxNodes'],
                                                            3: ['rdsInstanceClass'],
                                                        };
                                                        try {
                                                            await form.validateFields(stepFields[wizardStep] ?? []);
                                                            setWizardStep(wizardStep + 1);
                                                        } catch {
                                                            // Validation errors are shown inline on the fields; stay on current step.
                                                        }
                                                    }}
                                                >
                                                    Next
                                                </Button>
                                            ) : (
                                                <Button type="primary" htmlType="submit" loading={submitting} icon={<BranchesOutlined />}>
                                                    Create & Open PR
                                                </Button>
                                            )}
                                        </Space>
                                    </div>
                                </Form.Item>
                            </Form>
                        </Card>
                    </Col>
                </Row>
            )}



            {/* Pipeline info after successful creation (when not in create mode) */}
            {!showCreateForm && pipelineInfo && (
                <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
                    <Col span={24}>
                        <Card
                            title={
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#fff' }}><BranchesOutlined /> Pipeline Running � {pipelineInfo.environment}</span>
                                    <Button
                                        type="text"
                                        icon={<CloseOutlined />}
                                        onClick={() => setPipelineInfo(null)}
                                        style={{ color: '#8c8c8c' }}
                                        size="small"
                                    />
                                </div>
                            }
                            style={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8 }}
                            styles={{ header: { borderBottom: '1px solid #2a2a4a' }, body: { padding: 20 } }}
                        >
                            <Row gutter={[24, 16]}>
                                <Col xs={24} lg={8}>
                                    <Text style={{ color: '#8c8c8c', fontSize: 12 }}>Branch</Text>
                                    <br />
                                    <Text style={{ color: '#fff' }}>{pipelineInfo.branch}</Text>
                                    <br /><br />
                                    <a href={pipelineInfo.prUrl} target="_blank" rel="noreferrer">
                                        <Button type="primary" size="small" icon={<GlobalOutlined />}>View PR</Button>
                                    </a>
                                </Col>
                                <Col xs={24} lg={16}>
                                    <Steps
                                        size="small"
                                        current={2}
                                        items={[
                                            { title: 'PR Created' },
                                            { title: 'Terraform Plan' },
                                            { title: 'Review' },
                                            { title: 'Terraform Apply' },
                                        ]}
                                    />
                                </Col>
                            </Row>
                        </Card>
                    </Col>
                </Row>
            )}
        </div>
    );
}
