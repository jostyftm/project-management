export type UserLoggedType = {
  id?: number
  type?: string
  attributes?: {
    username: string
    name: string
    email?: string
    avatar?: string
    company_id?: number
  }
}

export type UserLoggedStorageType = {
  contractId: number
  userLogged: UserLoggedType
}

export type ParamsPermissionsByModule = {
  application_id: string
  path: string
}
