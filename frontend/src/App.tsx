import { Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Layout, Menu, theme } from 'antd';
import {
    CloudServerOutlined,
    DashboardOutlined,
    HistoryOutlined,
    ClusterOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import EnvironmentList from './pages/EnvironmentList';
import CreateEnvironment from './pages/CreateEnvironment';
import PipelineHistory from './pages/PipelineHistory';
import ClusterRegistration from './pages/ClusterRegistration';

const { Header, Content } = Layout;

function App() {
    const navigate = useNavigate();
    const location = useLocation();

    const getSelectedKey = () => {
        if (location.pathname.startsWith('/pipelines')) return '/pipelines';
        if (location.pathname.startsWith('/clusters')) return '/clusters';
        return '/environments';
    };

    const menuItems = [
        {
            key: '/environments',
            icon: <DashboardOutlined />,
            label: 'Environments',
        },
        {
            key: '/pipelines',
            icon: <HistoryOutlined />,
            label: 'Pipeline Runs',
        },
        {
            key: '/clusters',
            icon: <ClusterOutlined />,
            label: 'Cluster Registration',
        },
    ];

    return (
        <ConfigProvider
            theme={{
                algorithm: theme.darkAlgorithm,
                token: {
                    colorPrimary: '#1677ff',
                    colorBgContainer: '#1a1a2e',
                    colorBgElevated: '#1a1a2e',
                    colorBgLayout: '#0f0f1a',
                },
            }}
        >
            <Layout style={{ minHeight: '100vh', background: '#0f0f1a' }}>
                <Header
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: '#0f0f1a',
                        padding: '0 24px',
                        borderBottom: '1px solid #1f1f3a',
                        height: 56,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', marginRight: 48 }}>
                        <CloudServerOutlined
                            style={{ color: '#1677ff', fontSize: 22, marginRight: 10 }}
                        />
                        <span style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>
                            CTS UMB Infrastructure Provisioning
                        </span>
                    </div>
                    <Menu
                        mode="horizontal"
                        theme="dark"
                        selectedKeys={[getSelectedKey()]}
                        items={menuItems}
                        onClick={({ key }) => navigate(key)}
                        style={{
                            background: 'transparent',
                            borderBottom: 'none',
                            flex: 1,
                        }}
                    />
                </Header>
                <Content style={{ padding: 24, background: '#0f0f1a' }}>
                    <Routes>
                        <Route path="/environments" element={<EnvironmentList />} />
                        <Route path="/create" element={<CreateEnvironment />} />
                        <Route path="/pipelines" element={<PipelineHistory />} />
                        <Route path="/clusters" element={<ClusterRegistration />} />
                        <Route path="/" element={<Navigate to="/environments" />} />
                    </Routes>
                </Content>
            </Layout>
        </ConfigProvider>
    );
}

export default App;
