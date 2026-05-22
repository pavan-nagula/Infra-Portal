{{/*
Expand the name of the chart.
*/}}
{{- define "infra-portal.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "infra-portal.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "infra-portal.labels" -}}
helm.sh/chart: {{ include "infra-portal.name" . }}-{{ .Chart.Version | replace "+" "_" }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: infra-portal
{{- end }}

{{/*
Backend labels
*/}}
{{- define "infra-portal.backend.labels" -}}
{{ include "infra-portal.labels" . }}
app.kubernetes.io/name: {{ include "infra-portal.fullname" . }}-backend
app.kubernetes.io/component: backend
{{- end }}

{{/*
Backend selector labels
*/}}
{{- define "infra-portal.backend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "infra-portal.fullname" . }}-backend
app.kubernetes.io/component: backend
{{- end }}

{{/*
UI labels
*/}}
{{- define "infra-portal.ui.labels" -}}
{{ include "infra-portal.labels" . }}
app.kubernetes.io/name: {{ include "infra-portal.fullname" . }}-ui
app.kubernetes.io/component: ui
{{- end }}

{{/*
UI selector labels
*/}}
{{- define "infra-portal.ui.selectorLabels" -}}
app.kubernetes.io/name: {{ include "infra-portal.fullname" . }}-ui
app.kubernetes.io/component: ui
{{- end }}
