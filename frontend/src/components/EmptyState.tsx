import { ReactNode } from 'react';
import { Empty, Button } from 'antd';
import { PlusCircleOutlined } from '@ant-design/icons';

interface EmptyStateProps {
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

export default function EmptyState({
  description = 'No data found',
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Empty
      description={description}
      style={{ padding: 48 }}
    >
      {actionLabel && onAction && (
        <Button type="primary" icon={<PlusCircleOutlined />} onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Empty>
  );
}
