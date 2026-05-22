import { useState } from 'react';
import { Modal, Form, Input, Typography } from 'antd';

const { Text } = Typography;

interface AccountIdModalProps {
  open: boolean;
  loading: boolean;
  onSubmit: (accountId: string) => void;
  onCancel: () => void;
  environmentName: string;
}

export default function AccountIdModal({
  open,
  loading,
  onSubmit,
  onCancel,
  environmentName,
}: AccountIdModalProps) {
  const [form] = Form.useForm();

  const handleOk = async () => {
    const values = await form.validateFields();
    onSubmit(values.accountId);
  };

  return (
    <Modal
      title="Confirm Environment Creation"
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={loading}
      okText="Create & Open PR"
      destroyOnClose
    >
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        This will create a branch and pull request for environment{' '}
        <Text strong>{environmentName}</Text>.
      </Text>

      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          name="accountId"
          label="AWS Account ID"
          rules={[
            { required: true, message: 'AWS Account ID is required' },
            {
              pattern: /^\d{12}$/,
              message: 'Account ID must be exactly 12 digits',
            },
          ]}
        >
          <Input
            placeholder="e.g., 123456789012"
            maxLength={12}
            autoFocus
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
