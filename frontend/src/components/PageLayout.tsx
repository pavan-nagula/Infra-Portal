import { ReactNode } from 'react';
import { Card, Spin, Result, Breadcrumb, Space, Typography } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

const { Title } = Typography;

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface PageLayoutProps {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  extra?: ReactNode;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  children: ReactNode;
}

export default function PageLayout({
  title,
  breadcrumbs = [],
  extra,
  loading = false,
  error = null,
  onRetry,
  children,
}: PageLayoutProps) {
  const breadcrumbItems = [
    {
      title: (
        <Link to="/environments">
          <HomeOutlined />
        </Link>
      ),
    },
    ...breadcrumbs.map((b) => ({
      title: b.path ? <Link to={b.path}>{b.label}</Link> : b.label,
    })),
  ];

  return (
    <div className="page-layout">
      {breadcrumbs.length > 0 && (
        <Breadcrumb items={breadcrumbItems} style={{ marginBottom: 16 }} />
      )}

      <Card
        title={<Title level={4} style={{ margin: 0 }}>{title}</Title>}
        extra={extra}
        styles={{ body: { padding: loading || error ? 48 : 24 } }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="Loading..." />
          </div>
        ) : error ? (
          <Result
            status="error"
            title="Something went wrong"
            subTitle={error}
            extra={
              onRetry && (
                <Space>
                  <a onClick={onRetry}>Try Again</a>
                </Space>
              )
            }
          />
        ) : (
          children
        )}
      </Card>
    </div>
  );
}
