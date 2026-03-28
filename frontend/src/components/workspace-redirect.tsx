import { Navigate } from "react-router-dom"
import { useParams } from "react-router-dom"

/**
 * Wrapper component that redirects from /workspace/:id to /quest/:id
 * Extracts the dynamic :id parameter and preserves it in the redirect
 */
export function WorkspaceRedirect() {
  const { id } = useParams<{ id: string }>()

  // Redirect to the quest detail page with the extracted ID
  return <Navigate replace to={`/quest/${id}`} />
}
