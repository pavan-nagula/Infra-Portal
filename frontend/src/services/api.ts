import axios from 'axios';
import type { EnvironmentConfig, PipelineRun } from '../types/environment';

const api = axios.create({
    baseURL: '/api/v1',
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
});

// Attach API key from localStorage if present
api.interceptors.request.use((cfg) => {
    const key = localStorage.getItem('apiKey');
    if (key) cfg.headers['X-API-Key'] = key;
    return cfg;
});

// ─────── Backend response shapes (Python FastAPI) ───────
interface EnvironmentSummary {
    name: string;
    source: 'local' | 'remote' | 'mock';
}

interface WorkflowRunRaw {
    id: number;
    environment?: string | null;
    name?: string | null;
    workflow?: string | null;
    branch?: string | null;
    status?: string | null;
    conclusion?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    htmlUrl?: string | null;
}

interface ProvisionResponse {
    success: boolean;
    message: string;
    branch_name: string;
    pr_url: string;
    pr_number: number;
    file_path: string;
    changes_summary: string[];
}

// ─────── Helpers ───────
function mapRun(raw: WorkflowRunRaw): PipelineRun {
    const status: PipelineRun['status'] =
        raw.status === 'completed' ? 'completed'
            : raw.status === 'in_progress' ? 'in_progress'
                : raw.status === 'queued' ? 'queued'
                    : raw.conclusion === 'failure' ? 'failed'
                        : 'queued';
    const conclusion: PipelineRun['conclusion'] | undefined =
        raw.conclusion === 'success' || raw.conclusion === 'failure' || raw.conclusion === 'cancelled'
            ? raw.conclusion
            : undefined;
    return {
        id: raw.id,
        environment: raw.environment ?? raw.branch ?? 'unknown',
        status,
        conclusion,
        createdAt: raw.createdAt ?? new Date().toISOString(),
        updatedAt: raw.updatedAt ?? new Date().toISOString(),
        htmlUrl: raw.htmlUrl ?? '#',
        steps: [],
    };
}

/** Flatten the UI's rich EnvironmentConfig into the Python backend's flat ProvisionRequest. */
function toProvisionRequest(config: EnvironmentConfig, accountId: string) {
    return {
        environment_name: config.environment,
        business: config.business || 'cubic-aws',
        platform_name: config.platformName || 'boil',
        aws_account_id: accountId,
        branch_name: `feature/${config.environment}-tfvars`,
        app_config_create: config.appConfigManagement?.create ?? true,
        create_cross_cluster_iam: config.createCrossClusterIam,
        deploy_api_gateway: config.deployApiGateway,
        deploy_bastion: config.bastionConfiguration?.deployBastion ?? true,
        create_vpc_secondary: config.vpcSecondary?.createVpc ?? false,
        create_eks: Object.keys(config.eksClusters || {}).length > 0,
    };
}

/** Environment APIs */
export const environmentApi = {
    /** List all existing environments — returns names only */
    list: async (): Promise<string[]> => {
        const { data } = await api.get<EnvironmentSummary[]>('/environments');
        return data.map((e) => e.name);
    },

    /** Fetch tfvars text for one env (UI uses this for clone seeding) */
    get: async (name: string): Promise<EnvironmentConfig> => {
        const { getDefaultConfig } = await import('../utils/defaults');
        await api.get(`/environments/${encodeURIComponent(name)}`);
        return { ...getDefaultConfig(), environment: name };
    },

    /** Preview tfvars content (HCL text) */
    preview: async (config: EnvironmentConfig): Promise<string> => {
        const { data } = await api.post(
            '/provision/environment/preview',
            toProvisionRequest(config, '000000000000'),
        );
        if (typeof data === 'string') return data;
        return data.content || JSON.stringify(data, null, 2);
    },

    /** Create env + PR */
    create: async (
        config: EnvironmentConfig,
        accountId: string,
    ): Promise<{ branch: string; prUrl: string }> => {
        const { data } = await api.post<ProvisionResponse>(
            '/provision/environment',
            toProvisionRequest(config, accountId),
        );
        return { branch: data.branch_name, prUrl: data.pr_url };
    },
};

/** Pipeline APIs */
export const pipelineApi = {
    triggerPlan: async (environment: string): Promise<{ runId: number }> => {
        await api.post(`/pipelines/${encodeURIComponent(environment)}/plan`);
        return { runId: Math.floor(Date.now() / 1000) };
    },

    triggerApply: async (environment: string): Promise<{ runId: number }> => {
        await api.post(`/pipelines/${encodeURIComponent(environment)}/apply`);
        return { runId: Math.floor(Date.now() / 1000) };
    },

    getStatus: async (runId: number): Promise<PipelineRun> => {
        const { data } = await api.get<WorkflowRunRaw>(`/pipelines/runs/${runId}`);
        return mapRun(data);
    },

    listRuns: async (environment?: string): Promise<PipelineRun[]> => {
        const { data } = await api.get<WorkflowRunRaw[]>('/pipelines/runs', {
            params: { environment, limit: 50 },
        });
        return data.map(mapRun);
    },
};

/** Cluster registration (python-only feature) */
export const clusterApi = {
    preview: async (req: unknown): Promise<unknown> => {
        const { data } = await api.post('/cluster-registration/preview', req);
        return data;
    },
    register: async (req: unknown): Promise<{
        success: boolean;
        message: string;
        pr_url?: string;
        pr_number?: number;
        branch_name?: string;
    }> => {
        const { data } = await api.post('/cluster-registration', req);
        return data;
    },
};

export default api;
