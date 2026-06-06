import { Navigate, useParams } from 'react-router-dom';

export default function LegacyFlowEditRedirect() {
  const { flowId } = useParams<{ flowId: string }>();
  if (!flowId) return <Navigate to="/fluxos" replace />;
  return <Navigate to={`/fluxos/${flowId}/editar`} replace />;
}
