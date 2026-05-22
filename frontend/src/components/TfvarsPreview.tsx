import { Button, Card, Space, Alert } from 'antd';
import { CopyOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import type { EnvironmentConfig } from '../types/environment';
import { generateTfvarsLocally } from '../utils/tfvarsGenerator';

interface Props {
  config: EnvironmentConfig;
  tfvarsContent: string;
  onRefresh: () => void;
}

export default function TfvarsPreview({ config, tfvarsContent, onRefresh }: Props) {
  // Use server-generated content if available, otherwise generate locally
  const content = tfvarsContent || generateTfvarsLocally(config);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'terraform.tfvars';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <Alert
        message="Review Generated Configuration"
        description={`This terraform.tfvars will be placed at environments/${config.environment}/terraform.tfvars`}
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Card
        title="terraform.tfvars Preview"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={onRefresh}>
              Regenerate
            </Button>
            <Button icon={<CopyOutlined />} onClick={handleCopy}>
              Copy
            </Button>
            <Button
              icon={<DownloadOutlined />}
              type="primary"
              onClick={handleDownload}
            >
              Download
            </Button>
          </Space>
        }
      >
        <Editor
          height="600px"
          language="hcl"
          value={content}
          options={{
            readOnly: false,
            minimap: { enabled: false },
            fontSize: 13,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
          }}
        />
      </Card>
    </div>
  );
}
