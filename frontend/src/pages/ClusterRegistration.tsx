import { useState } from 'react';
import { Form, Input, Switch, Button, Card, Row, Col, Space, Result, message } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { clusterApi } from '../services/api';
import type { ClusterRegistrationRequest } from '../types/environment';
import PageLayout from '../components/PageLayout';

function extractMessage(e: unknown): string {
    if (e && typeof e === 'object' && 'response' in e) {
        const r = (e as { response?: { data?: { detail?: string; title?: string } } }).response;
        if (r?.data?.detail) return r.data.detail;
        if (r?.data?.title) return r.data.title;
    }
    return e instanceof Error ? e.message : 'Unknown error';
}

export default function ClusterRegistration() {
    const [form] = Form.useForm();
    const [preview, setPreview] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handlePreview = async () => {
        try {
            await form.validateFields();
            const values = form.getFieldsValue(true) as ClusterRegistrationRequest;
            const data = await clusterApi.preview(values);
            setPreview(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
        } catch (e) { message.error(extractMessage(e)); }
    };

    const handleSubmit = async () => {
        try {
            await form.validateFields();
            setSubmitting(true);
            const values = form.getFieldsValue(true) as ClusterRegistrationRequest;
            const res = await clusterApi.register(values);
            setResult(res);
        } catch (e) { message.error(extractMessage(e)); }
        finally { setSubmitting(false); }
    };

    if (result) {
        return (
            <PageLayout title="Cluster Registered" breadcrumbs={[{ label: 'Cluster Registration' }]}>
                <Result status="success" icon={<CheckCircleOutlined />}
                    title={`PR #${result.pr_number || ''} created`}
                    subTitle={result.message}
                    extra={result.pr_url ?
                        <Button type="primary" href={result.pr_url} target="_blank">View Pull Request</Button>
                        : null}
                />
            </PageLayout>
        );
    }

    return (
        <PageLayout title="Cluster Registration" breadcrumbs={[{ label: 'Cluster Registration' }]}>
            <Form form={form} layout="vertical" initialValues={{
                aws_region: 'us-east-1',
                auto_sync: true, prune: true, self_heal: true,
            }}>
                <Card title="Cluster Details">
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item label="Full Environment Name" name="full_env_name"
                                rules={[{ required: true }]}>
                                <Input placeholder="cubic-cts-umb-internal-qa" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="Short Environment Name" name="short_env_name"
                                rules={[{ required: true }]}>
                                <Input placeholder="qa" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="AWS Account ID" name="aws_account_id"
                                rules={[{ required: true, pattern: /^\d{12}$/ }]}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="AWS Region" name="aws_region" rules={[{ required: true }]}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={24}>
                            <Form.Item label="EKS Server URL" name="server_url" rules={[{ required: true }]}>
                                <Input placeholder="https://XXX.gr7.us-east-1.eks.amazonaws.com" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="VPC ID" name="vpc_id" rules={[{ required: true }]}>
                                <Input placeholder="vpc-xxxxxxxx" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="PR Branch Name" name="pr_branch_name" rules={[{ required: true }]}>
                                <Input placeholder="feature/register-cluster" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="Chart Branch" name="chart_branch">
                                <Input placeholder="gotham" />
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>

                <Card title="ArgoCD Sync Policy" style={{ marginTop: 16 }}>
                    <Space>
                        <Form.Item label="Auto sync" name="auto_sync" valuePropName="checked"><Switch /></Form.Item>
                        <Form.Item label="Prune" name="prune" valuePropName="checked"><Switch /></Form.Item>
                        <Form.Item label="Self heal" name="self_heal" valuePropName="checked"><Switch /></Form.Item>
                    </Space>
                </Card>
            </Form>

            <Space style={{ marginTop: 16 }}>
                <Button onClick={handlePreview}>Preview Changes</Button>
                <Button type="primary" loading={submitting} onClick={handleSubmit}>
                    Register Cluster
                </Button>
            </Space>

            {preview && (
                <Card title="Preview" style={{ marginTop: 16 }}>
                    <pre style={{
                        background: '#0f0f1a', border: '1px solid #2a2a4a',
                        borderRadius: 6, padding: 12, fontSize: 11,
                        color: '#e6e6e6', maxHeight: 400, overflow: 'auto',
                    }}>{preview}</pre>
                </Card>
            )}
        </PageLayout>
    );
}
