'use client'
import React from 'react'
import {
  Operator,
  Permissions,
  SemanticAction,
  useCheckHasPermission
} from '@/hooks/permission-guard/use-check-has-permission'
import usePermissionsByModule from '@/hooks/permission-guard/use-perminissions-by-module'

interface Props {
  children: React.ReactNode
  /** Acción semántica contextual CRUD o personalizada (ej: 'create', 'update', 'sync', 'export') */
  action?: SemanticAction
  /** Módulo opcional para validaciones cruzadas (ej: module='connections' o module='users') */
  module?: string
  /** Identificador técnico o lista de permisos tradicionales (retrocompatibilidad) */
  requiredPermissions?: Permissions | Permissions[]
  unauthorizedComponent?: React.JSX.Element
  skeleton?: React.JSX.Element
  operator?: Operator
}

const PermissionGuard = ({
  children,
  action,
  module,
  requiredPermissions,
  operator,
  skeleton,
  unauthorizedComponent
}: Props) => {
  const permsToCheck = (action || requiredPermissions || "") as Permissions | Permissions[];
  const hasPermission = useCheckHasPermission(permsToCheck, operator, module)
  const isSyncing = usePermissionsByModule((state) => state.isSyncing)

  if (isSyncing) {
    if (skeleton) return skeleton
    if (unauthorizedComponent) return null
  }
  if (hasPermission) return children
  if (unauthorizedComponent) return unauthorizedComponent
  return null
}

export default PermissionGuard
